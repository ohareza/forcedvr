function toggleStatus() {
  log = logContext("toggleStatus");

  config().then(
    (c) => {
      c.enableDvr = !c.enableDvr;
      log("Setting enableDvr to " + c.enableDvr);
      setConfig(c).then(() => {
        setBadgeState(c.enableDvr);
        browser.tabs.reload();
      });
    },
    (error) => {
      log("Error getting config: " + error);
    }
  );
}

browser.browserAction.onClicked.addListener(toggleStatus);
