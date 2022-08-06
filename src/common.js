const debug = false;

function logContext(context) {
  return function (message) {
    if (debug) {
      console.log(context + ": " + message);
    }
  };
}

function config() {
  return browser.storage.sync.get({
    enableDvr: true,
  });
}

function setConfig(c) {
  return browser.storage.sync.set(c);
}

function setBadgeState(state) {
  const log = logContext("setBadgeState");

  log("Setting badge state to " + state);

  browser.browserAction.setTitle({
    title:
      (state ? "Force DVR enabled" : "Force DVR disabled") +
      " (click to toggle)",
  });
  // browser.browserAction.setBadgeText({
  //   text: state ? "ON" : "OFF",
  // });
  // browser.browserAction.setBadgeBackgroundColor({
  //   color: state ? "#9ccc65" : "#607d8b",
  // });
  browser.browserAction.setIcon({
    path: state ? "enabled.svg" : "disabled.svg",
  });
}
