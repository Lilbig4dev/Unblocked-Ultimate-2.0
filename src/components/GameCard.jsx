import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { motion } from "motion/react";
import { Play } from "lucide-react";

export function GameCard({ game, onSelect }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="cursor-pointer"
      onClick={() => onSelect(game)}
    >
      <Card className="overflow-hidden border-border bg-card transition-colors hover:border-primary/50 group">
        <CardContent className="p-0 relative">
          <AspectRatio ratio={16 / 9}>
            <img
              src={game.thumbnail}
              alt={game.title}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Play className="text-primary-foreground fill-primary-foreground w-6 h-6 ml-1" />
               </div>
            </div>
          </AspectRatio>
        </CardContent>
        <CardFooter className="p-4 flex flex-col items-start gap-2">
          <div className="flex justify-between items-center w-full">
            <h3 className="font-bold text-lg leading-tight uppercase tracking-tight font-mono text-foreground">{game.title}</h3>
            <Badge variant="outline" className="text-[10px] uppercase font-mono border-primary/30 text-primary">
              {game.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{game.description}</p>
          <div className="flex gap-1 mt-1">
            {game.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground font-mono">
                #{tag}
              </span>
            ))}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
