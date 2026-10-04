# Third-party notices

## DVR-chan (formerly YTBetter)

The player-response and DVR-window logic in `src/inject.js` is adapted from
DVR-chan / YTBetter 4.1 by **copyMister**, released under the MIT license.

- Source: https://greasyfork.org/en/scripts/485020-dvr-chan-force-enable-youtube-dvr-rewind-formerly-ytbetter/code
- Version reviewed: 4.1, retrieved 2026-10-04.
- Original project: https://greasyfork.org/en/scripts/485020

This adaptation shares one extension implementation between Chrome and Firefox,
retains existing property accessors, handles repeated and late configuration
writes, covers native Response.json(), and selects direct audio/video formats
when YouTube omits manifest URLs. It adds extension settings and tests.
The script is bundled locally; the extension does not download or execute remote code.

MIT License

Copyright (c) copyMister

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Forks and issue contributions

- **Xiazee**, [PR #2](https://github.com/ohareza/forcedvr/pull/2): identified
  missing `/live/<id>` and `/watch/<id>` coverage. The shared registration now
  covers all paths on supported YouTube hosts, with browser tests for these routes.
- **arasan95**, [fork repair](https://github.com/arasan95/forcedvr/commit/70c607474895033e6d375acda83fbf4b960430fb):
  reviewed its initial-response, navigation, server ABR, and DVR-window fixes.
  Incorporated the repair approach through the credited DVR-chan adaptation.
  Its separate Firefox response filter and Chrome fetch/XHR wrappers are replaced
  by the shared implementation.
- **belext** linked the userscript in issues #1 and #4; the upstream discussion
  credits **H3XDaemon** for investigating server ABR playback.

The fork retains this repository's MIT license (Copyright (c) 2022 Ohareza),
reproduced in `LICENSE`. Both this notice and `LICENSE` ship in each package.
