(() => {
  "use strict";
  const C = window.CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const PASTELS = ["#ffc2dc", "#ffd6a5", "#caffbf", "#bde0fe", "#e9dcff", "#fdffb6", "#ffadad", "#c9f2e3", "#ffe0f0", "#d0f4ff"];
  const FOOD_EMOJI = ["🍕", "🍣", "🍔", "🌮", "🍛", "🥟", "🍗", "🍝", "🥗", "🍱", "🧋", "🍰", "🥘", "🍤", "🍙", "🌭", "🥩", "🍦"];

  // ── storage (safe) ──
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

  const defaults = (C.restaurants || []).map((r, i) => ({ color: PASTELS[i % PASTELS.length], emoji: "🍽️", ...r, id: "d-" + slug(r.name), builtIn: true }));
  let custom = load("mfp.custom", []);
  let off = new Set(load("mfp.off", []));
  let muted = load("mfp.muted", false);
  let vetoLeft = 1;
  let busy = false;
  let tab = "claw";

  const allOptions = () => [...defaults, ...custom];
  const activeOptions = () => allOptions().filter((o) => !off.has(o.id));
  const friend = C.friendName || "bạn ơi";

  // ── sound (tiny synth, no files) ──
  let actx;
  function tone(freq, dur = 0.1, type = "sine", vol = 0.12, slide = 0, delay = 0) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + delay;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* no audio */ }
  }
  const sfx = {
    pop: () => tone(660, 0.09, "sine", 0.14, 400),
    tick: () => tone(320, 0.03, "square", 0.03),
    drop: () => tone(620, 0.7, "triangle", 0.1, -420),
    grab: () => { tone(180, 0.08, "square", 0.08); tone(240, 0.08, "square", 0.08, 0, 0.08); },
    fail: () => { tone(420, 0.25, "sawtooth", 0.06, -200); tone(300, 0.4, "sawtooth", 0.06, -180, 0.22); },
    boing: () => tone(220, 0.35, "sine", 0.14, 520),
    beep: (hi) => tone(hi ? 880 : 520, 0.14, "square", 0.06),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "triangle", 0.13, 0, i * 0.1)),
  };

  // ── tween helper ──
  const ease = {
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    in: (t) => t * t * t,
    bounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };
  function tween(obj, props, ms, e = ease.inOut, onFrame) {
    const from = {}; for (const k in props) from[k] = obj[k];
    const t0 = performance.now();
    return new Promise((res) => {
      (function step(now) {
        const t = Math.min(1, (now - t0) / ms), v = e(t);
        for (const k in props) obj[k] = from[k] + (props[k] - from[k]) * v;
        onFrame && onFrame();
        t < 1 ? requestAnimationFrame(step) : res();
      })(t0);
    });
  }

  // ── mascot speech ──
  const speech = $("#speech"), mascot = $("#mascot");
  function say(text) {
    speech.textContent = text;
    speech.classList.remove("pop"); void speech.offsetWidth; speech.classList.add("pop");
    mascot.classList.remove("wiggle"); void mascot.offsetWidth; mascot.classList.add("wiggle");
  }

  function setBusy(b) {
    busy = b;
    document.body.classList.toggle("busy", b);
    ["#dropBtn", "#leftBtn", "#rightBtn", "#raceBtn"].forEach((s) => ($(s).disabled = b));
  }

  // ── options UI ──
  const chipsEl = $("#chips");
  function renderChips(newId) {
    chipsEl.innerHTML = "";
    for (const o of allOptions()) {
      const chip = document.createElement("div");
      chip.className = "chip" + (off.has(o.id) ? " off" : "") + (o.id === newId ? " new" : "");
      chip.style.setProperty("--c", o.color);
      const main = document.createElement("button");
      main.type = "button"; main.className = "chip-main";
      main.title = off.has(o.id) ? "Hôm nay bỏ qua — chạm để thêm lại" : "Chạm để bỏ qua hôm nay";
      const em = document.createElement("span"); em.className = "chip-emoji"; em.textContent = o.emoji;
      const nm = document.createElement("span"); nm.className = "chip-name"; nm.textContent = o.name;
      main.append(em, nm);
      main.onclick = () => toggleOption(o);
      chip.append(main);
      if (!o.builtIn) {
        const del = document.createElement("button");
        del.type = "button"; del.className = "chip-del"; del.textContent = "×"; del.title = "Xoá";
        del.onclick = () => removeOption(o);
        chip.append(del);
      }
      chipsEl.append(chip);
    }
    const n = activeOptions().length;
    $("#count").textContent = `${n} quán đang chơi`;
  }
  function optionsChanged(newId) {
    save("mfp.custom", custom);
    save("mfp.off", [...off]);
    renderChips(newId);
    resetCurrentGame();
  }
  function toggleOption(o) {
    if (busy) return say("Đợi chơi xong đã nha, hihi 🙈");
    if (off.has(o.id)) { off.delete(o.id); say(`${o.name} đã quay lại cuộc chơi! ${o.emoji}`); }
    else { off.add(o.id); say(`Bye bye ${o.name}… hôm nay không nha 👋`); }
    sfx.pop(); optionsChanged();
  }
  function removeOption(o) {
    if (busy) return say("Đợi chơi xong đã nha, hihi 🙈");
    custom = custom.filter((c) => c.id !== o.id); off.delete(o.id);
    say(`${o.name} đã rời nhóm chat 🫥`); sfx.pop(); optionsChanged();
  }

  // emoji picker + add form
  let chosenEmoji = FOOD_EMOJI[0];
  const pickEl = $("#emojiPick");
  FOOD_EMOJI.forEach((e) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = e; b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(e === chosenEmoji));
    b.onclick = () => {
      chosenEmoji = e; sfx.tick();
      pickEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    };
    pickEl.append(b);
  });
  const REACT = ["Ồ {n}! Gu xịn ghê~ 💖", "{n}?! Chuẩn luôn 👑", "Thêm {n} vào thực đơn định mệnh ✨", "{n} đã tham chiến 😤", "{n} nghe ngon ghê 🤤"];
  $("#addForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const input = $("#addName");
    const name = input.value.trim().replace(/\s+/g, " ");
    if (!name) { input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); return say("Gõ tên quán trước đã nha 🙃"); }
    if (busy) return say("Đợi chơi xong đã nha, hihi 🙈");
    if (allOptions().some((o) => o.name.toLowerCase() === name.toLowerCase())) return say(`${name} có trong danh sách rồi nè! 👀`);
    const id = "c-" + Date.now().toString(36);
    custom.push({ id, name, emoji: chosenEmoji, color: PASTELS[(allOptions().length) % PASTELS.length] });
    input.value = "";
    // move the picker to an emoji nobody uses yet, so each place looks different
    const used = new Set(allOptions().map((o) => o.emoji));
    const next = FOOD_EMOJI.find((e) => !used.has(e));
    if (next) pickEl.querySelectorAll("button")[FOOD_EMOJI.indexOf(next)].click();
    sfx.pop(); say(pick(REACT).replace("{n}", name));
    optionsChanged(id);
  });

  // ── tabs ──
  document.querySelectorAll(".tab").forEach((t) => {
    t.onclick = () => {
      if (busy || t.dataset.tab === tab) return;
      tab = t.dataset.tab;
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      $("#panel-claw").hidden = tab !== "claw";
      $("#panel-race").hidden = tab !== "race";
      sfx.pop(); resetCurrentGame();
      say(tab === "claw" ? "Điều khiển càng gắp, gắp một viên ngon nha! 🕹️" : "Đặt cược đi! Món nào chạy nhanh nhất? 🏁");
    };
  });
  function resetCurrentGame() { tab === "claw" ? setupClaw() : setupRace(); }

  function needTwo() {
    if (activeOptions().length >= 2) return false;
    say(activeOptions().length ? "Có mỗi một quán thì đâu phải lựa chọn, đó là định mệnh 😂 Thêm quán đi!" : "Thực đơn trống trơn! Thêm vài quán nha 🥺");
    return true;
  }

  // ═════════════════ CLAW MACHINE ═════════════════
  const box = $("#clawBox"), clawEl = $("#claw"), ropeEl = clawEl.querySelector(".rope");
  const REST = 20, HEAD_GRIP = 40, CLAW_TOP = 6, MIN_X = 9, MAX_X = 94, CHUTE_X = 9;
  const claw = { x: 55, rope: REST, open: false };
  let capsules = [], tries = 0, fails = 0;

  const capSize = (n) => (n <= 6 ? 64 : n <= 10 ? 54 : n <= 16 ? 48 : 42);
  const floorY = (s) => box.clientHeight - s - 22;
  const widthPct = (s) => (s / (box.clientWidth || 360)) * 100;

  function renderClaw() {
    clawEl.style.left = claw.x + "%";
    ropeEl.style.height = claw.rope + "px";
    clawEl.classList.toggle("open", claw.open);
    for (const c of capsules) {
      if (c.attached) { c.x = claw.x; c.y = CLAW_TOP + claw.rope + HEAD_GRIP - c.s / 2; }
      c.el.style.left = c.x + "%";
      c.el.style.top = c.y + "px";
    }
  }

  function makeCapsule(o, x, y, s) {
    const el = document.createElement("div");
    el.className = "capsule";
    el.style.width = el.style.height = s + "px";
    el.style.setProperty("--c", o.color);
    el.title = o.name;
    const ball = document.createElement("div"); ball.className = "ball";
    const em = document.createElement("span"); em.className = "cap-emoji"; em.textContent = o.emoji; em.style.fontSize = s * 0.46 + "px";
    const lbl = document.createElement("div"); lbl.className = "cap-label"; lbl.textContent = o.name;
    ball.append(em); el.append(ball, lbl); box.append(el);
    return { opt: o, el, x, y, s, attached: false };
  }

  function setupClaw() {
    box.querySelectorAll(".capsule").forEach((e) => e.remove());
    capsules = [];
    claw.x = 55; claw.rope = REST; claw.open = false;
    // fill the machine with ~12-15 capsules: each option gets several copies
    const base = activeOptions();
    let copies = base.length ? Math.max(1, Math.round(13.5 / base.length)) : 0;
    while (copies > 1 && base.length * copies > 16) copies--;
    const opts = shuffle(base.flatMap((o) => Array(copies).fill(o)));
    renderLegend(base);
    box.classList.toggle("many", opts.length > 6);
    if (!opts.length || !box.clientWidth) return renderClaw();
    const s = capSize(opts.length), sp = widthPct(s);
    const minX = 22 + sp / 2, maxX = 97 - sp / 2;
    const perRow = Math.max(1, Math.floor((maxX - minX) / (sp * 1.08)) + 1);
    opts.forEach((o, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const n = Math.min(perRow, opts.length - row * perRow);
      let x = n > 1 ? minX + (col * (maxX - minX)) / (n - 1) : (minX + maxX) / 2;
      x = clamp(x + rand(-0.35, 0.35) * sp + (row % 2 ? sp * 0.4 : 0), minX, maxX);
      capsules.push(makeCapsule(o, x, floorY(s) - row * s * 0.74, s));
    });
    settle(true); // let the jittered pile drop into a messy heap
    renderClaw();
  }

  // little "which emoji is which" key under the machine
  function renderLegend(list) {
    const lg = $("#clawLegend");
    lg.innerHTML = "";
    for (const o of list) {
      const s = document.createElement("span");
      s.style.setProperty("--c", o.color);
      s.textContent = `${o.emoji} ${o.name}`;
      lg.append(s);
    }
  }

  // drop floating capsules onto the pile
  function settle(instant) {
    const done = [], anims = [];
    const W = box.clientWidth || 360;
    for (const c of capsules.filter((c) => !c.attached).sort((a, b) => b.y - a.y)) {
      let y = floorY(c.s);
      // rest on a ball below where the two circles touch, so balls nestle into gaps
      for (const o of done) {
        const dx = ((o.x - c.x) / 100) * W;
        if (Math.abs(dx) < c.s * 0.92) y = Math.min(y, o.ty - Math.sqrt(c.s * c.s - dx * dx) * 0.94);
      }
      c.ty = y; done.push(c);
      if (instant) c.y = y;
      else if (Math.abs(y - c.y) > 1) anims.push(tween(c, { y }, 550, ease.bounce, renderClaw));
    }
    return Promise.all(anims);
  }

  // movement (hold buttons / keys)
  let moveDir = 0, moveRAF = 0, lastTick = 0;
  function moveLoop(now) {
    if (!moveDir || busy) { moveRAF = 0; return; }
    claw.x = clamp(claw.x + moveDir * 0.75, MIN_X, MAX_X);
    if (now - lastTick > 90) { sfx.tick(); lastTick = now; }
    renderClaw();
    moveRAF = requestAnimationFrame(moveLoop);
  }
  function startMove(d) { if (busy) return; moveDir = d; if (!moveRAF) moveRAF = requestAnimationFrame(moveLoop); }
  function stopMove() { moveDir = 0; }
  [["#leftBtn", -1], ["#rightBtn", 1]].forEach(([sel, d]) => {
    const b = $(sel);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.classList.add("held"); startMove(d); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => { b.classList.remove("held"); stopMove(); }));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || !$("#modal").hidden) return;
    if (tab === "claw") {
      if (e.key === "ArrowLeft") { e.preventDefault(); startMove(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); startMove(1); }
      if (e.key === " " || e.key === "ArrowDown") { e.preventDefault(); drop(); }
    } else if (e.key === " " || e.key === "Enter") { e.preventDefault(); startRace(); }
  });
  document.addEventListener("keyup", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") stopMove(); });

  const AIR = ["Gắp được… không khí. Ngon ghê 💨", "Chỗ đó trống mà, ngốc ơi 🙃", "Càng gắp cũng đói, mà chỗ đó trống trơn 😂", "Hụt! Nhắm vào viên nào đó đi~ 🎯"];
  const SLIP = ["Tuột tay rồiii! 🧈", "Trơn như sợi mì!! 🍜💦", "Nó bảo 'hôm nay thì không' 😤", "Máy gian lận hả?! Huhu 😭", "Càng gắp ngại ngùng quá 🙈", "Suýt nữa!! Thử lại nha {f} 💪"];
  const GOT = ["DÍNH RỒI!! 🎉", "Yeahhh, làm được rồi! ✨", "Nữ hoàng gắp thú 👑"];

  $("#dropBtn").onclick = () => drop();
  async function drop() {
    if (busy || tab !== "claw" || needTwo()) return;
    if (capsules.length < 2) setupClaw();
    stopMove(); setBusy(true);
    tries++; $("#tries").textContent = tries;
    sfx.drop(); say("Bắt đầu nè… 🫣");
    claw.open = true; renderClaw(); await sleep(250);

    const s = capsules[0].s, tol = widthPct(s) * 0.55;
    const under = capsules.filter((c) => Math.abs(c.x - claw.x) < tol).sort((a, b) => a.y - b.y)[0];
    const downTo = (under ? under.y : floorY(s)) - HEAD_GRIP + s / 2 - CLAW_TOP;
    await tween(claw, { rope: downTo }, 950, ease.inOut, renderClaw);
    claw.open = false; renderClaw(); sfx.grab(); await sleep(380);

    if (!under) {
      await tween(claw, { rope: REST }, 700, ease.inOut, renderClaw);
      sfx.fail(); say(pick(AIR)); setBusy(false); return;
    }

    under.attached = true; under.el.classList.add("grabbed");
    const slip = fails < 2 && Math.random() < 0.4; // never more than 2 slips in a row
    if (slip) {
      await tween(claw, { rope: REST + (downTo - REST) * rand(0.25, 0.6) }, 600, ease.inOut, renderClaw);
      await sleep(120);
      under.attached = false; under.el.classList.remove("grabbed");
      claw.open = true; renderClaw();
      sfx.fail(); say(pick(SLIP).replace("{f}", friend)); fails++;
      under.x = clamp(under.x + rand(-12, 12), 24, 92);
      await settle();
      claw.open = false;
      await tween(claw, { rope: REST }, 450, ease.inOut, renderClaw);
      setBusy(false); return;
    }

    await tween(claw, { rope: REST }, 850, ease.inOut, renderClaw);
    sfx.boing(); say("Ồ ồ ồ… 👀");
    await tween(claw, { x: CHUTE_X }, 300 + Math.abs(claw.x - CHUTE_X) * 16, ease.inOut, renderClaw);
    await sleep(200);
    claw.open = true; under.attached = false; renderClaw();
    await tween(under, { y: box.clientHeight + 10 }, 450, ease.in, renderClaw);
    under.el.remove(); capsules = capsules.filter((c) => c !== under);
    fails = 0; claw.open = false; renderClaw();
    say(pick(GOT));
    await settle();
    win(under.opt, `Sau ${tries} lượt, máy gắp đã chọn…`);
  }

  // ═════════════════ BUNNY RACE ═════════════════
  const track = $("#track"), tickerEl = $("#ticker");
  let racers = [];
  function ticker(t) { tickerEl.textContent = t; tickerEl.classList.remove("pop"); void tickerEl.offsetWidth; tickerEl.classList.add("pop"); }

  function setupRace() {
    track.innerHTML = "";
    racers = activeOptions().map((o) => {
      const lane = document.createElement("div"); lane.className = "lane";
      const name = document.createElement("div"); name.className = "lane-name"; name.textContent = `${o.emoji} ${o.name}`;
      const run = document.createElement("div"); run.className = "lane-run";
      const fin = document.createElement("div"); fin.className = "finish";
      const runner = document.createElement("div"); runner.className = "runner";
      const body = document.createElement("span"); body.className = "r-body"; body.textContent = o.emoji;
      const status = document.createElement("span"); status.className = "r-status";
      runner.append(body, status); run.append(fin, runner); lane.append(name, run); track.append(lane);
      return { opt: o, lane, run, runner, status, p: 0, sleep: 0, boost: 0, rev: 0, kind: "" };
    });
    renderRace();
    if (!racers.length) ticker("🎙️ Không có tay đua?! Thêm quán ở trên nha 🥺");
    else ticker(`🎙️ ${racers.length} tay đua đói bụng đã vào vạch xuất phát!`);
  }
  function renderRace() {
    for (const r of racers) {
      const max = r.run.clientWidth - 52;
      r.runner.style.transform = `translateX(${(clamp(r.p, 0, 100) / 100) * max}px)`;
    }
  }
  function setStatus(r, kind, icon) {
    r.lane.classList.remove("sleep", "selfie", "rev");
    if (kind) r.lane.classList.add(kind);
    r.kind = kind; r.status.textContent = icon || "";
  }

  const EVENTS = [
    { bad: true,  f: (r) => { r.sleep = 1500; setStatus(r, "sleep", "💤"); return `💤 ${r.opt.name} quyết định đi ngủ trưa. Đúng bài.`; } },
    { bad: true,  f: (r) => { r.sleep = 1000; setStatus(r, "selfie", "📸"); return `📸 ${r.opt.name} dừng lại chụp ảnh sống ảo!`; } },
    { bad: true,  f: (r) => { r.p = Math.max(0, r.p - 7); sfx.fail(); return `😵 ${r.opt.name} vấp phải sợi mì!!`; } },
    { bad: true,  f: (r) => { r.rev = 1100; setStatus(r, "rev", "🔄"); return `🔄 ${r.opt.name} chạy NGƯỢC CHIỀU rồi 😭`; } },
    { bad: false, f: (r) => { r.boost = 1300; setStatus(r, "", "⚡"); return `⚡ ${r.opt.name} ngửi thấy đồ ăn thử miễn phí! VÈOOO!`; } },
    { bad: false, f: (r) => { r.p += 9; sfx.boing(); return `🚀 ${r.opt.name} tìm được đường tắt bí mật?!`; } },
    { bad: false, f: (r) => { r.boost = 900; setStatus(r, "", "💖"); return `💖 ${r.opt.name} được ${friend} cổ vũ!`; } },
  ];

  $("#raceBtn").onclick = () => startRace();
  async function startRace() {
    if (busy || tab !== "race" || needTwo()) return;
    setupRace(); setBusy(true);
    say("Ai sẽ thắng đây?! Không dám nhìn 🙈");
    for (const n of ["3", "2", "1"]) { ticker(`⏱️ ${n}…`); sfx.beep(false); await sleep(650); }
    ticker("🏁 CHẠYYYY!"); sfx.beep(true);
    racers.forEach((r) => r.lane.classList.add("running"));

    const winner = await new Promise((resolve) => {
      let last = performance.now(), nextEvent = last + 900;
      (function frame(now) {
        const dt = Math.min(50, now - last); last = now;
        for (const r of racers) {
          if (r.sleep > 0) { r.sleep -= dt; if (r.sleep <= 0) setStatus(r, ""); continue; }
          let v = rand(0.35, 1.25) * (r.boost > 0 ? 2.4 : 1);
          if (r.boost > 0 && (r.boost -= dt) <= 0) setStatus(r, "");
          if (r.rev > 0) { v = -v * 0.6; if ((r.rev -= dt) <= 0) setStatus(r, ""); }
          r.p = Math.max(0, r.p + v * dt * 0.0115);
        }
        if (now > nextEvent) {
          nextEvent = now + rand(700, 1500);
          const ev = pick(EVENTS);
          const sorted = [...racers].sort((a, b) => b.p - a.p);
          const free = sorted.filter((r) => !r.kind && r.boost <= 0);
          if (free.length) {
            // drama: bad luck tends to hit the leader, good luck the stragglers
            const target = Math.random() < 0.55 ? (ev.bad ? free[0] : free[free.length - 1]) : pick(free);
            ticker(ev.f(target));
          }
        }
        renderRace();
        const done = racers.filter((r) => r.p >= 100).sort((a, b) => b.p - a.p);
        if (done.length) return resolve(done[0]);
        requestAnimationFrame(frame);
      })(last);
    });

    racers.forEach((r) => { r.lane.classList.remove("running"); setStatus(r, ""); });
    winner.lane.classList.add("winner");
    const second = [...racers].sort((a, b) => b.p - a.p)[1];
    ticker(second && winner.p - second.p < 4 ? `📸 VỀ ĐÍCH SÁT NÚT!! ${winner.opt.name} thắng trong gang tấc! 🐰` : `🏆 ${winner.opt.name} VÔ ĐỊCH!`);
    await sleep(900);
    win(winner.opt, "Món chạy nhanh nhất vũ trụ là…");
  }

  // ═════════════════ RESULT ═════════════════
  const NOTES = ["Bụng của bạn đã được lắng nghe 🫶", "Không được đổi ý! (thôi được, một lần…) 😝", "Định mệnh ngon lành ✨", "Thần thỏ không bao giờ sai 🐰"];
  let lastWinner = null;
  function win(opt, kicker) {
    lastWinner = opt;
    setBusy(false);
    $("#resultKicker").textContent = kicker;
    $("#resultEmoji").textContent = opt.emoji;
    $("#resultName").textContent = opt.name;
    $("#resultNote").textContent = opt.note || pick(NOTES);
    $("#mapsLink").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(opt.maps || opt.name);
    const veto = $("#vetoBtn");
    veto.disabled = vetoLeft <= 0;
    veto.textContent = vetoLeft > 0 ? "Ơ thôi… dùng quyền phủ quyết 🙅‍♀️" : "Hết quyền phủ quyết rồi. Định mệnh đó 😈";
    $("#modal").hidden = false;
    sfx.win(); confetti();
    say(`Chốt ${opt.name} nha!! ${opt.emoji} Yeee~`);
    $("#againBtn").focus({ preventScroll: true });
  }
  function closeModal() { $("#modal").hidden = true; }
  $("#againBtn").onclick = () => { closeModal(); resetCurrentGame(); say("Nữa hả?! Ok ok, thêm lần nữa 😆"); };
  $("#vetoBtn").onclick = () => {
    if (vetoLeft <= 0 || !lastWinner) return;
    vetoLeft--;
    off.add(lastWinner.id);
    closeModal(); sfx.fail();
    say(`PHỦ QUYẾT! 🙅‍♀️ ${lastWinner.name} bị loại (chạm vào nó trong danh sách để đưa lại nha).`);
    optionsChanged();
  };
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

  function confetti() {
    const box = $("#confetti");
    const bits = ["💖", "🌸", "🍓", "✨", "🎀", "💕", lastWinner ? lastWinner.emoji : "🍜"];
    for (let i = 0; i < 45; i++) {
      const s = document.createElement("span");
      s.textContent = pick(bits);
      s.style.left = rand(0, 100) + "vw";
      s.style.fontSize = rand(16, 34) + "px";
      s.style.animationDuration = rand(2.2, 4) + "s";
      s.style.animationDelay = rand(0, 0.8) + "s";
      box.append(s);
      setTimeout(() => s.remove(), 5000);
    }
  }

  // ═════════════════ BOOT ═════════════════
  $("#title").textContent = C.title || "Mình ăn gì thế";
  if (C.title) document.title = C.title + " 🍓";
  say(`${friend} ơi đói chưa? Để số phận chọn nha 💕`);

  const muteBtn = $("#muteBtn");
  const paintMute = () => (muteBtn.textContent = muted ? "🔇" : "🔊");
  muteBtn.onclick = () => { muted = !muted; save("mfp.muted", muted); paintMute(); sfx.pop(); };
  paintMute();

  if (C.backgroundImage) {
    const img = new Image();
    img.onload = () => {
      $("#mascotImg").src = img.src;
      $("#bgChar").style.backgroundImage = `url("${img.src}")`;
      document.body.classList.add("has-char");
    };
    img.src = C.backgroundImage;
  }

  const fl = $("#floaties");
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("span");
    s.textContent = pick(["💗", "🍓", "🌸", "⭐", "🎀", "☁️", "💕"]);
    s.style.left = rand(0, 100) + "vw";
    s.style.fontSize = rand(14, 30) + "px";
    s.style.animationDuration = rand(14, 28) + "s";
    s.style.animationDelay = -rand(0, 28) + "s";
    fl.append(s);
  }

  renderChips();
  setupClaw();
  // only rebuild when the width really changes (mobile address bars fire resize on scroll)
  let rz, lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (!busy && window.innerWidth !== lastW) { lastW = window.innerWidth; resetCurrentGame(); } }, 200);
  });
})();
