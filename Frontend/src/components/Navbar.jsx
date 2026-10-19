import { useState } from 'react';
import { Headphones, Plus, Sparkles, Filter, LogOut } from 'lucide-react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

const GENRES = ["Pop", "Lo-Fi", "Hip-Hop", "Electronic", "Acoustic"];
const VIBES = ["Chill", "Energetic", "Focus", "Hype", "Relaxed"];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Navbar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("");



  const handleCreateRoom = async () => {

  // basic frontend validation
  if (!roomName || !selectedGenre || !selectedVibe) {
    return;
  }

  // room object that frontend will send to backend
  const roomData = {

    name: roomName,

    // genre backend me array structure me hai
   genre: selectedGenre,

    vibe: selectedVibe,

    // empty initially
    users: [],

    currentTrack: null,

    queue: []
  };

  try {

    // sending POST request to backend
    const res = await fetch(
      `${API_URL}/rooms`,
      {

        method: "POST",
        credentials: "include", // include cookies for session management

        headers: {
          "Content-Type": "application/json"
        },

        // converting JS object → JSON string
        body: JSON.stringify(roomData)

      }
    );
    

    // converting backend response → JS object
    const newRoom = await res.json();
    console.log(newRoom);

console.log("CREATED ROOM ID:", newRoom._id);
console.log("NAVIGATING TO:", `/room/${newRoom._id}`);

    // navigate to newly created room
    navigate(`/room/${newRoom._id}`);

  } catch (error) {

    console.error("Failed to create room", error);

  }
};

  const handleLogout = async () => {
    try {

      await logout();

      navigate("/login", { replace: true });

    } catch (error) {

      console.error("Failed to logout", error);

    }
  };

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/discover")}>
        <Headphones size={28} className="text-[#1DB954]" />
        <span className="text-2xl font-bold tracking-tight text-foreground">JamLite</span>
      </div>
      
      <div className="flex items-center space-x-4">
        
      {/* SLIDE-OUT PANEL (SHEET) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" className="hidden md:flex rounded-full font-bold border border-neutral-800 hover:border-[#1DB954]/50 hover:text-[#1DB954] transition-all bg-neutral-900 text-white shadow-lg">
              <Plus size={16} className="mr-2" /> Create Room
            </Button>
          </SheetTrigger>
          
          <SheetContent className="bg-neutral-950/95 backdrop-blur-2xl border-l border-neutral-800 text-white w-full sm:max-w-md flex flex-col p-0 shadow-[0_0_50px_rgba(0,0,0,0.7)]">
            
            <div className="px-6 py-8 border-b border-neutral-800/50 bg-neutral-900/20">
              <SheetTitle className="text-3xl font-extrabold text-white tracking-tight mb-2">Start a Jam</SheetTitle>
              <SheetDescription className="text-neutral-400 text-sm">
                Set up your public room. People will discover it based on the vibe you choose.
              </SheetDescription>
            </div>

            <div className="flex-grow flex flex-col gap-8 px-6 py-8 overflow-y-auto custom-scrollbar">
              
              {/* Room Name Input */}
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest mb-3">Room Name</label>
                <Input 
                  id="name" 
                  placeholder="e.g., Late Night Coding" 
                  className="bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600 focus-visible:ring-[#1DB954] focus-visible:ring-offset-0 focus-visible:border-[#1DB954] text-base py-6 rounded-xl shadow-inner transition-all"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              {/* Genre Selection */}
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Filter size={12} className="text-[#1DB954]"/> Select Genre
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(genre => (
                    <Badge 
                      key={genre} 
                      className={`cursor-pointer text-sm px-4 py-2 rounded-lg transition-all border border-transparent ${
                        selectedGenre === genre 
                        ? "bg-[#1DB954] text-black shadow-[0_0_15px_rgba(29,185,84,0.3)] hover:bg-[#1ed760]" 
                        : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                      }`}
                      onClick={() => setSelectedGenre(genre)}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Vibe Selection */}
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles size={12} className="text-blue-500"/> Select Vibe
                </label>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map(vibe => (
                    <Badge 
                      key={vibe} 
                      className={`cursor-pointer text-sm px-4 py-2 rounded-lg transition-all border border-transparent ${
                        selectedVibe === vibe 
                        ? "bg-[#1DB954] text-black shadow-[0_0_15px_rgba(29,185,84,0.3)] hover:bg-[#1ed760]" 
                        : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                      }`}
                      onClick={() => setSelectedVibe(vibe)}
                    >
                      {vibe}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Pinned Button */}
            <div className="p-6 border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-md mt-auto">
              <Button 
                onClick={handleCreateRoom}
                disabled={!roomName || !selectedGenre || !selectedVibe}
                className="w-full bg-white text-black hover:bg-[#1DB954] hover:text-black font-extrabold py-6 text-base rounded-xl transition-all disabled:opacity-20 disabled:hover:bg-white disabled:hover:text-black active:scale-[0.98]"
              >
                Start Jamming
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        {/* END SLIDE-OUT PANEL */}

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          <LogOut size={16} className="mr-2" /> Logout
        </Button>

        <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold">
          JL
        </div>
      </div>
    </nav>
  );
}
