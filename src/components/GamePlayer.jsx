import { Button } from "@/components/ui/button";
import { X, Maximize2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

export function GamePlayer({ game, onClose }) {
  const [key, setKey] = useState(0);

  const resetGame = () => {
    setKey((prev) => prev + 1);
  };

  if (!game) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 md:p-8"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-6xl aspect-video bg-card rounded-xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/10 flex flex-col"
        >
          {/* Controls Bar */}
          <div className="bg-muted/50 p-2 md:p-4 flex justify-between items-center border-bottom border-border">
            <div className="flex items-center gap-3">
               <h2 className="text-sm md:text-lg font-bold font-mono tracking-wider uppercase text-primary">
                  NOW PLAYING: {game.title}
               </h2>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={resetGame}
                className="hover:text-primary"
                title="Restart Game"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {}} // Placeholder for fullscreen logic if needed
                className="hover:text-primary"
                title="Maximize"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={onClose}
                className="ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Iframe Container */}
          <div className="flex-1 bg-black relative">
            <iframe
              key={key}
              src={game.iframeUrl}
              className="w-full h-full border-none"
              title={game.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          
          {/* Footer Info */}
          <div className="bg-muted/30 px-4 py-2 flex justify-between items-center">
             <p className="text-[10px] text-muted-foreground font-mono">ID: {game.id} | SRC: {new URL(game.iframeUrl).hostname}</p>
             <p className="text-[10px] text-primary/60 font-mono animate-pulse">SYSTEM ACTIVE </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
