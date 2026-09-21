/**
 * 回転寿司ゲーム — クライアントのみの v1 プロトタイプ
 */
(function () {
  "use strict";

  // —— 寿司メニュー ——
  const SUSHI = [
    { id: "maguro", name: "まぐろ", emoji: "🍣", weight: 3 },
    { id: "salmon", name: "サーモン", emoji: "🐟", weight: 3 },
    { id: "tamago", name: "たまご", emoji: "🥚", weight: 2 },
    { id: "gunkan", name: "軍艦", emoji: "🍙", weight: 2 },
    { id: "ebi", name: "えび", emoji: "🦐", weight: 2 },
    { id: "ikura", name: "いくら", emoji: "🟠", weight: 1 },
    { id: "uni", name: "うに", emoji: "🟡", weight: 1 },
  ];

  const FACES = ["🙂", "😊", "🤓", "😎", "🤗", "😋", "🧒", "👩", "👨", "🧓"];
  const NAMES = [
    "たろう", "はなこ", "けん", "みさき", "ゆう",
    "さくら", "りく", "あおい", "そら", "ひなた",
  ];

  // —— ゲーム定数 ——
  const MAX_LIVES = 3;
  const BASE_PATIENCE = 14000; // ms
  const MIN_PATIENCE = 7000;
  const PLATE_COUNT = 8;
  const BASE_SPEED = 0.045; // progress units per second (full lap ≈ 22s)
  const SPAWN_CUSTOMER_EVERY = 18000; // ms until next slot unlock attempt
  const MAX_CUSTOMERS = 5;
  const POINTS_CORRECT = 100;
  const POINTS_COMBO = 25;
  const WRONG_PENALTY = 0; // lives only

  // —— DOM ——
  const $ = (sel) => document.querySelector(sel);
  const startScreen = $("#start-screen");
  const gameScreen = $("#game-screen");
  const gameoverScreen = $("#gameover-screen");
  const btnStart = $("#btn-start");
  const btnRetry = $("#btn-retry");
  const scoreEl = $("#score");
  const livesEl = $("#lives");
  const customerCountEl = $("#customer-count");
  const customersEl = $("#customers");
  const platesEl = $("#plates");
  const beltTrack = $("#belt-track");
  const toastEl = $("#toast");
  const finalScoreEl = $("#final-score");
  const finalHintEl = $("#final-hint");

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

  function pickDistinctSushi(excludeIds) {
    const pool = SUSHI.filter((s) => !excludeIds.includes(s.id));
    return pool.length ? weightedPick(pool) : pickSushi();
  }

  /** 楕円軌道上の点 (progress 0..1) */
  function pointOnBelt(t, w, h) {
    // 角丸長方形に近い楕円パス
    const cx = w / 2;
    const cy = h / 2;
    const rx = w * 0.42;
    const ry = h * 0.38;
    const angle = t * Math.PI * 2 - Math.PI / 2; // 上から時計回り
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  }

  function createPlate(index, total) {
    const sushi = pickSushi();
    const el = document.createElement("button");
    el.type = "button";
    el.className = "plate";
    el.setAttribute("aria-label", sushi.name);
    el.textContent = sushi.emoji;
    el.dataset.sushiId = sushi.id;
    el.addEventListener("pointerdown", onPlatePointer, { passive: false });
    return {
      id: "p" + index + "_" + Date.now(),
      sushi,
      progress: index / total,
      el,
      cooling: false,
    };
  }

  function createCustomer(slot) {
    const sushi = pickSushi();
    const face = FACES[Math.floor(Math.random() * FACES.length)];
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const patienceMax =
      BASE_PATIENCE - Math.min(state.score / 50, 1) * (BASE_PATIENCE - MIN_PATIENCE);
    // スコアが高いほど少し短くなる
    const scaled =
      BASE_PATIENCE -
      Math.min(6000, Math.floor(state.score / 200) * 400);
    const maxP = Math.max(MIN_PATIENCE, scaled);

    const el = document.createElement("div");
    el.className = "customer";
    el.innerHTML =
      '<div class="customer-face">' +
      face +
      "</div>" +
      '<div class="customer-order" title="' +
      sushi.name +
      '">' +
      sushi.emoji +
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
    livesEl.textContent = "❤️".repeat(state.lives) + "🖤".repeat(MAX_LIVES - state.lives);
    customerCountEl.textContent = String(state.customers.length);
  }

  function showToast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = "toast " + (type || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 900);
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
    else if (state.score >= 300) finalHintEl.textContent = "もう少し！次はもっと届けよう";
    else finalHintEl.textContent = "ベルトをよく見てね";
    showScreen("gameover");
  }

  function refreshPlateSushi(plate) {
    // 一周したら種類を変える（同じばかりにならない）
    const wanted = state.customers.map((c) => c.sushi.id);
    // たまに注文中の寿司を流す（助け船）
    let sushi;
    if (wanted.length && Math.random() < 0.45) {
      const id = wanted[Math.floor(Math.random() * wanted.length)];
      sushi = SUSHI.find((s) => s.id === id) || pickSushi();
    } else {
      sushi = pickSushi();
    }
    plate.sushi = sushi;
    plate.el.textContent = sushi.emoji;
    plate.el.dataset.sushiId = sushi.id;
    plate.el.setAttribute("aria-label", sushi.name);
  }

  function layoutPlates() {
    const rect = beltTrack.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 10 || h < 10) return;
    for (const plate of state.plates) {
      const prev = plate.progress;
      const pos = pointOnBelt(plate.progress, w, h);
      plate.el.style.left = pos.x + "px";
      plate.el.style.top = pos.y + "px";
      // 一周検知（progress wrap）
      if (plate._lastProgress !== undefined && plate.progress < plate._lastProgress - 0.5) {
        refreshPlateSushi(plate);
      }
      plate._lastProgress = plate.progress;
    }
  }

  function renderCustomers(forceRelayout) {
    // 忍耐バー更新。構成が変わったときだけ DOM を組み直す
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

  function onPlatePointer(e) {
    e.preventDefault();
    if (!state || !state.running) return;
    const el = e.currentTarget;
    const plate = state.plates.find((p) => p.el === el);
    if (!plate || plate.cooling) return;

    plate.cooling = true;
    el.classList.add("tapped");

    const matchIdx = state.customers.findIndex((c) => c.sushi.id === plate.sushi.id);
    if (matchIdx >= 0) {
      // 正解
      const cust = state.customers[matchIdx];
      const bonus = state.combo * POINTS_COMBO;
      state.score += POINTS_CORRECT + bonus;
      state.combo += 1;
      state.servedTotal += 1;
      el.classList.add("flash-ok");
      showToast(
        bonus > 0 ? "+" + (POINTS_CORRECT + bonus) + " コンボ！" : "おいしい！ +" + POINTS_CORRECT,
        "ok"
      );
      cust.el.classList.add("served");
      const servedId = cust.id;
      setTimeout(() => {
        if (!state || !state.running) return;
        const i = state.customers.findIndex((c) => c.id === servedId);
        if (i >= 0) state.customers.splice(i, 1);
        // すぐ補充（空き枠を埋める）
        if (state.customers.length < state.maxActive) {
          state.customers.push(createCustomer(state.customers.length));
        }
        updateHud();
        renderCustomers(true);
      }, 280);
      // お皿の寿司を差し替え
      setTimeout(() => refreshPlateSushi(plate), 200);
    } else {
      // 不正解
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

    // スピードはスコアで少し上がる
    const speed =
      BASE_SPEED + Math.min(0.035, state.score / 8000) + state.customers.length * 0.002;

    for (const plate of state.plates) {
      plate.progress = (plate.progress + (speed * dt) / 1000) % 1;
    }
    layoutPlates();

    // 客の忍耐
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

    // 時間経過で最大客数を増やす
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
    };

    platesEl.innerHTML = "";
    customersEl.innerHTML = "";

    for (let i = 0; i < PLATE_COUNT; i++) {
      const p = createPlate(i, PLATE_COUNT);
      state.plates.push(p);
      platesEl.appendChild(p.el);
    }

    state.customers.push(createCustomer(0));
    // 最初の数皿は客の注文を含める
    const firstWanted = state.customers[0].sushi;
    state.plates[0].sushi = firstWanted;
    state.plates[0].el.textContent = firstWanted.emoji;
    state.plates[0].el.dataset.sushiId = firstWanted.id;

    updateHud();
    renderCustomers(true);
    showScreen("game");

    // レイアウト安定後に配置
    requestAnimationFrame(() => {
      layoutPlates();
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    });
  }

  // リサイズ時に再配置
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state && state.running) layoutPlates();
    }, 100);
  });

  // 向き変更
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      if (state && state.running) layoutPlates();
    }, 200);
  });

  btnStart.addEventListener("click", startGame);
  btnRetry.addEventListener("click", startGame);

  // 初期表示
  showScreen("start");
})();
