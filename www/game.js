/* METEOR DODGE — lightweight canvas arcade game, no external dependencies */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("gameScore");
const livesEl = document.getElementById("gameLives");
const startOverlay = document.getElementById("startOverlay");
const overOverlay = document.getElementById("overOverlay");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const finalScoreEl = document.getElementById("finalScore");
const highScoreEl = document.getElementById("highScoreDisplay");
const startHighScoreEl = document.getElementById("startHighScore");

const W = canvas.width;
const H = canvas.height;

const HIGH_SCORE_KEY = "soraGameHighScore";
const keys = {};

let player, meteors, hearts, score, lives, speedFactor;
let running = false;
let lastSpawn = 0;
let lastHeartSpawn = 0;
let invulnerableUntil = 0;
let lastTime = 0;
let animFrameId = null;

/* HIGH SCORE (stored locally on this device) */
function getHighScore() {
  return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
}
function setHighScore(value) {
  localStorage.setItem(HIGH_SCORE_KEY, String(value));
}
startHighScoreEl.textContent = getHighScore();

/* SETUP */
function resetGame() {
  player = { x: W / 2, y: H - 70, r: 14 };
  meteors = [];
  hearts = [];
  score = 0;
  lives = 3;
  speedFactor = 1;
  lastSpawn = 0;
  lastHeartSpawn = 0;
  invulnerableUntil = 0;
  lastTime = performance.now();
}

function updateHud() {
  scoreEl.textContent = Math.floor(score);
  const filled = "♥".repeat(lives);
  const empty = "<span class='dimHeart'>" + "♥".repeat(3 - lives) + "</span>";
  livesEl.innerHTML = filled + empty;
}

/* POINTER CONTROL — works for mouse drag and touch drag alike */
function setPlayerX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scale = W / rect.width;
  const x = (clientX - rect.left) * scale;
  player.x = Math.max(player.r, Math.min(W - player.r, x));
}

canvas.addEventListener("mousemove", (e) => {
  if (running) setPlayerX(e.clientX);
});

canvas.addEventListener("touchmove", (e) => {
  if (running && e.touches[0]) setPlayerX(e.touches[0].clientX);
  e.preventDefault();
}, { passive: false });

/* KEYBOARD CONTROL */
window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

/* SPAWNING */
function spawnMeteor() {
  const r = 10 + Math.random() * 14;
  meteors.push({
    x: r + Math.random() * (W - 2 * r),
    y: -r,
    r,
    speed: (1.6 + Math.random() * 1.2) * speedFactor
  });
}

function spawnHeart() {
  const r = 12;
  hearts.push({
    x: r + Math.random() * (W - 2 * r),
    y: -r,
    r,
    speed: 2 * speedFactor
  });
}

/* MAIN LOOP */
function loop(now) {
  if (!running) return;

  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  // keyboard nudge
  const moveSpeed = 0.55 * dt;
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    player.x = Math.max(player.r, player.x - moveSpeed);
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    player.x = Math.min(W - player.r, player.x + moveSpeed);
  }

  // score ramps up over time, which also ramps up difficulty
  score += dt * 0.01;
  speedFactor = 1 + score * 0.012;

  lastSpawn += dt;
  const spawnInterval = Math.max(380, 900 - score * 6);
  if (lastSpawn > spawnInterval) {
    spawnMeteor();
    lastSpawn = 0;
  }

  lastHeartSpawn += dt;
  if (lastHeartSpawn > 3200) {
    spawnHeart();
    lastHeartSpawn = 0;
  }

  meteors.forEach(m => { m.y += m.speed * dt * 0.08; });
  hearts.forEach(h => { h.y += h.speed * dt * 0.08; });

  meteors = meteors.filter(m => m.y - m.r < H);
  hearts = hearts.filter(h => h.y - h.r < H);

  // meteor collisions (ignored briefly after getting hit)
  if (performance.now() > invulnerableUntil) {
    for (const m of meteors) {
      const dx = m.x - player.x;
      const dy = m.y - player.y;
      if (Math.hypot(dx, dy) < m.r + player.r - 4) {
        loseLife();
        break;
      }
    }
  }

  // heart pickups
  hearts = hearts.filter(h => {
    const dx = h.x - player.x;
    const dy = h.y - player.y;
    if (Math.hypot(dx, dy) < h.r + player.r) {
      score += 15;
      return false;
    }
    return true;
  });

  draw();
  updateHud();

  if (running) animFrameId = requestAnimationFrame(loop);
}

function loseLife() {
  lives -= 1;
  invulnerableUntil = performance.now() + 900;
  meteors = []; // clear the screen so the player gets a breather
  if (lives <= 0) endGame();
}

/* RENDER */
function draw() {
  ctx.clearRect(0, 0, W, H);

  // meteors
  ctx.fillStyle = "#9a9aa3";
  meteors.forEach(m => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // hearts
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  hearts.forEach(h => {
    ctx.fillText("💗", h.x, h.y);
  });

  // player (flashes while briefly invulnerable after a hit)
  const flashing = performance.now() < invulnerableUntil && Math.floor(performance.now() / 100) % 2 === 0;
  ctx.globalAlpha = flashing ? 0.3 : 1;
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 12;
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

/* GAME STATE */
function startGame() {
  resetGame();
  running = true;
  startOverlay.classList.add("hidden");
  overOverlay.classList.add("hidden");
  updateHud();
  lastTime = performance.now();
  animFrameId = requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const finalScore = Math.floor(score);
  const best = Math.max(finalScore, getHighScore());
  setHighScore(best);

  finalScoreEl.textContent = finalScore;
  highScoreEl.textContent = best;
  overOverlay.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
