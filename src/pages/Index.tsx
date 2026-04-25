import { useState } from "react";
import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";
import ScanProgress from "@/components/ScanProgress";
import AISummaryCard from "@/components/AISummaryCard";
import TechniqueResult from "@/components/TechniqueResult";
import ChatBot from "@/components/ChatBot";
import HowItWorks from "@/components/HowItWorks";
import { useExtraction } from "@/hooks/useExtraction";
import { RotateCcw, Filter, ChevronDown } from "lucide-react";

type FilterType = "all" | "positive" | "extracted";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "All Results",
  positive: "Positive Only",
  extracted: "With Data",
};

export default function Index() {
  const [tab, setTab] = useState("analyzer");
  const [filter, setFilter] = useState<FilterType>("all");
  const { scan, reset, isScanning, scanData, error, progress, progressLabel } = useExtraction();

  const positiveStatuses = ["found", "extracted", "text_extracted", "file_found", "suspicious"];

  const filtered = scanData?.results.filter((r) => {
    if (filter === "positive") return positiveStatuses.includes(r.status);
    if (filter === "extracted") return r.extracted && r.extracted.length > 0;
    return true;
  }) ?? [];

  const positiveCount = scanData?.results.filter((r) => positiveStatuses.includes(r.status)).length ?? 0;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background layers */}
      <div className="grid-overlay" />
      <div className="scanlines" />

      {/* Nav */}
      <Navbar activeTab={tab} onTabChange={setTab} />

      {/* Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ─── ANALYZER TAB ─── */}
        {tab === "analyzer" && (
          <div className="space-y-8">
            {/* Hero */}
            {!scanData && !isScanning && (
              <div className="text-center space-y-4 py-6 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary text-xs font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  6 steganography techniques active
                </div>
                <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
                  Extract Hidden{" "}
                  <span className="text-primary text-glow">Data</span> From Images
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Upload any image. ThreatPixel AI runs LSB, DCT, Metadata, Palette,
                  Spread Spectrum, and File Appending extraction simultaneously — and
                  shows you exactly what's hidden inside.
                </p>
              </div>
            )}

            {/* Main layout: upload + results */}
            <div className={`grid gap-6 ${scanData ? "lg:grid-cols-[380px_1fr]" : "max-w-xl mx-auto"}`}>

              {/* Left: Upload + Progress */}
              <div className="space-y-4">
                <UploadZone onFile={scan} isScanning={isScanning} />

                {isScanning && (
                  <ScanProgress progress={progress} label={progressLabel} />
                )}

                {error && (
                  <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm">
                    <p className="font-semibold mb-1">Extraction failed</p>
                    <p className="font-mono text-xs opacity-80">{error}</p>
                    <p className="text-xs mt-2 opacity-60">
                      Make sure the Python backend is running: <code className="font-mono">python backend/app.py</code>
                    </p>
                  </div>
                )}

                {scanData && (
                  <button
                    onClick={reset}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Scan Another Image
                  </button>
                )}

                {/* AI Summary */}
                {scanData && <AISummaryCard data={scanData} />}
              </div>

              {/* Right: Results */}
              {scanData && (
                <div className="space-y-4">
                  {/* Results header + filter */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-display font-semibold">Extraction Results</h2>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {positiveCount} positive · {scanData.results.length} techniques run
                      </p>
                    </div>

                    <div className="relative">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-secondary/40 text-sm cursor-pointer group">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{FILTER_LABELS[filter]}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        {/* Dropdown */}
                        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-xl z-20 hidden group-focus-within:block">
                          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
                            <button
                              key={f}
                              onClick={() => setFilter(f)}
                              className={`w-full text-left px-4 py-2.5 text-sm first:rounded-t-xl last:rounded-b-xl hover:bg-primary/10 transition-colors ${filter === f ? "text-primary font-medium" : "text-muted-foreground"}`}
                            >
                              {FILTER_LABELS[f]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Result cards */}
                  <div className="space-y-3 stagger">
                    {filtered.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No results match this filter</p>
                      </div>
                    ) : (
                      filtered.map((result, i) => (
                        <TechniqueResult key={`${result.technique}-${i}`} result={result} index={i} />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── CHATBOT TAB ─── */}
        {tab === "chatbot" && (
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-display font-bold">AI Forensics Assistant</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Ask about techniques, interpret your results, or get reporting guidance
              </p>
            </div>
            <ChatBot />
          </div>
        )}

        {/* ─── HOW IT WORKS TAB ─── */}
        {tab === "about" && (
          <div className="animate-fade-in-up">
            <HowItWorks />
          </div>
        )}
      </main>
    </div>
  );
}
