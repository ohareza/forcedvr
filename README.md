# ![Logo](src/enabled.svg) Force enable YouTube DVR



Enables the YouTube DVR on all streams.

## Get this extension

![Firefox Logo](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/42.8.0/firefox/firefox_16x16.png) [(0.5) Mozilla Add-on](https://addons.mozilla.org/en-US/firefox/addon/force-enable-youtube-dvr/).  
![Firefox Logo](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/42.8.0/firefox/firefox_16x16.png) [(0.5) Install from Github (Not auto updating)](https://github.com/ohareza/forcedvr/releases/latest/download/extension.xpi).  


## About Permissions

Force enable YouTube DVR require those permissions:

* activeTab: Refresh watch page on enable toggle

* webRequest, webRequestBlocking, _www.youtube.com_: [Patch response body to enable DVR](/src/patch.js)

* storage: save configuration

## Hacking

Tools:
- `npm install -g web-ext`

```
make build
     run
```

### Tests

- DVR is working when opening directly
  - <https://www.youtube.com/watch?v=36YnV9STBqc>
  - <https://youtu.be/36YnV9STBqc>
- DVR is working when navigating from other page
  - <https://www.youtube.com/c/TheGoodLiferadio>
- DVR is working when opening from channel live link
  - <https://www.youtube.com/c/TheGoodLiferadio/live>
- DVR is working on embeds
  - <https://twitchtheater.tv/v=36YnV9STBqc>

## Changelog

```txt
0.5: Don't filter requests when patching is disabled
0.4: Fix channel live links
0.3: Fix navigation from other pages & embeds
0.2: Make toggle only refresh if on YouTube watch page
0.1: Initial
```
