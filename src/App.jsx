import { useState, useMemo, useEffect } from "react";
import gamesData from "@/data/games.json";
import { GameCard } from "@/components/GameCard";
import { GamePlayer } from "@/components/GamePlayer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Gamepad2, 
  Search, 
  LayoutDashboard, 
  Trophy, 
  History, 
  Settings,
  Car,
  Puzzle,
  Sword,
  Dices,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  auth, 
  signInWithGoogle, 
  logout, 
  getUserProfile, 
  createUserProfile, 
  updateUserProfile
} from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const games = gamesData;

export default function App() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", label: "All Assets", icon: LayoutDashboard },
    { id: "action", label: "Action", icon: Sword },
    { id: "horror", label: "Horror", icon: ShieldCheck },
    { id: "sandbox", label: "Sandbox", icon: Puzzle },
    { id: "driving", label: "Driving", icon: Car },
    { id: "app", label: "Apps/Media", icon: Settings },
    { id: "simulator", label: "Simulators", icon: History },
    { id: "sports", label: "Sports", icon: Trophy },
  ];
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Profile Setup State
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState(""); // User requested password field
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          setUserProfile(profile);
          if (!profile.username) {
            setShowProfileSetup(true);
          }
        } else {
          // New user
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          await createUserProfile(firebaseUser.uid, newProfile);
          setUserProfile(newProfile);
          setShowProfileSetup(true);
        }
      } else {
        setUserProfile(null);
        setShowProfileSetup(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUserProfile(null);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!newUsername) return;

    setSetupLoading(true);
    try {
      await updateUserProfile(userProfile.uid, {
        username: newUsername,
        password: newPassword || undefined,
      });
      setUserProfile({ ...userProfile, username: newUsername, password: newPassword });
      setShowProfileSetup(false);
    } catch (error) {
      console.error("Profile update failed", error);
    } finally {
      setSetupLoading(false);
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || game.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/40 backdrop-blur-xl hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Gamepad2 className="text-primary-foreground w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tighter uppercase font-mono italic">ULTIMATE 3<span className="text-primary">.0</span></h1>
        </div>

        <div className="flex-1 px-4 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <div className="space-y-4 py-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">Command Center</h2>
              <div className="space-y-1">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "secondary" : "ghost"}
                    className={`w-full justify-start gap-2 font-mono text-xs uppercase tracking-tight ${selectedCategory === category.id ? 'text-primary' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <category.icon className="w-4 h-4" />
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">My List</h2>
              <div className="space-y-1 text-muted-foreground">
                <Button variant="ghost" className="w-full justify-start gap-2 font-mono text-xs uppercase tracking-tight opacity-50 cursor-not-allowed">
                  <Trophy className="w-4 h-4" />
                  Achievements
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 font-mono text-xs uppercase tracking-tight opacity-50 cursor-not-allowed">
                  <History className="w-4 h-4" />
                  History
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border mt-auto">
          <Button variant="ghost" className="w-full justify-start gap-2 font-mono text-xs uppercase">
            <Settings className="w-4 h-4" />
            System Control
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="SEARCH PROTOCOL (ex. 'Doom')..."
              className="pl-10 bg-muted/30 border-border focus:ring-primary/50 font-mono text-xs uppercase h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4">
             {loading ? (
               <Loader2 className="w-4 h-4 animate-spin text-primary" />
             ) : userProfile ? (
               <div className="flex items-center gap-3">
                 <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">User Active</p>
                    <p className="text-[10px] font-mono text-primary flex items-center justify-end gap-1 uppercase">
                       {userProfile.username || userProfile.displayName || "GUEST"}
                    </p>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="w-9 h-9 rounded-full bg-muted border border-border overflow-hidden" 
                   onClick={handleSignOut}
                 >
                   {userProfile.photoURL ? (
                     <img src={userProfile.photoURL} alt="User" className="w-full h-full object-cover" />
                   ) : (
                     <User className="w-4 h-4" />
                   )}
                 </Button>
               </div>
             ) : (
               <Button 
                 variant="outline" 
                 className="gap-2 font-mono text-[10px] uppercase h-9 border-primary/50 text-primary hover:bg-primary/10 shadow-lg shadow-primary/5 px-6"
                 onClick={handleSignIn}
               >
                 <LogIn className="w-3.5 h-3.5" />
                 Sign In / Sign Up With Google
               </Button>
             )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Hero Splash */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 p-8 flex flex-col justify-end gap-2 group"
            >
               <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                  <Gamepad2 className="w-32 h-32 text-primary" />
               </div>
               <div className="relative z-1">
                  <Badge className="mb-2 bg-primary/20 text-primary border-primary/50 backdrop-blur-md text-[10px] uppercase font-mono">
                     ULTIMATE CORE v3.0.4 - MEGA PACK
                  </Badge>
                  <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic font-mono mb-2">
                     UNBLOCKED ULTIMATE<span className="text-primary italic animate-pulse"> 3.0</span>
                  </h1>
                  <p className="text-muted-foreground text-xs md:text-sm font-mono max-w-lg uppercase">
                     The next generation of unblocked access. 
                     Advanced protocols engaged. Pure performance.
                  </p>
               </div>
            </motion.div>

            {/* Grid */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold font-mono tracking-widest uppercase flex items-center gap-2">
                     <span className="w-2 h-2 bg-primary rounded-full"></span>
                     AVAILABLE ASSETS ({filteredGames.length})
                  </h2>
               </div>

               {filteredGames.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {filteredGames.map((game, index) => (
                     <motion.div
                       key={game.id}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: index * 0.05 }}
                     >
                       <GameCard game={game} onSelect={setSelectedGame} />
                     </motion.div>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <Search className="w-12 h-12 mb-4" />
                    <p className="font-mono text-xs uppercase">No matching assets found in local database. </p>
                    <Button 
                      variant="link" 
                      className="text-primary mt-2 uppercase text-[10px] font-mono"
                      onClick={() => {setSearchQuery(""); setSelectedCategory("all");}}
                    >
                      Clear All Protocols
                    </Button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Player */}
      {/* Profile Setup Modal */}
      <AnimatePresence>
        {showProfileSetup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md glass p-8 rounded-2xl border border-primary/20 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="text-primary w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold font-mono tracking-tighter uppercase italic">Identity Verification</h2>
                <p className="text-xs text-muted-foreground font-mono uppercase">Establish your system username and access credentials.</p>
              </div>

              <form onSubmit={handleCompleteProfile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground px-1">Chosen Display Handle</label>
                  <Input 
                    placeholder="USERNAME_ALPHANUMERIC" 
                    className="bg-muted/50 font-mono text-sm border-primary/20 focus:ring-primary/40"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground px-1">Secondary Access Key (Optional)</label>
                  <Input 
                    type="password"
                    placeholder="••••••••" 
                    className="bg-muted/50 font-mono text-sm border-primary/20 focus:ring-primary/40"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={setupLoading || !newUsername}
                  className="w-full font-mono uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ENGAGE IDENTITY"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GamePlayer
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
}
