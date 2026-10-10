import asyncio, json, math, sys
from playwright.async_api import async_playwright

FPS = 60
DUR = 10.0
N = int(FPS * DUR)
import os
START = int(os.environ.get("START", "0"))
OUT = "/tmp/claude-0/vid/out2"
SX, SY, S, SBAR = 140, 94, 2.0513, 47
REVIEW = "Silky usucha, nutty and clean. Mango cream next time!"

def cl(x): return max(0.0, min(1.0, x))
def ease(x):  # easeInOutCubic
    x = cl(x); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def eout(x):
    x = cl(x); return 1 - (1 - x) ** 3
def lerp(a, b, k): return a + (b - a) * k

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--allow-file-access-from-files", "--disable-web-security"])
        pg = await b.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        await pg.goto("file:///tmp/claude-0/vid/stage.html")
        await pg.wait_for_timeout(800)
        app = [f for f in pg.frames if f.url.endswith("rec2.html")][0]
        await app.evaluate("localStorage.clear()")
        await app.evaluate("location.reload()")
        await pg.wait_for_timeout(1800)
        app = [f for f in pg.frames if f.url.endswith("rec2.html")][0]
        await app.evaluate("document.fonts.ready")
        await app.evaluate("setSize(Math.round(innerHeight*0.34))")
        await pg.wait_for_timeout(300)
        await app.evaluate("resize(); fitTo(SPOTS,30); draw()")
        # ---- measure the sheet layout, then reset
        meas = await app.evaluate("""(()=>{openSpot('gathers');const sh=document.getElementById('sheet');sh.style.transform='translateY(0)';
          const h=document.querySelector('#sheet h2').getBoundingClientRect();
          const target=document.querySelector('.log').offsetTop-70;sh.scrollTop=target;
          const lg=document.querySelector('.log').getBoundingClientRect();
          const tv=document.getElementById('tVis').getBoundingClientRect();
          const b4=document.querySelector('#rate button[data-n="4"]').getBoundingClientRect();
          const out={h2:h.top,target:sh.scrollTop,log:[lg.top,lg.height],tv:[tv.left+tv.width/2,tv.top+tv.height/2],b4:[b4.left+b4.width/2,b4.top+b4.height/2]};
          sh.scrollTop=0;closeSheet();sh.style.transform='';return out})()""")
        V0 = await app.evaluate("({cx:V.cx,cy:V.cy,z:V.z})")
        G = await app.evaluate("(()=>{const s=SPOTS.find(x=>x.id==='gathers');return {x:s.w[0],y:s.w[1]}})()")
        print(meas, V0, file=sys.stderr)

        # ---------- in-app map camera
        A = dict(V0)
        A1 = {"cx": V0["cx"], "cy": V0["cy"] + 250, "z": V0["z"] * 1.1}
        C = {"cx": G["x"] + 20, "cy": G["y"] + 10, "z": 0.42}
        D = {"cx": G["x"] + 900, "cy": G["y"] - 1700, "z": 0.11}
        def zl(a, b, k): return math.exp(lerp(math.log(a), math.log(b), k))
        def mapcam(t):
            if t < 1.0:
                k = ease(t / 1.0); return {"cx": lerp(A["cx"], A1["cx"], k), "cy": lerp(A["cy"], A1["cy"], k), "z": zl(A["z"], A1["z"], k)}
            if t < 3.0:
                k = ease((t - 1.0) / 2.0); return {"cx": lerp(A1["cx"], C["cx"], k), "cy": lerp(A1["cy"], C["cy"], k), "z": zl(A1["z"], C["z"], k)}
            if t < 8.9: return dict(C)
            k = ease((t - 8.9) / 1.1); return {"cx": lerp(C["cx"], D["cx"], k), "cy": lerp(C["cy"], D["cy"], k), "z": zl(C["z"], D["z"], k)}

        # ---------- stage camera: (z, ox, oy)
        def place(z, fx, fy, tx, ty):  # screen css (fx,fy) -> canvas (tx,ty)
            px, py = SX + fx * S, SY + fy * S
            return (z, tx - px * z, ty - py * z)
        def center(z): return (z, 540 - 540 * z, 960 - 960 * z)
        h2y = meas["h2"] + SBAR
        logc = meas["log"][0] + SBAR + meas["log"][1] / 2
        KEYS = [(0.0, center(0.93)), (1.2, center(1.0)), (4.0, center(1.0)),
                (4.7, place(1.3, 195, h2y + 170, 540, 860)), (5.35, place(1.3, 195, h2y + 170, 540, 860)),
                (6.0, place(1.32, 195, logc, 540, 980)), (8.3, place(1.32, 195, logc, 540, 980)),
                (8.95, center(1.0)), (10.0, center(1.0))]
        def stagecam(t):
            for i in range(len(KEYS) - 1):
                (ta, a), (tb, bb) = KEYS[i], KEYS[i + 1]
                if ta <= t <= tb:
                    k = ease((t - ta) / (tb - ta))
                    return tuple(lerp(a[j], bb[j], k) for j in range(3))
            return KEYS[-1][1]

        pinpt = None
        taps = []
        done = set()
        for f in range(N):
            t = f / FPS
            mc = mapcam(t)
            js = [f"V.cx={mc['cx']};V.cy={mc['cy']};V.z={mc['z']};draw();"]
            # ---- app events
            if t >= 3.0 and pinpt is None:
                pinpt = await app.evaluate("(()=>{const r=document.querySelector('.pin[data-id=gathers] .bowl').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
                taps.append((3.25, pinpt[0], pinpt[1] + SBAR))
                taps.append((6.25, meas["tv"][0], meas["tv"][1] + SBAR))
                taps.append((6.7, meas["b4"][0], meas["b4"][1] + SBAR))
            if t >= 3.45 and "open" not in done:
                done.add("open"); js.append("openSpot('gathers');")
            if 3.45 <= t <= 3.95:
                js.append(f"document.getElementById('sheet').style.transform='translateY({(1 - eout((t - 3.45) / 0.5)) * 105}%)';")
            if 5.35 <= t <= 6.0:
                js.append(f"document.getElementById('sheet').scrollTop={meas['target'] * ease((t - 5.35) / 0.65)};")
            keep = "const _s=document.getElementById('sheet'),_st=_s.scrollTop;"
            restore = "_s.scrollTop=_st;"
            if t >= 6.3 and "vis" not in done:
                done.add("vis"); js.append(keep + "save('gathers',{visited:true,date:'2026-10-09'});" + restore)
            for n, tt in enumerate([6.75, 6.81, 6.87, 6.93], start=1):
                if t >= tt and f"r{n}" not in done:
                    done.add(f"r{n}"); js.append(keep + f"save('gathers',{{rating:{n},visited:true}});" + restore)
            if 7.15 <= t <= 8.15:
                n = int(round(len(REVIEW) * cl((t - 7.15) / 1.0)))
                js.append(f"document.getElementById('vnote').value={json.dumps(REVIEW[:n])};")
            if t >= 8.2 and "note" not in done:
                done.add("note"); js.append(f"state.log.gathers.note={json.dumps(REVIEW)};")
            if 8.5 <= t <= 8.88:
                js.append(f"document.getElementById('sheet').style.transform='translateY({ease((t - 8.5) / 0.38) * 105}%)';")
            if t > 8.88 and "close" not in done:
                done.add("close"); js.append("closeSheet();document.getElementById('sheet').style.transform='';")
            if 9.05 <= t <= 9.6:
                k = (t - 9.05) / 0.55
                sc = 1 + 0.45 * math.sin(math.pi * k) * (1 - k * 0.3)
                js.append(f"(()=>{{const b=document.querySelector('.pin[data-id=gathers] .bowl');if(b)b.style.transform='scale({sc})';b.style.transformOrigin='50% 100%'}})();")
            await app.evaluate("".join(js))
            # ---- stage
            z, ox, oy = stagecam(t)
            tl = []
            for (tt, x, y) in taps:
                dt = t - tt
                if -0.28 <= dt < 0:
                    e = eout((dt + 0.28) / 0.28)
                    tl.append({"x": x, "y": y, "s": 0.75 + 0.25 * e, "fill": 0.6 * e, "ring": 0, "ra": 0})
                elif 0 <= dt < 0.55:
                    k = dt / 0.55
                    tl.append({"x": x, "y": y, "s": 1 + 1.5 * eout(k), "fill": 0.6 * (1 - k) ** 2, "ring": 3, "ra": 0.95 * (1 - k)})
            await pg.evaluate(f"setBg({t});setCam({z},{ox},{oy});setTaps({json.dumps(tl)})")
            if f >= START:
                await pg.screenshot(path=f"{OUT}/f_{f:04d}.png")
        await b.close()

asyncio.run(main())
