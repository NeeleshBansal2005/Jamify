export const getRooms = async () => {

  const res = await fetch("http://localhost:5000/rooms");

  const data = await res.json();

  return data;
};
export const getRoomById = async (id) => {
    const res = await fetch(`http://localhost:5000/rooms/${id}`);
    const data = await res.json();
    return data;
}
export const joinRoom = async (roomId) => {
  const res = await fetch(`http://localhost:5000/rooms/${roomId}/join`, {
    method: "POST",
    credentials: "include"
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to join room");
  }

  return data;
};
export const addsongToQueue = async (roomId, song) => {

  const res = await fetch(`http://localhost:5000/rooms/${roomId}/queue`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(song)
  });

  const data = await res.json();

  return data;
}
export const removeSongfromqueue = async (roomId, songId) => {
    const res = await fetch(`http://localhost:5000/rooms/${roomId}/queue/${songId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        }
    });
    const data = await res.json();
    return data;
}
