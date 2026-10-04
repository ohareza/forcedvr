export const DVR_FLAG = "html5_max_live_dvr_window_plus_margin_secs";

export function liveResponse(ageHours = 1) {
  return {
    videoDetails: { videoId: "test-live", isLive: true, isLiveDvrEnabled: false },
    playerConfig: { mediaCommonConfig: { useServerDrivenAbr: true, serverPlaybackStartConfig: { enable: true } } },
    streamingData: {
      hlsManifestUrl: "https://media.example.test/hls/playlist_type/LIVE/manifest.m3u8",
      serverAbrStreamingUrl: "https://media.example.test/abr",
      adaptiveFormats: [{ itag: 140, maxDvrDurationSec: 43200 }],
    },
    microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { startTimestamp: new Date(Date.now() - ageHours * 3600000).toISOString() } } },
  };
}

export function playerPage(response = liveResponse()) {
  return `<!doctype html><meta charset="utf-8"><title>DVR fixture</title>
    <script>
      window.ytcfg = window.ytcfg || {};
      ytcfg.data_ = {};
      ytcfg.set = function (value) { Object.assign(this.data_, value); };
      ytcfg.set({ WEB_PLAYER_CONTEXT_CONFIGS: { WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_WATCH: {
        serializedExperimentFlags: 'unrelated=true&${DVR_FLAG}=46800'
      } } });
      window.ytInitialPlayerResponse = ${JSON.stringify(response)};
      window.playerSawDvr = ytInitialPlayerResponse.videoDetails.isLiveDvrEnabled;
    </script><p>Player response fixture</p>`;
}
