// ===================================================================
//  เวรของฉัน — แอปตารางเวร + วิดเจ็ต สำหรับ Scriptable (iPhone)
//  เปิดในแอป   = หน้าแอปเต็ม (ปฏิทิน / สรุป / เพื่อน / ตั้งค่า)
//  วิดเจ็ต      = เล็ก · กลาง · ใหญ่ · หน้าจอล็อก (เลือกขนาดตอนเพิ่มวิดเจ็ต)
//  ช = เช้า 08-16 · บ = บ่าย 16-24 · ด = ดึก 00-08
// ===================================================================

// ค่าตั้งต้นมาจากตัวโหลด (ShiftApp บนมือถือ) — ไม่มี key อยู่ในไฟล์นี้
const CFG = (typeof CONFIG !== "undefined" && CONFIG) ? CONFIG : {};
const GEMINI_KEY = String(CFG.geminiKey || "");
const CLAUDE_KEY = String(CFG.claudeKey || "");

const APP_VERSION = "28 พ.ย. 69 · 41";
const GEMINI_OFF = true;   // ปิด Gemini ชั่วคราว (อ่านตารางพลาด) ใช้ Claude อย่างเดียว
const DEFAULT_NAME = String(CFG.name || "");
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"];
const CLAUDE_MODEL = "claude-opus-5-5";
const K_GEMINI = "shiftapp_gemini_key", K_CLAUDE = "shift_claude_api_key", K_NAME_OLD = "shift_my_name";
const CAL_NAME = "เวรของฉัน";

/*__PALETTES__*/

const SH = { "ด": { n: "เวรดึก", s: 0, sym: "moon.stars.fill" }, "ช": { n: "เวรเช้า", s: 8, sym: "sun.max.fill" }, "บ": { n: "เวรบ่าย", s: 16, sym: "sunset.fill" } };
const ORD = { "ด": 0, "ช": 1, "บ": 2 };
const MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const DOW = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const pad = n => String(n).padStart(2, "0");
const key = (y, m) => `${y}-${pad(m + 1)}`;
// เวรในช่องเรียงตามตาราง (บน → ล่าง) = ลำดับเวลา เช่น "บด" = บ่ายต่อดึก (ดึกเริ่ม 24:00), "ดบ" = ดึก 00:00 แล้วบ่าย
const sortS = s => [...new Set((s || "").split("").filter(c => ORD[c] != null))];
// เวลาเริ่มของแต่ละเวรในช่อง: เวรถัดไปต้องเริ่มหลังเวรก่อนหน้า (ดึกหลังบ่าย = 24:00 → เช้าวันถัดไป)
function shiftStarts(y, m, day, s) { return sortS(s).map((c, i) => ({ c, h: c === "ด" && i > 0 ? 24 : SH[c].s })).sort((a, b) => a.h - b.h).map(x => ({ c: x.c, st: new Date(y, m - 1, +day, x.h) })); }   // ดึกที่อยู่หลังเวรอื่น = 24:00 (ข้ามคืน), เช้า/บ่ายอยู่ในวันนั้นเสมอ
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// ---------------- เก็บข้อมูล ----------------
const fm = FileManager.local();
const FILE = fm.joinPath(fm.documentsDirectory(), "shiftapp-data.json");
const OLD_FILE = fm.joinPath(fm.documentsDirectory(), "shifts.json");

function loadData() {
  let d;
  if (fm.fileExists(FILE)) d = JSON.parse(fm.readString(FILE));
  else {
    const me = Keychain.contains(K_NAME_OLD) ? Keychain.get(K_NAME_OLD) : DEFAULT_NAME;
    d = { me, months: {}, settings: {} };
    if (fm.fileExists(OLD_FILE)) {               // ย้ายข้อมูลจากเวอร์ชันก่อน
      const old = JSON.parse(fm.readString(OLD_FILE));
      for (const [k, v] of Object.entries(old)) d.months[k] = { people: { [me]: v }, totals: {} };
    }
  }
  if (!d.me && DEFAULT_NAME) d.me = DEFAULT_NAME;
  d.notes = d.notes || {};
  d.settings = Object.assign({ notify: 60, calendar: true, ai: "gemini", theme: { style: "glass", palette: "sakura" } }, d.settings || {});
  return d;
}
function saveData(d) { fm.writeString(FILE, JSON.stringify(d)); backupData(d); }
// ---- สำรองข้อมูลไป iCloud Drive (โฟลเดอร์ Scriptable/shiftapp-backup) ไม่มี API key ในไฟล์ ----
function icloudFm() { try { const ic = FileManager.iCloud(); ic.documentsDirectory(); return ic; } catch (e) { return null; } }
function backupDir(ic) { const dir = ic.joinPath(ic.documentsDirectory(), "shiftapp-backup"); if (!ic.fileExists(dir)) ic.createDirectory(dir, true); return dir; }
function backupData(d) {
  const ic = icloudFm(); if (!ic) return;
  try {
    const dir = backupDir(ic), txt = JSON.stringify(Object.assign({}, d, { backupAt: new Date().toISOString() }));
    ic.writeString(ic.joinPath(dir, "latest.json"), txt);
    ic.writeString(ic.joinPath(dir, `backup-${new Date().toISOString().slice(0, 10)}.json`), txt);   // วันละไฟล์ เก็บ 14 วันล่าสุด
    const old = ic.listContents(dir).filter(f => /^backup-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of old.slice(0, Math.max(0, old.length - 14))) ic.remove(ic.joinPath(dir, f));
  } catch (e) { console.log("backup: " + e); }
}
async function readBackup() {
  const ic = icloudFm(); if (!ic) return null;
  try { const f = ic.joinPath(backupDir(ic), "latest.json"); if (!ic.fileExists(f)) return null;
    if (!ic.isFileDownloaded(f)) await ic.downloadFileFromiCloud(f);
    const d = JSON.parse(ic.readString(f)); return d && d.months ? d : null; } catch (e) { return null; }
}
// เปิดแอปครั้งแรกบนเครื่องใหม่/ลงใหม่ → กู้จาก iCloud อัตโนมัติ
async function restoreIfEmpty() {
  if (fm.fileExists(FILE)) return false;
  const b = await readBackup(); if (!b) return false;
  delete b.backupAt; fm.writeString(FILE, JSON.stringify(b)); return true;
}
function getKey(ai) {
  if (ai === "claude") return Keychain.contains(K_CLAUDE) ? Keychain.get(K_CLAUDE) : CLAUDE_KEY.trim();
  return Keychain.contains(K_GEMINI) ? Keychain.get(K_GEMINI) : GEMINI_KEY.trim();
}
function hasKey() { return { gemini: !!getKey("gemini"), claude: !!getKey("claude") }; }

function allMyShifts(d) {
  const list = [];
  for (const [k, md] of Object.entries(d.months)) {
    const [y, m] = k.split("-").map(Number), me = md.people[d.me] || {};
    for (const [day, s] of Object.entries(me)) for (const { c, st } of shiftStarts(y, m, day, s)) {
      list.push({ c, st, en: new Date(st.getTime() + 8 * 3600e3) });
    }
  }
  return list.sort((a, b) => a.st - b.st);
}
function shiftsOn(d, date) {
  const md = d.months[key(date.getFullYear(), date.getMonth())];
  return md && md.people[d.me] ? sortS(md.people[d.me][date.getDate()]) : (md ? [] : null);
}

// ---------------- ชื่อ ----------------
const norm = s => String(s).replace(/^(นางสาว|นาง|นาย|น\.ส\.)\s*/, "").replace(/\s+/g, "");
function findMe(people, me) {
  const n = norm(me), names = Object.keys(people);
  if (!n) return null;
  return names.find(x => norm(x) === n) || names.find(x => norm(x).includes(n) || n.includes(norm(x)))
      || names.find(x => norm(x).split("").filter((c, i) => c === n[i]).length >= n.length - 2 && Math.abs(norm(x).length - n.length) <= 2);
}

// ---------------- อ่านรูปด้วย AI ----------------
function shrink(img, maxSide) {
  const { width, height } = img.size;
  const sc = Math.min(1, maxSide / Math.max(width, height));
  if (sc === 1) return img;
  const ctx = new DrawContext();
  ctx.size = new Size(Math.round(width * sc), Math.round(height * sc));
  ctx.opaque = true; ctx.respectScreenScale = false;
  ctx.drawImageInRect(img, new Rect(0, 0, ctx.size.width, ctx.size.height));
  return ctx.getImage();
}
const PROMPT =
`รูปนี้คือตารางปฏิบัติงาน (ตารางเวร) พยาบาลรายเดือน ภาษาไทย
- หัวตารางมีชื่อเดือนและปี พ.ศ. คอลัมน์ตัวเลข 1-31 คือวันที่ของเดือนนั้น (บางวันมีวงกลมล้อมรอบ ไม่ต้องสนใจ)
- แต่ละคนมี 1 แถว แบ่งเป็นบรรทัดบนกับบรรทัดล่าง ในหนึ่งวันมีได้ 0-2 เวร ให้รวมทั้งบรรทัดบนและล่าง
- ช = เวรเช้า, บ = เวรบ่าย, ด = เวรดึก ส่วน x, ลา, กิจ, EN, D, E, ไม่ต, ไม่ ด, ไม่ ช, ไม่ บ, วันเกิด, ตัวเลข หรือช่องว่าง ไม่ใช่เวร
- คอลัมน์ทางขวาหลังคอลัมน์สรุป (เช่นสีเขียว 31,1,2,3) เป็นเวรล่วงหน้าของเดือนถัดไป ให้ข้าม
- ไล่ทีละคอลัมน์อย่างระวัง ให้วันที่ตรงกับคอลัมน์จริง
งาน: อ่านทุกคนในตาราง ตอบเป็น JSON อย่างเดียว รูปแบบ (shifts เป็นข้อความสั้น ใส่เฉพาะวันที่มีเวร):
{"year_be":2569,"month":12,"people":[{"name":"ชื่อ นามสกุลตามตาราง","shifts":"1=ชด 2=บ 6=ช","total":30}]}
ในวันที่มี 2 เวร ให้เรียงตามตาราง บรรทัดบนก่อนแล้วบรรทัดล่าง (เช่น บนเป็น บ ล่างเป็น ด ให้ตอบ บด)
total คือเลขในคอลัมน์ "ทำงานจริง" ของคนนั้น (ถ้าไม่มีใส่ null)`;

async function askGemini(b64, apiKey) {
  let last = "";
  for (const model of GEMINI_MODELS) {
    const req = new Request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    req.method = "POST"; req.timeoutInterval = 120;
    req.headers = { "x-goog-api-key": apiKey, "content-type": "application/json" };
    req.body = JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: "image/jpeg", data: b64 } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" }
    });
    const res = await req.loadJSON();
    if (res.error) {
      last = res.error.message || JSON.stringify(res.error);
      if (/api key|API_KEY|permission/i.test(last)) throw new Error("Gemini key ไม่ถูกต้อง: " + last);
      continue;                                   // รุ่นนี้ใช้ไม่ได้/เต็มโควตา ลองรุ่นถัดไป
    }
    const parts = (((res.candidates || [])[0] || {}).content || {}).parts || [];
    const text = parts.map(p => p.text || "").join("");
    if (text) return text;
    last = "Gemini ไม่ตอบกลับ";
  }
  throw new Error(last);
}
async function askClaude(b64, apiKey) { return claudeCall(CLAUDE_MODEL, b64, PROMPT, apiKey, 16000); }
async function claudeCall(model, b64, text, apiKey, maxTokens) { return claudeCallN(model, [b64], text, apiKey, maxTokens); }
async function claudeCallN(model, imgs, text, apiKey, maxTokens) {
  const req = new Request("https://api.anthropic.com/v1/messages");
  req.method = "POST"; req.timeoutInterval = 150;
  req.headers = { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  req.body = JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: [
    ...imgs.map(data => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })), { type: "text", text }] }] });
  const res = await req.loadJSON();
  if (res.error) throw new Error(res.error.message || JSON.stringify(res.error));
  const out = (res.content || []).map(c => c.text || "").join("");
  if (!out.trim() && res.stop_reason === "max_tokens") throw new Error("AI คิดนานจนคำตอบเต็ม");   // คิดหมดโควตา ไม่มีคำตอบ
  return out;
}
const jsonOf = t => JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
function parseRoster(text, me) {
  const j = jsonOf(text);
  const people = {}, totals = {};
  for (const p of j.people || []) {
    if (!p.name) continue;
    const v = {};
    const sh = typeof p.shifts === "string" ? Object.fromEntries([...p.shifts.matchAll(/(\d{1,2})\s*[=:]\s*([ชบด]+)/g)].map(x => [x[1], x[2]])) : (p.shifts || {});
    for (const [day, s] of Object.entries(sh)) { const c = sortS(String(s)).join(""); if (c && +day >= 1 && +day <= 31) v[+day] = c; }
    people[p.name.trim()] = v;
    if (p.total != null && !isNaN(+p.total)) totals[p.name.trim()] = +p.total;
  }
  const found = findMe(people, me);
  if (found && found !== me) { people[me] = people[found]; delete people[found]; if (found in totals) { totals[me] = totals[found]; delete totals[found]; } }
  const month = +j.month, year = +j.year_be > 2400 ? +j.year_be - 543 : +j.year_be;
  if (!(month >= 1 && month <= 12) || !year) throw new Error("อ่านเดือน/ปีจากหัวตารางไม่ได้");
  return { year, month, people, totals };
}

// ---- อ่านแบบแม่นยำ: หาแถว → ตัดเฉพาะหัวตาราง + แถวของเรา → อ่านทีละวัน → เทียบช่อง "ทำงานจริง" ----
const CLAUDE_STRONG = "claude-opus-5-5";
async function locateRow(b64, me, key) {
  const t = await claudeCall(CLAUDE_MODEL, b64,
`รูปนี้คือตารางเวรพยาบาลรายเดือน หาตำแหน่งแนวตั้งของ 2 อย่าง แล้วตอบเป็นสัดส่วน 0-1 ของความสูงรูป (0 = ขอบบน, 1 = ขอบล่าง)
1) แถวหัวตารางที่มีตัวเลขวันที่ 1-31
2) แถวของ "${me}" (คนละคนกับแถวอื่น ครอบทั้งบรรทัดบนและบรรทัดล่างของคนนี้)
ตอบ JSON อย่างเดียว: {"year_be":2569,"month":11,"header_top":0.03,"header_bottom":0.07,"row_top":0.55,"row_bottom":0.61,"name_in_table":"ชื่อที่เห็นในตาราง"}`, key, 6000);
  const j = jsonOf(t), ok = v => typeof v === "number" && v >= 0 && v <= 1;
  if (![j.header_top, j.header_bottom, j.row_top, j.row_bottom].every(ok) || j.row_bottom <= j.row_top || j.header_bottom <= j.header_top) throw new Error("หาแถวไม่เจอ");
  return j;
}
function cropBands(img, loc) {
  const W = img.size.width, H = img.size.height, pad = 0.006;
  const band = (a, b) => { const y0 = Math.max(0, Math.floor((a - pad) * H)), y1 = Math.min(H, Math.ceil((b + pad) * H)); return [y0, Math.max(y1, y0 + 4)]; };
  const rh = loc.row_bottom - loc.row_top;   // เผื่อแถวบน-ล่างอีกข้างละ 1.5 แถว กันหาตำแหน่งพลาด
  const parts = [band(loc.header_top, loc.header_bottom), band(Math.max(loc.header_bottom, loc.row_top - rh * 1.5), loc.row_bottom + rh * 1.5)];
  const sc = Math.min(3, 2400 / W);
  const one = ([y0, y1]) => { const c = new DrawContext(); c.respectScreenScale = false; c.opaque = true; c.size = new Size(Math.round(W * sc), Math.round((y1 - y0) * sc));
    c.drawImageInRect(img, new Rect(0, -y0 * sc, W * sc, H * sc)); return c.getImage(); };
  const a = one(parts[0]), b = one(parts[1]);
  const c = new DrawContext(); c.respectScreenScale = false; c.opaque = true;
  c.size = new Size(a.size.width, a.size.height + b.size.height + 6);
  c.setFillColor(Color.white()); c.fillRect(new Rect(0, 0, c.size.width, c.size.height));
  c.drawImageAtPoint(a, new Point(0, 0)); c.drawImageAtPoint(b, new Point(0, a.size.height + 6));
  return Data.fromJPEG(c.getImage()).toBase64String();
}
async function readMyRow(b64, me, key, hint) {
  const t = await claudeCall(CLAUDE_STRONG, b64,
`รูปนี้ตัดมาจากตารางเวรพยาบาล ส่วนบนคือหัวตาราง (ตัวเลขวันที่ 1-31 แต่ละช่องคือ 1 คอลัมน์) ส่วนล่างมีหลายแถว ให้อ่าน "เฉพาะแถวที่ชื่อ ${me}" (ดูชื่อที่คอลัมน์ซ้าย) ซึ่งมีบรรทัดบนกับบรรทัดล่าง
ช = เวรเช้า, บ = เวรบ่าย, ด = เวรดึก ส่วน x, ลา, กิจ, EN, D, E, ไม่ต, ไม่ ด, ไม่ ช, ไม่ บ, ตัวเลข หรือช่องว่าง ไม่ใช่เวร
ไล่ทีละคอลัมน์จากซ้ายไปขวา ให้ช่องในแถวตรงกับเลขวันที่ที่อยู่ "ตรงหัวคอลัมน์เดียวกัน" พอดี ระวังอย่าเลื่อนคอลัมน์
แล้วอ่านเลขในคอลัมน์ "ทำงานจริง" ของแถวนี้ด้วย
${hint ? "หมายเหตุ: " + hint + "\n" : ""}ตอบ JSON อย่างเดียว ใส่ครบทุกวันที่มีในหัวตาราง:
{"name_seen":"ชื่อในแถวที่อ่าน","days":{"1":{"top":"ด","bottom":"ช"},"2":{"top":"","bottom":"x"}},"total":28}
ถ้าไม่เห็นแถวของ ${me} ในรูปนี้ ให้ตอบ {"name_seen":"","days":{},"total":null}`, key, 8000);
  const j = jsonOf(t), days = {};
  for (const [d, v] of Object.entries(j.days || {})) { const s = sortS(String((v && v.top) || "") + String((v && v.bottom) || "")).join(""); if (s && +d >= 1 && +d <= 31) days[+d] = s; }
  const total = j.total != null && !isNaN(+j.total) ? +j.total : null;
  const seen = String(j.name_seen || ""), match = !!seen && !!findMe({ [seen]: 1 }, me);
  return { days, total, count: Object.values(days).join("").length, match, seen };
}
// ---- แบบแม่นที่สุด: แอปหาเส้นตารางเอง → ตัดช่องแต่ละวันขยายใหญ่พร้อมเลขวัน ----
async function readByTiles(b64, d, key, page) {
  const progress = s => page(`onProgress(${JSON.stringify(s)})`).catch(() => {});
  progress("กำลังหาแถวของคุณในตาราง…");
  const names = await page("makeNames()");
  const t = await claudeCallN(CLAUDE_MODEL, [b64, names],
`รูปที่ 1 คือตารางเวรพยาบาลทั้งตาราง รูปที่ 2 คือคอลัมน์ชื่อของแต่ละแถว มีเลขกำกับสีชมพู (#1, #2, ...)
1) ชื่อ "${d.me}" อยู่แถวเลขอะไรในรูปที่ 2
2) จากหัวตารางในรูปที่ 1 เป็นเดือนอะไร ปี พ.ศ. อะไร
3) ในรูปที่ 1 แถวของคนนี้ ช่อง "ทำงานจริง" เขียนเลขอะไร
4) ในรูปที่ 1 แถวของคนนี้ ช่อง "วันทำงาน" เขียนเลขอะไร (เอาเลขตัวหลัก ไม่เอาเลขในวงเล็บ ถ้าไม่มีช่องนี้ใส่ null)
ตอบ JSON อย่างเดียว: {"label":11,"name_seen":"ชื่อที่เห็น","year_be":2569,"month":11,"total":28,"workdays":19}`, key, 6000);
  const j = jsonOf(t);
  if (!(+j.label >= 1) || !findMe({ [String(j.name_seen || "")]: 1 }, d.me)) throw new Error("หาแถวชื่อไม่เจอ");
  const year = +j.year_be > 2400 ? +j.year_be - 543 : +j.year_be, month = +j.month;
  if (!(month >= 1 && month <= 12) || !year) throw new Error("อ่านเดือนไม่ได้");
  const days = new Date(year, month, 0).getDate();
  const cols = +(await page("GRID.g && GRID.g.xs ? GRID.g.xs.length - 1 : 0"));
  if (cols && cols < days) throw new Error(`เห็นคอลัมน์วันที่แค่ ${cols} จาก ${days}`);   // ตัดช่องไม่ครบ → วันอาจเลื่อน ใช้วิธีสำรอง
  let tiles;
  try { tiles = JSON.parse(await page(`makeTiles2(${+j.label}, ${days})`)); } catch (e) { tiles = null; }
  if (!Array.isArray(tiles) || !tiles.length) tiles = [await page(`makeTiles(${+j.label}, ${days})`)];
  const total = j.total != null && !isNaN(+j.total) ? +j.total : null;
  const workdays = j.workdays != null && +j.workdays > 0 && +j.workdays <= 31 ? +j.workdays : null;
  const ask = async (hint, model) => {
    const t = await claudeCallN(model || CLAUDE_MODEL, tiles,
`${tiles.length > 1 ? `รูปที่ 1 คือวันที่ 1-16 รูปที่ 2 คือวันที่ 17-${days}` : `รูปนี้คือวันที่ 1-${days}`} เป็นช่องตารางเวรของคนคนเดียว แยกวันละ 1 ช่อง มีเลขวันที่สีชมพูอยู่เหนือแต่ละช่อง
แต่ละช่องมี 2 บรรทัด (บน กับ ล่าง) อ่านทีละบรรทัด
ช = เวรเช้า, บ = เวรบ่าย, ด = เวรดึก ส่วน x, v, ลา, กิจ, EN, D, E, ตัวเลข หรือช่องว่าง ไม่ใช่เวร (สีพื้นไม่มีความหมาย ดูแค่ตัวอักษร)
ระวัง ช กับ บ: ตัว ช สูงกว่าและแคบกว่า มีหางขาขวาชี้ขึ้นเหนือหัว และมีหยักเล็กๆ ที่หัวซ้าย ส่วน บ เตี้ยกว่า กว้างกว่า หัวกลมเรียบ ไม่มีหาง
ข้อความที่มีคำว่า "ไม่" นำหน้า เช่น "ไม่ ด" "ไม่ ช" แปลว่าขอไม่ขึ้นเวรนั้น ไม่ใช่เวร และคำว่า "วันเกิด" ก็ไม่ใช่เวร
ถ้าบรรทัดไหนมีตัว v ให้ใส่ v
${hint ? "หมายเหตุ: " + hint + "\n" : ""}ตอบบรรทัดเดียว ไม่ต้องอธิบาย ครบทุกวัน รูปแบบ วันที่=บน/ล่าง คั่นด้วยเว้นวรรค ใช้ - ถ้าบรรทัดนั้นไม่มีเวร เช่น
1=ด/ช 2=-/บ 3=-/- 4=-/v 5=ช/-`, key, 12000);
    const out = {}, seen = new Set(), vd = new Set();
    for (const x of t.matchAll(/(\d{1,2})\s*=\s*([ชบดvVxX\-]*)(?:\s*\/\s*([ชบดvVxX\-]*))?/g)) {
      const dd = +x[1], cells = (x[2] || "") + (x[3] || ""); seen.add(dd); if (dd < 1 || dd > days) continue;
      if (/v/i.test(cells)) vd.add(dd);
      const s = sortS(cells).filter((c, i, a) => a.indexOf(c) === i).join(""); if (s) out[dd] = s; }
    return { days: out, count: Object.values(out).join("").length, full: seen.has(days), v: vd.size };
  };
  const askFull = async (hint, model) => {     // คำตอบไม่ครบถึงวันสุดท้าย → ถามใหม่ 1 ครั้ง
    const r = await ask(hint, model); if (r.full) return r;
    const r2 = await ask((hint ? hint + " " : "") + `ต้องตอบให้ครบถึงวันที่ ${days}`, model); return r2.full || r2.count >= r.count ? r2 : r;
  };
  // อ่าน 2 รอบพร้อมกันแล้วเทียบ วันไหนไม่ตรงกันให้อ่านรอบ 3 แล้วใช้เสียงข้างมาก
  progress("กำลังอ่านเวรทีละวัน (2 รอบ)…");
  const [r1, r2] = await Promise.all([askFull(), askFull()]);
  const val = (r, dd) => r.days[dd] || "";
  let diff = []; for (let dd = 1; dd <= days; dd++) if (val(r1, dd) !== val(r2, dd)) diff.push(dd);
  const checks = { label: +j.label, cols, days, diff: diff.slice(), tie: false, majority: [], glyphChecked: 0, glyphChanged: [], name: String(j.name_seen || "") };
  const cnt = o => Object.values(o).join("").length;
  let final = Object.assign({}, r1.days), uncertain = [];
  const vdays = Math.max(r1.v || 0, r2.v || 0);     // ช่อง v นับรวมใน "ทำงานจริง" ด้วย
  if (diff.length || (total != null && r1.count + vdays !== total)) {
    progress("ตรวจซ้ำวันที่อ่านไม่ตรงกัน…"); checks.tie = true;
    const r3 = await askFull(diff.length ? `ตรวจวันที่ ${diff.join(", ")} อย่างละเอียดเป็นพิเศษ` : `ตารางบอกว่าทำงานจริง ${total} เวร ตรวจทีละช่องอีกครั้ง`, CLAUDE_STRONG);
    final = {};
    for (let dd = 1; dd <= days; dd++) {
      const v = [val(r1, dd), val(r2, dd), val(r3, dd)], pick = v.find(x => v.filter(y => y === x).length >= 2);
      if (pick === undefined) { uncertain.push(dd); if (v[2]) final[dd] = v[2]; } else if (pick) final[dd] = pick;
      if (pick !== undefined && v.some(x => x !== pick)) { uncertain.push(dd); checks.majority.push(dd); }
    }
  }
  // ตรวจซ้ำ ช/บ/ด: ตัดตัวอักษรแต่ละตัวมาเทียบกับตัวอย่างจากตารางเดียวกัน (ฟอนต์เดียวกัน)
  try {
    progress("เทียบตัว ช / บ / ด กับตัวอย่างในตาราง…");
    const ink = JSON.parse(await page(`halfInk(${+j.label}, ${days})`)), glyphs = [];
    for (let dd = 1; dd <= days; dd++){ const s = sortS(final[dd]), h = ink[dd] || {};
      if (s.length === 2) { glyphs.push({ d: dd, half: "top", c: s[0] }, { d: dd, half: "bot", c: s[1] }); }
      else if (s.length === 1) { if (h.bot && !h.top) glyphs.push({ d: dd, half: "bot", c: s[0] }); else if (h.top && !h.bot) glyphs.push({ d: dd, half: "top", c: s[0] }); else if (h.top && h.bot) glyphs.push({ d: dd, half: "top", c: "?" , pair: s[0] }, { d: dd, half: "bot", c: "?", pair: s[0] }); }
      else if (s.length === 0 && (h.top || h.bot)) for (const half of ["top", "bot"]) if (h[half]) glyphs.push({ d: dd, half, c: "" }); }
    const agree = g => val(r1, g.d) === val(r2, g.d) && !uncertain.includes(g.d), legend = {};
    for (const c of ["ช", "บ", "ด"]) legend[c] = glyphs.filter(g => g.c === c && agree(g)).slice(0, 6);
    const exm = new Set(Object.values(legend).flat()), items = glyphs.filter(g => !exm.has(g));
    if (items.length && legend["ช"].length && legend["บ"].length) {
      const [L, Q] = JSON.parse(await page(`glyphSheet(${+j.label}, ${JSON.stringify(items.map(g => ({ d: g.d, half: g.half })))}, ${JSON.stringify(Object.fromEntries(Object.entries(legend).map(([c, a]) => [c, a.map(g => ({ d: g.d, half: g.half }))])))})`));
      const t = await claudeCallN(CLAUDE_STRONG, [L, Q],
`รูปที่ 1 คือตัวอย่างตัวอักษรจากตารางเดียวกัน (ฟอนต์และขนาดเดียวกัน) แยกเป็นตัว ช, ตัว บ, ตัว ด
รูปที่ 2 คือตัวอักษรที่ต้องตรวจ มีเลขกำกับ #1, #2, ...
เทียบรูปร่างกับตัวอย่างทีละตัว (ไม่ต้องดูสีพื้น) แล้วบอกว่าแต่ละตัวคือ ช, บ, ด หรือ x (กากบาท/ว่าง/ข้อความอื่นที่ไม่ใช่เวร)
ระวัง ช กับ บ: ช สูงกว่าและแคบกว่า มีหางขาขวาชี้ขึ้น หัวซ้ายมีหยัก ส่วน บ เตี้ยกว่า กว้างกว่า หัวเรียบ ให้เทียบความสูง/ความกว้างกับตัวอย่างด้วย
ตอบบรรทัดเดียว ไม่ต้องอธิบาย เช่น #1=ช #2=บ #3=ด #4=x`, key, 10000);
      const ans = {};
      for (const x of t.matchAll(/#(\d+)\s*=\s*([ชบดxX])/g)) { const g = items[+x[1] - 1]; if (g) ans[g.d + g.half] = x[2].toLowerCase(); }
      const known = g => g.c === "ช" || g.c === "บ" || g.c === "ด"; checks.glyphChecked = items.length;
      // 1) ตัวที่อ่านไว้แล้ว แต่เทียบแล้วเป็นตัวอื่น (ช ↔ บ ↔ ด)
      for (const g of glyphs) { const a = ans[g.d + g.half]; if (!known(g) || !a || a === "x" || a === g.c) continue;
        const s = sortS(final[g.d]); const i = s.length === 2 ? (g.half === "top" ? 0 : 1) : 0; s[i] = a; final[g.d] = [...new Set(s)].join(""); uncertain.push(g.d); checks.glyphChanged.push(g.d); }
      // 2) ครึ่งที่มีตัวอักษรแต่ยังไม่ได้อ่าน (เช่น ช ล่างหายไป) → เติมตามลำดับบน/ล่าง
      for (let dd = 1; dd <= days; dd++) { const top = ans[dd + "top"], bot = ans[dd + "bot"], gs = glyphs.filter(g => g.d === dd && !known(g)); if (!gs.length) continue;
        const want = [top, bot].filter(a => a && a !== "x"), cur = sortS(final[dd]).join("");
        if (want.length && want.join("") !== cur && want.length >= cur.length) { final[dd] = [...new Set(want)].join(""); uncertain.push(dd); checks.glyphChanged.push(dd); } }
    }
  } catch (e) { console.log("glyph check: " + e); }
  const my = { days: final, count: cnt(final) };
  return { year, month, days: my.days, total, workdays, vdays, checks, count: my.count, uncertain: [...new Set(uncertain)].sort((a, b) => a - b) };
}

async function readRosterClaude(b64, d, key, grid, page) {
  if (grid && page) {
    const friends = askClaude(b64, key).then(t => parseRoster(t, d.me)).catch(e => ({ err: e }));   // เวรเพื่อน: อ่านเบื้องหลัง ไม่ต้องรอ
    const tiles = await readByTiles(b64, d, key, page).catch(e => ({ err: e }));
    if (!tiles.err) {
      const people = { [d.me]: tiles.days }, totals = tiles.total != null ? { [d.me]: tiles.total } : {};
      const work = tiles.workdays != null ? { [d.me]: tiles.workdays } : {}, vdays = tiles.vdays ? { [d.me]: tiles.vdays } : {};
      const old = d.months[`${tiles.year}-${pad(tiles.month)}`];
      if (old) for (const [n, v] of Object.entries(old.people || {})) if (n !== d.me) people[n] = v;   // เวรเพื่อนเดิม (ถ้ามี)
      return { year: tiles.year, month: tiles.month, people, totals, work, vdays, checks: tiles.checks, method: "tiles", uncertain: tiles.uncertain, friendsLater: friends };
    }
  }
  return readRosterCrop(b64, d, key);
}
async function readRosterCrop(b64, d, key) {
  const img = Image.fromData(Data.fromBase64String(b64));
  const [loc, all] = await Promise.all([
    locateRow(b64, d.me, key).catch(e => null),
    askClaude(b64, key).then(t => parseRoster(t, d.me)).catch(e => ({ err: e }))
  ]);
  if (!loc && all.err) throw all.err;
  let my = null;
  if (loc) {
    const crop = cropBands(img, loc);
    my = await readMyRow(crop, d.me, key);
    if (!my.match) my = await readMyRow(b64, d.me, key, "รูปนี้เป็นตารางเต็ม หาแถวชื่อนี้ให้เจอก่อน แล้วค่อยอ่าน");   // ตัดพลาด → อ่านจากรูปเต็ม
    if (!my.match) my = null;
    for (let i = 0; my && i < 2 && my.total != null && my.count !== my.total; i++)
      my = await readMyRow(crop, d.me, key, `ครั้งก่อนนับได้ ${my.count} เวร แต่ช่องทำงานจริงเขียนว่า ${my.total} แปลว่ามีบางวันอ่านผิด ตรวจใหม่ทีละคอลัมน์`);
  }
  const people = all.err ? {} : all.people, totals = all.err ? {} : all.totals;
  if (my) { people[d.me] = my.days; if (my.total != null) totals[d.me] = my.total; }
  const year = loc ? (+loc.year_be > 2400 ? +loc.year_be - 543 : +loc.year_be) : all.year;
  const month = loc ? +loc.month : all.month;
  if (!(month >= 1 && month <= 12) || !year) { if (all.err) throw new Error("อ่านเดือน/ปีจากหัวตารางไม่ได้"); return all; }
  return { year, month, people, totals, careful: !!my };
}
async function readRoster(b64, d, grid, page) {
  const ai = GEMINI_OFF ? "claude" : (d.settings.ai === "claude" ? "claude" : "gemini");
  const k = getKey(ai);
  if (!k) throw new Error(`ยังไม่ได้ใส่ ${ai === "claude" ? "Claude" : "Gemini"} key (ใส่ใน claudeKey ของตัวโหลด หรือในหน้าตั้งค่า)`);
  if (ai === "claude") return readRosterClaude(b64, d, k, grid, page);
  return parseRoster(await askGemini(b64, k), d.me);
}

// ---------------- ปฏิทิน iPhone + แจ้งเตือน ----------------
async function syncCalendar(d) {
  let cal = null;
  try { cal = await Calendar.forEventsByTitle(CAL_NAME); } catch (e) {}
  if (!d.settings.calendar && !cal) return;
  if (!cal) cal = await Calendar.createForEvents(CAL_NAME);
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setFullYear(end.getFullYear() + 2);
  for (const e of await CalendarEvent.between(start, end, [cal])) e.remove();
  if (!d.settings.calendar) return;
  for (const x of shiftBlocks(allMyShifts(d)).filter(x => x.st >= start)) {     // เวรต่อกัน (เช่น บ่าย → ดึก) เป็นนัดเดียว
    const e = new CalendarEvent();
    e.calendar = cal; e.title = x.cs.length > 1 ? "เวร" + x.cs.map(c => SH[c].n.replace("เวร", "")).join("→") : SH[x.c].n; e.startDate = x.st; e.endDate = x.en; e.notes = "จากแอปเวรของฉัน";
    e.save();
  }
}
function shiftBlocks(list) {
  const out = [];
  for (const x of list) { const b = out[out.length - 1]; if (b && x.st.getTime() === b.en.getTime()) { b.en = x.en; b.cs.push(x.c); } else out.push({ c: x.c, st: x.st, en: x.en, cs: [x.c] }); }
  return out;
}
async function syncNotifications(d) {
  const pend = await Notification.allPending();
  const ids = pend.filter(n => n.threadIdentifier === "shiftapp").map(n => n.identifier);
  if (ids.length) await Notification.removePending(ids);
  const before = +d.settings.notify, now = new Date(), all = shiftBlocks(allMyShifts(d));   // เวรต่อกันเตือนครั้งเดียวตอนเริ่ม
  if (d.settings.eve !== false) {              // เตือนเวรพรุ่งนี้ 20:00 (ล่วงหน้า 14 วัน)
    const byDay = {};
    for (const x of all) { const t = new Date(x.st); t.setHours(0, 0, 0, 0); (byDay[t.getTime()] = byDay[t.getTime()] || []).push(x); }
    for (const [t, xs] of Object.entries(byDay)) {
      const at = new Date(+t - 4 * 3600e3);     // 20:00 ของคืนก่อน
      if (at <= now || at.getTime() - now.getTime() > 14 * 864e5) continue;
      const n = new Notification();
      n.identifier = `shiftapp-eve-${t}`; n.threadIdentifier = "shiftapp";
      n.title = "พรุ่งนี้มีเวร"; n.body = xs.map(x => `${x.cs.length > 1 ? "เวร" + x.cs.map(c => SH[c].n.replace("เวร", "")).join("→") : SH[x.c].n} ${hhmm(x.st)}`).join(" + ");
      n.setTriggerDate(at); await n.schedule();
    }
  }
  {                                            // ใกล้สิ้นเดือน ยังไม่มีตารางเดือนหน้า → เตือนอัปโหลด (วันที่ 25 และวันสุดท้าย 10:00)
    const nx = new Date(now.getFullYear(), now.getMonth() + 1, 1), key = `${nx.getFullYear()}-${String(nx.getMonth() + 1).padStart(2, "0")}`;
    if (!(d.months || {})[key]) for (const day of [25, new Date(nx - 864e5).getDate()]) {
      const at = new Date(now.getFullYear(), now.getMonth(), day, 10, 0, 0);
      if (at <= now) continue;
      const n = new Notification();
      n.identifier = `shiftapp-upload-${key}-${day}`; n.threadIdentifier = "shiftapp";
      n.title = "ยังไม่มีตารางเวรเดือนหน้า"; n.body = `ได้ตารางเดือน${MONTHS[nx.getMonth()]}แล้ว ถ่ายรูปส่งเข้าแอปได้เลย`;
      n.setTriggerDate(at); await n.schedule();
    }
  }
  await scheduleCare(d, all, now);
  if (!before) return;
  const list = all.filter(x => x.st.getTime() - before * 6e4 > now.getTime()).slice(0, 40);
  for (const x of list) {
    const n = new Notification();
    n.identifier = `shiftapp-${x.st.getTime()}-${x.c}`;
    n.threadIdentifier = "shiftapp";
    n.title = `${x.cs.length > 1 ? "เวร" + x.cs.map(c => SH[c].n.replace("เวร", "")).join("→") : SH[x.c].n} เริ่ม ${hhmm(x.st)}`;
    n.body = before >= 60 ? `อีก ${before / 60} ชั่วโมงขึ้นเวรแล้วนะ` : `อีก ${before} นาทีขึ้นเวรแล้วนะ`;
    n.setTriggerDate(new Date(x.st.getTime() - before * 6e4));
    await n.schedule();
  }
}
// ---------------- ดูแลตัวเองช่วงเวร: ดื่มน้ำ / กินข้าว / เตรียมเวรดึก / ไปนอน ----------------
const CARE_DEF = { water: true, waterH: 2, meal: true, night: true, coffee: false, sleep: true };
const careOf = d => Object.assign({}, CARE_DEF, (d.settings || {}).care || {});
const MEAL_AT = { "ช": 4, "บ": 4, "ด": 3 };        // ชั่วโมงหลังเริ่มเวร: เช้า 12:00, บ่าย 20:00, ดึก 03:00
function careItems(d, all, now) {
  const c = careOf(d), out = [], horizon = now.getTime() + 4 * 864e5;
  const add = (at, id, title, body) => { if (at > now && at.getTime() < horizon) out.push({ at, id, title, body }); };
  for (const b of all) {
    if (b.st.getTime() > horizon) break;
    const S = b.st.getTime(), E = b.en.getTime(), tag = S;
    if (c.night && b.cs[0] === "ด") {
      add(new Date(S - 10 * 36e5), `nap-${tag}`, "😴 คืนนี้มีเวรดึก", "ทานข้าวแล้วงีบ 15:00–18:00 จะได้ไม่ง่วงตอนตี 3");
      add(new Date(S - 1.5 * 36e5), `pre-${tag}`, "🥪 อีก 1.5 ชม.เข้าเวรดึก", "กินมื้อเบาๆ ก่อนออกจากบ้านนะ");
    }
    if (c.coffee && b.cs[0] === "ด") add(new Date(S - 6 * 36e5), `cof-${tag}`, "☕ งดกาแฟหลังจากนี้นะ", "ถ้าจะงีบก่อนเข้าเวรดึก");
    const meals = c.meal ? b.cs.map((x, i) => S + i * 8 * 36e5 + MEAL_AT[x] * 36e5) : [];
    if (c.water) { const H = Math.max(1, +c.waterH || 2); for (let t = S + H * 36e5, k = H; t < E - 15 * 6e4; t += H * 36e5, k += H) if (!meals.some(m => Math.abs(m - t) < 30 * 6e4)) add(new Date(t), `w-${t}`, "💧 ดื่มน้ำหน่อยนะ", `อยู่เวรมา ${k} ชม.แล้ว ดื่มน้ำสักแก้ว`); }
    if (c.meal) b.cs.forEach((x, i) => { const t = S + i * 8 * 36e5 + MEAL_AT[x] * 36e5;
      add(new Date(t), `m-${t}`, x === "ด" ? "🍙 ได้เวลากินอะไรหน่อย" : "🍚 ได้เวลากินข้าวแล้ว", x === "ด" ? "ครึ่งเวรดึกแล้ว ทานของว่างหรือมื้อเล็กๆ นะ" : "อย่าลืมกินข้าว ดื่มน้ำด้วยนะ"); });
    if (c.sleep && b.cs[b.cs.length - 1] === "ด") add(new Date(E), `slp-${tag}`, "🛌 เลิกเวรแล้ว", "กลับไปนอนพักเลยนะ เก่งมากวันนี้");
  }
  return out.sort((a, b) => a.at - b.at);
}
async function scheduleCare(d, all, now) {
  for (const it of careItems(d, all, now)) {
    const n = new Notification();
    n.identifier = `shiftapp-care-${it.id}`; n.threadIdentifier = "shiftapp";
    n.title = it.title; n.body = it.body;
    n.setTriggerDate(it.at); await n.schedule();
  }
}
async function syncAll(d) {
  try { await syncCalendar(d); } catch (e) { console.log("calendar: " + e); }
  try { await syncNotifications(d); } catch (e) { console.log("notify: " + e); }
}

// ---------------- ฟอนต์/ไอคอนเก็บในเครื่อง (เปิดได้ตอนไม่มีเน็ต) ----------------
const FONT_Q = { "Mali": "Mali:wght@400;500;600;700", "Itim": "Itim", "Mitr": "Mitr:wght@400;500;600", "IBM Plex Sans Thai": "IBM+Plex+Sans+Thai:wght@400;500;600;700", "Noto Serif Thai": "Noto+Serif+Thai:wght@500;600;700" };
const ICON_CSS = { ph: "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/duotone/style.css", phb: "https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/bold/style.css", tb: "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css" };
const STYLE_ASSET = { glass: [["Mali"], "ph"], dark: [["Mali"], "ph"], minimal: [["IBM Plex Sans Thai"], "tb"], planner: [["Itim"], "ph"], clay: [["Mitr"], "phb"],
  nude: [["IBM Plex Sans Thai", "Noto Serif Thai"], "ph"], pearl: [["Mitr"], "ph"], satin: [["IBM Plex Sans Thai", "Noto Serif Thai"], "ph"], luxe: [["IBM Plex Sans Thai", "Noto Serif Thai"], "tb"] };
const ASSET_DIR = fm.joinPath(fm.documentsDirectory(), "shiftapp-assets");
const assetFile = key => fm.joinPath(ASSET_DIR, key.replace(/[^A-Za-z0-9]+/g, "_") + ".css");
function assetKeys(style) { const [fonts, icon] = STYLE_ASSET[style] || STYLE_ASSET.glass; return [...fonts.map(f => "font:" + f), "icon:" + icon]; }
function readAssets(style) {          // ถ้าเก็บไว้ครบ คืน CSS ทั้งหมด (ไม่ใช้เน็ต)
  const ks = assetKeys(style); if (!ks.every(k => fm.fileExists(assetFile(k)))) return null;
  return ks.map(k => fm.readString(assetFile(k))).join("\n");
}
async function dataUri(url) { const r = new Request(url); r.timeoutInterval = 20; const data = await r.load(); return "data:font/woff2;base64," + data.toBase64String(); }
async function buildAsset(key) {
  let css;
  if (key.startsWith("font:")) {
    const r = new Request(`https://fonts.googleapis.com/css2?family=${FONT_Q[key.slice(5)]}&display=swap`); r.timeoutInterval = 20;
    r.headers = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" };
    const txt = await r.loadString(), parts = [];
    for (const m of txt.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {   // เก็บเฉพาะชุดอักษรไทย + อังกฤษ
      if (m[1] !== "thai" && m[1] !== "latin") continue;
      const u = (m[2].match(/url\(([^)]+)\)/) || [])[1]; if (!u) continue;
      parts.push(m[2].replace(u, await dataUri(u.replace(/["']/g, ""))));
    }
    if (!parts.length) throw new Error("font css empty");
    css = parts.join("\n");
  } else {
    const base = ICON_CSS[key.slice(5)], r = new Request(base); r.timeoutInterval = 20; css = await r.loadString();
    const face = (css.match(/@font-face\s*\{[^}]*\}/) || [])[0]; if (!face) throw new Error("icon css");
    const rel = (face.match(/url\(["']?([^"')]+\.woff2[^"')]*)["']?\)/) || [])[1]; if (!rel) throw new Error("icon woff2");
    const abs = rel.startsWith("http") ? rel : base.replace(/[^/]*$/, "") + rel.replace(/^\.\//, "");
    const fam = (face.match(/font-family:\s*([^;]+);/) || [])[1];
    css = css.replace(face, `@font-face{font-family:${fam};src:url(${await dataUri(abs)}) format("woff2");font-weight:normal;font-style:normal;font-display:block}`);
  }
  if (!fm.fileExists(ASSET_DIR)) fm.createDirectory(ASSET_DIR, true);
  fm.writeString(assetFile(key), css);
}
async function cacheAssets(style) { for (const k of assetKeys(style)) if (!fm.fileExists(assetFile(k))) { try { await buildAsset(k); } catch (e) { console.log("asset " + k + ": " + e); } } }

// ---------------- หน้าแอป ----------------
const APP_HTML = /*__HTML__*/"";

async function runApp() {
  const fromBackup = await restoreIfEmpty();
  let d = loadData();
  const wv = new WebView();
  const payload = () => Object.assign({}, d, { hasKey: hasKey(), version: APP_VERSION, icloud: !!icloudFm(), restored: fromBackup });
  const js = v => JSON.stringify(v).replace(/</g, "\\u003c").split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
  let html = APP_HTML.replace("/*__DATA__*/null", js(payload()));
  const style0 = ((d.settings || {}).theme || {}).style || "glass", local = readAssets(style0);
  if (local) {   // ใช้ฟอนต์/ไอคอนในเครื่อง ไม่ต้องรอเน็ต; ลิงก์เดิมย้ายไปโหลดทีหลังแบบไม่บล็อก (เผื่อสลับธีม)
    const late = [];
    html = html.replace(/<link[^>]+(fonts\.googleapis|cdn\.jsdelivr)[^>]*>\s*/g, t => { if (/stylesheet/.test(t)) late.push(t.trim().replace(/\/?>$/, ` media="print" onload="this.media='all'">`)); return ""; })
      .replace("</head>", `<style>${local}</style></head>`).replace("</body>", late.join("") + "</body>");
  }
  const call = s => wv.evaluateJavaScript(s, false);
  let busy = false;
  const pendingFriends = {}, restored = {};

  async function handle(m) {
    if (m.type === "saveMonth") {
      d.months[m.payload.key] = m.payload.month; delete restored[m.payload.key];
      if (pendingFriends[m.payload.key]) { for (const [n, v] of Object.entries(pendingFriends[m.payload.key])) if (n !== d.me) d.months[m.payload.key].people[n] = v; delete pendingFriends[m.payload.key]; }
      saveData(d); await syncAll(d);
    } else if (m.type === "restoreMonth") {       // ย้อนกลับ: คืนเดือนเดิมก่อนบันทึกทับ
      const k = m.payload.key; restored[k] = true; delete pendingFriends[k];
      if (m.payload.month) d.months[k] = m.payload.month; else delete d.months[k];
      saveData(d); await syncAll(d);
    } else if (m.type === "saveNote") {
      d.notes = d.notes || {};
      if (m.payload.text) d.notes[m.payload.date] = m.payload.text; else delete d.notes[m.payload.date];
      saveData(d);
    } else if (m.type === "saveSettings") {
      d.settings = Object.assign(d.settings, m.payload); saveData(d); await syncAll(d);
      cacheAssets(((d.settings.theme || {}).style) || "glass");   // เปลี่ยนธีม → เก็บฟอนต์ธีมใหม่ไว้ด้วย
    } else if (m.type === "readPhoto") {
      let r;
      const p = typeof m.payload === "string" ? { b64: m.payload, grid: null } : m.payload;
      try { r = await readRoster(p.b64, d, p.grid, s => wv.evaluateJavaScript(s, false)); } catch (e) { r = { error: String(e.message || e) }; }
      const later = r.friendsLater; delete r.friendsLater;
      await call(`onParsed(${js(r)})`);
      if (later) later.then(async all => {          // เวรเพื่อนอ่านเสร็จทีหลัง → เติมลงเดือนนั้น
        if (!all || all.err || all.year !== r.year || all.month !== r.month) return;
        if (restored[`${r.year}-${pad(r.month)}`]) return;
        const k = `${r.year}-${pad(r.month)}`, mo = d.months[k] || (pendingFriends[k] = pendingFriends[k] || {});
        const target = d.months[k] ? d.months[k].people : mo;
        for (const [n, v] of Object.entries(all.people)) if (n !== d.me) target[n] = v;
        if (d.months[k]) { saveData(d); await call(`setData(${js(payload())})`); await call(`window.reapplyTrades && reapplyTrades(${js(k)})`); }
      });
    } else if (m.type === "backupNow") {
      backupData(d); const ok = !!icloudFm();
      await call(`toast(${js(ok ? "สำรองไป iCloud แล้ว" : "ใช้ iCloud ไม่ได้ (เปิด iCloud Drive ให้ Scriptable ก่อน)")})`); return;
    } else if (m.type === "restoreBackup") {
      const b = await readBackup();
      if (!b) { await call(`toastErr(${js("ไม่เจอไฟล์สำรองใน iCloud")})`); return; }
      const a = new Alert(); a.title = "กู้คืนข้อมูลจาก iCloud?";
      a.message = `ไฟล์สำรองเมื่อ ${b.backupAt ? new Date(b.backupAt).toLocaleString("th-TH") : "-"}\nข้อมูลในเครื่องตอนนี้จะถูกแทนที่`;
      a.addDestructiveAction("กู้คืน"); a.addCancelAction("ยกเลิก");
      if (await a.presentAlert() === -1) return;
      delete b.backupAt; d = b; fm.writeString(FILE, JSON.stringify(d)); await syncAll(d);
      await call(`setData(${js(payload())})`); await call(`toast(${js("กู้คืนแล้ว")})`); return;
    } else if (m.type === "saveTrades") {         // ซื้อ-ขายเวร
      d.trades = m.payload || []; saveData(d);
    } else if (m.type === "shareText") {
      await ShareSheet.present([String(m.payload)]);
    } else if (m.type === "share") {
      const img = Image.fromData(Data.fromBase64String(m.payload));
      await ShareSheet.present([img]);
    } else if (m.type === "saveProfile") {         // ชื่อ + key จากหน้าตั้งค่าในแอป
      const name = String(m.payload.name || "").trim(), c = String(m.payload.claudeKey || "").trim();
      if (name && name !== d.me) {
        for (const md of Object.values(d.months)) { const f = findMe(md.people, name); if (f && f !== name) { md.people[name] = md.people[f]; delete md.people[f]; } }
        d.me = name;
      }
      if (c) Keychain.set(K_CLAUDE, c);
      saveData(d); await syncAll(d);
    } else if (m.type === "testKey") {
      const key = String(m.payload.claudeKey || "").trim() || getKey("claude");
      let r;
      if (!key) r = { ok: false, error: "ยังไม่ได้ใส่ key" };
      else try { await claudeCallN(CLAUDE_MODEL, [], "ตอบคำว่า OK", key, 5); r = { ok: true }; } catch (e) { r = { ok: false, error: String(e.message || e).slice(0, 120) }; }
      await call(`onKeyTest(${js(r)})`); return;
    } else if (m.type === "editSettings") {
      const a = new Alert();
      a.title = "ชื่อ และ API key";
      a.message = "ชื่อให้ตรงกับในตารางเวร\nClaude key ขอได้ที่ console.anthropic.com";
      a.addTextField("ชื่อ นามสกุล", d.me);
      a.addSecureTextField("Gemini API key", Keychain.contains(K_GEMINI) ? Keychain.get(K_GEMINI) : "");
      a.addSecureTextField("Claude API key", Keychain.contains(K_CLAUDE) ? Keychain.get(K_CLAUDE) : "");
      a.addAction("บันทึก"); a.addCancelAction("ยกเลิก");
      if (await a.presentAlert() === -1) return;
      const name = a.textFieldValue(0).trim(), g = a.textFieldValue(1).trim(), c = a.textFieldValue(2).trim();
      if (name && name !== d.me) {                 // เปลี่ยนชื่อ: ย้ายเวรของชื่อเดิมไปชื่อใหม่ถ้าตรงกัน
        for (const md of Object.values(d.months)) {
          const f = findMe(md.people, name);
          if (f && f !== name) { md.people[name] = md.people[f]; delete md.people[f]; }
        }
        d.me = name;
      }
      if (g) Keychain.set(K_GEMINI, g); else if (Keychain.contains(K_GEMINI)) Keychain.remove(K_GEMINI);
      if (c) Keychain.set(K_CLAUDE, c); else if (Keychain.contains(K_CLAUDE)) Keychain.remove(K_CLAUDE);
      saveData(d); await syncAll(d);
    }
    await call(`setData(${js(payload())})`);
  }
  let lastMsg = Date.now();
  async function pump() {
    if (busy) return; busy = true;
    try {
      while (true) {
        const q = JSON.parse(await call("__drain()"));
        if (!q.length) break;
        lastMsg = Date.now();
        for (const m of q) { try { await handle(m); } catch (e) { console.log(e); try { await call(`toastErr(${js(String(e.message || e))})`); } catch (_) {} } }
      }
    } finally { busy = false; }
  }
  wv.shouldAllowRequest = req => {
    if (req.url.startsWith("shiftapp://")) { pump(); return false; }
    return true;
  };
  await wv.loadHTML(html, "https://localhost/");
  let open = true;
  const shown = wv.present(true).then(() => { open = false; });
  syncNotifications(d).catch(e => console.log("notify: " + e));   // เปิดแอปทุกครั้ง อัปเดตแจ้งเตือน (เช่น เตือนอัปโหลดเดือนหน้า)
  if (!local) cacheAssets(style0);     // ครั้งแรก: โหลดเก็บไว้เบื้องหลัง ครั้งหน้าเปิดได้แม้ไม่มีเน็ต
  const sleep = ms => new Promise(r => Timer.schedule(ms, false, r));
  while (open) {                                   // เช็กคำสั่งจากหน้าแอปทุก 0.4 วินาที (กันกรณีสัญญาณไม่ถึง)
    try { await pump(); } catch (e) { console.log(e); }
    await sleep(Date.now() - lastMsg < 5000 ? 400 : 1500);   // ว่างนานแล้ว เช็กห่างขึ้น (ลดกระตุกตอนเลื่อน) — กดปุ่มยังส่งทันทีผ่านสัญญาณ
  }
  await shown;
}

const C = h => new Color(h);
const F = (w, s) => new Font(`SukhumvitSet-${w}`, s);
function txt(stack, s, font, color, opts = {}) { const t = stack.addText(s); t.font = font; t.textColor = color; if (opts.lines) t.lineLimit = opts.lines; if (opts.min) t.minimumScaleFactor = opts.min; return t; }
function sym(stack, name, size, color) { const i = stack.addImage(SFSymbol.named(name).image); i.imageSize = new Size(size, size); i.tintColor = color; return i; }

/*__WIDGETS__*/

function widgetLock(d, now, family) {
  const w = new ListWidget();
  const { cur, nxt } = nextShift(d, now), x = cur || nxt;
  const dd = x ? Math.round((new Date(x.st.getFullYear(), x.st.getMonth(), x.st.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5) : 0;
  const nm = x ? (x.cs.length > 1 ? x.cs.map(c => SH_LABEL[c]).join("→") : SH[x.c].n) : "";   // เวรต่อกัน = ก้อนเดียว
  if (family === "accessoryInline") {
    txt(w, !x ? "ยังไม่มีเวร" : cur ? `อยู่${nm.startsWith("เวร") ? nm : "เวร" + nm} เลิก ${bEnd(x)}` : `${nm} ${dayLabel(dd, x.st)} ${hhmm(x.st)}`, Font.systemFont(12), Color.white());
  } else if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const s = w.addStack(); s.layoutVertically(); s.centerAlignContent();
    const a = s.addStack(); a.addSpacer(); txt(a, x ? x.cs.join("") : "-", F("Bold", x && x.cs.length > 1 ? 17 : 20), Color.white()); a.addSpacer();
    const b = s.addStack(); b.addSpacer(); txt(b, !x ? "" : cur ? `ถึง ${bEnd(x).slice(0, 2)}` : dd === 0 ? hhmm(x.st) : dd === 1 ? "พรุ่งนี้" : `${x.st.getDate()}`, F("Medium", 10), Color.white()); b.addSpacer();
  } else {
    const r = w.addStack(); r.centerAlignContent();
    if (x) sym(r, SH[x.c].sym, 14, Color.white());
    r.addSpacer(4); txt(r, !x ? "เวรถัดไป" : cur ? "ตอนนี้" : `เวรถัดไป · ${dayLabel(dd, x.st)}`, F("Medium", 12), Color.white(), { lines: 1 });
    txt(w, x ? (x.cs.length > 1 ? x.cs.map(c => SH_LABEL[c]).join(" → ") : SH[x.c].n) : "ยังไม่มีเวร", F("Bold", 16), Color.white(), { lines: 1, min: 0.7 });
    if (x) txt(w, cur ? `เลิก ${bEnd(x)} · ${untilText(x.en - now)}` : `${hhmm(x.st)}–${bEnd(x)} · ${untilText(x.st - now)}`, F("Medium", 13), Color.white(), { lines: 1, min: 0.7 });
  }
  w.refreshAfterDate = new Date(now.getTime() + 15 * 6e4);
  return w;
}

// ---------------- Siri / Shortcuts: "เวรถัดไป" ----------------
function sayTime(dt) {                       // 16:00 → "4 โมงเย็น", 00:00 → "เที่ยงคืน"
  const h = dt.getHours(), m = dt.getMinutes(), mm = m ? ` ${m} นาที` : "";
  if (h === 0) return "เที่ยงคืน" + mm; if (h < 6) return `ตี ${h}` + mm; if (h < 12) return `${h} โมงเช้า` + mm;
  if (h === 12) return "เที่ยง" + mm; if (h < 16) return `บ่าย ${h - 12} โมง` + mm; if (h < 18) return `${h - 12} โมงเย็น` + mm; return `${h - 18} ทุ่ม` + mm;
}
function siriAnswer(d, now) {
  const { cur, nxt } = nextShift(d, now);
  const nm = x => x.cs.map(c => SH_LABEL[c]).join("ต่อ");
  const dd = x => Math.round((new Date(x.st.getFullYear(), x.st.getMonth(), x.st.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
  const when = x => { const k = dd(x); return k === 0 ? "วันนี้" : k === 1 ? "พรุ่งนี้" : k === 2 ? "มะรืนนี้" : `วันที่ ${x.st.getDate()} ${MONTHS[x.st.getMonth()]}`; };
  const parts = [];
  if (cur) parts.push(`ตอนนี้อยู่เวร${nm(cur)} เลิก ${sayTime(cur.en)}`);
  if (nxt) parts.push(`เวรถัดไป ${when(nxt)} เวร${nm(nxt)} ${sayTime(nxt.st)} ถึง ${sayTime(nxt.en)}`);
  return parts.length ? parts.join(" ") : "ยังไม่มีเวรในตาราง";
}

async function buildWidget(d, now, family) {
  if (String(family).startsWith("accessory")) return widgetLock(d, now, family);
  return await drawnWidget(d, now, family === "small" || family === "medium" ? family : "large");
}

// ---------------- เริ่มทำงาน ----------------
if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(await buildWidget(loadData(), new Date(), config.widgetFamily));
} else if (config.runsWithSiri || config.runsFromShortcut) {   // "หวัดดี Siri เวรถัดไป"
  const ans = siriAnswer(loadData(), new Date());
  if (config.runsWithSiri) Speech.speak(ans);
  Script.setShortcutOutput(ans);
} else {
  await runApp();
}
Script.complete();
