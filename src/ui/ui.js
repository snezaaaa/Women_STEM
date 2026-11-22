// HTML/CSS overlay: screens, HUD, clue & reveal cards.
const $ = (sel, root = document) => root.querySelector(sel);

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function starsText(n, max = 3) {
  return '★'.repeat(n) + '☆'.repeat(max - n);
}

export function formatTime(sec) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class UI {
  constructor(root, content, sfx) {
    this.root = root;
    this.c = content;
    this.sfx = sfx;
    this.touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    root.innerHTML = '';
    this.layer = el('div', { class: 'layer' });
    root.append(this.layer);
    this._buildHud();
  }

  // ---------- HUD ----------
  _buildHud() {
    this.hud = el('div', { class: 'hud hidden' });
    this.roomPanel = el('div', { class: 'panel room-panel' },
      el('div', { class: 'room-num' }, 'ROOM 1 OF 4'),
      el('div', { class: 'room-title' }, 'The Pioneers'));
    this.slots = el('div', { class: 'slots' });
    this.starEl = el('div', { class: 'stars' }, '★ 0 / 36');
    this.timerEl = el('div', { class: 'timer hidden' }, '0:00');
    this.muteBtn = el('button', { class: 'icon-btn', 'aria-label': 'Toggle sound', onclick: () => this.onMute && this.onMute() }, '🔊');
    this.codePanel = el('div', { class: 'panel code-panel' },
      el('div', { class: 'code-label' }, 'DOOR CODE'),
      this.slots,
      el('div', { class: 'code-row' }, this.starEl, this.timerEl, this.muteBtn));
    this.hint = el('div', { class: 'panel hint' });
    this.prompt = el('div', { class: 'prompt hidden' });
    this.hud.append(this.roomPanel, this.codePanel, this.hint, this.prompt);
    this.layer.append(this.hud);
    this.setHint();
  }

  showHud(v) { this.hud.classList.toggle('hidden', !v); }

  setRoom(index, total, title) {
    this.roomPanel.children[0].textContent = index < total ? `ROOM ${index + 1} OF ${total}` : 'FINAL ROOM';
    this.roomPanel.children[1].textContent = title;
  }

  setCode(code, collected) {
    this.slots.innerHTML = '';
    [...code].forEach((ch, i) => this.slots.append(el('div', { class: 'slot' + (collected[i] ? ' filled' : '') }, collected[i] ? ch : '')));
    this.codePanel.classList.toggle('hidden', !code);
  }

  setStars(n, max) { this.starEl.textContent = `★ ${n} / ${max}`; }

  setTimer(text) {
    this.timerEl.classList.toggle('hidden', text == null);
    if (text != null) this.timerEl.textContent = '⏱ ' + text;
  }

  setMuted(m) { this.muteBtn.textContent = m ? '🔇' : '🔊'; }

  setHint(text) {
    this.hint.classList.toggle('hidden', text != null && !text.trim());
    this.hint.innerHTML = text || (this.touch
      ? '<b>Tap the floor</b> to walk · <b>Tap a glowing case</b> to inspect'
      : '<b>WASD / arrows</b> or <b>click</b> to move · <b>Click a glowing case</b> or press <b>E</b>');
  }

  showPrompt(text) {
    this.prompt.classList.toggle('hidden', !text);
    if (text) this.prompt.textContent = text;
  }

  // ---------- screens ----------
  _screen(cls, ...children) {
    this.closeScreen();
    this.screen = el('div', { class: 'screen ' + cls }, el('div', { class: 'screen-card' }, ...children));
    this.layer.append(this.screen);
    return this.screen;
  }

  closeScreen() {
    if (this.screen) this.screen.remove();
    this.screen = null;
  }

  showIntro({ hasSave, timer, onStart, onContinue }) {
    const g = this.c.game;
    const timerBox = el('input', { type: 'checkbox', id: 'timerToggle' });
    timerBox.checked = !!timer;
    const buttons = hasSave
      ? [el('button', { class: 'btn primary', onclick: () => { this.sfx.unlock(); this.sfx.click(); onContinue(timerBox.checked); } }, g.continueButton),
         el('button', { class: 'btn ghost', onclick: () => { this.sfx.unlock(); this.sfx.click(); onStart(timerBox.checked); } }, g.newGameButton)]
      : [el('button', { class: 'btn primary', onclick: () => { this.sfx.unlock(); this.sfx.click(); onStart(timerBox.checked); } }, g.startButton)];
    this._screen('intro',
      el('div', { class: 'eyebrow' }, g.subtitle),
      el('h1', { class: 'logo' }, g.title),
      el('div', { class: 'story' }, g.intro.map((p) => el('p', {}, p))),
      el('label', { class: 'toggle' }, timerBox, el('span', {}, g.timerLabel)),
      el('div', { class: 'btn-row' }, buttons));
  }

  showCharacterSelect(chars, startIndex, onChange, onConfirm) {
    let idx = startIndex;
    const name = el('div', { class: 'char-name' });
    const tag = el('div', { class: 'char-tag' });
    const dots = el('div', { class: 'char-dots' });
    const update = () => {
      name.textContent = chars[idx].name;
      tag.textContent = chars[idx].tagline || '';
      dots.innerHTML = '';
      chars.forEach((c, i) => dots.append(el('button', {
        class: 'char-chip' + (i === idx ? ' active' : ''),
        style: `--skin:${c.skin}`,
        'aria-label': c.name,
        onclick: () => { idx = i; this.sfx.click(); update(); onChange(idx); },
      }, c.name)));
    };
    const step = (d) => { idx = (idx + d + chars.length) % chars.length; this.sfx.click(); update(); onChange(idx); };
    const s = this._screen('select',
      el('h2', {}, this.c.game.chooseTitle),
      el('div', { class: 'char-row' },
        el('button', { class: 'arrow', 'aria-label': 'Previous', onclick: () => step(-1) }, '‹'),
        el('div', { class: 'char-info' }, name, tag),
        el('button', { class: 'arrow', 'aria-label': 'Next', onclick: () => step(1) }, '›')),
      dots,
      el('button', { class: 'btn primary', onclick: () => { this.sfx.click(); this._keyHandler && window.removeEventListener('keydown', this._keyHandler); onConfirm(idx); } }, this.c.game.chooseButton));
    this._keyHandler = (e) => {
      if (!document.body.contains(s)) return window.removeEventListener('keydown', this._keyHandler);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', this._keyHandler);
    update();
  }

  // ---------- clue card ----------
  /**
   * progress: { cluesShown (1..3), wrongs: [answers] }
   * cb.onProgress(progress) – after a wrong answer
   * cb.onDone(stars) – after correct answer or after the 3rd wrong
   */
  openClue(exhibit, progress, cb) {
    this.closeCard();
    const answers = shuffle([exhibit.correct, ...exhibit.wrong]);
    const p = { cluesShown: progress?.cluesShown || 1, wrongs: progress?.wrongs ? progress.wrongs.slice() : [] };
    const clueList = el('ol', { class: 'clues' });
    const clueHead = el('div', { class: 'clue-head' });
    const grid = el('div', { class: 'answers' });
    const footer = el('div', { class: 'card-footer' });
    const card = el('div', { class: 'card clue-card', role: 'dialog', 'aria-label': 'Exhibit clue card' },
      el('button', { class: 'close', 'aria-label': 'Close', onclick: () => { this.closeCard(); cb.onClose && cb.onClose(); } }, '×'),
      el('div', { class: 'card-eyebrow' }, 'RESTORE THE NAME'),
      exhibit.context ? el('p', { class: 'context' }, exhibit.context) : null,
      el('div', { class: 'question' }, exhibit.question),
      clueHead, clueList, grid, footer);
    let finished = false;
    const renderClues = () => {
      clueHead.innerHTML = `<span>Clue <b>${p.cluesShown}</b> of 3</span> <span class="potential">${starsText(4 - p.cluesShown)}</span>`;
      clueList.innerHTML = '';
      exhibit.clues.slice(0, p.cluesShown).forEach((c, i) => clueList.append(el('li', { class: i === p.cluesShown - 1 ? 'new' : '' }, c)));
    };
    const buttons = answers.map((a) => {
      const b = el('button', { class: 'answer', onclick: () => choose(a, b) }, a);
      if (p.wrongs.includes(a)) { b.disabled = true; b.classList.add('wrong'); }
      grid.append(b);
      return b;
    });
    const choose = (a, b) => {
      if (finished) return;
      if (a === exhibit.correct) {
        finished = true;
        b.classList.add('right');
        buttons.forEach((x) => (x.disabled = true));
        this.sfx.correct();
        const stars = 4 - p.cluesShown;
        setTimeout(() => cb.onDone(stars, b), 650);
        return;
      }
      this.sfx.wrong();
      b.disabled = true;
      b.classList.add('wrong');
      p.wrongs.push(a);
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      if (p.cluesShown < 3) {
        p.cluesShown++;
        renderClues();
        cb.onProgress && cb.onProgress(p);
      } else {
        // no more clues: show the answer, 0 stars, carry on
        finished = true;
        buttons.forEach((x) => { x.disabled = true; if (x.textContent === exhibit.correct) x.classList.add('reveal-right'); });
        footer.append(
          el('p', { class: 'nostar' }, 'No stars this time. Here is the answer!'),
          el('button', { class: 'btn primary small', onclick: () => cb.onDone(0, buttons.find((x) => x.textContent === exhibit.correct)) }, 'Continue'));
        cb.onProgress && cb.onProgress({ ...p, cluesShown: 3, exhausted: true });
      }
    };
    renderClues();
    this._showInOverlay(card, exhibit);
    return card;
  }

  /** Full-screen reading view: a window onto the zoomed-in exhibit + a large text panel. */
  _showInOverlay(card, exhibit) {
    const overlay = el('div', { class: 'inspect-overlay' },
      el('div', { class: 'inspect-view', 'aria-hidden': 'true' },
        el('div', { class: 'inspect-caption' }, el('span', {}, 'EXHIBIT'), el('b', {}, exhibit.solvedLabel || 'Look closely: what does it show?'))),
      el('div', { class: 'inspect-panel' }, card));
    this.card = overlay;
    this.layer.append(overlay);
    requestAnimationFrame(() => { overlay.classList.add('in'); card.classList.add('in'); });
  }

  closeCard() {
    if (this.card) this.card.remove();
    this.card = null;
  }

  showReveal(exhibit, stars, letter, onClose, buttonLabel) {
    this.closeCard();
    const letterEl = el('div', { class: 'big-letter' }, letter);
    const sil = el('canvas', { class: 'reveal-sil', width: 220, height: 180 });
    const card = el('div', { class: 'card reveal-card', role: 'dialog' },
      el('div', { class: 'reveal-top' }, sil, letterEl),
      el('div', { class: 'card-eyebrow' }, 'NAME RESTORED'),
      el('h3', { class: 'reveal-name' }, exhibit.name),
      el('div', { class: 'reveal-stars', 'aria-label': `${stars} of 3 stars` }, starsText(stars)),
      el('p', { class: 'reveal-text' }, exhibit.reveal),
      el('button', { class: 'btn primary', onclick: () => { onClose(letterEl); } }, buttonLabel || 'Collect the letter ' + letter));
    this._showInOverlay(card, { solvedLabel: exhibit.name });
    return { card, letterEl, sil };
  }

  flyLetter(letter, fromEl, slotIndex, done) {
    const slot = this.slots.children[slotIndex];
    const a = fromEl.getBoundingClientRect();
    const b = slot ? slot.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20, width: 40, height: 40 };
    const f = el('div', { class: 'flying-letter' }, letter);
    f.style.left = a.left + a.width / 2 + 'px';
    f.style.top = a.top + a.height / 2 + 'px';
    this.layer.append(f);
    this.closeCard();
    requestAnimationFrame(() => {
      f.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(0.55)`;
    });
    setTimeout(() => { f.remove(); done && done(); }, 900);
  }

  toast(text, ms = 2600) {
    const t = el('div', { class: 'toast' }, text);
    this.layer.append(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, ms);
  }

  showFinaleMessage(text, tagline) {
    const m = el('div', { class: 'finale-msg' }, el('div', { class: 'gold-big' }, text), el('p', {}, tagline));
    this.layer.append(m);
    requestAnimationFrame(() => m.classList.add('in'));
    this.finaleMsg = m;
  }

  hideFinaleMessage() { if (this.finaleMsg) this.finaleMsg.remove(); this.finaleMsg = null; }

  showSummary({ stars, max, time, list, onPlayAgain }) {
    const g = this.c.game;
    this._screen('summary',
      el('div', { class: 'eyebrow' }, g.finalMessage),
      el('h2', {}, g.summaryTitle),
      el('div', { class: 'sum-stats' },
        el('div', { class: 'stat' }, el('div', { class: 'stat-v' }, `★ ${stars} / ${max}`), el('div', { class: 'stat-l' }, 'stars')),
        el('div', { class: 'stat' }, el('div', { class: 'stat-v' }, formatTime(time)), el('div', { class: 'stat-l' }, 'time'))),
      el('ol', { class: 'sum-list' }, list.map((x) => el('li', {}, el('span', { class: 'sum-letter' }, x.letter), el('span', { class: 'sum-name' }, x.name), el('span', { class: 'sum-stars' }, starsText(x.stars))))),
      el('button', { class: 'btn primary', onclick: () => { this.sfx.click(); onPlayAgain(); } }, g.playAgainButton));
  }
}
