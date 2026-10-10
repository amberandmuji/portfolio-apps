"""Rebuild the browser preview (../../index.html) from web/template.html and tools/sprites.py.
   python3 tools/export_web.py"""
import base64, io, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
import sprites

data = {}
for name, frames in sprites.frames().items():
    out = []
    for im in frames:
        b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
        out.append('data:image/png;base64,' + base64.b64encode(b.getvalue()).decode())
    data[name] = out
src = os.path.join(here, '..', 'web', 'template.html')
dst = os.path.join(here, '..', '..', 'index.html')
open(dst, 'w').write(open(src).read().replace('__SPRITES__', json.dumps(data)))
print('wrote', os.path.normpath(dst))
