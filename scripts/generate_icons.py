import zlib
import struct
import math
import os

SVG_CONTENT = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="35%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c7d2fe"/>
      <stop offset="60%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Outer Squircle Body -->
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#bgGrad)" stroke="#4338ca" stroke-width="8"/>
  <rect x="36" y="36" width="440" height="440" rx="98" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-opacity="0.35"/>

  <!-- Insignia Group with Depth -->
  <g filter="url(#glow)">
    <!-- Open Book / Constitution Base -->
    <path d="M136 364 Q 256 332 376 364 L 376 338 Q 256 308 136 338 Z" fill="url(#bookGrad)"/>
    <path d="M148 338 Q 256 308 364 338 L 364 316 Q 256 288 148 316 Z" fill="#94a3b8"/>
    <line x1="256" y1="312" x2="256" y2="352" stroke="#475569" stroke-width="3" stroke-linecap="round"/>

    <!-- Central Classical Pillar -->
    <path d="M232 312 L 280 312 L 272 196 L 240 196 Z" fill="url(#goldGrad)"/>
    <line x1="256" y1="312" x2="256" y2="196" stroke="#fef08a" stroke-width="3.5"/>

    <!-- Wings of Merit / Intellectual Ascendance -->
    <path d="M238 196 Q 170 206 138 274 Q 176 250 234 234 Z" fill="url(#wingGrad)"/>
    <path d="M274 196 Q 342 206 374 274 Q 336 250 278 234 Z" fill="url(#wingGrad)"/>
    
    <path d="M236 234 Q 186 260 156 312 Q 198 290 238 268 Z" fill="#e0e7ff" opacity="0.9"/>
    <path d="M276 234 Q 326 260 356 312 Q 314 290 274 268 Z" fill="#e0e7ff" opacity="0.9"/>

    <!-- Guiding North Star of Civil Services -->
    <polygon points="256,92 268,136 312,148 268,160 256,204 244,160 200,148 244,136" fill="url(#goldGrad)"/>
    <polygon points="256,112 264,142 294,148 264,154 256,184 248,154 218,148 248,142" fill="#fef08a"/>
    <circle cx="256" cy="148" r="7.5" fill="#ffffff"/>
  </g>
</svg>
"""

def create_png(width, height, get_pixel):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type None
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack(">I", len(data)) + chunk + struct.pack(">I", crc)

    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b"IHDR", ihdr_data)
    idat = make_chunk(b"IDAT", zlib.compress(bytes(raw_data), 9))
    iend = make_chunk(b"IEND", b"")
    return b"\x89PNG\r\n\x1a\n" + ihdr + idat + iend

def render_icon_pixel(x, y, width, height):
    nx = (x / (width - 1)) * 2 - 1
    ny = (y / (height - 1)) * 2 - 1

    cx = abs(nx)
    cy = abs(ny)
    r = 0.44
    if cx > (1 - r) and cy > (1 - r):
        dx = cx - (1 - r)
        dy = cy - (1 - r)
        d = math.sqrt(dx*dx + dy*dy) - r
    else:
        d = max(cx - 1, cy - 1)

    if d > 0.02:
        return (0, 0, 0, 0)
    
    alpha = 255
    if d > -0.02:
        alpha = int(max(0, min(255, (0.02 - d) / 0.04 * 255)))

    # Background gradient: deep navy (#0f172a) to indigo (#312e81)
    t = (nx + ny + 2) / 4.0
    bg_r = int(15 + t * (49 - 15))
    bg_g = int(23 + t * (46 - 23))
    bg_b = int(42 + t * (129 - 42))

    # Outer border ring
    if -0.06 < d <= 0:
        border_factor = (d + 0.06) / 0.06
        bg_r = int(bg_r * (1 - border_factor) + 99 * border_factor)
        bg_g = int(bg_g * (1 - border_factor) + 102 * border_factor)
        bg_b = int(bg_b * (1 - border_factor) + 241 * border_factor)

    # 1. Star at top center (0, -0.42)
    star_x = nx
    star_y = ny + 0.42
    star_dist = math.hypot(star_x, star_y)
    angle = math.atan2(star_y, star_x)
    star_shape = 0.24 / (1 + 4.2 * abs(math.sin(angle * 2)))
    
    if star_dist < star_shape:
        gold_t = max(0, min(1, (star_y + 0.3) / 0.4))
        sr = int(254 * (1 - gold_t) + 217 * gold_t)
        sg = int(240 * (1 - gold_t) + 119 * gold_t)
        sb = int(138 * (1 - gold_t) + 6 * gold_t)
        if star_dist < 0.04:
            return (255, 255, 255, alpha)
        return (sr, sg, sb, alpha)

    # 2. Central Pillar: -0.1 < nx < 0.1, -0.2 < ny < 0.28
    if -0.1 < nx < 0.1 and -0.22 < ny < 0.28:
        p_t = (ny + 0.22) / 0.5
        pr = int(251 * (1 - p_t) + 217 * p_t)
        pg = int(191 * (1 - p_t) + 119 * p_t)
        pb = int(36 * (1 - p_t) + 6 * p_t)
        if abs(nx) < 0.02:
            return (255, 254, 220, alpha)
        return (pr, pg, pb, alpha)

    # 3. Wings / Laurels
    if 0.1 < abs(nx) < 0.52 and -0.22 < ny < 0.18:
        arch = -0.22 + 1.2 * ((abs(nx) - 0.1) ** 1.3)
        if abs(ny - arch) < 0.08:
            return (199, 210, 254, alpha)

    # 4. Open Book / Base: x in [-0.55, 0.55], y in [0.26, 0.52]
    if abs(nx) < 0.55 and 0.26 < ny < 0.52:
        curve = 0.38 - 0.12 * (nx * nx)
        if abs(ny - curve) < 0.08:
            shade = int(240 - abs(nx) * 60)
            return (shade, shade, int(shade * 1.05), alpha)

    return (bg_r, bg_g, bg_b, alpha)

def create_ico(png_bytes):
    # Standard ICO header with embedded PNG image
    # ICONDIR: idReserved (2), idType (2, 1=icon), idCount (2, 1)
    # ICONDIRENTRY: bWidth (1), bHeight (1), bColorCount (1), bReserved (1), wPlanes (2), wBitCount (2), dwBytesInRes (4), dwImageOffset (4)
    ico_header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack(
        "<BBBBHHII",
        0, 0, 0, 0, 1, 32, len(png_bytes), 6 + 16
    )
    return ico_header + entry + png_bytes

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, "public")
    app_dir = os.path.join(base_dir, "src", "app")

    # 1. Write SVG icons
    favicon_svg_path = os.path.join(public_dir, "favicon.svg")
    app_icon_svg_path = os.path.join(app_dir, "icon.svg")
    
    with open(favicon_svg_path, "w", encoding="utf-8") as f:
        f.write(SVG_CONTENT)
    print("Created:", favicon_svg_path)

    with open(app_icon_svg_path, "w", encoding="utf-8") as f:
        f.write(SVG_CONTENT)
    print("Created:", app_icon_svg_path)

    # 2. Generate PNG sizes
    print("Rendering icon-192.png...")
    png_192 = create_png(192, 192, render_icon_pixel)
    with open(os.path.join(public_dir, "icon-192.png"), "wb") as f:
        f.write(png_192)

    print("Rendering icon-512.png...")
    png_512 = create_png(512, 512, render_icon_pixel)
    with open(os.path.join(public_dir, "icon-512.png"), "wb") as f:
        f.write(png_512)

    print("Rendering src/app/icon.png...")
    png_64 = create_png(64, 64, render_icon_pixel)
    with open(os.path.join(app_dir, "icon.png"), "wb") as f:
        f.write(png_64)

    # 3. Generate favicon.ico (64x64 PNG embedded)
    with open(os.path.join(public_dir, "favicon.ico"), "wb") as f:
        f.write(create_ico(png_64))
    print("Created: public/favicon.ico")

    # 4. Remove / replace public/upsc_logo.png so no unauthentic scraped logo remains
    upsc_logo_path = os.path.join(public_dir, "upsc_logo.png")
    with open(upsc_logo_path, "wb") as f:
        f.write(png_512)
    print("Replaced public/upsc_logo.png with concrete brand emblem")

if __name__ == "__main__":
    main()
