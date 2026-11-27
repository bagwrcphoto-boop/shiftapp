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
  const L = { "ช": ["#8FDDB0", "#1F5A3B"], "บ": ["#9EC3FF", "#24427E"], "ด": ["#C3A9FF", "#4A2F8C"] };
  if (t.style === "nude") return { dark: false, g1: "#FBF1EC", g2: "#F3DADB", b1: "#F2CCD1", b2: "#EED9C4", title: "#5A2E3E", sub: "#9A7680", text: "#5A3A44", accent: "#C98A94", onAccent: "#FFFFFF", card: "#FFFFFF", cardA: 0.7, offA: 0.88, pastA: 0.32, past: "#FFFFFF", shift: L };
  if (t.style === "pearl") return { dark: false, g1: "#FBEAF5", g2: "#E6E8FF", b1: "#FFD1EA", b2: "#D3D9FF", title: "#43345A", sub: "#8C79B8", text: "#43345A", accent: "#B07BE6", onAccent: "#FFFFFF", card: "#FFFFFF", cardA: 0.62, offA: 0.88, pastA: 0.32, past: "#FFFFFF", shift: L };
  if (t.style === "luxe") return { dark: false, g1: "#FFFFFF", g2: "#F8F4F2", b1: "#F6F0ED", b2: "#FFFFFF", title: "#2E2A2C", sub: "#A3989C", text: "#3A3436", accent: "#2E2A2C", onAccent: "#FFFFFF", card: "#F6F1EE", cardA: 0.9, offA: 0.95, pastA: 0.32, past: "#FFFFFF", shift: L };
  if (t.style === "satin") return { dark: true, g1: "#221B3C", g2: "#3A2148", b1: "#4A2F6E", b2: "#5A2C55", title: "#F7E3C0", sub: "#B7A3D2", text: "#EADFF2", accent: "#F3B6CF", onAccent: "#2A1E3E", card: "#FFFFFF", cardA: 0.1, offA: 0.1, pastA: 0.4, past: "#221B3C",
    shift: { "ช": ["#1E4A36", "#A6F2CC"], "บ": ["#22355E", "#C0D6FF"], "ด": ["#35285E", "#DED0FF"] } };
  if (t.style === "dark") {
    const q = p.dark;
    return { dark: true, g1: q.body, g2: q.card, b1: q.blobs[0], b2: q.blobs[1], title: q.title, sub: q.sub, text: q.title, accent: q.accent, onAccent: q.body,
      card: "#FFFFFF", cardA: 0.1, offA: 0.1, pastA: 0.4, past: q.body,
      shift: { "ช": ["#1E4A36", "#A6F2CC"], "บ": ["#22355E", "#C0D6FF"], "ด": ["#35285E", "#DED0FF"] } };
  }
  return { dark: false, g1: mixHex(p.body, "#FFD6E6", t.palette === "sakura" ? 0.35 : 0.1), g2: mixHex(p.blobs[1], "#FFFFFF", 0.72), b1: p.blobs[0], b2: p.blobs[1],
    title: p.title, sub: p.sub, text: p.text, accent: p.accent, onAccent: "#FFFFFF",
    card: "#FFFFFF", cardA: 0.62, offA: 0.88, pastA: 0.32, past: "#FFFFFF",
    shift: { "ช": ["#8FDDB0", "#1F5A3B"], "บ": ["#9EC3FF", "#24427E"], "ด": ["#C3A9FF", "#4A2F8C"] } };
}

// ----- เครื่องมือวาด -----
function newCtx(sz) { const c = new DrawContext(); c.size = sz; c.respectScreenScale = true; c.opaque = false; return c; }
function rr(c, x, y, w, h, r, color) { const p = new Path(); p.addRoundedRect(new Rect(x, y, w, h), r, r); c.addPath(p); c.setFillColor(color); c.fillPath(); }
function rrStroke(c, x, y, w, h, r, color, lw) { const p = new Path(); p.addRoundedRect(new Rect(x, y, w, h), r, r); c.addPath(p); c.setStrokeColor(color); c.setLineWidth(lw); c.strokePath(); }
function cell(c, T, x, y, w, h, r, color) {     // ช่องการ์ด: เงานุ่ม + ขอบขาว ให้แยกจากพื้นหลังชัด
  rr(c, x, y + 1.5, w, h, r, T.dark ? CA("#000000", 0.28) : CA(T.accent, 0.16));
  rr(c, x, y, w, h, r, color);
  rrStroke(c, x + 0.5, y + 0.5, w - 1, h - 1, r, T.dark ? CA("#FFFFFF", 0.14) : CA("#FFFFFF", 0.95), 1.2);
}
const SH_EDGE = { "ช": "#4FBF82", "บ": "#5E95F2", "ด": "#9672F0" };   // ขอบเข้มตามเวร แยกช่องให้ชัด
const shiftEdge = (c, T, s, x, y, w, h, r) => { if (!T.dark && s && s.length) rrStroke(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r, CA(SH_EDGE[s[0]], 0.9), 1.5); };
const shiftBg = (T, s) => s && s.length ? CA(T.shift[s[0]][0], T.dark ? 0.9 : 1) : CA(T.card, T.offA);
function tx(c, s, x, y, w, h, font, color, align) {
  c.setFont(font); c.setTextColor(color);
  if (align === "center") c.setTextAlignedCenter(); else if (align === "right") c.setTextAlignedRight(); else c.setTextAlignedLeft();
  c.drawTextInRect(String(s), new Rect(x, y, w, h));
}
function img(c, I, name, x, y, s) { if (I[name]) c.drawImageInRect(I[name], new Rect(x, y, s, s)); }
function drawBg(c, sz, T) {
  const n = 48, soft = h => T.dark ? h : mixHex(h, "#FFFFFF", 0.45);    // ธีมสว่าง: พื้นนวลขึ้น ช่องสีเด่นขึ้น
  for (let i = 0; i < n; i++) { c.setFillColor(CA(mixHex(soft(T.g1), soft(T.g2), i / (n - 1)))); c.fillRect(new Rect(0, sz.height * i / n, sz.width, sz.height / n + 1)); }
  const blob = (cx, cy, r, hex, a) => { for (let k = 18; k >= 1; k--) { const q = r * k / 18; c.setFillColor(CA(hex, a / 18)); c.fillEllipse(new Rect(cx - q, cy - q, q * 2, q * 2)); } };
  blob(sz.width * 0.92, -sz.height * 0.08, sz.width * 0.5, T.b1, T.dark ? 0.5 : 0.38);
  blob(sz.width * 0.05, sz.height * 1.08, sz.width * 0.5, T.b2, T.dark ? 0.45 : 0.34);
  if (!T.dark) blob(sz.width * 0.55, sz.height * 0.5, sz.width * 0.38, "#FFE4D6", 0.18);   // ไล่สีพีชกลางๆ ให้ละมุน
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
const ROLE_L = { ic: "#2F7BE0", mb: "#E8742A", md: "#23A05A" }, ROLE_D = { ic: "#7DB2FF", mb: "#FFA463", md: "#67D995" };
let ROLE_C = ROLE_L;   // ธีมมืดใช้สีสว่างกว่า ให้อ่านชัดบนพื้นเข้ม   // ฟ้า In charge / ส้ม member / เขียว med
function txSlots(c, words, sep, sepCol, x, y, w, h, size) {   // คำหลายสี: แบ่งช่องเท่ากัน คำอยู่กลางช่อง ตัวคั่นอยู่รอยต่อ (DrawContext วัดความกว้างไม่ได้)
  const sw = w / words.length;
  words.forEach(([t, col], j) => { tx(c, t, x + j * sw, y, sw, h, F("Bold", size), col, "center"); if (j) tx(c, sep, x + j * sw - 6, y + size * 0.1, 12, h, F("Bold", size * 0.8), sepCol, "center"); });
}
const roleCol = (r, def) => ROLE_C[r] ? new Color(ROLE_C[r]) : def;
function roleOn(d, dt) { const md = d.months[key(dt.getFullYear(), dt.getMonth())]; return ((md && md.roles || {})[d.me] || {})[dt.getDate()] || []; }
const bLabel = it => it.cs.map(c => SH_LABEL[c]).join(" → ");              // เวรต่อกัน = ก้อนเดียว เช่น "บ่าย → ดึก"
function dayLabelS(dt, s) {                       // ป้ายของวัน: ต่อกัน "บ่าย→ดึก" / ไม่ต่อ "ดึก+บ่าย" (เรียงตามเวลา)
  const st = shiftStarts(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), s.join(""));
  const cont = st.every((x, i) => !i || x.st - st[i - 1].st === 8 * 36e5);
  return st.map(x => SH_LABEL[x.c]).join(cont ? "→" : "+");
}
const bEnd = it => SH_END[it.cs[it.cs.length - 1]];
function nextShift(d, now) { const list = shiftBlocks(allMyShifts(d)); return { cur: list.find(x => x.st <= now && x.en > now), nxt: list.find(x => x.st > now) }; }
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
  cell(c, T, x, y, w, h, h * 0.38, CA(T.card, T.dark ? 0.14 : 0.92));
  if (!it) { tx(c, "ยังไม่มีเวร", x + 8, y + h / 2 - 8, w - 16, 16, F("Bold", 11.5), CA(T.title), "center"); return; }
  const is = h - 8; if (it.cs.length > 1) shiftIcons(c, I, it.cs, x + 4 + is / 2, y + 4 + is / 2, is * 0.68); else img(c, I, SH_ICON[it.c], x + 4, y + 4, is);
  const tx0 = x + 8 + is, tw = w - is - 14;
  if (compact) { const ms = (cur ? it.en : it.st) - now, hh = Math.floor(ms / 36e5), dd2 = Math.floor(hh / 24);
    tx(c, dd2 >= 2 ? `อีก ${dd2} วัน` : hh >= 1 ? `อีก ${hh} ชม.` : `อีก ${Math.max(1, Math.round(ms / 6e4))} นาที`, tx0, y + h / 2 - 8, tw, 16, F("Bold", 11), CA(T.title)); return; }
  const dd = dayDiffW(now, it.st);
  tx(c, cur ? `ตอนนี้ เวร${bLabel(it)}` : `${dayLabel(dd, it.st)} เวร${bLabel(it)}`, tx0, y + 3, tw, 16, F("Bold", it.cs.length > 1 ? 10 : 11.5), CA(T.title));
  tx(c, cur ? `เลิก ${bEnd(it)} · ${untilText(it.en - now)}` : `${hhmm(it.st)}–${bEnd(it)} · ${untilText(it.st - now)}`, tx0, y + h / 2 + 1, tw, 14, F("Medium", 9.5), CA(T.sub));
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
  const hasR = Object.keys(((d.months[k].roles || {})[d.me]) || {}).length > 0, legH = hasR ? 13 : 0;   // มีสีหน้าที่ → เว้นบรรทัดคำอธิบายสี
  const note = nextNote(d, now), footH = 24, gTop = top + 15, gH = H - gTop - P - footH - 6 - legH;
  const ch = (gH - (rows - 1) * gap) / rows;
  for (let day = 1; day <= days; day++) {
    const i = first + day - 1, x = P + (i % 7) * (cw + gap), yy = gTop + Math.floor(i / 7) * (ch + gap);
    const s = sortS(me[day]), dt = new Date(y, m, day), past = dt < new Date(now.getFullYear(), now.getMonth(), now.getDate()), today = isThis && day === now.getDate();
    cell(c, T, x, yy, cw, ch, 9, shiftBg(T, s)); shiftEdge(c, T, s, x, yy, cw, ch, 9);
    const isz = Math.min(cw * 0.52, ch * 0.46, 24);
    shiftIcons(c, I, s, x + cw / 2, yy + ch * (s.length ? 0.5 : 0.58), s.length ? isz : isz * 0.72);
    if (s.length) { const rl = ((d.months[k].roles || {})[d.me] || {})[day] || [], lw = 6, x0 = x + (cw - s.length * lw) / 2;   // ตัวย่อ เช่น ชด บด สีตามหน้าที่ บนป้ายขาว (อ่านชัดทุกสีพื้น)
      rr(c, x0 - 4, yy + ch - 12, s.length * lw + 8, 11, 5.5, T.dark ? CA("#000000", 0.35) : CA("#FFFFFF", 0.92));
      s.forEach((z, j) => tx(c, z, x0 + j * lw - 2, yy + ch - 12.5, lw + 4, 12, F("Bold", 9), ROLE_C[rl[j]] ? new Color(ROLE_C[rl[j]]) : CA(T.title), "center")); }
    tx(c, day, x + 4, yy + 1, cw - 6, 12, F(today ? "Bold" : "SemiBold", 9.5), CA(today ? T.accent : T.text, 0.85));
    if (noteOn(d, dt)) img(c, I, "note", x + cw - 13, yy + 2, 11);
    if (past && !today) rr(c, x, yy, cw, ch, 9, CA(T.past, T.pastA));
    if (today) rrStroke(c, x + 1, yy + 1, cw - 2, ch - 2, 8, CA(T.accent), 2);
  }
  // แถบล่าง: โน้ต หรือ สรุปเวร
  const fy = H - P - footH;
  if (hasR) { const L = [["ic", "In charge"], ["mb", "member"], ["md", "med"]], lw = (W - 2 * P) / 3;
    L.forEach(([r, t], j) => { const lx = P + j * lw; c.setFillColor(new Color(ROLE_C[r])); c.fillEllipse(new Rect(lx + lw / 2 - 30, fy - legH, 7, 7)); tx(c, t, lx + lw / 2 - 20, fy - legH - 3, lw / 2 + 20, 12, F("Bold", 8.5), new Color(ROLE_C[r])); }); }
  cell(c, T, P, fy, W - 2 * P, footH, 11, CA(T.card, T.dark ? 0.12 : 0.92));
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
    cell(c, T, x, top, cw, chh, 12, shiftBg(T, s)); shiftEdge(c, T, s, x, top, cw, chh, 12);
    if (today) rrStroke(c, x + 1, top + 1, cw - 2, chh - 2, 11, CA(T.accent), 2);
    const we = dt.getDay() === 0 || dt.getDay() === 6;
    tx(c, DOW[dt.getDay()], x, top + 5, cw, 12, F("Bold", 9.5), CA(we ? T.accent : T.sub), "center");
    tx(c, dt.getDate(), x, top + 16, cw, 20, F("Bold", 15), CA(T.title), "center");
    const isz = Math.min(cw * 0.6, 24);
    if (s === null) tx(c, "–", x, top + chh * 0.55, cw, 16, F("Bold", 12), CA(T.sub), "center");
    else shiftIcons(c, I, s, x + cw / 2, top + chh * 0.62, isz);
    if (s && s.length && roleOn(d, dt).some(Boolean)) {      // มีสีหน้าที่ → ระบายสีทีละคำ
      const rl = roleOn(d, dt), st = shiftStarts(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), s.join("")), sep = dayLabelS(dt, s).includes("→") ? "→" : "+", sz = s.length > 1 ? 8 : 9.5;
      rr(c, x + 2, top + chh - 18, cw - 4, 15, 7, T.dark ? CA("#000000", 0.35) : CA("#FFFFFF", 0.92));
      txSlots(c, st.map(z => [SH_LABEL[z.c], roleCol(rl[s.indexOf(z.c)], CA(T.text))]), sep, CA(T.text), x - 2, top + chh - 17, cw + 4, 13, sz);
    } else if (s) tx(c, s.length ? dayLabelS(dt, s) : "หยุด", x - 2, top + chh - 17, cw + 4, 13, F("Bold", s.length > 1 ? 8 : 9.5), CA(T.text), "center");
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
  const multi = it.cs.length > 1;
  if (multi) shiftIcons(c, I, it.cs, P - 2 + isz / 2, P + 16 + isz / 2, isz * 0.68); else img(c, I, SH_ICON[it.c], P - 2, P + 16, isz);
  if ((it.rs || []).some(Boolean) && multi) txSlots(c, it.cs.map((z, j) => [SH_LABEL[z], roleCol(it.rs[j], CA(T.title))]), "→", CA(T.title), P + isz + 2, P + 18, W - isz - P - 6, 24, 14);
  else tx(c, multi ? bLabel(it) : `เวร${SH_LABEL[it.c]}`, P + isz + 2, P + 18, W - isz - P - 6, 24, F("Bold", multi ? 14 : 18), multi ? CA(T.title) : roleCol((it.rs || [])[0], CA(T.title)));
  tx(c, `${hhmm(it.st)}–${bEnd(it)}`, P + isz + 2, P + 42, W - isz - P - 6, 16, F("Bold", 11.5), CA(T.text));
  const note = nextNote(d, now, 2), nh = note ? 20 : 0;
  const py = H - P - 22 - (note ? nh + 5 : 0), label = cur ? `เลิกเวร${untilText(it.en - now).replace("อีก", " อีก")}` : untilText(it.st - now);
  // แถบ 4 วันถัดไป เติมที่ว่างตรงกลาง
  const gy = P + 16 + isz, sh = 18, sy = gy + Math.max(0, (py - gy - sh) / 2), cw4 = (W - 2 * P) / 4;
  for (let i = 1; i <= 4; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), s = shiftsOn(d, dt), x = P + (i - 1) * cw4;
    cell(c, T, x + 1, sy, cw4 - 2, sh, 8, shiftBg(T, s)); shiftEdge(c, T, s, x + 1, sy, cw4 - 2, sh, 8);
    tx(c, dt.getDate(), x + 3, sy + 2, 15, 14, F("Bold", 9.5), CA(dt.getDay() % 6 === 0 ? T.accent : T.title), "center");
    if (s === null) tx(c, "–", x + 17, sy + 2, cw4 - 20, 14, F("Bold", 9.5), CA(T.sub), "center");
    else if (!s.length) img(c, I, "off", x + 19, sy + 2, 14);
    else if (s.length === 1) img(c, I, SH_ICON[s[0]], x + 18, sy + 2, 14); else s.slice(0, 2).forEach((z, j) => img(c, I, SH_ICON[z], x + 16 + j * 5, sy + 3, 12));
  }
  const pw = Math.min(W - 2 * P, label.length * 6.4 + 18);
  rr(c, P, py, pw, 22, 11, CA(T.accent)); tx(c, label, P, py + 3, pw, 16, F("Bold", 11.5), CA(T.onAccent), "center");
  if (note) { const ny = H - P - nh; cell(c, T, P, ny, W - 2 * P, nh, 9, CA(T.card, T.dark ? 0.12 : 0.92)); img(c, I, "note", P + 3, ny + 2, 16); tx(c, clip(note.t, 18), P + 22, ny + 3, W - 2 * P - 26, 14, F("SemiBold", 9.5), CA(T.title)); }
  return c.getImage();
}

async function drawnWidget(d, now, family) {
  const I = await loadIcons(), T = wTheme(d), sz = widgetSize(family); ROLE_C = T.dark ? ROLE_D : ROLE_L;
  const w = new ListWidget(); w.setPadding(0, 0, 0, 0);
  w.backgroundImage = family === "small" ? drawSmall(d, now, I, T, sz) : family === "medium" ? drawMedium(d, now, I, T, sz) : drawLarge(d, now, I, T, sz);
  const next = new Date(now.getTime() + 15 * 6e4); w.refreshAfterDate = next;
  return w;
}
