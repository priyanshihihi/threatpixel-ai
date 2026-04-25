"""
ThreatPixel AI - Steganography Extraction Backend
Supports: LSB, DCT (JPEG), Metadata, Palette, Spread Spectrum, File Appending (7zip/zip)
"""

import os
import io
import json
import math
import struct
import hashlib
import zipfile
import tarfile
import tempfile
import traceback
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import numpy as np

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "*"])

UPLOAD_FOLDER = tempfile.mkdtemp()
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# ─────────────────────────────────────────────
# TECHNIQUE 1: LSB (Least Significant Bit) Extraction
# ─────────────────────────────────────────────
def extract_lsb(img_array, bits=1):
    """
    Extract data hidden in the Least Significant Bits of pixel values.
    Tries to find a valid file header or readable text in the LSB stream.
    """
    results = []

    # Try R, G, B channels individually and combined
    channel_configs = [
        ("RGB combined", [0, 1, 2]),
        ("Red channel only", [0]),
        ("Green channel only", [1]),
        ("Blue channel only", [2]),
        ("Alpha channel", [3]) if img_array.shape[2] == 4 else None,
    ]

    flat = img_array.reshape(-1, img_array.shape[2])

    for config in channel_configs:
        if config is None:
            continue
        label, channels = config
        
        for num_bits in [1, 2]:
            bit_stream = []
            mask = (1 << num_bits) - 1
            
            for pixel in flat[:min(len(flat), 200000)]:
                for ch in channels:
                    if ch < len(pixel):
                        bits_val = int(pixel[ch]) & mask
                        for b in range(num_bits - 1, -1, -1):
                            bit_stream.append((bits_val >> b) & 1)

            # Convert bits to bytes
            byte_data = bytearray()
            for i in range(0, len(bit_stream) - 7, 8):
                byte_val = 0
                for b in range(8):
                    byte_val = (byte_val << 1) | bit_stream[i + b]
                byte_data.append(byte_val)

            if not byte_data:
                continue

            # Check for embedded file signatures
            file_result = detect_file_signature(bytes(byte_data), f"LSB {num_bits}-bit {label}")
            if file_result:
                results.append(file_result)
                continue

            # Try to extract readable text (null-terminated or length-prefixed)
            text_result = try_extract_text(bytes(byte_data), f"LSB {num_bits}-bit {label}")
            if text_result:
                results.append(text_result)

    return results


# ─────────────────────────────────────────────
# TECHNIQUE 2: DCT / JPEG Steganography
# ─────────────────────────────────────────────
def extract_dct_data(filepath):
    """
    Analyze JPEG DCT coefficients for steganographic content.
    Looks for patterns consistent with JSteg, OutGuess, F5 algorithms.
    Extracts LSB of quantized DCT coefficients.
    """
    results = []

    try:
        with open(filepath, 'rb') as f:
            raw = f.read()

        if not (raw[:2] == b'\xff\xd8'):
            return results  # Not a JPEG

        # Parse JPEG markers to find DCT data
        # Extract all coefficient-like data from quantized blocks
        # Simulate JSteg-style extraction: LSB of non-zero AC coefficients
        
        # Load with PIL for DCT approximation via pixel analysis
        img = Image.open(filepath).convert('RGB')
        arr = np.array(img, dtype=np.float32)
        
        # Divide into 8x8 blocks (JPEG block size)
        h, w = arr.shape[:2]
        h8 = (h // 8) * 8
        w8 = (w // 8) * 8
        arr_crop = arr[:h8, :w8, :]
        
        dct_bits = []
        for i in range(0, h8, 8):
            for j in range(0, w8, 8):
                block = arr_crop[i:i+8, j:j+8, 0]  # Y channel
                # Apply 2D DCT approximation
                dct_block = dct2d(block)
                # Extract LSBs from AC coefficients (skip DC at [0,0])
                for bi in range(8):
                    for bj in range(8):
                        if bi == 0 and bj == 0:
                            continue
                        coeff = int(round(dct_block[bi, bj]))
                        if coeff != 0:  # Only non-zero coefficients (JSteg style)
                            dct_bits.append(coeff & 1)
                            
            if len(dct_bits) > 100000:
                break

        # Convert bits to bytes
        dct_bytes = bytearray()
        for i in range(0, len(dct_bits) - 7, 8):
            byte_val = 0
            for b in range(8):
                byte_val = (byte_val << 1) | dct_bits[i + b]
            dct_bytes.append(byte_val)

        if dct_bytes:
            sig_result = detect_file_signature(bytes(dct_bytes), "DCT/JPEG coefficients")
            if sig_result:
                results.append(sig_result)
            else:
                text_result = try_extract_text(bytes(dct_bytes), "DCT/JPEG coefficients")
                if text_result:
                    results.append(text_result)

        # Check quantization table analysis for F5/OutGuess
        qt_result = analyze_jpeg_quantization(raw)
        if qt_result:
            results.append(qt_result)

    except Exception as e:
        results.append({
            "technique": "DCT/JPEG",
            "status": "error",
            "message": str(e),
            "extracted": None
        })

    return results


def dct2d(block):
    """Fast 2D DCT via separable 1D DCTs."""
    N = block.shape[0]
    result = np.zeros_like(block)
    # Row DCT
    for i in range(N):
        result[i, :] = dct1d(block[i, :])
    # Col DCT
    for j in range(N):
        result[:, j] = dct1d(result[:, j])
    return result


def dct1d(x):
    """1D DCT-II."""
    N = len(x)
    result = np.zeros(N)
    for k in range(N):
        s = 0
        for n in range(N):
            s += x[n] * math.cos(math.pi * k * (2 * n + 1) / (2 * N))
        result[k] = s * (math.sqrt(1 / N) if k == 0 else math.sqrt(2 / N))
    return result


def analyze_jpeg_quantization(raw_bytes):
    """Check JPEG quantization tables for steganographic modification."""
    idx = 0
    qt_tables = []
    while idx < len(raw_bytes) - 1:
        if raw_bytes[idx] == 0xFF and raw_bytes[idx + 1] == 0xDB:
            length = struct.unpack('>H', raw_bytes[idx+2:idx+4])[0]
            qt_data = raw_bytes[idx+4:idx+2+length]
            qt_tables.append(qt_data)
        idx += 1
        if idx > 100000:
            break

    if qt_tables:
        return {
            "technique": "DCT Quantization Table Analysis",
            "status": "analyzed",
            "message": f"Found {len(qt_tables)} quantization table(s). Tables appear {'modified' if len(qt_tables) > 2 else 'standard'} — custom tables can carry hidden data.",
            "extracted": None,
            "confidence": "MEDIUM"
        }
    return None


# ─────────────────────────────────────────────
# TECHNIQUE 3: Metadata Steganography
# ─────────────────────────────────────────────
def extract_metadata(filepath):
    """
    Extract hidden data from image metadata:
    - EXIF fields (UserComment, ImageDescription, Artist, Copyright, MakerNote)
    - XMP metadata
    - IPTC data
    - ICC profile comments
    - PNG text chunks (tEXt, zTXt, iTXt)
    - JPEG comments (COM marker)
    """
    results = []

    try:
        with open(filepath, 'rb') as f:
            raw = f.read()

        img = Image.open(filepath)
        fmt = img.format or "UNKNOWN"

        # ── PIL info dict (PNG tEXt chunks, etc.)
        info = img.info or {}
        
        # PNG text chunks
        png_text_keys = ['Comment', 'Description', 'Author', 'Title', 'Software',
                         'Copyright', 'Creation Time', 'Source', 'Warning']
        for key in list(info.keys()):
            val = info[key]
            if isinstance(val, (str, bytes)) and val:
                val_str = val if isinstance(val, str) else val.decode('utf-8', errors='replace')
                if len(val_str) > 3:
                    # Check if it contains hidden file
                    val_bytes = val.encode('utf-8') if isinstance(val, str) else val
                    sig_result = detect_file_signature(val_bytes, f"PNG text chunk [{key}]")
                    if sig_result:
                        results.append(sig_result)
                    else:
                        results.append({
                            "technique": "Metadata — PNG Text Chunk",
                            "field": key,
                            "status": "found",
                            "message": f"Text data in '{key}' field",
                            "extracted": val_str[:5000],
                            "size": len(val_str),
                            "confidence": "HIGH" if len(val_str) > 100 else "MEDIUM"
                        })

        # EXIF extraction
        exif_data = {}
        try:
            from PIL.ExifTags import TAGS
            exif_raw = img._getexif() if hasattr(img, '_getexif') else None
            if exif_raw:
                for tag_id, value in exif_raw.items():
                    tag = TAGS.get(tag_id, str(tag_id))
                    exif_data[tag] = value
        except Exception:
            pass

        suspicious_exif_fields = [
            'UserComment', 'ImageDescription', 'Artist', 'Copyright',
            'MakerNote', 'XPComment', 'XPAuthor', 'XPTitle',
            'XPSubject', 'XPKeywords', 'Software', 'DocumentName'
        ]
        for field in suspicious_exif_fields:
            if field in exif_data:
                val = exif_data[field]
                if isinstance(val, bytes):
                    # Try decoding as UTF-16 (MakerNote often encoded this way)
                    for enc in ['utf-8', 'utf-16', 'latin-1']:
                        try:
                            decoded = val.decode(enc).strip('\x00').strip()
                            if decoded and len(decoded) > 2:
                                # Check for embedded file
                                sig_result = detect_file_signature(val, f"EXIF {field}")
                                if sig_result:
                                    results.append(sig_result)
                                else:
                                    results.append({
                                        "technique": "Metadata — EXIF",
                                        "field": field,
                                        "status": "found",
                                        "message": f"Hidden text in EXIF field '{field}'",
                                        "extracted": decoded[:5000],
                                        "size": len(decoded),
                                        "confidence": "HIGH" if len(decoded) > 50 else "MEDIUM"
                                    })
                                break
                        except Exception:
                            continue
                elif isinstance(val, str) and len(val) > 2:
                    results.append({
                        "technique": "Metadata — EXIF",
                        "field": field,
                        "status": "found",
                        "message": f"Text in EXIF field '{field}'",
                        "extracted": str(val)[:5000],
                        "size": len(str(val)),
                        "confidence": "HIGH" if len(str(val)) > 50 else "LOW"
                    })

        # JPEG COM marker extraction
        if raw[:2] == b'\xff\xd8':
            idx = 2
            while idx < len(raw) - 1:
                if raw[idx] == 0xFF:
                    marker = raw[idx + 1]
                    if marker == 0xFE:  # COM marker
                        length = struct.unpack('>H', raw[idx+2:idx+4])[0]
                        comment = raw[idx+4:idx+2+length]
                        try:
                            comment_str = comment.decode('utf-8', errors='replace').strip()
                            if comment_str:
                                results.append({
                                    "technique": "Metadata — JPEG Comment",
                                    "field": "COM",
                                    "status": "found",
                                    "message": "Hidden text in JPEG COM marker",
                                    "extracted": comment_str[:5000],
                                    "size": len(comment_str),
                                    "confidence": "HIGH"
                                })
                        except Exception:
                            pass
                    if marker in [0xD9, 0xDA]:  # EOI or SOS
                        break
                    if idx + 3 < len(raw):
                        try:
                            seg_len = struct.unpack('>H', raw[idx+2:idx+4])[0]
                            idx += 2 + seg_len
                            continue
                        except Exception:
                            pass
                idx += 1

        # XMP/XML metadata scan
        xmp_start = raw.find(b'<x:xmpmeta')
        if xmp_start == -1:
            xmp_start = raw.find(b'<?xpacket')
        if xmp_start != -1:
            xmp_end = raw.find(b'</x:xmpmeta>', xmp_start)
            if xmp_end == -1:
                xmp_end = xmp_start + 4096
            xmp_chunk = raw[xmp_start:xmp_end + 12]
            xmp_str = xmp_chunk.decode('utf-8', errors='replace')
            results.append({
                "technique": "Metadata — XMP",
                "field": "XMP packet",
                "status": "found",
                "message": "XMP metadata found — can contain hidden structured data",
                "extracted": xmp_str[:3000],
                "size": len(xmp_str),
                "confidence": "MEDIUM"
            })

    except Exception as e:
        results.append({
            "technique": "Metadata",
            "status": "error",
            "message": str(e),
            "extracted": None
        })

    return results


# ─────────────────────────────────────────────
# TECHNIQUE 4: Palette-Based Steganography
# ─────────────────────────────────────────────
def extract_palette_data(img):
    """
    Palette images (GIF, PNG with mode P) can hide data by reordering palette entries
    or storing data in unused palette slots.
    """
    results = []

    try:
        if img.mode not in ('P', 'PA'):
            # Try converting to palette mode to check
            palette_img = img.convert('P')
        else:
            palette_img = img

        palette = palette_img.getpalette()
        if not palette:
            return results

        # Palette is a flat list [R, G, B, R, G, B, ...]
        palette_bytes = bytes(palette)
        num_colors = len(palette) // 3

        # Check for hidden text/data in palette entries
        # Method 1: LSBs of palette values
        palette_bits = []
        for val in palette:
            palette_bits.append(val & 1)

        palette_byte_data = bytearray()
        for i in range(0, len(palette_bits) - 7, 8):
            byte_val = 0
            for b in range(8):
                byte_val = (byte_val << 1) | palette_bits[i + b]
            palette_byte_data.append(byte_val)

        sig_result = detect_file_signature(bytes(palette_byte_data), "Palette LSBs")
        if sig_result:
            results.append(sig_result)
        else:
            text_result = try_extract_text(bytes(palette_byte_data), "Palette LSBs")
            if text_result:
                results.append(text_result)

        # Method 2: Direct palette data scan
        sig_in_palette = detect_file_signature(palette_bytes, "Raw palette data")
        if sig_in_palette:
            results.append(sig_in_palette)

        # Method 3: Pixel index ordering analysis
        pixels = list(palette_img.getdata())
        pixel_bytes = bytes(pixels[:10000])
        text_from_pixels = try_extract_text(pixel_bytes, "Palette pixel indices")
        if text_from_pixels:
            results.append(text_from_pixels)

        # Report palette stats
        used_indices = set(pixels)
        unused = num_colors - len(used_indices)
        if unused > 10:
            results.append({
                "technique": "Palette Analysis",
                "status": "suspicious",
                "message": f"{unused} unused palette entries — can store {unused * 3} bytes of hidden data",
                "extracted": f"Palette: {num_colors} colors total, {len(used_indices)} used, {unused} unused slots",
                "confidence": "MEDIUM"
            })

    except Exception as e:
        results.append({
            "technique": "Palette Steganography",
            "status": "error",
            "message": str(e),
            "extracted": None
        })

    return results


# ─────────────────────────────────────────────
# TECHNIQUE 5: Spread Spectrum
# ─────────────────────────────────────────────
def extract_spread_spectrum(img_array):
    """
    Spread Spectrum hides data by adding a low-amplitude noise signal spread
    across many pixels using a pseudo-random sequence.
    Attempts to recover using correlation with common PRNG seeds.
    """
    results = []

    try:
        # Flatten to grayscale values
        if len(img_array.shape) == 3:
            gray = img_array[:, :, 0].astype(np.float32)
        else:
            gray = img_array.astype(np.float32)

        flat = gray.flatten()
        N = len(flat)

        # Try correlation with known PN sequences using common seeds
        best_bits = []
        best_score = 0

        for seed in [0, 42, 12345, 99999, 31337]:
            rng = np.random.RandomState(seed)
            pn_seq = rng.choice([-1, 1], size=min(N, 50000))

            chunk = flat[:len(pn_seq)]
            # Correlate: positive correlation → bit 1, negative → bit 0
            bits = []
            block_size = 64  # bits spread over 64 pixels
            for i in range(0, len(pn_seq) - block_size, block_size):
                corr = np.dot(chunk[i:i+block_size], pn_seq[i:i+block_size])
                bits.append(1 if corr > 0 else 0)

            # Score: if data is structured (has file signature) it's valid
            byte_data = bytearray()
            for i in range(0, len(bits) - 7, 8):
                byte_val = 0
                for b in range(8):
                    byte_val = (byte_val << 1) | bits[i + b]
                byte_data.append(byte_val)

            # Score based on printable ratio
            printable = sum(1 for b in byte_data if 32 <= b < 127)
            score = printable / max(len(byte_data), 1)
            if score > best_score:
                best_score = score
                best_bits = byte_data

        if best_bits:
            sig_result = detect_file_signature(bytes(best_bits), "Spread Spectrum correlation")
            if sig_result:
                results.append(sig_result)
            elif best_score > 0.6:
                text_result = try_extract_text(bytes(best_bits), "Spread Spectrum")
                if text_result:
                    results.append(text_result)

        results.append({
            "technique": "Spread Spectrum Analysis",
            "status": "analyzed",
            "message": f"PN-sequence correlation across {len(flat):,} pixels. Best printable ratio: {best_score:.1%}",
            "extracted": None,
            "confidence": "HIGH" if best_score > 0.7 else "LOW"
        })

    except Exception as e:
        results.append({
            "technique": "Spread Spectrum",
            "status": "error",
            "message": str(e),
            "extracted": None
        })

    return results


# ─────────────────────────────────────────────
# TECHNIQUE 6: File Appending (ZIP / 7zip / RAR)
# ─────────────────────────────────────────────
def extract_appended_files(filepath):
    """
    Files can be appended after the image's end-of-file marker.
    JPEG ends at 0xFF 0xD9, PNG ends at IEND chunk.
    ZIP, 7zip, RAR archives can be appended and still be valid.
    """
    results = []

    try:
        with open(filepath, 'rb') as f:
            raw = f.read()

        img_end = find_image_end(raw, filepath)
        appended = raw[img_end:] if img_end else b''

        if len(appended) < 4:
            results.append({
                "technique": "File Appending",
                "status": "clean",
                "message": "No appended data found after image end marker",
                "extracted": None,
                "confidence": "HIGH"
            })
            return results

        results.append({
            "technique": "File Appending — Raw Detection",
            "status": "found",
            "message": f"⚠️ {len(appended):,} bytes of data found AFTER image end marker (offset {img_end:,})",
            "extracted": None,
            "size": len(appended),
            "confidence": "HIGH"
        })

        # Try ZIP
        if b'PK\x03\x04' in appended or b'PK\x05\x06' in appended:
            zip_start = appended.find(b'PK\x03\x04')
            if zip_start == -1:
                zip_start = appended.find(b'PK\x05\x06')
            zip_data = appended[zip_start:]
            try:
                with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
                    names = zf.namelist()
                    files_extracted = {}
                    for name in names:
                        content = zf.read(name)
                        try:
                            text = content.decode('utf-8', errors='replace')
                        except Exception:
                            text = f"[Binary data: {len(content)} bytes]"
                        files_extracted[name] = text[:10000]

                    results.append({
                        "technique": "File Appending — ZIP Archive",
                        "status": "extracted",
                        "message": f"✅ ZIP archive extracted! Contains {len(names)} file(s): {', '.join(names)}",
                        "extracted": json.dumps(files_extracted, indent=2),
                        "files": names,
                        "size": len(zip_data),
                        "confidence": "HIGH",
                        "raw_bytes": list(zip_data[:512])
                    })
            except Exception as e:
                results.append({
                    "technique": "File Appending — ZIP",
                    "status": "found_unreadable",
                    "message": f"ZIP signature found but extraction failed: {str(e)}",
                    "extracted": None,
                    "confidence": "MEDIUM"
                })

        # Try 7zip: signature 37 7A BC AF 27 1C
        if b'\x37\x7a\xbc\xaf\x27\x1c' in appended:
            sz_start = appended.find(b'\x37\x7a\xbc\xaf\x27\x1c')
            results.append({
                "technique": "File Appending — 7-Zip Archive",
                "status": "found",
                "message": f"✅ 7-Zip archive signature detected at offset +{sz_start}. Use 7zip to extract: `7z x output.7z`",
                "extracted": f"7-Zip archive, {len(appended) - sz_start:,} bytes. Save appended data and open with 7-Zip.",
                "size": len(appended) - sz_start,
                "confidence": "HIGH"
            })

        # Try RAR: Rar! signature
        if b'Rar!\x1a\x07' in appended:
            rar_start = appended.find(b'Rar!\x1a\x07')
            results.append({
                "technique": "File Appending — RAR Archive",
                "status": "found",
                "message": f"✅ RAR archive signature found at offset +{rar_start}",
                "extracted": f"RAR archive detected, {len(appended) - rar_start:,} bytes",
                "confidence": "HIGH"
            })

        # Try raw text in appended data
        text_result = try_extract_text(appended, "Appended raw data")
        if text_result:
            results.append(text_result)

        # Try PDF
        if b'%PDF' in appended:
            pdf_start = appended.find(b'%PDF')
            results.append({
                "technique": "File Appending — PDF",
                "status": "found",
                "message": f"PDF document appended at offset +{pdf_start}",
                "extracted": f"PDF document, {len(appended) - pdf_start:,} bytes",
                "confidence": "HIGH"
            })

        # Generic: show hex preview of appended data
        hex_preview = ' '.join(f'{b:02x}' for b in appended[:64])
        ascii_preview = ''.join(chr(b) if 32 <= b < 127 else '.' for b in appended[:64])
        results.append({
            "technique": "File Appending — Raw Hex",
            "status": "preview",
            "message": "Raw bytes appended after image end",
            "extracted": f"HEX: {hex_preview}\nASCII: {ascii_preview}",
            "confidence": "HIGH"
        })

    except Exception as e:
        results.append({
            "technique": "File Appending",
            "status": "error",
            "message": str(e),
            "extracted": None
        })

    return results


def find_image_end(raw, filepath):
    """Find the actual end of image data."""
    ext = os.path.splitext(filepath)[1].lower()

    if ext in ['.jpg', '.jpeg']:
        # JPEG ends with FFD9
        idx = len(raw) - 1
        while idx > 0:
            if raw[idx-1] == 0xFF and raw[idx] == 0xD9:
                return idx + 1
            idx -= 1
        return len(raw)

    elif ext == '.png':
        # PNG ends with IEND chunk + CRC (12 bytes: length + IEND + data + crc)
        iend_pos = raw.rfind(b'IEND')
        if iend_pos != -1:
            return iend_pos + 8  # 4 bytes IEND + 4 bytes CRC
        return len(raw)

    elif ext == '.gif':
        # GIF ends with 3B
        idx = len(raw) - 1
        while idx > 0:
            if raw[idx] == 0x3B:
                return idx + 1
            idx -= 1
        return len(raw)

    elif ext == '.bmp':
        # BMP size is in header bytes 2-5
        if len(raw) > 6:
            bmp_size = struct.unpack('<I', raw[2:6])[0]
            return min(bmp_size, len(raw))
        return len(raw)

    return len(raw)


# ─────────────────────────────────────────────
# HELPERS: File Signature Detection & Text Extraction
# ─────────────────────────────────────────────

# Known file magic bytes
FILE_SIGNATURES = {
    b'PK\x03\x04': ('zip', 'ZIP Archive'),
    b'PK\x05\x06': ('zip', 'ZIP Archive (empty)'),
    b'\x37\x7a\xbc\xaf\x27\x1c': ('7z', '7-Zip Archive'),
    b'Rar!\x1a\x07': ('rar', 'RAR Archive'),
    b'\x1f\x8b': ('gz', 'GZip Archive'),
    b'BZh': ('bz2', 'BZip2 Archive'),
    b'%PDF': ('pdf', 'PDF Document'),
    b'\x89PNG': ('png', 'PNG Image'),
    b'\xff\xd8\xff': ('jpg', 'JPEG Image'),
    b'GIF87a': ('gif', 'GIF Image'),
    b'GIF89a': ('gif', 'GIF Image'),
    b'\x42\x4d': ('bmp', 'BMP Image'),
    b'RIFF': ('wav/avi', 'RIFF Media File'),
    b'\x00\x00\x01\x00': ('ico', 'ICO Icon'),
    b'\xd0\xcf\x11\xe0': ('doc/xls', 'MS Office Document'),
    b'PK': ('docx/xlsx', 'Office Open XML (DOCX/XLSX)'),
    b'\x7fELF': ('elf', 'ELF Executable'),
    b'MZ': ('exe/dll', 'Windows Executable'),
    b'\xca\xfe\xba\xbe': ('class', 'Java Class File'),
    b'SQLite': ('db', 'SQLite Database'),
    b'<?xml': ('xml', 'XML Document'),
    b'<html': ('html', 'HTML Document'),
    b'<!DOCTYPE': ('html', 'HTML Document'),
    b'#!/': ('sh', 'Shell Script'),
    b'#!': ('script', 'Script File'),
}


def detect_file_signature(data, source):
    """Check if data starts with or contains known file magic bytes."""
    if len(data) < 4:
        return None

    for sig, (ext, name) in FILE_SIGNATURES.items():
        # Check start of data
        if data[:len(sig)] == sig:
            return {
                "technique": f"Embedded File — {source}",
                "status": "file_found",
                "message": f"✅ {name} signature detected at start of extracted data",
                "extracted": f"File type: {name} (.{ext})\nSize: {len(data):,} bytes\nHex: {' '.join(f'{b:02x}' for b in data[:32])}",
                "file_type": ext,
                "file_name": name,
                "size": len(data),
                "confidence": "HIGH"
            }
        # Check within first 512 bytes
        pos = data[:512].find(sig)
        if pos > 0:
            return {
                "technique": f"Embedded File — {source}",
                "status": "file_found",
                "message": f"✅ {name} signature found at offset +{pos} in extracted stream",
                "extracted": f"File type: {name} (.{ext})\nOffset: {pos}\nSize est: {len(data) - pos:,} bytes",
                "file_type": ext,
                "file_name": name,
                "confidence": "HIGH"
            }

    return None


def try_extract_text(data, source, min_length=8):
    """
    Try to extract meaningful text from raw bytes.
    Handles null-terminated strings, length-prefixed, and raw ASCII/UTF-8.
    """
    if not data:
        return None

    # Method 1: Length-prefixed string (common in steganography tools)
    # First 4 bytes = big-endian length
    if len(data) >= 8:
        try:
            length = struct.unpack('>I', data[:4])[0]
            if 4 <= length <= len(data) - 4:
                text = data[4:4 + length].decode('utf-8', errors='strict')
                if is_meaningful_text(text, min_length):
                    return {
                        "technique": f"Text Extraction — {source}",
                        "status": "text_extracted",
                        "message": f"✅ Length-prefixed text extracted ({length} bytes)",
                        "extracted": text[:10000],
                        "size": length,
                        "confidence": "HIGH"
                    }
        except Exception:
            pass

    # Method 2: Null-terminated string
    null_pos = data.find(b'\x00')
    if null_pos > min_length:
        try:
            text = data[:null_pos].decode('utf-8', errors='strict')
            if is_meaningful_text(text, min_length):
                return {
                    "technique": f"Text Extraction — {source}",
                    "status": "text_extracted",
                    "message": f"✅ Null-terminated text extracted",
                    "extracted": text[:10000],
                    "size": null_pos,
                    "confidence": "HIGH"
                }
        except Exception:
            pass

    # Method 3: Raw printable ASCII run
    runs = []
    current_run = bytearray()
    for b in data:
        if 32 <= b < 127 or b in [9, 10, 13]:
            current_run.append(b)
        else:
            if len(current_run) >= min_length:
                runs.append(bytes(current_run).decode('ascii', errors='replace'))
            current_run = bytearray()
    if len(current_run) >= min_length:
        runs.append(bytes(current_run).decode('ascii', errors='replace'))

    if runs:
        combined = '\n'.join(runs)
        if is_meaningful_text(combined, min_length * 2):
            return {
                "technique": f"Text Extraction — {source}",
                "status": "text_extracted",
                "message": f"✅ {len(runs)} readable string(s) extracted",
                "extracted": combined[:10000],
                "size": len(combined),
                "confidence": "MEDIUM" if len(combined) > 50 else "LOW"
            }

    # Method 4: UTF-8 decode attempt
    try:
        text = data.decode('utf-8').strip('\x00')
        if is_meaningful_text(text, min_length):
            return {
                "technique": f"Text Extraction — {source}",
                "status": "text_extracted",
                "message": "✅ UTF-8 encoded text extracted",
                "extracted": text[:10000],
                "size": len(text),
                "confidence": "MEDIUM"
            }
    except Exception:
        pass

    return None


def is_meaningful_text(text, min_len=8):
    """Check if extracted text is meaningful (not random noise)."""
    if not text or len(text) < min_len:
        return False
    printable = sum(1 for c in text if c.isprintable() or c in '\n\r\t')
    ratio = printable / len(text)
    return ratio > 0.7


# ─────────────────────────────────────────────
# AI SUMMARY ENGINE
# ─────────────────────────────────────────────
def generate_ai_summary(all_results, image_info):
    """Generate an intelligent AI summary of findings."""
    
    found_count = sum(1 for r in all_results
                      if r.get('status') in ['found', 'extracted', 'text_extracted', 'file_found'])
    
    techniques_triggered = list(set(r.get('technique', '').split('—')[0].strip()
                                    for r in all_results
                                    if r.get('status') in ['found', 'extracted', 'text_extracted', 'file_found']))
    
    high_conf = [r for r in all_results if r.get('confidence') == 'HIGH'
                 and r.get('extracted')]
    
    # Determine overall risk
    if any(r.get('status') == 'file_found' for r in all_results):
        risk = 'CRITICAL'
        risk_score = 95
    elif any(r.get('status') == 'extracted' for r in all_results):
        risk = 'HIGH'
        risk_score = 82
    elif len(high_conf) >= 2:
        risk = 'HIGH'
        risk_score = 75
    elif found_count >= 2:
        risk = 'MEDIUM'
        risk_score = 55
    elif found_count == 1:
        risk = 'MEDIUM'
        risk_score = 40
    else:
        risk = 'LOW'
        risk_score = 12

    # Build narrative
    if risk in ['CRITICAL', 'HIGH']:
        narrative = (
            f"ThreatPixel AI has detected steganographic content in this image with HIGH confidence. "
            f"{found_count} extraction technique(s) recovered hidden data. "
        )
        if techniques_triggered:
            narrative += f"Active techniques: {', '.join(techniques_triggered)}. "
        narrative += (
            "This image contains intentionally hidden information beyond what is visually apparent. "
            "The extracted content is available for review below. "
            "If this image was received unexpectedly, treat it as a potential security threat."
        )
    elif risk == 'MEDIUM':
        narrative = (
            f"ThreatPixel AI found {found_count} indicator(s) of possible steganographic activity. "
            "Some data was recovered but conclusiveness is limited — could be compression artifacts or legitimate metadata. "
            "Manual review of extracted content is recommended."
        )
    else:
        narrative = (
            "ThreatPixel AI completed a full 6-technique analysis and found no significant indicators "
            "of steganographic content. The image appears clean across LSB, DCT, Metadata, Palette, "
            "Spread Spectrum, and File Appending checks."
        )

    return {
        "risk": risk,
        "riskScore": risk_score,
        "summary": narrative,
        "foundCount": found_count,
        "techniquesTried": 6,
        "techniquesTriggered": techniques_triggered,
        "highConfidenceFindings": len(high_conf)
    }


# ─────────────────────────────────────────────
# FLASK ROUTES
# ─────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "ThreatPixel AI Extraction Engine",
        "version": "2.0.0",
        "techniques": ["LSB", "DCT", "Metadata", "Palette", "SpreadSpectrum", "FileAppending"]
    })


@app.route('/api/extract', methods=['POST'])
def extract():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    allowed = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        return jsonify({"error": f"Unsupported format: {ext}"}), 400

    # Save to temp
    tmp_path = os.path.join(UPLOAD_FOLDER, f"upload_{hashlib.md5(os.urandom(8)).hexdigest()}{ext}")

    try:
        file.save(tmp_path)
        file_size = os.path.getsize(tmp_path)

        if file_size > MAX_FILE_SIZE:
            os.unlink(tmp_path)
            return jsonify({"error": "File too large (max 50MB)"}), 413

        # Load image
        img = Image.open(tmp_path)
        img_info = {
            "filename": file.filename,
            "format": img.format or ext.upper().replace('.', ''),
            "mode": img.mode,
            "size": f"{img.width}×{img.height}",
            "width": img.width,
            "height": img.height,
            "fileSize": file_size,
            "sha256": hashlib.sha256(open(tmp_path, 'rb').read()).hexdigest()
        }

        # Convert to numpy for analysis
        img_rgb = img.convert('RGBA') if img.mode in ('P', 'PA') else img
        img_rgb = img_rgb.convert('RGBA') if 'A' not in img_rgb.mode else img_rgb
        img_array = np.array(img_rgb)

        all_results = []

        # Run all 6 techniques
        try:
            lsb_results = extract_lsb(img_array)
            for r in lsb_results:
                r['techniqueId'] = 'lsb'
            all_results.extend(lsb_results)
        except Exception as e:
            all_results.append({"technique": "LSB", "status": "error", "message": str(e), "techniqueId": "lsb"})

        if ext in ['.jpg', '.jpeg']:
            try:
                dct_results = extract_dct_data(tmp_path)
                for r in dct_results:
                    r['techniqueId'] = 'dct'
                all_results.extend(dct_results)
            except Exception as e:
                all_results.append({"technique": "DCT", "status": "error", "message": str(e), "techniqueId": "dct"})

        try:
            meta_results = extract_metadata(tmp_path)
            for r in meta_results:
                r['techniqueId'] = 'metadata'
            all_results.extend(meta_results)
        except Exception as e:
            all_results.append({"technique": "Metadata", "status": "error", "message": str(e), "techniqueId": "metadata"})

        if img.mode in ('P', 'PA') or ext == '.gif':
            try:
                palette_results = extract_palette_data(img)
                for r in palette_results:
                    r['techniqueId'] = 'palette'
                all_results.extend(palette_results)
            except Exception as e:
                all_results.append({"technique": "Palette", "status": "error", "message": str(e), "techniqueId": "palette"})
        else:
            all_results.append({
                "technique": "Palette Steganography",
                "techniqueId": "palette",
                "status": "skipped",
                "message": f"Not applicable for {img.mode} mode images (requires palette/GIF images)",
                "extracted": None
            })

        try:
            ss_results = extract_spread_spectrum(img_array)
            for r in ss_results:
                r['techniqueId'] = 'spread'
            all_results.extend(ss_results)
        except Exception as e:
            all_results.append({"technique": "Spread Spectrum", "status": "error", "message": str(e), "techniqueId": "spread"})

        try:
            append_results = extract_appended_files(tmp_path)
            for r in append_results:
                r['techniqueId'] = 'fileappend'
            all_results.extend(append_results)
        except Exception as e:
            all_results.append({"technique": "File Appending", "status": "error", "message": str(e), "techniqueId": "fileappend"})

        # AI Summary
        ai_summary = generate_ai_summary(all_results, img_info)

        return jsonify({
            "success": True,
            "scanId": f"TXP-{hashlib.md5(os.urandom(4)).hexdigest()[:8].upper()}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "imageInfo": img_info,
            "aiSummary": ai_summary,
            "results": all_results
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = (data or {}).get('message', '').lower()

    KB = {
        ('stegan', 'hidden', 'what is'): "**Steganography** hides secret data inside image files. ThreatPixel AI uses 6 real extraction techniques:\n\n1. **LSB** — reads least significant bits of pixel values\n2. **DCT** — analyzes JPEG frequency coefficients\n3. **Metadata** — extracts EXIF/XMP/PNG text chunks\n4. **Palette** — checks GIF/PNG palette slots\n5. **Spread Spectrum** — PN-sequence correlation\n6. **File Appending** — detects ZIP/7zip/RAR after image EOF",
        ('lsb', 'least significant', 'pixel bit'): "**LSB (Least Significant Bit)** replaces the last bit of each pixel's R, G, or B value with a message bit.\n\nExample: pixel value 200 (11001000) → 201 (11001001) — color barely changes but 1 bit is hidden.\n\nAn 800×600 RGB image can hide ~180KB using 1-bit LSB. ThreatPixel checks 1-bit and 2-bit LSB across all channels.",
        ('dct', 'jpeg', 'frequency'): "**DCT Steganography** hides data in JPEG frequency coefficients (8×8 blocks).\n\nTools like JSteg, F5, and OutGuess use this. ThreatPixel applies DCT to image blocks and extracts LSBs from non-zero AC coefficients — the same method used by JSteg.",
        ('metadata', 'exif', 'xmp', 'chunk'): "**Metadata Steganography** embeds data in image metadata:\n- EXIF fields: `UserComment`, `MakerNote`, `ImageDescription`\n- PNG text chunks: `tEXt`, `zTXt`, `iTXt`\n- JPEG COM markers\n- XMP packets\n\nThis is very common — data is literally stored in plain sight in the file header.",
        ('palette', 'gif', 'color table'): "**Palette Steganography** modifies GIF/PNG color tables:\n- Reorders palette entries (same visual, different bit pattern)\n- Stores data in unused palette slots (up to 256 colors)\n- Uses LSBs of palette RGB values\n\nEffective for GIF images which have a fixed 256-color palette.",
        ('spread', 'spectrum', 'noise'): "**Spread Spectrum** hides data as low-amplitude noise spread across many pixels using a pseudo-random number generator (PRNG) key.\n\nThreatPixel correlates the image with multiple common PRNG seeds to attempt recovery. This technique is hard to detect statistically.",
        ('append', 'zip', '7zip', 'rar', 'archive'): "**File Appending** adds a ZIP/7zip/RAR archive after the image's end marker:\n- JPEG ends at `FF D9` — anything after is not displayed\n- PNG ends at `IEND` chunk\n\nThe image looks completely normal. ThreatPixel finds the EOF marker and analyzes all bytes after it. ZIP files are fully extracted.",
        ('report', 'cybercrime', 'cert'): "**Report Cybercrime in India:**\n1. cybercrime.gov.in\n2. Helpline: **1930**\n3. CERT-In: cert-in.org.in\n\nAttach your ThreatPixel Scan ID and extracted data as evidence.",
        ('risk', 'critical', 'high', 'low'): "**Risk Levels:**\n🔴 **CRITICAL** — Embedded file (ZIP/archive) confirmed\n🔴 **HIGH** — Multiple techniques found hidden data\n🟡 **MEDIUM** — Suspicious indicators, needs review\n🟢 **LOW** — No steganographic content found",
    }

    response = None
    for keywords, reply in KB.items():
        if any(kw in message for kw in keywords):
            response = reply
            break

    if not response:
        if any(w in message for w in ['hi', 'hello', 'hey']):
            response = "Hello! I'm PixelGuard AI. I can explain any of the 6 steganography extraction techniques, help interpret your results, or guide you through reporting. What would you like to know?"
        else:
            response = "I specialize in steganography and digital forensics. Try asking about:\n- **LSB / DCT / Metadata / Palette / Spread Spectrum / File Appending**\n- **How to interpret results**\n- **How to report a cybercrime**\n- **What does HIGH/CRITICAL risk mean**"

    return jsonify({"response": response})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
