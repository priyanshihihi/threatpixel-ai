# ThreatPixel AI 🔬
https://threatpixel-clean.vercel.app/
> AI-powered steganography detection and hidden data extraction platform

ThreatPixel AI analyzes image files to detect and extract hidden data using 6 real steganography techniques — LSB, DCT, Metadata, Palette, Spread Spectrum, and File Appending.

---

## Features

- **LSB Extraction** — Reads least significant bits across R/G/B/A channels (1-bit & 2-bit)
- **DCT Analysis** — Detects JSteg/F5-style JPEG coefficient manipulation
- **Metadata Forensics** — Extracts EXIF UserComment, PNG tEXt chunks, JPEG COM markers, XMP
- **Palette Steganography** — Analyzes GIF/PNG palette reordering and unused slots
- **Spread Spectrum** — PN-sequence correlation across pixel arrays
- **File Appending** — Detects and extracts ZIP/7zip/RAR archives appended after image EOF
- **AI Summary** — Risk scoring with CRITICAL / HIGH / MEDIUM / LOW classification
- **AI Chatbot** — Cybersecurity assistant for understanding results and reporting

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Python (Flask) |
| Image Processing | Pillow + NumPy |
| State Management | TanStack Query |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- pip

### Install & Run

```bash
# Clone the repo
git clone https://github.com/priyanshihihi/threatpixel-ai
cd threatpixel-ai

# Backend
cd backend
pip install flask flask-cors pillow numpy
python app.py
# Runs on http://localhost:5000

# Frontend (new terminal)
cd ..
npm install
npm run dev
# Runs on http://localhost:8080
```

### Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5000
```

---

## How It Works

1. Upload any JPG/PNG/GIF/BMP/WEBP image
2. ThreatPixel runs all 6 extraction algorithms simultaneously
3. Results show exactly what hidden data was found per technique
4. AI summary provides risk score and narrative explanation
5. Download extracted files or copy hidden text directly

---

## Supported Image Formats

| Format | LSB | DCT | Metadata | Palette | Spread Spectrum | File Appending |
|--------|-----|-----|----------|---------|-----------------|----------------|
| JPEG   | ✅  | ✅  | ✅       | ❌      | ✅              | ✅             |
| PNG    | ✅  | ❌  | ✅       | ✅*     | ✅              | ✅             |
| GIF    | ✅  | ❌  | ✅       | ✅      | ✅              | ✅             |
| BMP    | ✅  | ❌  | ✅       | ❌      | ✅              | ✅             |
| WEBP   | ✅  | ❌  | ✅       | ❌      | ✅              | ✅             |

*PNG with palette mode only

---

## Project Structure

```
threatpixel-ai/
├── backend/
│   ├── app.py              # Flask API + all 6 extraction engines
│   └── requirements.txt
├── src/
│   ├── pages/
│   │   ├── Index.tsx       # Main analyzer page
│   │   ├── Logs.tsx        # Blockchain evidence log
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── ScanResult.tsx  # Results display
│   │   └── ui/             # shadcn components
│   ├── hooks/
│   │   └── useExtraction.ts
│   ├── lib/
│   │   └── utils.ts
│   └── App.tsx
├── index.html
├── vite.config.ts
└── package.json
```

---

## License

MIT © ThreatPixel AI
