// ---------------- วิดเจ็ต (วาดเป็นภาพ) ----------------
const ICON_URL = "https://raw.githubusercontent.com/bagwrcphoto-boop/shiftapp/main/icons/";
const ICON_NAMES = ["sun", "sunset", "moon", "off", "note"];
const SH_ICON = { "ช": "sun", "บ": "sunset", "ด": "moon" };
const SH_LABEL = { "ช": "เช้า", "บ": "บ่าย", "ด": "ดึก" };
const SH_END = { "ช": "16:00", "บ": "24:00", "ด": "08:00" };

async function loadIcons() {
  const dir = fm.joinPath(fm.documentsDirectory(), "shiftapp-icons");
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const out = {};
  for (const n of ICON_NAMES) {
    const p = fm.joinPath(dir, n + ".png");
    if (!fm.fileExists(p)) {
      try { const r = new Request(ICON_URL + n + ".png"); r.timeoutInterval = 6; const img = await r.loadImage(); fm.writeImage(p, img); } catch (e) {}
    }
    if (fm.fileExists(p)) out[n] = fm.readImage(p);
  }
  return out;
}

// ขนาดวิดเจ็ต (pt) ตามขนาดจอ
function widgetSize(family) {
  const s = Device.screenSize(), w = Math.min(s.width, s.height), h = Math.max(s.width, s.height);
  const T = { "430x932": [170, 364, 382], "440x956": [170, 364, 382], "428x926": [170, 364, 382], "414x896": [169, 360, 379],
    "402x874": [162, 345, 363], "393x852": [158, 338, 354], "390x844": [158, 338, 354], "375x812": [155, 329, 345],
    "414x736": [159, 348, 357], "375x667": [148, 321, 324], "320x568": [141, 292, 311] };
  const v = T[`${w}x${h}`] || [Math.round(w * 0.405), Math.round(w * 0.86), Math.round(w * 0.9)];
  if (family === "small") return new Size(v[0], v[0]);
  if (family === "medium") return new Size(v[1], v[0]);
  return new Size(v[1], v[2]);
}

const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const mixHex = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const CA = (h, a = 1) => new Color(h, a);

function wTheme(d) {
  const t = d.settings.theme || {}, p = PALETTES[t.palette] || PALETTES.sakura;
  if (t.style === "dark") {
    const q = p.dark;
    return { dark: true, g1: q.body, g2: q.card, b1: q.blobs[0], b2: q.blobs[1], title: q.title, sub: q.sub, text: q.title, accent: q.accent, onAccent: q.body,
      card: "#FFFFFF", cardA: 0.1, offA: 0.06, pastA: 0.55, past: q.body,
      shift: { "ช": ["#1E4A36", "#A6F2CC"], "บ": ["#22355E", "#C0D6FF"], "ด": ["#35285E", "#DED0FF"] } };
  }
  return { dark: false, g1: mixHex(p.body, "#FFD6E6", t.palette === "sakura" ? 0.35 : 0.1), g2: mixHex(p.blobs[1], "#FFFFFF", 0.72), b1: p.blobs[0], b2: p.blobs[1],
    title: p.title, sub: p.sub, text: p.text, accent: p.accent, onAccent: "#FFFFFF",
    card: "#FFFFFF", cardA: 0.62, offA: 0.42, pastA: 0.45, past: "#FFFFFF",
    shift: { "ช": ["#D9F4E3", "#1F5A3B"], "บ": ["#DFEAFF", "#24427E"], "ด": ["#ECE4FF", "#4A2F8C"] } };
}

// ----- เครื่องมือวาด -----
function newCtx(sz) { const c = new DrawContext(); c.size = sz; c.respectScreenScale = true; c.opaque = false; return c; }
function rr(c, x, y, w, h, r, color) { const p = new Path(); p.addRoundedRect(new Rect(x, y, w, h), r, r); c.addPath(p); c.setFillColor(color); c.fillPath(); }
function rrStroke(c, x, y, w, h, r, color, lw) { const p = new Path(); p.addRoundedRect(new Rect(x, y, w, h), r, r); c.addPath(p); c.setStrokeColor(color); c.setLineWidth(lw); c.strokePath(); }
function tx(c, s, x, y, w, h, font, color, align) {
  c.setFont(font); c.setTextColor(color);
  if (align === "center") c.setTextAlignedCenter(); else if (align === "right") c.setTextAlignedRight(); else c.setTextAlignedLeft();
  c.drawTextInRect(String(s), new Rect(x, y, w, h));
}
function img(c, I, name, x, y, s) { if (I[name]) c.drawImageInRect(I[name], new Rect(x, y, s, s)); }
function drawBg(c, sz, T) {
  const n = 48;
  for (let i = 0; i < n; i++) { c.setFillColor(CA(mixHex(T.g1, T.g2, i / (n - 1)))); c.fillRect(new Rect(0, sz.height * i / n, sz.width, sz.height / n + 1)); }
  const blob = (cx, cy, r, hex, a) => { for (let k = 14; k >= 1; k--) { const q = r * k / 14; c.setFillColor(CA(hex, a / 14)); c.fillEllipse(new Rect(cx - q, cy - q, q * 2, q * 2)); } };
  blob(sz.width * 0.92, -sz.height * 0.08, sz.width * 0.42, T.b1, T.dark ? 0.5 : 0.55);
  blob(sz.width * 0.05, sz.height * 1.08, sz.width * 0.42, T.b2, T.dark ? 0.45 : 0.45);
}
const shortName = d => String(d.me || "").replace(/^(นางสาว|นาง|นาย)/, "").split(" ")[0];
const dkey = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const noteOn = (d, dt) => ((d.notes || {})[dkey(dt)] || "").trim();
const TH_MON = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const dayDiffW = (a, b) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
const dayLabel = (dd, date) => dd === 0 ? "วันนี้" : dd === 1 ? "พรุ่งนี้" : `${DOW[date.getDay()]} ${date.getDate()} ${TH_MON[date.getMonth()]}`;
function untilText(ms) { const m = Math.max(0, Math.round(ms / 6e4)), dd = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  return dd >= 2 ? `อีก ${dd} วัน` : dd === 1 ? `อีก 1 วัน ${h} ชม.` : h ? `อีก ${h} ชม. ${mm} น.` : `อีก ${mm} นาที`; }
function greet(now) { const h = now.getHours(); return h < 5 ? "ราตรีสวัสดิ์" : h < 12 ? "อรุณสวัสดิ์" : h < 17 ? "สวัสดีตอนบ่าย" : h < 20 ? "สวัสดีตอนเย็น" : "สวัสดีตอนค่ำ"; }
function nextShift(d, now) { const list = allMyShifts(d); return { cur: list.find(x => x.st <= now && x.en > now), nxt: list.find(x => x.st > now) }; }
function nextNote(d, now, days = 7) {
  for (let i = 0; i < days; i++) { const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), t = noteOn(d, dt); if (t) return { dt, t, i }; }
  return null;
}
function nextOff(d, now) {
  for (let i = 0; i < 45; i++) { const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), s = shiftsOn(d, dt); if (s && !s.length) return dt; }
  return null;
}
function clip(s, n) { s = String(s).replace(/\s+/g, " "); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function shiftIcons(c, I, s, cx, cy, size) {          // วาดไอคอน 1-2 อันตรงกลาง
  if (s.length <= 1) { img(c, I, s.length ? SH_ICON[s[0]] : "off", cx - size / 2, cy - size / 2, size); return; }
  const z = size * 0.78, gap = -z * 0.12, tw = z * 2 + gap;
  s.slice(0, 2).forEach((x, j) => img(c, I, SH_ICON[x], cx - tw / 2 + j * (z + gap), cy - z / 2, z));
}
function nextCapsule(c, I, T, d, now, x, y, w, h, compact) {
  const { cur, nxt } = nextShift(d, now), it = cur || nxt;
  rr(c, x, y, w, h, h * 0.38, CA(T.card, T.dark ? 0.14 : 0.82));
  if (!it) { tx(c, "ยังไม่มีเวร", x + 8, y + h / 2 - 8, w - 16, 16, F("Bold", 11.5), CA(T.title), "center"); return; }
  const is = h - 8; img(c, I, SH_ICON[it.c], x + 4, y + 4, is);
  const tx0 = x + 8 + is, tw = w - is - 14;
  if (compact) { const ms = (cur ? it.en : it.st) - now, hh = Math.floor(ms / 36e5), dd2 = Math.floor(hh / 24);
    tx(c, dd2 >= 2 ? `อีก ${dd2} วัน` : hh >= 1 ? `อีก ${hh} ชม.` : `อีก ${Math.max(1, Math.round(ms / 6e4))} นาที`, tx0, y + h / 2 - 8, tw, 16, F("Bold", 11), CA(T.title)); return; }
  const dd = dayDiffW(now, it.st);
  tx(c, cur ? `ตอนนี้ เวร${SH_LABEL[it.c]}` : `${dayLabel(dd, it.st)} เวร${SH_LABEL[it.c]}`, tx0, y + 3, tw, 16, F("Bold", 11.5), CA(T.title));
  tx(c, cur ? `เลิก ${SH_END[it.c]} · ${untilText(it.en - now)}` : `${hhmm(it.st)} · ${untilText(it.st - now)}`, tx0, y + h / 2 + 1, tw, 14, F("Medium", 9.5), CA(T.sub));
}

// ----- ใหญ่ -----
function drawLarge(d, now, I, T, sz) {
  const c = newCtx(sz); drawBg(c, sz, T);
  const W = sz.width, H = sz.height, P = 12;
  const curK = key(now.getFullYear(), now.getMonth()), ks = Object.keys(d.months).sort();
  const k = d.months[curK] ? curK : (ks.find(x => x > curK) || ks[ks.length - 1]);
  if (!k) { tx(c, "ยังไม่มีข้อมูลเวร", P, H / 2 - 24, W - 2 * P, 22, F("Bold", 17), CA(T.title), "center"); tx(c, "แตะเพื่อเปิดแอปแล้วอัปรูปตาราง", P, H / 2 + 2, W - 2 * P, 18, F("Medium", 12), CA(T.sub), "center"); return c.getImage(); }
  const [y, mm] = k.split("-").map(Number), m = mm - 1, me = d.months[k].people[d.me] || {};
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), rows = Math.ceil((first + days) / 7);
  const isThis = now.getFullYear() === y && now.getMonth() === m;
  // หัว
  tx(c, `${MONTHS[m]} ${y + 543}`, P, P - 2, W * 0.55, 22, F("Bold", 17), CA(T.title));
  tx(c, `${greet(now)} ${shortName(d)}`, P, P + 20, W * 0.5, 15, F("Medium", 10.5), CA(T.sub));
  const capW = Math.min(158, W * 0.47); nextCapsule(c, I, T, d, now, W - P - capW, P - 2, capW, 36);
  // ชื่อวัน
  const top = P + 40, gap = 4, cw = (W - 2 * P - 6 * gap) / 7;
  DOW.forEach((n, i) => tx(c, n, P + i * (cw + gap), top, cw, 12, F("Bold", 9.5), CA(i === 0 || i === 6 ? T.accent : T.sub, 0.85), "center"));
  // ส่วนล่าง
  const note = nextNote(d, now), footH = 24, gTop = top + 15, gH = H - gTop - P - footH - 6;
  const ch = (gH - (rows - 1) * gap) / rows;
  for (let day = 1; day <= days; day++) {
    const i = first + day - 1, x = P + (i % 7) * (cw + gap), yy = gTop + Math.floor(i / 7) * (ch + gap);
    const s = sortS(me[day]), dt = new Date(y, m, day), past = dt < new Date(now.getFullYear(), now.getMonth(), now.getDate()), today = isThis && day === now.getDate();
    rr(c, x, yy, cw, ch, 9, s.length ? CA(T.shift[s[0]][0], T.dark ? 0.9 : 1) : CA(T.card, T.offA));
    const isz = Math.min(cw * 0.56, ch * 0.56, 26);
    shiftIcons(c, I, s, x + cw / 2, yy + ch * 0.6, s.length ? isz : isz * 0.72);
    tx(c, day, x + 4, yy + 1, cw - 6, 12, F(today ? "Bold" : "SemiBold", 9.5), CA(today ? T.accent : T.text, 0.85));
    if (noteOn(d, dt)) img(c, I, "note", x + cw - 13, yy + 2, 11);
    if (past && !today) rr(c, x, yy, cw, ch, 9, CA(T.past, T.pastA));
    if (today) rrStroke(c, x + 1, yy + 1, cw - 2, ch - 2, 8, CA(T.accent), 2);
  }
  // แถบล่าง: โน้ต หรือ สรุปเวร
  const fy = H - P - footH;
  rr(c, P, fy, W - 2 * P, footH, 11, CA(T.card, T.dark ? 0.12 : 0.8));
  if (note) {
    img(c, I, "note", P + 4, fy + 3, 18);
    const when = note.i === 0 ? "วันนี้" : note.i === 1 ? "พรุ่งนี้" : `${note.dt.getDate()} ${TH_MON[note.dt.getMonth()]}`;
    tx(c, `${when} · ${clip(note.t, 34)}`, P + 26, fy + 4, W - 2 * P - 32, 16, F("SemiBold", 11), CA(T.title));
  } else {
    const cnt = { "ช": 0, "บ": 0, "ด": 0 }; let done = 0, total = 0;
    for (let day = 1; day <= days; day++) for (const x of sortS(me[day])) { cnt[x]++; total++; if (new Date(y, m, day, SH[x].s + 8) <= now) done++; }
    let xx = P + 6;
    for (const x of ["ช", "บ", "ด"]) { img(c, I, SH_ICON[x], xx, fy + 4, 16); tx(c, cnt[x], xx + 18, fy + 5, 22, 14, F("Bold", 11), CA(T.shift[x][1] && !T.dark ? T.shift[x][1] : T.title)); xx += 44; }
    const bx = xx + 2, bw = W - P - 8 - bx - 70; rr(c, bx, fy + 9, bw, 6, 3, CA(T.accent, 0.18)); if (total) rr(c, bx, fy + 9, Math.max(6, bw * done / total), 6, 3, CA(T.accent));
    tx(c, `ผ่านไป ${done}/${total}`, W - P - 74, fy + 5, 68, 14, F("Bold", 10), CA(T.sub), "right");
  }
  return c.getImage();
}

// ----- กลาง -----
function drawMedium(d, now, I, T, sz) {
  const c = newCtx(sz); drawBg(c, sz, T);
  const W = sz.width, H = sz.height, P = 11;
  const off = nextOff(d, now);
  tx(c, "7 วันข้างหน้า", P, P - 3, W * 0.5, 19, F("Bold", 14.5), CA(T.title));
  tx(c, off ? `วันหยุดถัดไป · ${dayLabel(dayDiffW(now, off), off)}` : "ยังไม่มีวันหยุดในตาราง", P, P + 15, W * 0.6, 14, F("Medium", 10), CA(T.sub));
  nextCapsule(c, I, T, d, now, W - P - 92, P - 2, 92, 28, true);
  const top = P + 34, gap = 5, cw = (W - 2 * P - 6 * gap) / 7, chh = H - top - P;
  for (let i = 0; i < 7; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), s = shiftsOn(d, dt), x = P + i * (cw + gap), today = i === 0;
    rr(c, x, top, cw, chh, 12, today ? CA(T.dark ? mixHex(T.accent, T.g1, 0.6) : mixHex(T.accent, "#FFFFFF", 0.62)) : CA(T.card, T.cardA));
    if (today) rrStroke(c, x + 1, top + 1, cw - 2, chh - 2, 11, CA(T.accent), 2);
    const we = dt.getDay() === 0 || dt.getDay() === 6;
    tx(c, DOW[dt.getDay()], x, top + 5, cw, 12, F("Bold", 9.5), CA(we ? T.accent : T.sub), "center");
    tx(c, dt.getDate(), x, top + 16, cw, 20, F("Bold", 15), CA(T.title), "center");
    const isz = Math.min(cw * 0.6, 24);
    if (s === null) tx(c, "–", x, top + chh * 0.55, cw, 16, F("Bold", 12), CA(T.sub), "center");
    else shiftIcons(c, I, s, x + cw / 2, top + chh * 0.62, isz);
    if (s) tx(c, s.length ? s.map(z => SH_LABEL[z]).join("+") : "หยุด", x - 2, top + chh - 17, cw + 4, 13, F("Bold", s.length > 1 ? 8 : 9.5), CA(T.text), "center");
    if (noteOn(d, dt)) img(c, I, "note", x + cw - 13, top + 3, 11);
  }
  return c.getImage();
}

// ----- เล็ก -----
function drawSmall(d, now, I, T, sz) {
  const c = newCtx(sz); drawBg(c, sz, T);
  const W = sz.width, H = sz.height, P = 12;
  const { cur, nxt } = nextShift(d, now), it = cur || nxt;
  if (!it) { img(c, I, "off", W / 2 - 26, P + 10, 52); tx(c, "ยังไม่มีเวร", P, P + 68, W - 2 * P, 20, F("Bold", 15), CA(T.title), "center"); tx(c, "แตะเพื่ออัปรูปตาราง", P, P + 90, W - 2 * P, 16, F("Medium", 10.5), CA(T.sub), "center"); return c.getImage(); }
  const dd = dayDiffW(now, it.st);
  tx(c, cur ? "ตอนนี้กำลังอยู่เวร" : `เวรถัดไป · ${dayLabel(dd, it.st)}`, P, P - 2, W - 2 * P, 14, F("SemiBold", 10.5), CA(T.sub));
  const isz = Math.round(W * 0.31);
  img(c, I, SH_ICON[it.c], P - 2, P + 16, isz);
  tx(c, `เวร${SH_LABEL[it.c]}`, P + isz + 2, P + 18, W - isz - P - 6, 24, F("Bold", 18), CA(T.title));
  tx(c, `${hhmm(it.st)}–${SH_END[it.c]}`, P + isz + 2, P + 42, W - isz - P - 6, 16, F("Bold", 11.5), CA(T.text));
  const note = nextNote(d, now, 2), nh = note ? 20 : 0;
  const py = H - P - 22 - (note ? nh + 5 : 0), label = cur ? `เลิกเวร${untilText(it.en - now).replace("อีก", " อีก")}` : untilText(it.st - now);
  // แถบ 4 วันถัดไป เติมที่ว่างตรงกลาง
  const gy = P + 16 + isz, sh = 18, sy = gy + Math.max(0, (py - gy - sh) / 2), cw4 = (W - 2 * P) / 4;
  for (let i = 1; i <= 4; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), s = shiftsOn(d, dt), x = P + (i - 1) * cw4;
    rr(c, x + 1, sy, cw4 - 2, sh, 8, CA(T.card, T.dark ? 0.12 : 0.7));
    tx(c, dt.getDate(), x + 3, sy + 2, 15, 14, F("Bold", 9.5), CA(dt.getDay() % 6 === 0 ? T.accent : T.title), "center");
    if (s === null) tx(c, "–", x + 17, sy + 2, cw4 - 20, 14, F("Bold", 9.5), CA(T.sub), "center");
    else if (!s.length) img(c, I, "off", x + 19, sy + 2, 14);
    else if (s.length === 1) img(c, I, SH_ICON[s[0]], x + 18, sy + 2, 14); else s.slice(0, 2).forEach((z, j) => img(c, I, SH_ICON[z], x + 16 + j * 5, sy + 3, 12));
  }
  const pw = Math.min(W - 2 * P, label.length * 6.4 + 18);
  rr(c, P, py, pw, 22, 11, CA(T.accent)); tx(c, label, P, py + 3, pw, 16, F("Bold", 11.5), CA(T.onAccent), "center");
  if (note) { const ny = H - P - nh; rr(c, P, ny, W - 2 * P, nh, 9, CA(T.card, T.dark ? 0.12 : 0.8)); img(c, I, "note", P + 3, ny + 2, 16); tx(c, clip(note.t, 18), P + 22, ny + 3, W - 2 * P - 26, 14, F("SemiBold", 9.5), CA(T.title)); }
  return c.getImage();
}

async function drawnWidget(d, now, family) {
  const I = await loadIcons(), T = wTheme(d), sz = widgetSize(family);
  const w = new ListWidget(); w.setPadding(0, 0, 0, 0);
  w.backgroundImage = family === "small" ? drawSmall(d, now, I, T, sz) : family === "medium" ? drawMedium(d, now, I, T, sz) : drawLarge(d, now, I, T, sz);
  const next = new Date(now.getTime() + 15 * 6e4); w.refreshAfterDate = next;
  return w;
}
