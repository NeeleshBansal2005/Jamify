import express from 'express';
import {createRoom,getRooms,getRoomById} from '../controllers/roomsControllers.js'
const router = express.Router();
router.post("/",createRoom);
router.get("/",getRooms);
router.get("/:id",getRoomById);
export default router;