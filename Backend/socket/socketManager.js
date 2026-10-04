let io;

export const setIo = (socketInstance) => {

  io = socketInstance;

};

export const getIo = () => {

  if (!io) {

    throw new Error("Socket.io not initialized");

  }

  return io;
};