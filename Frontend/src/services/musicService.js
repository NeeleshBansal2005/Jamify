const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Search songs through OUR backend.
// Frontend never calls the JioSaavn Worker directly.
export const searchMusic = async (query, page = 0, limit = 10) => {

  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: limit.toString()
  });

  const res = await fetch(
    `${API_URL}/music/search?${params.toString()}`
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to search music");
  }

  return data.songs;
};


// Get one complete track by its JioSaavn ID.
// Useful when we need the final stream URL for playback.
export const getMusicById = async (id) => {

  const res = await fetch(
    `${API_URL}/music/${encodeURIComponent(id)}`
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to get song");
  }

  return data.song;
};
