import { Loader2 } from "lucide-react";

interface ScanProgressProps {
  progress: number;
  label: string;
}

const TECHNIQUES = [
  { id: "lsb",      label: "LSB Extraction",       pct: 25 },
  { id: "dct",      label: "DCT Analysis",          pct: 42 },
  { id: "metadata", label: "Metadata Forensics",    pct: 58 },
  { id: "palette",  label: "Palette Detection",     pct: 70 },
  { id: "spread",   label: "Spread Spectrum",       pct: 82 },
  { id: "append",   label: "File Appending",        pct: 92 },
];

export default function ScanProgress({ progress, label }: ScanProgressProps) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Running extraction engine</p>
          <p className="text-xs font-mono text-primary mt-0.5 truncate">{label}</p>
        </div>
        <span className="text-sm font-mono font-bold text-primary">{progress}%</span>
      </div>

      {/* Master progress bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
        </div>
      </div>

      {/* Per-technique steps */}
      <div className="grid grid-cols-2 gap-2">
        {TECHNIQUES.map((t) => {
          const done = progress >= t.pct + 12;
          const active = progress >= t.pct && progress < t.pct + 12;
          return (
            <div key={t.id} className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border transition-all duration-300
              ${done    ? "border-primary/30 bg-primary/5 text-primary" :
                active  ? "border-primary/50 bg-primary/10 text-primary animate-pulse" :
                          "border-border/30 bg-secondary/30 text-muted-foreground"}
            `}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                done ? "bg-primary" : active ? "bg-primary animate-ping" : "bg-muted-foreground/30"
              }`} />
              <span className="truncate">{t.label}</span>
              {done && <span className="ml-auto">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
