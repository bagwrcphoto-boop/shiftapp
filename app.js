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

const APP_VERSION = "27 พ.ย. 69 · 24";
const GEMINI_OFF = true;   // ปิด Gemini ชั่วคราว (อ่านตารางพลาด) ใช้ Claude อย่างเดียว
const DEFAULT_NAME = String(CFG.name || "");
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"];
const CLAUDE_MODEL = "claude-opus-5-5";
const K_GEMINI = "shiftapp_gemini_key", K_CLAUDE = "shift_claude_api_key", K_NAME_OLD = "shift_my_name";
const CAL_NAME = "เวรของฉัน";

const PALETTES = {
 sakura:{name:"ชมพูซากุระ",accent:"#E0457F",title:"#6A1C44",sub:"#8A3D63",text:"#3E2230",body:"#FDE7F0",tint:"#FCE4EC",blobs:["#FF9EC4","#C9B6FF","#FFC8A8","#A8D8FF"],dark:{body:"#1B1029",card:"#2A1A3D",accent:"#FF79B5",title:"#FFF0F7",sub:"#F2C9DF",blobs:["#B0237A","#5A2DB8","#E0457E","#3A54C9"]}},
 sky:{name:"ฟ้าใส",accent:"#2F78D6",title:"#123563",sub:"#365B8C",text:"#1C2A3E",body:"#E6F0FD",tint:"#DDEBFC",blobs:["#9CC8FF","#B8E6FF","#C9C2FF","#A8F0E0"],dark:{body:"#0D1830",card:"#17264A",accent:"#6FB0FF",title:"#EEF5FF",sub:"#BCD4F2",blobs:["#1F4FA8","#3A2C9C","#1C7FA0","#2A3FB8"]}},
 mint:{name:"มิ้นต์",accent:"#14916B",title:"#0D4434",sub:"#2B6654",text:"#1A352C",body:"#E3F6EE",tint:"#D8F2E6",blobs:["#9EEBCB","#BDEBFF","#FFF0A8","#C8F0B0"],dark:{body:"#0C1F1A",card:"#14302A",accent:"#5FE0B0",title:"#EDFFF7",sub:"#B8E8D4",blobs:["#137A5C","#1E6A8C","#4A7A1E","#106E6E"]}},
 lavender:{name:"ลาเวนเดอร์",accent:"#7A4FE0",title:"#35206A",sub:"#56408E",text:"#2A2040",body:"#EFE9FF",tint:"#E8E0FF",blobs:["#C9B6FF","#FFB8E0","#B6D0FF","#E0C8FF"],dark:{body:"#17112B",card:"#251C42",accent:"#B497FF",title:"#F4EFFF",sub:"#D4C6F5",blobs:["#5A2DB8","#8E2A88","#3446B0","#6A3AC0"]}},
 peach:{name:"พีช",accent:"#E0612F",title:"#662812",sub:"#8C4A2B",text:"#3C281E",body:"#FFEFE4",tint:"#FFE6D6",blobs:["#FFC2A0","#FFD9A0","#FFB0C0","#FFE7B0"],dark:{body:"#24130C",card:"#3A2216",accent:"#FF9D70",title:"#FFF3EC",sub:"#F2CDB8",blobs:["#B04A1E","#A8306A","#B07A18","#8A3A2A"]}},
 mocha:{name:"ครีมมอคค่า",accent:"#9C6A45",title:"#47301F",sub:"#6E523E",text:"#352619",body:"#F5EDE4",tint:"#EFE3D6",blobs:["#E8D2BC","#F2DCC8","#DCC4B0","#EADBC8"],dark:{body:"#1C1511",card:"#2E241D",accent:"#D9A97F",title:"#FAF2EA",sub:"#DCC7B4",blobs:["#6E4A30","#5A3E2E","#7A5638","#4E3A2C"]}},
};


const SH = { "ด": { n: "เวรดึก", s: 0, sym: "moon.stars.fill" }, "ช": { n: "เวรเช้า", s: 8, sym: "sun.max.fill" }, "บ": { n: "เวรบ่าย", s: 16, sym: "sunset.fill" } };
const ORD = { "ด": 0, "ช": 1, "บ": 2 };
const MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const DOW = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const pad = n => String(n).padStart(2, "0");
const key = (y, m) => `${y}-${pad(m + 1)}`;
const sortS = s => (s || "").split("").filter(c => ORD[c] != null).sort((a, b) => ORD[a] - ORD[b]);
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
function saveData(d) { fm.writeString(FILE, JSON.stringify(d)); }
function getKey(ai) {
  if (ai === "claude") return Keychain.contains(K_CLAUDE) ? Keychain.get(K_CLAUDE) : CLAUDE_KEY.trim();
  return Keychain.contains(K_GEMINI) ? Keychain.get(K_GEMINI) : GEMINI_KEY.trim();
}
function hasKey() { return { gemini: !!getKey("gemini"), claude: !!getKey("claude") }; }

function allMyShifts(d) {
  const list = [];
  for (const [k, md] of Object.entries(d.months)) {
    const [y, m] = k.split("-").map(Number), me = md.people[d.me] || {};
    for (const [day, s] of Object.entries(me)) for (const c of sortS(s)) {
      const st = new Date(y, m - 1, +day, SH[c].s);
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
  return res.content.map(c => c.text || "").join("");
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
ตอบ JSON อย่างเดียว: {"year_be":2569,"month":11,"header_top":0.03,"header_bottom":0.07,"row_top":0.55,"row_bottom":0.61,"name_in_table":"ชื่อที่เห็นในตาราง"}`, key, 400);
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
ถ้าไม่เห็นแถวของ ${me} ในรูปนี้ ให้ตอบ {"name_seen":"","days":{},"total":null}`, key, 3000);
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
ตอบ JSON อย่างเดียว: {"label":11,"name_seen":"ชื่อที่เห็น","year_be":2569,"month":11,"total":28,"workdays":19}`, key, 1000);
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
ข้อความที่มีคำว่า "ไม่" นำหน้า เช่น "ไม่ ด" "ไม่ ช" แปลว่าขอไม่ขึ้นเวรนั้น ไม่ใช่เวร และคำว่า "วันเกิด" ก็ไม่ใช่เวร
ถ้าบรรทัดไหนมีตัว v ให้ใส่ v
${hint ? "หมายเหตุ: " + hint + "\n" : ""}ตอบบรรทัดเดียว ไม่ต้องอธิบาย ครบทุกวัน รูปแบบ วันที่=บน/ล่าง คั่นด้วยเว้นวรรค ใช้ - ถ้าบรรทัดนั้นไม่มีเวร เช่น
1=ด/ช 2=-/บ 3=-/- 4=-/v 5=ช/-`, key, 2000);
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
  const cnt = o => Object.values(o).join("").length;
  let final = Object.assign({}, r1.days), uncertain = [];
  const vdays = Math.max(r1.v || 0, r2.v || 0);     // ช่อง v นับรวมใน "ทำงานจริง" ด้วย
  if (diff.length || (total != null && r1.count + vdays !== total)) {
    progress("ตรวจซ้ำวันที่อ่านไม่ตรงกัน…");
    const r3 = await askFull(diff.length ? `ตรวจวันที่ ${diff.join(", ")} อย่างละเอียดเป็นพิเศษ` : `ตารางบอกว่าทำงานจริง ${total} เวร ตรวจทีละช่องอีกครั้ง`, CLAUDE_STRONG);
    final = {};
    for (let dd = 1; dd <= days; dd++) {
      const v = [val(r1, dd), val(r2, dd), val(r3, dd)], pick = v.find(x => v.filter(y => y === x).length >= 2);
      if (pick === undefined) { uncertain.push(dd); if (v[2]) final[dd] = v[2]; } else if (pick) final[dd] = pick;
      if (pick !== undefined && v.some(x => x !== pick)) uncertain.push(dd);
    }
  }
  const my = { days: final, count: cnt(final) };
  return { year, month, days: my.days, total, workdays, vdays, count: my.count, uncertain: [...new Set(uncertain)].sort((a, b) => a - b) };
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
      return { year: tiles.year, month: tiles.month, people, totals, work, vdays, method: "tiles", uncertain: tiles.uncertain, friendsLater: friends };
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
  for (const x of allMyShifts(d).filter(x => x.st >= start)) {
    const e = new CalendarEvent();
    e.calendar = cal; e.title = SH[x.c].n; e.startDate = x.st; e.endDate = x.en; e.notes = "จากแอปเวรของฉัน";
    e.save();
  }
}
async function syncNotifications(d) {
  const pend = await Notification.allPending();
  const ids = pend.filter(n => n.threadIdentifier === "shiftapp").map(n => n.identifier);
  if (ids.length) await Notification.removePending(ids);
  const before = +d.settings.notify, now = new Date(), all = allMyShifts(d);
  if (d.settings.eve !== false) {              // เตือนเวรพรุ่งนี้ 20:00 (ล่วงหน้า 14 วัน)
    const byDay = {};
    for (const x of all) { const t = new Date(x.st); t.setHours(0, 0, 0, 0); (byDay[t.getTime()] = byDay[t.getTime()] || []).push(x); }
    for (const [t, xs] of Object.entries(byDay)) {
      const at = new Date(+t - 4 * 3600e3);     // 20:00 ของคืนก่อน
      if (at <= now || at.getTime() - now.getTime() > 14 * 864e5) continue;
      const n = new Notification();
      n.identifier = `shiftapp-eve-${t}`; n.threadIdentifier = "shiftapp";
      n.title = "พรุ่งนี้มีเวร"; n.body = xs.map(x => `${SH[x.c].n} ${hhmm(x.st)}`).join(" + ");
      n.setTriggerDate(at); await n.schedule();
    }
  }
  if (!before) return;
  const list = all.filter(x => x.st.getTime() - before * 6e4 > now.getTime()).slice(0, 40);
  for (const x of list) {
    const n = new Notification();
    n.identifier = `shiftapp-${x.st.getTime()}-${x.c}`;
    n.threadIdentifier = "shiftapp";
    n.title = `${SH[x.c].n} เริ่ม ${hhmm(x.st)}`;
    n.body = before >= 60 ? `อีก ${before / 60} ชั่วโมงขึ้นเวรแล้วนะ` : `อีก ${before} นาทีขึ้นเวรแล้วนะ`;
    n.setTriggerDate(new Date(x.st.getTime() - before * 6e4));
    await n.schedule();
  }
}
async function syncAll(d) {
  try { await syncCalendar(d); } catch (e) { console.log("calendar: " + e); }
  try { await syncNotifications(d); } catch (e) { console.log("notify: " + e); }
}

// ---------------- หน้าแอป ----------------
const APP_HTML = [
"<!DOCTYPE html>",
"<html lang=\"th\">",
"<head>",
"<meta charset=\"utf-8\">",
"<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover\">",
"<link href=\"https://fonts.googleapis.com/css2?family=Mali:wght@400;500;600;700&family=Itim&family=Mitr:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@500;600;700&display=swap\" rel=\"stylesheet\">",
"<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/duotone/style.css\">",
"<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/bold/style.css\">",
"<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css\">",
"<style>",
"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}",
"html,body{margin:0;min-height:100%}",
"body{background:var(--body);color:var(--text);font-family:var(--font);padding:calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 100px);-webkit-font-smoothing:antialiased}",
"h1,h2,h3,p{margin:0}",
"button{font:inherit;cursor:pointer;color:inherit}",
"#decor{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}",
".blob{position:absolute;border-radius:50%;filter:blur(40px);opacity:.85}",
".page{display:none;animation:fade .25s ease}",
".page.on{display:block}",
"@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
".card{background:var(--card);border:var(--cardBorder);box-shadow:var(--cardShadow);border-radius:var(--r);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);padding:16px;margin-bottom:14px}",
".hello{font-size:16px;font-weight:500;color:var(--sub)}",
".big{font-size:26px;font-weight:700;color:var(--title)}",
".h3{font-size:17px;font-weight:700;color:var(--title)}",
".between{display:flex;align-items:center;justify-content:space-between}",
".row{display:flex;align-items:center;gap:8px}",
".grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
".btn{border:var(--nbBorder);border-radius:16px;padding:12px 14px;font-weight:600;font-size:15px;background:var(--nbBg);color:var(--title);display:inline-flex;align-items:center;justify-content:center;gap:6px}",
".btn.main{background:var(--accent);color:var(--onAccent);border:none;box-shadow:0 6px 16px var(--accentGlow)}",
".btn:active,.nb:active,.d:active{transform:scale(.97)}",
".btn i{font-size:19px}",
".nb{width:36px;height:36px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;background:var(--nbBg);border:var(--nbBorder);color:var(--title);font-size:18px}",
".p{display:inline-flex;align-items:center;justify-content:center;font-weight:700;border-radius:8px;font-size:12px;padding:0 5px;line-height:18px}",
".m{background:var(--mBg);color:var(--mFg)}.a{background:var(--aBg);color:var(--aFg)}.n{background:var(--nBg);color:var(--nFg)}.o{background:var(--oBg);color:var(--oFg)}",
"/* hero */",
".hero{display:flex;justify-content:space-between;align-items:center;background:var(--heroBg)}",
".hero .when{font-size:14px;font-weight:500;color:var(--heroSub)}",
".hero .what{font-size:28px;font-weight:700;color:var(--heroTitle);margin-top:2px}",
".hero .time{font-size:15px;color:var(--heroSub);margin-top:2px}",
".cd{display:inline-flex;gap:5px;align-items:center;margin-top:10px;background:var(--cdBg);border-radius:12px;padding:4px 10px;font-size:13px;font-weight:500;color:var(--heroTitle)}",
".orb{width:66px;height:66px;flex:0 0 66px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--orbBg);border:var(--orbBorder)}",
".orb i{font-size:38px;color:var(--accent)}",
"/* calendar */",
".cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}",
".cal-h .t{font-size:19px;font-weight:700;color:var(--title)}",
".dow,.days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}",
".dow div{font-size:13px;color:var(--sub);font-weight:600;padding-bottom:4px}",
".d{height:56px;border-radius:14px;display:flex;flex-direction:column;align-items:center;padding-top:4px;gap:3px;font-size:15px;font-weight:500;border:1px solid transparent}",
".d.h{background:var(--dayBg);border:var(--dayBorder);box-shadow:var(--dayShadow)}",
".d .nn{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center}",
".we{color:var(--we)}",
".d.t .nn{background:var(--accent);color:var(--onAccent);font-weight:700;box-shadow:var(--todayShadow)}",
".d.sel{outline:2px solid var(--accent);outline-offset:-1px}",
".d .ps{display:flex;gap:2px}",
".d .p{font-size:11px;padding:0 4px;line-height:16px;border-radius:7px}",
".dot{width:5px;height:5px;border-radius:50%;background:var(--dot);margin-top:6px}",
".cute{display:inline-flex;flex:0 0 auto}.cute svg{width:100%;height:100%;display:block}",
".d .ics{display:flex;margin-top:1px}.d .ics .cute+.cute{margin-left:-4px}",
".d{position:relative}.d .pin{position:absolute;top:2px;right:2px;width:13px;height:13px}",
".d.past{opacity:.55}",
".notebox{width:100%;min-height:84px;border:2px solid var(--line);border-radius:16px;padding:10px 12px;font:inherit;font-size:15px;background:var(--nbBg);color:var(--text);resize:vertical;outline:none}",
".notebox:focus{border-color:var(--accent)}",
".qchips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 4px}",
".qchip{border:0;border-radius:12px;padding:5px 11px;font-size:13px;font-weight:600;background:var(--tint);color:var(--title)}",
".notecard{display:flex;gap:10px;align-items:flex-start}",
".notecard .t{font-size:15px;white-space:pre-wrap;flex:1}",
".chips{display:flex;gap:4px;justify-content:space-between;margin-top:12px}",
".chip{display:inline-flex;align-items:center;gap:3px;border-radius:12px;padding:5px 7px;font-size:13px;font-weight:700;white-space:nowrap}",
"/* sheet */",
".mask{position:fixed;inset:0;background:rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:.2s;z-index:20}",
".mask.on{opacity:1;pointer-events:auto}",
".sheet{position:fixed;left:0;right:0;bottom:0;background:var(--sheet);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:28px 28px 0 0;padding:10px 18px calc(env(safe-area-inset-bottom) + 22px);transform:translateY(105%);transition:.3s cubic-bezier(.2,.9,.3,1.05);z-index:21;max-height:86vh;overflow:auto}",
".sheet.on{transform:none}",
".grab{width:42px;height:5px;border-radius:3px;background:var(--line);margin:0 auto 14px}",
".srow{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;margin-bottom:8px}",
".srow i{font-size:30px}",
".srow .nm{font-weight:700;font-size:16px}",
".srow .tm{font-size:14px}",
".mates{font-size:13px;margin-top:4px}",
".tog{display:flex;gap:8px;margin:10px 0 14px}",
".tog button{flex:1;border:2px solid var(--line);background:transparent;border-radius:16px;padding:10px 0;font-size:15px;font-weight:600;color:var(--sub);display:flex;align-items:center;justify-content:center;gap:5px}",
".tog button.on.cm{background:var(--mBg);border-color:var(--mFg);color:var(--mFg)}",
".tog button.on.ca{background:var(--aBg);border-color:var(--aFg);color:var(--aFg)}",
".tog button.on.cn{background:var(--nBg);border-color:var(--nFg);color:var(--nFg)}",
"/* stats */",
".stat{border-radius:20px;padding:14px}",
".stat .k{font-size:14px;font-weight:500;display:flex;align-items:center;gap:5px}",
".stat .v{font-size:30px;font-weight:700;line-height:1.25}",
".bar{height:14px;border-radius:7px;background:var(--line);overflow:hidden;display:flex}",
".li{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1.5px dashed var(--line);font-size:15px}",
".li:last-child{border:0}",
".li span{display:flex;align-items:center;gap:7px}",
".li i{font-size:19px;color:var(--accent)}",
".li b{color:var(--title)}",
"/* friends */",
".strip{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 12px;scrollbar-width:none}",
".strip::-webkit-scrollbar{display:none}",
".sd{flex:0 0 50px;height:64px;border-radius:16px;background:var(--card);border:var(--cardBorder);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:var(--sub)}",
".sd b{font-size:18px;color:var(--text)}",
".sd.on{background:var(--accent);color:var(--onAccent);border-color:var(--accent)}",
".sd.on b{color:var(--onAccent)}",
".who{border-radius:20px;padding:12px 14px;margin-bottom:10px}",
".who .h{font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}",
".who .h i{font-size:20px}",
".name{display:inline-block;background:var(--nameBg);border-radius:10px;padding:3px 9px;margin:0 4px 6px 0;font-size:14px;font-weight:500}",
".name.me{background:var(--accent);color:var(--onAccent)}",
".fchips{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}",
".fchip{flex:0 0 auto;border-radius:14px;border:2px solid var(--line);background:transparent;padding:6px 12px;font-size:14px;font-weight:500;color:var(--text)}",
".fchip.on{border-color:var(--accent);background:var(--tint);color:var(--title);font-weight:700}",
".together{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
".together span{border-radius:12px;padding:5px 10px;font-size:14px;font-weight:600}",
".note{font-size:13px;color:var(--sub);text-align:center;margin:6px 0 12px}",
"/* settings */",
".set{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1.5px dashed var(--line);gap:10px}",
".set:last-child{border:0}",
".set .l{font-size:15px;display:flex;align-items:center;gap:8px;font-weight:500}",
".set .l i{font-size:20px;color:var(--accent)}",
".set .r{font-size:14px;color:var(--sub);text-align:right}",
"select{font:inherit;font-size:14px;border:1.5px solid var(--line);border-radius:12px;padding:6px 10px;background:var(--nbBg);color:var(--text);-webkit-appearance:none;appearance:none}",
".sw{width:52px;height:32px;flex:0 0 52px;border-radius:16px;background:var(--line);position:relative;transition:.2s}",
".sw::after{content:'';position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 2px 4px rgba(0,0,0,.15)}",
".sw.on{background:var(--accent)}.sw.on::after{left:23px}",
".lbl{font-size:14px;font-weight:600;color:var(--title);margin:0 0 8px}",
".styles{display:flex;gap:6px;flex-wrap:wrap}",
".stb{font-size:14px;font-weight:600;padding:7px 12px;border-radius:14px;border:1.5px solid var(--line);background:var(--nbBg);color:var(--text)}",
".stb.on{background:var(--accent);color:var(--onAccent);border-color:var(--accent)}",
".swg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
".swb{font-size:13px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 0;border-radius:16px;border:2px solid transparent;background:var(--nbBg);color:var(--text)}",
".swb span{width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.7)}",
".swb.on{border-color:var(--accent)}",
"/* tabs */",
"body::before,body::after{content:'';position:fixed;left:0;right:0;z-index:9;pointer-events:none}body::before{top:0;height:calc(env(safe-area-inset-top) + 58px);background:linear-gradient(var(--body) 62%,transparent)}body::after{bottom:0;height:calc(env(safe-area-inset-bottom) + 96px);background:linear-gradient(transparent,var(--body) 42%)}",
".tabs{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 10px);display:flex;padding:7px;border-radius:30px;background:var(--tabBg);border:var(--cardBorder);box-shadow:var(--cardShadow);backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);z-index:10}",
".tab{flex:1;border:0;background:none;font-size:12px;font-weight:500;color:var(--tabFg);display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 0;border-radius:22px}",
".tab i{font-size:24px}",
".tab.on{background:var(--tabOnBg);color:var(--tabOnFg);font-weight:700;box-shadow:var(--tabOnShadow)}",
".toast{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 14px);transform:translate(-50%,-150px);opacity:0;visibility:hidden;pointer-events:none;background:var(--title);color:var(--body);border-radius:16px;padding:10px 16px;font-size:14px;font-weight:600;transition:transform .3s,opacity .3s,visibility 0s .3s;z-index:30;white-space:nowrap;display:flex;gap:6px;align-items:center}",
".toast.on{transform:translate(-50%,0);opacity:1;visibility:visible;transition:transform .3s,opacity .3s;pointer-events:auto}.restw{display:flex;gap:8px;align-items:flex-start;background:var(--oBg);color:var(--oFg);border-radius:16px;padding:10px 12px;margin-top:8px;font-size:13.5px;font-weight:600}.restw span{font-weight:500;opacity:.85}",
".trow{display:flex;gap:8px;align-items:center;border-radius:16px;padding:10px 12px;margin-bottom:8px;font-size:13.5px;background:var(--mBg);color:var(--mFg)}.trow.sell{background:var(--oBg);color:var(--oFg)}.trow>div{flex:1}.trow span{opacity:.85}",
".tpaid{border:0;border-radius:12px;padding:6px 10px;font:inherit;font-size:12.5px;font-weight:700;background:var(--oBg);color:var(--oFg)}.tpaid.on{background:var(--mBg);color:var(--mFg)}",
".tdel{border:0;background:transparent;color:inherit;font-size:18px;padding:4px}",
".tog2{display:flex;gap:6px}.tog2 button{flex:1;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:13.5px;font-weight:600;padding:8px 4px;border-radius:12px}.tog2 button.on{background:var(--accent);color:var(--onAccent);border-color:var(--accent)}",
".sact{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.sact button{border:0;border-radius:11px;padding:6px 10px;font:inherit;font-size:12.5px;font-weight:700;background:var(--nameBg);color:var(--text);display:inline-flex;gap:4px;align-items:center}",
".buyb{width:100%;margin-top:10px;border:1.5px dashed var(--line);background:transparent;color:var(--text);font:inherit;font-weight:700;font-size:14px;border-radius:16px;padding:11px;display:flex;gap:6px;justify-content:center;align-items:center}",
".backb{border:0;background:transparent;color:var(--sub);font:inherit;font-weight:700;font-size:14px;padding:4px 0;display:inline-flex;gap:4px;align-items:center}",
".lab{font-size:13px;font-weight:700;color:var(--sub);margin:14px 0 6px}",
".pchips{display:flex;flex-wrap:wrap;gap:6px;max-height:190px;overflow:auto}.pchip{border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:14px;font-weight:600;border-radius:12px;padding:7px 12px}.pchip.on{background:var(--accent);color:var(--onAccent);border-color:var(--accent)}",
".sheet input{width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:11px 12px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:var(--text);margin-top:8px}",
".editd{margin-top:14px;border:1.5px solid var(--line);border-radius:16px;padding:10px 12px}.editd summary{font-weight:700;font-size:14.5px;color:var(--title);display:flex;gap:6px;align-items:center;list-style:none;cursor:pointer}.editd summary::-webkit-details-marker{display:none}.editd summary span{font-weight:500;font-size:12px;color:var(--sub)}.editd[open] summary{margin-bottom:10px}",
".toast .undo{margin-left:8px;border:0;background:var(--accent);color:#fff;font:inherit;font-weight:700;border-radius:10px;padding:5px 10px}",
".loading{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 0;color:var(--sub)}",
".spin{font-size:44px;color:var(--accent);animation:sp 1.4s linear infinite}",
"@keyframes sp{to{transform:rotate(360deg)}}",
".msg{border-radius:14px;padding:10px 12px;font-size:14px;font-weight:500;margin:8px 0;display:flex;gap:6px;align-items:flex-start}",
".msg i{font-size:18px;margin-top:1px}",
"</style>",
"<style id=\"themeVars\"></style>",
"</head>",
"<body>",
"<div id=\"decor\"></div>",
"",
"<section class=\"page on\" id=\"p-cal\">",
"  <div style=\"margin-bottom:14px\"><p class=\"hello\" id=\"hello\"></p><h1 class=\"big\">\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e27\u0e23\u0e02\u0e2d\u0e07\u0e09\u0e31\u0e19</h1></div>",
"  <div class=\"card hero\" id=\"hero\"></div>",
"  <div class=\"card\" id=\"todayNote\" style=\"display:none\"></div>",
"  <div class=\"card\" id=\"calCard\">",
"    <div class=\"cal-h\"><button class=\"nb\" onclick=\"moveMonth(-1)\" aria-label=\"\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\"><i data-i=\"l\"></i></button><span class=\"t\" id=\"calTitle\"></span><button class=\"nb\" onclick=\"moveMonth(1)\" aria-label=\"\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b\"><i data-i=\"r\"></i></button></div>",
"    <div class=\"dow\"><div class=\"we\">\u0e2d\u0e32</div><div>\u0e08</div><div>\u0e2d</div><div>\u0e1e</div><div>\u0e1e\u0e24</div><div>\u0e28</div><div class=\"we\">\u0e2a</div></div>",
"    <div class=\"days\" id=\"days\"></div>",
"    <div class=\"chips\" id=\"chips\"></div>",
"  </div>",
"  <div class=\"grid2\">",
"    <button class=\"btn main\" onclick=\"pickPhoto()\"><i data-i=\"camera\"></i>\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e40\u0e27\u0e23</button>",
"    <button class=\"btn\" onclick=\"shareMonth()\"><i data-i=\"share\"></i>\u0e41\u0e0a\u0e23\u0e4c\u0e15\u0e32\u0e23\u0e32\u0e07</button>",
"  </div>",
"</section>",
"",
"<section class=\"page\" id=\"p-sum\">",
"  <div class=\"between\" style=\"margin-bottom:14px\">",
"    <div><p class=\"hello\" id=\"sumTitle\"></p><h1 class=\"big\">\u0e2a\u0e23\u0e38\u0e1b\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49</h1></div>",
"    <div class=\"row\"><button class=\"nb\" onclick=\"moveMonth(-1)\" aria-label=\"\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\"><i data-i=\"l\"></i></button><button class=\"nb\" onclick=\"moveMonth(1)\" aria-label=\"\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b\"><i data-i=\"r\"></i></button></div>",
"  </div>",
"  <div class=\"grid2\" id=\"sumStats\" style=\"margin-bottom:14px\"></div>",
"  <div class=\"card\"><p class=\"h3\" style=\"margin-bottom:10px\">\u0e2a\u0e31\u0e14\u0e2a\u0e48\u0e27\u0e19\u0e40\u0e27\u0e23</p><div class=\"bar\" id=\"sumBar\"></div><div class=\"chips\" id=\"sumLegend\"></div></div>",
"  <div class=\"card\" id=\"sumList\"></div>",
"</section>",
"",
"<section class=\"page\" id=\"p-fr\">",
"  <div style=\"margin-bottom:12px\"><p class=\"hello\" id=\"frTitle\"></p><h1 class=\"big\">\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e43\u0e19\u0e27\u0e2d\u0e23\u0e4c\u0e14</h1></div>",
"  <div id=\"frPreview\"></div>",
"  <div class=\"strip\" id=\"strip\"></div>",
"  <div id=\"whoList\"></div>",
"  <div class=\"card\" id=\"togetherCard\">",
"    <p class=\"h3\">\u0e2b\u0e22\u0e38\u0e14\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e43\u0e04\u0e23</p>",
"    <p class=\"hello\" style=\"font-size:14px;margin:2px 0 10px\">\u0e41\u0e15\u0e30\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e14\u0e39\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19</p>",
"    <div class=\"fchips\" id=\"fchips\"></div>",
"    <div class=\"together\" id=\"together\"></div>",
"  </div>",
"</section>",
"",
"<section class=\"page\" id=\"p-set\">",
"  <div style=\"margin-bottom:14px\"><p class=\"hello\">\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32</p><h1 class=\"big\">\u0e02\u0e2d\u0e07\u0e09\u0e31\u0e19</h1></div>",
"  <div class=\"card\">",
"    <p class=\"lbl\">\u0e2a\u0e44\u0e15\u0e25\u0e4c</p><div class=\"styles\" id=\"styles\"></div>",
"    <p class=\"lbl\" style=\"margin-top:14px\">\u0e42\u0e17\u0e19\u0e2a\u0e35</p><div class=\"swg\" id=\"swatches\"></div>",
"  </div>",
"  <div class=\"card\">",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"bell\"></i>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e02\u0e36\u0e49\u0e19\u0e40\u0e27\u0e23</span>",
"      <select id=\"setNotify\" onchange=\"saveSettings()\"><option value=\"0\">\u0e1b\u0e34\u0e14</option><option value=\"30\">30 \u0e19\u0e32\u0e17\u0e35</option><option value=\"60\">1 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option><option value=\"120\">2 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option><option value=\"720\">12 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option></select></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"bell\"></i>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e40\u0e27\u0e23\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49 (2 \u0e17\u0e38\u0e48\u0e21)</span><div class=\"sw\" id=\"setEve\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"calsync\"></i>\u0e43\u0e2a\u0e48\u0e40\u0e27\u0e23\u0e43\u0e19\u0e1b\u0e0f\u0e34\u0e17\u0e34\u0e19 iPhone</span><div class=\"sw\" id=\"setCal\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"ai\"></i>AI \u0e2d\u0e48\u0e32\u0e19\u0e23\u0e39\u0e1b</span>",
"      <select id=\"setAI\" onchange=\"saveSettings()\"><option value=\"claude\">Claude</option><option value=\"gemini\" disabled>Gemini (\u0e1b\u0e34\u0e14\u0e0a\u0e31\u0e48\u0e27\u0e04\u0e23\u0e32\u0e27)</option></select></div>",
"  </div>",
"  <div class=\"card\">",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"user\"></i>\u0e0a\u0e37\u0e48\u0e2d\u0e43\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07</span><span class=\"r\" id=\"setName\"></span></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"key\"></i>Claude key</span><span class=\"r\" id=\"setKeyC\"></span></div>",
"  </div>",
"  <button class=\"btn\" style=\"width:100%;margin-bottom:14px\" onclick=\"openProfile()\"><i data-i=\"edit\"></i>\u0e41\u0e01\u0e49\u0e0a\u0e37\u0e48\u0e2d / API key</button>",
"  <button class=\"btn\" style=\"width:100%;margin-bottom:14px\" onclick=\"openPaste()\"><i data-i=\"list\"></i>\u0e27\u0e32\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e40\u0e27\u0e23</button>",
"  <div class=\"card\">",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"sun\"></i>\u0e40\u0e27\u0e23\u0e40\u0e0a\u0e49\u0e32</span><span class=\"r\">08:00 \u2013 16:00</span></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"sunset\"></i>\u0e40\u0e27\u0e23\u0e1a\u0e48\u0e32\u0e22</span><span class=\"r\">16:00 \u2013 24:00</span></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"moon\"></i>\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01</span><span class=\"r\">00:00 \u2013 08:00</span></div>",
"  </div>",
"  <p class=\"note\" id=\"verNote\"></p>",
"</section>",
"",
"<nav class=\"tabs\">",
"  <button class=\"tab on\" data-p=\"p-cal\"><i data-i=\"cal\"></i>\u0e1b\u0e0f\u0e34\u0e17\u0e34\u0e19</button>",
"  <button class=\"tab\" data-p=\"p-sum\"><i data-i=\"sum\"></i>\u0e2a\u0e23\u0e38\u0e1b</button>",
"  <button class=\"tab\" data-p=\"p-fr\"><i data-i=\"fr\"></i>\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19</button>",
"  <button class=\"tab\" data-p=\"p-set\"><i data-i=\"set\"></i>\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32</button>",
"</nav>",
"<div class=\"mask\" id=\"mask\" onclick=\"closeSheet()\"></div>",
"<div class=\"sheet\" id=\"sheet\"></div>",
"<div class=\"toast\" id=\"toast\"></div>",
"<input type=\"file\" id=\"file\" accept=\"image/*\" style=\"position:absolute;left:-9999px;opacity:0\" onchange=\"gotPhoto(this)\">",
"",
"<script>",
"let DATA = /*__DATA__*/null;",
"const PALETTES = {",
" sakura:{name:\"\u0e0a\u0e21\u0e1e\u0e39\u0e0b\u0e32\u0e01\u0e38\u0e23\u0e30\",accent:\"#E0457F\",title:\"#6A1C44\",sub:\"#8A3D63\",text:\"#3E2230\",body:\"#FDE7F0\",tint:\"#FCE4EC\",blobs:[\"#FF9EC4\",\"#C9B6FF\",\"#FFC8A8\",\"#A8D8FF\"],dark:{body:\"#1B1029\",card:\"#2A1A3D\",accent:\"#FF79B5\",title:\"#FFF0F7\",sub:\"#F2C9DF\",blobs:[\"#B0237A\",\"#5A2DB8\",\"#E0457E\",\"#3A54C9\"]}},",
" sky:{name:\"\u0e1f\u0e49\u0e32\u0e43\u0e2a\",accent:\"#2F78D6\",title:\"#123563\",sub:\"#365B8C\",text:\"#1C2A3E\",body:\"#E6F0FD\",tint:\"#DDEBFC\",blobs:[\"#9CC8FF\",\"#B8E6FF\",\"#C9C2FF\",\"#A8F0E0\"],dark:{body:\"#0D1830\",card:\"#17264A\",accent:\"#6FB0FF\",title:\"#EEF5FF\",sub:\"#BCD4F2\",blobs:[\"#1F4FA8\",\"#3A2C9C\",\"#1C7FA0\",\"#2A3FB8\"]}},",
" mint:{name:\"\u0e21\u0e34\u0e49\u0e19\u0e15\u0e4c\",accent:\"#14916B\",title:\"#0D4434\",sub:\"#2B6654\",text:\"#1A352C\",body:\"#E3F6EE\",tint:\"#D8F2E6\",blobs:[\"#9EEBCB\",\"#BDEBFF\",\"#FFF0A8\",\"#C8F0B0\"],dark:{body:\"#0C1F1A\",card:\"#14302A\",accent:\"#5FE0B0\",title:\"#EDFFF7\",sub:\"#B8E8D4\",blobs:[\"#137A5C\",\"#1E6A8C\",\"#4A7A1E\",\"#106E6E\"]}},",
" lavender:{name:\"\u0e25\u0e32\u0e40\u0e27\u0e19\u0e40\u0e14\u0e2d\u0e23\u0e4c\",accent:\"#7A4FE0\",title:\"#35206A\",sub:\"#56408E\",text:\"#2A2040\",body:\"#EFE9FF\",tint:\"#E8E0FF\",blobs:[\"#C9B6FF\",\"#FFB8E0\",\"#B6D0FF\",\"#E0C8FF\"],dark:{body:\"#17112B\",card:\"#251C42\",accent:\"#B497FF\",title:\"#F4EFFF\",sub:\"#D4C6F5\",blobs:[\"#5A2DB8\",\"#8E2A88\",\"#3446B0\",\"#6A3AC0\"]}},",
" peach:{name:\"\u0e1e\u0e35\u0e0a\",accent:\"#E0612F\",title:\"#662812\",sub:\"#8C4A2B\",text:\"#3C281E\",body:\"#FFEFE4\",tint:\"#FFE6D6\",blobs:[\"#FFC2A0\",\"#FFD9A0\",\"#FFB0C0\",\"#FFE7B0\"],dark:{body:\"#24130C\",card:\"#3A2216\",accent:\"#FF9D70\",title:\"#FFF3EC\",sub:\"#F2CDB8\",blobs:[\"#B04A1E\",\"#A8306A\",\"#B07A18\",\"#8A3A2A\"]}},",
" mocha:{name:\"\u0e04\u0e23\u0e35\u0e21\u0e21\u0e2d\u0e04\u0e04\u0e48\u0e32\",accent:\"#9C6A45\",title:\"#47301F\",sub:\"#6E523E\",text:\"#352619\",body:\"#F5EDE4\",tint:\"#EFE3D6\",blobs:[\"#E8D2BC\",\"#F2DCC8\",\"#DCC4B0\",\"#EADBC8\"],dark:{body:\"#1C1511\",card:\"#2E241D\",accent:\"#D9A97F\",title:\"#FAF2EA\",sub:\"#DCC7B4\",blobs:[\"#6E4A30\",\"#5A3E2E\",\"#7A5638\",\"#4E3A2C\"]}},",
"};",
"const CUTE = {\"sun\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><g stroke=\\\"#FFB347\\\" stroke-width=\\\"5\\\" stroke-linecap=\\\"round\\\"><path d=\\\"M32 4v7M32 53v7M4 32h7M53 32h7M12 12l5 5M47 47l5 5M52 12l-5 5M17 47l-5 5\\\"/></g><circle cx=\\\"32\\\" cy=\\\"32\\\" r=\\\"17\\\" fill=\\\"#FFD166\\\"/><circle cx=\\\"32\\\" cy=\\\"32\\\" r=\\\"17\\\" fill=\\\"none\\\" stroke=\\\"#FFB347\\\" stroke-width=\\\"2\\\"/><circle cx=\\\"26\\\" cy=\\\"30\\\" r=\\\"2.3\\\" fill=\\\"#5A3A2E\\\"/><circle cx=\\\"38\\\" cy=\\\"30\\\" r=\\\"2.3\\\" fill=\\\"#5A3A2E\\\"/><ellipse cx=\\\"22\\\" cy=\\\"36\\\" rx=\\\"3.4\\\" ry=\\\"2.2\\\" fill=\\\"#FF8FA3\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"42\\\" cy=\\\"36\\\" rx=\\\"3.4\\\" ry=\\\"2.2\\\" fill=\\\"#FF8FA3\\\" opacity=\\\".8\\\"/><path d=\\\"M28 36q4 4 8 0\\\" stroke=\\\"#5A3A2E\\\" stroke-width=\\\"2.2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"sunset\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><circle cx=\\\"38\\\" cy=\\\"26\\\" r=\\\"15\\\" fill=\\\"#FFB38A\\\"/><circle cx=\\\"38\\\" cy=\\\"26\\\" r=\\\"15\\\" fill=\\\"none\\\" stroke=\\\"#FF9466\\\" stroke-width=\\\"2\\\"/><path d=\\\"M33 24q2-2 4 0M41 24q2-2 4 0\\\" stroke=\\\"#6B3A2E\\\" stroke-width=\\\"2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M14 50a10 10 0 0 1 2-19.8A13 13 0 0 1 40 30a9 9 0 0 1 10 9.5A8 8 0 0 1 48 55H18a8 8 0 0 1-4-5z\\\" fill=\\\"#BFD7FF\\\"/><path d=\\\"M14 50a10 10 0 0 1 2-19.8A13 13 0 0 1 40 30a9 9 0 0 1 10 9.5A8 8 0 0 1 48 55H18a8 8 0 0 1-4-5z\\\" fill=\\\"none\\\" stroke=\\\"#8FB4F2\\\" stroke-width=\\\"2\\\"/><circle cx=\\\"25\\\" cy=\\\"44\\\" r=\\\"2\\\" fill=\\\"#3B4F7E\\\"/><circle cx=\\\"35\\\" cy=\\\"44\\\" r=\\\"2\\\" fill=\\\"#3B4F7E\\\"/><ellipse cx=\\\"21\\\" cy=\\\"48\\\" rx=\\\"2.8\\\" ry=\\\"1.8\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"39\\\" cy=\\\"48\\\" rx=\\\"2.8\\\" ry=\\\"1.8\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><path d=\\\"M28 47q2 2.5 4 0\\\" stroke=\\\"#3B4F7E\\\" stroke-width=\\\"1.8\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"moon\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M40 8a24 24 0 1 0 18 34A20 20 0 0 1 40 8z\\\" fill=\\\"#CDB8FF\\\" stroke=\\\"#A88BF0\\\" stroke-width=\\\"2\\\"/><path d=\\\"M20 34q3 3 6 0M31 34q3 3 6 0\\\" stroke=\\\"#4A2F8C\\\" stroke-width=\\\"2.2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><ellipse cx=\\\"19\\\" cy=\\\"40\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FC4\\\" opacity=\\\".85\\\"/><ellipse cx=\\\"38\\\" cy=\\\"40\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FC4\\\" opacity=\\\".85\\\"/><path d=\\\"M26 42q2.5 2 5 0\\\" stroke=\\\"#4A2F8C\\\" stroke-width=\\\"1.8\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M50 10l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.7-2.4 3.6-.4z\\\" fill=\\\"#FFD166\\\"/><text x=\\\"46\\\" y=\\\"32\\\" font-size=\\\"9\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text><text x=\\\"52\\\" y=\\\"26\\\" font-size=\\\"7\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text></svg>\", \"off\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M32 56S8 42 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 18-24 32-24 32z\\\" fill=\\\"#FFB3CC\\\" stroke=\\\"#F48FB1\\\" stroke-width=\\\"2\\\"/><circle cx=\\\"25\\\" cy=\\\"30\\\" r=\\\"2.2\\\" fill=\\\"#7A2E4E\\\"/><circle cx=\\\"39\\\" cy=\\\"30\\\" r=\\\"2.2\\\" fill=\\\"#7A2E4E\\\"/><ellipse cx=\\\"21\\\" cy=\\\"35\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF7FA6\\\" opacity=\\\".7\\\"/><ellipse cx=\\\"43\\\" cy=\\\"35\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF7FA6\\\" opacity=\\\".7\\\"/><path d=\\\"M28 35q4 4 8 0\\\" stroke=\\\"#7A2E4E\\\" stroke-width=\\\"2.2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><ellipse cx=\\\"20\\\" cy=\\\"20\\\" rx=\\\"4\\\" ry=\\\"2.5\\\" fill=\\\"#fff\\\" opacity=\\\".6\\\" transform=\\\"rotate(-30 20 20)\\\"/></svg>\", \"note\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><rect x=\\\"10\\\" y=\\\"10\\\" width=\\\"44\\\" height=\\\"46\\\" rx=\\\"10\\\" fill=\\\"#FFF3B0\\\" stroke=\\\"#F2C94C\\\" stroke-width=\\\"2\\\"/><rect x=\\\"22\\\" y=\\\"5\\\" width=\\\"20\\\" height=\\\"10\\\" rx=\\\"4\\\" fill=\\\"#F7A8C4\\\"/><path d=\\\"M19 30h26M19 39h18\\\" stroke=\\\"#D9A93A\\\" stroke-width=\\\"3\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M44 44l6-6 4 4-6 6h-4z\\\" fill=\\\"#F48FB1\\\"/></svg>\"};",
"/* ===== \u0e2b\u0e32\u0e40\u0e2a\u0e49\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e43\u0e19\u0e23\u0e39\u0e1b \u0e41\u0e25\u0e49\u0e27\u0e15\u0e31\u0e14\u0e0a\u0e48\u0e2d\u0e07\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19\u0e43\u0e2b\u0e49 AI \u0e2d\u0e48\u0e32\u0e19\u0e07\u0e48\u0e32\u0e22 ===== */",
"const GRID = { img: null, ok: false };",
"function gridMask(src, W, H){",
"  const cv = document.createElement(\"canvas\"); cv.width = W; cv.height = H;",
"  const x = cv.getContext(\"2d\"); x.fillStyle = \"#fff\"; x.fillRect(0, 0, W, H); x.drawImage(src, 0, 0, W, H);",
"  const px = x.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H), L = new Float32Array(W * H);",
"  for (let i = 0, j = 0; j < m.length; i += 4, j++) L[j] = 0.3*px[i] + 0.59*px[i+1] + 0.11*px[i+2];",
"  // \u0e04\u0e27\u0e32\u0e21\u0e2a\u0e27\u0e48\u0e32\u0e07\u0e40\u0e09\u0e25\u0e35\u0e48\u0e22\u0e23\u0e2d\u0e1a\u0e46 (\u0e01\u0e31\u0e19\u0e40\u0e07\u0e32/\u0e41\u0e2a\u0e07\u0e44\u0e21\u0e48\u0e40\u0e17\u0e48\u0e32\u0e01\u0e31\u0e19\u0e43\u0e19\u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22)",
"  const I = new Float64Array((W + 1) * (H + 1)), R = 16;",
"  for (let y = 0; y < H; y++){ let s = 0; for (let xx = 0; xx < W; xx++){ s += L[y*W + xx]; I[(y+1)*(W+1) + xx + 1] = I[y*(W+1) + xx + 1] + s; } }",
"  for (let y = 0, j = 0; y < H; y++){ const y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1);",
"    for (let xx = 0; xx < W; xx++, j++){ const x0 = Math.max(0, xx - R), x1 = Math.min(W, xx + R + 1);",
"      const mean = (I[y1*(W+1) + x1] - I[y0*(W+1) + x1] - I[y1*(W+1) + x0] + I[y0*(W+1) + x0]) / ((y1 - y0) * (x1 - x0));",
"      const i = j*4, mx = Math.max(px[i], px[i+1], px[i+2]), mn = Math.min(px[i], px[i+1], px[i+2]);",
"      m[j] = L[j] < Math.min(200, mean - 30) && mx - mn < 55 ? 1 : 0; } }    // \u0e40\u0e2a\u0e49\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07 = \u0e40\u0e17\u0e32/\u0e14\u0e33 \u0e40\u0e02\u0e49\u0e21\u0e01\u0e27\u0e48\u0e32\u0e23\u0e2d\u0e1a\u0e46 (\u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e2a\u0e35\u0e1e\u0e37\u0e49\u0e19\u0e0a\u0e48\u0e2d\u0e07)",
"  return m;",
"}",
"function gridLines(prof, frac){",
"  let mx = 0; for (const v of prof) if (v > mx) mx = v;",
"  const thr = mx * frac, out = []; let s = -1;",
"  for (let i = 0; i <= prof.length; i++){ const on = i < prof.length && prof[i] >= thr; if (on && s < 0) s = i; if (!on && s >= 0){ out.push((s + i - 1)/2); s = -1; } }",
"  return out;",
"}",
"function gridDetect(img){",
"  const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height;",
"  const sc = 1600 / W0, W = 1600, H = Math.round(H0 * sc);",
"  let m = gridMask(img, W, H);",
"  // \u0e2b\u0e32\u0e21\u0e38\u0e21\u0e40\u0e2d\u0e35\u0e22\u0e07 (\u0e40\u0e0a\u0e48\u0e19\u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22\u0e08\u0e2d) \u0e42\u0e14\u0e22\u0e25\u0e2d\u0e07\u0e40\u0e2d\u0e35\u0e22\u0e07\u0e17\u0e35\u0e25\u0e30\u0e19\u0e34\u0e14\u0e43\u0e2b\u0e49\u0e40\u0e2a\u0e49\u0e19\u0e41\u0e19\u0e27\u0e15\u0e31\u0e49\u0e07\u0e04\u0e21\u0e17\u0e35\u0e48\u0e2a\u0e38\u0e14",
"  let bestA = 0, bestS = -1;",
"  for (let a = -6; a <= 6.001; a += 0.25){",
"    const t = Math.tan(a * Math.PI / 180), col = new Float64Array(W + 200);",
"    for (let y = 0; y < H; y += 2){ const off = Math.round((y - H/2) * t) + 100, row = y * W; for (let xx = 0; xx < W; xx++) if (m[row + xx]) col[xx + off]++; }",
"    let s = 0; for (const v of col) s += v * v;",
"    if (s > bestS){ bestS = s; bestA = a; }",
"  }",
"  let src = img;",
"  if (Math.abs(bestA) > 0.01){     // \u0e2b\u0e21\u0e38\u0e19\u0e23\u0e39\u0e1b\u0e01\u0e25\u0e31\u0e1a\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07",
"    const c = document.createElement(\"canvas\"); c.width = W0; c.height = H0; const x = c.getContext(\"2d\");",
"    x.fillStyle = \"#fff\"; x.fillRect(0, 0, W0, H0); x.translate(W0/2, H0/2); x.rotate(-bestA * Math.PI / 180); x.drawImage(img, -W0/2, -H0/2);",
"    src = c; m = gridMask(src, W, H);",
"  }",
"  const col = new Array(W).fill(0);",
"  for (let y = 0; y < H; y++){ const row = y * W; for (let xx = 0; xx < W; xx++) if (m[row + xx]) col[xx]++; }",
"  const vx0 = gridLines(col, 0.3).reduce((a, v) => { if (a.length && v - a[a.length-1] < 6) a[a.length-1] = (a[a.length-1] + v) / 2; else a.push(v); return a; }, []), vx = [];",
"  // \u0e40\u0e2a\u0e49\u0e19\u0e41\u0e19\u0e27\u0e15\u0e31\u0e49\u0e07\u0e1a\u0e32\u0e07\u0e40\u0e2a\u0e49\u0e19\u0e08\u0e32\u0e07 (\u0e0a\u0e48\u0e2d\u0e07\u0e2a\u0e35/\u0e40\u0e07\u0e32) \u2192 \u0e40\u0e15\u0e34\u0e21\u0e40\u0e2a\u0e49\u0e19\u0e17\u0e35\u0e48\u0e2b\u0e32\u0e22\u0e15\u0e23\u0e07\u0e01\u0e25\u0e32\u0e07\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e35\u0e48\u0e01\u0e27\u0e49\u0e32\u0e07\u0e40\u0e1b\u0e47\u0e19 2-3 \u0e40\u0e17\u0e48\u0e32",
"  for (let i = 0; i < vx0.length; i++){",
"    vx.push(vx0[i]); if (i === vx0.length - 1) continue;",
"    const g = vx0[i+1] - vx0[i], near = vx0.slice(Math.max(0, i-3), i+5).map((v, k, a) => k ? v - a[k-1] : null).filter(v => v && v > 12).sort((a, b) => a - b), g0 = near[Math.floor(near.length / 2)];",
"    if (g0) for (const n of [2, 3]) if (Math.abs(g - n*g0) < g0*0.25){ for (let k = 1; k < n; k++) vx.push(vx0[i] + g*k/n); break; }",
"  }",
"  let best = null;     // \u0e0a\u0e38\u0e14\u0e40\u0e2a\u0e49\u0e19\u0e41\u0e19\u0e27\u0e15\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48\u0e2b\u0e48\u0e32\u0e07\u0e40\u0e17\u0e48\u0e32\u0e46 \u0e01\u0e31\u0e19\u0e22\u0e32\u0e27\u0e17\u0e35\u0e48\u0e2a\u0e38\u0e14 = \u0e04\u0e2d\u0e25\u0e31\u0e21\u0e19\u0e4c\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48",
"  for (let i = 0; i < vx.length - 1; i++){",
"    const g0 = vx[i+1] - vx[i]; if (g0 < 12) continue;",
"    let j = i + 1;",
"    while (j < vx.length - 1){ const g = vx[j+1] - vx[j]; if (Math.abs(g - g0) > g0 * 0.3) break; j++; }",
"    if (!best || j - i > best.n) best = { s: i, n: j - i };",
"  }",
"  if (!best || best.n < 28) return { ok: false, why: \"\u0e2b\u0e32\u0e04\u0e2d\u0e25\u0e31\u0e21\u0e19\u0e4c\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d\", angle: bestA, n: best && best.n };",
"  const xs = vx.slice(best.s, best.s + best.n + 1), cw = (xs[xs.length-1] - xs[0]) / best.n;",
"  const row = new Array(H).fill(0), xa = Math.round(xs[0]), xb = Math.round(xs[xs.length-1]);",
"  for (let y = 0; y < H; y++){ const r = y * W; for (let xx = xa; xx <= xb; xx++) if (m[r + xx]) row[y]++; }",
"  const hy = gridLines(row, 0.45);",
"  const bands = [];",
"  for (let i = 0; i < hy.length - 1; i++){ const h = hy[i+1] - hy[i]; if (h >= cw * 1.45) bands.push([hy[i], hy[i+1]]); }",
"  if (bands.length < 2) return { ok: false, why: \"\u0e2b\u0e32\u0e41\u0e16\u0e27\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d\" };",
"  // \u0e40\u0e2a\u0e49\u0e19\u0e41\u0e1a\u0e48\u0e07\u0e41\u0e16\u0e27\u0e08\u0e32\u0e07 \u2192 2 \u0e41\u0e16\u0e27\u0e15\u0e34\u0e14\u0e01\u0e31\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e41\u0e16\u0e1a\u0e40\u0e14\u0e35\u0e22\u0e27: \u0e41\u0e1a\u0e48\u0e07\u0e15\u0e32\u0e21\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e39\u0e07\u0e41\u0e16\u0e27\u0e1b\u0e01\u0e15\u0e34",
"  const hs = bands.map(b => b[1] - b[0]).sort((a, b) => a - b), med = hs[Math.floor(hs.length / 2)];",
"  for (let i = bands.length - 1; i >= 0; i--){ const [y0, y1] = bands[i], n = Math.round((y1 - y0) / med);",
"    if ((y1 - y0) > med * 1.7 && n >= 2){ const step = (y1 - y0) / n, parts = []; for (let k = 0; k < n; k++) parts.push([y0 + k*step, y0 + (k+1)*step]); bands.splice(i, 1, ...parts); } }",
"  GRID.img = src;",
"  return { ok: true, sc, angle: bestA, xs, bands, nameX: [Math.max(0, xs[0] - cw * 9), xs[0]] };",
"}",
"function gridCrop(sx, sy, sw, sh, dw, dh){ const s = 1 / GRID.g.sc, c = document.createElement(\"canvas\"); c.width = dw; c.height = dh; const x = c.getContext(\"2d\"); x.imageSmoothingQuality = \"high\"; x.fillStyle = \"#fff\"; x.fillRect(0, 0, dw, dh); x.drawImage(GRID.img, sx*s, sy*s, sw*s, sh*s, 0, 0, dw, dh); return c; }",
"// \u0e23\u0e39\u0e1b\u0e0a\u0e37\u0e48\u0e2d\u0e02\u0e2d\u0e07\u0e17\u0e38\u0e01\u0e41\u0e16\u0e27 \u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e40\u0e25\u0e02\u0e01\u0e33\u0e01\u0e31\u0e1a #1, #2, ...",
"window.makeNames = function(){",
"  const g = GRID.g, [x0, x1] = g.nameX, w = 700, lh = 64, H = g.bands.length * (lh + 6) + 6;",
"  const c = document.createElement(\"canvas\"); c.width = w + 90; c.height = H; const x = c.getContext(\"2d\");",
"  x.fillStyle = \"#fff\"; x.fillRect(0, 0, c.width, H);",
"  g.bands.forEach(([y0, y1], i) => {",
"    const yy = 6 + i * (lh + 6);",
"    x.drawImage(gridCrop(x0, y0, x1 - x0, y1 - y0, w, lh), 90, yy);",
"    x.fillStyle = \"#d0115b\"; x.font = \"700 30px sans-serif\"; x.textBaseline = \"middle\"; x.fillText(\"#\" + (i+1), 8, yy + lh/2);",
"  });",
"  return c.toDataURL(\"image/jpeg\", .92).split(\",\")[1];",
"};",
"// \u0e0a\u0e48\u0e2d\u0e07\u0e02\u0e2d\u0e07\u0e41\u0e15\u0e48\u0e25\u0e30\u0e27\u0e31\u0e19\u0e43\u0e19\u0e41\u0e16\u0e27 k \u0e02\u0e22\u0e32\u0e22\u0e43\u0e2b\u0e0d\u0e48 \u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e40\u0e25\u0e02\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e15\u0e31\u0e27\u0e42\u0e15",
"window.makeTiles = function(k, days){",
"  const g = GRID.g, [y0, y1] = g.bands[k-1], n = Math.min(days || 31, g.xs.length - 1);",
"  const tw = 150, th = Math.round(tw * (y1 - y0) / ((g.xs[n] - g.xs[0]) / n)), lab = 46, per = 8, gap = 14;",
"  const rows = Math.ceil(n / per), W = per * (tw + gap) + gap, H = rows * (th + lab + gap) + gap;",
"  const c = document.createElement(\"canvas\"); c.width = W; c.height = H; const x = c.getContext(\"2d\");",
"  x.fillStyle = \"#fff\"; x.fillRect(0, 0, W, H);",
"  for (let i = 0; i < n; i++){",
"    const cx = gap + (i % per) * (tw + gap), cy = gap + Math.floor(i / per) * (th + lab + gap);",
"    x.fillStyle = \"#c2185b\"; x.font = \"700 40px sans-serif\"; x.textAlign = \"center\"; x.textBaseline = \"top\"; x.fillText(String(i+1), cx + tw/2, cy + 2);",
"    const pad = (g.xs[i+1] - g.xs[i]) * 0.06;",
"    x.drawImage(gridCrop(g.xs[i] + pad, y0 + pad, g.xs[i+1] - g.xs[i] - pad*2, y1 - y0 - pad*2, tw, th), cx, cy + lab);",
"    x.strokeStyle = \"#999\"; x.lineWidth = 2; x.strokeRect(cx, cy + lab, tw, th);",
"  }",
"  return c.toDataURL(\"image/jpeg\", .92).split(\",\")[1];",
"};",
"",
"// \u0e14\u0e36\u0e07\u0e23\u0e39\u0e1b\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e08\u0e32\u0e01\u0e21\u0e38\u0e21 4 \u0e08\u0e38\u0e14 (\u0e0b\u0e49\u0e32\u0e22\u0e1a\u0e19, \u0e02\u0e27\u0e32\u0e1a\u0e19, \u0e02\u0e27\u0e32\u0e25\u0e48\u0e32\u0e07, \u0e0b\u0e49\u0e32\u0e22\u0e25\u0e48\u0e32\u0e07) \u2014 \u0e43\u0e0a\u0e49\u0e01\u0e31\u0e1a\u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22\u0e40\u0e2d\u0e35\u0e22\u0e07",
"window.warpQuad = function(img, P){",
"  const d = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]);",
"  let W = Math.round(Math.max(d(P[0],P[1]), d(P[3],P[2]))), H = Math.round(Math.max(d(P[0],P[3]), d(P[1],P[2])));",
"  const k = Math.min(1, 2400 / Math.max(W, H)); W = Math.round(W*k); H = Math.round(H*k);",
"  // homography: \u0e1b\u0e25\u0e32\u0e22\u0e17\u0e32\u0e07 (\u0e2a\u0e35\u0e48\u0e40\u0e2b\u0e25\u0e35\u0e48\u0e22\u0e21) \u2192 \u0e15\u0e49\u0e19\u0e17\u0e32\u0e07 (\u0e21\u0e38\u0e21\u0e17\u0e35\u0e48\u0e41\u0e15\u0e30)",
"  const D = [[0,0],[W,0],[W,H],[0,H]], A = [], B = [];",
"  for (let i = 0; i < 4; i++){ const [x, y] = D[i], [u, v] = P[i];",
"    A.push([x, y, 1, 0, 0, 0, -u*x, -u*y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v*x, -v*y]); B.push(v); }",
"  for (let c = 0; c < 8; c++){ let m = c; for (let r = c+1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;",
"    [A[c], A[m]] = [A[m], A[c]]; [B[c], B[m]] = [B[m], B[c]];",
"    for (let r = 0; r < 8; r++) if (r !== c){ const f = A[r][c] / A[c][c]; for (let k2 = c; k2 < 8; k2++) A[r][k2] -= f*A[c][k2]; B[r] -= f*B[c]; } }",
"  const h = B.map((b, i) => b / A[i][i]);",
"  const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;",
"  const sc = document.createElement(\"canvas\"); sc.width = sw; sc.height = sh; const sx = sc.getContext(\"2d\"); sx.drawImage(img, 0, 0);",
"  const sp = sx.getImageData(0, 0, sw, sh).data, out = document.createElement(\"canvas\"); out.width = W; out.height = H;",
"  const ox = out.getContext(\"2d\"), od = ox.createImageData(W, H), dp = od.data;",
"  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){",
"    const w = h[6]*x + h[7]*y + 1, u = (h[0]*x + h[1]*y + h[2]) / w, v = (h[3]*x + h[4]*y + h[5]) / w;",
"    const ui = Math.min(sw-2, Math.max(0, u|0)), vi = Math.min(sh-2, Math.max(0, v|0)), fu = u - ui, fv = v - vi, o = (y*W + x)*4;",
"    for (let c = 0; c < 3; c++){ const i0 = (vi*sw + ui)*4 + c;",
"      dp[o+c] = (sp[i0]*(1-fu) + sp[i0+4]*fu)*(1-fv) + (sp[i0+sw*4]*(1-fu) + sp[i0+sw*4+4]*fu)*fv; }",
"    dp[o+3] = 255; }",
"  ox.putImageData(od, 0, 0); return out;",
"};",
"",
"// \u0e41\u0e1a\u0e1a\u0e43\u0e2b\u0e21\u0e48: \u0e0a\u0e48\u0e2d\u0e07\u0e43\u0e2b\u0e0d\u0e48\u0e02\u0e36\u0e49\u0e19 \u0e41\u0e1a\u0e48\u0e07 2 \u0e23\u0e39\u0e1b (\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 1-16 / 17-\u0e2a\u0e34\u0e49\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19) \u0e43\u0e2b\u0e49\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19\u0e02\u0e19\u0e32\u0e14\u0e17\u0e35\u0e48 AI \u0e22\u0e48\u0e2d\u0e23\u0e39\u0e1b \u0e41\u0e25\u0e30\u0e40\u0e2a\u0e49\u0e19\u0e41\u0e1a\u0e48\u0e07\u0e1a\u0e19/\u0e25\u0e48\u0e32\u0e07\u0e0a\u0e31\u0e14",
"window.makeTiles2 = function(k, days){",
"  const g = GRID.g, [y0, y1] = g.bands[k-1], n = Math.min(days || 31, g.xs.length - 1);",
"  const tw = 200, cwAvg = (g.xs[n] - g.xs[0]) / n, th = Math.round(tw * (y1 - y0) / cwAvg), lab = 52, per = 7, gap = 14;",
"  const parts = [[1, Math.min(16, n)], [17, n]].filter(([a, b]) => a <= b);",
"  return JSON.stringify(parts.map(([a, b]) => {",
"    const cnt = b - a + 1, rows = Math.ceil(cnt / per), W = per * (tw + gap) + gap, H = rows * (th + lab + gap) + gap;",
"    const c = document.createElement(\"canvas\"); c.width = W; c.height = H; const x = c.getContext(\"2d\");",
"    x.fillStyle = \"#fff\"; x.fillRect(0, 0, W, H);",
"    for (let d = a; d <= b; d++){",
"      const i = d - a, cx = gap + (i % per) * (tw + gap), cy = gap + Math.floor(i / per) * (th + lab + gap), xi = d - 1;",
"      x.fillStyle = \"#c2185b\"; x.font = \"700 44px sans-serif\"; x.textAlign = \"center\"; x.textBaseline = \"top\"; x.fillText(String(d), cx + tw/2, cy + 2);",
"      const pad = (g.xs[xi+1] - g.xs[xi]) * 0.06;",
"      x.drawImage(gridCrop(g.xs[xi] + pad, y0 + pad, g.xs[xi+1] - g.xs[xi] - pad*2, y1 - y0 - pad*2, tw, th), cx, cy + lab);",
"      x.strokeStyle = \"#999\"; x.lineWidth = 2; x.strokeRect(cx, cy + lab, tw, th);",
"    }",
"    return c.toDataURL(\"image/jpeg\", .92).split(\",\")[1];",
"  }));",
"};",
"",
"",
"/* ===== \u0e44\u0e2d\u0e04\u0e2d\u0e19 ===== */",
"const ICON_NAMES = {sun:[\"sun\",\"sun\"],sunset:[\"sun-horizon\",\"sunset-2\"],moon:[\"moon-stars\",\"moon\"],off:[\"coffee\",\"zzz\"],alarm:[\"alarm\",\"alarm\"],",
" l:[\"caret-left\",\"chevron-left\"],r:[\"caret-right\",\"chevron-right\"],cal:[\"calendar-heart\",\"calendar\"],sum:[\"chart-pie-slice\",\"chart-donut\"],fr:[\"users-three\",\"users\"],set:[\"gear-six\",\"settings\"],",
" camera:[\"camera\",\"camera\"],share:[\"share-network\",\"share\"],bell:[\"bell-ringing\",\"bell\"],calsync:[\"calendar-plus\",\"calendar-plus\"],ai:[\"sparkle\",\"sparkles\"],user:[\"user-circle\",\"user-circle\"],",
" key:[\"key\",\"key\"],edit:[\"pencil-simple\",\"pencil\"],work:[\"briefcase\",\"briefcase\"],timer:[\"timer\",\"clock-hour-4\"],double:[\"stack\",\"stack-2\"],beach:[\"umbrella\",\"beach\"],party:[\"confetti\",\"confetti\"],",
" check:[\"check-circle\",\"circle-check\"],warn:[\"warning-circle\",\"alert-circle\"],flower:[\"flower-lotus\",\"flower\"],x:[\"x-circle\",\"circle-x\"],heart:[\"heart\",\"heart\"],users:[\"users\",\"users\"],list:[\"clipboard-text\",\"clipboard-text\"]};",
"let ICON_SET = \"ph\";",
"const icls = n => { const v = ICON_NAMES[n]; return ICON_SET===\"tb\" ? \"ti ti-\"+v[1] : (ICON_SET===\"phb\"?\"ph-bold ph-\":\"ph-duotone ph-\")+v[0]; };",
"const ic = n => `<i data-i=\"${n}\" class=\"${icls(n)}\"></i>`;",
"const applyIcons = () => document.querySelectorAll(\"[data-i]\").forEach(el=>el.className = icls(el.dataset.i));",
"",
"/* ===== \u0e18\u0e35\u0e21 ===== */",
"const al = (hex, a) => { const n = parseInt(hex.slice(1),16); return `rgba(${n>>16},${n>>8&255},${n&255},${a})`; };",
"const LIGHT_SHIFT = \"--mBg:#CDEFD9;--mFg:#1F5A3B;--aBg:#D3E3FF;--aFg:#24427E;--nBg:#E2D8FF;--nFg:#4A2F8C;--oBg:#FFE2CF;--oFg:#8E4A22;\";",
"const DARK_SHIFT = \"--mBg:rgba(110,231,170,.22);--mFg:#A6F2CC;--aBg:rgba(120,170,255,.24);--aFg:#C0D6FF;--nBg:rgba(190,150,255,.27);--nFg:#DED0FF;--oBg:rgba(255,180,140,.22);--oFg:#FFD0B4;\";",
"const common = p => `--accent:${p.accent};--we:${p.accent};--accentGlow:${al(p.accent,.4)};--tint:${p.tint};--onAccent:#fff;--heroTitle:${p.title};--heroSub:${p.sub};`;",
"const STYLES = {",
" glass:{name:\"\u0e01\u0e23\u0e30\u0e08\u0e01\",font:\"Mali\",icons:\"ph\",blobs:p=>p.blobs,v:p=>common(p)+`--body:${p.body};--card:rgba(255,255,255,.62);--cardBorder:1px solid rgba(255,255,255,.75);--cardShadow:inset 0 1px 0 rgba(255,255,255,.9),0 8px 32px ${al(p.accent,.12)};--r:28px;--blur:blur(22px) saturate(160%);",
"  --title:${p.title};--sub:${p.sub};--text:${p.text};--heroBg:var(--card);--cdBg:rgba(255,255,255,.65);--orbBg:rgba(255,255,255,.65);--orbBorder:1px solid rgba(255,255,255,.9);",
"  --nbBg:rgba(255,255,255,.65);--nbBorder:1px solid rgba(255,255,255,.9);--dayBg:rgba(255,255,255,.7);--dayBorder:1px solid rgba(255,255,255,.9);--dayShadow:none;--todayShadow:0 3px 10px ${al(p.accent,.45)};--dot:${al(p.accent,.45)};",
"  --tabBg:rgba(255,255,255,.72);--tabFg:${p.sub};--tabOnBg:rgba(255,255,255,.95);--tabOnFg:${p.title};--tabOnShadow:0 2px 10px ${al(p.accent,.15)};--sheet:rgba(255,255,255,.9);--line:${al(p.accent,.2)};--nameBg:rgba(255,255,255,.75);${LIGHT_SHIFT}`},",
" dark:{name:\"\u0e01\u0e23\u0e30\u0e08\u0e01\u0e21\u0e37\u0e14\",font:\"Mali\",icons:\"ph\",blobs:p=>p.dark.blobs,v:p=>{const d=p.dark;return common(p)+`--accent:${d.accent};--we:${d.accent};--accentGlow:${al(d.accent,.35)};--onAccent:${d.body};--tint:${al(d.accent,.2)};--heroTitle:${d.title};--heroSub:${d.sub};",
"  --body:${d.body};--card:rgba(20,12,30,.5);--cardBorder:1px solid rgba(255,255,255,.16);--cardShadow:inset 0 1px 0 rgba(255,255,255,.16),0 10px 40px rgba(0,0,0,.35);--r:28px;--blur:blur(24px) saturate(150%);",
"  --title:${d.title};--sub:${d.sub};--text:${d.title};--heroBg:var(--card);--cdBg:rgba(255,255,255,.12);--orbBg:${al(d.accent,.18)};--orbBorder:1px solid ${al(d.accent,.45)};",
"  --nbBg:rgba(255,255,255,.1);--nbBorder:1px solid rgba(255,255,255,.18);--dayBg:rgba(255,255,255,.08);--dayBorder:1px solid rgba(255,255,255,.13);--dayShadow:none;--todayShadow:0 0 14px ${al(d.accent,.8)};--dot:${al(d.accent,.5)};",
"  --tabBg:rgba(20,12,30,.6);--tabFg:${d.sub};--tabOnBg:${al(d.accent,.25)};--tabOnFg:${d.title};--tabOnShadow:none;--sheet:${al(d.card,.94)};--line:rgba(255,255,255,.18);--nameBg:rgba(255,255,255,.12);${DARK_SHIFT}`}},",
" minimal:{name:\"\u0e21\u0e34\u0e19\u0e34\u0e21\u0e2d\u0e25\",font:\"IBM Plex Sans Thai\",icons:\"tb\",blobs:()=>[],extra:\".p,.chip,.restw,.trow{border:1.3px solid currentColor}\",v:p=>common(p)+`--body:#FAF8F7;--card:#FFFFFF;--cardBorder:1px solid #EEE8E8;--cardShadow:0 1px 2px rgba(0,0,0,.04);--r:20px;--blur:none;",
"  --title:${p.title};--sub:${p.sub};--text:${p.text};--heroBg:var(--card);--cdBg:${p.tint};--orbBg:${p.tint};--orbBorder:none;",
"  --nbBg:#F5F2F2;--nbBorder:none;--dayBg:transparent;--dayBorder:1px solid transparent;--dayShadow:none;--todayShadow:none;--dot:${al(p.accent,.3)};",
"  --mBg:transparent;--mFg:#237A50;--aBg:transparent;--aFg:#2C5DB8;--nBg:transparent;--nFg:#6A40C4;--oBg:transparent;--oFg:#B0602F;",
"  --tabBg:rgba(255,255,255,.95);--tabFg:${p.sub};--tabOnBg:${p.tint};--tabOnFg:${p.accent};--tabOnShadow:none;--sheet:#FFFFFF;--line:#EEE4E6;--nameBg:#F5F2F2;`},",
" planner:{name:\"\u0e41\u0e1e\u0e25\u0e19\u0e40\u0e19\u0e2d\u0e23\u0e4c\",font:\"Itim\",icons:\"ph\",blobs:()=>[],v:p=>common(p)+`--body:#FBF5EC;--card:#FFFDF8;--cardBorder:1.5px solid #E6DACA;--cardShadow:3px 4px 0 #E6DACA;--r:22px;--blur:none;",
"  --title:${p.title};--sub:${p.sub};--text:${p.text};--heroBg:var(--card);--cdBg:${p.tint};--orbBg:${p.tint};--orbBorder:1.5px dashed ${p.accent};",
"  --nbBg:#F6EEE2;--nbBorder:1.5px solid #E6DACA;--dayBg:#FFF8EF;--dayBorder:1.5px dashed #E6DACA;--dayShadow:none;--todayShadow:none;--dot:${al(p.accent,.35)};--washi:${al(p.accent,.4)};",
"  --tabBg:#FFFDF8;--tabFg:${p.sub};--tabOnBg:${p.tint};--tabOnFg:${p.title};--tabOnShadow:none;--sheet:#FFFDF8;--line:#E6DACA;--nameBg:#FFFDF8;${LIGHT_SHIFT}`,",
"  extra:\"body{background-image:radial-gradient(#E4D8C8 1.2px,transparent 1.2px);background-size:18px 18px}.hero{position:relative;margin-top:18px}.hero::before{content:'';position:absolute;top:-11px;left:30px;width:86px;height:22px;background:var(--washi);transform:rotate(-4deg);border-radius:3px}\"},",
" clay:{name:\"Clay 3D\",font:\"Mitr\",icons:\"phb\",blobs:()=>[],v:p=>common(p)+`--body:${p.tint};--card:${p.body};--cardBorder:none;--cardShadow:10px 10px 24px ${al(p.accent,.22)},-8px -8px 20px rgba(255,255,255,.9),inset 2px 2px 4px rgba(255,255,255,.8);--r:30px;--blur:none;",
"  --heroBg:linear-gradient(145deg,${p.accent},${al(p.accent,.78)});--heroTitle:#FFFFFF;--heroSub:rgba(255,255,255,.92);",
"  --title:${p.title};--sub:${p.sub};--text:${p.text};--cdBg:rgba(255,255,255,.25);--orbBg:rgba(255,255,255,.88);--orbBorder:none;",
"  --nbBg:${p.body};--nbBorder:none;--dayBg:${p.body};--dayBorder:1px solid transparent;--dayShadow:3px 3px 7px ${al(p.accent,.18)},-3px -3px 6px rgba(255,255,255,.9);--todayShadow:0 4px 10px ${al(p.accent,.5)};--dot:${al(p.accent,.35)};",
"  --tabBg:${p.body};--tabFg:${p.sub};--tabOnBg:linear-gradient(145deg,${p.accent},${al(p.accent,.78)});--tabOnFg:#FFFFFF;--tabOnShadow:0 5px 12px ${al(p.accent,.4)};--sheet:${p.body};--line:${al(p.accent,.2)};--nameBg:rgba(255,255,255,.7);${LIGHT_SHIFT}`,",
"  extra:\".nb,.btn:not(.main){box-shadow:4px 4px 8px rgba(0,0,0,.08),-3px -3px 6px rgba(255,255,255,.9)}\"},",
" nude:{fixed:true,name:\"\u0e0a\u0e21\u0e1e\u0e39\u0e19\u0e39\u0e49\u0e14\u0e17\u0e2d\u0e07\",font:\"IBM Plex Sans Thai\",icons:\"ph\",blobs:()=>[\"#F6D9DC\",\"#F3E2D2\"],v:()=>`--accent:#A85F70;--we:#A0566C;--accentGlow:rgba(201,138,148,.35);--tint:#F7E4E3;--onAccent:#fff;--heroTitle:#4E2233;--heroSub:#8A5A62;",
"  --body:#FBF4EF;--card:#FFFCF9;--cardBorder:1px solid #EADBC9;--cardShadow:0 8px 24px rgba(160,110,90,.1);--r:26px;--blur:none;",
"  --title:#5A2E3E;--sub:#86606A;--text:#5A3A44;--heroBg:linear-gradient(135deg,#F3D3D6,#E9B9BF);--cdBg:#FFF8F1;--orbBg:#FFF8F3;--orbBorder:1.5px solid #D9B27A;",
"  --nbBg:#FBF2EE;--nbBorder:1px solid #EADBC9;--dayBg:#FBF2EE;--dayBorder:1px solid transparent;--dayShadow:none;--todayShadow:0 0 0 2px #D9B27A;--dot:rgba(201,138,148,.4);",
"  --tabBg:rgba(255,252,249,.94);--tabFg:#86685A;--tabOnBg:#F3D3D6;--tabOnFg:#5A2E3E;--tabOnShadow:none;--sheet:#FFFCF9;--line:#EAD7C4;--nameBg:#FBF2EE;${LIGHT_SHIFT}`,",
"  extra:\".big,.cal-h .t,.hero .what,.sheet h2,.stat .v{font-family:'Noto Serif Thai',serif}.hero{border:1px solid #D9B27A;box-shadow:0 10px 30px rgba(180,110,120,.25),inset 0 1px 0 rgba(255,255,255,.7)}.cd{border:1px solid #E2C38E;color:#9A6B3A}.blob{opacity:.6}\"},",
" pearl:{fixed:true,name:\"\u0e01\u0e23\u0e30\u0e08\u0e01\u0e21\u0e38\u0e01\",font:\"Mitr\",icons:\"ph\",blobs:()=>[\"#FFD6EC\",\"#D7DEFF\",\"#E6D4FF\",\"#FFE3F1\"],v:()=>`--accent:#B07BE6;--we:#C04C9A;--accentGlow:rgba(176,123,230,.35);--tint:#F1E6FF;--onAccent:#fff;--heroTitle:#4A2F78;--heroSub:#8C79B8;",
"  --body:#F7F2FB;--card:rgba(255,255,255,.58);--cardBorder:1px solid rgba(255,255,255,.95);--cardShadow:0 12px 34px rgba(120,90,200,.16),inset 0 1px 0 #fff;--r:28px;--blur:blur(20px) saturate(170%);",
"  --title:#43345A;--sub:#8C79B8;--text:#43345A;--heroBg:linear-gradient(135deg,rgba(255,255,255,.8),rgba(255,255,255,.4));--cdBg:linear-gradient(90deg,#F59AC9,#A99BF5);--orbBg:rgba(255,255,255,.85);--orbBorder:1px solid #fff;",
"  --nbBg:rgba(255,255,255,.6);--nbBorder:1px solid #fff;--dayBg:linear-gradient(160deg,rgba(255,224,241,.85),rgba(226,230,255,.85));--dayBorder:1px solid rgba(255,255,255,.9);--dayShadow:none;--todayShadow:0 3px 12px rgba(176,123,230,.5);--dot:rgba(176,123,230,.45);",
"  --tabBg:rgba(255,255,255,.66);--tabFg:#8C79B8;--tabOnBg:linear-gradient(135deg,#F59AC9,#A99BF5);--tabOnFg:#fff;--tabOnShadow:0 4px 12px rgba(176,123,230,.35);--sheet:rgba(255,255,255,.92);--line:rgba(176,123,230,.22);--nameBg:rgba(255,255,255,.75);${LIGHT_SHIFT}`,",
"  extra:\".big{background:linear-gradient(90deg,#C04C9A,#6E6BE0);-webkit-background-clip:text;background-clip:text;color:transparent}.cd{color:#fff}.hero{position:relative;overflow:hidden}.hero::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,220,245,.5) 45%,rgba(210,230,255,.45) 55%,transparent 70%)}\"},",
" satin:{fixed:true,name:\"\u0e01\u0e25\u0e32\u0e07\u0e04\u0e37\u0e19\u0e41\u0e0b\u0e17\u0e34\u0e19\",font:\"IBM Plex Sans Thai\",icons:\"ph\",blobs:()=>[\"#4A2F6E\",\"#5A2C55\"],v:()=>`--accent:#F3B6CF;--we:#F3B6CF;--accentGlow:rgba(243,182,207,.35);--tint:rgba(245,215,161,.16);--onAccent:#2A1E3E;--heroTitle:#F7E3C0;--heroSub:#C6B2E0;",
"  --body:#221B3C;--card:rgba(255,255,255,.07);--cardBorder:1px solid rgba(255,255,255,.12);--cardShadow:0 10px 40px rgba(0,0,0,.35);--r:26px;--blur:blur(18px);",
"  --title:#F7E3C0;--sub:#B7A3D2;--text:#EADFF2;--heroBg:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04));--cdBg:rgba(245,215,161,.16);--orbBg:rgba(255,255,255,.08);--orbBorder:1px solid rgba(245,215,161,.5);",
"  --nbBg:rgba(255,255,255,.08);--nbBorder:1px solid rgba(255,255,255,.14);--dayBg:rgba(255,255,255,.07);--dayBorder:1px solid rgba(255,255,255,.1);--dayShadow:none;--todayShadow:0 0 12px rgba(243,182,207,.7);--dot:rgba(245,215,161,.5);",
"  --tabBg:rgba(30,24,52,.88);--tabFg:#9C88B8;--tabOnBg:rgba(245,215,161,.16);--tabOnFg:#F5D7A1;--tabOnShadow:none;--sheet:rgba(38,30,64,.97);--line:rgba(255,255,255,.16);--nameBg:rgba(255,255,255,.1);${DARK_SHIFT}`,",
"  extra:\".big,.cal-h .t,.hero .what,.sheet h2,.stat .v{font-family:'Noto Serif Thai',serif}.big{background:linear-gradient(90deg,#F5D7A1,#F3B6CF);-webkit-background-clip:text;background-clip:text;color:transparent}.hero{border:1px solid rgba(245,215,161,.45)}.cd{border:1px solid rgba(245,215,161,.4);color:#F5D7A1}#decor::after{content:'';position:fixed;inset:0;background-image:radial-gradient(1px 1px at 40px 90px,#fff,transparent),radial-gradient(1.2px 1.2px at 300px 60px,#ffe9b8,transparent),radial-gradient(1px 1px at 210px 140px,#fff,transparent),radial-gradient(1px 1px at 120px 40px,#fff,transparent),radial-gradient(1.4px 1.4px at 330px 160px,#fff,transparent),radial-gradient(1px 1px at 70px 420px,#fff,transparent),radial-gradient(1px 1px at 280px 520px,#ffe9b8,transparent);opacity:.75}\"},",
" luxe:{fixed:true,name:\"\u0e21\u0e34\u0e19\u0e34\u0e21\u0e2d\u0e25\u0e2b\u0e23\u0e39\",font:\"IBM Plex Sans Thai\",icons:\"tb\",blobs:()=>[],v:()=>`--accent:#2E2A2C;--we:#B0606F;--accentGlow:rgba(0,0,0,.2);--tint:#F6F1EE;--onAccent:#fff;--heroTitle:#2E2A2C;--heroSub:#81767A;",
"  --body:#FFFFFF;--card:#FFFFFF;--cardBorder:1px solid #F0EAE6;--cardShadow:0 10px 30px rgba(0,0,0,.04);--r:24px;--blur:none;",
"  --title:#2E2A2C;--sub:#81767A;--text:#3A3436;--heroBg:#FAF7F5;--cdBg:#2E2A2C;--orbBg:#FFFFFF;--orbBorder:none;",
"  --nbBg:#FAF7F5;--nbBorder:1px solid #F0EAE6;--dayBg:#FAF5F3;--dayBorder:1px solid transparent;--dayShadow:none;--todayShadow:none;--dot:rgba(0,0,0,.2);",
"  --tabBg:rgba(255,255,255,.96);--tabFg:#8E8488;--tabOnBg:#F6F1EE;--tabOnFg:#2E2A2C;--tabOnShadow:none;--sheet:#FFFFFF;--line:#EFE7E3;--nameBg:#FAF7F5;${LIGHT_SHIFT}`,",
"  extra:\".big,.cal-h .t,.hero .what,.sheet h2,.stat .v{font-family:'Noto Serif Thai',serif}.big{font-weight:500;letter-spacing:.2px}.hello{letter-spacing:1px}.cd{color:#fff}.orb{box-shadow:0 8px 22px rgba(0,0,0,.07)}\"},",
"};",
"function applyTheme(){",
"  const t = DATA.settings.theme || {style:\"glass\", palette:\"sakura\"};",
"  const s = STYLES[t.style] || STYLES.glass, p = PALETTES[t.palette] || PALETTES.sakura;",
"  ICON_SET = s.icons;",
"  $(\"themeVars\").textContent = `:root{--font:'${s.font}','Sukhumvit Set',system-ui,sans-serif;${s.v(p)}}` + (s.extra||\"\");",
"  const pos = [\"left:-90px;top:-60px\",\"right:-80px;top:220px\",\"left:-60px;top:560px\",\"right:-50px;bottom:-40px\"], sz = [300,260,280,220];",
"  $(\"decor\").innerHTML = s.blobs(p).map((c,i)=>`<div class=\"blob\" style=\"width:${sz[i]}px;height:${sz[i]}px;background:${c};${pos[i]}\"></div>`).join(\"\");",
"  $(\"styles\").innerHTML = Object.entries(STYLES).map(([k,v])=>`<button class=\"stb ${k===t.style?\"on\":\"\"}\" onclick=\"setTheme('${k}',null)\">${v.name}</button>`).join(\"\");",
"  $(\"swatches\").style.opacity = s.fixed ? \".35\" : \"\"; $(\"swatches\").style.pointerEvents = s.fixed ? \"none\" : \"\";",
"  $(\"swatches\").innerHTML = Object.entries(PALETTES).map(([k,v])=>`<button class=\"swb ${k===t.palette?\"on\":\"\"}\" onclick=\"setTheme(null,'${k}')\"><span style=\"background:linear-gradient(135deg,${v.blobs[0]},${v.accent})\"></span>${v.name}</button>`).join(\"\");",
"  applyIcons();",
"}",
"function setTheme(style, palette){",
"  const t = DATA.settings.theme = DATA.settings.theme || {style:\"glass\", palette:\"sakura\"};",
"  if (style) t.style = style; if (palette) t.palette = palette;",
"  renderAll(); send(\"saveSettings\", DATA.settings);",
"}",
"",
"/* ===== \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1e\u0e37\u0e49\u0e19\u0e10\u0e32\u0e19 ===== */",
"const SH = {\"\u0e14\":{n:\"\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01\",i:\"moon\",k:\"moon\",t:\"00:00 \u2013 08:00\",s:0,c:\"n\"},\"\u0e0a\":{n:\"\u0e40\u0e27\u0e23\u0e40\u0e0a\u0e49\u0e32\",i:\"sun\",k:\"sun\",t:\"08:00 \u2013 16:00\",s:8,c:\"m\"},\"\u0e1a\":{n:\"\u0e40\u0e27\u0e23\u0e1a\u0e48\u0e32\u0e22\",i:\"sunset\",k:\"sunset\",t:\"16:00 \u2013 24:00\",s:16,c:\"a\"}};",
"const cute = (k, s) => `<span class=\"cute\" style=\"width:${s}px;height:${s}px\">${CUTE[k]}</span>`;",
"const esc = s => String(s).replace(/[&<>\"]/g, c => ({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",\"\\\"\":\"&quot;\"}[c]));",
"const dk = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,\"0\")}-${String(dt.getDate()).padStart(2,\"0\")}`;",
"const noteOf = dt => ((DATA.notes||{})[dk(dt)]||\"\").trim();",
"const ORD = {\"\u0e14\":0,\"\u0e0a\":1,\"\u0e1a\":2};",
"const MONTHS = [\"\u0e21\u0e01\u0e23\u0e32\u0e04\u0e21\",\"\u0e01\u0e38\u0e21\u0e20\u0e32\u0e1e\u0e31\u0e19\u0e18\u0e4c\",\"\u0e21\u0e35\u0e19\u0e32\u0e04\u0e21\",\"\u0e40\u0e21\u0e29\u0e32\u0e22\u0e19\",\"\u0e1e\u0e24\u0e29\u0e20\u0e32\u0e04\u0e21\",\"\u0e21\u0e34\u0e16\u0e38\u0e19\u0e32\u0e22\u0e19\",\"\u0e01\u0e23\u0e01\u0e0e\u0e32\u0e04\u0e21\",\"\u0e2a\u0e34\u0e07\u0e2b\u0e32\u0e04\u0e21\",\"\u0e01\u0e31\u0e19\u0e22\u0e32\u0e22\u0e19\",\"\u0e15\u0e38\u0e25\u0e32\u0e04\u0e21\",\"\u0e1e\u0e24\u0e28\u0e08\u0e34\u0e01\u0e32\u0e22\u0e19\",\"\u0e18\u0e31\u0e19\u0e27\u0e32\u0e04\u0e21\"];",
"const MSH = [\"\u0e21.\u0e04.\",\"\u0e01.\u0e1e.\",\"\u0e21\u0e35.\u0e04.\",\"\u0e40\u0e21.\u0e22.\",\"\u0e1e.\u0e04.\",\"\u0e21\u0e34.\u0e22.\",\"\u0e01.\u0e04.\",\"\u0e2a.\u0e04.\",\"\u0e01.\u0e22.\",\"\u0e15.\u0e04.\",\"\u0e1e.\u0e22.\",\"\u0e18.\u0e04.\"];",
"const DOWF = [\"\u0e2d\u0e32\u0e17\u0e34\u0e15\u0e22\u0e4c\",\"\u0e08\u0e31\u0e19\u0e17\u0e23\u0e4c\",\"\u0e2d\u0e31\u0e07\u0e04\u0e32\u0e23\",\"\u0e1e\u0e38\u0e18\",\"\u0e1e\u0e24\u0e2b\u0e31\u0e2a\u0e1a\u0e14\u0e35\",\"\u0e28\u0e38\u0e01\u0e23\u0e4c\",\"\u0e40\u0e2a\u0e32\u0e23\u0e4c\"], DOWS = [\"\u0e2d\u0e32\",\"\u0e08\",\"\u0e2d\",\"\u0e1e\",\"\u0e1e\u0e24\",\"\u0e28\",\"\u0e2a\"];",
"const $ = id => document.getElementById(id);",
"const key = (y,m) => `${y}-${String(m+1).padStart(2,\"0\")}`;",
"const sortS = s => (s||\"\").split(\"\").filter(c=>ORD[c]!=null).sort((a,b)=>ORD[a]-ORD[b]);",
"const first = n => { const w = n.replace(/^(\u0e19\u0e32\u0e07\u0e2a\u0e32\u0e27|\u0e19\u0e32\u0e07|\u0e19\u0e32\u0e22|\u0e19\\.\u0e2a\\.)\\s*/,\"\").split(/\\s+/).filter(Boolean); return /^part/i.test(w[0]||\"\") && w.length > 1 ? w.slice(0, 2).join(\" \") : w[0]; };",
"const pill = c => `<span class=\"p ${SH[c].c}\">${c}</span>`;",
"",
"/* ===== \u0e15\u0e31\u0e27\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21 Scriptable ===== */",
"const Q = [];",
"function send(type, payload){",
"  if (DATA.preview){ previewHandler({type, payload}); return; }",
"  Q.push({type, payload}); (window.__signal || (u => { window.location.href = u; }))(\"shiftapp://msg/\" + Date.now());",
"}",
"window.__drain = () => JSON.stringify(Q.splice(0));",
"",
"/* ===== \u0e2a\u0e16\u0e32\u0e19\u0e30 ===== */",
"const now = () => DATA.preview ? new Date(DATA.today + \"T\" + (DATA.time||\"13:00\") + \":00\") : new Date();",
"let viewY, viewM, selDay = null, frDay = null, frFriend = null;",
"function initView(){",
"  const n = now(), k = key(n.getFullYear(), n.getMonth()), ks = Object.keys(DATA.months).sort();",
"  const pick = DATA.months[k] ? k : (ks.find(x=>x>k) || ks[ks.length-1] || k);",
"  [viewY, viewM] = pick.split(\"-\").map(Number); viewM--;",
"}",
"const monthData = () => DATA.months[key(viewY,viewM)] || null;",
"const mine = () => { const md = monthData(); return md ? (md.people[DATA.me] || {}) : {}; };",
"const isToday = d => { const n = now(); return n.getFullYear()===viewY && n.getMonth()===viewM && n.getDate()===d; };",
"const daysIn = () => new Date(viewY, viewM+1, 0).getDate();",
"const firstDow = () => new Date(viewY, viewM, 1).getDay();",
"",
"/* ===== \u0e40\u0e27\u0e23\u0e16\u0e31\u0e14\u0e44\u0e1b ===== */",
"function allMyShifts(){",
"  const list = [];",
"  for (const [k, md] of Object.entries(DATA.months)){",
"    const [y,m] = k.split(\"-\").map(Number), me = md.people[DATA.me] || {};",
"    for (const [d, s] of Object.entries(me)) for (const c of sortS(s)){",
"      const st = new Date(y, m-1, +d, SH[c].s); list.push({c, st, en:new Date(st.getTime()+8*3600e3)});",
"    }",
"  }",
"  return list.sort((a,b)=>a.st-b.st);",
"}",
"/* ===== \u0e40\u0e15\u0e37\u0e2d\u0e19\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19: \u0e04\u0e27\u0e1a 16 \u0e0a\u0e21.+ / \u0e1e\u0e31\u0e01\u0e44\u0e21\u0e48\u0e16\u0e36\u0e07 8 \u0e0a\u0e21. / \u0e17\u0e33\u0e15\u0e34\u0e14\u0e01\u0e31\u0e19 6 \u0e27\u0e31\u0e19+ ===== */",
"function restIssues(){",
"  const L = allMyShifts(), out = [], fd = d => `${d.getDate()} ${MSH[d.getMonth()]}`;",
"  const blocks = [];",
"  for (const x of L){ const b = blocks[blocks.length-1]; if (b && x.st.getTime() === b.en.getTime()){ b.en = x.en; b.cs.push(x.c); } else blocks.push({st:x.st, en:x.en, cs:[x.c]}); }",
"  blocks.forEach((b,i) => {",
"    const h = (b.en - b.st)/36e5;",
"    if (h >= 16) out.push({d:b.st, kind:\"long\", t:`${fd(b.st)} \u0e17\u0e33\u0e15\u0e48\u0e2d\u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07 ${h} \u0e0a\u0e21. (${b.cs.map(c=>SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")).join(\"\u2192\")})`});",
"    const nx = blocks[i+1];",
"    if (nx){ const g = (nx.st - b.en)/36e5; if (g > 0 && g <= 8) out.push({d:nx.st, kind:\"rest\", t:`${fd(nx.st)} \u0e1e\u0e31\u0e01\u0e41\u0e04\u0e48 ${g} \u0e0a\u0e21. \u0e01\u0e48\u0e2d\u0e19${SH[nx.cs[0]].n}`}); }",
"  });",
"  const days = [...new Set(L.map(x=>new Date(x.st.getFullYear(),x.st.getMonth(),x.st.getDate()).getTime()))].sort((a,b)=>a-b);",
"  let s0 = 0;",
"  for (let i=1; i<=days.length; i++){",
"    if (i < days.length && days[i]-days[i-1] === 864e5) continue;",
"    const n = i - s0; if (n >= 6) out.push({d:new Date(days[s0]), kind:\"run\", t:`${fd(new Date(days[s0]))}\u2013${fd(new Date(days[i-1]))} \u0e17\u0e33\u0e15\u0e34\u0e14\u0e01\u0e31\u0e19 ${n} \u0e27\u0e31\u0e19\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2b\u0e22\u0e38\u0e14`});",
"    s0 = i;",
"  }",
"  return out.sort((a,b)=>a.d-b.d);",
"}",
"const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();",
"const dayDiff = (a,b) => Math.round((new Date(b.getFullYear(),b.getMonth(),b.getDate()) - new Date(a.getFullYear(),a.getMonth(),a.getDate()))/864e5);",
"function dur(ms){ const m = Math.round(ms/6e4), d = Math.floor(m/1440), h = Math.floor(m%1440/60), mm = m%60;",
"  return d ? `${d} \u0e27\u0e31\u0e19 ${h} \u0e0a\u0e21.` : h ? `${h} \u0e0a\u0e21. ${mm} \u0e19\u0e32\u0e17\u0e35` : `${mm} \u0e19\u0e32\u0e17\u0e35`; }",
"function renderHero(){",
"  const n = now(), list = allMyShifts(), cur = list.find(x=>x.st<=n && x.en>n), nxt = list.find(x=>x.st>n);",
"  let h;",
"  if (cur) h = `<div><p class=\"when\">\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2d\u0e22\u0e39\u0e48</p><p class=\"what\">${SH[cur.c].n}</p><p class=\"time\">${SH[cur.c].t}</p><span class=\"cd\">${ic(\"timer\")}\u0e2d\u0e35\u0e01 ${dur(cur.en-n)} \u0e40\u0e25\u0e34\u0e01\u0e40\u0e27\u0e23</span></div><div class=\"orb\">${cute(SH[cur.c].k,46)}</div>`;",
"  else if (nxt){",
"    const dd = dayDiff(n, nxt.st), when = dd===0?\"\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\":dd===1?\"\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49\":`${DOWF[nxt.st.getDay()]} ${nxt.st.getDate()} ${MSH[nxt.st.getMonth()]}`;",
"    h = `<div><p class=\"when\">\u0e40\u0e27\u0e23\u0e16\u0e31\u0e14\u0e44\u0e1b \u00b7 ${when}</p><p class=\"what\">${SH[nxt.c].n}</p><p class=\"time\">${SH[nxt.c].t}</p><span class=\"cd\">${ic(\"alarm\")}\u0e2d\u0e35\u0e01 ${dur(nxt.st-n)}</span></div><div class=\"orb\">${cute(SH[nxt.c].k,46)}</div>`;",
"  } else h = `<div><p class=\"when\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e27\u0e23\u0e02\u0e49\u0e32\u0e07\u0e2b\u0e19\u0e49\u0e32</p><p class=\"what\">\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19\u0e40\u0e22\u0e2d\u0e30\u0e46 \u0e19\u0e30</p><p class=\"time\">\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22</p></div><div class=\"orb\">${cute(\"off\",44)}</div>`;",
"  $(\"hero\").innerHTML = h;",
"  const t = noteOf(n), nb = $(\"todayNote\");",
"  nb.style.display = t ? \"\" : \"none\";",
"  if (t) nb.innerHTML = `<div class=\"notecard\">${cute(\"note\",30)}<div><p class=\"h3\" style=\"font-size:14px\">\u0e42\u0e19\u0e49\u0e15\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49</p><p class=\"t\">${esc(t)}</p></div></div>`;",
"}",
"",
"/* ===== \u0e1b\u0e0f\u0e34\u0e17\u0e34\u0e19 ===== */",
"function countMonth(me, days){",
"  const c = {\"\u0e0a\":0,\"\u0e1a\":0,\"\u0e14\":0}; let off = 0;",
"  for (let d=1; d<=days; d++){ const s = sortS(me[d]); if (!s.length) off++; for (const x of s) c[x]++; }",
"  return {c, off, total:c[\"\u0e0a\"]+c[\"\u0e1a\"]+c[\"\u0e14\"]};",
"}",
"const chipsHTML = k => `<span class=\"chip m\">${ic(\"sun\")}\u0e40\u0e0a\u0e49\u0e32 ${k.c[\"\u0e0a\"]}</span><span class=\"chip a\">${ic(\"sunset\")}\u0e1a\u0e48\u0e32\u0e22 ${k.c[\"\u0e1a\"]}</span><span class=\"chip n\">${ic(\"moon\")}\u0e14\u0e36\u0e01 ${k.c[\"\u0e14\"]}</span><span class=\"chip o\">${ic(\"off\")}\u0e2b\u0e22\u0e38\u0e14 ${k.off}</span>`;",
"function renderCal(){",
"  const md = monthData(), me = mine(), f = firstDow(), days = daysIn();",
"  $(\"calTitle\").textContent = `${MONTHS[viewM]} ${viewY+543}`;",
"  let h = \"<div></div>\".repeat(f);",
"  for (let d=1; d<=days; d++){",
"    const s = sortS(me[d]), w = (f+d-1)%7, we = w===0||w===6;",
"    const n = now(), past = new Date(viewY, viewM, d) < new Date(n.getFullYear(), n.getMonth(), n.getDate());",
"    const ps = s.length ? `<div class=\"ics\">${s.map(c=>cute(SH[c].k, s.length>1?19:24)).join(\"\")}</div>` : (md ? `<div class=\"ics\" style=\"opacity:.75\">${cute(\"off\",17)}</div>` : \"\");",
"    const pin = noteOf(new Date(viewY, viewM, d)) ? `<span class=\"pin\">${CUTE.note}</span>` : \"\";",
"    h += `<div class=\"d ${s.length?\"h\":\"\"} ${isToday(d)?\"t\":\"\"} ${past&&!isToday(d)?\"past\":\"\"} ${selDay===d?\"sel\":\"\"}\" onclick=\"openDay(${d})\"><span class=\"nn ${we?\"we\":\"\"}\">${d}</span>${ps}${pin}</div>`;",
"  }",
"  $(\"days\").innerHTML = h;",
"  $(\"chips\").innerHTML = md ? chipsHTML(countMonth(me, days)) : `<p class=\"note\" style=\"width:100%\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49 \u0e01\u0e14 \"\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e40\u0e27\u0e23\" \u0e44\u0e14\u0e49\u0e40\u0e25\u0e22</p>`;",
"}",
"function moveMonth(n){ viewM += n; if (viewM<0){viewM=11;viewY--} if (viewM>11){viewM=0;viewY++} selDay=null; frDay=null; renderAll(); }",
"let tx = null;",
"$(\"calCard\").addEventListener(\"touchstart\", e=>tx=e.touches[0].clientX, {passive:true});",
"$(\"calCard\").addEventListener(\"touchend\", e=>{ if (tx==null) return; const dx = e.changedTouches[0].clientX-tx; if (Math.abs(dx)>60) moveMonth(dx<0?1:-1); tx=null; });",
"",
"/* ===== \u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e27\u0e31\u0e19 + \u0e41\u0e01\u0e49\u0e40\u0e27\u0e23 ===== */",
"let editSet = \"\";",
"function openDay(d){",
"  selDay = d; renderCal();",
"  const md = monthData(), s = sortS(mine()[d]), dt = new Date(viewY, viewM, d);",
"  editSet = s.join(\"\");",
"  let rows = s.map(c=>{",
"    const mates = md ? Object.entries(md.people).filter(([n,v])=>n!==DATA.me && (v[d]||\"\").includes(c)).map(([n])=>first(n)) : [];",
"    const acts = md && Object.keys(md.people).length > 1 ? `<div class=\"sact\"><button onclick=\"openAct(${d},'swap','${c}')\">${ic(\"users\")}\u0e02\u0e2d\u0e41\u0e25\u0e01</button><button onclick=\"openAct(${d},'sell','${c}')\">${ic(\"share\")}\u0e02\u0e32\u0e22 / \u0e2b\u0e32\u0e04\u0e19\u0e41\u0e17\u0e19</button></div>` : \"\";",
"    return `<div class=\"srow ${SH[c].c}\">${cute(SH[c].k,40)}<div style=\"flex:1\"><p class=\"nm\">${SH[c].n}</p><p class=\"tm\">${SH[c].t}</p>${mates.length?`<p class=\"mates\">\u0e2d\u0e22\u0e39\u0e48\u0e14\u0e49\u0e27\u0e22\u0e01\u0e31\u0e19: ${mates.join(\", \")}</p>`:\"\"}${acts}</div></div>`;",
"  }).join(\"\");",
"  if (!s.length) rows = `<div class=\"srow o\">${cute(\"off\",38)}<div><p class=\"nm\">\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14</p><p class=\"tm\">\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19\u0e43\u0e2b\u0e49\u0e40\u0e15\u0e47\u0e21\u0e17\u0e35\u0e48\u0e19\u0e30</p></div></div>`;",
"  const warn = restIssues().filter(w => w.kind !== \"run\" && sameDay(w.d, dt));",
"  if (warn.length) rows += `<div class=\"restw\">${ic(\"warn\")}<div>${warn.map(w=>esc(w.t)).join(\"<br>\")}<br><span>\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19\u0e43\u0e2b\u0e49\u0e1e\u0e2d \u0e14\u0e37\u0e48\u0e21\u0e19\u0e49\u0e33\u0e40\u0e22\u0e2d\u0e30\u0e46 \u0e19\u0e30</span></div></div>`;",
"  rows += tradeRows(d);",
"  if (md && Object.keys(md.people).length > 1 && s.length < 3) rows += `<button class=\"buyb\" onclick=\"openAct(${d},'buy')\">${ic(\"work\")}\u0e0b\u0e37\u0e49\u0e2d\u0e40\u0e27\u0e23 (\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e04\u0e19\u0e2d\u0e37\u0e48\u0e19)</button>`;",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div>",
"    <h2 class=\"big\" style=\"font-size:22px\">${DOWF[dt.getDay()]} ${d} ${MONTHS[viewM]}</h2>",
"    <p class=\"hello\" style=\"margin-bottom:12px\">${isToday(d)?\"\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\":`${MONTHS[viewM]} ${viewY+543}`}</p>${rows}",
"    <p class=\"h3\" style=\"margin-top:18px;display:flex;align-items:center;gap:6px\">${cute(\"note\",24)}\u0e42\u0e19\u0e49\u0e15</p>",
"    <textarea class=\"notebox\" id=\"noteText\" placeholder=\"\u0e08\u0e14\u0e2d\u0e30\u0e44\u0e23\u0e01\u0e47\u0e44\u0e14\u0e49 \u0e40\u0e0a\u0e48\u0e19 \u0e41\u0e25\u0e01\u0e40\u0e27\u0e23 \u0e19\u0e31\u0e14\u0e2b\u0e21\u0e2d \u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e2d\u0e07\" style=\"margin-top:8px\">${esc(noteOf(dt))}</textarea>",
"    <div class=\"qchips\">${[\"\u0e41\u0e25\u0e01\u0e40\u0e27\u0e23\",\"OT\",\"\u0e25\u0e32\",\"\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e2d\",\"\u0e27\u0e31\u0e19\u0e40\u0e01\u0e34\u0e14\",\"\u0e1b\u0e23\u0e30\u0e0a\u0e38\u0e21\"].map(q=>`<button class=\"qchip\" onclick=\"addQuick('${q}')\">+ ${q}</button>`).join(\"\")}</div>",
"    <details class=\"editd\"${s.length?\"\":\" open\"}><summary>${ic(\"edit\")}\u0e41\u0e01\u0e49\u0e40\u0e27\u0e23\u0e40\u0e2d\u0e07 <span>(\u0e43\u0e0a\u0e49\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e15\u0e32\u0e23\u0e32\u0e07\u0e2d\u0e48\u0e32\u0e19\u0e1c\u0e34\u0e14 \u0e2b\u0e23\u0e37\u0e2d\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e40\u0e27\u0e23)</span></summary>",
"    <div class=\"tog\">${[\"\u0e14\",\"\u0e0a\",\"\u0e1a\"].map(c=>`<button class=\"c${SH[c].c} ${editSet.includes(c)?\"on\":\"\"}\" onclick=\"togEdit('${c}',this)\">${cute(SH[c].k,24)} ${SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")}</button>`).join(\"\")}</div>",
"    </details>",
"    <button class=\"btn main\" style=\"width:100%;margin-top:8px\" onclick=\"saveDay(${d})\">${ic(\"check\")}\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button>`;",
"  openSheet();",
"}",
"/* ===== \u0e02\u0e2d\u0e41\u0e25\u0e01 / \u0e02\u0e32\u0e22 / \u0e0b\u0e37\u0e49\u0e2d\u0e40\u0e27\u0e23: \u0e0b\u0e37\u0e49\u0e2d = \u0e40\u0e23\u0e32\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e04\u0e19\u0e2d\u0e37\u0e48\u0e19 (\u0e44\u0e14\u0e49\u0e40\u0e07\u0e34\u0e19), \u0e02\u0e32\u0e22 = \u0e04\u0e19\u0e2d\u0e37\u0e48\u0e19\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e40\u0e23\u0e32 (\u0e08\u0e48\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19) ===== */",
"const trades = () => (DATA.trades = DATA.trades || []);",
"const baht = n => (+n||0).toLocaleString(\"th-TH\") + \" \u0e1a\u0e32\u0e17\";",
"const dShort = d => `${d} ${MSH[viewM]}`;",
"function tradeRows(d){",
"  const date = dk(new Date(viewY, viewM, d)), list = trades().filter(t=>t.date===date);",
"  return list.map(t=>`<div class=\"trow ${t.type}\"><div><b>${t.type===\"buy\"?\"\u0e0b\u0e37\u0e49\u0e2d\":\"\u0e02\u0e32\u0e22\"}${SH[t.c].n}</b> \u00b7 ${t.type===\"buy\"?`\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19 ${esc(t.who||\"-\")}`:`${esc(t.who||\"-\")} \u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19`}<br><span>${t.type===\"buy\"?\"\u0e44\u0e14\u0e49\":\"\u0e08\u0e48\u0e32\u0e22\"} ${baht(t.price)}</span></div>",
"    <button class=\"tpaid ${t.paid?\"on\":\"\"}\" onclick=\"togPaid('${t.id}')\">${t.paid?(t.type===\"buy\"?\"\u0e23\u0e31\u0e1a\u0e41\u0e25\u0e49\u0e27\":\"\u0e08\u0e48\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27\"):(t.type===\"buy\"?\"\u0e04\u0e49\u0e32\u0e07\u0e23\u0e31\u0e1a\":\"\u0e04\u0e49\u0e32\u0e07\u0e08\u0e48\u0e32\u0e22\")}</button><button class=\"tdel\" onclick=\"delTrade('${t.id}')\" aria-label=\"\u0e25\u0e1a\">${ic(\"x\")}</button></div>`).join(\"\");",
"}",
"let ACT = null;",
"function peopleOn(d, c){ const md = monthData(); return md ? Object.keys(md.people).filter(n=>n!==DATA.me && sortS(md.people[n][d]).includes(c)) : []; }",
"function peopleOff(d){ const md = monthData(); return md ? Object.keys(md.people).filter(n=>n!==DATA.me && !sortS(md.people[n][d]).length && Object.values(md.people[n]).some(x=>sortS(x).length)) : []; }",
"function openAct(d, mode, c){ ACT = {d, mode, c: c || null, who: \"\", price: \"\"}; renderAct(); }",
"function renderAct(){",
"  const {d, mode, c} = ACT, mineS = sortS(mine()[d]);",
"  const title = mode===\"swap\" ? `\u0e02\u0e2d\u0e41\u0e25\u0e01${SH[c].n}` : mode===\"sell\" ? `\u0e02\u0e32\u0e22${SH[c].n}` : \"\u0e0b\u0e37\u0e49\u0e2d\u0e40\u0e27\u0e23 (\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e04\u0e19\u0e2d\u0e37\u0e48\u0e19)\";",
"  const sub = mode===\"swap\" ? \"\u0e41\u0e15\u0e30\u0e0a\u0e37\u0e48\u0e2d\u0e04\u0e19\u0e17\u0e35\u0e48\u0e2b\u0e22\u0e38\u0e14\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49 \u0e41\u0e25\u0e49\u0e27\u0e2a\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e02\u0e2d\u0e41\u0e25\u0e01\" : mode===\"sell\" ? \"\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e04\u0e19\u0e17\u0e35\u0e48\u0e08\u0e30\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e40\u0e23\u0e32 \u0e41\u0e25\u0e49\u0e27\u0e08\u0e14\u0e23\u0e32\u0e04\u0e32\u0e44\u0e27\u0e49\" : \"\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e27\u0e23 \u0e41\u0e25\u0e49\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e04\u0e19\u0e17\u0e35\u0e48\u0e40\u0e23\u0e32\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\";",
"  const chip = (n, on, fn) => `<button class=\"pchip ${on?\"on\":\"\"}\" onclick=\"${fn}\">${esc(first(n))}</button>`;",
"  let body = \"\";",
"  if (mode === \"swap\"){",
"    const off = peopleOff(d);",
"    body = off.length ? `<div class=\"pchips\">${off.map((n,i)=>chip(n,false,`askSwap(${i})`)).join(\"\")}</div>` : `<p class=\"note\">\u0e44\u0e21\u0e48\u0e21\u0e35\u0e43\u0e04\u0e23\u0e2b\u0e22\u0e38\u0e14\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49</p>`;",
"    body += `<button class=\"btn\" style=\"width:100%;margin-top:12px\" onclick=\"announce('swap')\">${ic(\"share\")}\u0e1b\u0e23\u0e30\u0e01\u0e32\u0e28\u0e2b\u0e32\u0e04\u0e19\u0e41\u0e25\u0e01\u0e43\u0e19\u0e01\u0e25\u0e38\u0e48\u0e21</button>`;",
"  } else {",
"    if (mode === \"buy\") body += `<p class=\"lab\">\u0e40\u0e27\u0e23\u0e17\u0e35\u0e48\u0e08\u0e30\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19</p><div class=\"tog2\">${[\"\u0e14\",\"\u0e0a\",\"\u0e1a\"].filter(x=>!mineS.includes(x)).map(x=>`<button class=\"${x===c?\"on\":\"\"}\" onclick=\"ACT.c='${x}';ACT.who='';renderAct()\">${SH[x].n.replace(\"\u0e40\u0e27\u0e23\",\"\")} \u00b7 ${peopleOn(d,x).length} \u0e04\u0e19</button>`).join(\"\")}</div>`;",
"    if (c){",
"      const list = mode === \"buy\" ? peopleOn(d, c) : peopleOff(d);",
"      body += `<p class=\"lab\">${mode===\"buy\"?\"\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e43\u0e04\u0e23\":\"\u0e43\u0e04\u0e23\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e40\u0e23\u0e32\"}</p>",
"        <div class=\"pchips\">${list.map(n=>chip(n, ACT.who===first(n), `ACT.who='${esc(first(n)).replace(/'/g,\"\")}';renderAct()`)).join(\"\") || `<span class=\"note\">\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d</span>`}</div>",
"        <input id=\"actWho\" placeholder=\"\u0e2b\u0e23\u0e37\u0e2d\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e2d\u0e07\" value=\"${list.some(n=>first(n)===ACT.who)?\"\":esc(ACT.who)}\" oninput=\"ACT.who=this.value\">",
"        <p class=\"lab\">\u0e23\u0e32\u0e04\u0e32</p><input id=\"actPrice\" type=\"number\" inputmode=\"numeric\" placeholder=\"\u0e40\u0e0a\u0e48\u0e19 800\" value=\"${esc(ACT.price)}\" oninput=\"ACT.price=this.value\">",
"        <button class=\"btn main\" style=\"width:100%;margin-top:12px\" onclick=\"saveAct()\">${ic(\"check\")}${mode===\"buy\"?\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e0b\u0e37\u0e49\u0e2d\":\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e02\u0e32\u0e22\"}</button>",
"        ${mode===\"sell\"?`<button class=\"btn\" style=\"width:100%;margin-top:8px\" onclick=\"announce('sell')\">${ic(\"share\")}\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e04\u0e19? \u0e1b\u0e23\u0e30\u0e01\u0e32\u0e28\u0e02\u0e32\u0e22\u0e43\u0e19\u0e01\u0e25\u0e38\u0e48\u0e21</button>`:\"\"}`;",
"    }",
"  }",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><button class=\"backb\" onclick=\"openDay(${d})\">${ic(\"l\")}\u0e01\u0e25\u0e31\u0e1a</button>",
"    <h2 class=\"big\" style=\"font-size:22px;margin-top:6px\">${title}</h2><p class=\"hello\" style=\"margin-bottom:12px\">${DOWF[new Date(viewY,viewM,d).getDay()]} ${dShort(d)} \u00b7 ${sub}</p>${body}`;",
"  openSheet();",
"}",
"function askSwap(i){",
"  const {d, c} = ACT, n = peopleOff(d)[i];",
"  send(\"shareText\", `\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e04\u0e48\u0e30 ${first(n)} \u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 ${d} ${MONTHS[viewM]} \u0e27\u0e48\u0e32\u0e07\u0e44\u0e2b\u0e21\u0e04\u0e30 \u0e02\u0e2d\u0e41\u0e25\u0e01${SH[c].n} (${SH[c].t}) \u0e2b\u0e19\u0e48\u0e2d\u0e22\u0e44\u0e14\u0e49\u0e44\u0e2b\u0e21\u0e04\u0e30`);",
"}",
"function announce(kind){",
"  const {d, c} = ACT, pr = +ACT.price, day = `\u0e27\u0e31\u0e19${DOWF[new Date(viewY,viewM,d).getDay()]}\u0e17\u0e35\u0e48 ${d} ${MONTHS[viewM]}`;",
"  send(\"shareText\", kind===\"swap\" ? `\u0e2b\u0e32\u0e04\u0e19\u0e41\u0e25\u0e01${SH[c].n} ${day} (${SH[c].t}) \u0e43\u0e04\u0e23\u0e27\u0e48\u0e32\u0e07\u0e17\u0e31\u0e01\u0e44\u0e14\u0e49\u0e19\u0e30\u0e04\u0e30` : `\u0e02\u0e32\u0e22${SH[c].n} ${day} (${SH[c].t})${pr?` \u0e23\u0e32\u0e04\u0e32 ${baht(pr)}`:\"\"} \u0e43\u0e04\u0e23\u0e2a\u0e19\u0e43\u0e08\u0e17\u0e31\u0e01\u0e44\u0e14\u0e49\u0e19\u0e30\u0e04\u0e30`);",
"}",
"function applyTrade(t, undo){       // \u0e1b\u0e23\u0e31\u0e1a\u0e1b\u0e0f\u0e34\u0e17\u0e34\u0e19: \u0e0b\u0e37\u0e49\u0e2d = \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e27\u0e23\u0e40\u0e23\u0e32 \u0e15\u0e31\u0e14\u0e40\u0e27\u0e23\u0e40\u0e02\u0e32 / \u0e02\u0e32\u0e22 = \u0e15\u0e31\u0e14\u0e40\u0e27\u0e23\u0e40\u0e23\u0e32 \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e27\u0e23\u0e40\u0e02\u0e32",
"  const [y,m,dd] = t.date.split(\"-\").map(Number), k = `${y}-${String(m).padStart(2,\"0\")}`;",
"  if (!DATA.months[k]) DATA.months[k] = {people:{}, totals:{}};",
"  const P = DATA.months[k].people, me = P[DATA.me] = P[DATA.me] || {};",
"  const gain0 = (t.type===\"buy\") !== !!undo, cand = Object.keys(P).filter(n=>n!==DATA.me && first(n)===t.who);",
"  const who = cand.find(n=>sortS((P[n]||{})[dd]).includes(t.c) === gain0) || cand[0];   // \u0e0a\u0e37\u0e48\u0e2d\u0e0b\u0e49\u0e33: \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e04\u0e19\u0e17\u0e35\u0e48\u0e21\u0e35/\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e27\u0e23\u0e19\u0e31\u0e49\u0e19\u0e08\u0e23\u0e34\u0e07",
"  const add = (o, n) => { o[n] = sortS((o[n]||\"\") + t.c).filter((x,i,a)=>a.indexOf(x)===i).join(\"\"); };",
"  const rem = (o, n) => { const v = sortS(o[n]).filter(x=>x!==t.c).join(\"\"); if (v) o[n] = v; else delete o[n]; };",
"  if (gain0){ add(me, dd); if (who && P[who]) rem(P[who], dd); } else { rem(me, dd); if (who && P[who]) add(P[who], dd); }",
"  send(\"saveMonth\", {key:k, month:DATA.months[k]});",
"}",
"window.reapplyTrades = k => { trades().filter(t=>t.date.startsWith(k)).forEach(t=>applyTrade(t)); renderAll(); };",
"/* ===== \u0e0a\u0e37\u0e48\u0e2d + Claude key (\u0e40\u0e01\u0e47\u0e1a\u0e43\u0e19 Keychain \u0e1a\u0e19\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07) ===== */",
"function openProfile(){",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><h2 class=\"big\" style=\"font-size:22px\">\u0e0a\u0e37\u0e48\u0e2d \u0e41\u0e25\u0e30 API key</h2>",
"    <p class=\"lab\">\u0e0a\u0e37\u0e48\u0e2d-\u0e19\u0e32\u0e21\u0e2a\u0e01\u0e38\u0e25 (\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e43\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e27\u0e23)</p><input id=\"pfName\" value=\"${esc(DATA.me||\"\")}\" autocomplete=\"off\">",
"    <p class=\"lab\">Claude API key ${DATA.hasKey.claude?\"(\u0e15\u0e31\u0e49\u0e07\u0e41\u0e25\u0e49\u0e27 \u00b7 \u0e40\u0e27\u0e49\u0e19\u0e27\u0e48\u0e32\u0e07 = \u0e43\u0e0a\u0e49\u0e2d\u0e31\u0e19\u0e40\u0e14\u0e34\u0e21)\":\"(\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e15\u0e31\u0e49\u0e07)\"}</p>",
"    <input id=\"pfKey\" type=\"password\" placeholder=\"sk-ant-api03-...\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\">",
"    <p class=\"note\" style=\"margin-top:6px\">\u0e02\u0e2d key \u0e44\u0e14\u0e49\u0e17\u0e35\u0e48 console.anthropic.com \u00b7 key \u0e40\u0e01\u0e47\u0e1a\u0e43\u0e19\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e19\u0e35\u0e49\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19</p>",
"    <button class=\"btn main\" style=\"width:100%;margin-top:12px\" onclick=\"saveProfile()\">${ic(\"check\")}\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button>",
"    <button class=\"btn\" style=\"width:100%;margin-top:8px\" onclick=\"testKey()\">${ic(\"ai\")}\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u0e27\u0e48\u0e32 key \u0e43\u0e0a\u0e49\u0e44\u0e14\u0e49\u0e44\u0e2b\u0e21</button>",
"    <p class=\"note\" id=\"pfTest\" style=\"margin-top:8px\"></p>`;",
"  openSheet();",
"}",
"function saveProfile(){",
"  const name = $(\"pfName\").value.trim(), key = $(\"pfKey\").value.trim();",
"  if (!name) return toastErr(\"\u0e43\u0e2a\u0e48\u0e0a\u0e37\u0e48\u0e2d\u0e01\u0e48\u0e2d\u0e19\u0e19\u0e30\");",
"  if (key && !/^sk-ant-/.test(key)) return toastErr(\"key \u0e15\u0e49\u0e2d\u0e07\u0e02\u0e36\u0e49\u0e19\u0e15\u0e49\u0e19\u0e14\u0e49\u0e27\u0e22 sk-ant-\");",
"  send(\"saveProfile\", {name, claudeKey: key || null}); closeSheet(); toast(\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e25\u0e49\u0e27\");",
"}",
"function testKey(){ const key = $(\"pfKey\").value.trim(); $(\"pfTest\").textContent = \"\u0e01\u0e33\u0e25\u0e31\u0e07\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u2026\"; send(\"testKey\", {claudeKey: key || null}); }",
"window.onKeyTest = r => { const el = $(\"pfTest\"); if (el) el.textContent = r.ok ? \"\u2713 key \u0e43\u0e0a\u0e49\u0e44\u0e14\u0e49 \u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e2d\u0e48\u0e32\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\" : \"\u2717 \u0e43\u0e0a\u0e49\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49: \" + r.error; };",
"function saveAct(){",
"  const {d, mode, c} = ACT, who = (ACT.who||\"\").trim();",
"  if (!c) return toastErr(\"\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e27\u0e23\u0e01\u0e48\u0e2d\u0e19\u0e19\u0e30\");",
"  if (!who) return toastErr(\"\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2b\u0e23\u0e37\u0e2d\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e0a\u0e37\u0e48\u0e2d\u0e01\u0e48\u0e2d\u0e19\u0e19\u0e30\");",
"  const t = {id:Date.now().toString(36), date:dk(new Date(viewY, viewM, d)), c, type:mode, who, price:+ACT.price||0, paid:false};",
"  trades().push(t); applyTrade(t); send(\"saveTrades\", trades());",
"  ACT = null; renderAll(); openDay(d); toast(mode===\"buy\" ? \"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e0b\u0e37\u0e49\u0e2d\u0e41\u0e25\u0e49\u0e27\" : \"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e02\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27\");",
"}",
"function delTrade(id){",
"  const i = trades().findIndex(t=>t.id===id); if (i<0) return; const t = trades()[i];",
"  trades().splice(i,1); applyTrade(t, true); send(\"saveTrades\", trades());",
"  renderAll(); if (selDay) openDay(+t.date.slice(8)); toast(\"\u0e25\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27\");",
"}",
"function togPaid(id){ const t = trades().find(x=>x.id===id); if (!t) return; t.paid = !t.paid; send(\"saveTrades\", trades()); renderAll(); if (selDay) openDay(selDay); }",
"function addQuick(q){ const t = $(\"noteText\"); t.value = (t.value.trim() ? t.value.trim() + \" \u00b7 \" : \"\") + q + \" \"; t.focus(); }",
"function togEdit(c, el){ editSet = editSet.includes(c) ? editSet.replace(c,\"\") : editSet + c; el.classList.toggle(\"on\"); }",
"function saveDay(d){",
"  const k = key(viewY,viewM);",
"  if (!DATA.months[k]) DATA.months[k] = {people:{}, totals:{}};",
"  const me = DATA.months[k].people[DATA.me] = DATA.months[k].people[DATA.me] || {};",
"  const v = sortS(editSet).join(\"\"); if (v) me[d] = v; else delete me[d];",
"  send(\"saveMonth\", {key:k, month:DATA.months[k]});",
"  const date = dk(new Date(viewY, viewM, d)), text = ($(\"noteText\") ? $(\"noteText\").value : \"\").trim();",
"  DATA.notes = DATA.notes || {};",
"  if (text !== ((DATA.notes[date]||\"\").trim())){ if (text) DATA.notes[date] = text; else delete DATA.notes[date]; send(\"saveNote\", {date, text}); }",
"  closeSheet(); renderAll(); toast(\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e25\u0e49\u0e27\");",
"}",
"function openSheet(){",
"  const sh = $(\"sheet\");",
"  sh.style.transform = \"\"; sh.scrollTop = 0; $(\"mask\").classList.add(\"on\"); sh.classList.add(\"on\");",
"}",
"/* \u0e25\u0e32\u0e01\u0e41\u0e1c\u0e48\u0e19\u0e25\u0e48\u0e32\u0e07\u0e25\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1b\u0e34\u0e14 */",
"(() => {",
"  const sh = $(\"sheet\"); let y0 = null, dy = 0;",
"  sh.addEventListener(\"touchstart\", e => { if (sh.scrollTop > 0 || e.target.closest(\"textarea,input,select\")) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, {passive:true});",
"  sh.addEventListener(\"touchmove\", e => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0){ sh.style.transition = \"none\"; sh.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); } }, {passive:false});",
"  sh.addEventListener(\"touchend\", () => { if (y0 == null) return; sh.style.transition = \"\"; if (dy > 90) closeSheet(); else sh.style.transform = \"\"; y0 = null; dy = 0; });",
"})();",
"function closeSheet(){ $(\"mask\").classList.remove(\"on\"); $(\"sheet\").classList.remove(\"on\"); $(\"sheet\").style.transform = \"\"; selDay=null; renderCal(); }",
"",
"/* ===== \u0e2a\u0e23\u0e38\u0e1b ===== */",
"function renderSum(){",
"  const md = monthData(), me = mine(), days = daysIn(), f = firstDow();",
"  $(\"sumTitle\").textContent = `${MONTHS[viewM]} ${viewY+543}`;",
"  if (!md){ $(\"sumStats\").innerHTML=\"\"; $(\"sumBar\").innerHTML=\"\"; $(\"sumLegend\").innerHTML=\"\"; $(\"sumList\").innerHTML=`<p class=\"note\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49</p>`; return; }",
"  const k = countMonth(me, days), dbl = Object.values(me).filter(s=>sortS(s).length>1).length;",
"  $(\"sumStats\").innerHTML = `",
"    <div class=\"stat\" style=\"background:var(--tint);color:var(--title)\"><p class=\"k\">${ic(\"work\")}\u0e40\u0e27\u0e23\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14</p><p class=\"v\">${k.total}</p></div>",
"    <div class=\"stat o\"><p class=\"k\">${ic(\"off\")}\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14</p><p class=\"v\">${k.off}</p></div>",
"    <div class=\"stat m\"><p class=\"k\">${ic(\"timer\")}\u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07\u0e07\u0e32\u0e19</p><p class=\"v\">${k.total*8}</p></div>",
"    <div class=\"stat n\"><p class=\"k\">${ic(\"double\")}\u0e27\u0e31\u0e19\u0e04\u0e27\u0e1a 2 \u0e40\u0e27\u0e23</p><p class=\"v\">${dbl}</p></div>`;",
"  const pct = c => k.total ? k.c[c]/k.total*100 : 0;",
"  $(\"sumBar\").innerHTML = [\"\u0e0a\",\"\u0e1a\",\"\u0e14\"].map(c=>`<div class=\"${SH[c].c}\" style=\"width:${pct(c)}%;background:var(--${SH[c].c}Fg)\"></div>`).join(\"\");",
"  $(\"sumLegend\").innerHTML = [\"\u0e0a\",\"\u0e1a\",\"\u0e14\"].map(c=>`<span class=\"chip ${SH[c].c}\">${ic(SH[c].i)}${SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")} ${k.c[c]} \u00b7 ${Math.round(pct(c))}%</span>`).join(\"\");",
"  let run=0, best=0, weOff=0;",
"  for (let d=1; d<=days; d++){ const off = !sortS(me[d]).length; run = off ? run+1 : 0; best = Math.max(best, run); const w=(f+d-1)%7; if (off && (w===0||w===6)) weOff++; }",
"  const vd = (md.vdays||{})[DATA.me] || 0, tot = md.totals ? md.totals[DATA.me] : null, work = md.work ? md.work[DATA.me] : null, over = work != null ? k.total - work : null;",
"  const rest = restIssues().filter(w => w.d.getFullYear()===viewY && w.d.getMonth()===viewM);",
"  $(\"sumList\").innerHTML = `<p class=\"h3\" style=\"margin-bottom:4px\">\u0e40\u0e01\u0e23\u0e47\u0e14\u0e19\u0e48\u0e32\u0e23\u0e39\u0e49</p>",
"    <div class=\"li\"><span>${ic(\"beach\")}\u0e2b\u0e22\u0e38\u0e14\u0e15\u0e34\u0e14\u0e01\u0e31\u0e19\u0e19\u0e32\u0e19\u0e2a\u0e38\u0e14</span><b>${best} \u0e27\u0e31\u0e19</b></div>",
"    <div class=\"li\"><span>${ic(\"party\")}\u0e40\u0e2a\u0e32\u0e23\u0e4c-\u0e2d\u0e32\u0e17\u0e34\u0e15\u0e22\u0e4c\u0e17\u0e35\u0e48\u0e44\u0e14\u0e49\u0e2b\u0e22\u0e38\u0e14</span><b>${weOff} \u0e27\u0e31\u0e19</b></div>",
"    <div class=\"li\"><span>${ic(\"moon\")}\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01\u0e17\u0e31\u0e49\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19</span><b>${k.c[\"\u0e14\"]} \u0e04\u0e37\u0e19</b></div>",
"    ${tot!=null?`<div class=\"li\"><span>${ic(\"list\")}\u0e0a\u0e48\u0e2d\u0e07 \"\u0e17\u0e33\u0e07\u0e32\u0e19\u0e08\u0e23\u0e34\u0e07\" \u0e43\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07${vd?` (\u0e23\u0e27\u0e21 v ${vd} \u0e27\u0e31\u0e19)`:\"\"}</span><b>${tot} ${tot===k.total+vd?\"\u0e15\u0e23\u0e07\":\"\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\"}</b></div>`:\"\"}",
"    ${work!=null?`<div class=\"li\"><span>${ic(\"work\")}\u0e27\u0e31\u0e19\u0e17\u0e33\u0e07\u0e32\u0e19\u0e15\u0e32\u0e21\u0e15\u0e32\u0e23\u0e32\u0e07</span><b>${work} \u0e27\u0e31\u0e19</b></div>",
"    <div class=\"li\"><span>${ic(\"timer\")}\u0e40\u0e27\u0e23\u0e40\u0e01\u0e34\u0e19 (OT)</span><b>${over>0?`${over} \u0e40\u0e27\u0e23 \u00b7 ${over*8} \u0e0a\u0e21.`:\"\u0e44\u0e21\u0e48\u0e21\u0e35\"}</b></div>`:\"\"}",
"    ${tradeSummary()}",
"    ${rest.length?`<p class=\"h3\" style=\"margin:14px 0 4px\">\u0e04\u0e27\u0e23\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19</p>${rest.map(w=>`<div class=\"li\"><span>${ic(\"warn\")}${esc(w.t)}</span></div>`).join(\"\")}`:\"\"}`;",
"}",
"",
"function tradeSummary(){",
"  const k = key(viewY, viewM), L = trades().filter(t=>t.date.startsWith(k)).sort((a,b)=>a.date<b.date?-1:1);",
"  if (!L.length) return \"\";",
"  const sum = f => L.filter(f).reduce((a,t)=>a+(+t.price||0),0);",
"  const inc = sum(t=>t.type===\"buy\"), out = sum(t=>t.type===\"sell\"), dueIn = sum(t=>t.type===\"buy\"&&!t.paid), dueOut = sum(t=>t.type===\"sell\"&&!t.paid);",
"  return `<p class=\"h3\" style=\"margin:14px 0 4px\">\u0e0b\u0e37\u0e49\u0e2d-\u0e02\u0e32\u0e22\u0e40\u0e27\u0e23</p>",
"    <div class=\"li\"><span>${ic(\"work\")}\u0e0b\u0e37\u0e49\u0e2d\u0e40\u0e27\u0e23 (\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19) ${L.filter(t=>t.type===\"buy\").length} \u0e40\u0e27\u0e23</span><b>+${baht(inc)}</b></div>",
"    <div class=\"li\"><span>${ic(\"off\")}\u0e02\u0e32\u0e22\u0e40\u0e27\u0e23 (\u0e21\u0e35\u0e04\u0e19\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19) ${L.filter(t=>t.type===\"sell\").length} \u0e40\u0e27\u0e23</span><b>\u2212${baht(out)}</b></div>",
"    <div class=\"li\"><span>${ic(\"check\")}\u0e2a\u0e38\u0e17\u0e18\u0e34</span><b>${inc-out>=0?\"+\":\"\u2212\"}${baht(Math.abs(inc-out))}</b></div>",
"    ${dueIn?`<div class=\"li\"><span>${ic(\"timer\")}\u0e04\u0e49\u0e32\u0e07\u0e23\u0e31\u0e1a</span><b>${baht(dueIn)}</b></div>`:\"\"}",
"    ${dueOut?`<div class=\"li\"><span>${ic(\"timer\")}\u0e04\u0e49\u0e32\u0e07\u0e08\u0e48\u0e32\u0e22</span><b>${baht(dueOut)}</b></div>`:\"\"}",
"    ${L.map(t=>`<div class=\"li\"><span>${+t.date.slice(8)} ${MSH[viewM]} ${t.type===\"buy\"?\"\u0e0b\u0e37\u0e49\u0e2d\":\"\u0e02\u0e32\u0e22\"}${SH[t.c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")} \u00b7 ${esc(t.who||\"-\")}</span><button class=\"tpaid ${t.paid?\"on\":\"\"}\" onclick=\"togPaid('${t.id}')\">${t.paid?\"\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\":(t.type===\"buy\"?\"\u0e04\u0e49\u0e32\u0e07\u0e23\u0e31\u0e1a\":\"\u0e04\u0e49\u0e32\u0e07\u0e08\u0e48\u0e32\u0e22\")} ${baht(t.price)}</button></div>`).join(\"\")}`;",
"}",
"",
"/* ===== \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 ===== */",
"function renderFr(){",
"  const md = monthData(), days = daysIn(), f = firstDow();",
"  $(\"frTitle\").textContent = `${MONTHS[viewM]} ${viewY+543}`;",
"  $(\"frPreview\").innerHTML = DATA.preview ? `<p class=\"note\">* \u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e43\u0e19\u0e20\u0e32\u0e1e\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07</p>` : \"\";",
"  if (!md || Object.keys(md.people).length<2){ $(\"strip\").innerHTML=\"\"; $(\"whoList\").innerHTML=`<div class=\"card\"><p class=\"note\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e27\u0e23\u0e02\u0e2d\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49<br>\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e43\u0e2b\u0e49 AI \u0e2d\u0e48\u0e32\u0e19\u0e17\u0e38\u0e01\u0e41\u0e16\u0e27</p></div>`; $(\"togetherCard\").style.display=\"none\"; return; }",
"  $(\"togetherCard\").style.display = \"\";",
"  if (!frDay) frDay = isToday(now().getDate()) ? now().getDate() : 1;",
"  let h = \"\";",
"  for (let d=1; d<=days; d++) h += `<div class=\"sd ${d===frDay?\"on\":\"\"}\" id=\"sd${d}\" onclick=\"frDay=${d};renderFr()\"><span>${DOWS[(f+d-1)%7]}</span><b>${d}</b></div>`;",
"  $(\"strip\").innerHTML = h;",
"  setTimeout(()=>{ const el=$(\"sd\"+frDay); if (el && el.scrollIntoView) el.scrollIntoView({inline:\"center\",block:\"nearest\"}); },0);",
"  const g = {\"\u0e0a\":[],\"\u0e1a\":[],\"\u0e14\":[],off:[]};",
"  for (const [n,v] of Object.entries(md.people)){ const s = sortS(v[frDay]); if (!s.length) g.off.push(n); for (const c of s) g[c].push(n); }",
"  const tag = n => `<span class=\"name ${n===DATA.me?\"me\":\"\"}\">${n===DATA.me?\"\u0e09\u0e31\u0e19\":first(n)}</span>`;",
"  $(\"whoList\").innerHTML = [\"\u0e0a\",\"\u0e1a\",\"\u0e14\"].map(c=>`<div class=\"who ${SH[c].c}\"><p class=\"h\">${ic(SH[c].i)}${SH[c].n} \u00b7 ${g[c].length} \u0e04\u0e19</p>${g[c].map(tag).join(\"\")||\"-\"}</div>`).join(\"\")",
"    + `<div class=\"who o\"><p class=\"h\">${ic(\"off\")}\u0e2b\u0e22\u0e38\u0e14 \u00b7 ${g.off.length} \u0e04\u0e19</p>${g.off.map(tag).join(\"\")||\"-\"}</div>`;",
"  const friends = Object.keys(md.people).filter(n=>n!==DATA.me);",
"  if (!frFriend || !friends.includes(frFriend)) frFriend = friends[0];",
"  $(\"fchips\").innerHTML = friends.map((n,i)=>`<button class=\"fchip ${n===frFriend?\"on\":\"\"}\" onclick=\"pickFriend(${i})\">${first(n)}</button>`).join(\"\");",
"  const me = mine(), fr = md.people[frFriend], both = [];",
"  for (let d=1; d<=days; d++) if (!sortS(me[d]).length && !sortS(fr[d]).length) both.push(d);",
"  $(\"together\").innerHTML = both.length ? both.map(d=>`<span class=\"o\">${d} ${MSH[viewM]}</span>`).join(\"\") : `<p class=\"note\" style=\"width:100%\">\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e21\u0e35\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19</p>`;",
"}",
"function pickFriend(i){ const md = monthData(); frFriend = Object.keys(md.people).filter(n=>n!==DATA.me)[i]; renderFr(); }",
"",
"/* ===== \u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32 ===== */",
"function renderSet(){",
"  $(\"setName\").textContent = DATA.me;",
"  $(\"verNote\").textContent = DATA.version ? \"\u0e40\u0e27\u0e2d\u0e23\u0e4c\u0e0a\u0e31\u0e19 \" + DATA.version : \"\";",
"  $(\"setKeyC\").textContent = DATA.hasKey.claude ? \"\u0e15\u0e31\u0e49\u0e07\u0e41\u0e25\u0e49\u0e27\" : \"\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e15\u0e31\u0e49\u0e07\";",
"  $(\"setNotify\").value = String(DATA.settings.notify);",
"  $(\"setCal\").classList.toggle(\"on\", !!DATA.settings.calendar);",
"  $(\"setEve\").classList.toggle(\"on\", DATA.settings.eve !== false);",
"  $(\"setAI\").value = \"claude\";",
"}",
"function saveSettings(){",
"  DATA.settings.notify = +$(\"setNotify\").value;",
"  DATA.settings.calendar = $(\"setCal\").classList.contains(\"on\");",
"  DATA.settings.eve = $(\"setEve\").classList.contains(\"on\");",
"  DATA.settings.ai = $(\"setAI\").value;",
"  send(\"saveSettings\", DATA.settings); toast(\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e41\u0e25\u0e49\u0e27\");",
"}",
"",
"/* ===== \u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b ===== */",
"function pickPhoto(){ $(\"file\").click(); }",
"function gotPhoto(inp){",
"  const f = inp.files && inp.files[0]; if (!f) return;",
"  onReading();",
"  const img = new Image(), url = URL.createObjectURL(f);",
"  img.onload = () => {",
"    const sc = Math.min(1, 2400/Math.max(img.naturalWidth, img.naturalHeight));",
"    const cv = document.createElement(\"canvas\"); cv.width = Math.round(img.naturalWidth*sc); cv.height = Math.round(img.naturalHeight*sc);",
"    const x = cv.getContext(\"2d\"); x.fillStyle = \"#fff\"; x.fillRect(0,0,cv.width,cv.height); x.drawImage(img, 0, 0, cv.width, cv.height);",
"    inp.value = \"\";",
"    let ok = false;",
"    try { GRID.img = img; GRID.g = gridDetect(img); ok = GRID.g.ok; } catch(e){}",
"    if (ok) sendPhoto(cv); else askCorners(img, cv);   // \u0e2b\u0e32\u0e40\u0e2a\u0e49\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d (\u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22\u0e40\u0e2d\u0e35\u0e22\u0e07) \u2192 \u0e43\u0e2b\u0e49\u0e41\u0e15\u0e30\u0e21\u0e38\u0e21\u0e15\u0e32\u0e23\u0e32\u0e07",
"  };",
"  img.onerror = () => { inp.value = \"\"; onParsed({error:\"\u0e40\u0e1b\u0e34\u0e14\u0e23\u0e39\u0e1b\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49 \u0e25\u0e2d\u0e07\u0e41\u0e04\u0e1b\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d\u0e15\u0e32\u0e23\u0e32\u0e07\u0e41\u0e25\u0e49\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e39\u0e1b\u0e17\u0e35\u0e48\u0e41\u0e04\u0e1b\u0e41\u0e17\u0e19\"}); };",
"  img.src = url;",
"}",
"function sendPhoto(cv){",
"  onReading();",
"  const grid = GRID.g && GRID.g.ok ? { bands: GRID.g.bands.length, cols: GRID.g.xs.length - 1 } : null;",
"  send(\"readPhoto\", { b64: cv.toDataURL(\"image/jpeg\", .9).split(\",\")[1], grid });",
"}",
"/* \u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22\u0e40\u0e2d\u0e35\u0e22\u0e07: \u0e41\u0e15\u0e30\u0e21\u0e38\u0e21\u0e15\u0e32\u0e23\u0e32\u0e07 4 \u0e21\u0e38\u0e21 \u0e41\u0e25\u0e49\u0e27\u0e41\u0e2d\u0e1b\u0e14\u0e36\u0e07\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e01\u0e48\u0e2d\u0e19\u0e2d\u0e48\u0e32\u0e19 */",
"let CORN = null;",
"function askCorners(img, cv){",
"  CORN = {img, cv, pts: []};",
"  const prev = cv.toDataURL(\"image/jpeg\", .8);",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><h2 class=\"big\" style=\"font-size:21px\">\u0e0a\u0e48\u0e27\u0e22\u0e41\u0e15\u0e30\u0e21\u0e38\u0e21\u0e15\u0e32\u0e23\u0e32\u0e07\u0e2b\u0e19\u0e48\u0e2d\u0e22</h2>",
"    <p class=\"hello\" id=\"cornHint\" style=\"margin:4px 0 10px\">\u0e23\u0e39\u0e1b\u0e19\u0e35\u0e49\u0e40\u0e2d\u0e35\u0e22\u0e07 \u0e41\u0e15\u0e30\u0e21\u0e38\u0e21\u0e01\u0e23\u0e2d\u0e1a\u0e15\u0e32\u0e23\u0e32\u0e07 (\u0e40\u0e2a\u0e49\u0e19\u0e19\u0e2d\u0e01\u0e2a\u0e38\u0e14) \u0e15\u0e32\u0e21\u0e25\u0e33\u0e14\u0e31\u0e1a: <b>\u0e0b\u0e49\u0e32\u0e22\u0e1a\u0e19</b> \u2192 \u0e02\u0e27\u0e32\u0e1a\u0e19 \u2192 \u0e02\u0e27\u0e32\u0e25\u0e48\u0e32\u0e07 \u2192 \u0e0b\u0e49\u0e32\u0e22\u0e25\u0e48\u0e32\u0e07</p>",
"    <div id=\"cornBox\" style=\"position:relative;touch-action:manipulation\"><img id=\"cornImg\" src=\"${prev}\" style=\"width:100%;border-radius:12px;display:block\" onclick=\"tapCorner(event)\"><svg id=\"cornSvg\" style=\"position:absolute;inset:0;width:100%;height:100%;pointer-events:none\"></svg></div>",
"    <div style=\"display:flex;gap:8px;margin-top:12px\"><button class=\"btn\" style=\"flex:1\" onclick=\"CORN.pts=[];drawCorners()\">\u0e40\u0e23\u0e34\u0e48\u0e21\u0e41\u0e15\u0e30\u0e43\u0e2b\u0e21\u0e48</button>",
"    <button class=\"btn main\" style=\"flex:1\" id=\"cornGo\" disabled onclick=\"useCorners()\">${ic(\"check\")}\u0e43\u0e0a\u0e49\u0e21\u0e38\u0e21\u0e19\u0e35\u0e49</button></div>",
"    <button class=\"btn\" style=\"width:100%;margin-top:8px\" onclick=\"GRID.g={ok:false};sendPhoto(CORN.cv)\">\u0e02\u0e49\u0e32\u0e21 \u0e43\u0e2b\u0e49 AI \u0e2d\u0e48\u0e32\u0e19\u0e17\u0e31\u0e49\u0e07\u0e23\u0e39\u0e1b\u0e40\u0e25\u0e22 (\u0e41\u0e21\u0e48\u0e19\u0e19\u0e49\u0e2d\u0e22\u0e01\u0e27\u0e48\u0e32)</button>`;",
"  openSheet();",
"}",
"function tapCorner(e){",
"  if (CORN.pts.length >= 4) return;",
"  const r = e.target.getBoundingClientRect(), w = CORN.img.naturalWidth || CORN.img.width;",
"  const k = w / r.width; CORN.pts.push([(e.clientX - r.left) * k, (e.clientY - r.top) * k]); drawCorners();",
"}",
"function drawCorners(){",
"  const names = [\"\u0e0b\u0e49\u0e32\u0e22\u0e1a\u0e19\",\"\u0e02\u0e27\u0e32\u0e1a\u0e19\",\"\u0e02\u0e27\u0e32\u0e25\u0e48\u0e32\u0e07\",\"\u0e0b\u0e49\u0e32\u0e22\u0e25\u0e48\u0e32\u0e07\"], im = $(\"cornImg\"), w = CORN.img.naturalWidth || CORN.img.width, h = CORN.img.naturalHeight || CORN.img.height;",
"  $(\"cornSvg\").setAttribute(\"viewBox\", `0 0 ${w} ${h}`);",
"  const P = CORN.pts, R = w/90;",
"  $(\"cornSvg\").innerHTML = (P.length > 1 ? `<polygon points=\"${P.map(p=>p.join(\",\")).join(\" \")}\" fill=\"rgba(232,90,140,.15)\" stroke=\"#E85A8C\" stroke-width=\"${R/2.5}\"/>` : \"\") + P.map((p,i)=>`<circle cx=\"${p[0]}\" cy=\"${p[1]}\" r=\"${R}\" fill=\"#E85A8C\" stroke=\"#fff\" stroke-width=\"${R/3}\"/>`).join(\"\");",
"  $(\"cornHint\").innerHTML = P.length < 4 ? `\u0e41\u0e15\u0e30\u0e21\u0e38\u0e21 <b>${names[P.length]}</b> \u0e02\u0e2d\u0e07\u0e01\u0e23\u0e2d\u0e1a\u0e15\u0e32\u0e23\u0e32\u0e07 (${P.length}/4)` : \"\u0e04\u0e23\u0e1a 4 \u0e21\u0e38\u0e21\u0e41\u0e25\u0e49\u0e27 \u0e01\u0e14 \\\"\u0e43\u0e0a\u0e49\u0e21\u0e38\u0e21\u0e19\u0e35\u0e49\\\" \u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\";",
"  $(\"cornGo\").disabled = P.length < 4;",
"}",
"function useCorners(){",
"  const w = warpQuad(CORN.img, CORN.pts); let ok = false;",
"  try { GRID.img = w; GRID.g = gridDetect(w); ok = GRID.g.ok; } catch(e){}",
"  if (!ok) toastErr(\"\u0e22\u0e31\u0e07\u0e2b\u0e32\u0e40\u0e2a\u0e49\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d \u0e08\u0e30\u0e43\u0e2b\u0e49 AI \u0e2d\u0e48\u0e32\u0e19\u0e17\u0e31\u0e49\u0e07\u0e23\u0e39\u0e1b\u0e41\u0e17\u0e19\");",
"  sendPhoto(w);",
"}",
"window.onProgress = function(t){ const el = $(\"progTxt\"); if (el) el.textContent = t; };",
"window.onReading = function(){",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><div class=\"loading\"><i class=\"${icls(\"flower\")} spin\"></i><p class=\"h3\">\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2d\u0e48\u0e32\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e27\u0e23\u2026</p><p style=\"font-size:14px\" id=\"progTxt\">\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 30\u201360 \u0e27\u0e34\u0e19\u0e32\u0e17\u0e35</p></div>`;",
"  openSheet();",
"};",
"let PARSED = null;",
"window.onParsed = function(r){",
"  const close = `<button class=\"btn\" style=\"width:100%\" onclick=\"closeSheet()\">\u0e1b\u0e34\u0e14</button>`;",
"  if (r.error){ $(\"sheet\").innerHTML = `<div class=\"grab\"></div><p class=\"big\" style=\"font-size:22px\">\u0e2d\u0e48\u0e32\u0e19\u0e23\u0e39\u0e1b\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08</p><div class=\"msg o\">${ic(\"warn\")}<span>${r.error}</span></div>${close}`; openSheet(); return; }",
"  PARSED = r;",
"  const me = r.people[DATA.me];",
"  if (!me){ $(\"sheet\").innerHTML = `<div class=\"grab\"></div><p class=\"big\" style=\"font-size:22px\">\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d\u0e0a\u0e37\u0e48\u0e2d \"${DATA.me}\"</p><div class=\"msg o\">${ic(\"warn\")}<span>\u0e0a\u0e37\u0e48\u0e2d\u0e17\u0e35\u0e48\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e14\u0e49: ${Object.keys(r.people).join(\", \")}<br>\u0e41\u0e01\u0e49\u0e0a\u0e37\u0e48\u0e2d\u0e43\u0e19\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e15\u0e32\u0e23\u0e32\u0e07 \u0e41\u0e25\u0e49\u0e27\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e43\u0e2b\u0e21\u0e48</span></div>${close}`; openSheet(); return; }",
"  const cnt = Object.values(me).map(sortS).flat().length + ((r.vdays||{})[DATA.me]||0), tot = r.totals ? r.totals[DATA.me] : null;",
"  const chk = tot==null ? \"\" : tot===cnt ? `<div class=\"msg m\">${ic(\"check\")}<span>${cnt} \u0e40\u0e27\u0e23 \u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e0a\u0e48\u0e2d\u0e07 \"\u0e17\u0e33\u0e07\u0e32\u0e19\u0e08\u0e23\u0e34\u0e07\"</span></div>` : `<div class=\"msg o\">${ic(\"warn\")}<span>\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e14\u0e49 ${cnt} \u0e40\u0e27\u0e23 \u0e41\u0e15\u0e48\u0e0a\u0e48\u0e2d\u0e07 \"\u0e17\u0e33\u0e07\u0e32\u0e19\u0e08\u0e23\u0e34\u0e07\" = ${tot} \u0e25\u0e2d\u0e07\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e01\u0e31\u0e1a\u0e15\u0e32\u0e23\u0e32\u0e07\u0e2d\u0e35\u0e01\u0e17\u0e35 \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30\u0e41\u0e01\u0e49\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19\u0e44\u0e14\u0e49</span></div>`;",
"  const unc = r.uncertain || [], dim = new Date(r.year, r.month, 0).getDate();",
"  const list = Array.from({length: dim}, (_, i) => i + 1).filter(d => me[d] || unc.includes(d)).map(d=>`<span style=\"display:inline-flex;gap:3px;align-items:center;margin:0 10px 8px 0;font-weight:600;${unc.includes(d)?\"background:#FFE2CF;border-radius:8px;padding:0 5px;outline:2px solid #E0612F\":\"\"}\">${d} ${me[d] ? sortS(me[d]).map(pill).join(\"\") : \"\u0e2b\u0e22\u0e38\u0e14\"}</span>`).join(\"\");",
"  const uncMsg = unc.length ? `<div class=\"msg o\">${ic(\"warn\")}<span>AI \u0e44\u0e21\u0e48\u0e41\u0e19\u0e48\u0e43\u0e08\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 ${unc.join(\", \")} (\u0e01\u0e23\u0e2d\u0e1a\u0e2a\u0e49\u0e21) \u0e40\u0e17\u0e35\u0e22\u0e1a\u0e01\u0e31\u0e1a\u0e15\u0e32\u0e23\u0e32\u0e07\u0e08\u0e23\u0e34\u0e07\u0e01\u0e48\u0e2d\u0e19\u0e19\u0e30 \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30\u0e41\u0e01\u0e49\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19\u0e44\u0e14\u0e49</span></div>` : \"\";",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><p class=\"big\" style=\"font-size:22px\">${MONTHS[r.month-1]} ${r.year+543}</p>",
"    <p class=\"hello\" style=\"font-size:14px\">\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e14\u0e49 ${Object.keys(r.people).length} \u0e04\u0e19\u0e43\u0e19\u0e27\u0e2d\u0e23\u0e4c\u0e14 \u00b7 \u0e40\u0e27\u0e23\u0e02\u0e2d\u0e07${first(DATA.me)}</p>${chk}${uncMsg}",
"    <div style=\"margin:10px 0\">${list}</div>",
"    <div class=\"grid2\"><button class=\"btn\" onclick=\"closeSheet()\">\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01</button><button class=\"btn main\" onclick=\"confirmParsed()\">${ic(\"check\")}\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button></div>`;",
"  openSheet();",
"};",
"/* ===== \u0e27\u0e32\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e40\u0e27\u0e23: \"\u0e40\u0e27\u0e23 2569-11 | 1\u0e14\u0e0a 2\u0e1a 6\u0e0a ...\" ===== */",
"function openPaste(){",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><p class=\"big\" style=\"font-size:22px\">\u0e27\u0e32\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e40\u0e27\u0e23</p>",
"    <p class=\"hello\" style=\"font-size:14px;margin:4px 0 10px\">\u0e01\u0e4a\u0e2d\u0e1b\u0e23\u0e2b\u0e31\u0e2a\u0e17\u0e35\u0e48\u0e44\u0e14\u0e49\u0e21\u0e32\u0e27\u0e32\u0e07\u0e15\u0e23\u0e07\u0e19\u0e35\u0e49 \u0e40\u0e0a\u0e48\u0e19 <b>\u0e40\u0e27\u0e23 2569-11 | 1\u0e14\u0e0a 2\u0e1a 6\u0e0a</b></p>",
"    <textarea class=\"notebox\" id=\"pasteText\" placeholder=\"\u0e40\u0e27\u0e23 2569-11 | 1\u0e14\u0e0a 2\u0e1a ...\"></textarea>",
"    <div id=\"pasteOut\"></div>",
"    <button class=\"btn main\" style=\"width:100%;margin-top:10px\" onclick=\"checkPaste()\">${ic(\"check\")}\u0e15\u0e23\u0e27\u0e08\u0e23\u0e2b\u0e31\u0e2a</button>`;",
"  openSheet();",
"}",
"function parseCode(t){",
"  const m = t.match(/(\\d{4})\\s*[-/.]\\s*(\\d{1,2})/); if (!m) return null;",
"  let y = +m[1]; if (y > 2400) y -= 543; const mo = +m[2]; if (!(mo>=1 && mo<=12)) return null;",
"  const body = t.slice(t.indexOf(m[0]) + m[0].length), days = {};",
"  for (const x of body.matchAll(/(\\d{1,2})\\s*[:=]?\\s*([\u0e0a\u0e1a\u0e14]+)/g)){ const d = +x[1], s = sortS(x[2]).join(\"\"); if (d>=1 && d<=31 && s) days[d] = s; }",
"  return {year:y, month:mo, days};",
"}",
"function checkPaste(){",
"  const r = parseCode($(\"pasteText\").value);",
"  if (!r || !Object.keys(r.days).length){ $(\"pasteOut\").innerHTML = `<div class=\"msg o\">${ic(\"warn\")}<span>\u0e2d\u0e48\u0e32\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e21\u0e48\u0e2d\u0e2d\u0e01 \u0e15\u0e49\u0e2d\u0e07\u0e21\u0e35 \u0e1b\u0e35-\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e41\u0e25\u0e30 \u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e15\u0e32\u0e21\u0e14\u0e49\u0e27\u0e22 \u0e0a/\u0e1a/\u0e14</span></div>`; return; }",
"  const cnt = Object.values(r.days).join(\"\").length;",
"  const list = Object.keys(r.days).map(Number).sort((a,b)=>a-b).map(d=>`<span style=\"display:inline-flex;gap:3px;align-items:center;margin:0 12px 8px 0;font-weight:600\">${d} ${sortS(r.days[d]).map(pill).join(\"\")}</span>`).join(\"\");",
"  window.__paste = r;",
"  $(\"pasteOut\").innerHTML = `<p class=\"h3\" style=\"margin:12px 0 6px\">${MONTHS[r.month-1]} ${r.year+543} \u00b7 ${cnt} \u0e40\u0e27\u0e23</p><div>${list}</div>",
"    <button class=\"btn main\" style=\"width:100%;margin-top:6px\" onclick=\"savePaste()\">${ic(\"check\")}\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e17\u0e19\u0e40\u0e27\u0e23\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49</button>`;",
"}",
"function savePaste(){",
"  const r = window.__paste, k = `${r.year}-${String(r.month).padStart(2,\"0\")}`;",
"  if (!DATA.months[k]) DATA.months[k] = {people:{}, totals:{}};",
"  DATA.months[k].people[DATA.me] = r.days;",
"  send(\"saveMonth\", {key:k, month:DATA.months[k]});",
"  viewY = r.year; viewM = r.month-1; closeSheet(); renderAll(); toast(\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e40\u0e27\u0e23\u0e41\u0e25\u0e49\u0e27\");",
"}",
"function confirmParsed(){",
"  const r = PARSED, k = `${r.year}-${String(r.month).padStart(2,\"0\")}`;",
"  const prev = DATA.months[k] ? JSON.parse(JSON.stringify(DATA.months[k])) : null;",
"  DATA.months[k] = {people:r.people, totals:r.totals||{}, work:r.work||{}, vdays:r.vdays||{}};",
"  send(\"saveMonth\", {key:k, month:DATA.months[k]});",
"  trades().filter(t=>t.date.startsWith(k)).forEach(t=>applyTrade(t));   // \u0e15\u0e32\u0e23\u0e32\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e23\u0e27\u0e21\u0e0b\u0e37\u0e49\u0e2d-\u0e02\u0e32\u0e22 \u2192 \u0e43\u0e2a\u0e48\u0e0b\u0e49\u0e33 (\u0e0b\u0e49\u0e33\u0e44\u0e14\u0e49 \u0e44\u0e21\u0e48\u0e40\u0e1e\u0e35\u0e49\u0e22\u0e19)",
"  viewY = r.year; viewM = r.month-1; closeSheet(); renderAll();",
"  if (prev) toastUndo(\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e17\u0e31\u0e1a\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e14\u0e34\u0e21\u0e41\u0e25\u0e49\u0e27\", () => { DATA.months[k] = prev; send(\"restoreMonth\", {key:k, month:prev}); renderAll(); toast(\"\u0e04\u0e37\u0e19\u0e04\u0e48\u0e32\u0e40\u0e14\u0e34\u0e21\u0e41\u0e25\u0e49\u0e27\"); });",
"  else toast(\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e40\u0e27\u0e23\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e41\u0e25\u0e49\u0e27\");",
"}",
"function toastUndo(t, fn){ const el = $(\"toast\"); el.innerHTML = ic(\"check\") + t + '<button class=\"undo\">\u0e22\u0e49\u0e2d\u0e19\u0e01\u0e25\u0e31\u0e1a</button>'; el.querySelector(\".undo\").onclick = () => { clearTimeout(tt); fn(); }; el.classList.add(\"on\"); clearTimeout(tt); tt = setTimeout(()=>el.classList.remove(\"on\"), 7000); }",
"",
"/* ===== \u0e41\u0e0a\u0e23\u0e4c\u0e40\u0e1b\u0e47\u0e19\u0e23\u0e39\u0e1b ===== */",
"const mixHex = (a, b, t) => { const p = s => [1,3,5].map(i=>parseInt(s.substr(i,2),16)); const x = p(a), y = p(b); return \"#\" + x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,\"0\")).join(\"\"); };",
"const svgImg = k => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = \"data:image/svg+xml;charset=utf-8,\" + encodeURIComponent(CUTE[k].replace(\"<svg \", '<svg width=\"256\" height=\"256\" ')); });",
"async function shareMonth(){",
"  try { await Promise.all([\"400\",\"500\",\"600\",\"700\"].map(w=>document.fonts.load(`${w} 30px Mali`, \"\u0e01\u0e020123\"))); } catch(e){}",
"  const IM = {}; for (const k of [\"sun\",\"sunset\",\"moon\",\"off\",\"note\"]) IM[k] = await svgImg(k);",
"  const t = DATA.settings.theme || {}, p = PALETTES[t.palette] || PALETTES.sakura;",
"  const me = mine(), days = daysIn(), f = firstDow(), rows = Math.ceil((f+days)/7);",
"  const W = 1080, pad = 54, gap = 16, cell = (W - pad*2 - gap*6)/7, top = 330, H = top + rows*(cell+gap) - gap + 250;",
"  const cv = document.createElement(\"canvas\"); cv.width = W; cv.height = H; const x = cv.getContext(\"2d\");",
"  const font = (s,w=600) => `${w} ${s}px Mali, \"Sukhumvit Set\", sans-serif`;",
"  const tint = {\"\u0e0a\":\"#D9F4E3\",\"\u0e1a\":\"#DFEAFF\",\"\u0e14\":\"#ECE4FF\"}, ink = {\"\u0e0a\":\"#1F5A3B\",\"\u0e1a\":\"#24427E\",\"\u0e14\":\"#4A2F8C\"};",
"  // \u0e1e\u0e37\u0e49\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e44\u0e25\u0e48\u0e2a\u0e35 + \u0e2b\u0e22\u0e14\u0e2a\u0e35",
"  const g = x.createLinearGradient(0, 0, W*0.6, H); g.addColorStop(0, mixHex(p.body, \"#FFD6E6\", .35)); g.addColorStop(1, mixHex(p.blobs[1], \"#FFFFFF\", .72));",
"  x.fillStyle = g; x.fillRect(0, 0, W, H);",
"  const blob = (cx, cy, r, c, a) => { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, al(c, a)); rg.addColorStop(1, al(c, 0)); x.fillStyle = rg; x.fillRect(cx-r, cy-r, r*2, r*2); };",
"  blob(W*0.95, 40, 460, p.blobs[0], .55); blob(40, H-40, 460, p.blobs[1], .5); blob(W*0.5, H*0.45, 380, p.blobs[2] || p.blobs[0], .18);",
"  // \u0e2b\u0e31\u0e27",
"  const draw = (k, cx, cy, s) => { if (IM[k]) x.drawImage(IM[k], cx - s/2, cy - s/2, s, s); };",
"  x.textAlign = \"center\"; x.textBaseline = \"alphabetic\";",
"  draw(\"sun\", 150, 120, 110); draw(\"moon\", W-150, 128, 104);",
"  x.fillStyle = p.title; x.font = font(68,700); x.fillText(`\u0e40\u0e27\u0e23\u0e02\u0e2d\u0e07${first(DATA.me)}`, W/2, 135);",
"  x.fillStyle = p.sub; x.font = font(42,500); x.fillText(`${MONTHS[viewM]} ${viewY+543}`, W/2, 200);",
"  DOWS.forEach((d,i)=>{ x.fillStyle = (i===0||i===6)?p.accent:p.sub; x.font = font(32,700); x.fillText(d, pad + i*(cell+gap) + cell/2, top - 26); });",
"  // \u0e15\u0e32\u0e23\u0e32\u0e07",
"  for (let d=1; d<=days; d++){",
"    const i = f+d-1, cx = pad + (i%7)*(cell+gap), cy = top + Math.floor(i/7)*(cell+gap), s = sortS(me[d]);",
"    x.save(); x.shadowColor = al(p.accent,.14); x.shadowBlur = 18; x.shadowOffsetY = 6;",
"    x.fillStyle = s.length ? tint[s[0]] : \"rgba(255,255,255,.72)\"; rr(x, cx, cy, cell, cell, 30); x.fill(); x.restore();",
"    if (s.length > 1){ x.save(); rr(x, cx, cy, cell, cell, 30); x.clip(); x.fillStyle = tint[s[1]]; x.beginPath(); x.moveTo(cx+cell, cy); x.lineTo(cx+cell, cy+cell); x.lineTo(cx, cy+cell); x.closePath(); x.fill(); x.restore(); }",
"    x.textAlign = \"left\"; x.fillStyle = (i%7===0||i%7===6) ? p.accent : (s.length ? ink[s[0]] : p.text); x.font = font(30,700); x.fillText(d, cx+14, cy+40);",
"    if (!s.length) draw(\"off\", cx+cell/2, cy+cell*0.6, cell*0.42);",
"    else if (s.length === 1) draw(SH[s[0]].k, cx+cell/2, cy+cell*0.6, cell*0.56);",
"    else { draw(SH[s[0]].k, cx+cell*0.33, cy+cell*0.62, cell*0.44); draw(SH[s[1]].k, cx+cell*0.67, cy+cell*0.62, cell*0.44); }",
"    if (noteOf(new Date(viewY, viewM, d))) draw(\"note\", cx+cell-26, cy+26, 34);",
"  }",
"  // \u0e2a\u0e23\u0e38\u0e1b\u0e14\u0e49\u0e32\u0e19\u0e25\u0e48\u0e32\u0e07",
"  const k = countMonth(me, days), items = [[\"sun\", \"\u0e40\u0e0a\u0e49\u0e32\", k.c[\"\u0e0a\"], ink[\"\u0e0a\"]], [\"sunset\", \"\u0e1a\u0e48\u0e32\u0e22\", k.c[\"\u0e1a\"], ink[\"\u0e1a\"]], [\"moon\", \"\u0e14\u0e36\u0e01\", k.c[\"\u0e14\"], ink[\"\u0e14\"]], [\"off\", \"\u0e2b\u0e22\u0e38\u0e14\", k.off, p.accent]];",
"  const cw = 218, cg = 18, sx = (W - (cw*4 + cg*3))/2, sy = H - 200;",
"  items.forEach(([ic2, lb, n, col], j) => {",
"    const bx = sx + j*(cw+cg);",
"    x.save(); x.shadowColor = al(p.accent,.12); x.shadowBlur = 16; x.shadowOffsetY = 5; x.fillStyle = \"rgba(255,255,255,.82)\"; rr(x, bx, sy, cw, 96, 30); x.fill(); x.restore();",
"    draw(ic2, bx+52, sy+48, 62);",
"    x.textAlign = \"left\"; x.fillStyle = col; x.font = font(40,700); x.fillText(n, bx+96, sy+52);",
"    x.fillStyle = p.sub; x.font = font(24,500); x.fillText(lb, bx+96, sy+82);",
"  });",
"  x.textAlign = \"center\"; x.fillStyle = al(p.title,.55); x.font = font(24,500); x.fillText(`${k.total} \u0e40\u0e27\u0e23 \u00b7 ${k.total*8} \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07`, W/2, H - 50);",
"  send(\"share\", cv.toDataURL(\"image/png\").split(\",\")[1]);",
"}",
"function rr(x, a, b, w, h, r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }",
"",
"/* ===== \u0e2d\u0e37\u0e48\u0e19\u0e46 ===== */",
"window.toastErr = t => { $(\"toast\").innerHTML = ic(\"warn\") + t; $(\"toast\").classList.add(\"on\"); clearTimeout(tt); tt = setTimeout(()=>$(\"toast\").classList.remove(\"on\"), 4000); };",
"let tt; function toast(t){ $(\"toast\").innerHTML = ic(\"check\") + t; $(\"toast\").classList.add(\"on\"); clearTimeout(tt); tt = setTimeout(()=>$(\"toast\").classList.remove(\"on\"), 1800); }",
"document.querySelectorAll(\".tab\").forEach(b=>b.onclick=()=>{",
"  document.querySelectorAll(\".tab\").forEach(x=>x.classList.toggle(\"on\", x===b));",
"  document.querySelectorAll(\".page\").forEach(p=>p.classList.toggle(\"on\", p.id===b.dataset.p));",
"  window.scrollTo(0,0);",
"});",
"function renderAll(){",
"  applyTheme();",
"  const h = now().getHours();",
"  $(\"hello\").textContent = `${h<12?\"\u0e2d\u0e23\u0e38\u0e13\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e34\u0e4c\":h<17?\"\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e15\u0e2d\u0e19\u0e1a\u0e48\u0e32\u0e22\":\"\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e15\u0e2d\u0e19\u0e40\u0e22\u0e47\u0e19\"} ${first(DATA.me)}`;",
"  renderHero(); renderCal(); renderSum(); renderFr(); renderSet();",
"}",
"window.setData = function(d){ DATA = d; renderAll(); };",
"",
"/* ===== \u0e42\u0e2b\u0e21\u0e14\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07 (\u0e40\u0e1b\u0e34\u0e14\u0e43\u0e19\u0e40\u0e1a\u0e23\u0e32\u0e27\u0e4c\u0e40\u0e0b\u0e2d\u0e23\u0e4c \u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e43\u0e19 Scriptable) ===== */",
"function previewHandler(msg){",
"  if (msg.type===\"share\"){ window.__share = msg.payload; }",
"  if (msg.type===\"readPhoto\"){ setTimeout(()=>onParsed({year:2027, month:1, people:{[DATA.me]:{2:\"\u0e0a\",3:\"\u0e1a\u0e14\"}}, totals:{[DATA.me]:3}}), 1200); }",
"}",
"if (!DATA){",
"  const me = \"\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07 \u0e43\u0e08\u0e14\u0e35\";",
"  const my = {1:\"\u0e0a\u0e14\",2:\"\u0e1a\u0e14\",4:\"\u0e0a\",5:\"\u0e0a\",6:\"\u0e14\u0e1a\",8:\"\u0e1a\u0e0a\",10:\"\u0e0a\",11:\"\u0e0a\u0e14\",12:\"\u0e1a\u0e14\",13:\"\u0e1a\",17:\"\u0e1a\u0e0a\",18:\"\u0e0a\u0e1a\",19:\"\u0e0a\",23:\"\u0e0a\",24:\"\u0e1a\",25:\"\u0e0a\",26:\"\u0e0a\u0e1a\",28:\"\u0e0a\",29:\"\u0e1a\u0e14\",30:\"\u0e14\"};",
"  const others = [\"\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 \u0e40\u0e2d\",\"\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 \u0e1a\u0e35\",\"\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 \u0e0b\u0e35\",\"\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 \u0e14\u0e35\",\"\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 \u0e2d\u0e35\",\"\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 \u0e40\u0e2d\u0e1f\"];",
"  let seed = 7; const rnd = () => (seed = (seed*9301+49297)%233280)/233280;",
"  const people = {[me]:my};",
"  others.forEach(n=>{ const v={}; for (let d=1; d<=31; d++){ const r=rnd(); if (r<.3) continue; v[d] = r<.5?\"\u0e0a\":r<.65?\"\u0e1a\":r<.8?\"\u0e14\":r<.9?\"\u0e0a\u0e1a\":\"\u0e1a\u0e14\"; } people[n]=v; });",
"  const q = new URLSearchParams(location.search);",
"  DATA = {preview:true, today:\"2026-12-03\", time:\"13:00\", me, hasKey:{gemini:true, claude:false},",
"    settings:{notify:60, calendar:true, ai:\"gemini\", theme:{style:q.get(\"s\")||\"glass\", palette:q.get(\"p\")||\"sakura\"}},",
"    months:{\"2026-12\":{people, totals:{[me]:30}, work:{[me]:19}}}, notes:{\"2026-12-03\":\"\u0e1b\u0e23\u0e30\u0e0a\u0e38\u0e21\u0e27\u0e2d\u0e23\u0e4c\u0e14 13:00 (\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07)\",\"2026-12-08\":\"\u0e41\u0e25\u0e01\u0e40\u0e27\u0e23\u0e01\u0e31\u0e1a\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19 \u0e40\u0e2d (\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07)\"}};",
"}",
"initView(); renderAll();",
"</script>",
"</body>",
"</html>",
""
].join("\n");

async function runApp() {
  let d = loadData();
  const wv = new WebView();
  const payload = () => Object.assign({}, d, { hasKey: hasKey(), version: APP_VERSION });
  const js = v => JSON.stringify(v).replace(/</g, "\\u003c").split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
  const html = APP_HTML.replace("/*__DATA__*/null", js(payload()));
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
  async function pump() {
    if (busy) return; busy = true;
    try {
      while (true) {
        const q = JSON.parse(await call("__drain()"));
        if (!q.length) break;
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
  const sleep = ms => new Promise(r => Timer.schedule(ms, false, r));
  while (open) {                                   // เช็กคำสั่งจากหน้าแอปทุก 0.4 วินาที (กันกรณีสัญญาณไม่ถึง)
    try { await pump(); } catch (e) { console.log(e); }
    await sleep(400);
  }
  await shown;
}

const C = h => new Color(h);
const F = (w, s) => new Font(`SukhumvitSet-${w}`, s);
function txt(stack, s, font, color, opts = {}) { const t = stack.addText(s); t.font = font; t.textColor = color; if (opts.lines) t.lineLimit = opts.lines; if (opts.min) t.minimumScaleFactor = opts.min; return t; }
function sym(stack, name, size, color) { const i = stack.addImage(SFSymbol.named(name).image); i.imageSize = new Size(size, size); i.tintColor = color; return i; }

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
  const L = { "ช": ["#D9F4E3", "#1F5A3B"], "บ": ["#DFEAFF", "#24427E"], "ด": ["#ECE4FF", "#4A2F8C"] };
  if (t.style === "nude") return { dark: false, g1: "#FBF1EC", g2: "#F3DADB", b1: "#F2CCD1", b2: "#EED9C4", title: "#5A2E3E", sub: "#9A7680", text: "#5A3A44", accent: "#C98A94", onAccent: "#FFFFFF", card: "#FFFFFF", cardA: 0.7, offA: 0.45, pastA: 0.45, past: "#FFFFFF", shift: L };
  if (t.style === "pearl") return { dark: false, g1: "#FBEAF5", g2: "#E6E8FF", b1: "#FFD1EA", b2: "#D3D9FF", title: "#43345A", sub: "#8C79B8", text: "#43345A", accent: "#B07BE6", onAccent: "#FFFFFF", card: "#FFFFFF", cardA: 0.62, offA: 0.42, pastA: 0.45, past: "#FFFFFF", shift: L };
  if (t.style === "luxe") return { dark: false, g1: "#FFFFFF", g2: "#F8F4F2", b1: "#F6F0ED", b2: "#FFFFFF", title: "#2E2A2C", sub: "#A3989C", text: "#3A3436", accent: "#2E2A2C", onAccent: "#FFFFFF", card: "#F6F1EE", cardA: 0.9, offA: 0.6, pastA: 0.45, past: "#FFFFFF", shift: L };
  if (t.style === "satin") return { dark: true, g1: "#221B3C", g2: "#3A2148", b1: "#4A2F6E", b2: "#5A2C55", title: "#F7E3C0", sub: "#B7A3D2", text: "#EADFF2", accent: "#F3B6CF", onAccent: "#2A1E3E", card: "#FFFFFF", cardA: 0.1, offA: 0.06, pastA: 0.55, past: "#221B3C",
    shift: { "ช": ["#1E4A36", "#A6F2CC"], "บ": ["#22355E", "#C0D6FF"], "ด": ["#35285E", "#DED0FF"] } };
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


function widgetLock(d, now, family) {
  const w = new ListWidget();
  const { cur, nxt } = nextShift(d, now), x = cur || nxt;
  const dd = x ? Math.round((new Date(x.st.getFullYear(), x.st.getMonth(), x.st.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5) : 0;
  if (family === "accessoryInline") {
    txt(w, x ? `${SH[x.c].n} ${dayLabel(dd, x.st)} ${hhmm(x.st)}` : "ยังไม่มีเวร", Font.systemFont(12), Color.white());
  } else if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const s = w.addStack(); s.layoutVertically(); s.centerAlignContent();
    const a = s.addStack(); a.addSpacer(); txt(a, x ? x.c : "-", F("Bold", 20), Color.white()); a.addSpacer();
    const b = s.addStack(); b.addSpacer(); txt(b, x ? (dd === 0 ? "วันนี้" : dd === 1 ? "พรุ่งนี้" : `${x.st.getDate()}`) : "", F("Medium", 10), Color.white()); b.addSpacer();
  } else {
    const r = w.addStack(); r.centerAlignContent();
    if (x) sym(r, SH[x.c].sym, 14, Color.white());
    r.addSpacer(4); txt(r, cur ? "ตอนนี้" : "เวรถัดไป", F("Medium", 12), Color.white());
    txt(w, x ? SH[x.c].n : "ยังไม่มีเวร", F("Bold", 16), Color.white());
    if (x) txt(w, `${dayLabel(dd, x.st)} · ${hhmm(x.st)}`, F("Medium", 13), Color.white());
  }
  w.refreshAfterDate = new Date(now.getTime() + 15 * 6e4);
  return w;
}

async function buildWidget(d, now, family) {
  if (String(family).startsWith("accessory")) return widgetLock(d, now, family);
  return await drawnWidget(d, now, family === "small" || family === "medium" ? family : "large");
}

// ---------------- เริ่มทำงาน ----------------
if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(await buildWidget(loadData(), new Date(), config.widgetFamily));
} else {
  await runApp();
}
Script.complete();
// ===== จบไฟล์ (ถ้าไม่เห็นบรรทัดนี้ แปลว่าไฟล์มาไม่ครบ) =====
