import { Sparkles, Hash, Clock, Cpu, FileSearch } from "lucide-react";
import RiskBadge from "./RiskBadge";
import type { ScanData } from "@/hooks/useExtraction";

interface AISummaryCardProps {
  data: ScanData;
}

export default function AISummaryCard({ data }: AISummaryCardProps) {
  const { aiSummary, imageInfo, scanId, timestamp } = data;
  const scannedAt = new Date(timestamp).toLocaleTimeString();

  const riskBarWidth =
    aiSummary.risk === "CRITICAL" ? "95%"
    : aiSummary.risk === "HIGH"   ? "78%"
    : aiSummary.risk === "MEDIUM" ? "50%"
    : "15%";

  const riskBarColor =
    aiSummary.risk === "CRITICAL" || aiSummary.risk === "HIGH"
      ? "hsl(var(--destructive))"
      : aiSummary.risk === "MEDIUM"
      ? "hsl(var(--warning))"
      : "hsl(var(--primary))";

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Top bar */}
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">AI Analysis Report</span>
        <span className="ml-auto text-xs font-mono text-muted-foreground">{scanId}</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Risk badge + bar */}
        <div className="space-y-3">
          <RiskBadge risk={aiSummary.risk} score={aiSummary.riskScore} size="lg" />

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Threat Score</span>
              <span>{aiSummary.riskScore}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-bar"
                style={{ width: riskBarWidth, background: riskBarColor }}
              />
            </div>
          </div>
        </div>

        {/* AI narrative */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border/40">
          <p className="text-xs font-mono text-primary mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> AI SUMMARY
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">{aiSummary.summary}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCell icon={FileSearch} label="Techniques Tried" value={`${aiSummary.techniquesTried}`} />
          <StatCell icon={Sparkles} label="Findings" value={`${aiSummary.foundCount} positive`}
            highlight={aiSummary.foundCount > 0} />
          <StatCell icon={Hash} label="SHA-256" value={`${imageInfo.sha256.slice(0, 16)}…`} mono />
          <StatCell icon={Clock} label="Scanned At" value={scannedAt} />
        </div>

        {/* Image metadata */}
        <div className="border border-border/40 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-secondary/40 text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Image Info
          </div>
          <div className="p-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Format", value: imageInfo.format },
              { label: "Dimensions", value: imageInfo.size },
              { label: "Color Mode", value: imageInfo.mode },
              { label: "File Size", value: formatBytes(imageInfo.fileSize) },
              { label: "Pixels", value: `${(imageInfo.width * imageInfo.height / 1000).toFixed(0)}K` },
              { label: "Filename", value: imageInfo.filename.slice(0, 12) + (imageInfo.filename.length > 12 ? "…" : "") },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xs font-mono font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Triggered techniques */}
        {aiSummary.techniquesTriggered.length > 0 && (
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2">POSITIVE TECHNIQUES</p>
            <div className="flex flex-wrap gap-2">
              {aiSummary.techniquesTriggered.map((t) => (
                <span key={t} className="px-2.5 py-1 text-xs font-mono rounded-lg bg-destructive/10 border border-destructive/25 text-destructive">
                  ⚠ {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({ icon: Icon, label, value, highlight, mono }: {
  icon: React.ElementType; label: string; value: string; highlight?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30 border border-border/40">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 truncate ${mono ? "font-mono text-xs" : ""} ${highlight ? "text-destructive" : "text-foreground"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
