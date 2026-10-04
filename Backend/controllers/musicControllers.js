import {
  searchSongs,
  getSongById
} from "../services/musicService.js";


// ==========================================================
// SEARCH SONGS
// GET /music/search?q=believer
// ==========================================================

export const searchMusic = async (req, res) => {

  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({
      error: "Search query is required"
    });
  }

  try {

    const page = Number(req.query.page) || 0; // konsa page chahiye, default 0
    const limit = Math.min(
      Number(req.query.limit) || 10,
      20 //limit maximum 20 , limit here is number of songs per page
    );
 // Ask the service to fetch and normalize results.
    const songs = await searchSongs(
      q.trim(),
      page,
      limit
    );

    return res.status(200).json({
      songs
    });

  } catch (error) {

    console.error(error);

    return res.status(502).json({
      error: "Failed to search music"
    });
  }
};


// ==========================================================
// GET SONG BY ID
// GET /music/:id
// ==========================================================

export const getMusicById = async (req, res) => {

  const { id } = req.params;

  try {

    const song = await getSongById(id);

    return res.status(200).json({
      song
    });

  } catch (error) {

    console.error(error);

    return res.status(404).json({
      error: "Song not found"
    });
  }
};

// controller me 
//query params
//validation
//HTTP status
//response

//service me
//JioSaavn API
//response parsing
// normalization