import Room from "../models/Room.js";
import { getIo } from "../socket/socketManager.js";
import { getSongById } from "../services/musicService.js";


// ==========================================================
// ADD SONG TO QUEUE
// Only the room host can manage the queue.
// The backend fetches the canonical song data from JioSaavn.
// ==========================================================

export const addSongToQueue = async (req, res) => {

  const { roomId } = req.params;
  const { provider, providerTrackId } = req.body;

  // Provider and track ID are the only music details
  // we need from the client.
  if (!provider || !providerTrackId) {
    return res.status(400).json({
      error: "Missing provider or providerTrackId"
    });
  }

  // Currently JamLite uses JioSaavn as its music provider.
  if (provider !== "jiosaavn") {
    return res.status(400).json({
      error: "Unsupported music provider"
    });
  }

  try {

    // Find the room first.
    const room = await Room.findById(roomId);
  console.log("QUEUE ROOM:", room?._id, room?.host, room?.members);
  console.log("QUEUE USER:", req.user?.id);
    if (!room) {
      return res.status(404).json({
        error: "Room not found"
      });
    }

    // Only the authenticated room host can manage the queue.
    if (!room.host) {
      return res.status(403).json({
        error: "Only the host can manage the queue"
      });
    }

    // Fetch the canonical track data from our music service
    // instead of trusting metadata/streamUrl sent by the client.
    const song = await getSongById(providerTrackId);

    if (!song) {
      return res.status(404).json({
        error: "Song not found"
      });
    }

    // Make sure the provider returned a usable track.
    if (
      !song.provider ||
      !song.providerTrackId ||
      !song.streamUrl ||
      !song.title ||
      !song.artist ||
      !song.duration
    ) {
      return res.status(400).json({
        error: "Invalid track data"
      });
    }

    // Add the authenticated user on the server side.
    // We do not trust addedBy coming from the frontend.
    const track = {
      ...song,
      addedBy: req.user.id
    };

    // Queue stores only upcoming songs.
    // If nothing is currently playing, the first song becomes currentTrack.
    if (!room.currentTrack) {
      room.currentTrack = track;
      room.playbackPosition=0; // Reset playback position to 0 for the new track
      room.playbackStartedAt= new Date(); // Set playbackStartedAt to the current timestamp for the new track
      room.isPlaying = true;
    } else {
      room.queue.push(track);
    }
console.log("TRACK BEFORE SAVE:", JSON.stringify(track, null, 2));
    await room.save();

    // Notify all connected users in this room.
    const io = getIo();
    io.to(roomId).emit("queue-updated", room);

    return res.status(200).json(room);

  } catch (error) {

console.error("ADD SONG ERROR:", error);
  console.error("VALIDATION ERRORS:", error.errors);
    return res.status(500).json({
      error: "Failed to add song"
    });
  }
};


// ==========================================================
// REMOVE SONG FROM QUEUE
// Only the room host can remove queued songs.
// ==========================================================

export const removeSongFromQueue = async (req, res) => {

  const { roomId, songId } = req.params;

  try {

    // Find room from MongoDB.
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        error: "Room not found"
      });
    }

    // Only the authenticated host can manage the queue.
    if (room.host.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: "Only the host can manage the queue"
      });
    }

    // Check whether the requested song actually exists.
    const songExists = room.queue.some(
      (song) => song.providerTrackId === songId
    );

    if (!songExists) {
      return res.status(404).json({
        error: "Song not found in queue"
      });
    }

    // CurrentTrack is separate from queue, so this only
    // removes an upcoming song.
    room.queue = room.queue.filter(
      (song) => song.providerTrackId !== songId
    );

    await room.save();
//notify console.error() error ,  show us who 
    // Notify everyone in the room about the updated queue.
    const io = getIo();
    io.to(roomId).emit("queue-updated", room);

    return res.status(200).json(room);

  } catch (error) {

    console.error(error);


    return res.status(500).json({
      error: "Failed to remove song"
    });
  }
};