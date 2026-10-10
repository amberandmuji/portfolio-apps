"""Render the trailer: frames from film.html in headless Chromium + offline soundtrack.
Usage: python3 scripts/render-trailer.py URL OUTDIR [start] [end] [--audio] [--only=N ...]
Then encode with ffmpeg (see README)."""
import sys, time, base64, os
from playwright.sync_api import sync_playwright

url, out = sys.argv[1], sys.argv[2]
start = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 0
end = int(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4].isdigit() else None
want_audio = '--audio' in sys.argv
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.set_default_timeout(0)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    pg.wait_for_function('window.film && window.film.ready', timeout=0)
    pg.evaluate('document.fonts.ready')
    n = pg.evaluate('window.film.frames')
    end = n if end is None else min(end, n)
    print('frames', n, 'rendering', start, '..', end, flush=True)
    if want_audio:
        wav = pg.evaluate('window.film.renderAudio()')
        open(os.path.join(out, 'soundtrack.wav'), 'wb').write(base64.b64decode(wav))
        print('audio ok', flush=True)
    picks = [int(a.split('=')[1]) for a in sys.argv if a.startswith('--only=')]
    t0 = time.time()
    for f in (picks or range(start, end)):
        info = pg.evaluate(f'window.film.frame({f})')
        if f >= start:
            pg.screenshot(path=os.path.join(out, f'f{f:04d}.jpg'), type='jpeg', quality=94)
            print(f, info, round(time.time() - t0, 1), flush=True)
    print('errors', errs, flush=True)
    b.close()
