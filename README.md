# Lumina Photo Studio ??
> **100% Free & Offline-First Professional Desktop Photo Editor & RAW Processor**

Lumina Photo Studio is a standalone, production-quality photography catalog and non-destructive RAW/image editor designed for Windows 10/11 (64-bit). Built with **Electron, React, TypeScript, and WebGL2**, it provides a complete professional workflow�from rapid culling, EXIF inspection, to real-time 60fps GPU-accelerated grading, multi-layer masking, and high-resolution multi-format exporting.

---

## Key Features

### 1. Library & Asset Management
- **Universal Import**: Non-destructive folder scanning for RAW (DNG, CR2, NEF, ARW, ORF, RAF), JPEG, PNG, TIFF, and WebP.
- **High-Speed Culling**:
  - 1�5 Star ratings (`1`�`5` keys, `0` to reset).
  - Flags: Pick (`P`), Reject (`X`), Unflag (`U`).
  - Color Labels: Red (`6`), Yellow (`7`), Green (`8`), Blue (`9`).
- **Comprehensive EXIF & IPTC Inspector**: Read shutter speed, aperture, ISO, camera make/model, lens, focal length, and edit IPTC title, caption, copyright, and creator fields.
- **Smart Filtering & Search**: Instant search by camera, lens, keywords, ratings, or flag status.
- **Collections & Albums**: Organize projects into custom folders, favorites, and smart albums.

### 2. GPU-Accelerated Develop Engine (WebGL2 Float32 Pipeline)
- **Basic Tone**: Exposure (-5 to +5 EV), Contrast, Highlights, Shadows, Whites, Blacks, White Balance (Kelvin 2000K�12000K), Tint, Vibrance, Saturation, Texture, Clarity, and Dehaze.
- **Tone Curves**: Interactive Monotone Cubic Spline curve editor supporting composite RGB, Red, Green, and Blue channels.
- **Color Mixer / HSL**: 8 color bands (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta) with independent Hue, Saturation, and Luminance controls.
- **3-Way Color Grading**: Interactive color wheels for Shadows, Midtones, and Highlights with Blending and Balance sliders.
- **Detail & Optics**: Sharpening, Radius, Detail, Masking, Luminance/Color Noise Reduction, Vignette, Film Grain, and Lens Distortion / CA correction.
- **Transform & Crop**: Rule-of-thirds grid overlay, 90� rotation, Horizontal/Vertical flip, Straighten angle, and Aspect Ratio presets (1:1, 4:3, 3:2, 16:9, 5:4).

### 3. Local Masking & Healing
- **Multi-Layer Masks**: Brush, Linear Gradient, Radial Gradient, Color Range, and Luminance Range masks.
- **Rubylith Overlay**: Visual red mask preview (`O` key) and mask inversion.
- **Independent Adjustments**: Each mask layer possesses its own exposure, contrast, highlights, shadows, clarity, and saturation controls.
- **Spot Removal & Clone**: Interactive Heal and Clone pins with draggable source/target handles and feathering.

### 4. Presets, History & Snapshots
- **8 Curated Built-in Presets**: *Golden Hour Glow*, *Nordic Moody*, *Vintage Film 1970s*, *Teal & Orange Blockbuster*, *Monochrome Dramatic*, *Crisp Architectural*, *Vibrant Landscape*, *Clean Studio Portrait*.
- **Custom Presets**: Create, save locally, import, and export (`.json`) custom presets.
- **Infinite Undo/Redo**: Full history stack (`Ctrl+Z` / `Ctrl+Y`) and named snapshots.
- **Before / After Split**: Interactive split-screen slider and instant toggle (`\` key).

### 5. High-Performance Batch Workflow & Export
- **Synchronize Settings**: Batch copy selected adjustment parameters across multiple selected photos.
- **Multi-Format Export**: JPEG (1�100% quality), PNG (8/16-bit), TIFF, and WebP.
- **Custom Sizing & DPI**: Original resolution or long-edge resizing with 72/300 DPI support and custom naming templates.

---

## Keyboard Shortcuts Quick Reference

| Action | Shortcut |
| :--- | :--- |
| **Library View** | `G` |
| **Develop View** | `D` |
| **1�5 Star Rating** | `1` � `5` (`0` to clear) |
| **Pick Flag** | `P` |
| **Reject Flag** | `X` |
| **Unflag** | `U` |
| **Color Labels** | `6` (Red), `7` (Yellow), `8` (Green), `9` (Blue) |
| **Before / After Split** | `\` |
| **Adjust Tool** | `V` |
| **Crop Tool** | `C` |
| **Masking Tool** | `M` |
| **Healing Tool** | `H` |
| **Undo / Redo** | `Ctrl+Z` / `Ctrl+Y` |
| **Next / Previous Photo** | `?` / `?` |

---

## Build and Run Instructions

### Prerequisites
- Node.js v18+ or v20+
- Windows 10/11 64-bit

### Development Mode
```powershell
npm run dev
```

### Production Build & Packaging
```powershell
npm run build
npm run electron:build
```

---

## Security & Privacy Guarantee
- **100% Offline**: Zero telemetry, zero analytics, zero external network requests.
- **Non-Destructive**: Original source photographs are never overwritten.
- **Local Storage**: All catalogs, presets, and history are stored strictly on the local machine.

---

## License
MIT License.
