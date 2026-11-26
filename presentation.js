(() => {
  "use strict";

  const deck = document.querySelector("#deck");
  const slides = [...deck.querySelectorAll(".slide")];
  const links = [...document.querySelectorAll(".deck-dots a")];
  const previous = document.querySelector("#previous");
  const next = document.querySelector("#next");
  const count = document.querySelector("#slide-count");
  const motion = document.querySelector("#motion");
  const fullscreen = document.querySelector("#fullscreen");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 3100;
  let animationEnabled = !preference.matches;
  let active = -1;
  let frame = 0;
  let draw = null;
  let progress = 1;

  function chartView(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const samples = Array.from({ length: 100 }, (_, index) => {
      const shift = index < 23 ? 0 : index < 52 ? .28 : index < 73 ? -.15 : .11;
      return [
        .41 + shift + .11 * Math.sin(index * .29) + .033 * Math.sin(index * 1.77),
        .64 - shift * .9 + .075 * Math.cos(index * .19) + .027 * Math.cos(index * 1.21),
      ];
    });
    return fraction => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(w * ratio), pixelHeight = Math.round(h * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const top = 26, bottom = h - 30, left = 44, right = w - 15;
      const width = right - left, height = bottom - top;
      if (width <= 1 || height <= 1) return;

      ctx.font = "12px system-ui, sans-serif";
      ctx.fillStyle = "#cfdbd1";
      ctx.fillText("Тереңдік, м", left, 15);
      ctx.strokeStyle = "#c4ded629";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const y = top + height * i / 6;
        ctx.fillText(String(i * 10), 7, y + 4);
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        const x = left + width * i / 6;
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      ctx.stroke();

      const reveal = Math.min(1, .05 + fraction * .95);
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top - 2, width, height * reveal + 2);
      ctx.clip();
      ["#f9b66a", "#88e0c2"].forEach((color, track) => {
        ctx.beginPath();
        samples.forEach((values, i) => {
          const x = left + width * (track + values[track]) / 2;
          const y = top + height * i / (samples.length - 1);
          ctx[i ? "lineTo" : "moveTo"](x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();
      if (fraction < 1) {
        const y = top + height * reveal;
        ctx.fillStyle = "#bfe9d854";
        ctx.fillRect(left, y, width, 1);
      }
    };
  }

  function slideView(slide) {
    const canvas = slide.querySelector("canvas");
    if (!canvas) return null;
    if (canvas.hasAttribute("data-chart")) return chartView(canvas);
    const model = window.GeoKMG3D?.createView(canvas, canvas.dataset.model);
    if (!model) return null;
    const yaw = Number(canvas.dataset.yaw);
    const pitch = Number(canvas.dataset.pitch);
    return fraction => {
      const distance = 1 - fraction;
      model(yaw - distance * .73, pitch + distance * .21, 1 - distance * .09);
    };
  }

  function stopFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function play() {
    stopFrame();
    const slide = slides[active];
    slide.classList.remove("entering");
    if (animationEnabled) {
      void slide.offsetWidth;
      slide.classList.add("entering");
    }
    progress = animationEnabled && draw ? 0 : 1;
    draw?.(progress);
    if (!animationEnabled || !draw) return;
    const start = performance.now();
    function animate(time) {
      const t = Math.min(1, (time - start) / duration);
      progress = 1 - (1 - t) ** 2;
      draw(progress);
      frame = t < 1 ? requestAnimationFrame(animate) : 0;
    }
    frame = requestAnimationFrame(animate);
  }

  function show(index) {
    if (active === index) return;
    active = index;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    links.forEach((link, i) => {
      if (i === active) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    previous.disabled = active === 0;
    next.disabled = active === slides.length - 1;
    count.value = `${active + 1} / ${slides.length}`;
    draw = slideView(slides[active]);
    play();
  }

  function navigate(index) {
    if (index < 0 || index >= slides.length || index === active) return;
    location.hash = String(index + 1);
  }

  function readHash() {
    const match = location.hash.match(/^#([1-5])$/);
    show(match ? Number(match[1]) - 1 : 0);
  }

  function setMotion(enabled) {
    animationEnabled = enabled;
    document.body.dataset.motion = enabled ? "on" : "off";
    motion.textContent = enabled ? "Анимацияны тоқтату" : "Анимацияны қосу";
    if (active >= 0) play();
  }

  previous.addEventListener("click", () => navigate(active - 1));
  next.addEventListener("click", () => navigate(active + 1));
  window.addEventListener("hashchange", readHash);
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      navigate(active + 1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      navigate(active - 1);
    }
  });

  motion.hidden = false;
  motion.addEventListener("click", () => setMotion(!animationEnabled));
  preference.addEventListener("change", event => setMotion(!event.matches));
  if (document.fullscreenEnabled) {
    fullscreen.hidden = false;
    fullscreen.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        fullscreen.hidden = true;
      }
    });
    document.addEventListener("fullscreenchange", () => {
      fullscreen.setAttribute("aria-label", document.fullscreenElement ? "Толық экраннан шығу" : "Толық экранға өту");
    });
  }

  new ResizeObserver(() => draw?.(progress)).observe(deck);
  setMotion(animationEnabled);
  readHash();
})();
