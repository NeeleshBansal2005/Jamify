import Room from "../models/Room.js";

export const requireRoomHost = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        error: "Room doesn't exist"
      });
    }

    const hostId = String(room.host?._id ?? room.host ?? "");
    const userId = String(req.user?.id ?? "");

    if (!hostId || !userId || hostId !== userId) {
      return res.status(403).json({
        error: "Only the room host can control playback"
      });
    }

    next();
  } catch (error) {
    console.error("Host authorization failed:", error);

    return res.status(500).json({
      error: "Failed to verify room host"
    });
  }
};
