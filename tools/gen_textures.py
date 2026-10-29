"""Generate original, seamless PBR textures for the vn-house 3D model.

All textures are procedurally generated from fixed seeds (no third-party assets,
no licensing questions). Every map is periodic (FFT-filtered noise + np.roll
gradients), so RepeatWrapping in three.js shows no seams.

Output: tex/<name>_<map>.webp
  tile   : 2x2 polished porcelain tiles, 800x800 mm each (atlas = 1.6 m)
  oak    : light oak veneer, vertical grain (0.6 m x 2.4 m)
  stone  : beige-grey quartz countertop (0.6 m)
  plaster: warm-white wall micro relief (0.8 m)

Run:  python3 tools/gen_textures.py   then   python3 tools/embed_textures.py
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'tex')
os.makedirs(OUT, exist_ok=True)


def noise(h, w, beta=2.0, sx=1.0, sy=1.0, seed=0):
    """Periodic 1/f^beta noise, normalised to [-1, 1]. sx/sy stretch frequencies (anisotropy)."""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None] * h / sy
    fx = np.fft.fftfreq(w)[None, :] * w / sx
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    spec = np.fft.fft2(white) / f ** beta
    spec[0, 0] = 0
    n = np.real(np.fft.ifft2(spec))
    return n / (np.abs(n).max() + 1e-9)


def normal_from_height(hgt, strength):
    dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5 * strength
    dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5 * strength
    n = np.dstack([-dx, dy, np.ones_like(hgt)])   # three.js expects +Y up (OpenGL)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)


def save(name, arr, q=82):
    path = os.path.join(OUT, name + '.webp')
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    img.save(path, 'WEBP', quality=q, method=6)
    print(f'{name:16s} {img.size}  {os.path.getsize(path) // 1024} KB')


def lerp(a, b, t):
    a = np.asarray(a, float); b = np.asarray(b, float)
    return a + (b - a) * t[..., None]


# ---------------------------------------------------------------- tile
def tile(px=1024):
    T = px // 2                      # one 800 mm tile
    col = np.zeros((px, px, 3)); rough = np.zeros((px, px)); hgt = np.zeros((px, px))
    base, vein_c = (234, 224, 207), (204, 193, 176)
    for k, (oy, ox) in enumerate([(0, 0), (0, T), (T, 0), (T, T)]):
        cloud = noise(T, T, 2.4, seed=10 + k) * 0.6 + noise(T, T, 1.6, seed=20 + k) * 0.4
        warp = noise(T, T, 2.2, seed=30 + k)
        yy, xx = np.mgrid[0:T, 0:T] / T
        ang = [0.35, -0.5, 1.1, -0.15][k]
        u = xx * np.cos(ang) + yy * np.sin(ang)
        vein = np.abs(np.sin((u * 2.2 + warp * 0.9) * np.pi))
        vein = np.clip(1 - vein / 0.035, 0, 1) ** 1.5 * (0.55 + 0.45 * noise(T, T, 2.0, seed=40 + k).clip(0, 1))
        t = np.clip(0.18 * (cloud * 0.5 + 0.5) + 0.55 * vein, 0, 1)
        c = lerp(base, vein_c, t)
        c *= (1 + 0.012 * noise(T, T, 1.0, seed=50 + k))[..., None]      # fine mottling
        col[oy:oy + T, ox:ox + T] = c
        rough[oy:oy + T, ox:ox + T] = 0.10 + 0.025 * (cloud * 0.5 + 0.5)
        hgt[oy:oy + T, ox:ox + T] = 0.015 * noise(T, T, 1.2, seed=60 + k)
    # 2 mm grout (~1.3 px) drawn as 2 px band shared across tile borders
    g = np.zeros((px, px), bool)
    for p in (0, T):
        g[:, [p - 1, p]] = True; g[[p - 1, p], :] = True
    col[g] = (212, 205, 193); rough[g] = 0.85; hgt[g] = -1.0
    save('tile_color', col, 86)
    save('tile_rough', np.dstack([rough * 255] * 3), 80)
    save('tile_normal', normal_from_height(hgt, 1.2), 90)


# ---------------------------------------------------------------- oak
def oak(w=512, h=2048):
    # Rift-cut veneer: near-straight lines, irregular spacing, long pore streaks.
    rng = np.random.default_rng(100)
    d1 = np.real(np.fft.ifft(np.fft.fft(rng.standard_normal(w)) / np.maximum(1, np.abs(np.fft.fftfreq(w) * w)) ** 1.2))
    d1 /= np.abs(d1).max()
    dens = 1 + 0.5 * d1                                            # local line density varies across the board
    dens *= w / dens.sum()                                         # keep it periodic: integer cycles over width
    phase0 = np.cumsum(dens) / w * 26                              # 26 grain lines per 0.6 m
    warp = noise(h, w, 2.4, sx=1.0, sy=14.0, seed=101)             # very slow wander along the grain
    phase = phase0[None, :] + warp * 0.45
    ring = 0.5 + 0.5 * np.sin(phase * 2 * np.pi)
    strength = 0.45 + 0.55 * (noise(h, w, 2.0, sx=0.5, sy=30.0, seed=105) * 0.5 + 0.5)
    late = ring ** 12 * strength                                   # thin latewood lines of varying darkness
    broad = noise(h, w, 2.4, sx=1.0, sy=25.0, seed=103)            # colour bands between flitches
    pores = noise(h, w, 0.7, sx=1.0, sy=70.0, seed=104)            # fine elongated pores
    pores = np.clip((pores - 0.3) / 0.7, 0, 1)
    light, dark = (208, 176, 134), (160, 121, 80)
    t = np.clip(0.42 * late + 0.14 * (broad * 0.5 + 0.5) + 0.30 * pores, 0, 1)
    col = lerp(light, dark, t)
    col *= (1 + 0.035 * broad)[..., None]
    rough = 0.52 + 0.12 * pores + 0.05 * late
    hgt = -0.6 * pores - 0.25 * late
    save('oak_color', col, 84)
    save('oak_rough', np.dstack([rough * 255] * 3), 78)
    save('oak_normal', normal_from_height(hgt, 1.6), 86)


# ---------------------------------------------------------------- stone (quartz)
def stone(px=512):
    cloud = noise(px, px, 2.3, seed=201)
    speck = noise(px, px, 0.2, seed=202)
    warp = noise(px, px, 2.0, seed=203)
    yy, xx = np.mgrid[0:px, 0:px] / px
    vein = np.abs(np.sin(((xx * 0.7 + yy * 0.4) * 1.5 + warp * 0.8) * np.pi))
    vein = np.clip(1 - vein / 0.03, 0, 1) * 0.6
    base, grey = (222, 215, 204), (196, 188, 176)
    t = np.clip(0.25 * (cloud * 0.5 + 0.5) + 0.35 * vein, 0, 1)
    col = lerp(base, grey, t)
    dots = speck > 0.55
    col[dots] *= 0.86
    col[speck < -0.6] = col[speck < -0.6] * 0.4 + np.array([246, 242, 234]) * 0.6
    rough = np.full((px, px), 0.2) + 0.05 * (cloud * 0.5 + 0.5)
    save('stone_color', col, 84)
    save('stone_rough', np.dstack([rough * 255] * 3), 78)
    save('stone_normal', normal_from_height(0.08 * speck, 1.0), 86)


# ---------------------------------------------------------------- plaster
def plaster(px=512):
    hgt = noise(px, px, 1.3, seed=301) * 0.6 + noise(px, px, 2.2, seed=302) * 0.4
    save('plaster_normal', normal_from_height(hgt * 0.35, 1.0), 82)


if __name__ == '__main__':
    tile(); oak(); stone(); plaster()
