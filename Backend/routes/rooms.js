import express from 'express';
import {createRoom,getRooms,getRoomById, pausePlayback, skipTrack} from '../controllers/roomsControllers.js'
import {addSongToQueue,removeSongFromQueue} from '../controllers/queueControllers.js'
import { startPlayback } from '../controllers/roomsControllers.js';
import authMiddleware from '../middleware/auth.js';
import { joinRoom ,leaveRoom} from '../controllers/roomsControllers.js';
import { requireRoomHost } from "../middleware/roomAccess.js";
const router = express.Router();
router.post("/",authMiddleware,createRoom);
router.get("/",getRooms);
router.get("/:id",getRoomById);
router.post("/:roomId/queue", authMiddleware, addSongToQueue);
router.delete("/:roomId/queue/:songId", authMiddleware, removeSongFromQueue);
router.post("/:id/play", authMiddleware, requireRoomHost, startPlayback);
router.post("/:id/pause", authMiddleware, requireRoomHost, pausePlayback);
router.post("/:id/skip", authMiddleware, requireRoomHost, skipTrack);;
router.post("/:roomId/join", authMiddleware, joinRoom);
router.post("/:roomId/leave", authMiddleware, leaveRoom);
export default router;
