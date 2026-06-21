# 🏛️ The Sisyphus Suite

> *"One must imagine Sisyphus happy." — The labor is complete, yet the mountain remains.*

**The Sisyphus Suite** is a gloriously useless, actively hostile collection of mini-games built specifically to frustrate, mislead, and ultimately betray the player. It is a psychological experiment in expectation subversion disguised as a web application.

This project was built from scratch in under 2 hours for the inaugural **Banao Build Weekend** in Pakistan.

## 🏆 Context: Banao Build Weekend
This application was created for the Banao community's first build jam. 
* **The Theme:** Build something gloriously useless. The more pointless, fun, and cursed, the better. No real-world value required.
* **The Constraints:** ~2 hours of asynchronous build time over a single weekend.
* **The Goal:** Make something stupid, be creative, and have fun.

## 🎭 The Gauntlet (Features) ⚠️ Contains Spoilers
Players are subjected to a multi-stage gauntlet of awful UI paradigms and broken game mechanics.

* **Stage 1: The Unforgiving Slider** — A raw HTML range slider that demands the player hit *exactly* `50.00`. Anything else triggers a reset.
* **Stage 2: The Evasive Button** — A simple confirmation button that actively teleports away from the cursor. You might be able to catch it if you're fast enough. Failure triggers a mocking laughter.
* **Stage 3: Invisible Flappy Bird** — A physics-based side-scroller where the bird is visible, but all obstacles and boundaries are completely invisible. Players must survive 5 seconds entirely blind. Failure triggers a mocking laughter.
* **Stage 4: Reverse Pong** — A game of classic Pong controlled by a vertical slider. But there's a twist, its single player. The player is conditioned to keep the ball alive, but the *only* way to advance is to intentionally let the ball pass the paddle. 
* **Stage 5: The Deceptive Crossword** — A grid of jumbled letters. The win condition isn't finding a word; it's waiting for an unassuming "Next" arrow to slowly fade into existence over a full 60 seconds, or even by actually clicking 'WORD'.
* **The Grand Finale** — After demanding a username for the "Global Leaderboard," the game reveals its ultimate punchline: there is no database. Nothing was saved. The player's time was wasted.

## 🛠️ Tech Stack & Tools
Built for speed, resilience, and maximum chaos within the 2-hour hackathon limit.

* **Framework:** React 19
* **Build Tool:** Vite
* **Language:** TypeScript
* **Styling:** Tailwind CSS (v3)
* **Game Engine:** Native HTML5 `<canvas>` API with custom JavaScript `requestAnimationFrame` physics loops (used for Flappy Bird and Pong).
* **State Management:** React Hooks (`useState`, `useEffect`, `useRef`) for orchestrating stage transitions, timers, and the global "pity" system.

## 🧠 Design Choices & Philosophy
1. **The "Pity" Mechanic:** To prevent players from completely soft-locking or rage-quitting before the punchline, a hidden failure counter tracks every mistake. If a player fails too many times (e.g., 50 times on the slider), the game mocks them and auto-advances them to the next stage.
2. **Deceptive Aesthetics:** The app starts and ends with a minimalist, high-end, Ancient Greek aesthetic to contrast sharply with the brutalist, broken UI of the actual games.
3. **Audio Warfare:** Carefully timed audio cues (laugh tracks, jarring error noises) compound the frustration of failing mechanically simple tasks.
4. **Single-Component Architecture:** Given the 2-hour jam constraint, the entire suite is engineered as a massive, standalone React component (`SisyphusSuite.tsx`). This allowed for rapid prototyping without the overhead of complex routing or state-sharing libraries.

## 🚀 To Play

**Visit:** sisyphus-suite.vercel.app
