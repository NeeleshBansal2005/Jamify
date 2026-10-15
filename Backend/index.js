import dotenv from "dotenv";
import express from "express";
import roomRoutes from "./routes/rooms.js";
import cors from "cors"; // to allow backend to take data from frontend
import http from "http"; // needed because socket.io attaches to actual HTTP server
import { Server } from "socket.io";
import spotifyRoutes from "./routes/SpotifyRoutes.js";
import { setIo } from "./socket/socketManager.js";
import connectDB from "./database/db.js";
import authRoutes from "./routes/authRoutes.js"; // Import auth routes
import cookieParser from "cookie-parser"; // Import cookie-parser
import {connectRedis} from "./database/redis.js"; // Import Redis connection
import redisClient from "./database/redis.js"; // Import Redis client
import musicRoutes from "./routes/musicRoutes.js";
import jwt from "jsonwebtoken"; // Import jsonwebtoken for JWT verification
import cookie from "cookie"; // Import cookie parser for socket handshake
import Room from "./models/Room.js"; // Import Room model for room-related operations


import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8"]);  
dns.setDefaultResultOrder("ipv4first"); // Ensure IPv4 is prioritized over IPv6 
dotenv.config({path: "./.env"});



const app = express();

// wrap express app inside real HTTP server
// socket.io works with this server, NOT directly with express app
const server = http.createServer(app);

const port = process.env.PORT || 5000;

// creating socket.io server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // frontend vite server
    methods: ["GET", "POST"],
    credentials: true
  }
});
setIo(io); // store io instance globally for later use in controllers
// storing io instance globally using socketManager
// later controllers can access same io instance cleanly
io.use((socket, next) => { // middleware to authenticate socket connections using JWT
  const cookies = cookie.parse(socket.handshake.headers.cookie || ""); // parse cookies from socket handshake headers

  const token = cookies.accessToken; // retrieve access token from cookies
  

  if (!token) {
    return next(new Error("Authentication error: access token missing"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // verify token using secret key

    socket.data.userId = decoded.id;// store user id in socket data for later use

    next();
  } catch (error) {
    return next(new Error("Authentication error: invalid token"));
  }
});
// socket connection listener
// runs whenever a frontend socket connects
io.on("connection", (socket) => {

  console.log("User connected:", socket.data.userId);

  // custom event listener
  // frontend emits "join-room" with room id
  socket.on("join-room", async (roomId) => {
  try {
    const room = await Room.findById(roomId);

    if (!room) {
      console.warn("Room join failed: room does not exist");
      socket.emit("room-join-error", { message: "Room does not exist" });
      return;
    }

    const isMember = room.members.some(
  (member) => member.user.toString() === socket.data.userId.toString()
);

    // Only members receive this room's socket updates. Earlier, the Join
    // button only navigated to the page, so a second user failed this check.
    if (!isMember) {
      console.warn("Room join failed: user is not a member");
      socket.emit("room-join-error", { message: "Join this room before connecting to its playback" });
      return;
    }
     

    socket.join(roomId);

// Fetch room state after joining so the late-joining client
// receives the current track, queue and playback timing.
const roomSnapshot = await Room.findById(roomId).lean();

if (!roomSnapshot) {
  socket.leave(roomId);

  socket.emit("room-join-error", {
    message: "Room no longer exists"
  });

  return;
}

socket.emit("room-joined", {
  roomId,
  room: roomSnapshot
});
    io.to(roomId).emit("user-joined", socket.data.userId); // notify other users in the room that a new user has joined

    console.log(
      "User joined room:", socket.data.userId, roomId
    );
  } catch (error) {
    console.error("Room join failed:", error.message);
    socket.emit("room-join-error", { message: "Failed to join the realtime room" });
  }
});

  // useful for debugging disconnects/reconnects
  socket.on("disconnect", (reason) => {
    console.log("User disconnected:", socket.data.userId, `(${reason})`);

  });

});


app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// middleware
// converts frontend JSON body into usable JS object
app.use(express.json());

// middleware to parse cookies
app.use(cookieParser());

app.use("/rooms", roomRoutes);
app.use("/spotify", spotifyRoutes);
app.use("/auth", authRoutes); // Use auth routes for authentication endpoints
app.use("/music", musicRoutes); // Use music routes for music-related endpoints




// IMPORTANT:
// use server.listen() instead of app.listen()
// because socket.io is attached to server
const startServer = async () => {
  try {

    await connectDB();

    await connectRedis();

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (error) {

    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
