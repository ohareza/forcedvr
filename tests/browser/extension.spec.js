import { test, expect, chromium, firefox } from "@playwright/test";
import { resolve } from "node:path";
import { playerPage, liveResponse, DVR_FLAG } from "../fixtures.js";

let context;
let worker;
test.beforeAll(async () => {
  const extension = resolve("dist/chrome");
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  await expect.poll(() => worker.evaluate(() => chrome.scripting.getRegisteredContentScripts().then((scripts) => scripts.length))).toBe(1);
  await context.route("https://**/*", (route) => route.fulfill({ contentType: "text/html", body: playerPage() }));
});
test.afterAll(async () => { await context?.close(); });

for (const path of ["watch?v=test", "live/test", "watch/test", "@channel/live", "c/channel/live", "embed/test"]) {
  test(`packaged extension runs before player code on /${path}`, async () => {
    const page = await context.newPage();
    await page.goto(`https://www.youtube.com/${path}`);
    expect(await page.evaluate(() => playerSawDvr)).toBe(true);
    expect(await page.evaluate(() => ytInitialPlayerResponse.playerConfig.mediaCommonConfig.useServerDrivenAbr)).toBe(false);
    expect(await page.evaluate(() => ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_WATCH.serializedExperimentFlags)).toContain(`${DVR_FLAG}=604800`);
    await page.close();
  });
}

test("mobile YouTube and privacy-enhanced embedded frames are covered", async () => {
  const page = await context.newPage();
  await page.goto("https://m.youtube.com/watch?v=test");
  expect(await page.evaluate(() => playerSawDvr)).toBe(true);
  await page.goto("https://example.test/");
  expect(await page.evaluate(() => playerSawDvr)).toBe(false);
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.src = "https://www.youtube-nocookie.com/embed/test";
    document.body.append(frame);
  });
  await expect.poll(() => page.frames().some((frame) => frame.url().includes("youtube-nocookie.com"))).toBe(true);
  const frame = page.frames().find((frame) => frame.url().includes("youtube-nocookie.com"));
  await expect.poll(() => frame.evaluate(() => window.playerSawDvr)).toBe(true);
  await page.close();
});

test("SPA JSON and native fetch JSON are patched without modifying response metadata", async () => {
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/watch?v=test");
  const result = await page.evaluate(async (response) => {
    history.pushState({}, "", "/live/next");
    const parsed = JSON.parse(JSON.stringify({ playerResponse: response }));
    const native = new Response(JSON.stringify(response), { status: 202 });
    const nativeParsed = await native.json();
    return { parsed: parsed.playerResponse.videoDetails.isLiveDvrEnabled, nativeParsed: nativeParsed.videoDetails.isLiveDvrEnabled, status: native.status, bodyUsed: native.bodyUsed };
  }, liveResponse());
  expect(result).toEqual({ parsed: true, nativeParsed: true, status: 202, bodyUsed: true });
  await page.close();
});

test("stored toggle unregisters the patch and reenables it on reload", async () => {
  const page = await context.newPage();
  await worker.evaluate(() => chrome.storage.sync.set({ enableDvr: false }));
  await expect.poll(() => worker.evaluate(() => chrome.scripting.getRegisteredContentScripts().then((scripts) => scripts.length))).toBe(0);
  await page.goto("https://www.youtube.com/live/test");
  expect(await page.evaluate(() => playerSawDvr)).toBe(false);
  await worker.evaluate(() => chrome.storage.sync.set({ enableDvr: true }));
  await expect.poll(() => worker.evaluate(() => chrome.scripting.getRegisteredContentScripts().then((scripts) => scripts.length))).toBe(1);
  await page.reload();
  expect(await page.evaluate(() => playerSawDvr)).toBe(true);
  await page.close();
});

test("native XHR JSON responses are patched and unrelated JSON stays intact", async () => {
  const page = await context.newPage();
  const response = liveResponse();
  await page.route("**/youtubei/v1/player", (route) => route.fulfill({ json: response }));
  await page.route("**/youtubei/v1/next", (route) => route.fulfill({ json: { comments: ["still here"] } }));
  await page.goto("https://www.youtube.com/watch?v=test");
  const result = await page.evaluate(async () => {
    const request = (path) => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", path);
      xhr.responseType = "json";
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = reject;
      xhr.send();
    });
    return { player: await request("/youtubei/v1/player"), next: await request("/youtubei/v1/next") };
  });
  expect(result.player.videoDetails.isLiveDvrEnabled).toBe(true);
  expect(result.next).toEqual({ comments: ["still here"] });
  await page.close();
});

test("shared script works in Firefox's page realm", async () => {
  const browser = await firefox.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript({ path: resolve("dist/firefox/inject.js") });
    await page.route("https://www.youtube.com/**", (route) => route.fulfill({ contentType: "text/html", body: playerPage() }));
    await page.goto("https://www.youtube.com/live/test");
    expect(await page.evaluate(() => playerSawDvr)).toBe(true);
    expect(await page.evaluate(() => ytInitialPlayerResponse.streamingData.serverAbrStreamingUrl)).toBeUndefined();
  } finally {
    await browser.close();
  }
});
