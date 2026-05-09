import roomsStore from '../models/roomsStore.js';
import apiresponse from '../utils/api-response.js';
import apierror from '../utils/api-error.js';
import { asynchandler } from '../utils/asynchandler.js';


export const createRoom = (req, res) => {
   const {
  name, genre, vibe, users, currentTrack, queue} = req.body;

  // basic validation
  if (!name) {
    return res.status(400).json({ error: "Room name is required" });
  }



const newRoom = {
  id: Date.now().toString(),
  name,
  genre,
  vibe,
  users,
  currentTrack,
  queue,
  isPlaying: false
}
  roomsStore.addRoom(newRoom);

  res.status(201).json(newRoom);
};
export const getRooms = (req, res) => {
  const rooms = roomsStore.getRooms();
  res.json(rooms);
};
export const getRoomById = (req, res) => {
  const { id } = req.params;
  const room = roomsStore.getRoomById(id);
  if(!room){
    return res.status(404).json({error:"room doesnt exists "});
  }
  res.json(room)
}