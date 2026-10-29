"""Embed tex/*.webp into index.html as data URIs (window.__VN_TEX).

Keeps the model a single offline-capable file. The block is inserted right before
the main app <script> and replaced in place on re-run.
"""
import base64, glob, json, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..')
html_path = os.path.join(ROOT, 'index.html')
tex = {}
for p in sorted(glob.glob(os.path.join(ROOT, 'tex', '*.webp'))):
    tex[os.path.basename(p)[:-5]] = 'data:image/webp;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
block = ('<script id="vn-tex">\n// 原創程序式 PBR 貼圖（tools/gen_textures.py 產生；tools/embed_textures.py 嵌入），離線可用。\n'
         'window.__VN_TEX=' + json.dumps(tex, separators=(',', ':')) + ';\n</script>\n')
h = open(html_path, encoding='utf-8').read()
h = re.sub(r'<script id="vn-tex">[\s\S]*?</script>\n', '', h)
i = h.rfind('<script>')
assert i > 0
h = h[:i] + block + h[i:]
open(html_path, 'w', encoding='utf-8').write(h)
print('embedded', len(tex), 'textures,', sum(len(v) for v in tex.values()) // 1024, 'KB base64')
