/* Offline perspective renderer for the three GeoKMG teaching models. */
(() => {
  "use strict";

  const colors = {
    latyshova: { cover: "#8e9f70", sandstone: "#d6a36a", clay: "#576d74", well: "#f4e0a4" },
    kuznetsov: { core: "#dfb575", flank: "#b47c59", platform: "#6c988b" },
    baraboshkin: { sand: "#d8b878", silt: "#9eaa80", water: "#478b97" },
  };

  function mesh() {
    const faces = [];
    const lines = [];
    const face = (points, color, edge = null, onSurface = false) => {
      const [a, b, c] = points;
      const u = b.map((v, i) => v - a[i]);
      const v = c.map((v, i) => v - a[i]);
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const length = Math.hypot(...normal);
      if (length > 0.00001) faces.push({ points, color, normal: normal.map(n => n / length), edge, onSurface });
    };
    const line = (points, color, width, normal) => lines.push({ points, color, width, normal });

    function box(x0, x1, y0, y1, z0, z1, color) {
      const a = [x0, y0, z0], b = [x1, y0, z0], c = [x1, y0, z1], d = [x0, y0, z1];
      const e = [x0, y1, z0], f = [x1, y1, z0], g = [x1, y1, z1], h = [x0, y1, z1];
      const edge = "rgba(31, 42, 36, .19)";
      for (const points of [[e, h, g, f], [a, b, c, d], [a, e, f, b], [d, c, g, h], [a, d, h, e], [b, f, g, c]]) {
        face(points, color, edge);
      }
    }
    return { faces, lines, face, line, box };
  }

  function surface(model, xExtent, zExtent, nx, nz, height, shade, side, bottom) {
    const coords = (a, b) => [a * 2 * xExtent / nx - xExtent, b * 2 * zExtent / nz - zExtent];
    const point = (a, b) => {
      const [x, z] = coords(a, b);
      return [x, height(x, z), z];
    };
    const base = ([x, , z]) => [x, bottom, z];

    for (let a = 0; a < nx; a++) {
      for (let b = 0; b < nz; b++) {
        const [x, z] = coords(a + 0.5, b + 0.5);
        const p = point(a, b), q = point(a, b + 1);
        const r = point(a + 1, b + 1), s = point(a + 1, b);
        const color = shade(x, z, a, b);
        model.face([p, q, r], color);
        model.face([p, r, s], color);
        if (a === 0) model.face([base(p), base(q), q, p], side);
        if (a === nx - 1) model.face([base(r), base(s), s, r], side);
        if (b === 0) model.face([base(s), base(p), p, s], side);
        if (b === nz - 1) model.face([base(q), base(r), r, q], side);
      }
    }
  }

  function wellSection() {
    const { cover, sandstone, clay, well } = colors.latyshova;
    const model = mesh();
    const layers = [
      [-1.14, -0.80, "#78857f"],
      [-0.80, -0.36, sandstone],
      [-0.36, -0.06, clay],
      [-0.06, 0.35, "#ba8c5d"],
      [0.35, 0.69, cover],
    ];
    for (const [bottom, top, color] of layers) {
      model.box(-2.2, 2.2, bottom, top, -1.45, 1.45, color);
      for (let i = 0; i < 8; i++) {
        const x = -2 + i * 0.53;
        const y = bottom + (top - bottom) * (i % 2 ? 0.35 : 0.68);
        model.line([[x, y, 1.456], [x + 0.28, y + 0.025, 1.456]], "rgba(240, 226, 195, .34)", 1, [0, 0, 1]);
      }
      // Show the borehole trace on the exposed section.
      model.line([[0.40, top, 1.459], [0.40, bottom, 1.459]], "#253d39", 6, [0, 0, 1]);
      model.line([[0.40, top, 1.462], [0.40, bottom, 1.462]], well, 2.5, [0, 0, 1]);
    }
    model.box(0.26, 0.54, 0.69, 0.78, 1.15, 1.45, "#465b57");
    model.box(0.35, 0.45, 0.78, 1.19, 1.25, 1.36, well);
    model.box(0.30, 0.50, 1.11, 1.24, 1.20, 1.41, "#334e4a");
    return model;
  }

  function reefSection() {
    const { core, flank, platform } = colors.kuznetsov;
    const model = mesh();
    const radius = (x, z) => Math.hypot((x + 0.40) / 1.65, (z - 0.05) / 1.30);
    const height = (x, z) => -0.34 + 1.53 * Math.exp(-2.2 * radius(x, z) ** 2)
      + 0.06 * Math.sin(x * 10) * Math.cos(z * 11) * Math.max(0.12, 1 - radius(x, z) / 2);
    model.box(-2.25, 2.25, -1.13, -0.77, -1.6, 1.6, "#617f76");
    model.box(-2.25, 2.25, -0.77, -0.49, -1.6, 1.6, "#b6a481");
    surface(model, 2.25, 1.6, 18, 14, height, (x, z) => {
      const distance = radius(x, z);
      return distance < 0.55 ? core : distance < 1.03 ? flank : platform;
    }, "#ad9870", -0.49);
    return model;
  }

  function deltaSection() {
    const { sand, silt, water } = colors.baraboshkin;
    const model = mesh();
    const height = (x, z) => {
      const reach = Math.max(0, Math.min(1, (z + 1.48) / 3.2));
      return 0.60 - reach * 0.94 + 0.11 * Math.cos(x * 1.45) * (1 - reach)
        + 0.035 * Math.cos(z * 6 + x * 3);
    };
    model.box(-2.25, 2.25, -1.13, -0.80, -1.7, 1.7, "#657e72");
    model.box(-2.25, 2.25, -0.80, -0.58, -1.7, 1.7, "#c49b62");
    surface(model, 2.25, 1.7, 19, 15, height, (x, z) => {
      const fan = 0.27 + Math.max(0, z + 1.1) * 0.67;
      const shore = 1.03 - Math.abs(x) * 0.36;
      if (z > shore) return water;
      return Math.abs(x + 0.12) < fan ? sand : silt;
    }, "#a69271", -0.58);

    const river = z => 0.13 * Math.sin(z * 2.9) - 0.12;
    function channel(start, end, center, width) {
      const points = z => {
        const x = center(z), spread = width(z);
        return [x - spread, x + spread].map(v => [v, height(v, z) + 0.028, z]);
      };
      for (let i = 0; i < 24; i++) {
        const [a, b] = points(start + (end - start) * i / 24);
        const [d, c] = points(start + (end - start) * (i + 1) / 24);
        model.face([a, d, c, b], "#367d8d", null, true);
      }
    }
    channel(-1.7, 1.58, river, z => 0.085 + 0.029 * (z + 1.7));
    channel(-0.37, 1.33, z => river(z) - 1.03 * ((z + 0.37) / 1.7) ** 1.2, () => 0.069);
    channel(-0.55, 1.32, z => river(z) + 1.08 * ((z + 0.55) / 1.87) ** 1.15, () => 0.075);
    return model;
  }

  const geometry = {
    latyshova: wellSection(),
    kuznetsov: reefSection(),
    baraboshkin: deltaSection(),
  };

  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);

  const terrains = [
    {
      round: 0.95,
      height(u, v) {
        return -0.24 + 1.62 * Math.exp(-3.45 * ((u + 0.11) ** 2 + v ** 2))
          + 0.065 * Math.cos(u * 17 + v * 5) * Math.cos(v * 19);
      },
      color(u, v) {
        const r = Math.hypot(u + 0.11, v) + 0.075 * Math.sin(u * 19 + v * 7);
        return r < 0.41 ? "#e1bc80" : r < 0.68 ? "#b7825b" : r < 0.86 ? "#8e9470" : "#62998b";
      },
      strata: ["#405e57", "#789184", "#b79b72", "#9f8a66", "#bc9b6c"],
    },
    {
      round: 0.30,
      height(u, v) {
        const inland = (1 - v) / 2;
        return -0.36 + 0.99 * inland + 0.11 * Math.cos(u * 2.5) * inland
          + 0.038 * Math.cos(v * 12.0 + u * 7);
      },
      color(u, v) {
        const stem = -0.12 + 0.11 * Math.sin(v * 4);
        const branch = Math.max(0, v + 0.35);
        const water = v > 0.52 + 0.12 * Math.cos(u * 4)
          || Math.abs(u - stem) < 0.065
          || (v > -0.35 && Math.min(Math.abs(u - stem - branch * 0.64),
            Math.abs(u - stem + branch * 0.59)) < 0.057);
        if (water) return v > 0.53 ? "#5299a1" : "#397e8c";
        return Math.abs(u - stem) < 0.29 + branch * 0.52 ? "#d7b478" : "#919c70";
      },
      strata: ["#4f6859", "#85916f", "#b69b6e", "#ddba86", "#ad9c73"],
    },
    {
      round: 0,
      height(u, v) {
        return 0.61 + 0.055 * Math.cos(u * 6) * Math.sin(v * 7);
      },
      color(u, v) {
        return Math.cos(u * 8 + v) + Math.sin(v * 7) > 0.64 ? "#97a67d" : "#829574";
      },
      strata: ["#758378", "#bf955e", "#536a73", "#c68f5c", "#9ca57d"],
    },
  ];

  function landscapeFrame(terrain) {
    const columns = 28, rows = 22;
    const levels = [0, 0.19, 0.40, 0.56, 0.80, 1];
    const coordinate = (column, row) => [column * 2 / columns - 1, row * 2 / rows - 1];
    const terrainPoint = (column, row, level) => {
      const [u, v] = coordinate(column, row);
      const x = u * 2.15 * mix(1, Math.sqrt(1 - v * v / 2), terrain.round);
      const z = v * 1.57 * mix(1, Math.sqrt(1 - u * u / 2), terrain.round);
      const y = mix(-1.23, terrain.height(u, v), levels[level]);
      return [x, y, z];
    };

    const grid = Array.from({ length: columns + 1 }, (_, column) =>
      Array.from({ length: rows + 1 }, (_, row) => levels.map((_, level) => terrainPoint(column, row, level)))
    );
    const faces = [];
    const add = (points, color) => faces.push({ points, color });
    const top = levels.length - 1;
    for (let a = 0; a < columns; a++) {
      for (let b = 0; b < rows; b++) {
        const [u, v] = coordinate(a + 0.5, b + 0.5);
        const color = terrain.color(u, v);
        const p = grid[a][b][top], q = grid[a][b + 1][top];
        const r = grid[a + 1][b + 1][top], s = grid[a + 1][b][top];
        add([p, q, r], color);
        add([p, r, s], color);
      }
    }

    function side(a, b) {
      for (let n = 0; n < top; n++) {
        add([a[n], b[n], b[n + 1], a[n + 1]], terrain.strata[n]);
      }
    }

    for (let a = 0; a < columns; a++) {
      side(grid[a + 1][0], grid[a][0]);
      side(grid[a][rows], grid[a + 1][rows]);
    }
    for (let b = 0; b < rows; b++) {
      side(grid[0][b], grid[0][b + 1]);
      side(grid[columns][b + 1], grid[columns][b]);
    }
    return faces;
  }

  let terrainFrames;
  function blendColor(a, b, fraction) {
    if (a === b || fraction === 0) return a;
    if (fraction === 1) return b;
    const start = parseInt(a.slice(1), 16), end = parseInt(b.slice(1), 16);
    return "#" + [16, 8, 0].map(shift =>
      Math.round(mix(start >> shift & 255, end >> shift & 255, fraction)).toString(16).padStart(2, "0")
    ).join("");
  }

  function morphTerrain(progress) {
    terrainFrames ??= terrains.map(landscapeFrame);
    const position = progress * 2;
    const start = Math.min(1, Math.floor(position));
    const fraction = ease(position - start);
    const from = terrainFrames[start], to = terrainFrames[start + 1];
    const model = mesh();
    from.forEach(({ points, color }, i) => {
      const ending = to[i];
      const corners = points.map((point, j) => point.map((value, axis) =>
        mix(value, ending.points[j][axis], fraction)
      ));
      model.face(corners, blendColor(color, ending.color, fraction));
    });

    // The well becomes visible as the delta flattens into a rock section.
    const growth = ease(clamp((position - 1.54) / 0.46, 0, 1));
    if (growth > 0.015) {
      const x = 0.50, z = 1.575;
      const top = mix(terrains[1].height(x / 2.15, 1), terrains[2].height(x / 2.15, 1), fraction);
      const pipeTop = top + growth * 0.46;
      model.box(x - 0.065, x + 0.065, top, pipeTop, z - 0.082, z + 0.014, "#f4d494");
      model.box(x - 0.12, x + 0.12, pipeTop - 0.06 * growth, pipeTop + 0.025 * growth, z - 0.115, z + 0.035, "#587d70");
      const bottom = mix(top, -1.2, growth);
      for (let i = 0; i < 6; i++) {
        const low = mix(bottom, top, i / 6), high = mix(bottom, top, (i + 1) / 6);
        model.line([[x, low, z + 0.012], [x, high, z + 0.012]], "#f1d58f", 2.7, [0, 0, 1]);
      }
    }
    model.shadow = true;
    return model;
  }

  function tinted(hex, multiplier) {
    const value = parseInt(hex.slice(1), 16);
    const channels = [value >> 16, value >> 8 & 255, value & 255];
    return "rgb(" + channels.map(v => Math.round(Math.min(255, v * multiplier))).join(",") + ")";
  }

  const ceiling = 1.50;
  const distance = 9;
  const initial = [0.60, 0.63, 1];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function drawScene(ctx, model, width, height, view, dark) {
    const [yaw, pitch, zoom] = view;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    function rotate([x, y, z]) {
      const depth = x * sinY + z * cosY;
      return [x * cosY - z * sinY, y * cosP - depth * sinP, y * sinP + depth * cosP];
    }
    const primitives = [...model.faces, ...model.lines].flatMap(primitive => {
      const points = primitive.points.map(rotate);
      const center = points.reduce((mean, vertex) => mean.map((v, i) => v + vertex[i] / points.length), [0, 0, 0]);
      if (primitive.normal) {
        const [nx, ny, nz] = rotate(primitive.normal);
        if (nz * (distance - center[2]) - nx * center[0] - ny * center[1] <= 0) return [];
      }
      return [{ ...primitive, points, depth: center[2] }];
    });
    let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
    for (const { points } of primitives) {
      for (const [x, y, z] of points) {
        const perspective = distance / (distance - z);
        left = Math.min(left, x * perspective);
        right = Math.max(right, x * perspective);
        bottom = Math.min(bottom, y * perspective);
        top = Math.max(top, y * perspective);
      }
    }
    const scale = Math.min(width * 0.80 / (right - left), height * 0.76 / (top - bottom)) * zoom;
    const centerX = width / 2 - (left + right) / 2 * scale;
    const centerY = height / 2 + (bottom + top) / 2 * scale;
    function path(points) {
      ctx.beginPath();
      points.forEach(([x, y, z], i) => {
        const factor = scale * distance / (distance - z);
        ctx[i ? "lineTo" : "moveTo"](centerX + x * factor, centerY - y * factor);
      });
    }

    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (model.shadow) {
      ctx.save();
      ctx.translate(width / 2, height * 0.72);
      ctx.scale(1, 0.29);
      const radius = Math.min(width * 0.40, height * 0.68);
      const soft = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius);
      soft.addColorStop(0, "rgba(4, 14, 11, .52)");
      soft.addColorStop(1, "rgba(4, 14, 11, 0)");
      ctx.fillStyle = soft;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }
    ctx.strokeStyle = dark ? "rgba(179, 207, 189, .17)" : "rgba(82, 115, 98, .22)";
    ctx.lineWidth = 1;
    for (let n = -3; n < 4; n++) {
      for (const line of [[[n, -1.35, -2.6], [n, -1.35, 2.6]], [[-3, -1.35, n * 0.82], [3, -1.35, n * 0.82]]]) {
        path(line.map(rotate));
        ctx.stroke();
      }
    }

    // Channel ribbons are decals on the terrain top.
    primitives.sort((a, b) => Number(Boolean(a.onSurface)) - Number(Boolean(b.onSurface)) || a.depth - b.depth);
    for (const part of primitives) {
      path(part.points);
      if (part.width) {
        ctx.strokeStyle = part.color;
        ctx.lineWidth = part.width;
        ctx.stroke();
      } else {
        const [nx, ny, nz] = part.normal;
        const light = Math.max(0, nx * -0.36 + ny * 0.86 + nz * 0.37);
        ctx.fillStyle = tinted(part.color, 0.70 + light * 0.32);
        ctx.closePath();
        ctx.fill();
        // The matching stroke closes subpixel seams between neighboring faces.
        ctx.strokeStyle = part.edge || ctx.fillStyle;
        ctx.lineWidth = part.edge ? 0.85 : 0.6;
        ctx.stroke();
      }
    }
  }

  function drawCanvas(canvas, context, model, view, dark) {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(width * ratio), h = Math.round(height * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawScene(context, model, width, height, view, dark);
  }

  function mountJourney(root) {
    const stage = root.querySelector(".journey-stage");
    const canvas = root.querySelector("canvas");
    const context = canvas.getContext("2d");
    if (!context) return () => {};

    const title = root.querySelector("[data-journey-title]");
    const description = root.querySelector("[data-journey-description]");
    const open = root.querySelector("[data-journey-open]");
    const progressBar = root.querySelector("progress");
    const steps = [...root.querySelectorAll("[data-journey-step]")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const events = new AbortController();
    const { signal } = events;
    let frame = 0, currentStep = -1;
    let lastVisible = -1, lastWidth = 0, lastHeight = 0;

    function scrollMetrics() {
      const rect = root.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const travel = Math.max(1, root.offsetHeight - stage.offsetHeight);
      return { rect, stickyTop, travel };
    }

    function update() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!root.isConnected) return;
        const { rect, stickyTop, travel } = scrollMetrics();
        if (rect.top > innerHeight || rect.bottom < 0) return;

        const scrollProgress = clamp((stickyTop - rect.top) / travel, 0, 1);
        const index = Math.round(scrollProgress * (steps.length - 1));
        const visible = reducedMotion.matches ? index / (steps.length - 1) : scrollProgress;
        progressBar.value = scrollProgress;
        if (index !== currentStep) {
          currentStep = index;
          const step = steps[index];
          title.textContent = step.dataset.title;
          description.textContent = step.dataset.description;
          open.dataset.value = step.dataset.course;
          steps.forEach((button, i) => button.setAttribute("aria-pressed", i === index ? "true" : "false"));
        }

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (lastVisible === visible && lastWidth === w && lastHeight === h) return;
        lastVisible = visible;
        lastWidth = w;
        lastHeight = h;
        const yaw = 0.57 + 0.31 * visible - 0.54 * Math.sin(Math.PI * visible);
        const tilt = 0.58 + 0.26 * Math.sin(Math.PI * visible);
        drawCanvas(canvas, context, morphTerrain(visible), [yaw, tilt, 1], true);
      });
    }

    root.addEventListener("click", event => {
      const button = event.target.closest("[data-journey-step]");
      if (!button) return;
      const index = steps.indexOf(button);
      if (index < 0) return;
      const { rect, stickyTop, travel } = scrollMetrics();
      window.scrollTo({
        top: window.scrollY + rect.top - stickyTop + travel * index / (steps.length - 1),
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    }, { signal });
    window.addEventListener("scroll", update, { passive: true, signal });
    reducedMotion.addEventListener("change", update, { signal });
    const resize = new ResizeObserver(update);
    resize.observe(stage);
    resize.observe(canvas);
    update();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      events.abort();
    };
  }

  let active = [];

  function mount(root) {
    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const model = geometry[root.dataset.geoModel];
    if (!ctx || !model) return () => {};
    const events = new AbortController();
    const { signal } = events;
    let view = [...initial];
    let pointer = null;
    let frame = 0;

    function update() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        drawCanvas(canvas, ctx, model, view, document.documentElement.dataset.theme === "dark");
      });
    }

    function move(dx, dy) {
      view[0] += dx;
      view[1] = clamp(view[1] + dy, 0.18, ceiling);
      update();
    }

    function command(action) {
      switch (action) {
        case "left": move(-0.25, 0); return;
        case "right": move(0.25, 0); return;
        case "up": move(0, 0.19); return;
        case "down": move(0, -0.19); return;
        case "closer": view[2] = clamp(view[2] * 1.15, 0.66, 1.45); break;
        case "farther": view[2] = clamp(view[2] / 1.15, 0.66, 1.45); break;
        case "top": view = [0, ceiling, 0.96]; break;
        case "reset": view = [...initial]; break;
      }
      update();
    }

    root.addEventListener("click", event => {
      const pressed = event.target.closest("[data-geo-command]");
      if (pressed) command(pressed.dataset.geoCommand);
    }, { signal });

    canvas.addEventListener("keydown", event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const keys = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", "+": "closer", "=": "closer", "-": "farther", Home: "reset" };
      if (!keys[event.key]) return;
      event.preventDefault();
      command(keys[event.key]);
    }, { signal });

    canvas.addEventListener("pointerdown", event => {
      if (event.button !== 0 || pointer) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("dragging");
      canvas.focus({ preventScroll: true });
    }, { signal });

    canvas.addEventListener("pointermove", event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      move((event.clientX - pointer.x) * 0.009, (event.clientY - pointer.y) * 0.009);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { signal });

    canvas.addEventListener("lostpointercapture", () => {
      pointer = null;
      canvas.classList.remove("dragging");
    }, { signal });

    const resize = new ResizeObserver(update);
    resize.observe(canvas);
    update();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      events.abort();
    };
  }

  window.GeoKMG3D = {
    colors,
    createView(canvas, modelId) {
      const model = geometry[modelId];
      const context = canvas.getContext("2d");
      if (!model || !context) return null;
      return (yaw, pitch, zoom = 1) => drawCanvas(canvas, context, model, [yaw, pitch, zoom], true);
    },
    render(container) {
      active.forEach(dispose => dispose());
      active = [...container.querySelectorAll("[data-geo-model]")].map(mount);
      active.push(...Array.from(container.querySelectorAll("[data-geo-journey]"), mountJourney));
    },
  };
})();
