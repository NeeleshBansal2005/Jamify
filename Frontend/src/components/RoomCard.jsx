import { Users, Music } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { joinRoom } from "@/services/roomService";
import { useState } from "react";

export function RoomCard({ room }) {
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoin = async () => {
    setIsJoining(true);
    setJoinError("");

    try {
      // Important: opening the room page alone is not enough. This request
      // adds the logged-in user to room.members, which lets their socket
      // receive the room's play/pause/queue updates.
      await joinRoom(room._id);
      navigate(`/room/${room._id}`);
    } catch (error) {
      console.error("Failed to join room:", error);
      setJoinError(error.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    
    <Card className="group flex flex-col h-full bg-secondary/20 border-border/50 hover:border-[#1DB954]/50 transition-all hover:shadow-[0_0_20px_rgba(29,185,84,0.1)]">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg truncate pr-4">{room.name}</CardTitle>
          <Badge variant="outline" className="flex items-center gap-1.5 font-medium border-border text-muted-foreground">
            <Users size={12} />
            {room.users?.length || 0}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4 flex-grow">
        <div className="bg-background/50 p-3 rounded-lg flex items-center space-x-3 border border-border/50">
          <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center flex-shrink-0">
            <Music size={18} className="text-[#1DB954]" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-[#1DB954] font-bold uppercase tracking-wider mb-0.5">Now Playing</p>
            <p className="text-sm font-medium truncate text-foreground">{room.currentTrack?.title}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex space-x-2">
          <Badge variant="secondary" className="text-xs">#{room.genre?.[0]}</Badge>
          <Badge variant="secondary" className="text-xs">#{room.vibe}</Badge>
        </div>
        <Button
          size="sm"
          disabled={isJoining}
          className="bg-foreground text-background hover:bg-[#1DB954] hover:text-black font-bold rounded-full group-hover:scale-105 transition-transform"
          onClick={handleJoin}
        >
          {isJoining ? "Joining..." : "Join"}
        </Button>
      </CardFooter>
      {joinError && <p role="alert" className="px-6 pb-4 text-xs text-red-500">{joinError}</p>}
    </Card>
  );
}
