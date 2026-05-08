import { Button } from "@/components/ui/button";
import { X, Maximize2, RotateCcw, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo } from "react";

export function GamePlayer({ game, onClose }) {
  const [key, setKey] = useState(0);

  const [isProxyMode, setIsProxyMode] = useState(false);

  const resetGame = () => {
    setKey((prev) => prev + 1);
  };

  const toggleProxyMode = () => {
    setIsProxyMode(!isProxyMode);
    setKey((prev) => prev + 1);
  };

  const openInNewTab = () => {
    if (!game) return;
    window.open(game.iframeUrl, '_blank');
  };

  const toggleFullscreen = () => {
    const element = document.getElementById('game-container');
    if (!document.fullscreenElement) {
      if (element?.requestFullscreen) {
        element.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const currentIframeUrl = useMemo(() => {
    if (!game) return "";
    if (isProxyMode) {
      try {
        const url = new URL(game.iframeUrl.startsWith('/') ? `${window.location.protocol}//${window.location.host}${game.iframeUrl}` : game.iframeUrl);
        const protocol = url.protocol.replace(':', '');
        const host = url.host;
        const path = url.pathname + url.search;
        return `/api/proxy/${protocol}/${host}${path}`;
      } catch (e) {
        return game.iframeUrl;
      }
    }
    return game.iframeUrl;
  }, [game, isProxyMode]);

  if (!game) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-6xl aspect-video bg-card rounded-xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/10 flex flex-col"
          id="game-container"
        >
          {/* Controls Bar */}
          <div className="bg-muted/50 p-2 md:p-4 flex justify-between items-center border-b border-border">
            <div className="flex items-center gap-3">
               <h2 className="text-sm md:text-lg font-bold font-mono tracking-wider uppercase text-primary">
                  NOW PLAYING: {game.title} {isProxyMode && <span className="text-[10px] bg-primary text-primary-foreground px-1 py-0.5 rounded ml-2">PROXY BYPASS</span>}
               </h2>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleProxyMode}
                className={isProxyMode ? "bg-primary/20 text-primary border border-primary/30" : "hover:text-primary"}
                title={isProxyMode ? "Disable AI Proxy" : "Enable AI Proxy (Bypass Blocks)"}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold">PROXY</span>
                  <div className={`w-2 h-2 rounded-full ${isProxyMode ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                </div>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullscreen}
                className="hover:text-primary"
                title="Fullscreen Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={openInNewTab}
                className="hover:text-primary"
                title="Open in New Tab (Bypass Mode)"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
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
              key={`${key}-${isProxyMode}`}
              src={currentIframeUrl}
              className="w-full h-full border-none"
              title={game.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; keyboard; gamepad"
              allowFullScreen
            />
          </div>
          
          {/* Footer Info */}
          <div className="bg-muted/30 px-4 py-2 flex justify-between items-center">
             <p className="text-[10px] text-muted-foreground font-mono">ID: {game.id} | SRC: {game.iframeUrl.startsWith('http') ? new URL(game.iframeUrl).hostname : 'LOCAL'}</p>
             <p className="text-[10px] text-primary/60 font-mono animate-pulse">SYSTEM ACTIVE </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
