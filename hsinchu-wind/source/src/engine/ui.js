// On-screen UI: title screen with the line map, station-board chapter cards,
// objective, interact prompt, subtitles, keepsake toast, settings, credits.
import { UI, LINE, KEEPSAKES } from '../story/strings.js';
import { settings, setSetting } from './settings.js';

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class GameUI {
  constructor(root) {
    this.root = root;
    this.subQueue = [];
    this.subTimer = null;

    this.hud = h('div', 'hud');
    this.obj = h('div', 'hud-obj');
    this.cross = h('div', 'crosshair');
    this.prompt = h('div', 'prompt'); this.prompt.hidden = true;
    this.sub = h('div', 'subtitle'); this.sub.style.opacity = 0;
    this.toast = h('div', 'toast'); this.toast.hidden = true;
    this.gear = h('button', 'ghost hud-gear', 'Pause');
    this.gear.type = 'button';
    this.gear.addEventListener('click', () => this.onPause && this.onPause());
    this.wp = h('div', 'waypoint', `<span class="dial" aria-hidden="true"><svg class="arrow" viewBox="0 0 32 32" width="30" height="30">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
      <path d="M16 5 L23 13.5 L18.6 13.5 L18.6 26 L13.4 26 L13.4 13.5 L9 13.5 Z" fill="currentColor"/>
    </svg></span><span class="dist"></span>`);
    this.wp.hidden = true;
    this.wpArrow = this.wp.querySelector('.arrow'); this.wpDist = this.wp.querySelector('.dist');
    this.left = h('div', 'hud-left'); this.left.append(this.obj, this.wp);
    this.hud.append(this.left, this.cross, this.prompt, this.sub, this.toast, this.gear);
    this.hud.hidden = true;

    this.fadeEl = h('div', 'fade');
    this.overlay = h('div', 'layer veil');
    root.append(this.hud, this.fadeEl, this.overlay);
  }

  // ---------- screens ----------
  showTitle({ onStart, onChapter, resume = false, onRestart }) {
    this.overlay.hidden = false;
    this.overlay.innerHTML = '';
    const wrap = h('div', 'title');
    wrap.append(
      h('p', 'eyebrow', esc(UI.titleZh)),
      h('h1', '', esc(UI.title)),
      h('p', 'sub', esc(UI.subtitle)),
    );
    const map = h('div', 'linemap');
    map.setAttribute('role', 'list');
    LINE.forEach((c, i) => {
      const open = i <= settings.reached;
      const s = h('button', 'stop' + (open ? ' open' : ''));
      s.type = 'button';
      s.disabled = !open || !onChapter;
      s.setAttribute('aria-label', `${c.name}, ${c.years}${open ? '' : ' (locked)'}`);
      s.append(h('span', 'dot'), h('span', 'nm', esc(c.name)), h('span', 'yr', esc(c.years)));
      if (open && onChapter) s.addEventListener('click', () => onChapter(i));
      map.append(s);
    });
    wrap.append(map);

    const row = h('div', 'row');
    const go = h('button', 'btn', esc(resume ? UI.resume : UI.start));
    go.id = 'btn-start'; go.type = 'button';
    go.addEventListener('click', onStart);
    row.append(go);
    if (resume && onRestart) {
      const rs = h('button', 'ghost', esc(UI.restart)); rs.type = 'button';
      rs.addEventListener('click', onRestart);
      row.append(rs);
    }
    const set = h('button', 'ghost', esc(UI.settings));
    set.id = 'btn-settings'; set.type = 'button';
    set.addEventListener('click', () => this.showSettings(() => this.showTitle({ onStart, onChapter, resume, onRestart })));
    row.append(set);
    wrap.append(row, h('p', 'hint', esc(UI.controls)));
    if (settings.reached > 0 && onChapter) wrap.append(h('p', 'hint dim', esc(UI.chooseChapter)));
    this.overlay.append(wrap);
    setTimeout(() => go.focus(), 0);
  }

  showSettings(onClose) {
    this.overlay.hidden = false;
    this.overlay.innerHTML = '';
    const P = UI.settingsPanel;
    const panel = h('div', 'panel');
    panel.append(h('h2', '', esc(UI.settings)));
    const field = (id, name, control) => {
      const f = h('div', 'field');
      const l = h('label', '', esc(name)); l.htmlFor = id;
      control.id = id;
      f.append(l, control);
      panel.append(f);
    };
    const range = (min, max, step, val, key) => {
      const r = h('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
      r.addEventListener('input', () => setSetting(key, parseFloat(r.value)));
      return r;
    };
    field('set-sens', P.sensitivity, range(0.3, 2, 0.05, settings.sensitivity, 'sensitivity'));
    field('set-vol', P.volume, range(0, 1, 0.05, settings.volume, 'volume'));
    field('set-music', P.music, range(0, 1, 0.05, settings.music ?? 0.6, 'music'));
    const q = h('select');
    [['high', P.high], ['low', P.low]].forEach(([v, t]) => { const o = h('option', '', esc(t)); o.value = v; q.append(o); });
    q.value = settings.quality;
    q.addEventListener('change', () => setSetting('quality', q.value));
    field('set-quality', P.quality, q);
    const done = h('button', 'btn', esc(P.close)); done.type = 'button';
    done.addEventListener('click', onClose);
    panel.append(done);
    this.overlay.append(panel);
  }

  showNotice(onAnyway) {
    this.overlay.hidden = false;
    this.overlay.innerHTML = '';
    const n = UI.notice;
    const box = h('div', 'notice');
    box.append(h('h2', '', esc(n.title)), h('p', '', esc(n.body)));
    const btn = h('button', 'ghost', esc(n.anyway)); btn.type = 'button';
    btn.addEventListener('click', onAnyway);
    box.append(btn);
    this.overlay.append(box);
  }

  // Station name board used as the chapter card.
  showBoard(b, { button, onClose, extra, keepsake } = {}) {
    this.overlay.hidden = false;
    this.overlay.innerHTML = '';
    const col = h('div', 'title');
    const board = h('div', 'board');
    board.innerHTML = `
      <div class="name"><div class="en">${esc(b.name)}</div><div class="zh" lang="zh-Hant">${esc(b.zh)}</div></div>
      <div class="band">
        <span class="prev">← ${esc(b.prev)}</span>
        <span class="mid">${esc(extra || b.line || '')}</span>
        <span class="next">${esc(b.next)} →</span>
      </div>
      <div class="caption">${esc(b.caption)}</div>`;
    col.append(board);
    if (keepsake && KEEPSAKES[keepsake]) {
      col.append(h('p', 'kept', `<span class="k">${esc(UI.keepsake)}</span> ${esc(KEEPSAKES[keepsake].name)}`));
    }
    if (onClose) {
      const btn = h('button', 'btn', esc(button || UI.go)); btn.type = 'button';
      btn.addEventListener('click', onClose);
      col.append(btn);
      setTimeout(() => btn.focus(), 0);
    }
    this.overlay.append(col);
  }

  showCredits(lines, found, onReplay) {
    this.overlay.hidden = false;
    this.overlay.innerHTML = '';
    const wrap = h('div', 'title credits');
    wrap.append(h('p', 'eyebrow', esc(UI.titleZh)), h('h1', '', esc(lines[0])), h('p', 'sub', esc(lines[1])));
    const map = h('div', 'linemap');
    LINE.forEach((c) => {
      const s = h('div', 'stop open');
      s.append(h('span', 'dot'), h('span', 'nm', esc(c.name)), h('span', 'yr', esc(c.years)));
      map.append(s);
    });
    wrap.append(map);
    const kept = Object.keys(KEEPSAKES).filter((k) => found.includes(k)).map((k) => KEEPSAKES[k].name);
    if (kept.length) wrap.append(h('p', 'hint', `Kept: ${kept.map(esc).join(' · ')}`));
    const btn = h('button', 'btn', esc(UI.replay)); btn.type = 'button';
    btn.addEventListener('click', onReplay);
    wrap.append(btn);
    this.overlay.append(wrap);
  }

  hideOverlay() { this.overlay.hidden = true; this.overlay.innerHTML = ''; }

  // ---------- HUD ----------
  showHud(v) { this.hud.hidden = !v; }

  setObjective(text) {
    this.objective = text;
    this.obj.innerHTML = text ? `<span class="k">${esc(UI.objective)}</span>${esc(text)}` : '';
    this.obj.hidden = !text;
    this.obj.classList.remove('pulse'); void this.obj.offsetWidth; this.obj.classList.add('pulse');
  }

  // dist in meters, rel = angle of the goal relative to where you face (radians, + = left)
  setWaypoint(dist, rel = 0) {
    if (dist == null) { this.wp.hidden = true; return; }
    this.wp.hidden = false;
    // keep the angle continuous so the arrow never spins the long way round
    const target = (-rel * 180) / Math.PI;
    const cur = this.wpAngle ?? target;
    const delta = ((target - cur + 540) % 360) - 180;
    this.wpAngle = cur + delta;
    this.wpArrow.style.transform = `rotate(${this.wpAngle}deg)`;
    const txt = dist < 6 ? 'Here' : dist < 1000 ? `${Math.round(dist / 5) * 5} m` : `${(dist / 1000).toFixed(1)} km`;
    if (txt !== this.wpText) { this.wpText = txt; this.wpDist.textContent = txt; }
  }

  setPrompt(text) {
    if (!text) { if (!this.prompt.hidden) this.prompt.hidden = true; return; }
    if (this.prompt.hidden || this.promptText !== text) {
      this.prompt.hidden = false;
      this.promptText = text;
      this.prompt.innerHTML = `<kbd>E</kbd>${esc(text)}`;
    }
  }

  toastKeepsake(id) {
    const k = KEEPSAKES[id];
    if (!k) return;
    this.toast.innerHTML = `<span class="k">${esc(UI.keepsake)}</span>${esc(k.name)}`;
    this.toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast.hidden = true; }, 4200);
  }

  // Queue subtitle lines; each stays up long enough to read.
  say(lines, { interrupt = false } = {}) {
    if (!lines || !lines.length) return;
    if (interrupt) { this.subQueue = []; clearTimeout(this.subTimer); this.subTimer = null; }
    this.subQueue.push(...lines);
    if (!this.subTimer) this.nextLine();
  }
  clearSubs() { this.subQueue = []; clearTimeout(this.subTimer); this.subTimer = null; this.sub.style.opacity = 0; }
  nextLine() {
    const line = this.subQueue.shift();
    if (line == null) { this.sub.style.opacity = 0; this.subTimer = null; return; }
    this.sub.innerHTML = `<div class="line">${esc(line)}</div>`;
    this.sub.style.opacity = 1;
    const ms = Math.max(2600, 900 + line.length * 55);
    this.subTimer = setTimeout(() => this.nextLine(), ms);
  }

  fade(toBlack, ms = 1400) {
    this.fadeEl.style.transition = `opacity ${ms}ms ease`;
    this.fadeEl.style.opacity = toBlack ? 1 : 0;
    return new Promise((r) => setTimeout(r, ms + 50));
  }

  // Quick dip to black and back, for hard cuts inside cutscenes.
  dip(ms = 450) {
    this.fade(true, ms).then(() => setTimeout(() => this.fade(false, ms), 120));
  }

  // Cutscene mode: letterbox bars, HUD hidden (subtitles stay), skip hint.
  cinema(on) {
    if (!this.bars) {
      this.bars = h('div', 'letterbox', '<i></i><i></i><span class="skip">Space · skip</span>');
      this.root.insertBefore(this.bars, this.fadeEl);
    }
    this.bars.classList.toggle('on', on);
    this.hud.classList.toggle('cinema', on);
  }
}
