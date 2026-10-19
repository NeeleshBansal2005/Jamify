import { useState, useEffect, useRef, useCallback } from "react"; //useref is to control audio element through react
import { Play, Pause, SkipForward, Share2, ChevronLeft, Search, X, Disc3, Music, GripVertical, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import {
  addsongToQueue,
  joinRoom,
  removeSongfromqueue
} from "@/services/roomService";
import { createSocket } from "@/socket";
import { motion, AnimatePresence } from "framer-motion";
import { searchMusic } from "@/services/musicService.js";
import { getPlaybackPosition } from "@/utils/playback.js"; // Import the getPlaybackPosition function
import { useAuth } from "../AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// A room snapshot can arrive from REST or Socket.IO. During a socket join, a
// playback event can be delivered before the asynchronous room snapshot. Keep
// the newest backend state so that a late snapshot cannot rewind the player.
const keepNewestRoomState = (currentRoom, incomingRoom) => {
  if (!incomingRoom || !currentRoom) return incomingRoom || currentRoom;

  const currentUpdatedAt = new Date(currentRoom.updatedAt).getTime();
  const incomingUpdatedAt = new Date(incomingRoom.updatedAt).getTime();

  if (
    Number.isFinite(currentUpdatedAt) &&
    Number.isFinite(incomingUpdatedAt) &&
    incomingUpdatedAt < currentUpdatedAt
  ) {
    return currentRoom;
  }

  return incomingRoom;
};

export default function Rooms() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth(); // Get the current authenticated user from AuthContext
  // ==========================================
  // YOUR EXACT ORIGINAL STATE
  // ==========================================
  const [room, setRoom] = useState(null);
  const [songTitle, setSongTitle] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isPlaybackRequestPending, setIsPlaybackRequestPending] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null); // Reference to the audio element
  const progressRef = useRef(null); // Reference to the progress bar element
  const playbackRequestRef = useRef(false);
  const skipRequestRef = useRef(false); // FIX: same tarah ka guard jaisa changePlayback me hai -- isse double-click pe 2 baar /skip nahi jayega isi client se
  const trackEndedRef = useRef(null); // FIX: yaad rakhta hai ki isi client ne CURRENT track ke "ended" ko already handle kar diya hai ya nahi, taaki dobara skip na bheje
  const [audioReadyTrackId, setAudioReadyTrackId] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  // Support either MongoDB's _id or an API-provided id field.
  const currentUserId =
    user?._id ?? user?.id ?? user?.user?._id ?? user?.user?.id;
  const hostId = room?.host?._id ?? room?.host;
  const isHost = Boolean(
    currentUserId &&
    hostId &&
    String(currentUserId) === String(hostId)
  );
  // Keeps the latest server room state accessible inside async callbacks.
  const roomRef = useRef(room);
  roomRef.current = room;
  // ==========================================
  // YOUR EXACT SOCKET & FETCH LOGIC
  // ==========================================

  useEffect(() => {
    const socket = createSocket();
    let cancelled = false;
    const updateRoom = (updatedRoom) => {
      setRoom((currentRoom) => keepNewestRoomState(currentRoom, updatedRoom));
    };
    const onConnect = () => {
      console.info(`[socket:${socket.id}] connected; joining room ${id}`);
      socket.emit("join-room", id);
    };
    const onConnectError = (error) => {
      console.error("Realtime connection failed:", error.message);
      setPlaybackError(`Realtime connection failed: ${error.message}`);
    };
    const onRoomJoined = ({ roomId, room: roomSnapshot }) => {
      console.info(`Realtime sync joined for room ${roomId}`);
      // The backend sends the current room snapshot immediately after the
      // socket joins. Use it to synchronize the new listener with current state.
      if (roomSnapshot) {
        updateRoom(roomSnapshot);
      }
    };
    const onRoomJoinError = ({ message }) => {
      console.error("Realtime room join failed:", message);
      setPlaybackError(message);
    };
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("room-joined", onRoomJoined);
    socket.on("room-join-error", onRoomJoinError);
    socket.on("queue-updated", updateRoom);
    socket.on("user-joined", (userId) => {
      console.log(`User ${userId} joined the room`);
    });
    socket.on("playback-started", (updatedRoom) => {
      updateRoom(updatedRoom);
    });
    socket.on("playback-paused", (updatedRoom) => {
      updateRoom(updatedRoom);
    });
    socket.on("track-skipped", updateRoom);
    // React Strict Mode mounts, cleans up, and mounts again in development.
    // Deferring this connection lets the first cleanup cancel its test mount,
    // so it does not create a misleading connect/disconnect pair in the logs.
    // Join through the authenticated REST endpoint first.
    // The backend adds us as a member before Socket.IO connects.
    joinRoom(id)
      .then((updatedRoom) => {
        if (cancelled) return;
        updateRoom(updatedRoom);
        socket.connect();
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to join room:", error);
        setPlaybackError(error.message);
      });
    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("room-joined", onRoomJoined);
      socket.off("room-join-error", onRoomJoinError);
      socket.off("queue-updated", updateRoom);
      socket.off("user-joined");
      socket.off("playback-started");
      socket.off("playback-paused");
      socket.off("track-skipped", updateRoom);
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    const searchSongs = async () => {
      if (!songTitle.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const songs = await searchMusic(songTitle);
        setSearchResults(songs);
      } catch (error) {
        console.error("Failed to search songs", error);
      }
    };
    const timer = setTimeout(searchSongs, 500);
    return () => clearTimeout(timer);
  }, [songTitle]);
  // Load a new track and invalidate readiness from the previous track.

  useEffect(() => {
    const audio = audioRef.current;
    const trackId = room?.currentTrack?.providerTrackId;
    setAudioReadyTrackId(null);
    setCurrentTime(0);
    setDuration(0);
    trackEndedRef.current = null;
    if (!audio) return;
    audio.pause();
    if (!trackId) return;
    // Changing the audio element's src causes the browser to load the new
    // media. Calling audio.load() here can start a second load after metadata
    // arrives, reset currentTime to zero, and undo a late joiner's seek.
  }, [room?.currentTrack?.providerTrackId]);
  // The only effect that seeks and starts playback.

  useEffect(() => {
    const audio = audioRef.current;
    const trackId = room?.currentTrack?.providerTrackId;
    // Ignore metadata/readiness belonging to a different track.
    if (!audio || !trackId || audioReadyTrackId !== trackId) return;
    let cancelled = false;
    let cancelPendingSeek = null;
    const syncPlayback = async () => {
      const latestRoom = roomRef.current;
      if (latestRoom?.currentTrack?.providerTrackId !== trackId) return;
      audio.pause();
      const position = getPlaybackPosition(latestRoom);
      if (!Number.isFinite(position) || position < 0) return;
      const target =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.min(position, Math.max(0, audio.duration - 0.1))
          : position;
      // Do not start playback until an asynchronous seek has finished.
      if (Math.abs(audio.currentTime - target) > 0.25) {
        await new Promise((resolve, reject) => {
          let finished = false;
          let timeoutId;
          const cleanup = () => {
            audio.removeEventListener("seeked", onSeeked);
            audio.removeEventListener("error", onError);
            window.clearTimeout(timeoutId);
            if (cancelPendingSeek === cancel) {
              cancelPendingSeek = null;
            }
          };
          const finish = (error) => {
            if (finished) return;
            finished = true;
            cleanup();
            if (error) reject(error);
            else resolve();
          };
          const onSeeked = () => finish();
          const onError = () =>
            finish(new Error("Audio failed while seeking"));
          const cancel = () => finish();
          cancelPendingSeek = cancel;
          audio.addEventListener("seeked", onSeeked);
          audio.addEventListener("error", onError);
          try {
            timeoutId = window.setTimeout(
              () => finish(new Error("Audio seek timed out")),
              5000
            );
            audio.currentTime = target;
          } catch (error) {
            finish(error);
          }
        });
      }
      // An updated room or track may have arrived during the seek.
      if (
        cancelled ||
        roomRef.current?.currentTrack?.providerTrackId !== trackId
      ) {
        return;
      }
      const currentRoom = roomRef.current;
      setCurrentTime(audio.currentTime);
      if (!currentRoom?.isPlaying) {
        audio.pause();
        setAutoplayBlocked(false);
        return;
      }
      try {
        await audio.play();
        if (!cancelled) {
          setAutoplayBlocked(false);
        }
      } catch (error) {
        if (cancelled) return;
        if (error.name === "NotAllowedError") {
          // The room is playing, but the browser requires a user gesture.
          setAutoplayBlocked(true);
        } else {
          console.error("Failed to start synced playback:", error);
        }
      }
    };
    syncPlayback().catch((error) => {
      if (!cancelled) {
        console.error("Playback synchronization failed:", error);
      }
    });
    return () => {
      cancelled = true;
      cancelPendingSeek?.();
    };
  }, [
    audioReadyTrackId,
    room?.currentTrack?.providerTrackId,
    room?.isPlaying,
    room?.playbackPosition,
    room?.playbackStartedAt
  ]);

  const changePlayback = async (action) => {
    if (!room?.currentTrack || playbackRequestRef.current) return;
    playbackRequestRef.current = true;
    setIsPlaybackRequestPending(true);
    setPlaybackError("");
    try {
      const response = await fetch(`${API_URL}/rooms/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} playback`);
      }
      setRoom((currentRoom) => keepNewestRoomState(currentRoom, data));
    } catch (error) {
      console.error(`Failed to ${action} playback:`, error);
      setPlaybackError(error.message);
    } finally {
      playbackRequestRef.current = false;
      setIsPlaybackRequestPending(false);
    }
  };

  const handlePlay = () => changePlayback("play");

  const handlePause = () => changePlayback("pause");

  const resumeSyncedAudio = useCallback(() => {
    const audio = audioRef.current;
    const latestRoom = roomRef.current;

    if (!audio || !latestRoom?.currentTrack || !latestRoom.isPlaying) return;

    const position = getPlaybackPosition(latestRoom);
    if (!Number.isFinite(position) || position < 0) return;

    const target =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.min(position, Math.max(0, audio.duration - 0.1))
        : position;

    try {
      // This runs directly inside the listener's click handler, which keeps
      // the browser user gesture available for audio.play().
      audio.currentTime = target;
      const playPromise = audio.play();
      setCurrentTime(target);

      playPromise
        .then(() => setAutoplayBlocked(false))
        .catch((error) => {
          console.error("Failed to start local synced audio:", error);
          setAutoplayBlocked(true);
        });
    } catch (error) {
      console.error("Failed to prepare local synced audio:", error);
      setAutoplayBlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!autoplayBlocked) return undefined;

    const resumeOnInteraction = () => resumeSyncedAudio();
    window.addEventListener("pointerdown", resumeOnInteraction, { once: true });

    return () => window.removeEventListener("pointerdown", resumeOnInteraction);
  }, [autoplayBlocked, resumeSyncedAudio]);

  const handleSkip = async () => {
    // Prevent duplicate skip requests from repeated clicks.
    if (skipRequestRef.current) return;
    skipRequestRef.current = true;
    setPlaybackError("");
    try {
      const response = await fetch(
        `${API_URL}/rooms/${id}/skip`,
        {
          method: "POST",
          credentials: "include"
        }
      );
      const data = await response.json();
      // Don't treat an authentication/server error as a successful skip.
      if (!response.ok) {
        throw new Error(data.error || "Failed to skip track");
      }
      setRoom((currentRoom) => keepNewestRoomState(currentRoom, data));
    } catch (error) {
      console.error("Failed to skip track:", error);
      setPlaybackError(error.message);
    } finally {
      // Always release the guard, even when the request fails.
      skipRequestRef.current = false;
    }
  };

  const handleTrackEnd = () => {
    // The server clears the current track when the queue is empty, or advances
    // to the next track when one exists.  Always notify it so room state does
    // not remain "playing" after the audio element has ended.
    if (!room?.currentTrack || !isHost) return;
    // ===========================================================================
    // KNOWN GAP (frontend se poora fix nahi ho sakta, yeh samajh lena zaroori hai):
    //
    // Yeh function CHALU hota hai jab IS CLIENT ka apna <audio> element khatam hota hai.
    // Agar room me 3 log hain, teeno ka audio roughly SAME time khatam hoga, aur
    // teeno independently apna /skip bhej denge -- backend ko ek hi track khatam
    // hone pe 3 alag skip requests mil sakti hain, jisse queue se 2-3 tracks ek
    // saath skip ho sakte hain (sirf 1 hona chahiye tha).
    //
    // Neeche wala trackEndedRef guard sirf ISI client ko DOBARA skip bhejne se
    // rokta hai (jaise agar "ended" kisi wajah se 2 baar fire ho jaye isi client
    // pe) -- yeh MULTIPLE ALAG CLIENTS wali race nahi rokta.
    //
    // ASLI FIX backend pe hona chahiye: skip handler ko check karna chahiye ki
    // jo track skip ho raha hai, kya woh ABHI BHI room ka actual current track
    // hai -- agar nahi (matlab kisi aur client ne already skip kar diya), toh
    // request ko ignore kar do (idempotent skip). Lambe term me isse behtar yeh
    // hai ki backend khud ek timer se (duration + position) track-end trigger
    // kare, kisi bhi client ke "ended" event pe depend hi na kare.
    // ===========================================================================
    if (trackEndedRef.current === room.currentTrack.providerTrackId) return; // isi track ke liye isi client se already skip bhej chuke hain
    trackEndedRef.current = room.currentTrack.providerTrackId;
    handleSkip();
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect(); // Get the bounding rectangle of the progress bar
    const clickPosition = e.clientX - rect.left;// Calculate the click position relative to the progress bar
    const percentage = Math.max(
      0,
      Math.min(1, clickPosition / rect.width)); // Calculate the percentage of the click position relative to the progress bar width
    const newTime = percentage * duration; // Calculate the new time based on the percentage and total duration
    audioRef.current.currentTime = newTime;// Update the audio element's current time
    setCurrentTime(newTime);
    // TODO (seek sync): yeh abhi SIRF is client ka apna local audio.currentTime badalta hai.
    // Baaki room members ko pata hi nahi chalta ki kisi ne seek kiya -- unka playback purani
    // position pe hi chalta rahega. Jab bhi seek ko playback-control me shamil karna ho,
    // yahan bhi changePlayback jaisa hi ek backend call chahiye (naya position ke saath),
    // taaki backend state update kare aur baaki sabko broadcast kare.
  };

  if (!room) {
    return <div className="h-screen bg-[#09090b] flex items-center justify-center text-[#1DB954] font-medium tracking-widest uppercase animate-pulse">Loading Room...</div>;
  }
  /*
 ==========================================================
 CurrentTrack being null means
 nothing is playing in this room.
 ==========================================================
 */
  const hasTrack = !!room?.currentTrack;
  const isPlaying = Boolean(room.isPlaying);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;// Calculate progress percentage

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-[#1DB954] selection:text-black relative overflow-hidden pb-40">

      {/* 1. HEADER (Listener List, Sharing, Sync Status) */}
      <header className="flex items-center justify-between px-6 py-6 max-w-5xl mx-auto w-full z-10 relative border-b border-white/5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/discover")} className="rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
            <ChevronLeft size={20} />
          </Button>
          <div className="flex items-center gap-3 text-sm font-medium text-neutral-400">
            <span className="text-white font-bold tracking-wide">Jamify</span>
            <span className="opacity-50">/</span>
            <span className="text-white flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {/* FUTURE: Realtime Playback Sync Indicator */}
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-[pulse_2s_ease-in-out_infinite]" />
              {room.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* LISTENER LIST (Figma-style Avatars) */}
          <div className="flex items-center -space-x-2">
            {room.users?.slice(0, 4).map((user, i) => (
              <div key={user.id || i} className="relative group">
                {/* FUTURE: Host Badge */}
                {user.isHost && (
                  <div className="absolute -top-2 -right-1 z-30 bg-black rounded-full p-0.5">
                    <Crown size={12} className="text-yellow-400" />
                  </div>
                )}
                <Avatar className={`w-9 h-9 border-2 border-[#09090b] relative z-10 hover:z-20 transition-transform cursor-pointer shadow-lg ${user.isHost ? 'ring-1 ring-yellow-400/50' : ''}`}>
                  <AvatarFallback className="bg-neutral-800 text-xs text-white font-bold">
                    {user.initials || user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
            {room.users?.length > 4 && (
              <div className="w-9 h-9 rounded-full border-2 border-[#09090b] bg-neutral-900 flex items-center justify-center z-0 text-[10px] font-bold text-neutral-400 hover:bg-neutral-800 transition-colors cursor-pointer">
                +{room.users.length - 4}
              </div>
            )}
          </div>
          {/* ROOM SHARING */}
          <Button variant="outline" className="hidden sm:flex border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-bold gap-2 transition-all">
            <Share2 size={14} /> Invite
          </Button>
        </div>
      </header>

      {/* 2. MAIN CENTER AREA (Search + Shared Queue) */}
      <main className="max-w-3xl mx-auto w-full mt-8 px-6 z-10 relative">
        {/* SPOTIFY SEARCH */}
        <div className="relative mb-10 z-50">
          <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-2xl p-2 backdrop-blur-md focus-within:border-white/30 focus-within:bg-white/[0.06] transition-all shadow-lg">
            <Search className="absolute left-6 text-zinc-500" size={20} />
            <Input
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              placeholder="Find a song on Spotify..."
              className="w-full bg-transparent border-none py-6 pl-14 pr-12 text-white focus-visible:ring-0 placeholder:text-zinc-600 text-lg font-medium shadow-none"
            />
            {songTitle && (
              <button onClick={() => setSongTitle("")} className="absolute right-6 text-zinc-500 hover:text-white transition-colors bg-white/5 p-1 rounded-full">
                <X size={16} />
              </button>
            )}
          </div>
          {/* SEARCH RESULTS DROPDOWN */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 top-full mt-3 bg-[#111113] border border-white/10 rounded-2xl shadow-2xl max-h-[400px] overflow-y-auto z-50 p-2 custom-scrollbar"
              >
                <div className="px-3 py-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Top Results</div>
                {searchResults.map((track) => (
                  <div key={track.providerTrackId} className="group flex items-center gap-4 p-2 hover:bg-white/5 rounded-xl transition cursor-pointer border border-transparent hover:border-white/5">
                    <img src={track.cover} alt="cover" className="w-12 h-12 rounded-md object-cover shadow-sm bg-neutral-900" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate text-[15px]">{track.title}</p>
                      <p className="text-xs font-medium text-neutral-400 truncate mt-0.5">{track.artist}</p>
                    </div>
                    {/* ADD TO QUEUE */}
                    <Button
                      onClick={() => {
                        const songData = {
                          provider: track.provider,
                          providerTrackId: track.providerTrackId
                        };
                        addsongToQueue(id, songData)
                          .then((updatedRoom) => {
                            setRoom((currentRoom) =>
                              keepNewestRoomState(currentRoom, updatedRoom)
                            );
                            setSearchResults([]);
                            setSongTitle("");
                          })
                          .catch((error) => console.error("Failed to add song", error));
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-white hover:bg-neutral-200 text-black font-bold rounded-full transition-all shadow-md px-5 h-9"
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* SHARED REALTIME QUEUE */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Up Next</h1>
            <span className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              {room.queue?.length || 0} Tracks
            </span>
          </div>
          <div className="flex flex-col gap-2 relative z-0">
            {!room.queue || room.queue.length === 0 ? (
              <div className="text-center text-neutral-500 py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <Music size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-white mb-1">The queue is completely empty.</p>
                <p className="text-sm">Search for a song above to start the party.</p>
              </div>
            ) : (
              room.queue.map((song, idx) => (
                <div key={song.providerTrackId} className="group flex items-center gap-4 p-3 pr-4 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5">
                  {/* FUTURE: Queue Reordering Drag Handle */}
                  <div className="w-6 flex justify-center text-neutral-600 cursor-grab active:cursor-grabbing hover:text-white transition-colors">
                    <span className="text-xs font-mono group-hover:hidden">{idx + 1}</span>
                    <GripVertical size={16} className="hidden group-hover:block opacity-50 hover:opacity-100" />
                  </div>
                  <img src={song.cover} alt="cover" className="w-12 h-12 bg-neutral-900 rounded-md object-cover shadow-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{song.title}</p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{song.artist}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 hidden sm:block bg-neutral-900 px-2 py-1 rounded">
                      Added by {song.addedBy.username}
                    </span>
                    {/* REMOVE SONG */}
                    <button
                      onClick={() => {
                        removeSongfromqueue(id, song.providerTrackId)
                          .then((updatedRoom) =>
                            setRoom((currentRoom) =>
                              keepNewestRoomState(currentRoom, updatedRoom)
                            )
                          )
                          .then(() => console.log("removed song from queue"))
                          .catch(error => console.error("Failed to remove song", error));
                      }}
                      className="text-neutral-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 4. CURRENT PLAYER SECTION (Dynamic Island) */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none px-4 z-40">
        <audio ref={audioRef}
          src={room?.currentTrack?.streamUrl}
          onEnded={() => handleTrackEnd()} // Call handleTrackEnd when the track ends
          onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} // Update currentTime state as the audio plays
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            const trackId = room?.currentTrack?.providerTrackId;
            if (trackId) {
              setAudioReadyTrackId(trackId);
            }
          }} // Set the duration state when metadata is loaded
        />
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[#18181b]/95 backdrop-blur-xl border border-white/10 p-3 rounded-full flex items-center gap-4 sm:gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto w-full max-w-lg"
        >
          <div className="w-14 h-14 rounded-full bg-neutral-900 shrink-0 overflow-hidden shadow-inner border border-white/5 relative">
            {hasTrack ? (
              <img src={room.currentTrack.cover} alt="current" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <Disc3 size={20} className="animate-[spin_4s_linear_infinite]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* CURRENT SONG PLAYBACK INFO */}
            <p className={`text-sm font-bold truncate ${hasTrack ? "text-white" : "text-neutral-500"}`}>
              {hasTrack ? room.currentTrack.title : "Nothing playing"}
            </p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {hasTrack ? room.currentTrack.artist : "Add a song to start jamming"}
            </p>
            {/* PLAYBACK PROGRESS */}
            <div
              ref={progressRef}
              onClick={handleSeek}
              className="w-full h-1 bg-black/50 rounded-full mt-2.5 overflow-hidden cursor-pointer"
            >
              <motion.div
                className="h-full bg-[#1DB954]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            {/* TIME */}
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            {playbackError && (
              <p role="alert" className="mt-1 text-[10px] text-red-400 truncate">
                {playbackError}
              </p>
            )}
            {autoplayBlocked && isPlaying && (
              <p className="mt-1 text-[10px] text-neutral-500">
                Tap anywhere to enable audio
              </p>
            )}
          </div>
          {isHost && (
            <div className="flex items-center gap-2 sm:gap-4 pr-2 shrink-0">
              <button
                type="button"
                disabled={!hasTrack || isPlaybackRequestPending}
                aria-label={isPlaying ? "Pause playback" : "Play playback"}
                onClick={() => {
                  if (!hasTrack || isPlaybackRequestPending) return;
                  if (autoplayBlocked && isPlaying) {
                    resumeSyncedAudio();
                    return;
                  }
                  isPlaying ? handlePause() : handlePlay();
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${hasTrack && !isPlaybackRequestPending ? "bg-white text-black hover:scale-105" : "bg-neutral-800 text-neutral-600 cursor-not-allowed"}`}
              >
                {isPlaying && hasTrack ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
              <button disabled={!hasTrack} onClick={handleSkip} className={`text-neutral-400 hover:text-white transition-colors hidden sm:block active:scale-95 ${!hasTrack ? "opacity-30 cursor-not-allowed"
                : ""
                }`}
              >
                <SkipForward size={20} fill="currentColor" className="opacity-50 hover:opacity-100" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
