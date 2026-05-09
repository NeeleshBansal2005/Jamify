//store is statemanager
let rooms = [];

//Get all rooms
const getRooms = () => {
  return rooms;
};

// Get room by ID
const getRoomById = (id) => {
  return rooms.find(room => room.id ===id);
};

// Add new room
const addRoom = (room) => {
  rooms.push(room);
  return room;
};

//Update room 
const updateRoom = (id, updatedData) => {
  rooms = rooms.map(room =>
    room.id === id ? { ...room, ...updatedData } : room
  );
};

//  Delete room 
const deleteRoom = (id) => {
  rooms = rooms.filter(room => room.id !== id);
};

export default{ getRooms, addRoom, updateRoom ,getRoomById,deleteRoom}
