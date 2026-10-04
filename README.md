# Force enable YouTube DVR

Enable rewind on YouTube live streams when YouTube still serves past segments.
Chrome, Chromium browsers, and Firefox use the same playback code.

## Install

- [Chrome Web Store](https://chromewebstore.google.com/detail/force-enable-youtube-dvr/hbemnhlgojimlabcpjapanlopoekdhme)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/force-enable-youtube-dvr/)

The store versions are published separately from this repository. Merging a fix
does not update an installed store extension. The Chrome listing currently serves
1.0; this source tree builds 1.1.0. Use the local instructions below to try this code.

Click the toolbar icon to toggle DVR. The active YouTube page reloads after a
toggle. Refresh other open YouTube tabs to apply the new setting there.
Firefox retains the previous extension ID and saved `enableDvr` setting.

### Load this version locally

Requires Node.js 22 or newer. Development uses Node.js 26.10.0.

```sh
npm ci --ignore-scripts
npm run build
```

- **Chrome / Brave / Edge:** open the browser's extensions page, enable Developer
  mode, choose **Load unpacked**, and select `dist/chrome`.
- **Firefox 140+:** open `about:debugging#/runtime/this-firefox`, choose **Load
  Temporary Add-on**, and select `dist/firefox/manifest.json`. Temporary installs
  last until Firefox exits. Permanent installations need Mozilla signing.
- Firefox for Android requires 142 or newer and a supported installation method.

Grant access to YouTube when the browser asks, then refresh your stream. Disable
older copies or DVR userscripts when testing this extension.

## What changed in 1.1.0

- One Manifest V3 implementation for both browsers, registered in the page at
  document start. Covers `/watch`, `/watch/<id>`, `/live/<id>`, channel live pages,
  mobile YouTube, and YouTube / youtube-nocookie embeds.
- Enables DVR and disables server-driven playback controls that can force seeking
  back to live. Uses direct audio/video formats as an alternative when manifests are absent.
  Keeps the server ABR URL when it is the only usable source.
- Applies the same patch on initial load, in-page navigation, and native JSON
  responses. Preserves existing accessors used by other extensions.
- Raises the player seek cap to seven days. Only widens format windows for streams
  older than 12 hours, following the userscript's short-stream fix.
- Removes the old response-body filter and script-tag injection. Adds browser
  tests, locked build tools, and packages containing license notices.

This cannot recover deleted or unavailable stream segments, bypass access
restrictions, or guarantee seven days of retained video. It is not an ad blocker.
YouTube experiments can change how playback behaves. See [verification notes](docs/verification.md)
for tested behavior and remaining live-service checks.

## Permissions and privacy

- `scripting` and the three YouTube host permissions register the bundled player
  patch on desktop/mobile YouTube and privacy-enhanced embeds.
- `storage` saves the on/off setting using the browser's sync storage.
- `activeTab` lets a toolbar click reload the active YouTube page.

No analytics, remote code, external requests, cookies, or browsing history are
collected by the extension. See [privacy policy](PRIVACY.md).

## Development

```sh
npm test
npm exec -- playwright install chromium firefox
npm run check
npm run package
# Optional live playback comparison; choose an active DVR-disabled stream:
npm run verify:live -- VIDEO_ID
```

Packages are written to `dist/forcedvr-{chrome,firefox}-1.1.0.zip`.
Only extension source, icons, manifests, and license notices are packaged.
The Firefox ZIP is unsigned. Store submission is a separate step.
`make run` starts a temporary Firefox session through the local `web-ext` tool.

## Credits

The playback repair is adapted from **copyMister's DVR-chan (formerly YTBetter)
4.1**, licensed under MIT:
[userscript and source](https://greasyfork.org/en/scripts/485020).

Thanks to **Xiazee** for [PR #2's missing URL coverage](https://github.com/ohareza/forcedvr/pull/2),
**arasan95** for the [fork repair](https://github.com/arasan95/forcedvr/commit/70c607474895033e6d375acda83fbf4b960430fb),
and the issue commenters who identified the failure and linked the working script.
[Third-party notices](THIRD_PARTY_NOTICES.md) describe the reused work and are
included in both extension packages.
