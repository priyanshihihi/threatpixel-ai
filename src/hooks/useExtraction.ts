import { useState, useCallback } from "react";

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ExtractionResult {
  technique: string;
  techniqueId: string;
  status: "found" | "extracted" | "text_extracted" | "file_found" | "clean" | "skipped" | "error" | "analyzed" | "suspicious" | "preview";
  message: string;
  extracted: string | null;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  size?: number;
  files?: string[];
  file_type?: string;
  file_name?: string;
  field?: string;
}

export interface ImageInfo {
  filename: string;
  format: string;
  mode: string;
  size: string;
  width: number;
  height: number;
  fileSize: number;
  sha256: string;
}

export interface AISummary {
  risk: RiskLevel;
  riskScore: number;
  summary: string;
  foundCount: number;
  techniquesTried: number;
  techniquesTriggered: string[];
  highConfidenceFindings: number;
}

export interface ScanData {
  success: boolean;
  scanId: string;
  timestamp: string;
  imageInfo: ImageInfo;
  aiSummary: AISummary;
  results: ExtractionResult[];
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useExtraction() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const scan = useCallback(async (file: File) => {
    setIsScanning(true);
    setScanData(null);
    setError(null);
    setProgress(0);

    const steps = [
      { pct: 10, label: "Uploading image..." },
      { pct: 25, label: "Running LSB extraction..." },
      { pct: 42, label: "Analyzing DCT coefficients..." },
      { pct: 58, label: "Scanning metadata fields..." },
      { pct: 70, label: "Checking palette data..." },
      { pct: 82, label: "Spread spectrum correlation..." },
      { pct: 92, label: "Detecting appended archives..." },
      { pct: 98, label: "Generating AI summary..." },
    ];

    let stepIdx = 0;
    const ticker = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].pct);
        setProgressLabel(steps[stepIdx].label);
        stepIdx++;
      }
    }, 600);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_BASE}/api/extract`, {
        method: "POST",
        body: formData,
      });

      clearInterval(ticker);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data: ScanData = await res.json();
      setProgress(100);
      setProgressLabel("Complete!");
      setScanData(data);
    } catch (err) {
      clearInterval(ticker);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setScanData(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
  }, []);

  return { scan, reset, isScanning, scanData, error, progress, progressLabel };
}

export function useChat() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    {
      role: "bot",
      text: "Hello! I'm **PixelGuard AI**, your steganography forensics assistant.\n\nI can explain how each of the 6 detection techniques works, help you interpret scan results, or guide you through reporting a cybercrime.\n\nWhat would you like to know?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const API_BASE_CHAT = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const send = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_CHAT}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Connection error — is the backend running on port 5000?" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_CHAT]);

  return { messages, send, loading };
}
