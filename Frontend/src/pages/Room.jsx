import { useState, useEffect ,useRef} from "react"; //useref is to control audio element through react 
import { Play, Pause, SkipForward, SkipBack, Share2, ChevronLeft, Search, X, Disc3, Music, GripVertical, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import { addsongToQueue, getRoomById, removeSongfromqueue } from "@/services/roomService";
import { createSocket } from "@/socket";
import { motion, AnimatePresence } from "framer-motion";
import { searchMusic } from "@/services/musicService.js";
import { getPlaybackPosition } from "@/utils/playback.js"; // Import the getPlaybackPosition function

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};



export default function Rooms() {
  const navigate = useNavigate();
  const { id } = useParams();
  
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
  
  // ==========================================
  // YOUR EXACT SOCKET & FETCH LOGIC
  // ==========================================
  useEffect(() => {
    const socket = createSocket();
    

    const updateRoom = (updatedRoom) => {
      setRoom(updatedRoom);
    };

    getRoomById(id)
      .then(updateRoom)
      .catch((error) => console.error("Failed to load room", error));

    const onConnect = () => {
      console.info(`[socket:${socket.id}] connected; joining room ${id}`);
      socket.emit("join-room", id);
    };
    const onConnectError = (error) => {
      console.error("Realtime connection failed:", error.message);
      setPlaybackError(`Realtime connection failed: ${error.message}`);
    };
    const onRoomJoined = ({ roomId }) => {
      console.info(`Realtime sync joined for room ${roomId}`);
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
    const connectTimer = window.setTimeout(() => socket.connect(), 0);
    
    return () => {
      window.clearTimeout(connectTimer);
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

useEffect(() => {
 const audio = audioRef.current;  // Our <audio> element

  
  if (!audio || !room?.currentTrack?.providerTrackId) return; //if no audio or no current track, exit early

  
  audio.load(); // Browser ko naye song ko load karne bolo.

  
  // Actual seek hum metadata load hone ke baad karenge.
  setCurrentTime(0); // briefly reset currentTime to 0 for the new track before metadata is loaded and actual seek is performed

  
  setDuration(0); // Duration bhi naye song ke according dobara milegi.

  // Ye function tab chalega jab browser audio ki
  // metadata load kar chuka hoga.


  

  const handleMetadata = () => {

    // Backend ke timing data se calculate karo
    // ki song ko abhi kis position par hona chahiye.
    const position = getPlaybackPosition(room);

    // Audio ko us position par seek karo.
    //
    // Example:
    // B joins while song is at 85 seconds
    // → audio.currentTime = 85
    audio.currentTime = position;

    // UI ko bhi same position dikhao.
    setCurrentTime(position);

    // Agar room already playing thi,
    // to audio ko play karna hai.
    //
    // Agar paused thi, hum sirf position set karenge.
    if (room.isPlaying) {
      audio.play().catch((error) => {
        console.log("Autoplay prevented:", error);
      });
    }
  };
  // Browser ko bolo:
  // "Jab metadata ready ho, handleMetadata chala dena."
  audio.addEventListener("loadedmetadata", handleMetadata);

 

  // Cleanup:
  // Effect dobara chale ya component unmount ho,
  // purana listener hata do.
  return () => {
    audio.removeEventListener("loadedmetadata", handleMetadata);
  };

}, [room?.currentTrack?.providerTrackId]);

 
useEffect(() => {
  if (!audioRef.current) return;

   if (room?.isPlaying) {
    audioRef.current.play().catch((error) => {
      console.error("Failed to play audio:", error);
    });
  } else {
    audioRef.current.pause();
  }
}, [room?.isPlaying, room?.currentTrack?.providerTrackId]);

  const changePlayback = async (action) => {
    if (!room?.currentTrack || playbackRequestRef.current) return;

    playbackRequestRef.current = true;
    setIsPlaybackRequestPending(true);
    setPlaybackError("");

    try {
      const response = await fetch(`http://localhost:5000/rooms/${id}/${action}`, {
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

      setRoom(data);
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
const handleSkip = async () => {
  try {
    const response = await fetch(
      `http://localhost:5000/rooms/${id}/skip`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to skip track");
    }

    setRoom(data);
  } catch (error) {
    console.error("failed to skip track", error);
    setPlaybackError(error.message);
  }
};
const handleTrackEnd = () => {
  // The server clears the current track when the queue is empty, or advances
  // to the next track when one exists.  Always notify it so room state does
  // not remain "playing" after the audio element has ended.
  if (room?.currentTrack) handleSkip();
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
                          .then((updatedRoom) => { setRoom(updatedRoom); setSearchResults([]); setSongTitle(""); })
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
                          .then(updatedRoom => setRoom(updatedRoom))
                          .then(()=>console.log("removed song from queue"))
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
        onLoadedMetadata={(e) => setDuration(e.target.duration)} // Set the duration state when metadata is loaded
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
</div>
          
          {/* FUTURE: Play/Pause, Skip/Previous Controls */}
          <div className="flex items-center gap-2 sm:gap-4 pr-2 shrink-0">
            <button className="text-neutral-400 hover:text-white transition-colors hidden sm:block active:scale-95">
              <SkipBack size={20} fill="currentColor" className="opacity-50 hover:opacity-100" />
            </button>
            <button 
              type="button"
              disabled={!hasTrack || isPlaybackRequestPending}
              aria-label={isPlaying ? "Pause playback" : "Play playback"}
              onClick={() => {
              if (!hasTrack || isPlaybackRequestPending) return;

              isPlaying ? handlePause() : handlePlay();}}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${hasTrack && !isPlaybackRequestPending ? "bg-white text-black hover:scale-105" : "bg-neutral-800 text-neutral-600 cursor-not-allowed"}`}
            >
              {isPlaying && hasTrack ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
           <button disabled={!hasTrack} onClick={handleSkip} className={`text-neutral-400 hover:text-white transition-colors hidden sm:block active:scale-95 ${!hasTrack    ? "opacity-30 cursor-not-allowed"
    : ""
}`}
>
              <SkipForward size={20} fill="currentColor" className="opacity-50 hover:opacity-100" />
            </button>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
