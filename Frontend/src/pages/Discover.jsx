import {  useEffect, useState } from 'react';
import { Filter, Sparkles, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from '@/components/Navbar';
import { RoomCard } from "@/components/RoomCard";
import { ROOMS, GENRES, VIBES } from "@/lib/mockData";
import { getRooms } from '@/services/roomService';


export  default function DiscoverPage() {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedVibe, setSelectedVibe] = useState('All');
  const [rooms, setRooms] = useState([]);
  useEffect(()=>{
   getRooms().then(data=>setRooms(data))
    
  },[])

  // Filter Logic
 const filteredRooms = rooms.filter((room) => {
  const matchGenre =
    selectedGenre === "All" ||
    room.genre.includes(selectedGenre);

  const matchVibe =
    selectedVibe === "All" ||
    room.vibe === selectedVibe;

  return matchGenre && matchVibe;
});
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#1DB954] selection:text-black">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight">Live Rooms</h1>
          <p className="text-muted-foreground text-lg">Discover and join public listening sessions happening right now.</p>
        </div>

        {/* Inline Filters */}
        <div className="mb-8 space-y-6">
          <div className="flex flex-col space-y-3">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Filter size={14}/> Genres
            </span>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(genre => (
                <Badge 
                  key={genre} 
                  variant={selectedGenre === genre ? "default" : "secondary"} 
                  className="cursor-pointer text-sm px-4 py-1" 
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14}/> Vibes
            </span>
            <div className="flex flex-wrap gap-2">
              {VIBES.map(vibe => (
                <Badge 
                  key={vibe} 
                  variant={selectedVibe === vibe ? "default" : "secondary"} 
                  className={`cursor-pointer text-sm px-4 py-1 ${selectedVibe === vibe ? "bg-[#1DB954] text-black hover:bg-[#1ed760]" : ""}`} 
                  onClick={() => setSelectedVibe(vibe)}
                >
                  {vibe}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.length > 0 ? (
            filteredRooms.map(room => (
              <RoomCard key={room.id} room={room} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-32 text-muted-foreground">
              <Headphones size={48} className="mb-4 opacity-20" />
              <p className="text-lg">No rooms found matching your taste. Be the first to create one!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}