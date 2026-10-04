import { io } from "socket.io-client";
export const createSocket = () => {
  return io("http://localhost:5000", {
    withCredentials: true,
    // The Room page attaches its event handlers before opening the connection.
    autoConnect: false
  });
};
