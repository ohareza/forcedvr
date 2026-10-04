"use strict";

const api = globalThis.browser ?? globalThis.chrome;
const SCRIPT_ID = "force-dvr";
const matches = api.runtime.getManifest().host_permissions;

async function applySetting() {
  const { enableDvr } = await api.storage.sync.get({ enableDvr: true });
  const registered = await api.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  const script = {
    id: SCRIPT_ID,
    js: ["inject.js"],
    matches,
    allFrames: true,
    runAt: "document_start",
    world: "MAIN",
    persistAcrossSessions: true,
  };
  if (enableDvr) {
    if (registered.length) await api.scripting.updateContentScripts([script]);
    else await api.scripting.registerContentScripts([script]);
  } else if (registered.length) {
    await api.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
  await api.action.setIcon({ path: enableDvr ? "enabled.png" : "disabled.png" });
  await api.action.setTitle({ title: `Force DVR ${enableDvr ? "enabled" : "disabled"} (click to toggle)` });
  await api.action.setBadgeText({ text: enableDvr ? "" : "OFF" });
}

let pending = Promise.resolve();
function enqueue(task) {
  pending = pending.then(task).catch(() => {
    api.action.setBadgeText({ text: "!" });
    api.action.setTitle({ title: "Force DVR could not update. Check extension site permissions and reload." });
  });
  return pending;
}

api.runtime.onInstalled.addListener(() => enqueue(applySetting));
api.runtime.onStartup.addListener(() => enqueue(applySetting));
api.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enableDvr) enqueue(applySetting);
});
api.action.onClicked.addListener((tab) => enqueue(async () => {
  const { enableDvr } = await api.storage.sync.get({ enableDvr: true });
  await api.storage.sync.set({ enableDvr: !enableDvr });
  await applySetting();
  if (tab?.id !== undefined && matches.some((pattern) => tab.url?.startsWith(pattern.slice(0, -1)))) {
    await api.tabs.reload(tab.id);
  }
}));
