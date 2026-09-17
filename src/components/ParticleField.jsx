import { useEffect, useRef } from "react";

/*
 * Ambient canvas background for the auth/landing page: a faint field of
 * slowly-drifting dots, with thin lines connecting nearby ones. Purely
 * decorative -- aria-hidden, pointer-events: none, and it must never be
 * mistaken for something the page is waiting on, so it draws a single
 * static frame immediately and only starts animating after that.
 */

const DOT_COUNT = 55;
const MAX_LINK_DISTANCE = 160;
// --gold (#dda622) as an rgb() triple, so opacity can vary per draw call.
const DOT_COLOR_RGB = "221, 166, 34";
const DOT_RADIUS = 2.4;
const DOT_OPACITY = 0.6;
// Lines are fainter than the dots themselves -- ambient texture only.
const LINE_OPACITY = 0.24;
// Pixels per animation frame (~60fps) -- gentle but noticeable drift.
const DRIFT_SPEED = 0.14;
const MAX_DPR = 2;

function createDots(width, height, count) {
  const dots = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;

    dots.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * DRIFT_SPEED,
      vy: Math.sin(angle) * DRIFT_SPEED,
    });
  }

  return dots;
}

export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;

    if (!canvas || !container) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return undefined;
    }

    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let width = 0;
    let height = 0;
    let dots = [];
    let frameId = null;

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Reseeding on resize (rather than rescaling existing positions) is
      // simplest and correct for both a window resize and a mobile
      // orientation change.
      dots = createDots(width, height, DOT_COUNT);
      draw();
    }

    function step(dot) {
      dot.x += dot.vx;
      dot.y += dot.vy;

      if (dot.x <= 0 || dot.x >= width) dot.vx *= -1;
      if (dot.y <= 0 || dot.y >= height) dot.vy *= -1;

      dot.x = Math.min(Math.max(dot.x, 0), width);
      dot.y = Math.min(Math.max(dot.y, 0), height);
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Lines first so the dots sit visually on top of them.
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < MAX_LINK_DISTANCE) {
            const fade = 1 - distance / MAX_LINK_DISTANCE;

            ctx.strokeStyle = `rgba(${DOT_COLOR_RGB}, ${(
              LINE_OPACITY * fade
            ).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = `rgba(${DOT_COLOR_RGB}, ${DOT_OPACITY})`;
      ctx.shadowColor = `rgba(${DOT_COLOR_RGB}, 0.9)`;
      ctx.shadowBlur = 6;

      for (const dot of dots) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    function animate() {
      for (const dot of dots) {
        step(dot);
      }

      draw();
      frameId = requestAnimationFrame(animate);
    }

    function startIfMotionAllowed() {
      if (!reduceMotionQuery.matches && frameId === null) {
        frameId = requestAnimationFrame(animate);
      }
    }

    function stopAnimation() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    }

    // Always draws one static frame (inside resize()); only starts the
    // drift loop when the visitor hasn't asked for reduced motion.
    resize();
    startIfMotionAllowed();

    function handleResize() {
      resize();
    }

    function handleMotionPreferenceChange(event) {
      if (event.matches) {
        stopAnimation();
        draw();
      } else {
        startIfMotionAllowed();
      }
    }

    window.addEventListener("resize", handleResize);

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener(
        "change",
        handleMotionPreferenceChange
      );
    }

    return () => {
      window.removeEventListener("resize", handleResize);

      if (reduceMotionQuery.removeEventListener) {
        reduceMotionQuery.removeEventListener(
          "change",
          handleMotionPreferenceChange
        );
      }

      stopAnimation();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="auth-particle-field"
      aria-hidden="true"
    />
  );
}
