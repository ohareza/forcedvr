import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const videoId = process.argv[2];
if (!/^[\w-]{11}$/.test(videoId ?? "")) {
  throw new Error("Usage: npm run verify:live -- VIDEO_ID (choose a currently live, DVR-disabled stream)");
}

const extension = resolve("dist/chrome");
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--autoplay-policy=no-user-gesture-required"],
});

try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const page = await context.newPage();
  const snapshot = () => page.evaluate(() => {
    const player = document.querySelector("#movie_player");
    const video = document.querySelector("video");
    const response = player?.getPlayerResponse?.();
    return {
      installed: !!window[Symbol.for("forcedvr.installed")],
      isLive: response?.videoDetails?.isLive,
      dvr: response?.videoDetails?.isLiveDvrEnabled,
      time: player?.getCurrentTime?.(),
      ready: video?.readyState,
      paused: video?.paused,
      ad: player?.classList.contains("ad-showing"),
    };
  });

  for (const enabled of [false, true]) {
    await worker.evaluate((enableDvr) => chrome.storage.sync.set({ enableDvr }), enabled);
    let registered = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const count = await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts().then((scripts) => scripts.length));
      if (count === Number(enabled)) { registered = true; break; }
      await new Promise((done) => setTimeout(done, 50));
    }
    assert.ok(registered, "Extension setting did not apply");
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const video = document.querySelector("video");
      const player = document.querySelector("#movie_player");
      if (video) { video.muted = true; video.play().catch(() => {}); }
      return video?.readyState === 4 && !video.paused && player?.getCurrentTime?.() > 120 && !player.classList.contains("ad-showing");
    }, undefined, { timeout: 90000 });

    const before = await snapshot();
    assert.equal(before.isLive, true, "Choose an active live stream");
    assert.equal(before.dvr, enabled, "The control stream must have DVR disabled without the extension");
    assert.equal(before.installed, enabled);
    const target = await page.evaluate(() => {
      const player = document.querySelector("#movie_player");
      const target = player.getCurrentTime() - 90;
      player.seekTo(target, true);
      return target;
    });
    await page.waitForTimeout(2000);
    const after2 = await snapshot();
    await page.waitForTimeout(10000);
    const after12 = await snapshot();
    console.log(JSON.stringify({ videoId, enabled, before, target, after2, after12 }));
    assert.equal(after12.ad, false, "An ad interrupted the playback check; rerun it");
    assert.equal(after12.paused, false);
    if (enabled) {
      assert.ok(after2.time >= target - 5 && after2.time < target + 15, "The seek did not reach the requested position");
      assert.ok(after12.time > after2.time + 5, "Playback did not continue after seeking");
      assert.ok(after12.time < before.time - 50, "Playback snapped back to live");
    } else {
      assert.ok(after12.time >= before.time, "The baseline already allows rewinding; choose a different stream");
    }
  }
} finally {
  await context.close();
}
