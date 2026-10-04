// Adapted from DVR-chan (formerly YTBetter) 4.1 by copyMister, MIT.
// https://greasyfork.org/scripts/485020 | See THIRD_PARTY_NOTICES.md.
(() => {
  "use strict";

  const installed = Symbol.for("forcedvr.installed");
  if (window[installed]) return;
  Object.defineProperty(window, installed, { value: true });

  const MAX_DVR_SECONDS = 604800;
  const DEFAULT_DVR_SECONDS = 43200;
  const DVR_FLAG = "html5_max_live_dvr_window_plus_margin_secs";

  function patchPlayer(response) {
    if (!response || typeof response !== "object") return;
    const { videoDetails, streamingData, playerConfig, microformat } = response;
    const live = microformat?.playerMicroformatRenderer?.liveBroadcastDetails;
    if (videoDetails?.isLive !== true || videoDetails.isUpcoming || live?.endTimestamp) return;

    videoDetails.isLiveDvrEnabled = true;
    const media = playerConfig?.mediaCommonConfig;
    if (media) {
      media.useServerDrivenAbr = false;
      if (media.serverPlaybackStartConfig) media.serverPlaybackStartConfig.enable = false;
    }

    if (!streamingData) return;
    const formats = Array.isArray(streamingData.adaptiveFormats) ? streamingData.adaptiveFormats : [];
    const hasDirectAudio = formats?.some((format) => format?.url && format.mimeType?.startsWith("audio/"));
    const hasDirectVideo = formats?.some((format) => format?.url && format.mimeType?.startsWith("video/"));
    // YouTube also supplies direct audio/video formats without a manifest URL.
    // Leaving SABR selected in that case still snaps a seek back to live.
    if (streamingData.hlsManifestUrl || streamingData.dashManifestUrl || (hasDirectAudio && hasDirectVideo)) {
      delete streamingData.serverAbrStreamingUrl;
    }
    const age = (Date.now() - Date.parse(live?.startTimestamp)) / 1000;
    if (age > DEFAULT_DVR_SECONDS && Array.isArray(streamingData.adaptiveFormats)) {
      for (const format of streamingData.adaptiveFormats) {
        if (format && typeof format === "object") format.maxDvrDurationSec = MAX_DVR_SECONDS;
      }
    }
  }

  function patchResponse(data) {
    if (data && typeof data === "object") {
      patchPlayer(data);
      patchPlayer(data.playerResponse);
    }
    return data;
  }

  function safely(transform, value) {
    try {
      return transform(value);
    } catch {
      // A changed or frozen YouTube object must not stop playback or JSON parsing.
      return value;
    }
  }

  function watchProperty(target, key, transform) {
    const previous = Object.getOwnPropertyDescriptor(target, key);
    let value = safely(transform, target[key]);
    if (previous && (!previous.configurable || ("writable" in previous && !previous.writable))) return;

    const descriptor = {
      configurable: true,
      enumerable: previous?.enumerable ?? true,
      get() {
        return previous?.get ? safely(transform, previous.get.call(this)) : value;
      },
    };
    if (!previous || "value" in previous || previous.set) {
      descriptor.set = function (next) {
        value = safely(transform, next);
        // Retain other extensions' setters, including ad-removal scriptlets.
        if (previous?.set) previous.set.call(this, value);
      };
    }
    Object.defineProperty(target, key, descriptor);
  }

  function patchConfig(store) {
    const players = store?.WEB_PLAYER_CONTEXT_CONFIGS;
    if (!players || typeof players !== "object") return store;
    for (const config of Object.values(players)) {
      if (typeof config?.serializedExperimentFlags !== "string") continue;
      const flags = config.serializedExperimentFlags.split("&");
      let found = false;
      config.serializedExperimentFlags = flags.map((flag) => {
        if (flag.split("=", 1)[0] !== DVR_FLAG) return flag;
        found = true;
        return `${DVR_FLAG}=${MAX_DVR_SECONDS}`;
      }).join("&");
      if (!found) {
        config.serializedExperimentFlags += `${config.serializedExperimentFlags ? "&" : ""}${DVR_FLAG}=${MAX_DVR_SECONDS}`;
      }
    }
    return store;
  }

  const hookedConfigs = new WeakSet();
  function hookConfig(config) {
    if (!config || typeof config !== "object" || hookedConfigs.has(config)) return config;
    hookedConfigs.add(config);
    const wrappedSetters = new WeakSet();
    // YouTube may create ytcfg as {} and assign .set later in the same inline script.
    watchProperty(config, "set", (set) => {
      if (typeof set !== "function" || wrappedSetters.has(set)) return set;
      const wrapped = function (...args) {
        for (const arg of args) safely(patchConfig, arg);
        const result = Reflect.apply(set, this, args);
        safely((cfg) => patchConfig(typeof cfg.d === "function" ? cfg.d() : cfg.data_), this);
        return result;
      };
      wrappedSetters.add(wrapped);
      return wrapped;
    });
    safely((cfg) => patchConfig(typeof cfg.d === "function" ? cfg.d() : cfg.data_), config);
    return config;
  }

  safely(() => watchProperty(window, "ytInitialPlayerResponse", patchResponse));
  safely(() => watchProperty(window, "ytcfg", hookConfig));

  const parse = JSON.parse;
  JSON.parse = function (...args) {
    return safely(patchResponse, Reflect.apply(parse, this, args));
  };

  // Native Response.json() does not call the page's JSON.parse function.
  if (typeof Response !== "undefined") {
    const json = Response.prototype.json;
    Response.prototype.json = function (...args) {
      return Reflect.apply(json, this, args).then((data) => safely(patchResponse, data));
    };
  }

  // Native XHR JSON decoding also bypasses JSON.parse (as covered in arasan95's fork).
  if (typeof XMLHttpRequest !== "undefined") {
    const prototype = XMLHttpRequest.prototype;
    const response = Object.getOwnPropertyDescriptor(prototype, "response");
    if (response?.get && response.configurable) {
      Object.defineProperty(prototype, "response", {
        ...response,
        get() {
          const value = response.get.call(this);
          return this.responseType === "json" ? safely(patchResponse, value) : value;
        },
      });
    }
  }
})();
