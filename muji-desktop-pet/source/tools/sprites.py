"""Pixel-art sprite generator for the Pomeranian desktop pet.

Every pose is painted from simple fluffy shapes, then auto-outlined, so all
frames share one consistent style. Sprites face RIGHT; the app mirrors them.
"""
import math
from PIL import Image

W, H = 48, 32          # native canvas per frame
GROUND = 27            # y of the lowest paw row

PAL = {
    'O': (92, 48, 28),     # outline (warm dark brown)
    'R': (168, 76, 36),    # deep red-orange (eye mask)
    'D': (196, 100, 46),   # dark orange
    'M': (222, 132, 64),   # mid orange
    'L': (238, 168, 98),   # light orange
    'C': (246, 212, 160),  # cream
    'W': (253, 240, 214),  # cream light
    'K': (44, 24, 16),     # eye
    'N': (92, 50, 40),     # nose (liver)
    'P': (232, 116, 136),  # tongue
    'p': (240, 186, 186),  # pink belly
    'b': (240, 150, 130),  # blush
    'q': (248, 162, 172),  # tongue highlight
    'H': (255, 255, 255),  # eye highlight
}


class Canvas:
    def __init__(self):
        self.g = [[None] * W for _ in range(H)]

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = c

    def get(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            return self.g[y][x]
        return None

    def fluff(self, cx, cy, rx, ry, c, spikes=0, amp=0.0, phase=0.0, only=None):
        """Filled ellipse with optional tufty edge. `only` restricts painting to
        already-filled pixels (for colour overlays)."""
        painted = set()
        for y in range(int(cy - ry - 3), int(cy + ry + 4)):
            for x in range(int(cx - rx - 3), int(cx + rx + 4)):
                dx, dy = (x - cx) / rx, (y - cy) / ry
                d = math.hypot(dx, dy)
                lim = 1.0
                if spikes:
                    th = math.atan2(dy, dx)
                    lim += amp * max(0.0, math.sin(spikes * th + phase)) ** 3
                if d <= lim:
                    if only is None or self.get(x, y) is not None:
                        self.px(x, y, c)
                        painted.add((x, y))
        return painted

    def seam(self, region, c='D', dirs=((0, 1), (1, 0))):
        """Shade the edge of `region` where it overlaps other fur."""
        hits = []
        for x, y in region:
            for dx, dy in dirs:
                n = (x + dx, y + dy)
                if n not in region and self.get(*n) not in (None, 'O'):
                    hits.append((x, y))
                    break
        for x, y in hits:
            self.px(x, y, c)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, c)

    def pts(self, c, *pts):
        for x, y in pts:
            self.px(x, y, c)

    def leg(self, xt, yt, xb, yb, c, paw='W', w=2):
        """Leg from (xt,yt) to (xb,yb), w px wide, paw on the last row."""
        n = max(1, yb - yt)
        for i in range(n + 1):
            y = yt + i
            x = xt + (xb - xt) * i / n
            for k in range(w):
                self.px(x + k, y, paw if y == yb else c)

    def fill_holes(self):
        for _ in range(2):
            fix = []
            for y in range(H):
                for x in range(W):
                    if self.g[y][x] is None:
                        nb = [self.get(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                        full = [v for v in nb if v not in (None, 'O')]
                        pinch = (nb[0] not in (None, 'O') and nb[1] not in (None, 'O')) or \
                                (nb[2] not in (None, 'O') and nb[3] not in (None, 'O'))
                        if len(full) >= 3 or pinch:
                            fix.append((x, y, max(sorted(set(full)), key=full.count)))
            for x, y, v in fix:
                self.g[y][x] = v

    def outline(self):
        self.fill_holes()
        add = []
        for y in range(H):
            for x in range(W):
                if self.g[y][x] is None:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        v = self.get(x + dx, y + dy)
                        if v is not None and v != 'O':
                            add.append((x, y))
                            break
        for x, y in add:
            self.g[y][x] = 'O'

    def rim(self, src='M', top='L', depth=1):
        """Light the top edge of orange areas (soft top-light)."""
        hits = []
        for y in range(H):
            for x in range(W):
                if self.g[y][x] == src:
                    for k in range(1, depth + 1):
                        a = self.get(x, y - k)
                        if a is None or a == 'O':
                            hits.append((x, y))
                            break
        for x, y in hits:
            self.g[y][x] = top

    def image(self):
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for y in range(H):
            for x in range(W):
                c = self.g[y][x]
                if c:
                    im.putpixel((x, y), PAL[c] + (255,))
        return im


# ---------------------------------------------------------------- parts

def head_side(c, hx, hy, ears='up', tuck=False):
    """Round side-view head facing right; (hx,hy) = skull centre."""
    if ears == 'up':   # small rounded ears sitting low in the fluff
        c.pts('D', (hx - 3, hy - 7), (hx - 4, hy - 6), (hx - 3, hy - 6), (hx - 2, hy - 6),
              (hx + 1, hy - 7), (hx, hy - 6), (hx + 1, hy - 6), (hx + 2, hy - 6))
    elif ears == 'back':  # folded back
        c.pts('D', (hx - 5, hy - 4), (hx - 4, hy - 5), (hx - 3, hy - 5), (hx - 6, hy - 4),
              (hx - 2, hy - 5))
    skull = c.fluff(hx, hy, 6.6, 6.0, 'M', spikes=9, amp=0.14, phase=0.6)
    c.fluff(hx - 1.5, hy - 3.6, 4.6, 2.4, 'D', only=True)      # deeper crown
    c.fluff(hx + 2.4, hy + 3.2, 4.8, 2.8, 'C', only=True)       # cream cheek puff
    if tuck:   # snout pointing down (resting / sniffing)
        c.fluff(hx + 5.5, hy + 2.6, 2.3, 1.7, 'C')
        c.pts('W', (hx + 5, hy + 2))
    else:
        c.fluff(hx + 6.4, hy + 1.8, 2.3, 1.7, 'C')              # short muzzle
        c.pts('W', (hx + 6, hy + 1), (hx + 7, hy + 1))
    if ears == 'up':
        c.pts('L', (hx - 3, hy - 6), (hx + 1, hy - 6))
    return skull


def face_side(c, hx, hy, mood='happy', eye='open', tuck=False):
    if tuck:
        c.pts('N', (hx + 8, hy + 2), (hx + 8, hy + 3), (hx + 7, hy + 3))
    else:
        c.pts('N', (hx + 8, hy + 1), (hx + 9, hy + 1))
    ex, ey = hx + 3, hy
    if eye == 'open':   # big, round, shiny
        c.pts('R', (ex - 1, ey - 1), (ex - 1, ey), (ex - 1, ey + 1), (ex, ey - 2), (ex + 1, ey - 2))
        c.pts('K', (ex, ey - 1), (ex + 1, ey - 1), (ex, ey), (ex + 1, ey), (ex, ey + 1), (ex + 1, ey + 1))
        c.px(ex + 1, ey - 1, 'H')
    elif eye == 'closed':
        c.pts('O', (ex - 1, ey + 1), (ex, ey + 1), (ex + 1, ey + 1))
    elif eye == 'sleep':   # soft downward arc on the cheek
        c.pts('O', (ex - 1, ey + 1), (ex, ey + 2), (ex + 1, ey + 2), (ex + 2, ey + 1))
    elif eye == 'happy':
        c.pts('O', (ex - 1, ey + 1), (ex, ey), (ex + 1, ey + 1))
    if eye in ('open', 'happy') and not tuck:
        c.pts('b', (ex - 1, ey + 3), (ex, ey + 3))                  # blush
    m = hx + 5, hy + 3
    if mood == 'happy':   # big open smile, tongue out
        x, y = hx, hy
        c.pts('O', (x + 3, y + 2), (x + 4, y + 3), (x + 5, y + 3), (x + 6, y + 3), (x + 7, y + 3),
              (x + 4, y + 4), (x + 7, y + 4), (x + 5, y + 5), (x + 6, y + 5))
        c.pts('P', (x + 5, y + 4), (x + 6, y + 4))
        c.px(x + 5, y + 4, 'q')
    elif mood == 'calm':
        c.pts('O', (m[0] + 1, m[1]), (m[0] + 2, m[1]))
    elif mood == 'half':
        c.pts('O', (m[0], m[1]), (m[0] + 1, m[1]), (m[0] + 2, m[1]), (m[0] + 3, m[1]),
              (m[0], m[1] + 1), (m[0] + 3, m[1] + 1), (m[0] + 1, m[1] + 2), (m[0] + 2, m[1] + 2))
        c.pts('P', (m[0] + 1, m[1] + 1), (m[0] + 2, m[1] + 1))
    elif mood == 'yawn':
        c.pts('O', (m[0], m[1]), (m[0] + 1, m[1]), (m[0] + 2, m[1]), (m[0] + 3, m[1]),
              (m[0] - 1, m[1] + 1), (m[0] + 3, m[1] + 1), (m[0] - 1, m[1] + 2), (m[0] + 3, m[1] + 2),
              (m[0] - 1, m[1] + 3), (m[0] + 3, m[1] + 3), (m[0], m[1] + 4), (m[0] + 1, m[1] + 4),
              (m[0] + 2, m[1] + 4))
        c.pts('K', (m[0], m[1] + 1), (m[0] + 1, m[1] + 1), (m[0] + 2, m[1] + 1),
              (m[0], m[1] + 2), (m[0] + 1, m[1] + 2), (m[0] + 2, m[1] + 2))
        c.pts('P', (m[0], m[1] + 3), (m[0] + 1, m[1] + 3), (m[0] + 2, m[1] + 3))


def tail_plume(c, tx, ty, rx=6.0, ry=4.2, phase=0.0, root=None):
    """Plume curling forward over the back. `root` = (x,y) rump point it grows from."""
    reg = set()
    if root:
        reg |= c.fluff(root[0], root[1], 2.0, 2.6, 'C', spikes=4, amp=0.2)
    reg |= c.fluff(tx, ty, rx, ry, 'C', spikes=6, amp=0.26, phase=phase)
    c.fluff(tx - 0.5, ty - 1, rx - 2.2, ry - 1.8, 'W', only=True)
    return reg


def paw_stub(c, x, y, dx, dy, n=3):
    """Short cream leg stub from (x,y) going (dx,dy) per step, cream with light paw."""
    for i in range(n):
        col = 'W' if i == n - 1 else 'C'
        c.px(x + dx * i, y + dy * i, col)
        c.px(x + dx * i + 1, y + dy * i, col)


# ---------------------------------------------------------------- poses
GROUND = 29

# per leg (far_back, far_front, near_back, near_front): (foot dx, lift)
WALK = {
    None: [(0, 0)] * 4,
    0: [(2, 0), (-2, 0), (-2, 0), (2, 0)],     # contact A
    1: [(0, 1), (0, 0), (0, 0), (0, 1)],       # pass
    2: [(-2, 0), (2, 0), (2, 0), (-2, 0)],     # contact B
    3: [(0, 0), (0, 1), (0, 1), (0, 0)],       # pass
}


def body_side(c, by, legs, wag=0):
    """Round fluffball body for standing/walking. by = body centre y."""
    fb, ff, nb, nf = legs
    top = by + 4
    c.leg(15, top, 15 + fb[0], GROUND - fb[1], 'L', paw='C')       # far legs
    c.leg(25, top, 25 + ff[0], GROUND - ff[1], 'L', paw='C')
    c.fluff(20.4, by, 8.2, 6.6, 'M', spikes=10, amp=0.12, phase=1.0)
    c.fluff(20.4, by + 5.4, 6.6, 1.8, 'C', only=True)                # belly fluff
    c.fluff(14.8, by + 3, 2.4, 2.6, 'C', spikes=5, amp=0.2)         # trousers
    c.leg(13, top + 1, 13 + nb[0], GROUND - nb[1], 'C', paw='W')   # near legs
    c.leg(23, top + 1, 23 + nf[0], GROUND - nf[1], 'C', paw='W')


def stand(phase=None, bob=0, wag=0, eye='open', mood='happy', sniff=False, nod=0):
    c = Canvas()
    by = 20 + bob
    body_side(c, by, WALK[phase], wag)
    if sniff:
        c.fluff(27, by, 6.0, 6.0, 'M', spikes=8, amp=0.1, phase=0.3)
        c.fluff(29, by + 2, 4.0, 4.0, 'C', spikes=6, amp=0.2)
        hx, hy = 31, by + 2 + nod
    else:
        c.fluff(27, by - 2, 6.4, 7.6, 'M', spikes=9, amp=0.2, phase=0.3)   # ruff
        c.fluff(30, by + 1.2, 3.4, 3.8, 'C', spikes=6, amp=0.12)
        hx, hy = 30, by - 8
    head = head_side(c, hx, hy, tuck=sniff)
    if not sniff:
        c.fluff(23, by - 8.5, 1.8, 1.8, 'M')                              # plume-head bridge
    tail = tail_plume(c, 16.5 + wag * 0.7, by - 5.6, rx=5.6, ry=4.0, phase=wag * 0.8,
                      root=(13, by - 2.5))
    c.rim('M', 'L')
    c.seam(tail, dirs=((0, 1),))
    if sniff:
        c.seam(head, c='O', dirs=((-1, 0), (0, -1), (-1, -1)))       # lowered head reads separately
    c.outline()
    face_side(c, hx, hy, mood=mood, eye=eye, tuck=sniff)
    return c


def run(phase):
    """0 stretched, 1 gathered (airborne), 2 landing."""
    c = Canvas()
    by = {0: 20, 1: 18, 2: 20}[phase]
    if phase == 0:
        c.leg(14, by + 3, 9, GROUND - 1, 'L', paw='C')
        c.leg(27, by + 3, 32, GROUND - 1, 'L', paw='C')
    c.fluff(20, by, 9.4, 5.8, 'M', spikes=10, amp=0.12)
    c.fluff(20, by + 4, 7.6, 2.0, 'C', only=True)
    if phase == 0:
        c.leg(12, by + 4, 7, GROUND, 'C', paw='W')
        c.leg(26, by + 4, 31, GROUND, 'C', paw='W')
    elif phase == 1:   # tucked: stubs angled under the body
        paw_stub(c, 15, by + 5, 1, 1, 3)
        paw_stub(c, 25, by + 5, -1, 1, 3)
    else:              # landing: front feet down, back trailing
        c.leg(23, by + 4, 24, GROUND, 'C', paw='W')
        c.leg(14, by + 4, 10, GROUND - 2, 'C', paw='W')
    c.fluff(27, by - 2, 6.0, 6.6, 'M', spikes=8, amp=0.2)
    c.fluff(29, by + 1, 3.8, 4.0, 'C')
    hx, hy = 31, by - 7
    head_side(c, hx, hy, ears='back')
    tail = tail_plume(c, 13, by - 5, rx=6.4, ry=3.8, phase=phase, root=(11, by - 2))
    c.rim('M', 'L')
    c.seam(tail, dirs=((0, 1),))
    c.outline()
    face_side(c, hx, hy, mood='happy', eye='open')
    # dust puffs behind
    if phase in (0, 2):
        c.pts('W', (3, GROUND), (4, GROUND), (4, GROUND - 1), (3, GROUND - 1), (5, GROUND))
        c.pts('C', (1, GROUND - 1), (1, GROUND - 2), (6, GROUND), (7, GROUND - 1))
    return c


def sit(eye='open', mood='happy', wag=0, tilt=0):
    c = Canvas()
    c.fluff(20, 23.5, 7.4, 5.8, 'M', spikes=9, amp=0.14)            # haunch ball
    c.fluff(20, 27, 6.4, 1.8, 'C', only=True)
    c.leg(28, 22, 28, GROUND, 'L', paw='C')                         # far front leg
    c.fluff(26, 17, 7.0, 9.0, 'M', spikes=10, amp=0.18, phase=0.3)  # big ruff
    c.fluff(28, 19.5, 4.6, 5.8, 'C', spikes=6, amp=0.2)
    c.leg(25, 23, 25, GROUND, 'C', paw='W')                         # near front leg
    c.rect(16, GROUND, 20, GROUND, 'W')                             # hind paw
    hx, hy = 29, 9 - tilt
    head_side(c, hx, hy)
    tail = tail_plume(c, 15 + wag * 0.6, 16, rx=5.4, ry=4.6, phase=wag, root=(13, 21))
    c.rim('M', 'L')
    c.seam(tail, dirs=((0, 1),))
    c.outline()
    face_side(c, hx, hy, mood=mood, eye=eye)
    return c


def sit_front(eye='open', mood='happy', ear_twitch=0, shine=True):
    """Front-facing 'looking at you' sit - the classic photo pose.
    Features are mirrored about x = cx - 0.5."""
    c = Canvas()
    cx, oy = 24, 2
    fc = cx - 0.5
    c.fluff(fc + 8.5, 20 + oy, 3.6, 3.8, 'C', spikes=5, amp=0.15)          # tail peeking
    c.fluff(fc, 21 + oy, 8.0, 6.0, 'M', spikes=10, amp=0.12)               # body
    # small rounded ears
    L = [(-1, 0), (-1, 1), (0, 1), (-1, 2), (0, 2), (1, 2), (-2, 3), (-1, 3), (0, 3), (1, 3),
         (-2, 4), (-1, 4), (0, 4), (1, 4), (2, 4)]                          # pointier ears
    for x, y in L:
        c.px(cx - 5 + x, y + oy, 'D')
        c.px(cx + 4 - x + ear_twitch, y + oy, 'D')
    c.fluff(fc, 13.5 + oy, 10.2, 6.0, 'M', spikes=12, amp=0.13, phase=0.5)  # wide cheek/neck ruff
    c.fluff(fc, 10 + oy, 7.8, 6.6, 'M', spikes=11, amp=0.16, phase=0.2)    # big round head
    c.fluff(fc, 5.5 + oy, 3.6, 1.8, 'D', only=True)                       # crown tuft
    c.fluff(fc, 19 + oy, 8.0, 6.0, 'C', spikes=11, amp=0.2, phase=1.2)    # wide bib
    c.fluff(fc, 21 + oy, 4.5, 4.0, 'W', only=True)
    c.fluff(fc, 13.6 + oy, 5.2, 3.0, 'C')                                 # cream lower face
    c.fluff(fc, 13.8 + oy, 2.4, 1.5, 'W', only=True)
    for lx in (cx - 4, cx + 2):
        c.leg(lx, 22 + oy, lx, GROUND, 'C', paw='W')
    c.pts('L', (cx - 6, 2 + oy), (cx - 5, 3 + oy), (cx + 5 + ear_twitch, 2 + oy), (cx + 4 + ear_twitch, 3 + oy))
    c.rim('M', 'L')
    c.outline()
    for ex in (cx - 5, cx + 2):            # 3x3 shiny eyes
        if eye == 'open':
            for dx in range(3):
                for dy in range(3):
                    c.px(ex + dx, 8 + dy + oy, 'K')
            if shine:
                c.px(ex + 2, 8 + oy, 'H')
            c.px(ex, 10 + oy, 'R')
        else:                              # happy closed ^ ^
            c.pts('O', (ex, 10 + oy), (ex + 1, 9 + oy), (ex + 2, 10 + oy))
    c.pts('b', (cx - 7, 12 + oy), (cx - 6, 12 + oy), (cx + 5, 12 + oy), (cx + 6, 12 + oy))
    c.pts('N', (cx - 1, 12 + oy), (cx, 12 + oy), (cx - 1, 13 + oy), (cx, 13 + oy))
    c.px(cx, 12 + oy, 'H')
    if mood == 'happy':
        c.pts('O', (cx - 4, 14 + oy), (cx + 3, 14 + oy), (cx - 3, 15 + oy), (cx + 2, 15 + oy),
              (cx - 2, 15 + oy), (cx + 1, 15 + oy),
              (cx - 2, 16 + oy), (cx + 1, 16 + oy), (cx - 1, 17 + oy), (cx, 17 + oy))
        c.pts('P', (cx - 1, 15 + oy), (cx, 15 + oy), (cx - 1, 16 + oy), (cx, 16 + oy))
        c.px(cx - 1, 15 + oy, 'q')
    else:
        c.pts('O', (cx - 2, 15 + oy), (cx - 1, 14 + oy), (cx, 14 + oy), (cx + 1, 15 + oy))
    return c


def lie(eye='open', breath=0, mood='calm'):
    """Loaf: domed back, chin resting on front paws."""
    c = Canvas()
    c.fluff(20, 23.3 - breath * 0.5, 10.0, 6.0 + breath * 0.5, 'M', spikes=11, amp=0.12)
    c.fluff(20, 28, 8.5, 1.6, 'C', only=True)
    c.fluff(11.5, 26, 3.0, 2.8, 'C')
    c.rect(34, GROUND - 1, 40, GROUND, 'C')                         # front paws
    c.pts('W', (39, GROUND - 1), (40, GROUND - 1), (39, GROUND), (40, GROUND))
    c.fluff(29, 23, 5.4, 5.6, 'M', spikes=8, amp=0.2)
    c.fluff(31, 25.5, 3.6, 2.6, 'C')
    asleep = eye != 'open'
    hx, hy = 32, 22 if asleep else 21
    head_side(c, hx, hy, ears='back' if asleep else 'up', tuck=asleep)
    tail = tail_plume(c, 13, 19.5 - breath * 0.5, rx=5.6, ry=3.6, phase=0.5, root=(10, 23))
    c.rim('M', 'L')
    c.seam(tail, dirs=((0, 1),))
    c.outline()
    face_side(c, hx, hy, mood=None if asleep else mood, eye='sleep' if asleep else eye, tuck=asleep)
    return c


def curl(breath=0):
    """Curled-up nap: domed ball, chin resting on the tail plume wrapped round the front."""
    c = Canvas()
    b = breath
    c.fluff(19, 22 - b * 0.5, 9.0, 7.0 + b * 0.5, 'M', spikes=12, amp=0.12)      # domed back
    c.fluff(12, 26, 3.0, 2.6, 'C')                                               # back paw/trousers
    hx, hy = 30, 21
    c.pts('D', (hx - 4, hy - 6), (hx - 3, hy - 6), (hx - 5, hy - 5), (hx - 4, hy - 5), (hx - 3, hy - 5),
          (hx - 2, hy - 5))                                                    # relaxed ear
    head = head_side(c, hx, hy, ears='none', tuck=True)
    c.pts('L', (hx - 4, hy - 5))
    tail = c.fluff(29, 27.6, 8.6, 2.0, 'C', spikes=8, amp=0.2, phase=0.4)       # plume round the front
    c.fluff(31, 27.2, 5.6, 1.0, 'W', only=True)
    c.rim('M', 'L')
    c.seam(head - tail, c='O', dirs=((-1, 0), (0, -1), (-1, -1)))              # head reads separately
    c.seam(tail, c='L', dirs=((0, -1),))
    c.outline()
    face_side(c, hx, hy, mood=None, eye='sleep', tuck=True)
    return c


def belly_up(breath=0):
    """On its back, paws flopped in the air (from the belly-up photos)."""
    c = Canvas()
    c.fluff(36, 26, 4.6, 3.0, 'C', spikes=6, amp=0.3)                       # tail on floor
    c.fluff(36, 25.5, 2.6, 1.4, 'W', only=True)
    c.fluff(22, 25 - breath * 0.5, 10.0, 4.6 + breath * 0.5, 'M', spikes=10, amp=0.1)
    c.fluff(23, 23 - breath, 7.0, 2.6, 'C', only=True)                      # belly
    c.fluff(24, 23 - breath, 3.0, 1.25, 'p', only=True)
    # floppy bent paws (front near head, hind near tail)
    paw_stub(c, 15, 20 - breath, -1, -1, 3)
    paw_stub(c, 18, 20 - breath, 0, -1, 3)
    paw_stub(c, 27, 20 - breath, 0, -1, 3)
    paw_stub(c, 30, 21 - breath, 1, -1, 3)
    # head lolled back on the left
    c.pts('D', (5, 18), (6, 18), (4, 19), (5, 19), (6, 19), (7, 19))        # ear flopped back
    c.fluff(8.5, 23.6, 5.4, 5.2, 'M', spikes=8, amp=0.16)
    c.fluff(8.5, 21.5, 3.6, 1.6, 'D', only=True)
    c.fluff(11, 24, 2.0, 2.6, 'C', only=True)                               # throat/ruff
    c.fluff(4.5, 27, 2.4, 1.7, 'C')                                         # muzzle down-left
    c.rim('M', 'L')
    c.outline()
    c.pts('N', (2, 27), (2, 28))
    c.pts('O', (6, 24), (7, 25), (8, 24))                                    # contented closed eye
    c.pts('P', (5, 29), (6, 29))                                             # blep
    return c


def stretch(phase=0):
    """Play bow / big stretch: rump high, forearms flat, head up. phase 1 = deeper."""
    c = Canvas()
    d = phase
    c.leg(18, 22 - d, 18, GROUND, 'L', paw='C')
    c.fluff(18, 18 - d, 6.4, 5.4, 'M', spikes=9, amp=0.12)                   # rump high
    c.fluff(25, 23 + d * 0.5, 6.0, 4.6, 'M', spikes=8, amp=0.18)             # chest low
    c.fluff(14, 20 - d, 3.2, 3.4, 'C', spikes=5, amp=0.25)
    c.leg(15, 23 - d, 15, GROUND, 'C', paw='W')
    c.fluff(27, 25.5, 4.4, 2.4, 'C')
    c.rect(28, GROUND - 1, 38 + d, GROUND, 'C')                              # forearms
    c.pts('W', (37 + d, GROUND - 1), (38 + d, GROUND - 1), (37 + d, GROUND), (38 + d, GROUND))
    hx, hy = 32, 20 + d
    head_side(c, hx, hy)
    tail = tail_plume(c, 15, 10 - d, rx=5.6, ry=4.0, phase=0.3, root=(13, 14 - d))
    c.rim('M', 'L')
    c.seam(tail, dirs=((0, 1),))
    c.outline()
    face_side(c, hx, hy, mood='yawn' if phase else 'happy', eye='happy')
    return c


# ---------------------------------------------------------------- set

def frames():
    F = {}
    F['walk'] = [stand(p, bob=-1 if p in (1, 3) else 0, wag=(p % 2)) for p in range(4)]
    F['idle'] = [stand(None), stand(None, wag=1), stand(None), stand(None, eye='closed')]
    F['sniff'] = [stand(None, sniff=True, mood=None), stand(None, sniff=True, mood=None, wag=1, nod=1)]
    F['look'] = [sit_front(), sit_front(ear_twitch=1), sit_front(), sit_front(eye='closed')]
    F['sit'] = [sit(), sit(wag=1)]
    F['yawn'] = [sit(mood='calm'), sit(mood='half', eye='happy', tilt=1),
                 sit(mood='yawn', eye='happy', tilt=2), sit(mood='half', eye='happy', tilt=1)]
    F['stretch'] = [stretch(0), stretch(1)]
    F['zoomies'] = [run(0), run(1), run(2)]
    F['lie'] = [lie(), lie(eye='closed')]
    F['sleep'] = [curl(0), curl(1)]
    F['belly'] = [belly_up(0), belly_up(1)]
    return {k: [f.image() for f in v] for k, v in F.items()}


if __name__ == '__main__':
    import os, sys
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    from PIL import ImageDraw
    F = frames()
    S = 6
    rows = list(F.items())
    cols = max(len(v) for _, v in rows)
    lab = 90
    sheet = Image.new('RGBA', (lab + cols * W * S, len(rows) * H * S), (250, 243, 230, 255))
    d = ImageDraw.Draw(sheet)
    for r, (name, fr) in enumerate(rows):
        d.text((8, r * H * S + H * S // 2 - 6), name, fill=(80, 50, 30))
        for i, im in enumerate(fr):
            big = im.resize((W * S, H * S), Image.NEAREST)
            x0, y0 = lab + i * W * S, r * H * S
            bg = (243, 233, 214, 255) if (r + i) % 2 else (250, 243, 230, 255)
            d.rectangle([x0, y0, x0 + W * S - 1, y0 + H * S - 1], fill=bg)
            sheet.alpha_composite(big, (x0, y0))
            im.save(f'{out}/{name}_{i}.png')
    sheet.save(f'{out}/sheet.png')
    print('ok', len(rows), 'rows')
