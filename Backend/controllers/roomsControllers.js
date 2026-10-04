import Room from "../models/Room.js";

import apiresponse from '../utils/api-response.js';
import apierror from '../utils/api-error.js';
import { asynchandler } from '../utils/asynchandler.js';
import { getIo } from "../socket/socketManager.js";
import { createRoomService ,joinRoomService,leaveRoomService} from "../services/roomService.js";
import { getPlaybackPosition } from "../utils/playback.js";



export const createRoom = async (req, res) => {

  const { name, genre, vibe } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Room name is required"
    });
  }

  try {

    console.log("REQ.USER:", req.user);
console.log("REQ.USER.ID:", req.user?.id);
    // ========================================================
    // CREATE ROOM THROUGH SERVICE
    //
    // req.user.id came from authMiddleware.
    // This is the authenticated user's identity.
    // ========================================================

    const room = await createRoomService({
      name,
      genre,
      vibe,
      userId: req.user.id
    });

    console.log("CREATED ROOM:", room);

    return res.status(201).json(room);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to create room"
    });

  }
};
export const getRooms = async (req, res) => {

  try {

    const rooms = await Room.find(); //return all rooms from database

    return res.json(rooms);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to fetch rooms"
    });

  }

};
export const getRoomById = async (req, res) => {

  const { id } = req.params;

  try {

    const room = await Room.findById(id);

    if (!room) {

      return res.status(404).json({
        error: "Room doesn't exist"
      });

    }

    return res.json(room);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to fetch room"
    });

  }

};
export const startPlayback = async (req, res) => {

  const { id } = req.params;

  const io = getIo();

  try {

    // Fetch room from MongoDB
    const room = await Room.findById(id);

    // Room exists?
    if (!room) {
      return res.status(404).json({
        error: "Room doesn't exist"
      });
    }

    /*
    ==========================================================
    No current song exists.

    This should almost never happen now because
    the first added song automatically starts playing.

    We still keep this check for safety.
    ==========================================================
    */

    if (!room.currentTrack) {
      return res.status(400).json({
        error: "No current track"
      });
    }

    // A play request describes the desired state.  It is safe to retry when
    // the client has not yet received the previous socket/HTTP update.
    if (room.isPlaying) {
      return res.json(room);
    }

    /*
    ==========================================================
    Resume playback.
    ==========================================================
    */
    room.playbackStartedAt = new Date(); // Set playbackStartedAt to the current timestamp
    room.isPlaying = true;

    // Persist changes in MongoDB
    await room.save();

    io.to(id).emit("playback-started", room);

    return res.json(room);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to start playback"
    });

  }

};
export const pausePlayback = async (req, res) => {

  const { id } = req.params;

  const io = getIo();

  try {

    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        error: "Room doesn't exist"
      });
    }

    /*
    ==========================================================
    Can't pause if nothing is playing.
    ==========================================================
    */

    if (!room.currentTrack) {
      return res.status(400).json({
        error: "Nothing is playing"
      });
    }

    // A pause request describes the desired state.  Returning the current
    // room makes duplicate clicks and delayed requests harmless.
    if (!room.isPlaying) {
      return res.json(room);
    }
  const currentPosition = getPlaybackPosition(room); // Calculate the current playback position
    room.playbackPosition = currentPosition;// Update the playback position to the current position
    room.playbackStartedAt = null; // Clear the playbackStartedAt timestamp since playback is paused
    room.isPlaying = false;

    await room.save();

    io.to(id).emit("playback-paused", room);

    return res.json(room);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to pause playback"
    });

  }

};
export const skipTrack = async (req, res) => {

  const { id } = req.params;

  const io = getIo();

  try {

    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        error: "Room doesn't exist"
      });
    }

    /*
    ==========================================================
    Nothing is currently playing.
    ==========================================================
    */

    if (!room.currentTrack) {

      return res.status(400).json({
        error: "Nothing to skip"
      });

    }

    /*
    ==========================================================
    Queue empty.

    Playback finishes.
    ==========================================================
    */

    if (room.queue.length === 0) {

      room.currentTrack = null;

      room.isPlaying = false;
      room.playbackPosition = 0; // Reset playback position to 0 since playback has finished
      room.playbackStartedAt = null; // Clear playbackStartedAt since no song in queue is playing

      await room.save();

      io.to(id).emit("track-skipped", room);

      return res.json(room);

    }

    /*
    ==========================================================
    Move first queued song into currentTrack.

    Queue ONLY stores upcoming songs.
    ==========================================================
    */

    room.currentTrack = room.queue[0]; // Move the first song in the queue to currentTrack

    room.queue.shift(); // Remove the first song from the queue

    room.isPlaying = true;// Set isPlaying to true since we are skipping to the next track
    room.playbackPosition = 0; // Reset playback position to 0 for the new track
    room.playbackStartedAt = new Date(); // Set playbackStartedAt to the current timestamp for the new track

    await room.save();

    io.to(id).emit("track-skipped", room);

    return res.json(room);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to skip track"
    });

  }

};
export const joinRoom = async (req, res) => {

  const { roomId } = req.params;

  try {

    const room = await joinRoomService(
      roomId,
      req.user.id
    );

    return res.status(200).json(room);

  } catch (error) {

    console.error(error);

    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to join room"
    });
  }
};
export const leaveRoom = async (req, res) => {

  const { roomId } = req.params;

  try {

    const room = await leaveRoomService(
      roomId,
      req.user.id
    );

    return res.status(200).json(room);

  } catch (error) {

    console.error(error);

    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to leave room"
    });
  }
};
