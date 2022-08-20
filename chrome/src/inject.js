Object.defineProperty(this, "ytInitialPlayerResponse", {
  set(ytInitialPlayerResponse) {
    Object.defineProperty(this, "ytInitialPlayerResponse", {
      writable: true,
    });

    if ("isLiveDvrEnabled" in ytInitialPlayerResponse.videoDetails) {
      ytInitialPlayerResponse.videoDetails.isLiveDvrEnabled = true;
    }

    this.ytInitialPlayerResponse = ytInitialPlayerResponse;
  },
  configurable: true,
});
