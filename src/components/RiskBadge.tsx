import { ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle } from "lucide-react";
import type { RiskLevel } from "@/hooks/useExtraction";

interface RiskBadgeProps {
  risk: RiskLevel;
  score: number;
  size?: "sm" | "lg";
}

const CONFIG: Record<RiskLevel, { icon: React.ElementType; label: string; bgClass: string; textClass: string }> = {
  CRITICAL: { icon: ShieldAlert, label: "CRITICAL",  bgClass: "risk-bg-critical", textClass: "risk-critical" },
  HIGH:     { icon: AlertCircle, label: "HIGH",      bgClass: "risk-bg-high",     textClass: "risk-high"     },
  MEDIUM:   { icon: AlertTriangle,label: "MEDIUM",   bgClass: "risk-bg-medium",   textClass: "risk-medium"   },
  LOW:      { icon: ShieldCheck, label: "LOW",       bgClass: "risk-bg-low",      textClass: "risk-low"      },
};

export default function RiskBadge({ risk, score, size = "sm" }: RiskBadgeProps) {
  const { icon: Icon, label, bgClass, textClass } = CONFIG[risk];

  if (size === "lg") {
    return (
      <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border ${bgClass}`}>
        <Icon className={`w-6 h-6 ${textClass}`} />
        <div>
          <div className={`text-xs font-mono font-bold uppercase tracking-widest ${textClass}`}>Risk Level</div>
          <div className={`text-2xl font-display font-bold ${textClass}`}>{label}</div>
        </div>
        <div className="ml-4 text-right">
          <div className="text-xs font-mono text-muted-foreground">Score</div>
          <div className={`text-2xl font-mono font-bold ${textClass}`}>{score}%</div>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${bgClass} ${textClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
