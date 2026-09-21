/**
 * 回転寿司ゲーム — クラフトしてレーンに出す v2
 */
(function () {
  "use strict";

  // —— タイプ ——
  const TYPES = {
    nigiri: { id: "nigiri", label: "にぎり", steps: ["shari", "neta"] },
    gunkan: { id: "gunkan", label: "軍艦", steps: ["shari", "nori", "neta"] },
    maki: { id: "maki", label: "巻物", steps: ["nori", "shari", "neta"] },
  };

  // —— 材料 ——
  const INGREDIENTS = {
    shari: { id: "shari", name: "シャリ", emoji: "🍚", kind: "base" },
    nori: { id: "nori", name: "海苔", emoji: "⬛", kind: "base" },
    maguro: { id: "maguro", name: "まぐろ", emoji: "🍣", kind: "neta" },
    salmon: { id: "salmon", name: "サーモン", emoji: "🐟", kind: "neta" },
    ebi: { id: "ebi", name: "えび", emoji: "🦐", kind: "neta" },
    tamago: { id: "tamago", name: "たまご", emoji: "🥚", kind: "neta" },
    ikura: { id: "ikura", name: "いくら", emoji: "🟠", kind: "neta" },
    uni: { id: "uni", name: "うに", emoji: "🟡", kind: "neta" },
    cucumber: { id: "cucumber", name: "きゅうり", emoji: "🥒", kind: "neta" },
  };

  // —— 完成寿司（レシピパス + ネタで決定） ——
  const SUSHI = [
    {
      id: "maguro",
      name: "まぐろ",
      emoji: "🍣",
      type: "nigiri",
      neta: "maguro",
      weight: 3,
    },
    {
      id: "salmon",
      name: "サーモン",
      emoji: "🐟",
      type: "nigiri",
      neta: "salmon",
      weight: 3,
    },
    {
      id: "ebi",
      name: "えび",
      emoji: "🦐",
      type: "nigiri",
      neta: "ebi",
      weight: 2,
    },
    {
      id: "tamago",
      name: "たまご",
      emoji: "🥚",
      type: "nigiri",
      neta: "tamago",
      weight: 2,
    },
    {
      id: "ikura",
      name: "いくら",
      emoji: "🟠",
      type: "gunkan",
      neta: "ikura",
      weight: 2,
    },
    {
      id: "uni",
      name: "うに",
      emoji: "🟡",
      type: "gunkan",
      neta: "uni",
      weight: 2,
    },
    {
      id: "kappa",
      name: "かっぱ巻",
      emoji: "🥒",
      type: "maki",
      neta: "cucumber",
      weight: 2,
    },
    {
      id: "tekka",
      name: "鉄火巻",
      emoji: "🍱",
      type: "maki",
      neta: "maguro",
      weight: 2,
    },
  ];

  // タイプ別に使えるネタ
  const NETA_BY_TYPE = {
    nigiri: ["maguro", "salmon", "ebi", "tamago"],
    gunkan: ["ikura", "uni"],
    maki: ["cucumber", "maguro"],
  };

  const FACES = ["🙂", "😊", "🤓", "😎", "🤗", "😋", "🧒", "👩", "👨", "🧓"];
  const NAMES = [
    "たろう",
    "はなこ",
    "けん",
    "みさき",
    "ゆう",
    "さくら",
    "りく",
    "あおい",
    "そら",
    "ひなた",
  ];

  // —— 難易度（やさしめ） ——
  const MAX_LIVES = 3;
  const BASE_PATIENCE = 23000; // ms (~23s)
  const MIN_PATIENCE = 12000;
  const PLATE_COUNT = 8;
  const BASE_SPEED = 0.028; // slower belt (full lap ≈ 36s)
  const SPAWN_CUSTOMER_EVERY = 24000;
  const MAX_CUSTOMERS = 5;
  const POINTS_CORRECT = 100;
  const POINTS_COMBO = 25;

  // —— DOM ——
  const $ = (sel) => document.querySelector(sel);
  const startScreen = $("#start-screen");
  const gameScreen = $("#game-screen");
  const gameoverScreen = $("#gameover-screen");
  const btnStart = $("#btn-start");
  const btnRetry = $("#btn-retry");
  const btnPlace = $("#btn-place");
  const scoreEl = $("#score");
  const livesEl = $("#lives");
  const customerCountEl = $("#customer-count");
  const customersEl = $("#customers");
  const platesEl = $("#plates");
  const beltTrack = $("#belt-track");
  const toastEl = $("#toast");
  const finalScoreEl = $("#final-score");
  const finalHintEl = $("#final-hint");
  const craftPanel = $("#craft-panel");
  const craftProgress = $("#craft-progress");
  const craftPreview = $("#craft-preview");
  const craftIngredients = $("#craft-ingredients");

  // —— 状態 ——
  let state = null;
  let rafId = null;
  let lastTs = 0;
  let toastTimer = null;

  function weightedPick(list) {
    const total = list.reduce((s, x) => s + (x.weight || 1), 0);
    let r = Math.random() * total;
    for (const item of list) {
      r -= item.weight || 1;
      if (r <= 0) return item;
    }
    return list[list.length - 1];
  }

  function pickSushi() {
    return weightedPick(SUSHI);
  }

  function findSushiByTypeAndNeta(typeId, netaId) {
    return SUSHI.find((s) => s.type === typeId && s.neta === netaId) || null;
  }

  function typeLabel(typeId) {
    return (TYPES[typeId] && TYPES[typeId].label) || typeId;
  }

  /** 楕円軌道上の点 (progress 0..1) */
  function pointOnBelt(t, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w * 0.42;
    const ry = h * 0.38;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  }

  // —— クラフト推論 ——
  /**
   * steps から現在の仮説タイプと次に有効な材料を返す
   * steps: string[] of ingredient ids
   */
  function analyzeCraft(steps) {
    if (steps.length === 0) {
      return {
        candidates: ["nigiri", "gunkan", "maki"],
        nextKinds: ["shari", "nori"],
        nextNetas: null,
        done: null,
        invalid: false,
      };
    }

    const first = steps[0];

    // 海苔スタート → 巻物のみ
    if (first === "nori") {
      if (steps.length === 1) {
        return {
          candidates: ["maki"],
          nextKinds: ["shari"],
          nextNetas: null,
          done: null,
          invalid: false,
        };
      }
      if (steps[1] !== "shari") {
        return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
      }
      if (steps.length === 2) {
        return {
          candidates: ["maki"],
          nextKinds: ["neta"],
          nextNetas: NETA_BY_TYPE.maki.slice(),
          done: null,
          invalid: false,
        };
      }
      // steps[2] = neta
      const sushi = findSushiByTypeAndNeta("maki", steps[2]);
      if (!sushi || steps.length > 3) {
        return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
      }
      return {
        candidates: ["maki"],
        nextKinds: [],
        nextNetas: null,
        done: sushi,
        invalid: false,
      };
    }

    // シャリスタート → にぎり or 軍艦
    if (first === "shari") {
      if (steps.length === 1) {
        return {
          candidates: ["nigiri", "gunkan"],
          nextKinds: ["nori", "neta"],
          nextNetas: NETA_BY_TYPE.nigiri.slice(),
          done: null,
          invalid: false,
        };
      }
      const second = steps[1];
      // 軍艦: シャリ → 海苔 → ネタ
      if (second === "nori") {
        if (steps.length === 2) {
          return {
            candidates: ["gunkan"],
            nextKinds: ["neta"],
            nextNetas: NETA_BY_TYPE.gunkan.slice(),
            done: null,
            invalid: false,
          };
        }
        const sushi = findSushiByTypeAndNeta("gunkan", steps[2]);
        if (!sushi || steps.length > 3) {
          return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
        }
        return {
          candidates: ["gunkan"],
          nextKinds: [],
          nextNetas: null,
          done: sushi,
          invalid: false,
        };
      }
      // にぎり: シャリ → ネタ
      if (INGREDIENTS[second] && INGREDIENTS[second].kind === "neta") {
        const sushi = findSushiByTypeAndNeta("nigiri", second);
        if (!sushi || steps.length > 2) {
          return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
        }
        return {
          candidates: ["nigiri"],
          nextKinds: [],
          nextNetas: null,
          done: sushi,
          invalid: false,
        };
      }
      return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
    }

    // ネタや不明な開始
    return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
  }

  function isIngredientAllowed(ingId, analysis) {
    if (analysis.invalid || analysis.done) return false;
    const ing = INGREDIENTS[ingId];
    if (!ing) return false;
    if (ing.kind === "neta") {
      if (!analysis.nextKinds.includes("neta")) return false;
      return analysis.nextNetas && analysis.nextNetas.includes(ingId);
    }
    return analysis.nextKinds.includes(ingId);
  }

  function formatProgress(steps, analysis) {
    if (analysis.done) {
      const t = typeLabel(analysis.done.type);
      return t + "完成！ 「レーンに出す」で出そう → " + analysis.done.name;
    }
    if (steps.length === 0) {
      return "にぎり: シャリ→ネタ ／ 軍艦: シャリ→海苔→ネタ ／ 巻物: 海苔→シャリ→ネタ";
    }

    const cand = analysis.candidates;
    let typeHint;
    if (cand.length === 1) typeHint = typeLabel(cand[0]);
    else if (cand.length === 2) typeHint = typeLabel(cand[0]) + "／" + typeLabel(cand[1]);
    else typeHint = "寿司";

    const marks = steps.map((id) => INGREDIENTS[id].name + " ✓").join(" → ");
    let next = "？";
    if (analysis.nextKinds.includes("neta") && analysis.nextNetas) {
      next = "ネタ？";
    } else if (analysis.nextKinds.includes("shari")) {
      next = "シャリ？";
    } else if (analysis.nextKinds.includes("nori")) {
      next = "海苔？";
    } else if (analysis.nextKinds.includes("neta")) {
      next = "ネタ？";
    }

    return typeHint + ": " + marks + " → " + next;
  }

  function previewEmojis(steps, analysis) {
    if (analysis.done) return analysis.done.emoji;
    if (steps.length === 0) return "🍽️";
    return steps.map((id) => INGREDIENTS[id].emoji).join("");
  }

  function resetCraft() {
    if (!state) return;
    state.craftSteps = [];
    state.craftDone = null;
    updateCraftUI();
  }

  function shakeCraft() {
    craftPanel.classList.remove("shake");
    // reflow
    void craftPanel.offsetWidth;
    craftPanel.classList.add("shake");
    setTimeout(() => craftPanel.classList.remove("shake"), 400);
  }

  function updateCraftUI() {
    if (!state) return;
    const analysis = analyzeCraft(state.craftSteps);
    state.craftDone = analysis.done;
    craftProgress.textContent = formatProgress(state.craftSteps, analysis);
    craftPreview.textContent = previewEmojis(state.craftSteps, analysis);
    btnPlace.disabled = !analysis.done;

    // enable/disable ingredient buttons
    const buttons = craftIngredients.querySelectorAll(".ing-btn");
    buttons.forEach((btn) => {
      const id = btn.dataset.ingId;
      const ok = isIngredientAllowed(id, analysis);
      btn.disabled = !ok;
      btn.classList.toggle("enabled", ok);
    });
  }

  function onIngredientTap(ingId) {
    if (!state || !state.running) return;
    const analysis = analyzeCraft(state.craftSteps);
    if (!isIngredientAllowed(ingId, analysis)) {
      // 間違った材料 → ライフは減らさず、シェイクしてリセット
      shakeCraft();
      showToast("順番が違うよ！もう一度", "bad");
      resetCraft();
      return;
    }
    state.craftSteps.push(ingId);
    const next = analyzeCraft(state.craftSteps);
    if (next.invalid) {
      shakeCraft();
      showToast("作れない組み合わせ…", "bad");
      resetCraft();
      return;
    }
    updateCraftUI();
    if (next.done) {
      showToast(next.done.name + " できた！", "ok");
    }
  }

  function buildIngredientButtons() {
    craftIngredients.innerHTML = "";
    const order = [
      "shari",
      "nori",
      "maguro",
      "salmon",
      "ebi",
      "tamago",
      "ikura",
      "uni",
      "cucumber",
    ];
    for (const id of order) {
      const ing = INGREDIENTS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ing-btn " + (ing.kind === "neta" ? "neta" : "base");
      btn.dataset.ingId = id;
      btn.innerHTML =
        '<span class="ing-emoji">' +
        ing.emoji +
        '</span><span class="ing-name">' +
        ing.name +
        "</span>";
      btn.addEventListener(
        "pointerdown",
        (e) => {
          e.preventDefault();
          onIngredientTap(id);
        },
        { passive: false }
      );
      craftIngredients.appendChild(btn);
    }
  }

  // —— お皿 ——
  function renderPlateContent(plate) {
    const el = plate.el;
    el.innerHTML = "";
    if (!plate.sushi) {
      el.classList.add("empty");
      el.classList.remove("filled");
      el.setAttribute("aria-label", "空き皿");
      const emoji = document.createElement("span");
      emoji.className = "plate-emoji";
      emoji.textContent = "　";
      el.appendChild(emoji);
      return;
    }
    el.classList.remove("empty");
    el.classList.add("filled");
    el.setAttribute("aria-label", plate.sushi.name);

    const chip = document.createElement("span");
    chip.className = "plate-chip " + plate.sushi.type;
    chip.textContent = typeLabel(plate.sushi.type).charAt(0);
    el.appendChild(chip);

    const emoji = document.createElement("span");
    emoji.className = "plate-emoji";
    emoji.textContent = plate.sushi.emoji;
    el.appendChild(emoji);

    const label = document.createElement("span");
    label.className = "plate-label";
    label.textContent = plate.sushi.name;
    el.appendChild(label);
  }

  function createEmptyPlate(index, total) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "plate empty";
    el.setAttribute("aria-label", "空き皿");
    el.addEventListener("pointerdown", onPlatePointer, { passive: false });
    const plate = {
      id: "p" + index + "_" + Date.now(),
      sushi: null,
      progress: index / total,
      el,
      cooling: false,
    };
    renderPlateContent(plate);
    return plate;
  }

  function createCustomer(slot) {
    const sushi = pickSushi();
    const face = FACES[Math.floor(Math.random() * FACES.length)];
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const scaled =
      BASE_PATIENCE - Math.min(8000, Math.floor(state.score / 250) * 400);
    const maxP = Math.max(MIN_PATIENCE, scaled);

    const el = document.createElement("div");
    el.className = "customer";
    el.innerHTML =
      '<div class="customer-face">' +
      face +
      "</div>" +
      '<div class="customer-order">' +
      '<span class="customer-order-emoji">' +
      sushi.emoji +
      "</span>" +
      '<span class="customer-order-name">' +
      sushi.name +
      "</span>" +
      '<span class="type-badge ' +
      sushi.type +
      '">' +
      typeLabel(sushi.type) +
      "</span>" +
      "</div>" +
      '<div class="customer-name">' +
      name +
      "</div>" +
      '<div class="patience-bar"><div class="patience-fill"></div></div>';

    return {
      id: "c" + slot + "_" + Date.now() + Math.random().toString(36).slice(2, 6),
      sushi,
      face,
      name,
      patience: maxP,
      patienceMax: maxP,
      el,
      slot,
    };
  }

  function showScreen(which) {
    startScreen.classList.toggle("hidden", which !== "start");
    gameScreen.classList.toggle("hidden", which !== "game");
    gameoverScreen.classList.toggle("hidden", which !== "gameover");
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    livesEl.textContent =
      "❤️".repeat(state.lives) + "🖤".repeat(MAX_LIVES - state.lives);
    customerCountEl.textContent = String(state.customers.length);
  }

  function showToast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = "toast " + (type || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 1000);
  }

  function loseLife(reason) {
    state.lives -= 1;
    state.combo = 0;
    updateHud();
    showToast(reason || "ライフ減少…", "bad");
    if (state.lives <= 0) {
      endGame();
    }
  }

  function endGame() {
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    finalScoreEl.textContent = String(state.score);
    if (state.score >= 2000) finalHintEl.textContent = "すごい！寿司職人級！";
    else if (state.score >= 800) finalHintEl.textContent = "なかなかの腕前！";
    else if (state.score >= 300)
      finalHintEl.textContent = "もう少し！次はもっと届けよう";
    else finalHintEl.textContent = "レシピを覚えて挑戦しよう";
    showScreen("gameover");
  }

  function layoutPlates() {
    const rect = beltTrack.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 10 || h < 10) return;
    for (const plate of state.plates) {
      const pos = pointOnBelt(plate.progress, w, h);
      plate.el.style.left = pos.x + "px";
      plate.el.style.top = pos.y + "px";
    }
  }

  function renderCustomers(forceRelayout) {
    if (forceRelayout || customersEl.childElementCount !== state.customers.length) {
      customersEl.innerHTML = "";
      for (const c of state.customers) {
        customersEl.appendChild(c.el);
      }
    }
    for (const c of state.customers) {
      const fill = c.el.querySelector(".patience-fill");
      const ratio = Math.max(0, c.patience / c.patienceMax);
      if (fill) fill.style.transform = "scaleX(" + ratio + ")";
      c.el.classList.toggle("urgent", ratio < 0.28);
    }
  }

  function findNextEmptyPlate() {
    // 進行方向の「次」: progress が最も小さい空き皿（手前側）を優先
    // 単純に最初の空きを探す（等間隔なので十分）
    let best = null;
    let bestProg = Infinity;
    for (const p of state.plates) {
      if (!p.sushi) {
        // prefer plate closest to "serving" position (top = progress ~0)
        const dist = p.progress; // 0 is top
        if (dist < bestProg) {
          bestProg = dist;
          best = p;
        }
      }
    }
    return best;
  }

  function placeCraftOnBelt() {
    if (!state || !state.running) return;
    if (!state.craftDone) {
      showToast("まだ完成していないよ", "bad");
      return;
    }
    const empty = findNextEmptyPlate();
    if (!empty) {
      showToast("空き皿がないよ", "bad");
      return;
    }
    empty.sushi = state.craftDone;
    renderPlateContent(empty);
    showToast(state.craftDone.name + " をレーンに出した！", "ok");
    resetCraft();
  }

  function onPlatePointer(e) {
    e.preventDefault();
    if (!state || !state.running) return;
    const el = e.currentTarget;
    const plate = state.plates.find((p) => p.el === el);
    if (!plate || plate.cooling) return;

    // 空き皿はタップ無視
    if (!plate.sushi) {
      showToast("空っぽのお皿だよ", "");
      return;
    }

    plate.cooling = true;
    el.classList.add("tapped");

    const matchIdx = state.customers.findIndex(
      (c) => c.sushi.id === plate.sushi.id
    );
    if (matchIdx >= 0) {
      const cust = state.customers[matchIdx];
      const bonus = state.combo * POINTS_COMBO;
      state.score += POINTS_CORRECT + bonus;
      state.combo += 1;
      state.servedTotal += 1;
      el.classList.add("flash-ok");
      showToast(
        bonus > 0
          ? "+" + (POINTS_CORRECT + bonus) + " コンボ！"
          : "おいしい！ +" + POINTS_CORRECT,
        "ok"
      );
      cust.el.classList.add("served");
      const servedId = cust.id;
      // お皿を空に
      plate.sushi = null;
      setTimeout(() => renderPlateContent(plate), 180);

      setTimeout(() => {
        if (!state || !state.running) return;
        const i = state.customers.findIndex((c) => c.id === servedId);
        if (i >= 0) state.customers.splice(i, 1);
        if (state.customers.length < state.maxActive) {
          state.customers.push(createCustomer(state.customers.length));
        }
        updateHud();
        renderCustomers(true);
      }, 280);
    } else {
      el.classList.add("flash-bad");
      showToast("注文と違うよ！", "bad");
      loseLife("まちがい！");
    }

    updateHud();

    setTimeout(() => {
      el.classList.remove("tapped", "flash-ok", "flash-bad");
      plate.cooling = false;
    }, 320);
  }

  function tick(ts) {
    if (!state || !state.running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(50, ts - lastTs);
    lastTs = ts;

    const speed =
      BASE_SPEED +
      Math.min(0.02, state.score / 12000) +
      state.customers.length * 0.0012;

    for (const plate of state.plates) {
      plate.progress = (plate.progress + (speed * dt) / 1000) % 1;
    }
    layoutPlates();

    let timedOut = null;
    for (const c of state.customers) {
      c.patience -= dt;
      if (c.patience <= 0 && !timedOut) timedOut = c;
    }
    if (timedOut) {
      const idx = state.customers.indexOf(timedOut);
      if (idx >= 0) {
        state.customers.splice(idx, 1);
        loseLife(timedOut.name + "さんが帰っちゃった…");
        if (state.running && state.customers.length < state.maxActive) {
          state.customers.push(createCustomer(state.customers.length));
        }
      }
    }
    renderCustomers();

    state.elapsed += dt;
    if (
      state.maxActive < MAX_CUSTOMERS &&
      state.elapsed - state.lastUnlockAt > SPAWN_CUSTOMER_EVERY
    ) {
      state.lastUnlockAt = state.elapsed;
      state.maxActive += 1;
      if (state.customers.length < state.maxActive) {
        state.customers.push(createCustomer(state.customers.length));
        showToast("お客さんが増えた！", "ok");
        updateHud();
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function startGame() {
    if (rafId) cancelAnimationFrame(rafId);

    state = {
      running: true,
      score: 0,
      lives: MAX_LIVES,
      combo: 0,
      servedTotal: 0,
      elapsed: 0,
      lastUnlockAt: 0,
      maxActive: 1,
      customers: [],
      plates: [],
      craftSteps: [],
      craftDone: null,
    };

    platesEl.innerHTML = "";
    customersEl.innerHTML = "";

    for (let i = 0; i < PLATE_COUNT; i++) {
      const p = createEmptyPlate(i, PLATE_COUNT);
      state.plates.push(p);
      platesEl.appendChild(p.el);
    }

    state.customers.push(createCustomer(0));
    resetCraft();
    updateHud();
    renderCustomers(true);
    showScreen("game");

    requestAnimationFrame(() => {
      layoutPlates();
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    });
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state && state.running) layoutPlates();
    }, 100);
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      if (state && state.running) layoutPlates();
    }, 200);
  });

  btnStart.addEventListener("click", startGame);
  btnRetry.addEventListener("click", startGame);
  btnPlace.addEventListener("click", placeCraftOnBelt);
  btnPlace.addEventListener(
    "pointerdown",
    (e) => {
      // タッチでクリック遅延を避ける
      if (e.pointerType === "touch") {
        e.preventDefault();
        placeCraftOnBelt();
      }
    },
    { passive: false }
  );

  buildIngredientButtons();
  showScreen("start");
})();
