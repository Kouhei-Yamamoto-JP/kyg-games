/**
 * 回転寿司ゲーム — クラフト→レーン自動配膳 / 制限時間 / レベルでネタ解放
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
    hamachi: { id: "hamachi", name: "はまち", emoji: "🐠", kind: "neta" },
    hotate: { id: "hotate", name: "ほたて", emoji: "🐚", kind: "neta" },
    ikura: { id: "ikura", name: "いくら", emoji: "🟠", kind: "neta" },
    uni: { id: "uni", name: "うに", emoji: "🟡", kind: "neta" },
    corn: { id: "corn", name: "コーン", emoji: "🌽", kind: "neta" },
    negitoro: { id: "negitoro", name: "ねぎとろ", emoji: "🧅", kind: "neta" },
    cucumber: { id: "cucumber", name: "きゅうり", emoji: "🥒", kind: "neta" },
    natto: { id: "natto", name: "納豆", emoji: "🫘", kind: "neta" },
    ika: { id: "ika", name: "いか", emoji: "🦑", kind: "neta" },
    tako: { id: "tako", name: "たこ", emoji: "🐙", kind: "neta" },
    anago: { id: "anago", name: "あなご", emoji: "🌊", kind: "neta" },
    engawa: { id: "engawa", name: "えんがわ", emoji: "🐟", kind: "neta" },
    awabi: { id: "awabi", name: "あわび", emoji: "🦪", kind: "neta" },
    kani: { id: "kani", name: "かに", emoji: "🦀", kind: "neta" },
    mentaiko: { id: "mentaiko", name: "めんたい", emoji: "🌶️", kind: "neta" },
    tsunamayo: { id: "tsunamayo", name: "ツナマヨ", emoji: "🥪", kind: "neta" },
    umeshiso: { id: "umeshiso", name: "梅しそ", emoji: "🟣", kind: "neta" },
    salad: { id: "salad", name: "サラダ", emoji: "🥗", kind: "neta" },
    kampyo: { id: "kampyo", name: "かんぴょう", emoji: "🤎", kind: "neta" },
    toki: { id: "toki", name: "ときネタ", emoji: "⏰", kind: "neta", special: true },
  };

  // —— 完成寿司 ——
  const SUSHI = [
    { id: "maguro", name: "まぐろ", emoji: "🍣", type: "nigiri", neta: "maguro", weight: 3 },
    { id: "salmon", name: "サーモン", emoji: "🐟", type: "nigiri", neta: "salmon", weight: 3 },
    { id: "ebi", name: "えび", emoji: "🦐", type: "nigiri", neta: "ebi", weight: 2 },
    { id: "tamago", name: "たまご", emoji: "🥚", type: "nigiri", neta: "tamago", weight: 2 },
    { id: "hamachi", name: "はまち", emoji: "🐠", type: "nigiri", neta: "hamachi", weight: 2 },
    { id: "hotate", name: "ほたて", emoji: "🐚", type: "nigiri", neta: "hotate", weight: 2 },
    { id: "ikura", name: "いくら", emoji: "🟠", type: "gunkan", neta: "ikura", weight: 2 },
    { id: "uni", name: "うに", emoji: "🟡", type: "gunkan", neta: "uni", weight: 2 },
    { id: "corn", name: "コーン軍艦", emoji: "🌽", type: "gunkan", neta: "corn", weight: 2 },
    { id: "negitoro", name: "ねぎとろ軍艦", emoji: "🧅", type: "gunkan", neta: "negitoro", weight: 2 },
    { id: "kappa", name: "かっぱ巻", emoji: "🥒", type: "maki", neta: "cucumber", weight: 2 },
    { id: "tekka", name: "鉄火巻", emoji: "🍱", type: "maki", neta: "maguro", weight: 2 },
    { id: "natto", name: "納豆巻", emoji: "🫘", type: "maki", neta: "natto", weight: 2 },
    { id: "ika", name: "いか", emoji: "🦑", type: "nigiri", neta: "ika", weight: 2 },
    { id: "tako", name: "たこ", emoji: "🐙", type: "nigiri", neta: "tako", weight: 2 },
    { id: "anago", name: "あなご", emoji: "🌊", type: "nigiri", neta: "anago", weight: 2 },
    { id: "engawa", name: "えんがわ", emoji: "🐟", type: "nigiri", neta: "engawa", weight: 2 },
    { id: "awabi", name: "あわび", emoji: "🦪", type: "nigiri", neta: "awabi", weight: 2 },
    { id: "kani", name: "かに", emoji: "🦀", type: "nigiri", neta: "kani", weight: 2 },
    { id: "mentaiko", name: "めんたい軍艦", emoji: "🌶️", type: "gunkan", neta: "mentaiko", weight: 2 },
    { id: "tsunamayo", name: "ツナマヨ軍艦", emoji: "🥪", type: "gunkan", neta: "tsunamayo", weight: 2 },
    { id: "umeshiso", name: "梅しそ巻", emoji: "🟣", type: "maki", neta: "umeshiso", weight: 2 },
    { id: "salad", name: "サラダ巻", emoji: "🥗", type: "maki", neta: "salad", weight: 2 },
    { id: "kampyo", name: "かんぴょう巻", emoji: "🤎", type: "maki", neta: "kampyo", weight: 2 },
    { id: "toki", name: "とき寿司", emoji: "⏰", type: "nigiri", neta: "toki", weight: 0, special: true, timeExtend: true },
  ];

  // タイプ別に使えるネタ（全体）
  const NETA_BY_TYPE = {
    nigiri: ["maguro", "salmon", "ebi", "tamago", "hamachi", "hotate", "ika", "tako", "anago", "engawa", "awabi", "kani", "toki"],
    gunkan: ["ikura", "uni", "corn", "negitoro", "mentaiko", "tsunamayo"],
    maki: ["cucumber", "maguro", "natto", "umeshiso", "salad", "kampyo"],
  };

  // レベルで解放される寿司 ID（累積）
  // 解放マイルストーン: Lv1〜3は少なめ、以降は5レベルごと
  // Lv1〜3は少なめ。以降は必ず +5 レベルごと（8,13,18,23）
  // Lv1〜3少なめ → +5刻み。Lv30≒3段 / Lv40≒4段 / Lv50≒5段の材料数になるよう追加
  const LEVEL_UNLOCKS = {
    1: ["maguro", "salmon"],
    2: ["ebi", "tamago"],
    3: ["ikura", "uni"],
    8: ["kappa", "tekka"],
    13: ["hamachi", "hotate"],
    18: ["corn", "negitoro"],
    23: ["natto"],
    28: ["ika", "tako"],
    33: ["anago", "engawa"],
    38: ["awabi", "kani"],
    43: ["mentaiko", "tsunamayo"],
    48: ["umeshiso", "salad"],
    50: ["kampyo"],
  };
  const MAX_UNLOCK_LEVEL = 50;
  const SERVES_PER_LEVEL = 10;

  // お客さんのベルト座席（楕円 progress 0..1、上弧付近）
  const CUSTOMER_SEATS = [0.86, 0.93, 0.0, 0.07, 0.14];
  const SERVE_WINDOW = 0.085;
  const FRONT_PROGRESS = 0.5;

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

  // —— 難易度 ——
  const MAX_LIVES = 10;
  const FIXED_PATIENCE = 30000; // お客さん待機は常に30秒固定
  const PLATE_COUNT = 20;
  const BASE_SPEED = 0.048;
  const SPAWN_CUSTOMER_EVERY = 24000;
  const MAX_CUSTOMERS = 5;
  const EARLY_MAX_CUSTOMERS = 3; // Lv3まで
  const POINTS_CORRECT = 100;
  const POINTS_COMBO = 25;
  const START_TIME_MS = 90000;
  const MAX_SESSION_MS = 600000;
  const TIME_EXTEND_MS = 45000; // とき寿司配膳で +45秒（600秒壁を超えられる）
  const TOKI_SPAWN_MIN_MS = 50000;
  const TOKI_SPAWN_MAX_MS = 100000;
  const TOKI_AVAILABLE_MS = 28000;
  const SERVE_BONUS_MS = 12000;
  const RANK_NAME_MAX = 12;


  // —— ランキング名フィルター（スペース・記号除去後に照合） ——
  const RANK_NAME_BLOCKLIST = [
    "ちんこ", "ちんぽ", "まんこ", "おまんこ", "おっぱい", "ぱいぱい",
    "せっくす", "へんたい", "やりまん", "やりちん",
    "うんこ", "きんたま", "くぱあ", "あなる", "れいぷ", "れーぷ",
    "fuck", "fck", "shit", "bitch", "asshole", "dick", "pussy", "penis", "vagina", "sex", "porn", "rape",
    "きちがい", "びっこ", "めくら", "つんぼ",
    "くろんぼ", "部落",
    "しね", "ころせ", "ころす",
    "nigger", "nigga", "faggot", "retard", "chink",
  ];

  function normalizeRankNameForFilter(name) {
    let s = String(name || "");
    try {
      s = s.normalize("NFKC");
    } catch (e) {}
    // カタカナ→ひらがな
    s = s.replace(/[\u30a1-\u30f6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
    s = s.toLowerCase();
    s = s.replace(/[013457@０１３４５７]/g, (ch) => {
      const map = {
        "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a",
        "０": "o", "１": "i", "３": "e", "４": "a", "５": "s", "７": "t",
      };
      return map[ch] || ch;
    });
    // 字母・数字以外を除去（スペース・記号・絵文字など）
    s = s.replace(/[^\p{L}\p{N}]/gu, "");
    return s;
  }

  function isRankNameBlocked(name) {
    const norm = normalizeRankNameForFilter(name);
    if (!norm) return false;
    for (let i = 0; i < RANK_NAME_BLOCKLIST.length; i++) {
      const w = normalizeRankNameForFilter(RANK_NAME_BLOCKLIST[i]);
      if (w && norm.indexOf(w) !== -1) return true;
    }
    return false;
  }

  // —— ランキング API（リモート ConoHa + localStorage フォールバック） ——
  const RankingAPI = {
    STORAGE_KEY: "kyg-sushi-ranking-v1",
    REMOTE_URL: "https://api.kyg-style.com/sushi/rank/",
    MAX_ENTRIES: 100,

    normalizeEntry(entry) {
      return {
        name: String(entry.name || "ななし").slice(0, RANK_NAME_MAX),
        score: Number(entry.score) || 0,
        level: Number(entry.level) || 1,
        served: Number(entry.served) || 0,
        date: entry.date || new Date().toISOString(),
        durationSec: Number(entry.durationSec) || 0,
      };
    },

    readLocal() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
      } catch (e) {
        console.warn("RankingAPI.readLocal failed", e);
        return [];
      }
    },

    writeLocal(list) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn("RankingAPI.writeLocal failed", e);
      }
    },

    mergeLocal(entry) {
      const list = this.readLocal();
      list.push(this.normalizeEntry(entry));
      list.sort((a, b) => b.score - a.score || a.durationSec - b.durationSec);
      const top = list.slice(0, this.MAX_ENTRIES);
      this.writeLocal(top);
      return top;
    },

    /** @returns {Promise<Array>} */
    async fetchRanking() {
      try {
        const res = await fetch(this.REMOTE_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.entries)) {
          return data.entries.map((e) => this.normalizeEntry(e));
        }
        throw new Error((data && data.error) || "bad response");
      } catch (e) {
        console.warn("RankingAPI.fetchRanking remote failed, using localStorage", e);
        return this.readLocal();
      }
    },

    /**
     * @param {{name:string,score:number,level:number,served:number,date:string,durationSec:number}} entry
     * @returns {Promise<Array>} 保存後のトップ一覧
     */
    async saveScore(entry) {
      const cleaned = this.normalizeEntry(entry);
      if (cleaned.name && isRankNameBlocked(cleaned.name)) {
        const err = new Error("その名前は使えません");
        err.code = "NAME_BLOCKED";
        throw err;
      }
      try {
        const res = await fetch(this.REMOTE_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleaned),
        });
        const data = await res.json().catch(function () { return null; });
        if (res.status === 400 && data && data.error) {
          const err = new Error(data.error);
          err.code = "NAME_BLOCKED";
          throw err;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        if (data && data.ok && Array.isArray(data.entries)) {
          this.writeLocal(data.entries.map((e) => this.normalizeEntry(e)));
          return data.entries.map((e) => this.normalizeEntry(e));
        }
        throw new Error((data && data.error) || "bad response");
      } catch (e) {
        if (e && e.code === "NAME_BLOCKED") throw e;
        console.warn("RankingAPI.saveScore remote failed, using localStorage", e);
        return this.mergeLocal(cleaned);
      }
    },
  };

  // —— DOM ——
  const $ = (sel) => document.querySelector(sel);
  const startScreen = $("#start-screen");
  const gameScreen = $("#game-screen");
  const gameoverScreen = $("#gameover-screen");
  const btnStart = $("#btn-start");
  const btnRetry = $("#btn-retry");
  const btnPlace = $("#btn-place");
  const btnRankingStart = $("#btn-ranking-start");
  const btnRankingClose = $("#btn-ranking-close");
  const startRankingPanel = $("#start-ranking-panel");
  const startRankingList = $("#start-ranking-list");
  const scoreEl = $("#score");
  const levelEl = $("#level");
  const timeLeftEl = $("#time-left");
  const livesEl = $("#lives");
  const customerCountEl = $("#customer-count");
  const customersEl = $("#customers");
  const platesEl = $("#plates");
  const beltTrack = $("#belt-track");
  const toastEl = $("#toast");
  const pauseOverlay = $("#pause-overlay");
  const finalScoreEl = $("#final-score");
  const finalHintEl = $("#final-hint");
  const finalMetaEl = $("#final-meta");
  const gameoverTitleEl = $("#gameover-title");
  const craftPanel = $("#craft-panel");
  const craftProgress = $("#craft-progress");
  const craftPreview = $("#craft-preview");
  const craftIngredients = $("#craft-ingredients");
  const rankingForm = $("#ranking-form");
  const rankNameInput = $("#rank-name");
  const btnRankSubmit = $("#btn-rank-submit");
  const btnRankSkip = $("#btn-rank-skip");
  const gameoverRankingList = $("#gameover-ranking-list");

  // —— 状態 ——
  let state = null;
  let rafId = null;
  let lastTs = 0;
  let toastTimer = null;
  let noPlateToastAt = 0;

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
    const keys = Object.keys(LEVEL_UNLOCKS)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    for (let i = 0; i < keys.length; i++) {
      const lv = keys[i];
      if (lv > level) break;
      const list = LEVEL_UNLOCKS[lv];
      if (list) ids.push.apply(ids, list);
    }
    if (isTokiUsable() && ids.indexOf("toki") < 0) ids.push("toki");
    return ids;
  }

  function customerCapForLevel(level) {
    return level <= 3 ? EARLY_MAX_CUSTOMERS : MAX_CUSTOMERS;
  }

  function getUnlockedSushi(level) {
    const ids = new Set(getUnlockedSushiIds(level));
    if (isTokiUsable()) ids.add("toki");
    return SUSHI.filter((s) => ids.has(s.id));
  }

  function getUnlockedTypes(level) {
    const types = ["nigiri"];
    if (level >= 3) types.push("gunkan");
    if (level >= 8) types.push("maki");
    return types;
  }

  function hasTokiOrder() {
    return !!(
      state &&
      state.customers &&
      state.customers.some(function (c) {
        return c.sushi && c.sushi.id === "toki" && !c.serving;
      })
    );
  }

  function isTokiUsable() {
    return !!(state && (state.tokiAvailable || hasTokiOrder()));
  }

  function getUnlockedIngredientIds(level) {
    const ids = new Set(["shari"]);
    if (level >= 3) ids.add("nori"); // 軍艦・巻物用
    for (const s of getUnlockedSushi(level)) {
      ids.add(s.neta);
    }
    if (isTokiUsable()) ids.add("toki");
    return ids;
  }

  function availableNetasForType(typeId, level) {
    const unlocked = new Set(getUnlockedSushiIds(level));
    const all = NETA_BY_TYPE[typeId] || [];
    return all.filter((netaId) => {
      if (netaId === "toki") {
        return isTokiUsable();
      }
      const sushi = findSushiByTypeAndNeta(typeId, netaId);
      return sushi && unlocked.has(sushi.id);
    });
  }

  function pickSushi() {
    if (state && state.tokiAvailable && !hasTokiOrder()) {
      const toki = SUSHI.find(function (s) { return s.id === "toki"; });
      if (toki) return toki;
    }
    const list = getUnlockedSushi(state.level).filter(function (s) {
      return !s.special;
    });
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
  const ICON_VER = "20260922a";
  const ING_ICON_FILE = {
    shari: "shari.png",
    nori: "nori.png",
    maguro: "nigiri-maguro.png",
    salmon: "nigiri-salmon.png",
    ebi: "nigiri-ebi.png",
    tamago: "nigiri-tamago.png",
    hamachi: "neta-hamachi.png",
    hotate: "neta-hotate.png",
    ikura: "gunkan-ikura.png",
    uni: "gunkan-uni.png",
    corn: "neta-corn.png",
    negitoro: "neta-negitoro.png",
    cucumber: "maki-kappa.png",
    natto: "neta-natto.png",
    ika: "neta-ika.png",
    tako: "neta-tako.png",
    anago: "neta-anago.png",
    engawa: "neta-engawa.png",
    awabi: "neta-awabi.png",
    kani: "neta-kani.png",
    mentaiko: "neta-mentaiko.png",
    tsunamayo: "neta-tsunamayo.png",
    umeshiso: "neta-umeshiso.png",
    salad: "neta-salad.png",
    kampyo: "neta-kampyo.png",
  };
  const SUSHI_ICON_FILE = {
    maguro: "nigiri-maguro.png",
    salmon: "nigiri-salmon.png",
    ebi: "nigiri-ebi.png",
    tamago: "nigiri-tamago.png",
    hamachi: "nigiri-hamachi.png",
    hotate: "nigiri-hotate.png",
    ikura: "gunkan-ikura.png",
    uni: "gunkan-uni.png",
    corn: "gunkan-corn.png",
    negitoro: "gunkan-negitoro.png",
    kappa: "maki-kappa.png",
    tekka: "maki-tekka.png",
    natto: "maki-natto.png",
    ika: "nigiri-ika.png",
    tako: "nigiri-tako.png",
    anago: "nigiri-anago.png",
    engawa: "nigiri-engawa.png",
    awabi: "nigiri-awabi.png",
    kani: "nigiri-kani.png",
    mentaiko: "gunkan-mentaiko.png",
    tsunamayo: "gunkan-tsunamayo.png",
    umeshiso: "maki-umeshiso.png",
    salad: "maki-salad.png",
    kampyo: "maki-kampyo.png",
  };

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

  function emojiFallback(emoji, size) {
    const key = size || "md";
    const px = ART_PX[key] || ART_PX.md;
    return (
      '<span class="sushi-emoji-fallback" style="font-size:' +
      px +
      'px;line-height:1;display:block;text-align:center;" aria-hidden="true">' +
      (emoji || "🍣") +
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
    // 画像なしネタ: CSS トッピング色 + 絵文字フォールバック併用
    if (ing && ["hamachi", "hotate", "corn", "negitoro", "natto"].indexOf(ingId) >= 0) {
      return (
        wrapIcon("ing " + ingId, '<span class="si-topping"></span>', sz) ||
        emojiFallback(ing.emoji, sz)
      );
    }
    if (ing) {
      return wrapIcon("ing " + ingId, '<span class="si-topping"></span>', sz);
    }
    return emojiFallback("❓", sz);
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
    return emojiFallback(sushi.emoji, sz);
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
      if (state && state.awaitingPlate) {
        return t + "完成！ 空き皿を待っています… → " + analysis.done.name;
      }
      return t + "完成！ 自動でレーンに出します → " + analysis.done.name;
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
    state.awaitingPlate = false;
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
    if (btnPlace) btnPlace.disabled = !analysis.done;
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
    if (state.craftDone) {
      // 完成済みで空き皿待ち中は材料入力をブロック
      showToast("空き皿がないよ", "bad");
      return;
    }
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
      placeCraftOnBelt({ fromAuto: true });
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
      "hamachi",
      "hotate",
      "ikura",
      "uni",
      "corn",
      "negitoro",
      "cucumber",
      "natto",
      "ika",
      "tako",
      "anago",
      "engawa",
      "awabi",
      "kani",
      "mentaiko",
      "tsunamayo",
      "umeshiso",
      "salad",
      "kampyo",
      "toki",
    ];
    for (const id of order) {
      if (!unlocked.has(id)) continue;
      const ing = INGREDIENTS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ing-btn " + (ing.kind === "neta" ? "neta" : "base");
      if (id === "toki") btn.classList.add("special");
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
    const maxP = FIXED_PATIENCE;

    const el = document.createElement("div");
    el.className = "customer" + (sushi && sushi.id === "toki" ? " toki-order" : "");
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

  function formatTimeLeft(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    return sec + "秒";
  }

  function updateHud() {
    if (!state) return;
    scoreEl.textContent = String(state.score);
    if (levelEl) levelEl.textContent = String(state.level);
    if (timeLeftEl) {
      timeLeftEl.textContent = formatTimeLeft(state.timeLeft);
      timeLeftEl.classList.toggle("urgent", state.timeLeft <= 10000);
    }
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
      endGame("lives");
    }
  }

  function renderRankingList(olEl, list, highlightScore) {
    if (!olEl) return;
    olEl.innerHTML = "";
    if (!list || !list.length) {
      const li = document.createElement("li");
      li.className = "ranking-empty";
      li.textContent = "まだ記録がありません";
      olEl.appendChild(li);
      return;
    }
    list.forEach((row, i) => {
      const li = document.createElement("li");
      if (highlightScore != null && row.score === highlightScore && i === list.findIndex((r) => r.score === highlightScore)) {
        li.classList.add("highlight");
      }
      const d = row.date ? String(row.date).slice(0, 10) : "";
      li.innerHTML =
        '<span class="rank-pos">' +
        (i + 1) +
        '</span><span class="rank-name">' +
        escapeHtml(row.name || "ななし") +
        '</span><span class="rank-score">' +
        row.score +
        '</span><span class="rank-meta">Lv' +
        (row.level || 1) +
        " / " +
        (row.served || 0) +
        "皿" +
        (d ? " / " + d : "") +
        "</span>";
      olEl.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function refreshRankingViews(highlightScore) {
    const list = await RankingAPI.fetchRanking();
    renderRankingList(startRankingList, list);
    renderRankingList(gameoverRankingList, list, highlightScore);
  }

  function setRankingFormVisible(on) {
    if (!rankingForm) return;
    rankingForm.classList.toggle("hidden", !on);
    if (on && rankNameInput) {
      rankNameInput.value = "";
      rankNameInput.focus();
    }
  }

  async function endGame(reason) {
    if (!state || !state.running) return;
    state.running = false;
    state.endReason = reason || "lives";
    state.durationSec = Math.floor(state.elapsed / 1000);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    finalScoreEl.textContent = String(state.score);
    if (finalMetaEl) {
      finalMetaEl.textContent =
        "レベル " +
        state.level +
        " ／ 提供 " +
        state.servedTotal +
        "皿 ／ " +
        state.durationSec +
        "秒";
    }

    if (state.endReason === "time") {
      if (gameoverTitleEl) gameoverTitleEl.textContent = "クリア！";
      if (state.score >= 2000) finalHintEl.textContent = "時間いっぱい！寿司職人級！";
      else if (state.score >= 800) finalHintEl.textContent = "時間終了！なかなかの腕前！";
      else finalHintEl.textContent = "制限時間終了！もう一度挑戦しよう";
    } else {
      if (gameoverTitleEl) gameoverTitleEl.textContent = "ゲームオーバー";
      if (state.score >= 2000) finalHintEl.textContent = "すごい！寿司職人級！";
      else if (state.score >= 800) finalHintEl.textContent = "なかなかの腕前！";
      else if (state.score >= 300) finalHintEl.textContent = "もう少し！次はもっと届けよう";
      else finalHintEl.textContent = "レシピを覚えて挑戦しよう";
    }

    setRankingFormVisible(true);
    await refreshRankingViews();
    showScreen("gameover");
  }

  async function submitRanking() {
    if (!state) return;
    const name = (rankNameInput && rankNameInput.value ? rankNameInput.value : "").trim();
    if (name && isRankNameBlocked(name)) {
      showToast("その名前は使えません", "bad");
      if (rankNameInput) rankNameInput.focus();
      return;
    }
    let list = null;
    try {
      list = await RankingAPI.saveScore({
        name: name || "ななし",
        score: state.score,
        level: state.level,
        served: state.servedTotal,
        date: new Date().toISOString(),
        durationSec: state.durationSec || Math.floor(state.elapsed / 1000),
      });
    } catch (e) {
      if (e && e.code === "NAME_BLOCKED") {
        showToast(e.message || "その名前は使えません", "bad");
        if (rankNameInput) rankNameInput.focus();
        return;
      }
      throw e;
    }
    setRankingFormVisible(false);
    // POST レスポンスで即反映（再GET待ちにしない）
    if (list && list.length) {
      renderRankingList(startRankingList, list);
      renderRankingList(gameoverRankingList, list, state.score);
    } else {
      await refreshRankingViews(state.score);
    }
    showToast("ランキングに登録したよ", "ok");
  }

  function skipRanking() {
    setRankingFormVisible(false);
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

  function placeCraftOnBelt(opts) {
    opts = opts || {};
    if (!state || !state.running) return false;
    if (!state.craftDone) {
      if (!opts.silent) showToast("まだ完成していないよ", "bad");
      return false;
    }
    const empty = findNextEmptyPlate();
    if (!empty) {
      state.awaitingPlate = true;
      updateCraftUI();
      const now = performance.now();
      if (!opts.silent && now - noPlateToastAt > 1500) {
        noPlateToastAt = now;
        showToast("空き皿がないよ", "bad");
      }
      return false;
    }
    empty.sushi = state.craftDone;
    renderPlateContent(empty);
    if (!opts.silent) {
      showToast(state.craftDone.name + " をレーンに出した！", "ok");
    }
    resetCraft();
    return true;
  }

  function tryPendingPlace() {
    if (!state || !state.running) return;
    if (!state.craftDone || !state.awaitingPlate) return;
    placeCraftOnBelt({ silent: true });
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
    if (target > MAX_UNLOCK_LEVEL && oldLevel >= MAX_UNLOCK_LEVEL) {
      showToast("レベル " + target + "！レーンが少し慌ただしい…", "ok", 1600);
    }
    if (oldLevel <= 3 && target > 3) {
      showToast("お客さんが増えやすくなった！", "ok", 1600);
    }

    buildIngredientButtons();
    updateHud();
  }


  function scheduleNextToki(fromElapsed) {
    const span = TOKI_SPAWN_MAX_MS - TOKI_SPAWN_MIN_MS;
    state.nextTokiAt = fromElapsed + TOKI_SPAWN_MIN_MS + Math.floor(Math.random() * span);
    state.tokiAvailable = false;
    state.tokiExpireAt = 0;
  }

  function activateTokiEvent() {
    if (!state || !state.running) return;
    state.tokiAvailable = true;
    state.tokiExpireAt = state.elapsed + TOKI_AVAILABLE_MS;
    buildIngredientButtons();
    // とき寿司を注文するお客さんを優先投入
    const hasToki = state.customers.some(function (c) {
      return c.sushi && c.sushi.id === "toki";
    });
    if (!hasToki) {
      if (state.customers.length < state.maxActive) {
        state.customers.push(createCustomer(state.customers.length));
      } else if (state.customers.length) {
        // 先頭以外をとき注文に差し替え
        const idx = Math.min(1, state.customers.length - 1);
        const old = state.customers[idx];
        const neu = createCustomer(idx);
        if (old && old.el && old.el.parentNode) old.el.remove();
        state.customers[idx] = neu;
        reassignCustomerSeats();
      }
      renderCustomers(true);
    }
    buildIngredientButtons();
    showToast("⏰ ときネタ出現！届けると時間延長", "ok", 2200);
  }

  function updateTokiEvent() {
    if (!state || !state.running) return;
    if (!state.tokiAvailable && state.elapsed >= state.nextTokiAt) {
      activateTokiEvent();
      return;
    }
    if (state.tokiAvailable && state.elapsed >= state.tokiExpireAt) {
      const stillWanted = state.customers.some(function (c) {
        return c.sushi && c.sushi.id === "toki" && !c.serving;
      });
      if (!stillWanted) {
        scheduleNextToki(state.elapsed);
        buildIngredientButtons();
      } else {
        // 注文が残っている間はボタン維持、期限だけ延ばす
        state.tokiExpireAt = state.elapsed + 8000;
      }
    }
  }

  function sessionTimeCap() {
    return MAX_SESSION_MS + (state.sessionBonusMs || 0);
  }

  function addServeTimeBonus(extraMs) {
    const add = extraMs == null ? SERVE_BONUS_MS : extraMs;
    const cap = Math.max(0, sessionTimeCap() - state.elapsed);
    state.timeLeft = Math.min(state.timeLeft + add, cap);
  }

  function grantTokiTimeExtend() {
    state.sessionBonusMs = (state.sessionBonusMs || 0) + TIME_EXTEND_MS;
    state.timeLeft += TIME_EXTEND_MS;
    // 壁を超えてカウントアップできるよう、経過に対する上限も押し上げる
    const cap = Math.max(0, sessionTimeCap() - state.elapsed);
    if (state.timeLeft > cap) state.timeLeft = cap;
    showToast("⏰ とき寿司！ +" + Math.round(TIME_EXTEND_MS / 1000) + "秒延長", "ok", 2000);
    scheduleNextToki(state.elapsed + 5000);
    state.tokiAvailable = false;
    buildIngredientButtons();
  }

  function performAutoServe(plate, cust) {
    if (!state || !state.running) return;
    if (!plate.sushi || cust.serving) return;

    cust.serving = true;
    plate.cooling = true;

    const bonus = state.combo * POINTS_COMBO;
    state.score += POINTS_CORRECT + bonus;
    state.combo += 1;
    state.servedTotal += 1;
    if (plate.sushi && plate.sushi.timeExtend) {
      grantTokiTimeExtend();
    } else {
      addServeTimeBonus();
    }

    plate.el.classList.add("flash-ok");
    showToast(
      bonus > 0
        ? "+" + (POINTS_CORRECT + bonus) + " コンボ！ +10秒"
        : "おいしい！ +" + POINTS_CORRECT + " +10秒",
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
      tryPendingPlace();
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
    tryPendingPlace();

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
    state.timeLeft -= dt;
    // 残り時間が「総経過600秒」を超えないようキャップ
    updateTokiEvent();
    const maxLeft = Math.max(0, sessionTimeCap() - state.elapsed);
    if (state.timeLeft > maxLeft) state.timeLeft = maxLeft;

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateHud();
      endGame("time");
      return;
    }

    const custCap = customerCapForLevel(state.level);
    if (state.maxActive > custCap) state.maxActive = custCap;
    if (
      state.maxActive < custCap &&
      state.elapsed - state.lastUnlockAt > SPAWN_CUSTOMER_EVERY
    ) {
      state.lastUnlockAt = state.elapsed;
      state.maxActive += 1;
      if (state.customers.length < state.maxActive) {
        state.customers.push(createCustomer(state.customers.length));
        showToast("お客さんが増えた！", "ok");
      }
    }

    updateHud();
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
      timeLeft: START_TIME_MS,
      sessionBonusMs: 0,
      tokiAvailable: false,
      tokiExpireAt: 0,
      nextTokiAt: TOKI_SPAWN_MIN_MS + Math.floor(Math.random() * (TOKI_SPAWN_MAX_MS - TOKI_SPAWN_MIN_MS)),
      lastUnlockAt: 0,
      maxActive: 1,
      customers: [],
      plates: [],
      craftSteps: [],
      craftDone: null,
      awaitingPlate: false,
      endReason: null,
      durationSec: 0,
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
    if (startRankingPanel) startRankingPanel.classList.add("hidden");
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

  if (btnRankingStart) {
    btnRankingStart.addEventListener("click", async () => {
      await refreshRankingViews();
      if (startRankingPanel) startRankingPanel.classList.toggle("hidden");
    });
  }
  if (btnRankingClose) {
    btnRankingClose.addEventListener("click", () => {
      if (startRankingPanel) startRankingPanel.classList.add("hidden");
    });
  }
  if (btnRankSubmit) {
    btnRankSubmit.addEventListener("click", () => {
      submitRanking();
    });
  }
  if (btnRankSkip) {
    btnRankSkip.addEventListener("click", skipRanking);
  }
  if (rankNameInput) {
    rankNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitRanking();
      }
    });
  }

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
  refreshRankingViews();
  showScreen("start");
})();
