import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <Card className="overflow-hidden border-border bg-card transition-colors hover:border-primary/50 group h-full">
        <CardContent className="p-4 flex flex-col items-start gap-2 relative h-full justify-between">
          <div className="flex justify-between items-center w-full">
            <h3 className="font-bold text-lg leading-tight uppercase tracking-tight font-mono text-foreground group-hover:text-primary transition-colors">{game.title}</h3>
            <Badge variant="outline" className="text-[10px] uppercase font-mono border-primary/30 text-primary shrink-0 ml-2">
              {game.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{game.description}</p>
          <div className="flex flex-wrap gap-2 mt-4 items-center w-full">
            <div className="flex gap-2 flex-grow">
              {game.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] text-muted-foreground font-mono">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all shadow-sm">
               <Play className="text-primary group-hover:text-primary-foreground fill-current w-4 h-4 ml-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
