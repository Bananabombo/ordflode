/* ============================================================
   Ordflöde — App-Logik
   ============================================================ */
(() => {
  'use strict';

  const VOCAB = window.VOCAB || {};
  const SESSION_SIZE = 16;

  const POS_LABEL = {
    n: 'Substantiv', v: 'Verb', adj: 'Adjektiv', adv: 'Adverb',
    num: 'Zahl', pron: 'Pronomen', prep: 'Präposition',
    konj: 'Konjunktion', phr: 'Ausdruck', interj: 'Ausruf'
  };

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const screens = {
    start: $('screen-start'),
    train: $('screen-train'),
    done:  $('screen-done'),
  };
  const els = {
    entry: $('entry'),
    card: $('card'),
    promptWord: $('prompt-word'),
    promptPos: $('prompt-pos'),
    answer: $('entry'),   // dasselbe Eingabefeld — trägt die Zustands-Klassen
    reveal: $('answer-reveal'),
    checkmark: $('checkmark'),
    progressBar: $('progress-bar'),
    counter: $('counter'),
    doneStats: $('done-stats'),
    startStat: $('start-stat'),
  };

  // ---- State ----
  let queue = [];      // remaining word objects for the session
  let current = null;  // current word
  let level = 'A1';
  let total = 0;       // words planned this session
  let done = 0;        // words completed
  let correctCount = 0;
  let requeuedOnce = new Set();
  let locked = false;  // true while resolving/animating

  // ---- Persistence ----
  const STORE = 'ordflode.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
  const save = (d) => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch {} };

  // ---- Helpers ----
  const norm = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');

  function acceptedAnswers(w) {
    const list = [w.sv];
    if (w.art) list.push(w.art + ' ' + w.sv);
    if (w.pos === 'v') list.push('att ' + w.sv);
    if (Array.isArray(w.alt)) list.push(...w.alt);
    return list.map(norm);
  }

  function canonical(w) {
    if (w.art) return w.art + ' ' + w.sv;
    if (w.pos === 'v') return 'att ' + w.sv;
    return w.sv;
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Screen transitions ----
  function show(name, instant) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    const el = screens[name];
    if (instant) {
      // Sofort sichtbar (ohne Opacity-Fade), damit iOS im selben Tap-Gesture
      // das Fokussieren zulässt und die Tastatur automatisch einblendet.
      el.style.transition = 'none';
      el.classList.add('is-active');
      void el.offsetWidth;      // Reflow erzwingen -> opacity:1 wird sofort wirksam
      el.style.transition = '';  // Übergang für spätere Wechsel wiederherstellen
    } else {
      el.classList.add('is-active');
    }
  }

  function focusEntry() {
    try { els.entry.focus({ preventScroll: true }); }
    catch (e) { els.entry.focus(); }
  }

  // ---- Start screen ----
  function refreshStart() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const lvl = el.getAttribute('data-count');
      const n = (VOCAB[lvl] || []).length;
      el.textContent = n ? n + ' Wörter' : '—';
    });
    const d = load();
    if (d.mastered) {
      els.startStat.textContent = `${d.mastered} Vokabel${d.mastered === 1 ? '' : 'n'} gemeistert`;
    } else {
      els.startStat.textContent = 'Wähle dein Niveau';
    }
  }

  // ---- Session ----
  function startSession(lvl) {
    level = lvl;
    const pool = VOCAB[lvl] || [];
    if (!pool.length) return;
    queue = shuffle(pool).slice(0, SESSION_SIZE);
    total = queue.length;
    done = 0;
    correctCount = 0;
    requeuedOnce = new Set();
    locked = false;
    // Trainingsscreen SOFORT (ohne Fade) sichtbar schalten und im selben
    // Tap-Gesture fokussieren -> iOS öffnet die Tastatur automatisch.
    els.entry.value = '';
    show('train', true);
    focusEntry();
    nextWord(true);
  }

  function updateProgress() {
    const pct = total ? Math.round((done / total) * 100) : 0;
    els.progressBar.style.width = pct + '%';
    els.counter.textContent = `${Math.min(done + 1, total)}/${total}`;
  }

  function nextWord(first) {
    if (!queue.length) return finish();
    locked = false;
    current = queue.shift();
    updateProgress();

    // reset UI
    els.answer.classList.remove('is-correct', 'shake');
    els.reveal.classList.remove('show');
    els.reveal.textContent = '';
    els.checkmark.classList.remove('play');
    els.entry.value = '';

    els.promptPos.textContent = POS_LABEL[current.pos] || '';
    els.promptWord.textContent = current.de;

    // card enter animation
    if (!first) {
      els.card.classList.remove('is-entering');
      void els.card.offsetWidth;
      els.card.classList.add('is-entering');
    }
    keepFocus();
  }

  function check() {
    if (locked) return;
    const val = norm(els.entry.value);
    if (!val) return;
    if (acceptedAnswers(current).includes(val)) resolveCorrect();
  }

  function resolveCorrect() {
    locked = true;
    correctCount++;
    done++;

    els.answer.classList.add('is-correct');
    els.checkmark.classList.add('play');
    // Auflösung nur zeigen, wenn sie etwas ergänzt (Artikel / att)
    if (canonical(current) !== current.sv) {
      els.reveal.textContent = canonical(current);
      els.reveal.classList.add('show');
    }
    updateProgress();
    buzz(12);

    // persist mastered count
    const d = load();
    d.mastered = (d.mastered || 0) + 1;
    d.lastLevel = level;
    save(d);

    setTimeout(() => {
      els.card.classList.remove('is-entering');
      els.card.classList.add('is-leaving');
      setTimeout(() => {
        els.card.classList.remove('is-leaving');
        nextWord(false);
      }, 400);
    }, 950);
  }

  function reveal() {
    if (locked) return;
    locked = true;
    done++;
    // re-queue once for reinforcement
    if (!requeuedOnce.has(current.sv)) {
      requeuedOnce.add(current.sv);
      queue.push(current);
      total++;
    }
    els.entry.value = '';
    els.reveal.textContent = canonical(current);
    els.reveal.classList.add('show');
    els.answer.classList.add('shake');
    updateProgress();
    setTimeout(() => {
      els.card.classList.add('is-leaving');
      setTimeout(() => {
        els.card.classList.remove('is-leaving');
        nextWord(false);
      }, 400);
    }, 1300);
  }

  function wrongPulse() {
    els.answer.classList.remove('shake');
    void els.answer.offsetWidth;
    els.answer.classList.add('shake');
    buzz(30);
  }

  function finish() {
    show('done');
    const pct = total ? Math.round((correctCount / total) * 100) : 0;
    els.doneStats.textContent =
      `${correctCount} von ${total} auf Anhieb richtig — ${pct}%.`;
    els.entry.blur();
  }

  // ---- Input plumbing ----
  function keepFocus() {
    if (screens.train.classList.contains('is-active') && !locked) {
      els.entry.focus({ preventScroll: true });
    }
  }
  function buzz(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch {} } }

  // ---- Events ----
  document.querySelectorAll('.level').forEach(btn => {
    btn.addEventListener('click', () => startSession(btn.dataset.level));
  });

  // Während der Auflöse-Animation Tippen blockieren, OHNE readOnly zu setzen
  // (readOnly kann auf iOS die Tastatur schließen) — so bleibt sie offen.
  els.entry.addEventListener('beforeinput', (e) => { if (locked) e.preventDefault(); });
  els.entry.addEventListener('input', check);
  els.entry.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (locked) return;
      const val = norm(els.entry.value);
      if (acceptedAnswers(current).includes(val)) resolveCorrect();
      else if (val) wrongPulse();
    }
  });

  // accent keys — insert without stealing keyboard
  document.querySelectorAll('.akey').forEach(k => {
    k.addEventListener('mousedown', e => e.preventDefault());
    k.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    k.addEventListener('click', () => {
      if (locked) return;
      els.entry.value += k.dataset.ch;
      check();
      els.entry.focus({ preventScroll: true });
    });
  });

  // tap anywhere on the card refocuses (keeps keyboard up)
  els.card.addEventListener('click', keepFocus);
  els.entry.addEventListener('blur', () => setTimeout(keepFocus, 40));

  $('btn-reveal').addEventListener('click', reveal);
  $('btn-back').addEventListener('click', () => { els.entry.blur(); show('start'); refreshStart(); });
  $('btn-menu').addEventListener('click', () => { show('start'); refreshStart(); });
  $('btn-again').addEventListener('click', () => startSession(level));

  // ---- Tastatur-bewusste Viewport-Höhe ----
  // Bindet die App-Höhe an die *sichtbare* Viewport-Höhe. Erscheint die
  // iOS-Tastatur, schrumpft der Bereich -> Vokabel & Eingabe bleiben sichtbar.
  const vv = window.visualViewport;
  function syncViewport() {
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-h', h + 'px');
  }
  if (vv) {
    vv.addEventListener('resize', syncViewport);
    vv.addEventListener('scroll', syncViewport);
  }
  window.addEventListener('resize', syncViewport);
  window.addEventListener('orientationchange', () => setTimeout(syncViewport, 250));
  // Beim Fokus (Tastatur fährt aus) mehrfach nachziehen — deckt Timing-
  // Eigenheiten der iOS-Tastatur-Animation ab.
  els.entry.addEventListener('focus', () => {
    syncViewport();
    [120, 320, 600].forEach((t) => setTimeout(syncViewport, t));
  });
  syncViewport();

  // ---- Boot ----
  refreshStart();

  // Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
