# Force enable YouTube DVR

![Logo](enabled.svg)

Enables the YouTube DVR on all streams.

## Get this extension

![Firefox Logo](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/42.8.0/firefox/firefox_16x16.png) [Mozilla Add-on](https://addons.mozilla.org/en-US/firefox/addon/force-enable-youtube-dvr/).

## About Permissions

Force enable YouTube DVR require those permissions:

* activeTab: Refresh watch page on enable toggle

* webRequest, webRequestBlocking, _all_urls_: [Patch response body to enable DVR](/src/patch.js)

* storage: save configuration

## Hacking

Tools:
- `npm install -g web-ext`

```
make build
     run
```

### Tests

<https://www.youtube.com/c/TheGoodLiferadio>

- DVR is working when navigating from other page
- DVR is working when opening directly
