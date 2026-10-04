export  const getPlaybackPosition = (room) => {
  if (!room?.isPlaying || !room.playbackStartedAt) {
    return room?.playbackPosition || 0;
  }

  const elapsed =
    (Date.now() - new Date(room.playbackStartedAt).getTime()) / 1000;

  return (room.playbackPosition || 0) + elapsed;
};