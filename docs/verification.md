# Verification of 1.1.0

Tested on 2026-10-04. These results cover this repository's build, not the older
versions currently listed in the browser stores.

## Automated checks

`npm run check` passed:

- 15 Node.js behavior tests cover live-only changes, direct audio/video fallback,
  short and long streams, preserved ad-blocker setters, unchanged comments and
  ordinary videos, JSON revivers/errors, repeated configuration writes, saved
  settings, rapid toggles, startup, and recovery after registration failure.
- 11 Playwright tests load the actual Chrome package in Chromium 153.0.8010.12
  and exercise document-start injection, `/watch`, `/live/`, `/watch/`, channel
  live paths, mobile YouTube, cross-origin privacy-enhanced embeds, in-page
  navigation, fetch JSON, XHR JSON, and disabling/re-enabling the extension.
  The shared page script also runs in Firefox 155.0.
- Firefox `web-ext lint` reports zero errors, warnings, and notices. The Chrome
  manifest is tested by loading it into Chromium; Firefox-only manifest rules
  are not applied to the Chrome package.

`npm run package` produced Chrome and Firefox ZIP files. Both contain only the
manifest, two JavaScript files, three PNG icons, `LICENSE`, and
`THIRD_PARTY_NOTICES.md`. Their player and background scripts are identical.

## Live playback

Used fresh, signed-out browser profiles and active Hololive streams found on the
[official schedule](https://schedule.hololive.tv/lives). Playback was muted. A
successful check required seeking 90 seconds backward, reaching that position,
and continuing playback for another 10 seconds without returning to live.
The checks excluded ads before issuing a seek.

| Browser | Stream | Result |
| --- | --- | --- |
| Chromium 153.0.8010.12, installed Chrome package | `ffiRtvdubvA` | Disabled: seek ignored. Enabled: seek reached the target and advanced normally for 12 seconds. |
| Firefox 155.0, temporarily installed Firefox ZIP, uBlock Origin 1.75.0 | `ffiRtvdubvA` | Add-on ID and page injection confirmed. Seek from 10550.32 s to 10460.32 s; playback reached 10472.24 s after 12 seconds. |
| Brave 1.96.61, installed Chrome package | `ffiRtvdubvA` | Seek from 10625.28 s to 10535.29 s; playback reached 10546.87 s after 12 seconds. |
| Brave 1.96.61, Shields active | `nX-LcablJNI` | Disabled: seek ignored. Enabled: seek from 7107.14 s to 7017.14 s; playback reached 7028.92 s after 12 seconds. Requests continued to be blocked by the client in both states. |

The Brave checks verify continued request blocking and playback in those
sessions. They do not establish compatibility with every filter list or YouTube
account experiment. uBlock Origin was confirmed installed for the Firefox check;
no claim is made that its Chromium build loaded in the Brave session.

The two streams originally had `isLiveDvrEnabled: false`. Their responses supplied
server ABR and direct audio/video URLs, but no DASH/HLS manifest URLs. DVR-chan
4.1 and the initial adaptation both still snapped back on this response shape.
The final repair also recognizes a usable direct audio/video pair before dropping
the server ABR URL. It preserves all media URLs verbatim and keeps the server URL
if no alternative is usable. A behavior test covers this additional case.

To repeat the live Chrome comparison with a currently active DVR-disabled stream:

```sh
npm ci --ignore-scripts
npm exec -- playwright install chromium
npm run verify:live -- VIDEO_ID
```

The command fails if the stream is already DVR-enabled, is not playing, or fails
to remain behind live after seeking. It outputs only video IDs, flags, and playback
times, not media URLs, tokens, or cookies. Old stream IDs may later become VODs.

## Issue and fork coverage

| Report | Implementation and evidence |
| --- | --- |
| [#1](https://github.com/ohareza/forcedvr/issues/1), DVR stopped working | Shared main-world patch covers initial and subsequent responses, server playback controls, and direct-format fallback. Live enabled/disabled comparison passes. |
| [#2](https://github.com/ohareza/forcedvr/pull/2), missing live/watch URLs | All paths on supported YouTube hosts are registered. Browser tests cover both proposed paths and channel live links. The PR's contribution is retained in history. |
| [#3](https://github.com/ohareza/forcedvr/issues/3), ad-blocker interaction | Existing player-response accessors and native JSON/XHR behavior are preserved. Hook chaining is tested; Brave request blocking and Firefox with uBlock were checked live. |
| [#4](https://github.com/ohareza/forcedvr/issues/4), Hololive seeks return to live | Reproduced on current Hololive streams and fixed by selecting available direct formats instead of server ABR. Verified that playback continues after rewinding. |

Both public forks were reviewed. Xiazee's main branch was identical to upstream;
its PR branch supplied the URL change. arasan95's fork supplied additional
response-interception and playback work. Source and license attribution are in
[the third-party notices](../THIRD_PARTY_NOTICES.md).

## Release limits

- The Chrome Web Store and Mozilla listings need separate uploads/review. The
  generated Firefox ZIP is unsigned and requires temporary loading or Mozilla
  signing. A Git merge does not update either store.
- Retention beyond the tested seek interval depends on YouTube. The seven-day
  setting is a client cap, not a guarantee that old segments still exist.
- Live account experiments, other extensions, and future player changes can
  alter behavior. Keep a fresh DVR-disabled stream for regression checks.
- The current `web-ext` 10.7.0 development dependency pulls `node-forge` 1.4.0
  through its Android debugging dependency. npm reports
  [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), with no
  newer fixed node-forge release available during this work. These development
  dependencies are not included in either extension package. The work did not
  use Android debugging or signing with untrusted keys.
