/**
 * 回転寿司ゲーム — クラフト→レーン→自動配膳 / レベルでネタ解放
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

  // —— 完成寿司 ——
  const SUSHI = [
    { id: "maguro", name: "まぐろ", emoji: "🍣", type: "nigiri", neta: "maguro", weight: 3 },
    { id: "salmon", name: "サーモン", emoji: "🐟", type: "nigiri", neta: "salmon", weight: 3 },
    { id: "ebi", name: "えび", emoji: "🦐", type: "nigiri", neta: "ebi", weight: 2 },
    { id: "tamago", name: "たまご", emoji: "🥚", type: "nigiri", neta: "tamago", weight: 2 },
    { id: "ikura", name: "いくら", emoji: "🟠", type: "gunkan", neta: "ikura", weight: 2 },
    { id: "uni", name: "うに", emoji: "🟡", type: "gunkan", neta: "uni", weight: 2 },
    { id: "kappa", name: "かっぱ巻", emoji: "🥒", type: "maki", neta: "cucumber", weight: 2 },
    { id: "tekka", name: "鉄火巻", emoji: "🍱", type: "maki", neta: "maguro", weight: 2 },
  ];

  // タイプ別に使えるネタ（全体）
  const NETA_BY_TYPE = {
    nigiri: ["maguro", "salmon", "ebi", "tamago"],
    gunkan: ["ikura", "uni"],
    maki: ["cucumber", "maguro"],
  };

  // レベルで解放される寿司 ID（累積）
  const LEVEL_UNLOCKS = {
    1: ["maguro", "salmon"],
    2: ["ebi", "tamago"],
    3: ["ikura", "uni"],
    4: ["kappa", "tekka"],
  };
  const MAX_UNLOCK_LEVEL = 4;
  const SERVES_PER_LEVEL = 6;

  // お客さんのベルト座席（楕円 progress 0..1、上弧付近）
  // progress 0 = 上端、時計回り
  const CUSTOMER_SEATS = [0.86, 0.93, 0.0, 0.07, 0.14];
  const SERVE_WINDOW = 0.085; // 座席に近づいたら早めに自動配膳
  const FRONT_PROGRESS = 0.5; // 手前（クラフトパネル側）

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
  const MAX_LIVES = 5;
  const BASE_PATIENCE = 36000;
  const MIN_PATIENCE = 22000;
  const PLATE_COUNT = 20;
  const BASE_SPEED = 0.048;
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
  const levelEl = $("#level");
  const livesEl = $("#lives");
  const customerCountEl = $("#customer-count");
  const customersEl = $("#customers");
  const platesEl = $("#plates");
  const beltTrack = $("#belt-track");
  const toastEl = $("#toast");
  const pauseOverlay = $("#pause-overlay");
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

  function getUnlockedSushiIds(level) {
    const ids = [];
    const cap = Math.min(level, MAX_UNLOCK_LEVEL);
    for (let lv = 1; lv <= cap; lv++) {
      const list = LEVEL_UNLOCKS[lv];
      if (list) ids.push.apply(ids, list);
    }
    return ids;
  }

  function getUnlockedSushi(level) {
    const ids = new Set(getUnlockedSushiIds(level));
    return SUSHI.filter((s) => ids.has(s.id));
  }

  function getUnlockedTypes(level) {
    const types = ["nigiri"];
    if (level >= 3) types.push("gunkan");
    if (level >= 4) types.push("maki");
    return types;
  }

  function getUnlockedIngredientIds(level) {
    const ids = new Set(["shari"]);
    if (level >= 3) ids.add("nori"); // 軍艦・巻物
    for (const s of getUnlockedSushi(level)) {
      ids.add(s.neta);
    }
    return ids;
  }

  function availableNetasForType(typeId, level) {
    const unlocked = new Set(getUnlockedSushiIds(level));
    const all = NETA_BY_TYPE[typeId] || [];
    return all.filter((netaId) => {
      const sushi = findSushiByTypeAndNeta(typeId, netaId);
      return sushi && unlocked.has(sushi.id);
    });
  }

  function pickSushi() {
    const list = getUnlockedSushi(state.level);
    if (!list.length) return SUSHI[0];
    return weightedPick(list);
  }

  function findSushiByTypeAndNeta(typeId, netaId) {
    return SUSHI.find((s) => s.type === typeId && s.neta === netaId) || null;
  }

  function typeLabel(typeId) {
    return (TYPES[typeId] && TYPES[typeId].label) || typeId;
  }



  const ICON_BASE = "assets/icons/";
  const ICON_VER = "20260921f";
  const ING_ICON_FILE = {
    shari: "shari.png",
    nori: "nori.png",
    maguro: "nigiri-maguro.png",
    salmon: "nigiri-salmon.png",
    ebi: "nigiri-ebi.png",
    tamago: "nigiri-tamago.png",
    ikura: "gunkan-ikura.png",
    uni: "gunkan-uni.png",
    cucumber: "maki-kappa.png",
  };
  const SUSHI_ICON_FILE = {
    maguro: "nigiri-maguro.png",
    salmon: "nigiri-salmon.png",
    ebi: "nigiri-ebi.png",
    tamago: "nigiri-tamago.png",
    ikura: "gunkan-ikura.png",
    uni: "gunkan-uni.png",
    kappa: "maki-kappa.png",
    tekka: "maki-tekka.png",
  };

  // Pixel sizes close to the original CSS/emoji icons
  const ART_PX = { sm: 18, md: 20, lg: 22, plate: 18, order: 20, ing: 20, preview: 20 };
  function artImg(file, alt, size) {
    const key = size || "md";
    const px = ART_PX[key] || ART_PX.md;
    const sz = " size-" + key;
    return (
      '<img class="sushi-art' +
      sz +
      '" src="' +
      ICON_BASE +
      file +
      "?v=" +
      ICON_VER +
      '" alt="' +
      (alt || "") +
      '" width="' +
      px +
      '" height="' +
      px +
      '" style="width:' +
      px +
      "px;height:" +
      px +
      'px;object-fit:contain;display:block;margin:0 auto;" draggable="false" />'
    );
  }

  /** CSS sushi / ingredient icon HTML (PNG art preferred) */
  function wrapIcon(classes, inner, size) {
    const sz = size ? " size-" + size : "";
    return (
      '<span class="sushi-icon ' +
      classes +
      sz +
      '" aria-hidden="true">' +
      inner +
      "</span>"
    );
  }

  function ingredientIconHTML(ingId, size) {
    const sz = size || "sm";
    const file = ING_ICON_FILE[ingId];
    const ing = INGREDIENTS[ingId];
    if (file) return artImg(file, ing ? ing.name : ingId, sz);
    if (ingId === "shari") {
      return wrapIcon("ing shari", '<span class="si-rice"></span>', sz);
    }
    if (ingId === "nori") {
      return wrapIcon("ing nori", '<span class="si-sheet"></span>', sz);
    }
    return wrapIcon("ing " + ingId, '<span class="si-topping"></span>', sz);
  }

  function finishedSushiIconHTML(sushi, size) {
    const sz = size || "md";
    if (!sushi) {
      return wrapIcon("empty-dish", "", sz);
    }
    const file = SUSHI_ICON_FILE[sushi.id];
    if (file) return artImg(file, sushi.name, sz);
    if (sushi.type === "nigiri") {
      return wrapIcon(
        "nigiri " + sushi.neta,
        '<span class="si-rice"></span><span class="si-topping"></span>',
        sz
      );
    }
    if (sushi.type === "gunkan") {
      return wrapIcon(
        "gunkan " + sushi.neta,
        '<span class="si-nori"></span><span class="si-rice"></span><span class="si-topping"></span>',
        sz
      );
    }
    if (sushi.type === "maki") {
      return wrapIcon(
        "maki " + sushi.id,
        '<span class="si-nori-ring"></span><span class="si-rice-fill"></span><span class="si-center"></span>',
        sz
      );
    }
    return wrapIcon("empty-dish", "", sz);
  }

  function previewIconHTML(steps, analysis) {
    if (analysis.done) {
      return finishedSushiIconHTML(analysis.done, "preview");
    }
    if (steps.length === 0) {
      return wrapIcon("empty-dish", "", "lg");
    }
    return steps.map((id) => ingredientIconHTML(id, "preview")).join("");
  }

  function progressDist(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, 1 - d);
  }

  /** 楕円軌道上の点 (progress 0..1) */
  function pointOnBelt(t, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w * 0.47;
    const ry = h * 0.32;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  }

  // —— クラフト推論（解放済みのみ） ——
  function analyzeCraft(steps) {
    const level = state ? state.level : 1;
    const unlockedTypes = getUnlockedTypes(level);

    if (steps.length === 0) {
      const nextKinds = ["shari"];
      if (unlockedTypes.includes("maki")) nextKinds.push("nori");
      return {
        candidates: unlockedTypes.slice(),
        nextKinds,
        nextNetas: null,
        done: null,
        invalid: false,
      };
    }

    const first = steps[0];

    // 海苔スタート → 巻物のみ
    if (first === "nori") {
      if (!unlockedTypes.includes("maki")) {
        return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
      }
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
          nextNetas: availableNetasForType("maki", level),
          done: null,
          invalid: false,
        };
      }
      const sushi = findSushiByTypeAndNeta("maki", steps[2]);
      const unlocked = getUnlockedSushiIds(level);
      if (!sushi || steps.length > 3 || unlocked.indexOf(sushi.id) < 0) {
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
        const cands = ["nigiri"];
        const nextKinds = ["neta"];
        if (unlockedTypes.includes("gunkan")) {
          cands.push("gunkan");
          nextKinds.push("nori");
        }
        return {
          candidates: cands,
          nextKinds,
          nextNetas: availableNetasForType("nigiri", level),
          done: null,
          invalid: false,
        };
      }
      const second = steps[1];
      if (second === "nori") {
        if (!unlockedTypes.includes("gunkan")) {
          return { candidates: [], nextKinds: [], nextNetas: null, done: null, invalid: true };
        }
        if (steps.length === 2) {
          return {
            candidates: ["gunkan"],
            nextKinds: ["neta"],
            nextNetas: availableNetasForType("gunkan", level),
            done: null,
            invalid: false,
          };
        }
        const sushi = findSushiByTypeAndNeta("gunkan", steps[2]);
        const unlocked = getUnlockedSushiIds(level);
        if (!sushi || steps.length > 3 || unlocked.indexOf(sushi.id) < 0) {
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
      if (INGREDIENTS[second] && INGREDIENTS[second].kind === "neta") {
        const sushi = findSushiByTypeAndNeta("nigiri", second);
        const unlocked = getUnlockedSushiIds(level);
        if (!sushi || steps.length > 2 || unlocked.indexOf(sushi.id) < 0) {
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
      const types = getUnlockedTypes(state ? state.level : 1);
      const hints = [];
      if (types.includes("nigiri")) hints.push("にぎり: シャリ→ネタ");
      if (types.includes("gunkan")) hints.push("軍艦: シャリ→海苔→ネタ");
      if (types.includes("maki")) hints.push("巻物: 海苔→シャリ→ネタ");
      return hints.join(" ／ ");
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

  function resetCraft() {
    if (!state) return;
    state.craftSteps = [];
    state.craftDone = null;
    updateCraftUI();
  }

  function shakeCraft() {
    craftPanel.classList.remove("shake");
    void craftPanel.offsetWidth;
    craftPanel.classList.add("shake");
    setTimeout(() => craftPanel.classList.remove("shake"), 400);
  }

  function updateCraftUI() {
    if (!state) return;
    const analysis = analyzeCraft(state.craftSteps);
    state.craftDone = analysis.done;
    craftProgress.textContent = formatProgress(state.craftSteps, analysis);
    craftPreview.innerHTML = previewIconHTML(state.craftSteps, analysis);
    btnPlace.disabled = !analysis.done;
    craftPreview.classList.toggle("ready", !!analysis.done);
    craftPanel.classList.toggle("ready", !!analysis.done);

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
    const level = state ? state.level : 1;
    const unlocked = getUnlockedIngredientIds(level);
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
      if (!unlocked.has(id)) continue;
      const ing = INGREDIENTS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ing-btn " + (ing.kind === "neta" ? "neta" : "base");
      btn.dataset.ingId = id;
      btn.innerHTML =
        '<span class="ing-icon">' +
        ingredientIconHTML(id, "ing") +
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
    if (state) updateCraftUI();
  }

  // —— お皿（タップ不要・見た目のみ） ——
  function renderPlateContent(plate) {
    const el = plate.el;
    el.innerHTML = "";
    if (!plate.sushi) {
      el.classList.add("empty");
      el.classList.remove("filled");
      el.setAttribute("aria-label", "空き皿");
      const icon = document.createElement("span");
      icon.className = "plate-icon";
      icon.innerHTML = wrapIcon("empty-dish", "", "sm");
      el.appendChild(icon);
      return;
    }
    el.classList.remove("empty");
    el.classList.add("filled");
    el.setAttribute("aria-label", plate.sushi.name);

    const chip = document.createElement("span");
    chip.className = "plate-chip " + plate.sushi.type;
    chip.textContent = typeLabel(plate.sushi.type).charAt(0);
    el.appendChild(chip);

    const icon = document.createElement("span");
    icon.className = "plate-icon";
    icon.innerHTML = finishedSushiIconHTML(plate.sushi, "plate");
    el.appendChild(icon);

    const label = document.createElement("span");
    label.className = "plate-label";
    label.textContent = plate.sushi.name;
    el.appendChild(label);
  }

  function createEmptyPlate(index, total) {
    const el = document.createElement("div");
    el.className = "plate empty";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "空き皿");
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

  function seatForSlot(slot) {
    return CUSTOMER_SEATS[slot % CUSTOMER_SEATS.length];
  }

  function createCustomer(slot) {
    const sushi = pickSushi();
    const face = FACES[Math.floor(Math.random() * FACES.length)];
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const scorePenalty = Math.min(8000, Math.floor(state.score / 250) * 400);
    const levelPenalty = Math.max(0, state.level - MAX_UNLOCK_LEVEL) * 900;
    const scaled = BASE_PATIENCE - scorePenalty - levelPenalty;
    const maxP = Math.max(MIN_PATIENCE, scaled);

    const el = document.createElement("div");
    el.className = "customer";
    el.innerHTML =
      '<div class="customer-face">' +
      face +
      "</div>" +
      '<div class="customer-order">' +
      '<span class="customer-order-icon">' +
      finishedSushiIconHTML(sushi, "order") +
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
      seatProgress: seatForSlot(slot),
      serving: false,
    };
  }

  function reassignCustomerSeats() {
    state.customers.forEach((c, i) => {
      c.slot = i;
      c.seatProgress = seatForSlot(i);
    });
  }

  function showScreen(which) {
    startScreen.classList.toggle("hidden", which !== "start");
    gameScreen.classList.toggle("hidden", which !== "game");
    gameoverScreen.classList.toggle("hidden", which !== "gameover");
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    if (levelEl) levelEl.textContent = String(state.level);
    livesEl.textContent =
      "❤️".repeat(state.lives) + "🖤".repeat(MAX_LIVES - state.lives);
    customerCountEl.textContent = String(state.customers.length);
  }

  function showToast(msg, type, duration) {
    toastEl.textContent = msg;
    toastEl.className = "toast " + (type || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, duration || 1000);
  }

  function showToastHtml(html, type, duration) {
    toastEl.innerHTML = html;
    toastEl.className = "toast " + (type || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, duration || 1000);
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

  // 手前の空き皿に出す
  function findNextEmptyPlate() {
    let best = null;
    let bestDist = Infinity;
    for (const p of state.plates) {
      if (!p.sushi) {
        const dist = progressDist(p.progress, FRONT_PROGRESS);
        if (dist < bestDist) {
          bestDist = dist;
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

  function checkLevelUp() {
    const target = 1 + Math.floor(state.servedTotal / SERVES_PER_LEVEL);
    if (target <= state.level) return;
    const oldLevel = state.level;
    state.level = target;

    for (let lv = oldLevel + 1; lv <= Math.min(target, MAX_UNLOCK_LEVEL); lv++) {
      const ids = LEVEL_UNLOCKS[lv];
      if (!ids || !ids.length) continue;
      const bits = ids.map((id) => {
        const s = SUSHI.find((x) => x.id === id);
        if (!s) return id;
        return finishedSushiIconHTML(s, "sm") + " " + s.name;
      });
      showToastHtml("新ネタ解放！ " + bits.join("　"), "ok", 2000);
    }
    if (oldLevel < MAX_UNLOCK_LEVEL && target >= MAX_UNLOCK_LEVEL) {
      // 最終ネタ解放済み
    } else if (target > MAX_UNLOCK_LEVEL && oldLevel >= MAX_UNLOCK_LEVEL) {
      showToast("レベル " + target + "！お客さんが急ぎ気味…", "ok", 1600);
    }

    buildIngredientButtons();
    updateHud();
  }

  /** マッチする皿が座席付近に来たら自動配膳 */
  function performAutoServe(plate, cust) {
    if (!state || !state.running) return;
    if (!plate.sushi || cust.serving) return;

    cust.serving = true;
    plate.cooling = true;

    const bonus = state.combo * POINTS_COMBO;
    state.score += POINTS_CORRECT + bonus;
    state.combo += 1;
    state.servedTotal += 1;

    plate.el.classList.add("flash-ok");
    showToast(
      bonus > 0
        ? "+" + (POINTS_CORRECT + bonus) + " コンボ！"
        : "おいしい！ +" + POINTS_CORRECT,
      "ok"
    );

    cust.el.classList.add("served");
    const servedId = cust.id;
    const sushiGone = plate.sushi;
    plate.sushi = null;
    setTimeout(() => {
      renderPlateContent(plate);
      plate.el.classList.remove("flash-ok");
      plate.cooling = false;
    }, 180);

    setTimeout(() => {
      if (!state || !state.running) return;
      const i = state.customers.findIndex((c) => c.id === servedId);
      if (i >= 0) state.customers.splice(i, 1);
      reassignCustomerSeats();
      if (state.customers.length < state.maxActive) {
        state.customers.push(createCustomer(state.customers.length));
      }
      checkLevelUp();
      updateHud();
      renderCustomers(true);
    }, 280);

    void sushiGone;
  }

  function tryAutoServe() {
    if (!state || !state.running) return;
    for (const plate of state.plates) {
      if (!plate.sushi || plate.cooling) continue;
      let best = null;
      let bestDist = Infinity;
      for (const c of state.customers) {
        if (c.serving) continue;
        if (c.sushi.id !== plate.sushi.id) continue;
        const d = progressDist(plate.progress, c.seatProgress);
        if (d <= SERVE_WINDOW && d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (best) {
        performAutoServe(plate, best);
      }
    }
  }

  function tick(ts) {
    if (!state || !state.running) return;
    if (state.paused) {
      lastTs = ts;
      rafId = requestAnimationFrame(tick);
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(50, ts - lastTs);
    lastTs = ts;

    const speed =
      BASE_SPEED +
      Math.min(0.02, state.score / 12000) +
      state.customers.length * 0.0012 +
      Math.max(0, state.level - MAX_UNLOCK_LEVEL) * 0.0015;

    for (const plate of state.plates) {
      plate.progress = (plate.progress + (speed * dt) / 1000) % 1;
    }
    layoutPlates();
    tryAutoServe();

    let timedOut = null;
    for (const c of state.customers) {
      if (c.serving) continue;
      c.patience -= dt;
      if (c.patience <= 0 && !timedOut) timedOut = c;
    }
    if (timedOut) {
      const idx = state.customers.indexOf(timedOut);
      if (idx >= 0) {
        state.customers.splice(idx, 1);
        reassignCustomerSeats();
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
      paused: false,
      score: 0,
      level: 1,
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
    buildIngredientButtons();
    resetCraft();
    updateHud();
    renderCustomers(true);
    if (pauseOverlay) {
      pauseOverlay.classList.add("hidden");
      pauseOverlay.setAttribute("aria-hidden", "true");
    }
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
      if (e.pointerType === "touch") {
        e.preventDefault();
        placeCraftOnBelt();
      }
    },
    { passive: false }
  );


  function setPaused(on) {
    if (!state || !state.running) return;
    state.paused = !!on;
    if (pauseOverlay) {
      pauseOverlay.classList.toggle("hidden", !state.paused);
      pauseOverlay.setAttribute("aria-hidden", state.paused ? "false" : "true");
    }
    if (!state.paused) lastTs = 0;
  }

  function togglePause() {
    if (!state || !state.running) return;
    setPaused(!state.paused);
  }

  function goHome() {
    window.location.href = "../";
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      e.preventDefault();
      goHome();
      return;
    }
    if (e.code === "Space") {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
      if (!gameScreen.classList.contains("hidden") && state && state.running) {
        e.preventDefault();
        togglePause();
      }
    }
  });

  buildIngredientButtons();
  showScreen("start");
})();
