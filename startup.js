function startup() {
  const log = logContext("startup");

  log("Starting up at " + new Date().toLocaleString());
  config().then(
    (c) => {
      log("Config: " + JSON.stringify(c));
      setBadgeState(c.enableDvr);
    },
    (error) => {
      log("Error getting config: " + error);
    }
  );
}

browser.runtime.onStartup.addListener(startup);
browser.runtime.onInstalled.addListener(startup);
