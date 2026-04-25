const TECHNIQUES = [
  {
    id: "LSB",
    badge: "badge-lsb",
    title: "Least Significant Bit (LSB)",
    algo: "Statistical bit-balance analysis",
    desc: "Replaces the last bit of each pixel's R, G, B (or A) value with message bits. The color change is imperceptible — pixel value 200 vs 201 looks identical to the human eye.",
    how: "ThreatPixel reads the LSB of every pixel channel and reassembles the bit stream into bytes. Checks 1-bit and 2-bit variants across all channels independently.",
    capacity: "1 bit/channel → ~180KB in 800×600 image",
    tools: ["Steghide", "OpenStego", "SilentEye", "LSBSteg"],
  },
  {
    id: "DCT",
    badge: "badge-dct",
    title: "Discrete Cosine Transform (DCT)",
    algo: "JPEG coefficient LSB extraction",
    desc: "Hides data in the quantized DCT coefficients of JPEG 8×8 pixel blocks. Works only on JPEG files. Used by JSteg, OutGuess, and F5 algorithms.",
    how: "ThreatPixel applies DCT to image blocks, identifies non-zero AC coefficients, and extracts LSBs — replicating the JSteg decode algorithm exactly.",
    capacity: "Depends on JPEG quality — typically 10–30% of image pixels",
    tools: ["JSteg", "F5", "OutGuess", "JPHide"],
  },
  {
    id: "META",
    badge: "badge-metadata",
    title: "Metadata Steganography",
    algo: "EXIF / XMP / PNG chunk parsing",
    desc: "Embeds data directly in image metadata fields: EXIF UserComment, MakerNote, Artist, JPEG COM markers, PNG tEXt/iTXt chunks, and XMP packets.",
    how: "ThreatPixel parses all metadata layers using PIL's EXIF engine and raw marker scanning. Extracts every text field, binary blob, and XMP packet.",
    capacity: "Unlimited — metadata can be arbitrarily large",
    tools: ["ExifTool", "Steghide (metadata mode)", "Manual hex editing"],
  },
  {
    id: "PAL",
    badge: "badge-palette",
    title: "Palette-Based Steganography",
    algo: "GIF/PNG color table analysis",
    desc: "Reorders palette entries or uses unused color slots in GIF/PNG palette images to hide data. The image looks identical but the color table ordering encodes a message.",
    how: "ThreatPixel reads the raw palette bytes, extracts LSBs of all R/G/B values, checks for unused palette entries, and scans pixel index sequences.",
    capacity: "Up to 768 bytes per palette (256 colors × 3 channels)",
    tools: ["GIFShuffle", "Pallette (custom tools)", "hex editors"],
  },
  {
    id: "SS",
    badge: "badge-spread",
    title: "Spread Spectrum",
    algo: "PN-sequence correlation decode",
    desc: "Adds a low-amplitude pseudorandom noise signal spread across many pixels using a secret key. Extremely hard to detect statistically without the key.",
    how: "ThreatPixel tries correlation against common PRNG seeds (0, 42, 12345, 99999, 31337). Measures printable byte ratio to score extraction quality.",
    capacity: "~1 bit per N pixels (N = spreading factor, typically 64–256)",
    tools: ["SSSS", "StegSpread", "custom implementations"],
  },
  {
    id: "ZIP",
    badge: "badge-append",
    title: "File Appending (ZIP / 7zip)",
    algo: "EOF marker detection + archive extraction",
    desc: "Appends a ZIP, 7-Zip, or RAR archive after the image's end-of-file marker. JPEG ignores everything after FFD9, so the image displays normally while carrying a full archive.",
    how: "ThreatPixel finds the image EOF (FF D9 for JPEG, IEND for PNG), reads all bytes after it, detects archive magic bytes, and fully extracts ZIP contents.",
    capacity: "Unlimited — the appended archive can be any size",
    tools: ["Binwalk", "manual cat command", "custom scripts", "Stegify"],
  },
];

export default function HowItWorks() {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-display font-bold">6 Extraction Techniques</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          ThreatPixel runs all techniques simultaneously on every uploaded image.
          Each uses a different algorithm to recover hidden content.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {TECHNIQUES.map((t, i) => (
          <div
            key={t.id}
            className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4 card-hover animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md border flex-shrink-0 ${t.badge}`}>
                {t.id}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{t.algo}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground/80 leading-relaxed">{t.desc}</p>

            {/* How ThreatPixel handles it */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-xs font-mono text-primary mb-1">HOW WE EXTRACT IT</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{t.how}</p>
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">Capacity: </span>
                <span className="font-mono text-foreground/70">{t.capacity}</span>
              </div>
            </div>

            {/* Tools */}
            <div className="flex flex-wrap gap-1.5">
              {t.tools.map((tool) => (
                <span key={tool} className="px-2 py-0.5 text-xs font-mono bg-secondary border border-border/60 rounded text-muted-foreground">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
