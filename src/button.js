function toggleStatus() {
  log = logContext("toggleStatus");

  config().then(
    (c) => {
      c.enableDvr = !c.enableDvr;
      log("Setting enableDvr to " + c.enableDvr);
      setConfig(c).then(() => {
        setBadgeState(c.enableDvr);

        browser.tabs
          .query({ currentWindow: true, active: true })
          .then((tabs) => {
            let tab = tabs[0];
            if (tab.url.startsWith("https://www.youtube.com/watch?")) {
              browser.tabs.reload(tab.id);
            }
          }, console.error);
      });
    },
    (error) => {
      log("Error getting config: " + error);
    }
  );
}

browser.browserAction.onClicked.addListener(toggleStatus);
