import { useCallback, useState, useRef } from "react";
import { Upload, ImageIcon, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  isScanning: boolean;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff"];
const FORMATS = ["JPG", "PNG", "GIF", "BMP", "WEBP", "TIFF"];

export default function UploadZone({ onFile, isScanning }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setFileName(file.name);
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onClick={() => !isScanning && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
        overflow-hidden min-h-[280px] flex flex-col items-center justify-center gap-4 p-8 text-center
        ${isDragging
          ? "border-primary bg-primary/5 drop-zone-active"
          : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]"}
        ${isScanning ? "pointer-events-none" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={onInputChange}
      />

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(168 100% 48% / 0.3) 1px, transparent 0)",
          backgroundSize: "24px 24px"
        }}
      />

      {isScanning && (
        <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-sm font-mono text-primary">Extracting hidden data...</span>
        </div>
      )}

      {preview ? (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-primary/30 shadow-lg">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {/* Scan line overlay */}
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-80" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click or drop to change image</p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-purple-500/10 border border-primary/25 flex items-center justify-center">
              {isDragging
                ? <ImageIcon className="w-8 h-8 text-primary" />
                : <Upload className="w-8 h-8 text-primary" />
              }
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-primary/20 animate-pulse-ring opacity-60" />
          </div>

          <div>
            <p className="text-base font-semibold text-foreground">
              {isDragging ? "Drop image to scan" : "Upload image to analyze"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag & drop or click to browse
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {FORMATS.map((f) => (
              <span key={f} className="px-2.5 py-1 text-xs font-mono font-bold rounded-md badge-lsb border">
                {f}
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/60 font-mono">Max 50MB · Processed securely</p>
        </div>
      )}
    </div>
  );
}
