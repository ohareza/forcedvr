# Force enable YouTube DVR

Rewind YouTube live streams, including streams with DVR disabled. Works on watch
pages, live links, and embedded players.

## Install

- [Chrome Web Store](https://chromewebstore.google.com/detail/force-enable-youtube-dvr/hbemnhlgojimlabcpjapanlopoekdhme)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/force-enable-youtube-dvr/)

Firefox requires version 140 or newer, or 142 on Android.

Grant access to YouTube when prompted, then refresh your stream. Click the toolbar
icon to turn DVR on or off. This reloads the current YouTube page; refresh other
open YouTube tabs to apply the change there.

You can only rewind footage that YouTube still serves. The extension saves your
on/off preference. See the [privacy policy](PRIVACY.md).

## Development

Requires Node.js 22 or newer. Build both browser versions:

```sh
npm run build
```

- Chrome, Brave, or Edge: enable Developer mode on the extensions page, choose
  **Load unpacked**, and select `dist/chrome`.
- Firefox: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary
  Add-on**, and select `dist/firefox/manifest.json`. This lasts until Firefox exits.

Run the tests and create ZIP packages:

```sh
npm ci --ignore-scripts
npm exec -- playwright install chromium firefox
npm run check
npm run package
```

Packages are written to `dist/`. The Firefox ZIP is unsigned.
See [verification notes](docs/verification.md) for live playback checks and results.

## Credits

Player fixes are adapted from copyMister's
[DVR-chan, formerly YTBetter](https://greasyfork.org/en/scripts/485020), under MIT.
Additional fixes came from [Xiazee](https://github.com/ohareza/forcedvr/pull/2) and
[arasan95](https://github.com/arasan95/forcedvr/commit/70c607474895033e6d375acda83fbf4b960430fb).
[Full credits and license notices](THIRD_PARTY_NOTICES.md) ship with both versions.
