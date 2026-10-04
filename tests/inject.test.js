import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { DVR_FLAG, liveResponse } from "./fixtures.js";

const source = readFileSync(new URL("../src/inject.js", import.meta.url), "utf8");
function page(before = "") {
  const context = vm.createContext({});
  vm.runInContext(`window = globalThis; ${before}`, context);
  vm.runInContext(source, context);
  return context;
}
function parse(context, data, reviver = "undefined") {
  context.text = JSON.stringify(data);
  return vm.runInContext(`JSON.parse(text, ${reviver})`, context);
}

test("initial live response disables server-driven seeking and retains signed manifest", () => {
  const context = page();
  const response = liveResponse();
  const manifest = response.streamingData.hlsManifestUrl;
  context.ytInitialPlayerResponse = response;
  assert.equal(response.videoDetails.isLiveDvrEnabled, true);
  assert.equal(response.playerConfig.mediaCommonConfig.useServerDrivenAbr, false);
  assert.equal(response.playerConfig.mediaCommonConfig.serverPlaybackStartConfig.enable, false);
  assert.equal(response.streamingData.serverAbrStreamingUrl, undefined);
  assert.equal(response.streamingData.hlsManifestUrl, manifest);
  assert.equal(response.streamingData.adaptiveFormats[0].maxDvrDurationSec, 43200);
});

test("later responses and wrapped SPA responses are patched", () => {
  const context = page();
  assert.equal(parse(context, liveResponse()).videoDetails.isLiveDvrEnabled, true);
  assert.equal(parse(context, { playerResponse: liveResponse() }).playerResponse.videoDetails.isLiveDvrEnabled, true);
  context.ytInitialPlayerResponse = liveResponse();
  context.ytInitialPlayerResponse = liveResponse();
  assert.equal(context.ytInitialPlayerResponse.videoDetails.isLiveDvrEnabled, true);
});

test("keeps the sole server ABR URL when no manifest exists", () => {
  const response = liveResponse();
  delete response.streamingData.hlsManifestUrl;
  assert.equal(parse(page(), response).streamingData.serverAbrStreamingUrl, response.streamingData.serverAbrStreamingUrl);
});

test("uses direct audio and video formats when manifests are absent", () => {
  const response = liveResponse();
  delete response.streamingData.hlsManifestUrl;
  response.streamingData.adaptiveFormats = [
    { mimeType: "audio/mp4", url: "https://media.example.test/audio" },
    { mimeType: "video/mp4", url: "https://media.example.test/video" },
  ];
  const patched = parse(page(), response);
  assert.equal(patched.streamingData.serverAbrStreamingUrl, undefined);
  assert.equal(patched.streamingData.adaptiveFormats[0].url, response.streamingData.adaptiveFormats[0].url);
  response.streamingData.adaptiveFormats.pop();
  assert.equal(parse(page(), response).streamingData.serverAbrStreamingUrl, response.streamingData.serverAbrStreamingUrl);
});

test("extends formats only on streams older than 12 hours", () => {
  for (const age of [0, 1, 11, 13, 48]) {
    const result = parse(page(), liveResponse(age));
    assert.equal(result.streamingData.adaptiveFormats[0].maxDvrDurationSec, age > 12 ? 604800 : 43200);
  }
  const unknown = liveResponse();
  delete unknown.microformat;
  assert.equal(parse(page(), unknown).streamingData.adaptiveFormats[0].maxDvrDurationSec, 43200);
});

test("leaves ordinary videos, finished streams, upcoming streams, comments and ads intact", () => {
  const ordinary = liveResponse(); ordinary.videoDetails.isLive = false;
  const ended = liveResponse(); ended.microformat.playerMicroformatRenderer.liveBroadcastDetails.endTimestamp = new Date().toISOString();
  const upcoming = liveResponse(); upcoming.videoDetails.isUpcoming = true;
  const comment = { onResponseReceivedEndpoints: [{ comments: ["hello"] }], adPlacements: [1] };
  for (const data of [ordinary, ended, upcoming, comment, null, "text", 2, [1, 2]]) {
    assert.equal(JSON.stringify(parse(page(), data)), JSON.stringify(data));
  }
  assert.equal(vm.runInContext('"playerResponse" in {}', page()), false);
});

test("retains ad-blocker accessors on every assignment", () => {
  const context = page(`
    let response;
    window.setterCalls = 0;
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      get() { return response; },
      set(value) { setterCalls++; delete value.adPlacements; response = value; }
    });
  `);
  for (let i = 1; i <= 2; i++) {
    context.ytInitialPlayerResponse = { ...liveResponse(), adPlacements: ["ad"] };
    assert.equal(context.setterCalls, i);
    assert.equal(context.ytInitialPlayerResponse.adPlacements, undefined);
    assert.equal(context.ytInitialPlayerResponse.videoDetails.isLiveDvrEnabled, true);
  }
});

test("preserves JSON reviver, receiver, errors and frozen results", () => {
  const context = page();
  assert.equal(parse(context, { x: 2 }, '(key, value) => key === "x" ? 4 : value').x, 4);
  assert.throws(() => vm.runInContext('JSON.parse("invalid")', context), { name: "SyntaxError" });
  assert.doesNotThrow(() => parse(context, liveResponse(), '(key, value) => value && typeof value === "object" ? Object.freeze(value) : value'));
  context.ytInitialPlayerResponse = null;
  assert.doesNotThrow(() => { context.ytInitialPlayerResponse = { videoDetails: null }; });
});

test("handles preexisting nonconfigurable player response without replacing its descriptor", () => {
  const context = page(`Object.defineProperty(window, "ytInitialPlayerResponse", { value: ${JSON.stringify(liveResponse())}, configurable: false });`);
  assert.equal(context.ytInitialPlayerResponse.videoDetails.isLiveDvrEnabled, true);
  assert.equal(Object.getOwnPropertyDescriptor(context, "ytInitialPlayerResponse").configurable, false);
});

test("late config initialization and every subsequent config write lift the cap", () => {
  const context = page();
  vm.runInContext(`
    ytcfg = {};
    ytcfg.data_ = {};
    ytcfg.set = function (value) { Object.assign(this.data_, value); return 42; };
  `, context);
  for (const flags of [`keep=1&${DVR_FLAG}=46800`, "keep=2", `${DVR_FLAG}=12&keep=3`]) {
    context.config = { WEB_PLAYER_CONTEXT_CONFIGS: { watch: { serializedExperimentFlags: flags } } };
    assert.equal(vm.runInContext("ytcfg.set(config)", context), 42);
    const output = context.ytcfg.data_.WEB_PLAYER_CONTEXT_CONFIGS.watch.serializedExperimentFlags;
    assert.ok(output.includes(`${DVR_FLAG}=604800`));
    assert.ok(output.includes(flags.match(/keep=\d/)[0]));
    assert.equal(output.split(DVR_FLAG).length, 2);
  }
});

test("repeated injection does not stack JSON wrappers", () => {
  const context = page();
  const parseBefore = vm.runInContext("JSON.parse", context);
  vm.runInContext(source, context);
  assert.equal(vm.runInContext("JSON.parse", context), parseBefore);
});
