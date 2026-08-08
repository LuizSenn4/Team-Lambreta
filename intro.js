const introScreen = document.getElementById("introScreen");
const enterBtn = document.getElementById("enterBtn");
const loadingArea = document.getElementById("loadingArea");
const loadingBar = document.getElementById("loadingBar");
const loadingText = document.getElementById("loadingText");
const loadingPercent = document.getElementById("loadingPercent");
const steps = document.querySelectorAll(".step");
const enterBox = document.querySelector(".enter-box");
const motto = document.querySelector(".intro-motto");

const mensagens = [
  "VERIFICANDO EQUIPE...",
  "SINCRONIZANDO DADOS...",
  "CARREGANDO RECURSOS...",
  "CONECTANDO SERVIDORES...",
  "PREPARANDO VITÓRIA..."
];

function activateSteps(index) {
  steps.forEach((step, i) => {
    if (i <= index) step.classList.add("active");
    else step.classList.remove("active");
  });
}

enterBtn.addEventListener("click", () => {
  enterBox.style.display = "none";
  if (motto) motto.style.display = "none";
  loadingArea.style.display = "block";
  loadingText.textContent = mensagens[0];
  activateSteps(0);

  let progresso = 0;
  let msgIndex = 0;

  const timer = setInterval(() => {
    progresso += 2;
    loadingBar.style.width = progresso + "%";
    loadingPercent.textContent = progresso + "%";

    const newIndex = Math.min(Math.floor((progresso - 1) / 20), mensagens.length - 1);

    if (newIndex !== msgIndex) {
      msgIndex = newIndex;
      loadingText.textContent = mensagens[msgIndex];
      activateSteps(msgIndex);
    }

    if (progresso >= 100) {
      clearInterval(timer);
      loadingText.textContent = "BEM-VINDO AO TEAM LAMBRETA!";
      activateSteps(4);

      setTimeout(() => {
        introScreen.classList.add("hide");

        setTimeout(() => {
          window.location.href = "home.html";
        }, 850);
      }, 350);
    }
  }, 100);
});



/* STARFIELD: sobe sem fim + reage suave ao cursor/toque */
const starCanvas = document.getElementById("starfield");
const starCtx = starCanvas ? starCanvas.getContext("2d") : null;
let stars = [];
let starAnimId = null;
let pointerX = 0;
let pointerY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;

function resizeStarfield() {
  if (!starCanvas || !starCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = starCanvas.getBoundingClientRect();
  starCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  starCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildStars(Math.max(90, Math.floor((rect.width * rect.height) / 11000)));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function buildStars(count) {
  if (!starCanvas) return;
  const w = starCanvas.clientWidth;
  const h = starCanvas.clientHeight;
  stars = Array.from({ length: count }, () => {
    const layer = Math.random();
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.6, layer > 0.72 ? 2.1 : 1.5),
      speed: rand(0.12, layer > 0.72 ? 0.85 : 0.45),
      alpha: rand(0.35, 1),
      twinkle: rand(0.01, 0.05),
      phase: rand(0, Math.PI * 2),
      layer
    };
  });
}

function drawStarfield() {
  if (!starCanvas || !starCtx) return;
  const w = starCanvas.clientWidth;
  const h = starCanvas.clientHeight;
  starCtx.clearRect(0, 0, w, h);

  pointerX += (pointerTargetX - pointerX) * 0.06;
  pointerY += (pointerTargetY - pointerY) * 0.06;

  const parallaxX = pointerX * 18;
  const parallaxY = pointerY * 10;

  for (const s of stars) {
    s.y -= s.speed;
    if (s.y < -6) {
      s.y = h + 6;
      s.x = rand(0, w);
    }

    s.phase += s.twinkle;
    const glow = (Math.sin(s.phase) + 1) / 2;
    const alpha = Math.min(1, s.alpha * (0.62 + glow * 0.55));

    const offsetX = parallaxX * s.layer;
    const offsetY = parallaxY * s.layer;

    const x = s.x + offsetX;
    const y = s.y + offsetY;

    // brilho principal
    starCtx.beginPath();
    starCtx.fillStyle = `rgba(255, 230, 150, ${alpha})`;
    starCtx.arc(x, y, s.r, 0, Math.PI * 2);
    starCtx.fill();

    // brilho secundário leve com tons verde/vermelho misturados
    starCtx.beginPath();
    const mix = s.layer > 0.5 ? `rgba(130,255,80,${alpha * 0.12})` : `rgba(255,70,90,${alpha * 0.10})`;
    starCtx.fillStyle = mix;
    starCtx.arc(x, y, s.r * 2.8, 0, Math.PI * 2);
    starCtx.fill();
  }

  starAnimId = requestAnimationFrame(drawStarfield);
}

function setPointerFromEvent(clientX, clientY) {
  if (!starCanvas) return;
  const rect = starCanvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width - 0.5) * 2;
  const ny = ((clientY - rect.top) / rect.height - 0.5) * 2;
  pointerTargetX = Math.max(-1, Math.min(1, nx));
  pointerTargetY = Math.max(-1, Math.min(1, ny));
}

if (starCanvas && starCtx) {
  resizeStarfield();
  drawStarfield();

  window.addEventListener("resize", resizeStarfield);

  window.addEventListener("mousemove", (e) => {
    setPointerFromEvent(e.clientX, e.clientY);
  });

  window.addEventListener("mouseleave", () => {
    pointerTargetX = 0;
    pointerTargetY = 0;
  });

  window.addEventListener("touchmove", (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    setPointerFromEvent(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener("touchend", () => {
    pointerTargetX = 0;
    pointerTargetY = 0;
  }, { passive: true });

  window.addEventListener("beforeunload", () => {
    if (starAnimId) cancelAnimationFrame(starAnimId);
  });
}
