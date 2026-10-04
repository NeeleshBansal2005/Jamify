import Room from "../models/Room.js";

// ==========================================================
// CREATE ROOM
//
// This function contains the actual business logic for
// creating a room.
//
// The controller will call this function instead of
// directly talking to MongoDB.
// ==========================================================

export const createRoomService = async ({
  name,
  genre,
  vibe,
  userId
}) => {

  const room = await Room.create({
  name,
  genre,
  vibe,

  // Authenticated user is the host
  host: userId,

  // Host is also an active member of the room
 members: [
      {
        user: userId
      }
    ]
});

  return room;
};

export const joinRoomService = async (roomId, userId) => {

  const room = await Room.findById(roomId);

  if (!room) {
    const error = new Error("Room doesn't exist");
    error.statusCode = 404;
    throw error;

    error.statusCode=40
  }

  const alreadyMember = room.members.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (alreadyMember) {
    // The user is already in this room, so a refresh/retry should still work.
    return room;
  }
  

  room.members.push({
    user: userId
  });

  await room.save();

  return room;
};
// The host cannot leave yet; host-transfer logic comes next.


export const leaveRoomService = async (roomId, userId) => {

  const room = await Room.findById(roomId);

  if (!room) {
    const error = new Error("Room doesn't exist");
    error.statusCode = 404;
    throw error;
  }

  // Temporary rule:
  // host-leave lifecycle will be replaced by the
  // reconnect/host-migration design we're implementing next.
  if (room.host.toString() === userId.toString()) {
    const error = new Error(
      "Host cannot leave the room yet"
    );
    error.statusCode = 400;
    throw error;
  }

  const isMember = room.members.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (!isMember) {
    const error = new Error(
      "User is not a member of this room"
    );
    error.statusCode = 400;
    throw error;
  }

  room.members = room.members.filter(
    (member) => member.user.toString() !== userId.toString()
  );

  await room.save();

  return room;
};
