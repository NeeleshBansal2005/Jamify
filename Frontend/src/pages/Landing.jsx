import { motion } from "framer-motion";
import { Headphones, Play, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Aceternity UI Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#1DB954] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20" />

      <div className="z-10 flex flex-col items-center text-center max-w-3xl px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center space-x-3 mb-6">
          <Headphones size={48} className="text-[#1DB954]" />
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">Jamify</h1>
        </motion.div>
        
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-2xl md:text-4xl font-bold mb-6 text-foreground">
         
        </motion.h2>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-2xl">
          Transforming private listening into social exploration. Discover live rooms, join instantly, and experience perfectly synchronized playback globally.
        </motion.p>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Button onClick={() => navigate("/login")} size="lg" className="bg-[#1DB954] text-black hover:bg-[#1ed760] rounded-full px-8 py-6 text-lg font-bold shadow-[0_0_40px_rgba(29,185,84,0.4)] transition-all hover:scale-105">
            <Headphones className="mr-2 h-6 w-6" /> Log in
          </Button>
        </motion.div>

        {/* Features Inline */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          {[
            { icon: <Search />, title: "Discover", desc: "Browse public rooms globally based on live activity." },
            { icon: <Play />, title: "Real-Time Sync", desc: "Zero-drift backend controlled playback engine." },
            { icon: <Sparkles />, title: "Taste Matching", desc: "Filter and find rooms by genre and vibe." }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl border border-border/50 bg-secondary/30 backdrop-blur-sm">
              <div className="mb-4 text-[#1DB954]">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
