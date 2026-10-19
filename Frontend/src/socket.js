import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const createSocket = () => {
  return io(API_URL, {
    withCredentials: true,
    // The Room page attaches its event handlers before opening the connection.
    autoConnect: false
  });
};
