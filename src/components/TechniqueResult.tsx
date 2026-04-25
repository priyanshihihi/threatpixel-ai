import { useState } from "react";
import { ChevronDown, Copy, CheckCircle, AlertCircle, Info, Minus, FileText, Archive } from "lucide-react";
import type { ExtractionResult } from "@/hooks/useExtraction";

interface TechniqueResultProps {
  result: ExtractionResult;
  index: number;
}

const TECHNIQUE_META: Record<string, { color: string; badgeClass: string; icon: string }> = {
  lsb:        { color: "hsl(168 100% 48%)", badgeClass: "badge-lsb",      icon: "⬛" },
  dct:        { color: "hsl(262 83% 66%)",  badgeClass: "badge-dct",      icon: "〰️" },
  metadata:   { color: "hsl(200 90% 50%)",  badgeClass: "badge-metadata",  icon: "🏷️" },
  palette:    { color: "hsl(43 96% 56%)",   badgeClass: "badge-palette",   icon: "🎨" },
  spread:     { color: "hsl(25 95% 60%)",   badgeClass: "badge-spread",    icon: "📡" },
  fileappend: { color: "hsl(350 89% 60%)",  badgeClass: "badge-append",    icon: "📎" },
};

const STATUS_CONFIG = {
  found:          { icon: AlertCircle, label: "FOUND",     cls: "text-warning" },
  extracted:      { icon: CheckCircle, label: "EXTRACTED", cls: "text-success" },
  text_extracted: { icon: CheckCircle, label: "EXTRACTED", cls: "text-success" },
  file_found:     { icon: Archive,     label: "FILE FOUND",cls: "text-destructive" },
  clean:          { icon: CheckCircle, label: "CLEAN",     cls: "text-muted-foreground" },
  skipped:        { icon: Minus,       label: "SKIPPED",   cls: "text-muted-foreground" },
  error:          { icon: AlertCircle, label: "ERROR",     cls: "text-destructive" },
  analyzed:       { icon: Info,        label: "ANALYZED",  cls: "text-primary/70" },
  suspicious:     { icon: AlertCircle, label: "SUSPICIOUS",cls: "text-warning" },
  preview:        { icon: FileText,    label: "PREVIEW",   cls: "text-primary/70" },
};

export default function TechniqueResult({ result, index }: TechniqueResultProps) {
  const [open, setOpen] = useState(
    ["found", "extracted", "text_extracted", "file_found", "suspicious"].includes(result.status)
  );
  const [copied, setCopied] = useState(false);

  const techId = result.techniqueId?.toLowerCase() || "lsb";
  const meta = TECHNIQUE_META[techId] || TECHNIQUE_META.lsb;
  const statusConf = STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.analyzed;
  const StatusIcon = statusConf.icon;

  const hasContent = result.extracted && result.extracted.length > 0;
  const isPositive = ["found", "extracted", "text_extracted", "file_found", "suspicious"].includes(result.status);

  const copy = () => {
    if (result.extracted) {
      navigator.clipboard.writeText(result.extracted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`
        rounded-xl border transition-all duration-200 animate-fade-in-up card-hover overflow-hidden
        ${isPositive ? "border-primary/20 bg-card/80" : "border-border/40 bg-card/40"}
      `}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setOpen(!open)}
      >
        {/* Technique badge */}
        <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border flex-shrink-0 ${meta.badgeClass}`}>
          {meta.icon} {techId.toUpperCase()}
        </span>

        {/* Technique name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{result.technique}</p>
          {result.field && (
            <p className="text-xs font-mono text-muted-foreground">field: {result.field}</p>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {result.confidence && (
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
              result.confidence === "HIGH"   ? "border-destructive/30 text-destructive bg-destructive/5" :
              result.confidence === "MEDIUM" ? "border-warning/30 text-warning bg-warning/5" :
                                              "border-border/40 text-muted-foreground"
            }`}>
              {result.confidence}
            </span>
          )}
          <div className={`flex items-center gap-1.5 text-xs font-mono font-bold ${statusConf.cls}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConf.label}
          </div>
          {hasContent && (
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-border/40 p-4 space-y-3">
          {/* Message */}
          <p className="text-sm text-foreground/80">{result.message}</p>

          {/* Extracted content */}
          {hasContent && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Extracted Content {result.size ? `(${result.size.toLocaleString()} bytes)` : ""}
                </span>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded border border-primary/20 hover:bg-primary/5"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="terminal-text bg-background/80 border border-border/60 rounded-lg p-4 overflow-x-auto max-h-64 text-sm whitespace-pre-wrap break-all">
                {result.extracted}
              </pre>
            </div>
          )}

          {/* File list (for ZIP archives) */}
          {result.files && result.files.length > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2">CONTAINED FILES:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.files.map((f) => (
                  <span key={f} className="px-2.5 py-1 text-xs font-mono bg-secondary border border-border/60 rounded-md text-foreground">
                    📄 {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
