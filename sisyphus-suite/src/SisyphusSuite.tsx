import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ════════════════════════════════════════════════════════════════════════════
   ASSET CONFIGURATION
   ════════════════════════════════════════════════════════════════════════════ */
const AUDIO_DIR = '/assets/audio'; // Configure this to your audio folder path
const IMAGE_DIR = '/assets/images'; // Configure this to your images folder path

const FAIL_AUDIO = `${AUDIO_DIR}/fail.mp3`;                 // Stage 1 Reset Audio
const LAUGH_AUDIO = `${AUDIO_DIR}/laugh.mp3`;               // Stage 1 Reset Voice Laugh Audio
const EVASIVE_INTERVAL_AUDIO = `${AUDIO_DIR}/interval.mp3`;   // Stage 2 Interval Audio
const BIRD_AVATAR = `${IMAGE_DIR}/flappy bird avatar.png`;               // Stage 3 Bird Avatar Image
const CRASH_AUDIO = `${AUDIO_DIR}/crash.mp3`;               // Stage 3 Crash Audio
const DUMMY_AUDIO = `${AUDIO_DIR}/dummy.mp3`;               // Stage 5 "DUMMY!" Audio

// New asset integrations
const END_SCREEN_LOOP_AUDIO = `${AUDIO_DIR}/Man Laughing.mp3`; // Looping audio on the end screen
const FAIL_ALERT_AUDIO = `${AUDIO_DIR}/Child Laughing.mp3`;     // Failed attempts alert audio
const END_SCREEN_LAUGH_GIF = `${IMAGE_DIR}/laughing guy gif.gif`;   // Laughing guy GIF on the end screen

// Custom sizing and positioning controls
const BIRD_AVATAR_WIDTH = '12%';     // Sizing relative to canvas wrapper
const BIRD_AVATAR_HEIGHT = '19%';
const BIRD_AVATAR_LEFT = '12.5%';      // Horizontal position
const BIRD_AVATAR_TOP_INITIAL = '50%'; // Initial vertical percentage

const END_GIF_WIDTH = '400px';         // End screen GIF width
const END_GIF_HEIGHT = '240px';        // End screen GIF height
const END_GIF_MARGIN_BOTTOM = '32px';   // Bottom spacing for the GIF

const SHOW_FLAPPY_OBSTACLES = false; // Set to true to make obstacles (ceiling, floor, and moving columns) visible, or false to make them completely invisible

/* ════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════════════════ */
const CANVAS_W = 640;
const CANVAS_H = 400;
const CEIL_Y   = 60;
const FLOOR_Y  = CANVAS_H - 60;
const BIRD_SZ  = 24;
const GRAVITY  = 0.45;
const FLAP_VY  = -9;
const BTN_W    = 200;
const BTN_H    = 52;

const FLAPPY_OBSTACLE_GAP   = 150;
const FLAPPY_OBSTACLE_SPEED = 4;
const FLAPPY_OBSTACLE_WIDTH = 50;
const FLAPPY_SPAWN_INTERVAL = 110;

function playAudioFile(src: string): void {
  try {
    const audio = new Audio(src);
    audio.play().catch(() => { /* ignored */ });
  } catch { /* ignored */ }
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const SisyphusSuite: React.FC = () => {

  /* ── Shared ────────────────────────────────────────────────────────────── */
  const [stage, setStage] = useState<Stage>(0);
  const [completedStage, setCompletedStage] = useState<number | null>(null);
  const startTs = useRef<number | null>(null);
  const tap = useCallback(() => {}, []);
  const pityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stage3PityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endScreenAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedCrosswordAlertRef = useRef(false);

  useEffect(() => {
    if (stage === 7) {
      const audio = new Audio(END_SCREEN_LOOP_AUDIO);
      audio.loop = true;
      audio.play().catch(() => { /* ignore */ });
      endScreenAudioRef.current = audio;
    } else {
      if (endScreenAudioRef.current) {
        endScreenAudioRef.current.pause();
        endScreenAudioRef.current = null;
      }
    }
    return () => {
      if (endScreenAudioRef.current) {
        endScreenAudioRef.current.pause();
        endScreenAudioRef.current = null;
      }
    };
  }, [stage]);

  /* ── Stage 1: Slider ───────────────────────────────────────────────────── */
  const [sliderVal, setSliderVal] = useState(0);
  const [stage1Fails, setStage1Fails] = useState(0);
  const [stage1PityActive, setStage1PityActive] = useState(false);

  /* ── Stage 2: Evasive Button ───────────────────────────────────────────── */
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [misses, setMisses] = useState(0);
  const [stage2PityActive, setStage2PityActive] = useState(false);

  /* ── Stage 3: Flappy Bird ──────────────────────────────────────────────── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdImgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cdDisplay, setCdDisplay] = useState(5);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [stage3Fails, setStage3Fails] = useState(0);
  const [stage3PityActive, setStage3PityActive] = useState(false);

  /* ── Stage 4: Slider Pong ──────────────────────────────────────────────── */
  const pongCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pongScore, setPongScore] = useState(0);
  const [stage4Fails, setStage4Fails] = useState(0);
  const [pongSliderVal, setPongSliderVal] = useState(50);
  const pongSliderValRef = useRef<number>(50);
  const [pongStarted, setPongStarted] = useState(false);
  const pongStartedRef = useRef(false);
  const [pongPassed, setPongPassed] = useState(false);
  const pongTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Stage 5: Crossword ────────────────────────────────────────────────── */
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<{ r: number, c: number } | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<{ r: number, c: number }[]>([]);
  const [crosswordError, setCrosswordError] = useState(false);
  const [arrowVisible, setArrowVisible] = useState(false);
  const [arrowOpacity, setArrowOpacity] = useState(false);
  const [crosswordFails, setCrosswordFails] = useState(0);
  const [crosswordNextPopupActive, setCrosswordNextPopupActive] = useState(false);
  const dummyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Stage 6: Leaderboard ──────────────────────────────────────────────── */
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const [nameInput, setNameInput] = useState('');

  /* ── Stage 7: Betrayal ─────────────────────────────────────────────────── */
  const [savedName, setSavedName] = useState('');
  const [finalTime, setFinalTime] = useState({ m: 0, s: 0 });
  const [finalFails, setFinalFails] = useState(0);

  /* ── Quit Confirmation Popup ───────────────────────────────────────────── */
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const showQuitConfirmRef = useRef(false);
  useEffect(() => {
    showQuitConfirmRef.current = showQuitConfirm;
  }, [showQuitConfirm]);

  /* ── Crossword Grid Constants ──────────────────────────────────────────── */
  const crosswordGrid: string[][] = [
    ['F', 'I', 'N', 'D', 'X', 'Y', 'Z', 'W'],
    ['Q', 'U', 'E', 'S', 'T', 'I', 'O', 'N'],
    ['H', 'E', 'L', 'L', 'O', 'W', 'P', 'R'],
    ['M', 'A', 'T', 'R', 'I', 'X', 'A', 'D'],
    ['S', 'W', '0', 'R', 'D', 'S', 'E', 'V'], // Red Herring "W0RDS" is here
    ['P', 'U', 'Z', 'Z', 'L', 'E', 'K', 'J'],
    ['C', 'O', 'D', 'E', 'R', 'G', 'F', 'S'],
    ['B', 'E', 'T', 'R', 'A', 'Y', 'A', 'L']
  ];

  /* ════════════════════════════════════════════════════════════════════════
     GLOBAL QUIT & TIMEOUT CLEANUP
     ════════════════════════════════════════════════════════════════════════ */
  const handleQuit = (): void => {
    // Reset all game states
    setStage(0);
    setCompletedStage(null);
    setSliderVal(0);
    setStage1Fails(0);
    setStage1PityActive(false);
    setMisses(0);
    setStage2PityActive(false);
    setCdDisplay(5);
    setHasStarted(false);
    setHasFailed(false);
    setStage3Fails(0);
    setStage3PityActive(false);
    setPongScore(0);
    setStage4Fails(0);
    setPongSliderVal(50);
    pongSliderValRef.current = 50;
    setPongStarted(false);
    pongStartedRef.current = false;
    setPongPassed(false);
    setIsSelecting(false);
    setSelectStart(null);
    setHighlightedCells([]);
    setCrosswordError(false);
    setArrowVisible(false);
    setArrowOpacity(false);
    setNameInput('');
    setSavedName('');
    setFinalTime({ m: 0, s: 0 });
    setCrosswordFails(0);
    setCrosswordNextPopupActive(false);
    setFinalFails(0);
    hasPlayedCrosswordAlertRef.current = false;
    startTs.current = null;

    if (dummyTimeoutRef.current) {
      clearTimeout(dummyTimeoutRef.current);
      dummyTimeoutRef.current = null;
    }
    if (pongTimerRef.current) {
      clearTimeout(pongTimerRef.current);
      pongTimerRef.current = null;
    }
    if (pityTimerRef.current) {
      clearTimeout(pityTimerRef.current);
      pityTimerRef.current = null;
    }
    if (stage3PityTimerRef.current) {
      clearTimeout(stage3PityTimerRef.current);
      stage3PityTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (dummyTimeoutRef.current) {
        clearTimeout(dummyTimeoutRef.current);
      }
      if (pongTimerRef.current) {
        clearTimeout(pongTimerRef.current);
      }
      if (pityTimerRef.current) {
        clearTimeout(pityTimerRef.current);
      }
    };
  }, []);

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 0 — Home Screen (Begin Action)
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
    if (showQuitConfirmRef.current) return;
    if (sliderVal === 50) {
      setCompletedStage(1);
    } else {
      const nextFails = stage1Fails + 1;
      setStage1Fails(nextFails);

      if (nextFails >= 50) {
        setStage1PityActive(true);
        pityTimerRef.current = setTimeout(() => {
          setStage1PityActive(false);
          setMisses(0);
          setBtnPos({
            x: (window.innerWidth - BTN_W) / 2,
            y: (window.innerHeight - BTN_H) / 2,
          });
          setStage(2);
        }, 5000); // Overlay displays for exactly 5 seconds
      } else {
        playAudioFile(FAIL_AUDIO);
        playAudioFile(LAUGH_AUDIO);
        setSliderVal(0);
      }
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 2 — Evasive Button
     ════════════════════════════════════════════════════════════════════════ */
  // Center evasive button initially and on resize within safe boundaries
  useEffect(() => {
    if (stage !== 2) return;
    const centerButton = () => {
      const safeY = 140 + (Math.max(140, window.innerHeight - 160 - BTN_H) - 140) / 2;
      const safeX = 16 + (Math.max(16, window.innerWidth - BTN_W - 16) - 16) / 2;
      setBtnPos({ x: safeX, y: safeY });
    };
    centerButton();
    const onResize = () =>
      setBtnPos(p => {
        const minY = 140;
        const maxY = Math.max(minY, window.innerHeight - 160 - BTN_H);
        const minX = 16;
        const maxX = Math.max(minX, window.innerWidth - BTN_W - 16);
        return {
          x: Math.min(Math.max(p.x, minX), maxX),
          y: Math.min(Math.max(p.y, minY), maxY),
        };
      });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [stage]);

  // Stage 2: Interval Audio playing
  useEffect(() => {
    if (stage !== 2) return;
    const intervalId = setInterval(() => {
      playAudioFile(EVASIVE_INTERVAL_AUDIO);
    }, 3500); // Plays Stage 2 Interval Audio every 3.5 seconds
    return () => clearInterval(intervalId);
  }, [stage]);

  const evadeButton = useCallback((): void => {
    if (showQuitConfirmRef.current) return;
    const nextMisses = misses + 1;
    setMisses(nextMisses);

    if (nextMisses % 20 === 0 && nextMisses > 0) {
      playAudioFile(FAIL_ALERT_AUDIO);
    }

    if (nextMisses >= 80) {
      setStage2PityActive(true);
      pityTimerRef.current = setTimeout(() => {
        setStage2PityActive(false);
        setStage(3);
      }, 5000); // Overlay displays for exactly 5 seconds
      return;
    }

    const minX = 16;
    const maxX = Math.max(minX, window.innerWidth - BTN_W - 16);
    const minY = 140;
    const maxY = Math.max(minY, window.innerHeight - 160 - BTN_H);

    setBtnPos({
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    });
  }, [misses]);

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 3 — Invisible Flappy Bird
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (stage !== 3) return;

    // Time-based pity timer of 40 seconds
    stage3PityTimerRef.current = setTimeout(() => {
      setStage3PityActive(true);
      pityTimerRef.current = setTimeout(() => {
        setStage3PityActive(false);
        setStage(4);
      }, 5000);
    }, 40000);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    interface FlappyPipe {
      x: number;
      topHeight: number;
      bottomHeight: number;
    }

    let pipes: FlappyPipe[] = [];
    let spawnTimer = 0;

    const game = { started: false, failing: false, countdown: 5, alive: true };
    const bird = { y: CANVAS_H / 2, vy: 0, vis: true };

    setCdDisplay(5);
    setHasStarted(false);
    setHasFailed(false);

    // Initial position render of the bird avatar (visible at start)
    if (birdImgRef.current) {
      birdImgRef.current.style.top = `${(bird.y / CANVAS_H) * 100}%`;
      birdImgRef.current.style.display = 'block';
    }

    const spawnPipe = (): void => {
      const totalPipeHeight = (FLOOR_Y - CEIL_Y) - FLAPPY_OBSTACLE_GAP;
      const minPipeHeight = 30;
      const maxPipeHeight = totalPipeHeight - minPipeHeight;
      const topHeight = minPipeHeight + Math.random() * (maxPipeHeight - minPipeHeight);
      const bottomHeight = totalPipeHeight - topHeight;

      pipes.push({
        x: CANVAS_W,
        topHeight,
        bottomHeight
      });
    };

    const flap = (): void => {
      if (!game.alive || game.failing) return;
      if (showQuitConfirmRef.current) return;
      tap();

      if (!game.started) {
        game.started   = true;
        game.countdown = 5;
        // Keep bird visible at all times, no hide trigger on start
        bird.vis       = true;
        if (birdImgRef.current) birdImgRef.current.style.display = 'block';
        setHasStarted(true);
        setCdDisplay(5);

        spawnPipe();
        spawnTimer = 0;

        intervalRef.current = setInterval(() => {
          if (showQuitConfirmRef.current) return;
          game.countdown -= 1;
          setCdDisplay(game.countdown);
          if (game.countdown <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (game.alive) setCompletedStage(3); // Transition to completed screen
          }
        }, 1000);
      }
      bird.vy = FLAP_VY;
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        e.preventDefault();
        flap();
      }
    };
    const onCanvasTap = (): void => flap();
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onCanvasTap);

    const drawFrame = (): void => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      
      if (SHOW_FLAPPY_OBSTACLES) {
        // Draw obstacles visibly (bright slate gray background zone)
        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(0, 0, CANVAS_W, CEIL_Y);
        ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);
        
        ctx.strokeStyle = '#f59e0b'; // Gold border line
        ctx.lineWidth   = 3;
        ctx.beginPath(); ctx.moveTo(0, CEIL_Y);  ctx.lineTo(CANVAS_W, CEIL_Y);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(CANVAS_W, FLOOR_Y); ctx.stroke();

        // Draw moving pipes visibly
        pipes.forEach(p => {
          // Top pipe
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(p.x, CEIL_Y, FLAPPY_OBSTACLE_WIDTH, p.topHeight);
          
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth   = 2;
          ctx.strokeRect(p.x, CEIL_Y, FLAPPY_OBSTACLE_WIDTH, p.topHeight);

          // Bottom pipe
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(p.x, FLOOR_Y - p.bottomHeight, FLAPPY_OBSTACLE_WIDTH, p.bottomHeight);
          
          ctx.strokeRect(p.x, FLOOR_Y - p.bottomHeight, FLAPPY_OBSTACLE_WIDTH, p.bottomHeight);
        });
      } else {
        // Obstacles stay completely invisible (drawn in black like the rest of the canvas)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_W, CEIL_Y);
        ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);
      }
    };

    const loop = (): void => {
      if (!game.alive) return;
      if (showQuitConfirmRef.current) {
        drawFrame();
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (game.started && !game.failing) {
        bird.vy += GRAVITY;
        bird.y  += bird.vy;

        // Apply physics coordinate to DOM avatar wrapper responsively (always visible)
        if (birdImgRef.current) {
          birdImgRef.current.style.top = `${(bird.y / CANVAS_H) * 100}%`;
          birdImgRef.current.style.display = 'block';
        }

        // Move pipes
        pipes.forEach(p => {
          p.x -= FLAPPY_OBSTACLE_SPEED;
        });

        // Filter off-screen pipes
        pipes = pipes.filter(p => p.x + FLAPPY_OBSTACLE_WIDTH > 0);

        // Spawn new pipes
        spawnTimer++;
        if (spawnTimer >= FLAPPY_SPAWN_INTERVAL) {
          spawnTimer = 0;
          spawnPipe();
        }

        // Collisions
        const hitCeil  = bird.y <= CEIL_Y;
        const hitFloor = bird.y + BIRD_SZ >= FLOOR_Y;

        let hitPipe = false;
        const birdLeft = 80;
        const birdRight = 80 + BIRD_SZ;

        for (let i = 0; i < pipes.length; i++) {
          const p = pipes[i];
          const pipeLeft = p.x;
          const pipeRight = p.x + FLAPPY_OBSTACLE_WIDTH;

          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (bird.y < CEIL_Y + p.topHeight) {
              hitPipe = true;
              break;
            }
            if (bird.y + BIRD_SZ > FLOOR_Y - p.bottomHeight) {
              hitPipe = true;
              break;
            }
          }
        }

        if (hitCeil || hitFloor || hitPipe) {
          game.failing = true;
          setHasFailed(true);
          playAudioFile(CRASH_AUDIO);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          setStage3Fails(prev => {
            const next = prev + 1;
            if (next % 3 === 0 && next > 0) {
              playAudioFile(FAIL_ALERT_AUDIO);
            }
            if (next >= 50) {
              setStage3PityActive(true);
              pityTimerRef.current = setTimeout(() => {
                setStage3PityActive(false);
                setStage(4);
              }, 5000); // Pity displays overlay for 5 seconds
            }
            return next;
          });

          setTimeout(() => {
            if (!game.alive) return;
            bird.y = CANVAS_H / 2;
            bird.vy = 0;
            bird.vis = true;
            game.started = false;
            game.failing = false;
            game.countdown = 5;
            setCdDisplay(5);
            setHasStarted(false);
            setHasFailed(false);
            pipes = [];
            spawnTimer = 0;
            if (birdImgRef.current) {
              birdImgRef.current.style.top = `${(bird.y / CANVAS_H) * 100}%`;
              birdImgRef.current.style.display = 'block';
            }
          }, 2500);
        }
      }

      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return (): void => {
      game.alive = false;
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', onCanvasTap);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (stage3PityTimerRef.current) {
        clearTimeout(stage3PityTimerRef.current);
        stage3PityTimerRef.current = null;
      }
    };
  }, [stage, completedStage, tap]);

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 4 — Slider Pong
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (stage !== 4) return;

    const canvas = pongCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let alive = true;
    let rafId: number;

    // Ball moves at a constant speed, no increase in speed ever.
    const ball = { x: 53, y: 200, vx: 5, vy: 3.5, r: 8 };
    const paddleW = 15;
    const paddleH = 80;
    const paddleX = 30;
    let hitCount = 0;

    const loop = (): void => {
      if (!alive) return;
      if (showQuitConfirmRef.current) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      // Inverted slider mapping: moving the controller UP now moves the paddle UP
      const paddleY = (1 - pongSliderValRef.current / 100) * (CANVAS_H - paddleH);

      if (!pongStartedRef.current) {
        // Keep ball attached to the paddle center vertically until launch
        ball.x = paddleX + paddleW + ball.r;
        ball.y = paddleY + paddleH / 2;
      } else {
        // Update physics
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Boundary top/bottom bounce
        if (ball.y - ball.r <= 0) {
          ball.y = ball.r;
          ball.vy = -ball.vy;
        } else if (ball.y + ball.r >= CANVAS_H) {
          ball.y = CANVAS_H - ball.r;
          ball.vy = -ball.vy;
        }

        // Right wall solid bounce (constant velocity components)
        if (ball.x + ball.r >= CANVAS_W) {
          ball.x = CANVAS_W - ball.r;
          ball.vx = -ball.vx;
        }

        // Left paddle intersection
        const isAtPaddleX = ball.x - ball.r <= paddleX + paddleW && ball.x + ball.r >= paddleX;
        
        if (ball.vx < 0 && isAtPaddleX) {
          if (ball.y >= paddleY && ball.y <= paddleY + paddleH) {
            ball.vx = -ball.vx;
            hitCount += 1;
            setPongScore(hitCount);
            setStage4Fails(prev => prev + 1);
            // Pong skip/pity check removed, allowing infinite bounces
          }
        }

        // Off-screen (Left side exit is the goal!)
        if (ball.x - ball.r < 0) {
          alive = false;
          setPongPassed(true);
          pongTimerRef.current = setTimeout(() => {
            setCompletedStage(4);
          }, 5000); // Custom overlay displays for exactly 5 seconds
          return;
        }
      }

      // Draw frames
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw Left Paddle
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(paddleX, paddleY, paddleW, paddleH);

      // Draw Ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      if (pongTimerRef.current) {
        clearTimeout(pongTimerRef.current);
      }
    };
  }, [stage, completedStage]);

  const handlePongStart = () => {
    if (showQuitConfirmRef.current) return;
    if (!pongStarted) {
      setPongStarted(true);
      pongStartedRef.current = true;
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 5 — Deceptive Crossword Selection & Transition
     ════════════════════════════════════════════════════════════════════════ */
  const handleMouseDown = (r: number, c: number) => {
    if (showQuitConfirmRef.current) return;
    tap();
    setIsSelecting(true);
    setSelectStart({ r, c });
    setHighlightedCells([{ r, c }]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (showQuitConfirmRef.current) return;
    if (!isSelecting || !selectStart) return;
    
    const rStart = selectStart.r;
    const cStart = selectStart.c;
    const rEnd = r;
    const cEnd = c;

    const rDiff = rEnd - rStart;
    const cDiff = cEnd - cStart;

    const absRDiff = Math.abs(rDiff);
    const absCDiff = Math.abs(cDiff);

    const path: { r: number, c: number }[] = [];

    if (rStart === rEnd) {
      // Horizontal selection
      const minC = Math.min(cStart, cEnd);
      const maxC = Math.max(cStart, cEnd);
      for (let i = minC; i <= maxC; i++) {
        path.push({ r: rStart, c: i });
      }
    } else if (cStart === cEnd) {
      // Vertical selection
      const minR = Math.min(rStart, rEnd);
      const maxR = Math.max(rStart, rEnd);
      for (let i = minR; i <= maxR; i++) {
        path.push({ r: i, c: cStart });
      }
    } else if (absRDiff === absCDiff) {
      // Diagonal selection
      const rStep = rDiff > 0 ? 1 : -1;
      const cStep = cDiff > 0 ? 1 : -1;
      for (let i = 0; i <= absRDiff; i++) {
        path.push({ r: rStart + i * rStep, c: cStart + i * cStep });
      }
    }

    if (path.length > 0) {
      setHighlightedCells(path);
    }
  };

  const handleMouseUp = () => {
    if (showQuitConfirmRef.current) {
      setIsSelecting(false);
      setSelectStart(null);
      setHighlightedCells([]);
      return;
    }
    if (isSelecting) {
      setIsSelecting(false);
      if (highlightedCells.length > 0) {
        setCrosswordError(true);
        setCrosswordFails(f => f + 1);
      }
      setSelectStart(null);
      setHighlightedCells([]);
    }
  };

  // Error popup for Invalid Word stays on screen for exactly 1.5 seconds
  useEffect(() => {
    if (!crosswordError) return;
    const timer = setTimeout(() => {
      setCrosswordError(false);
    }, 1500); 
    return () => clearTimeout(timer);
  }, [crosswordError]);

  // Global mouse release handling to ensure selections reset cleanly
  useEffect(() => {
    if (!isSelecting) return;
    const handleGlobalMouseUp = () => {
      if (showQuitConfirmRef.current) {
        setIsSelecting(false);
        setSelectStart(null);
        setHighlightedCells([]);
        return;
      }
      setIsSelecting(false);
      if (highlightedCells.length > 0) {
        setCrosswordError(true);
        setCrosswordFails(f => f + 1);
      }
      setSelectStart(null);
      setHighlightedCells([]);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, highlightedCells]);

  // Next Arrow slowly fading in: hidden for first 15s, starts showing at 15s and reaches full opacity by 60s
  useEffect(() => {
    if (stage !== 5) return;
    // Render button in DOM after 15 seconds (making it immediately clickable)
    const showTimer = setTimeout(() => {
      setArrowVisible(true);
      // Trigger linear opacity transition
      const opacityTimer = setTimeout(() => {
        setArrowOpacity(true);
      }, 50);
      return () => clearTimeout(opacityTimer);
    }, 15000); 

    return () => {
      clearTimeout(showTimer);
      setArrowVisible(false);
      setArrowOpacity(false);
    };
  }, [stage]);

  const handleNextArrowClick = (): void => {
    if (showQuitConfirmRef.current) return;
    tap();
    playAudioFile(DUMMY_AUDIO);
    if (!hasPlayedCrosswordAlertRef.current) {
      playAudioFile(FAIL_ALERT_AUDIO);
      hasPlayedCrosswordAlertRef.current = true;
    }
    setCrosswordNextPopupActive(true);
    pityTimerRef.current = setTimeout(() => {
      setCrosswordNextPopupActive(false);
      setCompletedStage(5);
    }, 5000); // 5-second themed popup
  };

  /* ════════════════════════════════════════════════════════════════════════
     STAGE 6 — The Fake Leaderboard
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (stage !== 6) return;

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
  }, [stage, completedStage]);

  const handleSubmit = (): void => {
    tap();
    const name    = nameInput.trim() || 'Anonymous';
    const elapsed = startTs.current ? Math.floor((Date.now() - startTs.current) / 1000) : 0;
    setSavedName(name);
    setFinalTime({ m: Math.floor(elapsed / 60), s: elapsed % 60 });
    setFinalFails(stage1Fails + misses + stage3Fails + stage4Fails + crosswordFails);
    setStage(7);
  };

  const quitConfirmPopup = showQuitConfirm && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] select-none font-sans">
      <div className="max-w-md w-full mx-4 border-double border-8 border-amber-600 bg-zinc-950 p-8 text-center rounded-xl shadow-2xl font-serif text-amber-100 relative">
        <h3 className="text-2xl font-bold tracking-wide mb-4">
          Are you sure you want to quit?
        </h3>
        <p className="text-zinc-400 text-sm mb-8 font-sans">
          All progress for the current run will be lost.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setShowQuitConfirm(false);
              handleQuit();
            }}
            className="px-6 py-2.5 bg-red-655/90 hover:bg-red-600 text-white font-bold tracking-wider text-xs uppercase cursor-pointer transition-all duration-300 rounded-lg shadow-md border border-red-750 bg-red-600"
          >
            Yes, Quit
          </button>
          <button
            onClick={() => {
              setShowQuitConfirm(false);
            }}
            className="px-6 py-2.5 bg-transparent border border-zinc-500 hover:bg-zinc-800 text-zinc-300 font-bold tracking-wider text-xs uppercase cursor-pointer transition-all duration-300 rounded-lg"
          >
            No, Continue
          </button>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════════
     RENDER STAGE SWITCH
     ════════════════════════════════════════════════════════════════════════ */

  /* ── INTERMISSION SCREEN (Matches Home Screen and Stage 7 perfectly) ── */
  if (completedStage !== null) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-amber-900 font-serif selection:bg-amber-100 relative select-none">
      {/* Big Golden Border near the edge of the screen */}
      <div className="absolute inset-4 sm:inset-6 md:inset-10 border-double border-8 border-amber-600 bg-white pointer-events-none z-0" />

      <div className="max-w-xl w-full px-8 py-12 text-center relative z-10 flex flex-col items-center">
        <div className="text-amber-600/30 text-4xl font-bold mb-4">₪</div>
        <p className="tracking-[0.45em] uppercase text-amber-700 text-xs mb-6 font-bold">
          Level {completedStage} Completed
        </p>
        <h1 className="text-3xl md:text-4xl font-light tracking-[0.18em] text-amber-800 my-6 uppercase">
          Boulder Repositioned
        </h1>
        <div className="w-16 h-[2px] bg-amber-600 mx-auto mb-8" />
        <p className="text-slate-700 text-base md:text-lg leading-relaxed mb-12 italic">
          "One must imagine Sisyphus happy."<br />
          The labor is complete, yet the mountain remains.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <button
            onClick={() => {
              const next = completedStage + 1;
              setStage(next as Stage);
              setCompletedStage(null);
            }}
            className="px-8 py-3.5 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold tracking-widest text-xs uppercase cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg rounded-lg border-2 border-amber-650"
          >
            Next Level
          </button>
          <button
            onClick={() => {
              // Reset specific states for the stage to retry (failed attempts accumulate)
              if (completedStage === 1) {
                setSliderVal(0);
              } else if (completedStage === 2) {
                setBtnPos({
                  x: (window.innerWidth - BTN_W) / 2,
                  y: (window.innerHeight - BTN_H) / 2,
                });
              } else if (completedStage === 3) {
                setCdDisplay(5);
                setHasStarted(false);
                setHasFailed(false);
              } else if (completedStage === 4) {
                setPongScore(0);
                setPongSliderVal(50);
                pongSliderValRef.current = 50;
                setPongStarted(false);
                pongStartedRef.current = false;
                setPongPassed(false);
              } else if (completedStage === 5) {
                setIsSelecting(false);
                setSelectStart(null);
                setHighlightedCells([]);
                setCrosswordError(false);
                setArrowVisible(false);
                setArrowOpacity(false);
              }
              setStage(completedStage as Stage);
              setCompletedStage(null);
            }}
            className="px-8 py-3.5 w-full bg-transparent border-2 border-amber-600 text-amber-800 hover:bg-amber-900/10 tracking-widest text-xs uppercase cursor-pointer transition-all duration-300 rounded-lg font-bold"
          >
            Retry Level
          </button>
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="px-8 py-3.5 w-full bg-transparent border-2 border-amber-800 text-amber-600 hover:text-amber-500 hover:border-amber-600 tracking-widest text-xs uppercase cursor-pointer transition-all duration-300 rounded-lg font-bold"
          >
            Home
          </button>
        </div>
      </div>
      {quitConfirmPopup}
    </div>
  );

  /* ── Stage 0: The Greek Home Screen (White Background + Edge Golden Border) ── */
  if (stage === 0) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-amber-900 font-serif selection:bg-amber-100 relative">
      {/* Big Golden Border near the edge of the screen */}
      <div className="absolute inset-4 sm:inset-6 md:inset-10 border-double border-8 border-amber-600 bg-white pointer-events-none z-0" />

      <div className="max-w-xl w-full px-8 py-12 text-center relative z-10">
        <p className="tracking-[0.45em] uppercase text-amber-650 text-xs mb-8 font-bold text-amber-650">
          A Gloriously Useless Experience
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-[0.18em] text-amber-800 my-8 uppercase">
          The Sisyphus Suite
        </h1>
        <div className="w-16 h-[2px] bg-amber-600 mx-auto my-8" />
        <p className="text-slate-655 text-base md:text-lg leading-relaxed mb-12 text-slate-600">
          Embark on a journey of focus, precision, and ultimate reward.<br />
          Do you have what it takes to conquer the challenges ahead?<br />
          Press Begin.
        </p>
        <button
          onClick={handleBegin}
          className="px-16 py-4 bg-transparent border-2 border-amber-600 text-amber-800 hover:text-white hover:bg-amber-600 tracking-[0.35em] text-sm uppercase cursor-pointer transition-all duration-300 shadow-[0_0_15px_rgba(217,119,6,0.1)] font-bold hover:shadow-[0_0_25px_rgba(217,119,6,0.3)]"
        >
          Begin
        </button>
      </div>
    </div>
  );

  /* ── Stage 1: The Unforgiving Slider ───────────────────────────────────── */
  if (stage === 1) return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col items-center justify-center gap-8 px-6 font-sans relative select-none bg-slate-950">
      {/* Title */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center w-full px-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-amber-400 uppercase font-sans">
          STAGE 1: THE UNFORGIVING SLIDER
        </h2>
      </div>

      {/* Top right controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <span className="text-slate-400 font-sans text-sm font-bold">
          Failed attempts: {stage1Fails}
        </span>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-sm tracking-widest uppercase bg-slate-900 hover:bg-red-600 text-slate-100 hover:text-white px-6 py-2.5 rounded-lg border border-slate-700 hover:border-red-600 transition-all font-bold shadow-lg hover:scale-105 active:scale-95"
        >
          Quit
        </button>
      </div>
      
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6">
        <p className="text-slate-200 text-base md:text-lg font-bold text-center leading-relaxed">
          To proceed, calibrate your focus.<br />
          Set the slider to exactly <code className="font-mono font-bold text-amber-400 bg-slate-955 px-2 py-1 rounded bg-slate-950">50.00</code>.
        </p>
        
        <div className="flex flex-col items-center gap-4 w-full">
          <span className={`font-mono text-6xl font-bold tracking-tight select-none tabular-nums transition-colors duration-150 ${sliderVal === 50 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'text-slate-200'}`}>
            {sliderVal.toFixed(2)}
          </span>
          
          <input
            type="range"
            min="0"
            max="100"
            step="0.01"
            value={sliderVal}
            onChange={e => setSliderVal(parseFloat(e.target.value))}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="w-full h-2 bg-slate-955 rounded-lg appearance-none cursor-ew-resize accent-amber-500 hover:accent-amber-400 focus:outline-none bg-slate-950"
          />
          
          <p className="text-slate-500 text-xs text-center mt-2">
            Release the slider to submit your calibration.
          </p>
        </div>
      </div>

      {/* Stage 1 In-game pity popup (5 seconds display duration) */}
      {stage1PityActive && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 select-none">
          <div className="max-w-md w-full mx-4 border-double border-8 border-amber-600 bg-zinc-955 p-8 text-center rounded-xl shadow-2xl font-serif text-amber-100 animate-pulse bg-zinc-950">
            <p className="text-lg leading-relaxed font-bold">
              Alright I Dont Have All Day And It Aint Looking Good So Lets Get A Move On Shall We...
            </p>
          </div>
        </div>
      )}
      {quitConfirmPopup}
    </div>
  );

  /* ── Stage 2: The Evasive Button ───────────────────────────────────────── */
  if (stage === 2) return (
    <div className="min-h-screen bg-yellow-400 relative overflow-hidden flex items-center justify-center select-none">
      {/* Title */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center w-full px-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-yellow-950 uppercase font-sans">
          STAGE 2: THE EVASIVE BUTTON
        </h2>
        <p className="text-yellow-950 text-sm md:text-base font-bold font-sans mt-1.5 opacity-85">
          Click to win.
        </p>
      </div>

      {/* Top right controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <span className="text-yellow-950 font-sans text-sm font-bold">
          Failed attempts: {misses}
        </span>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-sm tracking-widest uppercase bg-slate-900 hover:bg-red-600 text-slate-100 hover:text-white px-6 py-2.5 rounded-lg border border-slate-700 hover:border-red-600 transition-all font-bold shadow-lg hover:scale-105 active:scale-95"
        >
          Quit
        </button>
      </div>

      <button
        style={{
          position: 'fixed',
          left: btnPos.x,
          top: btnPos.y,
          width: BTN_W,
          height: BTN_H,
        }}
        className="bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-lg border-2 border-red-800 shadow-[0_6px_20px_rgba(220,38,38,0.4)] transition-all cursor-pointer z-10 active:translate-y-1"
        onMouseEnter={evadeButton}
        onClick={() => { tap(); setCompletedStage(2); }}
      >
        Catch Me If You Can!
      </button>


      {/* Stage 2 In-game pity popup (5 seconds display duration) */}
      {stage2PityActive && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 select-none">
          <div className="max-w-md w-full mx-4 border-double border-8 border-amber-600 bg-zinc-955 p-8 text-center rounded-xl shadow-2xl font-serif text-amber-100 animate-pulse bg-zinc-950">
            <p className="text-lg leading-relaxed font-bold">
              Alright I Dont Have All Day And It Aint Looking Good So Lets Get A Move On Shall We...
            </p>
          </div>
        </div>
      )}
      {quitConfirmPopup}
    </div>
  );

  /* ── Stage 3: Invisible Flappy Bird ────────────────────────────────────── */
  if (stage === 3) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4 relative select-none">
      {/* Title */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center w-full px-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-zinc-300 uppercase font-sans">
          STAGE 3: INVISIBLE FLAPPY BIRD
        </h2>
      </div>

      {/* Top right controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <span className="text-zinc-400 font-sans text-sm font-bold">
          Failed attempts: {stage3Fails}
        </span>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-sm tracking-widest uppercase bg-slate-900 hover:bg-red-600 text-slate-100 hover:text-white px-6 py-2.5 rounded-lg border border-slate-700 hover:border-red-600 transition-all font-bold shadow-lg hover:scale-105 active:scale-95"
        >
          Quit
        </button>
      </div>

      <p className="text-zinc-100 text-lg md:text-xl font-bold text-center max-w-md leading-relaxed font-sans mt-12">
        Survive <span className="text-amber-400 font-bold">5 seconds</span> to move on to the next level.<br />
        Press <kbd className="bg-zinc-800 text-zinc-100 px-2 py-1 rounded border border-zinc-700 text-sm font-mono">Space</kbd> or click the screen to flap.
      </p>

      <div className="h-10 flex items-center justify-center font-sans">
        {hasFailed ? (
          <p className="text-red-500 font-bold text-xl tracking-wider animate-pulse">
            FAILED. RESTARTING LEAP.
          </p>
        ) : hasStarted ? (
          <p className="text-amber-400 font-mono text-xl font-bold">
            {cdDisplay}s remaining
          </p>
        ) : (
          <p className="text-zinc-500 text-sm">
            Click or press Space to begin
          </p>
        )}
      </div>

      <div className="relative w-full max-w-[640px] aspect-[8/5] border border-zinc-800 bg-zinc-955 shadow-2xl overflow-hidden bg-zinc-950">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          tabIndex={0}
          className="w-full h-full cursor-pointer outline-none block"
        />
        {/* Bird Avatar is visible at all times */}
        <img
          ref={birdImgRef}
          src={BIRD_AVATAR}
          alt="Bird"
          className="absolute pointer-events-none"
          style={{
            left: BIRD_AVATAR_LEFT,
            width: BIRD_AVATAR_WIDTH,
            height: BIRD_AVATAR_HEIGHT,
            top: BIRD_AVATAR_TOP_INITIAL,
            display: 'block',
          }}
        />
      </div>

      {/* Stage 3 In-game pity popup (5 seconds display duration) */}
      {stage3PityActive && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 select-none">
          <div className="max-w-md w-full mx-4 border-double border-8 border-amber-600 bg-zinc-955 p-8 text-center rounded-xl shadow-2xl font-serif text-amber-100 animate-pulse bg-zinc-950">
            <p className="text-lg leading-relaxed font-bold">
              Alright I Dont Have All Day And It Aint Looking Good So Lets Get A Move On Shall We...
            </p>
          </div>
        </div>
      )}
      {quitConfirmPopup}
    </div>
  );

  /* ── Stage 4: Slider Pong (Slider on Left, Behind the Board, Constant Speed) ── */
  if (stage === 4) return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col items-center justify-center gap-6 px-6 relative select-none font-sans bg-slate-955 bg-slate-950">
      {/* Title */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center w-full px-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-slate-300 uppercase font-sans">
          STAGE 4: PONG
        </h2>
      </div>

      {/* Top right controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <span className="text-slate-400 font-sans text-sm font-bold">
          Failed attempts: {stage4Fails}
        </span>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-sm tracking-widest uppercase bg-slate-900 hover:bg-red-600 text-slate-100 hover:text-white px-6 py-2.5 rounded-lg border border-slate-700 hover:border-red-600 transition-all font-bold z-50 shadow-lg hover:scale-105 active:scale-95"
        >
          Quit
        </button>
      </div>

      <div className="text-center flex flex-col items-center mt-12">
        {/* Instructions text is larger and bold */}
        <p className="text-slate-300 text-base font-bold mt-2 text-center uppercase tracking-wider">
          {pongStarted ? "Protect the left boundary." : "Move the slider or click the board to launch the ball."}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 font-mono text-lg text-emerald-400 shadow-inner">
          SCORE: <span className="font-bold">{pongScore}</span>
        </div>
      </div>

      {/* Relative container holding both Left Vertical Slider and Pong Canvas */}
      <div className="relative flex items-center justify-center pl-8">
        
        {/* Vertical range slider positioned on the left side, behind the board (z-0) */}
        <input
          type="range"
          min="0"
          max="100"
          {...{ orient: "vertical" }}
          value={pongSliderVal}
          onChange={e => {
            const val = parseFloat(e.target.value);
            setPongSliderVal(val);
            pongSliderValRef.current = val;
            handlePongStart();
          }}
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            height: 400,
            left: 0,
            position: 'absolute',
            zIndex: 0,
          }}
          className="w-8 appearance-none bg-slate-900 hover:bg-slate-850 rounded-lg cursor-ns-resize accent-slate-300 focus:outline-none border border-slate-800 py-1"
        />

        {/* Pong board Canvas */}
        <div 
          onClick={handlePongStart}
          className="relative w-full max-w-[640px] aspect-[8/5] border border-slate-800 bg-black shadow-2xl rounded-md overflow-hidden cursor-pointer z-10 ml-8"
        >
          <canvas
            ref={pongCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full h-full block"
          />

          {/* In-Game Popup for Stage 4 success (disappears in 5 seconds) */}
          {pongPassed && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 transition-opacity duration-300">
              <div className="bg-slate-900 border border-slate-700 px-8 py-6 rounded-xl text-center shadow-2xl animate-pulse">
                <h3 className="text-base md:text-lg font-bold text-amber-400 tracking-wide font-serif">
                  Took You Long Enough To Figure That One Out<br />
                  Sometimes You Have To Lose The War To Win The Battle.<br />
                  or something like that...
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-6" />
      {quitConfirmPopup}
    </div>
  );

  /* ── Stage 5: Deceptive Crossword (Selection drag, fading arrow) ───────── */
  if (stage === 5) return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col items-center justify-center p-6 relative select-none font-sans bg-slate-955 bg-slate-955 bg-slate-955 bg-slate-950">
      {/* Title */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center w-full px-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-slate-300 uppercase font-sans">
          STAGE 5: CROSSWORD
        </h2>
      </div>

      {/* Top right controls */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <span className="text-slate-400 font-sans text-sm font-bold">
          Failed attempts: {crosswordFails}
        </span>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-sm tracking-widest uppercase bg-slate-900 hover:bg-red-600 text-slate-100 hover:text-white px-6 py-2.5 rounded-lg border border-slate-700 hover:border-red-600 transition-all font-bold shadow-lg hover:scale-105 active:scale-95"
        >
          Quit
        </button>
      </div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6 relative mt-12">
        {/* Headings - Both FIND and WORDS are the same color */}
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-slate-300 uppercase text-center cursor-default">
          FIND <span onClick={() => { tap(); setCompletedStage(5); }} className="cursor-pointer hover:underline decoration-dotted text-slate-300">WORDS</span>
        </h2>

        {/* Word Search Grid with click-and-drag selection */}
        <div 
          onMouseUp={handleMouseUp}
          className="grid grid-cols-8 gap-1.5 bg-slate-955 p-3 rounded-lg border border-slate-800 bg-slate-950"
        >
          {crosswordGrid.map((row, rIdx) =>
            row.map((char, cIdx) => {
              const isHighlighted = highlightedCells.some(cell => cell.r === rIdx && cell.c === cIdx);
              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onMouseDown={(e) => { e.preventDefault(); handleMouseDown(rIdx, cIdx); }}
                  onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                  className={`w-9 h-9 flex items-center justify-center rounded font-mono text-base font-bold transition-all duration-150 select-none ${
                    isHighlighted
                      ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)] border border-amber-600'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {char}
                </button>
              );
            })
          )}
        </div>

        {/* Instructions text is larger and bold */}
        <p className="text-slate-200 text-sm md:text-base font-bold text-center leading-relaxed font-sans mt-2">
          Locate and highlight all hidden keywords to complete calibration.
        </p>

        {/* In-Game Popup for Invalid Word selection (stays on screen for 3 seconds) */}
        {crosswordError && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-655/90 text-white px-6 py-3 rounded-lg border border-red-800 shadow-2xl font-bold tracking-wide animate-pulse z-30 pointer-events-none bg-red-600">
            Invalid Word
          </div>
        )}

        {/* In-Game Popup for Next Arrow Click (stays on screen for 5 seconds) */}
        {crosswordNextPopupActive && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 select-none">
            <div className="max-w-md w-full mx-4 border-double border-8 border-amber-600 bg-zinc-955 p-8 text-center rounded-xl shadow-2xl font-serif text-amber-100 animate-pulse bg-zinc-950">
              <p className="text-lg leading-relaxed font-bold">
                You Could Have Done This The Whole Time You Know...
              </p>
            </div>
          </div>
        )}

        {/* Slowly Fading Next Arrow (hides for first 15s, then transitions over 45s, immediately clickable) */}
        {arrowVisible && (
          <button
            onClick={handleNextArrowClick}
            style={{
              transition: 'opacity 45s linear',
            }}
            className={`fixed right-8 md:right-16 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-400 text-black p-4 rounded-full shadow-lg z-20 cursor-pointer pointer-events-auto transition-opacity ${
              arrowOpacity ? 'opacity-100' : 'opacity-0'
            }`}
            title="Next Level"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {quitConfirmPopup}
    </div>
  );

  /* ── Stage 6: The Fake Leaderboard ─────────────────────────────────────── */
  if (stage === 6) return (
    <div className="min-h-screen bg-amber-50 text-slate-800 flex items-center justify-center p-6 relative select-none font-sans overflow-hidden">
      {/* Quit button always turns red when hovered over */}
      <button
        onClick={() => setShowQuitConfirm(true)}
        className="absolute top-6 right-6 text-sm tracking-widest uppercase bg-slate-900 hover:bg-red-600 text-slate-100 hover:text-white px-6 py-2.5 rounded-lg border border-slate-700 hover:border-red-600 transition-all font-bold z-50 shadow-lg hover:scale-105 active:scale-95"
      >
        Quit
      </button>

      <canvas
        ref={confettiRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      <div className="relative z-10 bg-amber-300 border-4 border-amber-500 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-5">
        <div className="text-6xl animate-bounce">🏆</div>
        <div>
          <h1 className="text-3xl font-extrabold text-amber-950 tracking-wide uppercase">
            YOU WIN!
          </h1>
          <p className="text-amber-900 font-medium text-sm mt-1 font-sans">
            Phenomenal performance.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3 mt-2">
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter username for Global Leaderboard"
            className="w-full px-4 py-3 rounded-lg border-2 border-amber-500 bg-amber-55 text-slate-800 font-medium text-center focus:outline-none focus:border-amber-600 transition-colors bg-amber-50"
          />
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 bg-amber-950 hover:bg-amber-900 text-amber-100 font-extrabold text-base rounded-lg tracking-wider uppercase transition-colors shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Submit to Global Leaderboard
          </button>
        </div>
      </div>
      {quitConfirmPopup}
    </div>
  );

  /* ── Stage 7: The Final Betrayal (Matches Home screen aesthetic perfectly) ── */
  if (stage === 7) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-amber-900 font-serif selection:bg-amber-100 relative select-none">
      {/* Big Golden Border near the edge of the screen */}
      <div className="absolute inset-4 sm:inset-6 md:inset-10 border-double border-8 border-amber-600 bg-white pointer-events-none z-0" />

      <div className="max-w-xl w-full px-8 py-12 text-center relative z-10 flex flex-col items-center">
        <img
          src={END_SCREEN_LAUGH_GIF}
          alt="Laughing Guy"
          style={{
            width: END_GIF_WIDTH,
            height: END_GIF_HEIGHT,
            marginBottom: END_GIF_MARGIN_BOTTOM,
            objectFit: 'contain',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.5)',
          }}
        />
        <p className="tracking-[0.45em] uppercase text-amber-700 text-xs mb-6 font-bold">
          Labor Concluded
        </p>
        <div className="w-16 h-[2px] bg-amber-600 mx-auto mb-6" />
        <p className="text-slate-700 text-base md:text-lg leading-loose max-w-lg mb-8 italic">
          You spent {finalTime.m} minutes and {finalTime.s} seconds doing this.{' '}
          You failed {finalFails} times overall across all levels.{' '}
          The prize was the realization of your own stubbornness.{' '}
          There is no database.{' '}
          {savedName} was not saved.{' '}
          Please close the tab.
        </p>
        <button
          onClick={handleQuit}
          className="px-12 py-3.5 bg-transparent border-2 border-amber-600 text-amber-800 hover:text-white hover:bg-amber-600 tracking-[0.35em] text-xs uppercase cursor-pointer transition-all duration-300 font-bold shadow-[0_0_15px_rgba(217,119,6,0.1)] hover:shadow-[0_0_25px_rgba(217,119,6,0.3)]"
        >
          Start Anew
        </button>
      </div>
    </div>
  );

  return null;
};

export default SisyphusSuite;
