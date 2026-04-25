import { Shield, Activity } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "analyzer", label: "Analyzer" },
  { id: "chatbot", label: "AI Assistant" },
  { id: "about", label: "How It Works" },
];

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <header className="relative z-10 border-b border-border/60 bg-card/40 backdrop-blur-xl sticky top-0">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight">
              Threat<span className="text-primary">Pixel</span>
            </span>
            <span className="text-xs text-muted-foreground block -mt-0.5 font-mono">
              AI Forensics Engine
            </span>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border/40">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span>6 techniques active</span>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pb-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground bg-secondary hover:text-foreground"}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
