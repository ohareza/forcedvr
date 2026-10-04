import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../src/background.js", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../src/manifest.json", import.meta.url), "utf8"));

function background(saved = true) {
  const listeners = {};
  const state = { enableDvr: saved, scripts: [], reloads: [], title: "", badge: "" };
  const event = (name) => ({ addListener: (listener) => { listeners[name] = listener; } });
  const api = {
    runtime: { getManifest: () => manifest, onInstalled: event("install"), onStartup: event("startup") },
    storage: {
      onChanged: event("change"),
      sync: {
        get: async () => ({ enableDvr: state.enableDvr }),
        set: async ({ enableDvr }) => {
          const oldValue = state.enableDvr;
          state.enableDvr = enableDvr;
          listeners.change({ enableDvr: { oldValue, newValue: enableDvr } }, "sync");
        },
      },
    },
    scripting: {
      getRegisteredContentScripts: async () => state.scripts,
      registerContentScripts: async (scripts) => {
        assert.equal(state.scripts.length, 0, "must not register twice");
        state.scripts = scripts;
      },
      updateContentScripts: async (scripts) => { state.scripts = scripts; },
      unregisterContentScripts: async () => { state.scripts = []; },
    },
    action: {
      onClicked: event("click"), setIcon: async () => {},
      setTitle: async ({ title }) => { state.title = title; },
      setBadgeText: async ({ text }) => { state.badge = text; },
    },
    tabs: { reload: async (id) => { state.reloads.push(id); } },
  };
  const context = vm.createContext({ chrome: api });
  vm.runInContext(source, context);
  const flush = async () => { await vm.runInContext("pending", context); await vm.runInContext("pending", context); };
  return { state, api, listeners, flush };
}

test("installation and startup honor the saved disabled preference", async () => {
  const { state, listeners, flush } = background(false);
  listeners.install(); listeners.startup(); await flush();
  assert.equal(state.scripts.length, 0);
  assert.equal(state.badge, "OFF");
});

test("concurrent lifecycle events register one persistent main-world patch", async () => {
  const { state, listeners, flush } = background();
  listeners.install(); listeners.startup(); await flush();
  assert.equal(state.scripts.length, 1);
  assert.equal(state.scripts[0].world, "MAIN");
  assert.equal(state.scripts[0].runAt, "document_start");
  assert.equal(state.scripts[0].persistAcrossSessions, true);
});

test("toolbar disables before reload, covers live links, and serializes rapid clicks", async () => {
  const { state, api, listeners, flush } = background();
  await listeners.install();
  api.tabs.reload = async (id) => {
    assert.equal(state.scripts.length, state.enableDvr ? 1 : 0);
    state.reloads.push(id);
  };
  listeners.click({ id: 1, url: "https://www.youtube.com/live/example" });
  listeners.click({ id: 2, url: "https://m.youtube.com/@channel/live" });
  await flush();
  assert.equal(state.enableDvr, true);
  assert.deepEqual(state.reloads, [1, 2]);
  await listeners.click({ id: 3, url: "https://example.test/" });
  await flush();
  assert.deepEqual(state.reloads, [1, 2]);
});

test("registration failure is visible and a later change can recover", async () => {
  const { state, api, listeners, flush } = background();
  const register = api.scripting.registerContentScripts;
  api.scripting.registerContentScripts = async () => { throw new Error("denied"); };
  await listeners.install();
  assert.equal(state.badge, "!");
  api.scripting.registerContentScripts = register;
  listeners.startup(); await flush();
  assert.equal(state.scripts.length, 1);
  assert.equal(state.badge, "");
});
