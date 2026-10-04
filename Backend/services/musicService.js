const JIOSAAVN_BASE_URL =
  "https://jiosaavnapi-dusky.vercel.app";

// ==========================================================
// SEARCH SONGS
//
// Calls our self-hosted JioSaavn API and converts its raw
// response into the simpler format JamLite will use.
// ==========================================================

export const searchSongs = async (query, page = 0, limit = 10) => {

  const url =
    `${JIOSAAVN_BASE_URL}/api/search/songs` +
    `?query=${encodeURIComponent(query)}` +
    `&page=${page}` +
    `&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("JioSaavn search request failed");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error("JioSaavn search failed");
  }

  return data.data.results.map((song) => ({
    provider: "jiosaavn",

    // JioSaavn's own song ID
    providerTrackId: song.id,

    title: song.name,

    // Primary artist
    artist:
      song.artists?.primary
        ?.map((artist) => artist.name)
        .join(", ") || "Unknown Artist",

    duration: song.duration,

    // Prefer a high quality image
    cover:
      song.image?.find((img) => img.quality === "500x500")?.url ||
      song.image?.find((img) => img.quality === "150x150")?.url ||
      "",

    // Actual JioSaavn webpage URL
    pageUrl: song.url,

    // We don't need to expose all 5 qualities to the UI yet.
    // 160 kbps is a reasonable default for our initial player.
    streamUrl:
      song.downloadUrl?.find((audio) => audio.quality === "160kbps")?.url ||
      song.downloadUrl?.find((audio) => audio.quality === "96kbps")?.url ||
      null
  }));
};


// ==========================================================
// GET SONG BY ID
//
// Used when we need the complete song information and the
// actual stream URL for playback.
// ==========================================================

export const getSongById = async (songId) => {

  const url = `${JIOSAAVN_BASE_URL}/api/songs/${encodeURIComponent(songId)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("JioSaavn song request failed");
  }

  const data = await response.json();

  if (!data.success || !data.data?.length) {
    throw new Error("Song not found");
  }

  const song = data.data[0];

  return {
    provider: "jiosaavn",
    providerTrackId: song.id,

    title: song.name,

    artist:
      song.artists?.primary
        ?.map((artist) => artist.name)
        .join(", ") || "Unknown Artist",

    duration: song.duration,

    cover:
      song.image?.find((img) => img.quality === "500x500")?.url ||
      song.image?.find((img) => img.quality === "150x150")?.url ||
      "",

    pageUrl: song.url,

    streamUrl:
      song.downloadUrl?.find((audio) => audio.quality === "160kbps")?.url ||
      song.downloadUrl?.find((audio) => audio.quality === "96kbps")?.url ||
      null
  };
};