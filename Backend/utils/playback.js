export const getPlaybackPosition  = (room) => {
  if (!room.isPlaying || !room.playbackStartedAt) {
    return room.playbackPosition|| 0; // If not playing or no start time, return the last known position or 0
  }
  const elapsedTime = (Date.now() - new Date(room.playbackStartedAt).getTime()) / 1000; // Calculate elapsed time in seconds by subtracting the playbackStartedAt timestamp from the current time
  return room.playbackPosition + elapsedTime; // Return the last known position plus elapsed time as the current playback position
}