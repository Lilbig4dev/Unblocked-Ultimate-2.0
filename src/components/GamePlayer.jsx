import { Button } from "@/components/ui/button";
import { X, Maximize2, RotateCcw, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo, useEffect, useRef } from "react";

export function GamePlayer({ game, onClose }) {
  const [key, setKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handlePointerLock = () => {
    const elem = containerRef.current;
    if (elem && elem.requestPointerLock) {
      elem.requestPointerLock();
    }
  };

  const [isProxyMode, setIsProxyMode] = useState(
    game?.iframeUrl.startsWith('http') && 
    !game.iframeUrl.includes('localhost') && 
    !game.iframeUrl.includes('127.0.0.1')
  );

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
    if (game.iframeUrl?.trim().startsWith('<')) return null; // It's an embed code, handled by srcDoc
    if (isProxyMode && !game.iframeUrl.startsWith('/')) {
      try {
        return `/api/proxy?url=${encodeURIComponent(game.iframeUrl)}&stealth=true`;
      } catch (e) {
        return game.iframeUrl;
      }
    }
    return game.iframeUrl;
  }, [game, isProxyMode]);

  const currentSrcDoc = useMemo(() => {
    if (!game) return null;
    if (game.iframeUrl?.trim().startsWith('<')) {
       // If it's an iframe tag, we can either use it as is or wrap it
       return game.iframeUrl;
    }
    return null;
  }, [game]);

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
          className={`relative w-full max-w-6xl aspect-video bg-card rounded-xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/10 flex flex-col ${isFullscreen ? 'max-w-none w-screen h-screen rounded-none border-none' : ''}`}
          id="game-container"
        >
          {/* Controls Bar */}
          {!isFullscreen && (
          <div className="bg-muted/50 p-2 md:p-4 flex justify-between items-center border-b border-border">
            <div className="flex items-center gap-3">
               <h2 className="text-sm md:text-lg font-bold font-mono tracking-wider uppercase text-primary">
                  {game.title} {isProxyMode && <span className="text-[10px] bg-primary text-primary-foreground px-1 py-0.5 rounded ml-2">PROXY BYPASS</span>}
               </h2>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleProxyMode}
                disabled={!!currentSrcDoc}
                onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); } }}
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
                onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); } }}
                className="hover:text-primary"
                title="Fullscreen Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              {!currentSrcDoc && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={openInNewTab}
                  onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); } }}
                  className="hover:text-primary"
                  title="Open in New Tab (Bypass Mode)"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={resetGame}
                onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); } }}
                className="hover:text-primary"
                title="Restart Game"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={onClose}
                onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); } }}
                className="ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          )}

          <div 
            ref={containerRef}
            className="flex-1 bg-black relative cursor-crosshair overflow-hidden"
          >
            {isFullscreen && (
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); } }}
                className="absolute top-4 right-4 z-[100] opacity-30 hover:opacity-100 transition-opacity rounded-full w-12 h-12"
                tabIndex="-1"
                title="Exit Fullscreen"
              >
                <X className="w-8 h-8" />
              </Button>
            )}
            <iframe
              key={`${key}-${isProxyMode}`}
              src={currentIframeUrl || undefined}
              srcDoc={currentSrcDoc || undefined}
              className="w-full h-full border-none"
              title={game.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; keyboard; gamepad"
              sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              allowFullScreen
            />
          </div>
          
          {/* Footer Info */}
          {!isFullscreen && (
          <div className="bg-muted/30 px-4 py-2 flex justify-between items-center">
             <p className="text-[10px] text-muted-foreground font-mono">ID: {game.id} | SRC: {game.iframeUrl.startsWith('http') ? new URL(game.iframeUrl).hostname : 'LOCAL'}</p>
             <p className="text-[10px] text-primary/60 font-mono animate-pulse">SYSTEM ACTIVE </p>
          </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
