var enableDvr = undefined;

config().then((c) => {
  enableDvr = c.enableDvr;
});

browser.storage.sync.onChanged.addListener((changes) => {
  if (changes.enableDvr) {
    enableDvr = changes.enableDvr.newValue;
  }
});

function patch(details) {
  const log = logContext("patch");
  if (!enableDvr) {
    log(`Not patching ${details.url} because DVR is disabled`);
    return {};
  }

  log(`Patching ${details.url}`);

  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder("utf-8");
  let encoder = new TextEncoder();

  filter.ondata = (event) => {
    let str = decoder.decode(event.data, { stream: true });
    str = str.replace(/"isLiveDvrEnabled":false/g, '"isLiveDvrEnabled":true');
    filter.write(encoder.encode(str));
  };
  filter.onstop = (event) => {
    filter.close();
  };

  return {};
}

browser.webRequest.onBeforeRequest.addListener(
  patch,
  {
    urls: [
      "https://www.youtube.com/watch?*",
      "https://www.youtube.com/youtubei/v1/player?*",
      "https://www.youtube.com/c/*/live",
    ],
    types: ["main_frame", "xmlhttprequest"],
  },
  ["blocking"]
);
