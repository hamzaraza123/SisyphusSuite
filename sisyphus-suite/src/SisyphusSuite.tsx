import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════════════════ */
const CANVAS_W = 640;
const CANVAS_H = 400;
const CEIL_Y   = 20;
const FLOOR_Y  = CANVAS_H - 20;
const BIRD_SZ  = 24;
const GRAVITY  = 0.45;
const FLAP_VY  = -9;
const BTN_W    = 200;
const BTN_H    = 52;

/* ════════════════════════════════════════════════════════════════════════════
   AUDIO  (Web Audio API – no external assets)
   ════════════════════════════════════════════════════════════════════════════ */
function getCtx(): AudioContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  return new Ctor() as AudioContext;
}

function playLaugh(): void {
  try {
    const ctx = getCtx();
    // Four "HA" bursts – rapid alternating sawtooth tones
    [0, 0.28, 0.56, 0.84].forEach(burst => {
      for (let i = 0; i < 7; i++) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type          = 'sawtooth';
        osc.frequency.value = i % 2 === 0 ? 880 : 622;
        const t = ctx.currentTime + burst + i * 0.027;
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.024);
        osc.start(t);
        osc.stop(t + 0.024);
      }
    });
  } catch { /* Safari private / blocked */ }
}

function playFail(): void {
  try {
    const ctx = getCtx();
    // Classic descending "wah-wah-wah-waaah" trombone
    [466.16, 415.30, 369.99, 311.13].forEach((hz, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type          = 'sawtooth';
      osc.frequency.value = hz;
      const t = ctx.currentTime + i * 0.31;
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.29);
      osc.start(t);
      osc.stop(t + 0.29);
    });
  } catch { /* noop */ }
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
type Stage = 0 | 1 | 2 | 3 | 4 | 5;

const SisyphusSuite: React.FC = () => {

  /* ── Shared ────────────────────────────────────────────────────────────── */
  const [stage,      setStage     ] = useState<Stage>(0);
  const [clicks,     setClicks    ] = useState(0);
  const startTs = useRef<number | null>(null);
  const tap = useCallback(() => setClicks(c => c + 1), []);

  /* ── Stage 1 ───────────────────────────────────────────────────────────── */
  const [sliderVal, setSliderVal] = useState(0);

  /* ── Stage 2 ───────────────────────────────────────────────────────────── */
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [misses, setMisses] = useState(0);

  /* ── Stage 3 ───────────────────────────────────────────────────────────── */
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cdDisplay,   setCdDisplay  ] = useState(5);
  const [hasStarted,  setHasStarted ] = useState(false);
  const [hasFailed,   setHasFailed  ] = useState(false);

  /* ── Stage 4 ───────────────────────────────────────────────────────────── */
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const [nameInput, setNameInput] = useState('');

  /* ── Stage 5 ───────────────────────────────────────────────────────────── */
  const [savedName,  setSavedName ] = useState('');
  const [finalTime,  setFinalTime ] = useState({ m: 0, s: 0 });
  const [finalClicks,setFinalClicks] = useState(0);

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 0 — Landing
     ════════════════════════════════════════════════════════════════════════ */
  const handleBegin = (): void => {
    tap();
    startTs.current = Date.now();
    setStage(1);
  };

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 1 — Slider
     ════════════════════════════════════════════════════════════════════════ */
  const handleSliderRelease = (): void => {
    if (sliderVal === 50) {
      setStage(2);
    } else {
      playLaugh();
      setSliderVal(0);
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 2 — Evasive Button
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (stage !== 2) return;
    setMisses(0);
    setBtnPos({
      x: (window.innerWidth  - BTN_W) / 2,
      y: (window.innerHeight - BTN_H) / 2,
    });
    const onResize = () =>
      setBtnPos(p => ({
        x: Math.min(p.x, window.innerWidth  - BTN_W - 16),
        y: Math.min(p.y, window.innerHeight - BTN_H - 16),
      }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [stage]);

  const evadeButton = useCallback((): void => {
    const m = 16;
    setBtnPos({
      x: m + Math.random() * (window.innerWidth  - BTN_W - m * 2),
      y: m + Math.random() * (window.innerHeight - BTN_H - m * 2),
    });
    setMisses(c => c + 1);
  }, []);

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 3 — Invisible Flappy Bird
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (stage !== 3) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Local mutable state for this effect instance — safe across async callbacks
    const game = { started: false, failing: false, countdown: 5, alive: true };
    const bird = { y: CANVAS_H / 2, vy: 0, vis: true };

    setCdDisplay(5);
    setHasStarted(false);
    setHasFailed(false);

    /* ── Flap logic ── */
    const flap = (): void => {
      if (!game.alive || game.failing) return;
      tap();

      if (!game.started) {
        game.started   = true;
        game.countdown = 5;
        bird.vis       = false;          // 💀 Invisible the instant they press Space
        setHasStarted(true);
        setCdDisplay(5);

        intervalRef.current = setInterval(() => {
          game.countdown -= 1;
          setCdDisplay(game.countdown);
          if (game.countdown <= 0) {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            if (game.alive) setStage(4); // ✅ Success — advance
          }
        }, 1000);
      }
      bird.vy = FLAP_VY;
    };

    /* ── Input handlers ── */
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Space') { e.preventDefault(); flap(); }
    };
    const onCanvasTap = (): void => flap();
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onCanvasTap);

    /* ── Draw ── */
    const drawFrame = (): void => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // ceiling + floor zones
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, CANVAS_W, CEIL_Y);
      ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);
      // boundary lines
      ctx.strokeStyle = '#374151';
      ctx.lineWidth   = 2;
      ctx.beginPath(); ctx.moveTo(0, CEIL_Y);  ctx.lineTo(CANVAS_W, CEIL_Y);  ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(CANVAS_W, FLOOR_Y); ctx.stroke();
      // bird (only if visible)
      if (bird.vis) {
        ctx.fillStyle = '#FCD34D';
        ctx.fillRect(80, bird.y, BIRD_SZ, BIRD_SZ);
      }
    };

    /* ── RAF loop ── */
    const loop = (): void => {
      if (!game.alive) return;

      if (game.started && !game.failing) {
        bird.vy += GRAVITY;
        bird.y  += bird.vy;

        const hitCeil  = bird.y <= CEIL_Y;
        const hitFloor = bird.y + BIRD_SZ >= FLOOR_Y;

        if (hitCeil || hitFloor) {
          game.failing = true;
          setHasFailed(true);
          playFail();
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

          setTimeout(() => {
            if (!game.alive) return;     // Effect already cleaned up — abort
            bird.y = CANVAS_H / 2; bird.vy = 0; bird.vis = true;
            game.started = false; game.failing = false; game.countdown = 5;
            setCdDisplay(5); setHasStarted(false); setHasFailed(false);
          }, 2500);
        }
      }

      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    /* ── Cleanup ── */
    return (): void => {
      game.alive = false;
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', onCanvasTap);
      if (rafRef.current)      { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (intervalRef.current) { clearInterval(intervalRef.current);   intervalRef.current = null; }
    };
  }, [stage, tap]);

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 4 — Confetti
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (stage !== 4) return;

    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = (): void => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#FCD34D','#F87171','#34D399','#60A5FA','#A78BFA','#F472B6','#FB923C','#38BDF8'];
    const particles = Array.from({ length: 200 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight - window.innerHeight,
      vx: (Math.random() - 0.5) * 3.5,
      vy: Math.random() * 3 + 1.5,
      w:  Math.random() * 12 + 4,
      h:  Math.random() * 6  + 3,
      r:  Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.13,
      c:  COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let alive = true;
    let raf: number;
    const loop = (): void => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.r += p.rv;
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return (): void => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [stage]);

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 4 → 5  Submit handler
     ════════════════════════════════════════════════════════════════════════ */
  const handleSubmit = (): void => {
    tap();
    const name    = nameInput.trim() || 'Anonymous';
    const elapsed = startTs.current ? Math.floor((Date.now() - startTs.current) / 1000) : 0;
    // Capture values before React batches the setStage re-render
    setSavedName(name);
    setFinalTime({ m: Math.floor(elapsed / 60), s: elapsed % 60 });
    setFinalClicks(clicks + 1); // +1 for this click (tap() is async)
    setStage(5);
  };

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */

  /* ── Stage 0: The Landing Page ─────────────────────────────────────────── */
  if (stage === 0) return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 540, padding: '0 24px' }}>
        <p style={{
          letterSpacing: '0.45em', textTransform: 'uppercase',
          color: '#9ca3af', fontSize: '0.68rem',
          marginBottom: '2rem', fontFamily: 'Georgia, serif',
        }}>
          A Gloriously Useless Experience
        </p>
        <h1 style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '2.5rem', fontWeight: 300,
          letterSpacing: '0.18em', color: '#111827',
          margin: '0 0 1.5rem',
        }}>
          The Sisyphus Suite
        </h1>
        <div style={{ width: 48, height: 1, background: '#e5e7eb', margin: '0 auto 2.5rem' }} />
        <p style={{
          fontFamily: 'Georgia, serif', color: '#6b7280',
          fontSize: '1rem', lineHeight: 1.9, margin: '0 0 3.5rem',
        }}>
          Embark on a journey of focus, precision, and ultimate reward.<br />
          Do you have what it takes to conquer the challenges ahead?<br />
          Press Begin.
        </p>
        <button
          onClick={handleBegin}
          style={{
            padding: '1rem 4.5rem', background: 'transparent',
            border: '1px solid #d1d5db', color: '#4b5563',
            letterSpacing: '0.35em', fontSize: '0.78rem',
            textTransform: 'uppercase', fontFamily: 'Georgia, serif',
            cursor: 'pointer', transition: 'all 0.25s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          Begin
        </button>
      </div>
    </div>
  );

  /* ── Stage 1: The Unforgiving Slider ───────────────────────────────────── */
  if (stage === 1) return (
    <div style={{
      minHeight: '100vh', background: '#d1d5db',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '2.5rem', padding: '0 24px',
    }}>
      <p style={{ color: '#374151', fontSize: '1.1rem', textAlign: 'center', lineHeight: 1.9, margin: 0 }}>
        To proceed, calibrate your focus.<br />
        Set the slider to exactly{' '}
        <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827', background: '#e5e7eb', padding: '2px 6px', borderRadius: 4 }}>
          50.00
        </code>.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: 300 }}>
        <span style={{
          fontFamily: 'monospace', fontSize: '3.75rem',
          fontWeight: 700, color: '#111827',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.1s',
          color: sliderVal === 50 ? '#16a34a' : '#111827',
        }}>
          {sliderVal.toFixed(2)}
        </span>
        <input
          type="range"
          min="0" max="100" step="0.01"
          value={sliderVal}
          onChange={e => setSliderVal(parseFloat(e.target.value))}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          style={{ width: '100%', cursor: 'ew-resize', accentColor: '#111827' }}
        />
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
          Release the slider to submit your answer.
        </p>
      </div>
    </div>
  );

  /* ── Stage 2: The Evasive Button ───────────────────────────────────────── */
  if (stage === 2) return (
    <div style={{ minHeight: '100vh', background: '#FCD34D', position: 'relative', overflow: 'hidden' }}>
      <button
        style={{
          position: 'fixed',
          left: btnPos.x, top: btnPos.y,
          width: BTN_W, height: BTN_H,
          background: '#DC2626', color: '#ffffff',
          border: 'none', borderRadius: 6,
          fontSize: 15, fontWeight: 700,
          cursor: 'pointer', zIndex: 10,
          letterSpacing: '0.03em',
          userSelect: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={evadeButton}
        onClick={() => { tap(); setStage(3); }}
      >
        Confirm Calibration
      </button>
      <p style={{
        position: 'fixed', bottom: 28,
        left: 0, right: 0, textAlign: 'center',
        fontFamily: 'monospace', color: '#92400e', fontSize: 16, margin: 0,
      }}>
        Failed attempts: {misses}
      </p>
    </div>
  );

  /* ── Stage 3: Invisible Flappy Bird ────────────────────────────────────── */
  if (stage === 3) return (
    <div style={{
      minHeight: '100vh', background: '#000000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1.25rem', padding: '0 16px',
    }}>
      <p style={{ color: '#f3f4f6', fontSize: '1rem', textAlign: 'center', margin: 0 }}>
        Survive{' '}
        <span style={{ color: '#FCD34D', fontWeight: 700 }}>5 seconds</span>
        {' '}to unlock your reward.{' '}
        Press{' '}
        <kbd style={{
          background: '#1f2937', color: '#e5e7eb',
          padding: '2px 8px', borderRadius: 4,
          border: '1px solid #374151', fontSize: '0.85rem',
        }}>
          Space
        </kbd>
        {' '}to flap.
      </p>

      <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hasFailed ? (
          <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>
            FAILED. RESTARTING LEAP.
          </p>
        ) : hasStarted ? (
          <p style={{ color: '#FCD34D', fontFamily: 'monospace', fontSize: '1.2rem', margin: 0 }}>
            {cdDisplay}s remaining
          </p>
        ) : (
          <p style={{ color: '#4b5563', fontSize: '0.875rem', margin: 0 }}>
            Click the canvas or press Space to begin
          </p>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        tabIndex={0}
        style={{
          border: '1px solid #1f2937',
          maxWidth: '100%',
          cursor: 'pointer',
          outline: 'none',
          display: 'block',
        }}
      />
    </div>
  );

  /* ── Stage 4: The Fake Leaderboard ─────────────────────────────────────── */
  if (stage === 4) return (
    <div style={{
      minHeight: '100vh', background: '#fffbeb',
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Confetti canvas */}
      <canvas
        ref={confettiRef}
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* Trophy box */}
      <div style={{
        position: 'relative', zIndex: 10,
        background: '#FCD34D',
        border: '4px solid #F59E0B',
        borderRadius: 20,
        padding: '3rem 2.5rem',
        maxWidth: 440, width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: '0.5rem' }}>🏆</div>
        <h1 style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: '2.5rem', fontWeight: 900,
          color: '#78350f', margin: '0 0 0.25rem',
        }}>
          YOU WIN!
        </h1>
        <p style={{
          color: '#92400e', fontSize: '1.1rem',
          fontWeight: 600, margin: '0 0 2rem',
        }}>
          Phenomenal performance.
        </p>
        <input
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter username for Global Leaderboard"
          style={{
            width: '100%', padding: '0.75rem 1rem',
            boxSizing: 'border-box',
            border: '2px solid #F59E0B', borderRadius: 8,
            fontSize: '0.9rem', textAlign: 'center',
            background: '#fef9c3', color: '#374151',
            outline: 'none', marginBottom: '0.75rem',
            display: 'block',
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '0.9rem',
            background: '#78350f', color: '#fef3c7',
            border: 'none', borderRadius: 8,
            fontSize: '1.05rem', fontWeight: 900,
            cursor: 'pointer', letterSpacing: '0.05em',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#92400e'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#78350f'; }}
        >
          Submit to Global Leaderboard
        </button>
      </div>
    </div>
  );

  /* ── Stage 5: The Ultimate Betrayal ────────────────────────────────────── */
  if (stage === 5) return (
    <div style={{
      minHeight: '100vh', background: '#ffffff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{
        fontFamily: 'Times New Roman, Times, serif',
        fontSize: '12pt',
        textAlign: 'center',
        color: '#000000',
        maxWidth: 480,
        lineHeight: 2,
        padding: '0 24px',
        margin: 0,
      }}>
        You spent {finalTime.m} minutes and {finalTime.s} seconds doing this.{' '}
        You clicked {finalClicks} times.{' '}
        The prize was the realization of your own stubbornness.{' '}
        There is no database.{' '}
        {savedName} was not saved.{' '}
        Please close the tab.
      </p>
    </div>
  );

  return null;
};

export default SisyphusSuite;
