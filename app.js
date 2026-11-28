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

const APP_VERSION = "28 พ.ย. 69 · 61";
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
    const [y, m] = k.split("-").map(Number), me = md.people[d.me] || {}, R = (md.roles || {})[d.me] || {};
    for (const [day, s] of Object.entries(me)) for (const { c, st } of shiftStarts(y, m, day, s)) {
      list.push({ c, st, en: new Date(st.getTime() + 8 * 3600e3), r: (R[day] || [])[sortS(s).indexOf(c)] || "" });   // r = หน้าที่ (ic/mb/md)
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
  // หน้าที่ของแต่ละเวร จากสีพื้นครึ่งบน/ล่าง (ไม่ใช้ API) → { วันที่: ["ic","md"] } เรียงตามตัวเวร
  const roles = {};
  try {
    const col = JSON.parse(await page(`halfColor(${+j.label}, ${days})`)), ink2 = JSON.parse(await page(`halfInk(${+j.label}, ${days})`));
    for (let dd = 1; dd <= days; dd++){ const s = sortS(final[dd]), c = col[dd] || {}, h = ink2[dd] || {};
      const r = s.length === 2 ? [c.top, c.bot] : s.length === 1 ? [h.bot && !h.top ? c.bot : h.top && !h.bot ? c.top : (c.top || c.bot)] : [];
      if (r.some(Boolean)) roles[dd] = r.map(x => x || ""); }
  } catch (e) { console.log("roles: " + e); }
  const my = { days: final, count: cnt(final) };
  return { year, month, days: my.days, roles, total, workdays, vdays, checks, count: my.count, uncertain: [...new Set(uncertain)].sort((a, b) => a - b) };
}

async function readRosterClaude(b64, d, key, grid, page) {
  if (grid && page) {
    const friends = askClaude(b64, key).then(t => parseRoster(t, d.me)).catch(e => ({ err: e }));   // เวรเพื่อน: อ่านเบื้องหลัง ไม่ต้องรอ
    const tiles = await readByTiles(b64, d, key, page).catch(e => ({ err: e }));
    if (!tiles.err) {
      const people = { [d.me]: tiles.days }, totals = tiles.total != null ? { [d.me]: tiles.total } : {};
      const work = tiles.workdays != null ? { [d.me]: tiles.workdays } : {}, vdays = tiles.vdays ? { [d.me]: tiles.vdays } : {}, roles = { [d.me]: tiles.roles || {} };
      const old = d.months[`${tiles.year}-${pad(tiles.month)}`];
      if (old) for (const [n, v] of Object.entries(old.people || {})) if (n !== d.me) people[n] = v;   // เวรเพื่อนเดิม (ถ้ามี)
      return { year: tiles.year, month: tiles.month, people, totals, work, vdays, roles, checks: tiles.checks, method: "tiles", uncertain: tiles.uncertain, friendsLater: friends };
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
  for (const x of list) { const b = out[out.length - 1]; if (b && x.st.getTime() === b.en.getTime()) { b.en = x.en; b.cs.push(x.c); b.rs.push(x.r); } else out.push({ c: x.c, st: x.st, en: x.en, cs: [x.c], rs: [x.r] }); }
  return out;
}
let NEWIDS = null;
async function sched(n) { await n.schedule(); if (NEWIDS) NEWIDS.add(n.identifier); }
async function syncNotifications(d) {      // ตั้งชุดใหม่ก่อน (id เดิมจะถูกแทนที่) แล้วค่อยลบอันที่ไม่ใช้แล้ว → ถ้าถูกตัดกลางคันก็ไม่หายหมด
  const old = (await Notification.allPending()).filter(n => n.threadIdentifier === "shiftapp").map(n => n.identifier);
  NEWIDS = new Set();
  try { await scheduleAll(d); } catch (e) { NEWIDS = null; throw e; }      // ล้มกลางคัน → เก็บของเดิมไว้
  const gone = old.filter(id => !NEWIDS.has(id)); NEWIDS = null;
  if (gone.length) await Notification.removePending(gone);
}
async function scheduleAll(d) {
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
      n.setTriggerDate(at); await sched(n);
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
      n.setTriggerDate(at); await sched(n);
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
    await sched(n);
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
    n.setTriggerDate(it.at); await sched(n);
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
".blob{position:absolute;border-radius:50%;opacity:.85}",
".page{display:none;animation:fade .25s ease}",
".page.on{display:block}",
"@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
".card{background:var(--card);border:var(--cardBorder);box-shadow:var(--cardShadow);border-radius:var(--r);padding:16px;margin-bottom:14px}",
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
".d{min-height:66px;padding-bottom:3px;border-radius:14px;display:flex;flex-direction:column;align-items:center;padding-top:4px;gap:3px;font-size:15px;font-weight:500;border:1px solid transparent}",
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
".d.lb{box-shadow:inset 0 -4px 0 #7FD3A0}.d .ab{font-size:11px;font-weight:700;letter-spacing:.5px;line-height:12px;margin-top:-1px;color:var(--title)}.d .ab.lvt{color:#C2477D}.d .ab i{font-style:normal}.d .ab .ric{color:#2F7BE0}.d .ab .rmb{color:#E8742A}.d .ab .rmd{color:#23A05A}",
".rolek{flex:0 0 100%;display:flex;gap:10px;justify-content:center;font-size:12px;font-weight:600;margin-top:8px;color:var(--sub)}.rolek b{font-weight:800}",
".lvb{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 4px}.lvb button{border:1.5px solid var(--line);background:none;border-radius:12px;padding:6px 12px;font:inherit;font-size:14px;color:var(--text)}.lvb button.on{background:#FFE1EA;border-color:#F48FB1;color:#B23A68;font-weight:700}",
".d.hol .nn{color:#D9821A;font-weight:700}.d.hol.t .nn{color:var(--onAccent)}.d.hol:after{content:\"\";position:absolute;top:5px;left:5px;width:6px;height:6px;border-radius:50%;background:#F2A23A}",
".holb{display:flex;align-items:center;gap:8px;background:#FFF1DC;color:#9A5A0C;border-radius:14px;padding:8px 12px;font-size:14px;font-weight:600;margin-bottom:10px}",
".li .hn{color:#C2700F}",
".d.past{opacity:.55}",
".notebox{width:100%;min-height:84px;border:2px solid var(--line);border-radius:16px;padding:10px 12px;font:inherit;font-size:15px;background:var(--nbBg);color:var(--text);resize:vertical;outline:none}",
".notebox:focus{border-color:var(--accent)}",
".qchips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 4px}",
".qchip{border:0;border-radius:12px;padding:5px 11px;font-size:13px;font-weight:600;background:var(--tint);color:var(--title)}",
".ci{display:inline-flex;width:26px;height:26px;margin-right:2px;vertical-align:middle}.tl .cute{vertical-align:-4px;display:inline-block}",
".tl{border-left:2.5px dashed var(--line);margin:8px 0 2px 8px;padding-left:14px}.tl p{position:relative;font-size:14px;margin-bottom:8px;color:var(--text)}.tl p:before{content:\"\";position:absolute;left:-20.5px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--c,var(--accent))}.tl b{color:var(--title)}",
".notecard{display:flex;gap:10px;align-items:flex-start}",
".notecard .t{font-size:15px;white-space:pre-wrap;flex:1}",
".chips{display:flex;flex-wrap:wrap;gap:4px;justify-content:space-between;margin-top:12px}",
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
".seg{display:flex;background:var(--line);border-radius:14px;padding:3px;margin-bottom:14px}.seg button{flex:1;border:0;background:none;padding:8px;border-radius:11px;font:inherit;font-size:15px;font-weight:600;color:var(--sub)}.seg button.on{background:var(--card,#fff);color:var(--title);box-shadow:0 2px 8px rgba(0,0,0,.08)}",
".ych{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;align-items:end;height:130px;margin-top:6px}.ych .b{display:flex;flex-direction:column-reverse;border-radius:7px 7px 3px 3px;overflow:hidden;min-height:2px}",
".ylb{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;font-size:10px;color:var(--sub);text-align:center;margin-top:4px}",
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
".seqh{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:14px;color:var(--title);background:var(--tint);border-radius:14px;padding:9px 12px;margin-bottom:8px}.seqh span{color:var(--sub);font-size:13px}",
".rpills{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}.rpill{font-size:13px;font-weight:700;border-radius:20px;padding:3px 10px}",
".rpill.ric{background:#E3EEFF;color:#2F7BE0}.rpill.rmb{background:#FFEBDD;color:#E8742A}.rpill.rmd{background:#E0F5E8;color:#23A05A}",
".rrow{display:flex;align-items:center;gap:5px;margin-bottom:6px}.rrow span{width:34px;font-size:13px;font-weight:700;color:var(--title)}",
".rb{flex:1;border:1.5px solid var(--line);background:none;border-radius:11px;padding:6px 0;font:inherit;font-size:11.5px;font-weight:600;color:var(--sub)}",
".rb.on.r0{background:var(--line);color:var(--title)}.rb.on.ric{background:#2F7BE0;border-color:#2F7BE0;color:#fff}.rb.on.rmb{background:#E8742A;border-color:#E8742A;color:#fff}.rb.on.rmd{background:#23A05A;border-color:#23A05A;color:#fff}",
".rb.ric{color:#2F7BE0}.rb.rmb{color:#E8742A}.rb.rmd{color:#23A05A}",
".trail{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--sub);margin-top:8px}.trail input{width:18px;height:18px;margin:0;accent-color:var(--accent)}",
"body.lock{position:fixed;left:0;right:0;overflow:hidden}.sheet{overscroll-behavior:contain}",
"html{touch-action:manipulation}*{-webkit-tap-highlight-color:transparent}",
"button,.d,.tab,.pchip,.fchip,.qchip,.sd{transition:transform .12s ease}button:active,.d:active,.pchip:active,.fchip:active,.qchip:active,.sd:active{transform:scale(.96)}",
"#decor{will-change:transform}.tabs,.sheet{will-change:transform}",
".score{display:flex;gap:14px;align-items:center;background:var(--tint);border-radius:20px;padding:12px 14px}",
".ring{width:84px;height:84px;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1%),rgba(0,0,0,.08) 0);display:flex;align-items:center;justify-content:center;flex:none}",
".ring b{width:66px;height:66px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:21px;color:var(--title);line-height:1}.ring b small{font-size:10px;color:var(--sub);font-weight:600;margin-top:3px}",
".verdict{font-size:15px;font-weight:700;color:var(--title)}.verdict p{margin:3px 0 0;font-size:12.5px;font-weight:500;color:var(--sub)}",
".why{margin-top:10px;font-size:13px;color:var(--text)}.why .r{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px dashed var(--line)}.why .r:last-child{border:0}",
".why .r i{font-style:normal;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;flex:none;font-weight:800}",
".why .ok i{background:var(--mBg);color:var(--mFg)}.why .wa i{background:var(--oBg);color:var(--oFg)}.why .no i{background:#ffd6d6;color:#a12626}.why b{color:var(--title)}",
".rcal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:10px}.rh{text-align:center;font-size:11px;color:var(--sub)}",
".rd{height:42px;border-radius:10px;background:var(--dayBg);border:var(--dayBorder);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text)}",
".rd .ics{display:flex}.rd.u{outline:2px solid #f39c3c;background:var(--oBg)}.rd.ck{outline:2px solid var(--mFg)}",
".cmp{display:flex;gap:12px;align-items:center;background:var(--tint);border-radius:16px;padding:10px;flex-wrap:wrap}.cmp img{border-radius:8px;border:2px solid var(--line)}",
".ck4 button{font-size:13px;padding:8px 2px}",
".qmeter{display:flex;gap:6px}.qmeter div{flex:1;background:var(--tint);border-radius:12px;padding:7px 4px;text-align:center;font-size:11px;color:var(--sub);font-weight:600}.qmeter i{display:block;font-style:normal;font-size:13.5px;font-weight:800;margin-top:2px}",
".qg{color:#1f8a4c}.qy{color:#c57a12}.qrd{color:#c0392b}",
".qtips{margin-top:10px;background:var(--oBg);color:var(--oFg);border-radius:16px;padding:10px 12px;font-size:13px}.qtips>b{display:flex;gap:6px;align-items:center;font-size:14px}.qtips ul{margin:6px 0 0;padding-left:18px}.qtips li{margin:3px 0}",
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
"  <div class=\"card\" id=\"brkNote\" style=\"display:none\"></div>",
"  <div class=\"card\" id=\"careCard\" style=\"display:none\"></div>",
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
"    <div><p class=\"hello\" id=\"sumTitle\"></p><h1 class=\"big\" id=\"sumH\">\u0e2a\u0e23\u0e38\u0e1b\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49</h1></div>",
"    <div class=\"row\"><button class=\"nb\" onclick=\"sumMove(-1)\" aria-label=\"\u0e01\u0e48\u0e2d\u0e19\u0e2b\u0e19\u0e49\u0e32\"><i data-i=\"l\"></i></button><button class=\"nb\" onclick=\"sumMove(1)\" aria-label=\"\u0e16\u0e31\u0e14\u0e44\u0e1b\"><i data-i=\"r\"></i></button></div>",
"  </div>",
"  <div class=\"seg\"><button id=\"segM\" class=\"on\" onclick=\"setSumMode('m')\">\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49</button><button id=\"segY\" onclick=\"setSumMode('y')\">\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35</button></div>",
"  <div class=\"grid2\" id=\"sumStats\" style=\"margin-bottom:14px\"></div>",
"  <div class=\"card\"><p class=\"h3\" style=\"margin-bottom:10px\">\u0e2a\u0e31\u0e14\u0e2a\u0e48\u0e27\u0e19\u0e40\u0e27\u0e23</p><div class=\"bar\" id=\"sumBar\"></div><div class=\"chips\" id=\"sumLegend\"></div></div>",
"  <div class=\"card\" id=\"sumList\"></div>",
"  <button class=\"btn\" id=\"sumShare\" style=\"width:100%;margin-bottom:14px\" onclick=\"SUMMODE==='y'?shareYear():shareMonth()\"><i data-i=\"share\"></i><span>\u0e41\u0e0a\u0e23\u0e4c\u0e2a\u0e23\u0e38\u0e1b\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e23\u0e39\u0e1b (\u0e2a\u0e48\u0e07 LINE \u0e44\u0e14\u0e49)</span></button>",
"</section>",
"",
"<section class=\"page\" id=\"p-fr\">",
"  <div style=\"margin-bottom:12px\"><p class=\"hello\" id=\"frTitle\"></p><h1 class=\"big\">\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e43\u0e19\u0e27\u0e2d\u0e23\u0e4c\u0e14</h1></div>",
"  <div id=\"frPreview\"></div><div id=\"frStat\"></div>",
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
"    <div class=\"set\" style=\"margin-top:10px\"><span class=\"l\"><i data-i=\"moon\"></i>\u0e18\u0e35\u0e21\u0e21\u0e37\u0e14\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34\u0e15\u0e2d\u0e19\u0e2d\u0e22\u0e39\u0e48\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01</span><div class=\"sw\" id=\"setAutoDark\" onclick=\"this.classList.toggle('on');saveSettings();applyTheme()\"></div></div>",
"  </div>",
"  <div class=\"card\">",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"bell\"></i>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e02\u0e36\u0e49\u0e19\u0e40\u0e27\u0e23</span>",
"      <select id=\"setNotify\" onchange=\"saveSettings()\"><option value=\"0\">\u0e1b\u0e34\u0e14</option><option value=\"30\">30 \u0e19\u0e32\u0e17\u0e35</option><option value=\"60\">1 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option><option value=\"120\">2 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option><option value=\"720\">12 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option></select></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"bell\"></i>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e40\u0e27\u0e23\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49 (2 \u0e17\u0e38\u0e48\u0e21)</span><div class=\"sw\" id=\"setEve\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"calsync\"></i>\u0e43\u0e2a\u0e48\u0e40\u0e27\u0e23\u0e43\u0e19\u0e1b\u0e0f\u0e34\u0e17\u0e34\u0e19 iPhone</span><div class=\"sw\" id=\"setCal\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"ai\"></i>AI \u0e2d\u0e48\u0e32\u0e19\u0e23\u0e39\u0e1b</span>",
"      <select id=\"setAI\" onchange=\"saveSettings()\"><option value=\"claude\">Claude</option><option value=\"gemini\" disabled>Gemini (\u0e1b\u0e34\u0e14\u0e0a\u0e31\u0e48\u0e27\u0e04\u0e23\u0e32\u0e27)</option></select></div>",
"  </div>",
"  <div class=\"card\"><p class=\"lbl\">\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19</p>",
"    <p class=\"note\" style=\"margin:2px 0 10px\">\u0e16\u0e49\u0e32\u0e44\u0e21\u0e48\u0e21\u0e35\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e40\u0e14\u0e49\u0e07 \u0e43\u0e2b\u0e49\u0e40\u0e1b\u0e34\u0e14 \"\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\" \u0e02\u0e2d\u0e07 Scriptable</p>",
"    <div class=\"grid2\"><button class=\"btn\" onclick=\"send('openNotiSettings')\">\u0e44\u0e1b\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19</button><button class=\"btn\" onclick=\"send('testNoti')\">\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19</button></div></div>",
"  <div class=\"card\"><p class=\"lbl\">\u0e14\u0e39\u0e41\u0e25\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e0a\u0e48\u0e27\u0e07\u0e40\u0e27\u0e23</p>",
"    <div class=\"set\"><span class=\"l\"><span class=\"ci\" data-c=\"water\"></span>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e14\u0e37\u0e48\u0e21\u0e19\u0e49\u0e33\u0e23\u0e30\u0e2b\u0e27\u0e48\u0e32\u0e07\u0e40\u0e27\u0e23</span><div class=\"sw\" id=\"cWater\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\" style=\"padding-left:28px\">\u0e17\u0e38\u0e01</span><select id=\"cWaterH\" onchange=\"saveSettings()\"><option value=\"1\">1 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option><option value=\"2\">2 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option><option value=\"3\">3 \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07</option></select></div>",
"    <div class=\"set\"><span class=\"l\"><span class=\"ci\" data-c=\"rice\"></span>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e01\u0e34\u0e19\u0e02\u0e49\u0e32\u0e27</span><div class=\"sw\" id=\"cMeal\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\"><span class=\"ci\" data-c=\"nap\"></span>\u0e15\u0e31\u0e27\u0e0a\u0e48\u0e27\u0e22\u0e19\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01</span><div class=\"sw\" id=\"cNight\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\"><span class=\"ci\" data-c=\"coffee\"></span>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e07\u0e14\u0e01\u0e32\u0e41\u0e1f\u0e01\u0e48\u0e2d\u0e19\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01</span><div class=\"sw\" id=\"cCoffee\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <div class=\"set\"><span class=\"l\"><span class=\"ci\" data-c=\"bed\"></span>\u0e40\u0e25\u0e34\u0e01\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01 \u2192 \u0e40\u0e15\u0e37\u0e2d\u0e19\u0e44\u0e1b\u0e19\u0e2d\u0e19</span><div class=\"sw\" id=\"cSleep\" onclick=\"this.classList.toggle('on');saveSettings()\"></div></div>",
"    <p class=\"note\" style=\"margin-top:6px\">\u0e01\u0e34\u0e19\u0e02\u0e49\u0e32\u0e27: \u0e40\u0e27\u0e23\u0e40\u0e0a\u0e49\u0e32 12:00 \u00b7 \u0e1a\u0e48\u0e32\u0e22 20:00 \u00b7 \u0e14\u0e36\u0e01 03:00<br>\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e0a\u0e48\u0e27\u0e07\u0e17\u0e35\u0e48\u0e21\u0e35\u0e40\u0e27\u0e23 \u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e44\u0e21\u0e48\u0e40\u0e15\u0e37\u0e2d\u0e19</p>",
"  </div>",
"  <div class=\"card\">",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"user\"></i>\u0e0a\u0e37\u0e48\u0e2d\u0e43\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07</span><span class=\"r\" id=\"setName\"></span></div>",
"    <div class=\"set\"><span class=\"l\"><i data-i=\"key\"></i>Claude key</span><span class=\"r\" id=\"setKeyC\"></span></div>",
"  </div>",
"  <button class=\"btn\" style=\"width:100%;margin-bottom:14px\" onclick=\"openProfile()\"><i data-i=\"edit\"></i>\u0e41\u0e01\u0e49\u0e0a\u0e37\u0e48\u0e2d / API key</button>",
"  <div class=\"card\"><div class=\"set\"><span class=\"l\"><i data-i=\"calsync\"></i>\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25 iCloud</span><span class=\"r\" id=\"setBk\"></span></div>",
"    <p class=\"note\" style=\"margin:6px 0 10px\">\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34\u0e17\u0e38\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01 (\u0e40\u0e27\u0e23 \u0e42\u0e19\u0e49\u0e15 \u0e0b\u0e37\u0e49\u0e2d-\u0e02\u0e32\u0e22) \u00b7 \u0e44\u0e21\u0e48\u0e21\u0e35 API key \u0e43\u0e19\u0e44\u0e1f\u0e25\u0e4c\u0e2a\u0e33\u0e23\u0e2d\u0e07</p>",
"    <div class=\"grid2\"><button class=\"btn\" onclick=\"send('backupNow')\">\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49</button><button class=\"btn\" onclick=\"send('restoreBackup')\">\u0e01\u0e39\u0e49\u0e04\u0e37\u0e19</button></div></div>",
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
"const CUTE = {\"sun\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><g stroke=\\\"#FFB347\\\" stroke-width=\\\"5\\\" stroke-linecap=\\\"round\\\"><path d=\\\"M32 4v7M32 53v7M4 32h7M53 32h7M12 12l5 5M47 47l5 5M52 12l-5 5M17 47l-5 5\\\"/></g><circle cx=\\\"32\\\" cy=\\\"32\\\" r=\\\"17\\\" fill=\\\"#FFD166\\\"/><circle cx=\\\"32\\\" cy=\\\"32\\\" r=\\\"17\\\" fill=\\\"none\\\" stroke=\\\"#FFB347\\\" stroke-width=\\\"2\\\"/><circle cx=\\\"26\\\" cy=\\\"30\\\" r=\\\"2.3\\\" fill=\\\"#5A3A2E\\\"/><circle cx=\\\"38\\\" cy=\\\"30\\\" r=\\\"2.3\\\" fill=\\\"#5A3A2E\\\"/><ellipse cx=\\\"22\\\" cy=\\\"36\\\" rx=\\\"3.4\\\" ry=\\\"2.2\\\" fill=\\\"#FF8FA3\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"42\\\" cy=\\\"36\\\" rx=\\\"3.4\\\" ry=\\\"2.2\\\" fill=\\\"#FF8FA3\\\" opacity=\\\".8\\\"/><path d=\\\"M28 36q4 4 8 0\\\" stroke=\\\"#5A3A2E\\\" stroke-width=\\\"2.2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"sunset\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><circle cx=\\\"38\\\" cy=\\\"26\\\" r=\\\"15\\\" fill=\\\"#FFB38A\\\"/><circle cx=\\\"38\\\" cy=\\\"26\\\" r=\\\"15\\\" fill=\\\"none\\\" stroke=\\\"#FF9466\\\" stroke-width=\\\"2\\\"/><path d=\\\"M33 24q2-2 4 0M41 24q2-2 4 0\\\" stroke=\\\"#6B3A2E\\\" stroke-width=\\\"2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M14 50a10 10 0 0 1 2-19.8A13 13 0 0 1 40 30a9 9 0 0 1 10 9.5A8 8 0 0 1 48 55H18a8 8 0 0 1-4-5z\\\" fill=\\\"#BFD7FF\\\"/><path d=\\\"M14 50a10 10 0 0 1 2-19.8A13 13 0 0 1 40 30a9 9 0 0 1 10 9.5A8 8 0 0 1 48 55H18a8 8 0 0 1-4-5z\\\" fill=\\\"none\\\" stroke=\\\"#8FB4F2\\\" stroke-width=\\\"2\\\"/><circle cx=\\\"25\\\" cy=\\\"44\\\" r=\\\"2\\\" fill=\\\"#3B4F7E\\\"/><circle cx=\\\"35\\\" cy=\\\"44\\\" r=\\\"2\\\" fill=\\\"#3B4F7E\\\"/><ellipse cx=\\\"21\\\" cy=\\\"48\\\" rx=\\\"2.8\\\" ry=\\\"1.8\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"39\\\" cy=\\\"48\\\" rx=\\\"2.8\\\" ry=\\\"1.8\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><path d=\\\"M28 47q2 2.5 4 0\\\" stroke=\\\"#3B4F7E\\\" stroke-width=\\\"1.8\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"moon\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M40 8a24 24 0 1 0 18 34A20 20 0 0 1 40 8z\\\" fill=\\\"#CDB8FF\\\" stroke=\\\"#A88BF0\\\" stroke-width=\\\"2\\\"/><path d=\\\"M20 34q3 3 6 0M31 34q3 3 6 0\\\" stroke=\\\"#4A2F8C\\\" stroke-width=\\\"2.2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><ellipse cx=\\\"19\\\" cy=\\\"40\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FC4\\\" opacity=\\\".85\\\"/><ellipse cx=\\\"38\\\" cy=\\\"40\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FC4\\\" opacity=\\\".85\\\"/><path d=\\\"M26 42q2.5 2 5 0\\\" stroke=\\\"#4A2F8C\\\" stroke-width=\\\"1.8\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M50 10l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.7-2.4 3.6-.4z\\\" fill=\\\"#FFD166\\\"/><text x=\\\"46\\\" y=\\\"32\\\" font-size=\\\"9\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text><text x=\\\"52\\\" y=\\\"26\\\" font-size=\\\"7\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text></svg>\", \"off\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M32 56S8 42 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 18-24 32-24 32z\\\" fill=\\\"#FFB3CC\\\" stroke=\\\"#F48FB1\\\" stroke-width=\\\"2\\\"/><circle cx=\\\"25\\\" cy=\\\"30\\\" r=\\\"2.2\\\" fill=\\\"#7A2E4E\\\"/><circle cx=\\\"39\\\" cy=\\\"30\\\" r=\\\"2.2\\\" fill=\\\"#7A2E4E\\\"/><ellipse cx=\\\"21\\\" cy=\\\"35\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF7FA6\\\" opacity=\\\".7\\\"/><ellipse cx=\\\"43\\\" cy=\\\"35\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF7FA6\\\" opacity=\\\".7\\\"/><path d=\\\"M28 35q4 4 8 0\\\" stroke=\\\"#7A2E4E\\\" stroke-width=\\\"2.2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><ellipse cx=\\\"20\\\" cy=\\\"20\\\" rx=\\\"4\\\" ry=\\\"2.5\\\" fill=\\\"#fff\\\" opacity=\\\".6\\\" transform=\\\"rotate(-30 20 20)\\\"/></svg>\", \"note\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><rect x=\\\"10\\\" y=\\\"10\\\" width=\\\"44\\\" height=\\\"46\\\" rx=\\\"10\\\" fill=\\\"#FFF3B0\\\" stroke=\\\"#F2C94C\\\" stroke-width=\\\"2\\\"/><rect x=\\\"22\\\" y=\\\"5\\\" width=\\\"20\\\" height=\\\"10\\\" rx=\\\"4\\\" fill=\\\"#F7A8C4\\\"/><path d=\\\"M19 30h26M19 39h18\\\" stroke=\\\"#D9A93A\\\" stroke-width=\\\"3\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M44 44l6-6 4 4-6 6h-4z\\\" fill=\\\"#F48FB1\\\"/></svg>\", \"water\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M32 6C24 18 14 29 14 40a18 18 0 0 0 36 0C50 29 40 18 32 6z\\\" fill=\\\"#A9D8FF\\\" stroke=\\\"#6BB8F2\\\" stroke-width=\\\"2\\\"/><ellipse cx=\\\"23\\\" cy=\\\"34\\\" rx=\\\"3\\\" ry=\\\"5\\\" fill=\\\"#fff\\\" opacity=\\\".7\\\" transform=\\\"rotate(20 23 34)\\\"/><circle cx=\\\"26\\\" cy=\\\"40\\\" r=\\\"2.3\\\" fill=\\\"#2B5B86\\\"/><circle cx=\\\"38\\\" cy=\\\"40\\\" r=\\\"2.3\\\" fill=\\\"#2B5B86\\\"/><ellipse cx=\\\"22\\\" cy=\\\"45\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"42\\\" cy=\\\"45\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><path d=\\\"M29 45q3 3 6 0\\\" stroke=\\\"#2B5B86\\\" stroke-width=\\\"2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"rice\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M14 30q2-14 18-14t18 14z\\\" fill=\\\"#FFFFFF\\\" stroke=\\\"#E6E1EE\\\" stroke-width=\\\"2\\\"/><circle cx=\\\"24\\\" cy=\\\"24\\\" r=\\\"2\\\" fill=\\\"#F2EEF7\\\"/><circle cx=\\\"36\\\" cy=\\\"21\\\" r=\\\"2\\\" fill=\\\"#F2EEF7\\\"/><circle cx=\\\"41\\\" cy=\\\"26\\\" r=\\\"1.8\\\" fill=\\\"#F2EEF7\\\"/><path d=\\\"M8 30h48q-2 22-24 24Q10 52 8 30z\\\" fill=\\\"#FFC9D9\\\" stroke=\\\"#F48FB1\\\" stroke-width=\\\"2\\\"/><path d=\\\"M22 54h20\\\" stroke=\\\"#F48FB1\\\" stroke-width=\\\"4\\\" stroke-linecap=\\\"round\\\"/><circle cx=\\\"26\\\" cy=\\\"39\\\" r=\\\"2.3\\\" fill=\\\"#7A2E4E\\\"/><circle cx=\\\"38\\\" cy=\\\"39\\\" r=\\\"2.3\\\" fill=\\\"#7A2E4E\\\"/><ellipse cx=\\\"22\\\" cy=\\\"44\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF7FA6\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"42\\\" cy=\\\"44\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF7FA6\\\" opacity=\\\".8\\\"/><path d=\\\"M29 44q3 3 6 0\\\" stroke=\\\"#7A2E4E\\\" stroke-width=\\\"2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"snack\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M32 8L54 50q2 6-4 6H14q-6 0-4-6z\\\" fill=\\\"#FFFFFF\\\" stroke=\\\"#C9C2D6\\\" stroke-width=\\\"2\\\" stroke-linejoin=\\\"round\\\"/><rect x=\\\"24\\\" y=\\\"44\\\" width=\\\"16\\\" height=\\\"12\\\" rx=\\\"2\\\" fill=\\\"#4E6B5A\\\"/><circle cx=\\\"26\\\" cy=\\\"30\\\" r=\\\"2.3\\\" fill=\\\"#4A3B55\\\"/><circle cx=\\\"38\\\" cy=\\\"30\\\" r=\\\"2.3\\\" fill=\\\"#4A3B55\\\"/><ellipse cx=\\\"22\\\" cy=\\\"35\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"42\\\" cy=\\\"35\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FB5\\\" opacity=\\\".8\\\"/><path d=\\\"M29 35q3 3 6 0\\\" stroke=\\\"#4A3B55\\\" stroke-width=\\\"2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"nap\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><rect x=\\\"6\\\" y=\\\"26\\\" width=\\\"52\\\" height=\\\"26\\\" rx=\\\"13\\\" fill=\\\"#E2D8FF\\\" stroke=\\\"#B9A4F5\\\" stroke-width=\\\"2\\\"/><path d=\\\"M23 38q3 3 6 0M35 38q3 3 6 0\\\" stroke=\\\"#4A2F8C\\\" stroke-width=\\\"2.2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><ellipse cx=\\\"22\\\" cy=\\\"43\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FC4\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"42\\\" cy=\\\"43\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF9FC4\\\" opacity=\\\".8\\\"/><path d=\\\"M29 43q3 3 6 0\\\" stroke=\\\"#4A2F8C\\\" stroke-width=\\\"2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><text x=\\\"40\\\" y=\\\"18\\\" font-size=\\\"11\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text><text x=\\\"49\\\" y=\\\"11\\\" font-size=\\\"8\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text></svg>\", \"coffee\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><path d=\\\"M24 8q-3 4 0 8M32 6q-3 4 0 8M40 8q-3 4 0 8\\\" stroke=\\\"#C9B6A6\\\" stroke-width=\\\"2.5\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M48 30h3a7 7 0 0 1 0 14h-4\\\" stroke=\\\"#C99A72\\\" stroke-width=\\\"4\\\" fill=\\\"none\\\"/><path d=\\\"M12 22h38v18a16 16 0 0 1-16 16h-6a16 16 0 0 1-16-16z\\\" fill=\\\"#F5DCC4\\\" stroke=\\\"#C99A72\\\" stroke-width=\\\"2\\\"/><ellipse cx=\\\"31\\\" cy=\\\"22\\\" rx=\\\"19\\\" ry=\\\"3.5\\\" fill=\\\"#8A5A3C\\\"/><circle cx=\\\"25\\\" cy=\\\"36\\\" r=\\\"2.3\\\" fill=\\\"#5A3A2E\\\"/><circle cx=\\\"37\\\" cy=\\\"36\\\" r=\\\"2.3\\\" fill=\\\"#5A3A2E\\\"/><ellipse cx=\\\"21\\\" cy=\\\"41\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF8FA3\\\" opacity=\\\".8\\\"/><ellipse cx=\\\"41\\\" cy=\\\"41\\\" rx=\\\"3\\\" ry=\\\"2\\\" fill=\\\"#FF8FA3\\\" opacity=\\\".8\\\"/><path d=\\\"M28 41q3 3 6 0\\\" stroke=\\\"#5A3A2E\\\" stroke-width=\\\"2\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/></svg>\", \"bed\": \"<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" viewBox=\\\"0 0 64 64\\\"><rect x=\\\"6\\\" y=\\\"20\\\" width=\\\"6\\\" height=\\\"34\\\" rx=\\\"3\\\" fill=\\\"#C9A7E8\\\"/><rect x=\\\"52\\\" y=\\\"34\\\" width=\\\"6\\\" height=\\\"20\\\" rx=\\\"3\\\" fill=\\\"#C9A7E8\\\"/><rect x=\\\"8\\\" y=\\\"36\\\" width=\\\"50\\\" height=\\\"12\\\" rx=\\\"4\\\" fill=\\\"#BFD7FF\\\" stroke=\\\"#8FB4F2\\\" stroke-width=\\\"2\\\"/><ellipse cx=\\\"22\\\" cy=\\\"30\\\" rx=\\\"9\\\" ry=\\\"7\\\" fill=\\\"#FFE0B8\\\" stroke=\\\"#F2B98A\\\" stroke-width=\\\"1.5\\\"/><path d=\\\"M17 30q2.5 2 5 0M23 30q2.5 2 5 0\\\" stroke=\\\"#6B3A2E\\\" stroke-width=\\\"1.6\\\" fill=\\\"none\\\" stroke-linecap=\\\"round\\\"/><path d=\\\"M28 36q8-8 26-2v6H28z\\\" fill=\\\"#FFB3CC\\\" stroke=\\\"#F48FB1\\\" stroke-width=\\\"1.5\\\"/><text x=\\\"36\\\" y=\\\"22\\\" font-size=\\\"10\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text><text x=\\\"44\\\" y=\\\"15\\\" font-size=\\\"7\\\" font-weight=\\\"700\\\" fill=\\\"#A88BF0\\\" font-family=\\\"sans-serif\\\">z</text></svg>\"};",
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
"  let hy = gridLines(row, 0.45);",
"  // \u0e40\u0e2a\u0e49\u0e19\u0e41\u0e1a\u0e48\u0e07\u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e1a\u0e19/\u0e25\u0e48\u0e32\u0e07\u0e43\u0e19\u0e0a\u0e48\u0e2d\u0e07\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e40\u0e2a\u0e49\u0e19\u0e41\u0e1a\u0e48\u0e07\u0e04\u0e19: \u0e40\u0e2a\u0e49\u0e19\u0e41\u0e1a\u0e48\u0e07\u0e04\u0e19\u0e08\u0e23\u0e34\u0e07\u0e15\u0e49\u0e2d\u0e07\u0e25\u0e32\u0e01\u0e1c\u0e48\u0e32\u0e19\u0e04\u0e2d\u0e25\u0e31\u0e21\u0e19\u0e4c\u0e0a\u0e37\u0e48\u0e2d\u0e14\u0e49\u0e27\u0e22",
"  { const na = Math.max(0, Math.round(xs[0] - cw*8)), nb = Math.max(0, Math.round(xs[0] - cw)), nw = nb - na;",
"    if (nw > cw*3){",
"      const inName = y => { let best = 0; for (let yy = Math.max(0, Math.round(y) - 2); yy <= Math.min(H-1, Math.round(y) + 2); yy++){ let c = 0; const r = yy * W; for (let xx = na; xx < nb; xx++) if (m[r + xx]) c++; if (c > best) best = c; } return best >= nw * 0.4; };",
"      const kept = hy.filter(inName); if (kept.length >= 3) hy = kept; } }",
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
"// \u0e17\u0e33\u0e43\u0e2b\u0e49\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23\u0e14\u0e33\u0e1a\u0e19\u0e1e\u0e37\u0e49\u0e19\u0e02\u0e32\u0e27 (\u0e15\u0e31\u0e14\u0e2a\u0e35\u0e1e\u0e37\u0e49\u0e19\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e35\u0e48\u0e17\u0e33\u0e43\u0e2b\u0e49 AI \u0e2a\u0e31\u0e1a\u0e2a\u0e19 \u0e40\u0e0a\u0e48\u0e19 \u0e0a \u0e1a\u0e19\u0e1e\u0e37\u0e49\u0e19\u0e1f\u0e49\u0e32) + \u0e02\u0e35\u0e14\u0e40\u0e2a\u0e49\u0e19\u0e41\u0e1a\u0e48\u0e07\u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e1a\u0e19/\u0e25\u0e48\u0e32\u0e07\u0e43\u0e2b\u0e49\u0e0a\u0e31\u0e14",
"function inkTile(c){",
"  const x = c.getContext(\"2d\"), W = c.width, H = c.height, im = x.getImageData(0, 0, W, H), p = im.data;",
"  const rowLine = new Float64Array(H);",
"  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++){ const i = (y*W + xx)*4, r = p[i], g = p[i+1], b = p[i+2], mx = Math.max(r,g,b), mn = Math.min(r,g,b), L = 0.3*r + 0.59*g + 0.11*b;",
"    if (mx - mn < 40 && L > 140 && L < 225) rowLine[y]++; }     // \u0e40\u0e2a\u0e49\u0e19\u0e41\u0e1a\u0e48\u0e07\u0e1a\u0e32\u0e07 \u0e2a\u0e35\u0e40\u0e17\u0e32",
"  let by = Math.round(H/2), best = 0;",
"  for (let y = Math.round(H*0.3); y < H*0.7; y++){ if (rowLine[y] > best){ best = rowLine[y]; by = y; } }",
"  // \u0e16\u0e49\u0e32\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e2a\u0e49\u0e19\u0e40\u0e17\u0e32 \u0e43\u0e0a\u0e49\u0e23\u0e2d\u0e22\u0e15\u0e48\u0e2d\u0e2a\u0e35\u0e1e\u0e37\u0e49\u0e19 (\u0e1a\u0e19/\u0e25\u0e48\u0e32\u0e07\u0e04\u0e19\u0e25\u0e30\u0e2a\u0e35)",
"  if (best < W*0.5){ let bd = 0; for (let y = Math.round(H*0.3); y < H*0.7; y++){ let d = 0; for (let xx = 0; xx < W; xx += 3){ const i = (y*W + xx)*4, j = ((y-2)*W + xx)*4; d += Math.abs(p[i]-p[j]) + Math.abs(p[i+1]-p[j+1]) + Math.abs(p[i+2]-p[j+2]); } if (d > bd){ bd = d; by = y; } } }",
"  // \u0e41\u0e22\u0e01\u0e17\u0e33\u0e17\u0e35\u0e25\u0e30\u0e04\u0e23\u0e36\u0e48\u0e07 (\u0e1a\u0e19/\u0e25\u0e48\u0e32\u0e07): \u0e2b\u0e32\u0e2a\u0e35\u0e1e\u0e37\u0e49\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e23\u0e36\u0e48\u0e07\u0e19\u0e31\u0e49\u0e19 \u0e41\u0e25\u0e49\u0e27\u0e22\u0e37\u0e14\u0e43\u0e2b\u0e49\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23\u0e40\u0e02\u0e49\u0e21 \u0e1e\u0e37\u0e49\u0e19\u0e02\u0e32\u0e27",
"  const V = new Float32Array(W*H); for (let j = 0; j < V.length; j++){ const i = j*4; V[j] = Math.max(p[i], p[i+1], p[i+2]); }",
"  for (const [ya, yb] of [[0, by], [by, H]]){",
"    const vals = []; for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx += 2) vals.push(V[y*W + xx]);",
"    if (!vals.length) continue; vals.sort((a2, b2) => a2 - b2);",
"    const bg = vals[Math.floor(vals.length*0.6)], ink = vals[Math.floor(vals.length*0.01)], span = bg - ink;",
"    if (span < 55){ for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx++){ const i = (y*W + xx)*4; p[i] = p[i+1] = p[i+2] = 255; } continue; }   // \u0e04\u0e23\u0e36\u0e48\u0e07\u0e19\u0e35\u0e49\u0e27\u0e48\u0e32\u0e07",
"    for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx++){ const j = y*W + xx, i = j*4, d = Math.max(0, Math.min(1, (bg - V[j] - span*0.2) / (span*0.8)));",
"      const o = 255 - Math.min(255, d * 1.5 * 255); p[i] = p[i+1] = p[i+2] = o; } }",
"  x.putImageData(im, 0, 0);",
"  x.fillStyle = \"#e0457c\"; x.fillRect(0, by - 1, W, 3);",
"  x.fillStyle = \"#e0457c\"; x.font = \"600 15px sans-serif\"; x.textAlign = \"left\"; x.textBaseline = \"top\"; x.fillText(\"\u0e1a\u0e19\", 4, 3); x.textBaseline = \"top\"; x.fillText(\"\u0e25\u0e48\u0e32\u0e07\", 4, by + 4);",
"  return c;",
"}",
"// \u0e17\u0e33\u0e43\u0e2b\u0e49\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23\u0e40\u0e02\u0e49\u0e21\u0e02\u0e36\u0e49\u0e19\u0e1a\u0e19\u0e1e\u0e37\u0e49\u0e19\u0e2a\u0e35\u0e40\u0e02\u0e49\u0e21 (\u0e2a\u0e49\u0e21/\u0e1f\u0e49\u0e32) \u0e42\u0e14\u0e22\u0e22\u0e31\u0e07\u0e40\u0e01\u0e47\u0e1a\u0e2a\u0e35\u0e1e\u0e37\u0e49\u0e19\u0e44\u0e27\u0e49",
"function darkenInk(c){",
"  const x = c.getContext(\"2d\"), W = c.width, H = c.height, im = x.getImageData(0, 0, W, H), p = im.data, mid = Math.round(H/2);",
"  for (const [ya, yb] of [[0, mid], [mid, H]]){",
"    const v = []; for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx += 2){ const i = (y*W + xx)*4; v.push(Math.max(p[i], p[i+1], p[i+2])); }",
"    v.sort((a2, b2) => a2 - b2); const bg = v[Math.floor(v.length*0.6)];",
"    for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx++){ const i = (y*W + xx)*4, V = Math.max(p[i], p[i+1], p[i+2]);",
"      if (V < bg*0.85){ const f = Math.pow(V / bg, 2.2); p[i] *= f; p[i+1] *= f; p[i+2] *= f; } } }",
"  x.putImageData(im, 0, 0); return c;",
"}",
"window.makeTiles2 = function(k, days, mode){",
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
"      const cell = gridCrop(g.xs[xi] + pad, y0 + pad, g.xs[xi+1] - g.xs[xi] - pad*2, y1 - y0 - pad*2, tw, th);",
"      x.drawImage(mode === \"ink\" ? inkTile(cell) : mode === \"plain\" ? cell : darkenInk(cell), cx, cy + lab);",
"      x.strokeStyle = \"#999\"; x.lineWidth = 2; x.strokeRect(cx, cy + lab, tw, th);",
"    }",
"    return c.toDataURL(\"image/jpeg\", .92).split(\",\")[1];",
"  }));",
"};",
"",
"// ---- \u0e15\u0e23\u0e27\u0e08 \u0e0a/\u0e1a/\u0e14 \u0e0b\u0e49\u0e33\u0e41\u0e1a\u0e1a\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e01\u0e31\u0e1a\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e08\u0e32\u0e01\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27\u0e01\u0e31\u0e19 ----",
"function halfBox(k, d, half){",
"  const g = GRID.g, [y0, y1] = g.bands[k-1], xi = d - 1, w = g.xs[xi+1] - g.xs[xi], padx = w * 0.06, h = y1 - y0, mid = y0 + h * 0.5;",
"  return half === \"top\" ? [g.xs[xi] + padx, y0 + h*0.04, w - padx*2, h*0.48] : [g.xs[xi] + padx, mid, w - padx*2, h*0.46];",
"}",
"// \u0e04\u0e23\u0e36\u0e48\u0e07\u0e44\u0e2b\u0e19\u0e21\u0e35\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23 (\u0e14\u0e39\u0e08\u0e32\u0e01\u0e04\u0e27\u0e32\u0e21\u0e15\u0e48\u0e32\u0e07\u0e23\u0e30\u0e2b\u0e27\u0e48\u0e32\u0e07\u0e2b\u0e21\u0e36\u0e01\u0e01\u0e31\u0e1a\u0e1e\u0e37\u0e49\u0e19)",
"window.halfInk = function(k, days){",
"  const out = {};",
"  for (let d = 1; d <= days; d++){ out[d] = {};",
"    for (const half of [\"top\", \"bot\"]){",
"      const [sx, sy, sw, sh] = halfBox(k, d, half), c = gridCrop(sx, sy, sw, sh, 40, 30), p = c.getContext(\"2d\").getImageData(0, 0, 40, 30).data, v = [];",
"      for (let i = 0; i < p.length; i += 4) v.push(Math.max(p[i], p[i+1], p[i+2]));",
"      v.sort((a, b) => a - b); out[d][half] = v[Math.floor(v.length*0.6)] - v[Math.floor(v.length*0.02)] > 60;",
"    } }",
"  return JSON.stringify(out);",
"};",
"// \u0e2a\u0e35\u0e1e\u0e37\u0e49\u0e19\u0e02\u0e2d\u0e07\u0e41\u0e15\u0e48\u0e25\u0e30\u0e04\u0e23\u0e36\u0e48\u0e07\u0e0a\u0e48\u0e2d\u0e07 = \u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48: \u0e1f\u0e49\u0e32 In charge (ic), \u0e2a\u0e49\u0e21 member (mb), \u0e40\u0e02\u0e35\u0e22\u0e27 med (md); \u0e40\u0e17\u0e32/\u0e02\u0e32\u0e27 = \u0e44\u0e21\u0e48\u0e21\u0e35",
"function roleOfRGB(r, g, b){",
"  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;",
"  if (sat < 0.22) return \"\";",
"  const h = mx === r ? ((g - b) / (mx - mn) * 60 + 360) % 360 : mx === g ? (b - r) / (mx - mn) * 60 + 120 : (r - g) / (mx - mn) * 60 + 240;",
"  return h >= 180 && h < 260 ? \"ic\" : h >= 10 && h < 55 ? \"mb\" : h >= 70 && h < 170 ? \"md\" : \"\";",
"}",
"window.halfColor = function(k, days){",
"  const out = {};",
"  for (let d = 1; d <= days; d++){ out[d] = {};",
"    for (const half of [\"top\", \"bot\"]){",
"      const [sx, sy, sw, sh] = halfBox(k, d, half), c = gridCrop(sx + sw*0.1, sy + sh*0.1, sw*0.8, sh*0.8, 24, 16), p = c.getContext(\"2d\").getImageData(0, 0, 24, 16).data, px = [];",
"      for (let i = 0; i < p.length; i += 4) px.push([p[i], p[i+1], p[i+2]]);",
"      px.sort((a, b) => Math.max(...b) - Math.max(...a));                 // \u0e40\u0e2d\u0e32\u0e1e\u0e34\u0e01\u0e40\u0e0b\u0e25\u0e2a\u0e27\u0e48\u0e32\u0e07 (\u0e1e\u0e37\u0e49\u0e19) \u0e44\u0e21\u0e48\u0e40\u0e2d\u0e32\u0e15\u0e31\u0e27\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d",
"      const bg = px.slice(0, Math.ceil(px.length * 0.5)), m = [0, 1, 2].map(j => bg.reduce((s, q) => s + q[j], 0) / bg.length);",
"      out[d][half] = roleOfRGB(...m);",
"    } }",
"  return JSON.stringify(out);",
"};",
"// \u0e23\u0e39\u0e1b\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07 (legend) + \u0e23\u0e39\u0e1b\u0e15\u0e31\u0e27\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e15\u0e23\u0e27\u0e08 \u0e41\u0e15\u0e48\u0e25\u0e30\u0e15\u0e31\u0e27\u0e02\u0e22\u0e32\u0e22\u0e43\u0e2b\u0e0d\u0e48 \u0e21\u0e35\u0e40\u0e25\u0e02\u0e01\u0e33\u0e01\u0e31\u0e1a",
"window.glyphSheet = function(k, items, legend){",
"  const S = 110, gap = 12, lab = 34;",
"  const cell = (it) => { const [sx, sy, sw, sh] = halfBox(k, it.d, it.half); return darkenInk(gridCrop(sx, sy, sw, sh, S, Math.round(S * sh / sw))); };",
"  const draw = (rows) => {",
"    const per = 8, hh = Math.round(S * 0.95), H = rows.reduce((a, r) => a + Math.ceil(r.items.length / per) * (hh + lab + gap) + 40, gap), W = per * (S + gap) + gap + 10;",
"    const c = document.createElement(\"canvas\"); c.width = W; c.height = H; const x = c.getContext(\"2d\"); x.fillStyle = \"#fff\"; x.fillRect(0, 0, W, H);",
"    let y = gap;",
"    for (const r of rows){ x.fillStyle = \"#333\"; x.font = \"700 26px sans-serif\"; x.textAlign = \"left\"; x.textBaseline = \"top\"; x.fillText(r.title, gap, y); y += 36;",
"      r.items.forEach((it, i) => { const cx = gap + (i % per) * (S + gap), cy = y + Math.floor(i / per) * (hh + lab + gap);",
"        x.fillStyle = \"#c2185b\"; x.font = \"700 26px sans-serif\"; x.textAlign = \"center\"; x.fillText(it.label, cx + S/2, cy);",
"        const im = cell(it); x.drawImage(im, cx, cy + lab, S, Math.min(hh, im.height)); x.strokeStyle = \"#999\"; x.lineWidth = 2; x.strokeRect(cx, cy + lab, S, Math.min(hh, im.height)); });",
"      y += Math.ceil(r.items.length / per) * (hh + lab + gap) + 4; }",
"    return c.toDataURL(\"image/jpeg\", .92).split(\",\")[1];",
"  };",
"  const L = draw([\"\u0e0a\", \"\u0e1a\", \"\u0e14\"].filter(c => legend[c] && legend[c].length).map(c => ({ title: \"\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e15\u0e31\u0e27 \" + c, items: legend[c].map((it, i) => ({ ...it, label: c })) })));",
"  const Q = draw([{ title: \"\u0e15\u0e31\u0e27\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e15\u0e23\u0e27\u0e08\", items: items.map((it, i) => ({ ...it, label: \"#\" + (i + 1) })) }]);",
"  return JSON.stringify([L, Q]);",
"};",
"",
"// ---- \u0e15\u0e23\u0e27\u0e08\u0e04\u0e38\u0e13\u0e20\u0e32\u0e1e\u0e23\u0e39\u0e1b (\u0e44\u0e21\u0e48\u0e43\u0e0a\u0e49 AI): \u0e02\u0e19\u0e32\u0e14\u0e0a\u0e48\u0e2d\u0e07, \u0e04\u0e27\u0e32\u0e21\u0e04\u0e21, \u0e04\u0e27\u0e32\u0e21\u0e40\u0e2d\u0e35\u0e22\u0e07, \u0e40\u0e07\u0e32 ----",
"window.imageQuality = function(){",
"  const g = GRID.g; if (!g || !g.ok) return null;",
"  const n = g.xs.length - 1, cwView = (g.xs[n] - g.xs[0]) / n, cellPx = cwView / g.sc;     // \u0e04\u0e27\u0e32\u0e21\u0e01\u0e27\u0e49\u0e32\u0e07\u0e0a\u0e48\u0e2d\u0e07\u0e43\u0e19\u0e23\u0e39\u0e1b\u0e08\u0e23\u0e34\u0e07 (\u0e1e\u0e34\u0e01\u0e40\u0e0b\u0e25)",
"  const [y0] = g.bands[0], y1 = g.bands[g.bands.length-1][1], x0 = g.xs[0], x1 = g.xs[n];",
"  // \u0e22\u0e48\u0e2d/\u0e02\u0e22\u0e32\u0e22\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e15\u0e32\u0e23\u0e32\u0e07\u0e43\u0e2b\u0e49\u0e0a\u0e48\u0e2d\u0e07\u0e01\u0e27\u0e49\u0e32\u0e07 24px \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e27\u0e31\u0e14\u0e04\u0e27\u0e32\u0e21\u0e04\u0e21\u0e41\u0e1a\u0e1a\u0e40\u0e14\u0e35\u0e22\u0e27\u0e01\u0e31\u0e19\u0e17\u0e38\u0e01\u0e23\u0e39\u0e1b",
"  const k = 24 / cwView, W = Math.round((x1 - x0) * k), H = Math.round((y1 - y0) * k);",
"  const c = gridCrop(x0, y0, x1 - x0, y1 - y0, W, H), p = c.getContext(\"2d\").getImageData(0, 0, W, H).data, L = new Float32Array(W*H);",
"  for (let j = 0; j < L.length; j++){ const i = j*4; L[j] = 0.3*p[i] + 0.59*p[i+1] + 0.11*p[i+2]; }",
"  let sum = 0, cnt = 0;",
"  for (let y = 1; y < H-1; y++) for (let x = 1; x < W-1; x++){ const j = y*W + x, lap = 4*L[j] - L[j-1] - L[j+1] - L[j-W] - L[j+W]; if (Math.abs(lap) > 8){ sum += lap*lap; cnt++; } }",
"  const sharp = cnt ? Math.sqrt(sum / cnt) : 0;",
"  // \u0e40\u0e07\u0e32: \u0e04\u0e27\u0e32\u0e21\u0e2a\u0e27\u0e48\u0e32\u0e07\u0e02\u0e2d\u0e07\u0e1e\u0e37\u0e49\u0e19\u0e02\u0e32\u0e27\u0e43\u0e19\u0e41\u0e15\u0e48\u0e25\u0e30\u0e2a\u0e48\u0e27\u0e19 (\u0e41\u0e1a\u0e48\u0e07 4x3) \u0e15\u0e48\u0e32\u0e07\u0e01\u0e31\u0e19\u0e41\u0e04\u0e48\u0e44\u0e2b\u0e19",
"  const zones = []; for (let zy = 0; zy < 3; zy++) for (let zx = 0; zx < 4; zx++){ const v = [];",
"    for (let y = Math.floor(zy*H/3); y < (zy+1)*H/3; y += 2) for (let x = Math.floor(zx*W/4); x < (zx+1)*W/4; x += 2) v.push(L[y*W + x]);",
"    v.sort((a, b) => a - b); zones.push(v[Math.floor(v.length*0.9)]); }",
"  const shade = Math.max(...zones) - Math.min(...zones);",
"  return JSON.stringify({ cellPx: Math.round(cellPx*10)/10, sharp: Math.round(sharp), tilt: Math.abs(g.angle || 0), shade: Math.round(shade), imgW: Math.round((GRID.img.naturalWidth || GRID.img.width)) });",
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
"  const nightNow = DATA.settings.autoDark !== false && allMyShifts().some(x => x.c === \"\u0e14\" && x.st <= now() && x.en > now());   // \u0e2d\u0e22\u0e39\u0e48\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01 \u2192 \u0e18\u0e35\u0e21\u0e21\u0e37\u0e14 \u0e44\u0e21\u0e48\u0e41\u0e2a\u0e1a\u0e15\u0e32",
"  const s = nightNow && ![\"dark\",\"satin\"].includes(t.style) ? STYLES.dark : STYLES[t.style] || STYLES.glass, p = PALETTES[t.palette] || PALETTES.sakura;",
"  ICON_SET = s.icons;",
"  $(\"themeVars\").textContent = `:root{--font:'${s.font}','Sukhumvit Set',system-ui,sans-serif;${s.v(p)}}` + (s.extra||\"\");",
"  const pos = [\"left:-90px;top:-60px\",\"right:-80px;top:220px\",\"left:-60px;top:560px\",\"right:-50px;bottom:-40px\"], sz = [300,260,280,220];",
"  $(\"decor\").innerHTML = s.blobs(p).map((c,i)=>`<div class=\"blob\" style=\"width:${sz[i]+80}px;height:${sz[i]+80}px;background:radial-gradient(circle closest-side,${c} 45%,${al(c,0)} 100%);${pos[i]}\"></div>`).join(\"\");",
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
"/* ===== \u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23 (\u0e1b\u0e23\u0e30\u0e01\u0e32\u0e28 \u0e04\u0e23\u0e21./\u0e18\u0e1b\u0e17.) ; \u0e1b\u0e35\u0e2d\u0e37\u0e48\u0e19\u0e43\u0e0a\u0e49\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e15\u0e32\u0e22\u0e15\u0e31\u0e27 ===== */",
"const HOL_FIX = {\"1-1\":\"\u0e27\u0e31\u0e19\u0e02\u0e36\u0e49\u0e19\u0e1b\u0e35\u0e43\u0e2b\u0e21\u0e48\",\"4-6\":\"\u0e27\u0e31\u0e19\u0e08\u0e31\u0e01\u0e23\u0e35\",\"4-13\":\"\u0e27\u0e31\u0e19\u0e2a\u0e07\u0e01\u0e23\u0e32\u0e19\u0e15\u0e4c\",\"4-14\":\"\u0e27\u0e31\u0e19\u0e2a\u0e07\u0e01\u0e23\u0e32\u0e19\u0e15\u0e4c\",\"4-15\":\"\u0e27\u0e31\u0e19\u0e2a\u0e07\u0e01\u0e23\u0e32\u0e19\u0e15\u0e4c\",\"5-1\":\"\u0e27\u0e31\u0e19\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19\",\"5-4\":\"\u0e27\u0e31\u0e19\u0e09\u0e31\u0e15\u0e23\u0e21\u0e07\u0e04\u0e25\",\"6-3\":\"\u0e27\u0e31\u0e19\u0e40\u0e09\u0e25\u0e34\u0e21\u0e2f \u0e1e\u0e23\u0e30\u0e23\u0e32\u0e0a\u0e34\u0e19\u0e35\",\"7-28\":\"\u0e27\u0e31\u0e19\u0e40\u0e09\u0e25\u0e34\u0e21\u0e2f \u0e23.10\",\"8-12\":\"\u0e27\u0e31\u0e19\u0e41\u0e21\u0e48\u0e41\u0e2b\u0e48\u0e07\u0e0a\u0e32\u0e15\u0e34\",\"10-13\":\"\u0e27\u0e31\u0e19\u0e19\u0e27\u0e21\u0e34\u0e19\u0e17\u0e23\u0e21\u0e2b\u0e32\u0e23\u0e32\u0e0a\",\"10-23\":\"\u0e27\u0e31\u0e19\u0e1b\u0e34\u0e22\u0e21\u0e2b\u0e32\u0e23\u0e32\u0e0a\",\"12-5\":\"\u0e27\u0e31\u0e19\u0e1e\u0e48\u0e2d\u0e41\u0e2b\u0e48\u0e07\u0e0a\u0e32\u0e15\u0e34\",\"12-10\":\"\u0e27\u0e31\u0e19\u0e23\u0e31\u0e10\u0e18\u0e23\u0e23\u0e21\u0e19\u0e39\u0e0d\",\"12-31\":\"\u0e27\u0e31\u0e19\u0e2a\u0e34\u0e49\u0e19\u0e1b\u0e35\"};",
"const HOL_YEAR = {",
"  2026: {\"1-2\":\"\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e1e\u0e34\u0e40\u0e28\u0e29\",\"3-3\":\"\u0e27\u0e31\u0e19\u0e21\u0e32\u0e06\u0e1a\u0e39\u0e0a\u0e32\",\"5-31\":\"\u0e27\u0e31\u0e19\u0e27\u0e34\u0e2a\u0e32\u0e02\u0e1a\u0e39\u0e0a\u0e32\",\"6-1\":\"\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e27\u0e31\u0e19\u0e27\u0e34\u0e2a\u0e32\u0e02\u0e1a\u0e39\u0e0a\u0e32\",\"6-2\":\"\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e1e\u0e34\u0e40\u0e28\u0e29\",\"7-29\":\"\u0e27\u0e31\u0e19\u0e2d\u0e32\u0e2a\u0e32\u0e2c\u0e2b\u0e1a\u0e39\u0e0a\u0e32\",\"7-30\":\"\u0e27\u0e31\u0e19\u0e40\u0e02\u0e49\u0e32\u0e1e\u0e23\u0e23\u0e29\u0e32\",\"12-7\":\"\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e27\u0e31\u0e19\u0e1e\u0e48\u0e2d\u0e41\u0e2b\u0e48\u0e07\u0e0a\u0e32\u0e15\u0e34\"},",
"  2027: {\"2-21\":\"\u0e27\u0e31\u0e19\u0e21\u0e32\u0e06\u0e1a\u0e39\u0e0a\u0e32\",\"2-22\":\"\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e27\u0e31\u0e19\u0e21\u0e32\u0e06\u0e1a\u0e39\u0e0a\u0e32\",\"5-3\":\"\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e27\u0e31\u0e19\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19\",\"5-20\":\"\u0e27\u0e31\u0e19\u0e27\u0e34\u0e2a\u0e32\u0e02\u0e1a\u0e39\u0e0a\u0e32\",\"7-18\":\"\u0e27\u0e31\u0e19\u0e2d\u0e32\u0e2a\u0e32\u0e2c\u0e2b\u0e1a\u0e39\u0e0a\u0e32\",\"7-19\":\"\u0e27\u0e31\u0e19\u0e40\u0e02\u0e49\u0e32\u0e1e\u0e23\u0e23\u0e29\u0e32 \u00b7 \u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e2d\u0e32\u0e2a\u0e32\u0e2c\u0e2b\u0e1a\u0e39\u0e0a\u0e32\",\"10-25\":\"\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e27\u0e31\u0e19\u0e1b\u0e34\u0e22\u0e21\u0e2b\u0e32\u0e23\u0e32\u0e0a\",\"12-6\":\"\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e27\u0e31\u0e19\u0e1e\u0e48\u0e2d\u0e41\u0e2b\u0e48\u0e07\u0e0a\u0e32\u0e15\u0e34\"}};",
"const LEAVES = [\"\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19\",\"\u0e1b\u0e48\u0e27\u0e22\",\"\u0e01\u0e34\u0e08\"];",
"const leaveOf = dt => (DATA.leave||{})[dk(dt)] || null;",
"function longBreaks(){      // \u0e2b\u0e22\u0e38\u0e14\u0e15\u0e34\u0e14\u0e01\u0e31\u0e19 3 \u0e27\u0e31\u0e19\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b (\u0e19\u0e31\u0e1a\u0e02\u0e49\u0e32\u0e21\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e44\u0e14\u0e49 \u0e16\u0e49\u0e32\u0e21\u0e35\u0e15\u0e32\u0e23\u0e32\u0e07\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e2d\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19)",
"  const R = []; let run = null;",
"  for (const k of Object.keys(DATA.months).sort()){",
"    const [y, m] = k.split(\"-\").map(Number), me = DATA.months[k].people[DATA.me]; if (!me) { run = null; continue; }",
"    for (let d=1; d<=new Date(y, m, 0).getDate(); d++){",
"      const dt = new Date(y, m-1, d);",
"      if (sortS(me[d]).length){ run = null; continue; }",
"      if (run && dt - run.en === 864e5) { run.en = dt; run.n++; } else { run = {st: dt, en: dt, n: 1}; R.push(run); }",
"    }",
"  }",
"  return R.filter(r => r.n >= 3);",
"}",
"const holOf = (y, m, d) => { const k = `${m+1}-${d}`; return (HOL_YEAR[y]||{})[k] || HOL_FIX[k] || null; };",
"const MONTHS = [\"\u0e21\u0e01\u0e23\u0e32\u0e04\u0e21\",\"\u0e01\u0e38\u0e21\u0e20\u0e32\u0e1e\u0e31\u0e19\u0e18\u0e4c\",\"\u0e21\u0e35\u0e19\u0e32\u0e04\u0e21\",\"\u0e40\u0e21\u0e29\u0e32\u0e22\u0e19\",\"\u0e1e\u0e24\u0e29\u0e20\u0e32\u0e04\u0e21\",\"\u0e21\u0e34\u0e16\u0e38\u0e19\u0e32\u0e22\u0e19\",\"\u0e01\u0e23\u0e01\u0e0e\u0e32\u0e04\u0e21\",\"\u0e2a\u0e34\u0e07\u0e2b\u0e32\u0e04\u0e21\",\"\u0e01\u0e31\u0e19\u0e22\u0e32\u0e22\u0e19\",\"\u0e15\u0e38\u0e25\u0e32\u0e04\u0e21\",\"\u0e1e\u0e24\u0e28\u0e08\u0e34\u0e01\u0e32\u0e22\u0e19\",\"\u0e18\u0e31\u0e19\u0e27\u0e32\u0e04\u0e21\"];",
"const MSH = [\"\u0e21.\u0e04.\",\"\u0e01.\u0e1e.\",\"\u0e21\u0e35.\u0e04.\",\"\u0e40\u0e21.\u0e22.\",\"\u0e1e.\u0e04.\",\"\u0e21\u0e34.\u0e22.\",\"\u0e01.\u0e04.\",\"\u0e2a.\u0e04.\",\"\u0e01.\u0e22.\",\"\u0e15.\u0e04.\",\"\u0e1e.\u0e22.\",\"\u0e18.\u0e04.\"];",
"const DOWF = [\"\u0e2d\u0e32\u0e17\u0e34\u0e15\u0e22\u0e4c\",\"\u0e08\u0e31\u0e19\u0e17\u0e23\u0e4c\",\"\u0e2d\u0e31\u0e07\u0e04\u0e32\u0e23\",\"\u0e1e\u0e38\u0e18\",\"\u0e1e\u0e24\u0e2b\u0e31\u0e2a\u0e1a\u0e14\u0e35\",\"\u0e28\u0e38\u0e01\u0e23\u0e4c\",\"\u0e40\u0e2a\u0e32\u0e23\u0e4c\"], DOWS = [\"\u0e2d\u0e32\",\"\u0e08\",\"\u0e2d\",\"\u0e1e\",\"\u0e1e\u0e24\",\"\u0e28\",\"\u0e2a\"];",
"const $ = id => document.getElementById(id);",
"const key = (y,m) => `${y}-${String(m+1).padStart(2,\"0\")}`;",
"const sortS = s => [...new Set((s||\"\").split(\"\").filter(c=>ORD[c]!=null))];   // \u0e40\u0e23\u0e35\u0e22\u0e07\u0e15\u0e32\u0e21\u0e15\u0e32\u0e23\u0e32\u0e07 \u0e1a\u0e19\u2192\u0e25\u0e48\u0e32\u0e07 = \u0e25\u0e33\u0e14\u0e31\u0e1a\u0e40\u0e27\u0e25\u0e32",
"function shiftStarts(y, m, d, s){ return sortS(s).map((c, i) => ({c, h: c === \"\u0e14\" && i > 0 ? 24 : SH[c].s})).sort((a, b) => a.h - b.h).map(x => ({c: x.c, st: new Date(y, m-1, +d, x.h)})); }   // \u0e14\u0e36\u0e01\u0e2b\u0e25\u0e31\u0e07\u0e40\u0e27\u0e23\u0e2d\u0e37\u0e48\u0e19 = 24:00, \u0e40\u0e0a\u0e49\u0e32/\u0e1a\u0e48\u0e32\u0e22\u0e2d\u0e22\u0e39\u0e48\u0e43\u0e19\u0e27\u0e31\u0e19\u0e19\u0e31\u0e49\u0e19",
"const hm = dt => `${String(dt.getHours()).padStart(2,\"0\")}:${String(dt.getMinutes()).padStart(2,\"0\")}`;",
"// \u0e0a\u0e37\u0e48\u0e2d/\u0e40\u0e27\u0e25\u0e32\u0e23\u0e27\u0e21\u0e02\u0e2d\u0e07\u0e0a\u0e48\u0e2d\u0e07 \u0e40\u0e0a\u0e48\u0e19 \"\u0e1a\u0e48\u0e32\u0e22 \u2192 \u0e14\u0e36\u0e01\" 16:00 \u2013 08:00",
"function seqInfo(y, m, d, s){ const L = shiftStarts(y, m, d, s); if (!L.length) return null;",
"  const en = new Date(L[L.length-1].st.getTime() + 8*3600e3), cont = L.every((x,i)=>!i || x.st - L[i-1].st === 8*3600e3);",
"  const e24 = (st, e) => hm(e) === \"00:00\" && e.getDate() !== st.getDate() ? \"24:00\" : hm(e) + (e.getDate() !== L[0].st.getDate() ? \" (\u0e40\u0e0a\u0e49\u0e32\u0e27\u0e31\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b)\" : \"\");",
"  const time = cont ? `${hm(L[0].st)} \u2013 ${e24(L[0].st, en)}` : L.map(x => `${x.st.getDate() !== L[0].st.getDate() ? \"24:00\" : hm(x.st)} \u2013 ${e24(x.st, new Date(x.st.getTime() + 8*3600e3))}`).join(\" \u0e41\u0e25\u0e30 \");",
"  return {L, cont, name: L.map(x=>SH[x.c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")).join(cont ? \" \u2192 \" : \" + \"), time}; }",
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
"    const [y,m] = k.split(\"-\").map(Number), me = md.people[DATA.me] || {}, R = (md.roles||{})[DATA.me] || {};",
"    for (const [d, s] of Object.entries(me)) for (const {c, st} of shiftStarts(y, m, d, s)) list.push({c, st, en:new Date(st.getTime()+8*3600e3), r:(R[d]||[])[sortS(s).indexOf(c)]||\"\"});",
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
"  const n = now(), blocks = [];     // \u0e40\u0e27\u0e23\u0e17\u0e35\u0e48\u0e15\u0e48\u0e2d\u0e01\u0e31\u0e19\u0e19\u0e31\u0e1a\u0e40\u0e1b\u0e47\u0e19\u0e01\u0e49\u0e2d\u0e19\u0e40\u0e14\u0e35\u0e22\u0e27 \u0e40\u0e0a\u0e48\u0e19 \u0e1a\u0e48\u0e32\u0e22 \u2192 \u0e14\u0e36\u0e01 16:00 \u2013 08:00",
"  for (const x of allMyShifts()){ const b = blocks[blocks.length-1]; if (b && x.st.getTime() === b.en.getTime()){ b.en = x.en; b.cs.push(x.c); b.rs.push(x.r); } else blocks.push({st:x.st, en:x.en, cs:[x.c], rs:[x.r]}); }",
"  const RN = {ic:\"In charge\", mb:\"member\", md:\"med\"};   // \u0e1b\u0e49\u0e32\u0e22\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48\u0e2a\u0e35\u0e2d\u0e48\u0e2d\u0e19 \u0e43\u0e15\u0e49\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e27\u0e23 (\u0e41\u0e1a\u0e1a B)",
"  const rp = b => { const L = b.cs.map((c, i) => b.rs[i] ? `<span class=\"rpill r${b.rs[i]}\">${b.cs.length > 1 ? SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\") + \" \u00b7 \" : \"\"}${RN[b.rs[i]]}</span>` : \"\").join(\"\"); return L ? `<div class=\"rpills\">${L}</div>` : \"\"; };",
"  const cur = blocks.find(x=>x.st<=n && x.en>n), nxt = blocks.find(x=>x.st>n);",
"  const nm = b => b.cs.length > 1 ? b.cs.map(c=>SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")).join(\" \u2192 \") : SH[b.cs[0]].n, tm = b => `${hm(b.st)} \u2013 ${hm(b.en)}${b.en.getDate()!==b.st.getDate()?\" (+1)\":\"\"}`;",
"  const orb = b => b.cs.length > 1 ? `<div class=\"orb\">${cute(SH[b.cs[0]].k,34)}${cute(SH[b.cs[b.cs.length-1]].k,34)}</div>` : `<div class=\"orb\">${cute(SH[b.cs[0]].k,46)}</div>`;",
"  let h;",
"  if (cur) h = `<div><p class=\"when\">\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2d\u0e22\u0e39\u0e48</p><p class=\"what\">${nm(cur)}</p>${rp(cur)}<p class=\"time\">${tm(cur)}</p><span class=\"cd\">${ic(\"timer\")}\u0e2d\u0e35\u0e01 ${dur(cur.en-n)} \u0e40\u0e25\u0e34\u0e01\u0e40\u0e27\u0e23</span></div>${orb(cur)}`;",
"  else if (nxt){",
"    const dd = dayDiff(n, nxt.st), when = dd===0?\"\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\":dd===1?\"\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49\":`${DOWF[nxt.st.getDay()]} ${nxt.st.getDate()} ${MSH[nxt.st.getMonth()]}`;",
"    h = `<div><p class=\"when\">\u0e40\u0e27\u0e23\u0e16\u0e31\u0e14\u0e44\u0e1b \u00b7 ${when}</p><p class=\"what\">${nm(nxt)}</p>${rp(nxt)}<p class=\"time\">${tm(nxt)}</p><span class=\"cd\">${ic(\"alarm\")}\u0e2d\u0e35\u0e01 ${dur(nxt.st-n)}</span></div>${orb(nxt)}`;",
"  } else h = `<div><p class=\"when\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e27\u0e23\u0e02\u0e49\u0e32\u0e07\u0e2b\u0e19\u0e49\u0e32</p><p class=\"what\">\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19\u0e40\u0e22\u0e2d\u0e30\u0e46 \u0e19\u0e30</p><p class=\"time\">\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22</p></div><div class=\"orb\">${cute(\"off\",44)}</div>`;",
"  $(\"hero\").innerHTML = h;",
"  const lb = longBreaks().find(r => r.en >= new Date(n.getFullYear(), n.getMonth(), n.getDate())), bn = $(\"brkNote\");   // \u0e19\u0e31\u0e1a\u0e16\u0e2d\u0e22\u0e2b\u0e25\u0e31\u0e07\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e22\u0e32\u0e27",
"  bn.style.display = lb ? \"\" : \"none\";",
"  if (lb){ const dd = dayDiff(n, lb.st), f = dt => `${dt.getDate()} ${MSH[dt.getMonth()]}`;",
"    bn.innerHTML = `<div class=\"notecard\">${cute(\"off\",30)}<div><p class=\"h3\" style=\"font-size:15px\">${dd <= 0 ? `\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2b\u0e22\u0e38\u0e14\u0e22\u0e32\u0e27 \u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e2d\u0e35\u0e01 ${dayDiff(n, lb.en)+1} \u0e27\u0e31\u0e19` : `\u0e2d\u0e35\u0e01 ${dd} \u0e27\u0e31\u0e19\u0e44\u0e14\u0e49\u0e2b\u0e22\u0e38\u0e14\u0e22\u0e32\u0e27 ${lb.n} \u0e27\u0e31\u0e19`} \ud83c\udf89</p><p class=\"t\">${f(lb.st)} \u2013 ${f(lb.en)}</p></div></div>`; }",
"  const t = noteOf(n), nb = $(\"todayNote\");",
"  nb.style.display = t ? \"\" : \"none\";",
"  if (t) nb.innerHTML = `<div class=\"notecard\">${cute(\"note\",30)}<div><p class=\"h3\" style=\"font-size:14px\">\u0e42\u0e19\u0e49\u0e15\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49</p><p class=\"t\">${esc(t)}</p></div></div>`;",
"}",
"",
"/* ===== \u0e14\u0e39\u0e41\u0e25\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07 ===== */",
"function myBlocks(){ const B = []; for (const x of allMyShifts()){ const b = B[B.length-1]; if (b && x.st.getTime() === b.en.getTime()){ b.en = x.en; b.cs.push(x.c); } else B.push({st:x.st, en:x.en, cs:[x.c]}); } return B; }",
"function renderCare(){",
"  const c = careS(), n = now(), B = myBlocks(), el = $(\"careCard\"); let h = \"\";",
"  const night = c.night && B.find(b => b.cs[0]===\"\u0e14\" && b.st > n && dayDiff(n, b.st) <= 2 && b.st - n < 36*36e5);",
"  if (night){",
"    const S = night.st.getTime(), at = ms => hm(new Date(S + ms)), H = Math.max(1, +c.waterH||2), w = [];",
"    for (let t = H; t*36e5 < night.en - night.st - 15*6e4; t += H) w.push(at(t*36e5));",
"    const dd = dayDiff(n, night.st), L = [",
"      [\"#9b8cff\", at(-10*36e5), `\u0e17\u0e32\u0e19\u0e02\u0e49\u0e32\u0e27\u0e21\u0e37\u0e49\u0e2d\u0e2b\u0e25\u0e31\u0e01\u0e01\u0e48\u0e2d\u0e19\u0e07\u0e35\u0e1a ${cute(\"rice\",22)}`], [\"#9b8cff\", `${at(-9*36e5)}\u2013${at(-6*36e5)}`, `\u0e07\u0e35\u0e1a 1.5\u20133 \u0e0a\u0e21. ${cute(\"nap\",22)}`],",
"      c.coffee ? [\"#c9a26b\", `\u0e2b\u0e25\u0e31\u0e07 ${at(-6*36e5)}`, `\u0e07\u0e14\u0e01\u0e32\u0e41\u0e1f ${cute(\"coffee\",22)}`] : null, [\"#ff9a6b\", at(-1.5*36e5), `\u0e01\u0e34\u0e19\u0e21\u0e37\u0e49\u0e2d\u0e40\u0e1a\u0e32\u0e46 \u0e01\u0e48\u0e2d\u0e19\u0e40\u0e02\u0e49\u0e32\u0e40\u0e27\u0e23 ${cute(\"snack\",22)}`],",
"      [null, at(0), `\u0e40\u0e02\u0e49\u0e32\u0e40\u0e27\u0e23${night.cs.map(x=>SH[x].n.replace(\"\u0e40\u0e27\u0e23\",\"\")).join(\"\u2192\")}`],",
"      c.water && w.length ? [\"#4fb3e8\", w.join(\" \u00b7 \"), `\u0e14\u0e37\u0e48\u0e21\u0e19\u0e49\u0e33 ${cute(\"water\",22)}`] : null,",
"      c.meal ? [\"#ff9a6b\", at(3*36e5), `\u0e02\u0e2d\u0e07\u0e27\u0e48\u0e32\u0e07 / \u0e21\u0e37\u0e49\u0e2d\u0e40\u0e25\u0e47\u0e01 ${cute(\"snack\",22)}`] : null,",
"      [\"#9b8cff\", hm(night.en), night.cs[night.cs.length-1]===\"\u0e14\" ? `\u0e40\u0e25\u0e34\u0e01\u0e40\u0e27\u0e23 \u2192 \u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e19\u0e2d\u0e19\u0e40\u0e25\u0e22 ${cute(\"bed\",22)}` : \"\u0e40\u0e25\u0e34\u0e01\u0e40\u0e27\u0e23\"]].filter(Boolean);",
"    h += `<p class=\"h3\" style=\"display:flex;align-items:center;gap:6px\">${dd<=1 ? \"\u0e04\u0e37\u0e19\u0e19\u0e35\u0e49\u0e21\u0e35\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01\" : \"\u0e04\u0e37\u0e19\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49\u0e21\u0e35\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01\"} ${cute(\"moon\",26)}</p><p class=\"hello\" style=\"font-size:13px\">${DOWF[night.st.getDay()]} ${night.st.getDate()} ${MSH[night.st.getMonth()]} \u00b7 \u0e15\u0e32\u0e23\u0e32\u0e07\u0e14\u0e39\u0e41\u0e25\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07</p>",
"      <div class=\"tl\">${L.map(([col, t, x]) => `<p${col?` style=\"--c:${col}\"`:\"\"}><b>${t}</b> ${x}</p>`).join(\"\")}</div>`;",
"  }",
"  el.style.display = h ? \"\" : \"none\"; el.innerHTML = h;",
"}",
"",
"/* ===== \u0e1b\u0e0f\u0e34\u0e17\u0e34\u0e19 ===== */",
"function countMonth(me, days){",
"  const c = {\"\u0e0a\":0,\"\u0e1a\":0,\"\u0e14\":0}; let off = 0;",
"  for (let d=1; d<=days; d++){ const s = sortS(me[d]); if (!s.length) off++; for (const x of s) c[x]++; }",
"  return {c, off, total:c[\"\u0e0a\"]+c[\"\u0e1a\"]+c[\"\u0e14\"]};",
"}",
"const chipsHTML = k => `<span class=\"chip m\">${ic(\"sun\")}\u0e40\u0e0a\u0e49\u0e32 ${k.c[\"\u0e0a\"]}</span><span class=\"chip a\">${ic(\"sunset\")}\u0e1a\u0e48\u0e32\u0e22 ${k.c[\"\u0e1a\"]}</span><span class=\"chip n\">${ic(\"moon\")}\u0e14\u0e36\u0e01 ${k.c[\"\u0e14\"]}</span><span class=\"chip o\">${ic(\"off\")}\u0e2b\u0e22\u0e38\u0e14 ${k.off}</span>`;",
"let LB = [];",
"function renderCal(){",
"  LB = longBreaks();",
"  const md = monthData(), me = mine(), f = firstDow(), days = daysIn();",
"  $(\"calTitle\").textContent = `${MONTHS[viewM]} ${viewY+543}`;",
"  let h = \"<div></div>\".repeat(f);",
"  for (let d=1; d<=days; d++){",
"    const s = sortS(me[d]), w = (f+d-1)%7, we = w===0||w===6;",
"    const n = now(), past = new Date(viewY, viewM, d) < new Date(n.getFullYear(), n.getMonth(), n.getDate());",
"    const ps = s.length ? `<div class=\"ics\">${s.map(c=>cute(SH[c].k, s.length>1?19:24)).join(\"\")}</div>` : (md ? `<div class=\"ics\" style=\"opacity:.75\">${cute(\"off\",17)}</div>` : \"\");",
"    const pin = noteOf(new Date(viewY, viewM, d)) ? `<span class=\"pin\">${CUTE.note}</span>` : \"\";",
"    const rl = ((md && md.roles && md.roles[DATA.me]) || {})[d] || [];   // \u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48: \u0e1f\u0e49\u0e32 In charge / \u0e2a\u0e49\u0e21 member / \u0e40\u0e02\u0e35\u0e22\u0e27 med",
"    const lvT = leaveOf(new Date(viewY, viewM, d)) ? \"\u0e25\u0e32\" : \"\", ab = s.map((c, i) => rl[i] ? `<i class=\"r${rl[i]}\">${c}</i>` : c).join(\"\") + (s.length && lvT ? \" \" : \"\") + lvT;   // \u0e15\u0e31\u0e27\u0e22\u0e48\u0e2d\u0e40\u0e27\u0e23\u0e43\u0e15\u0e49\u0e44\u0e2d\u0e04\u0e2d\u0e19 \u0e40\u0e0a\u0e48\u0e19 \u0e0a\u0e14 \u0e1a\u0e14",
"    const lb = LB.some(r => new Date(viewY, viewM, d) >= r.st && new Date(viewY, viewM, d) <= r.en);",
"    h += `<div class=\"d ${s.length?\"h\":\"\"} ${lb?\"lb\":\"\"} ${holOf(viewY,viewM,d)?\"hol\":\"\"} ${isToday(d)?\"t\":\"\"} ${past&&!isToday(d)?\"past\":\"\"} ${selDay===d?\"sel\":\"\"}\" onclick=\"openDay(${d})\"><span class=\"nn ${we?\"we\":\"\"}\">${d}</span>${ps}${ab?`<span class=\"ab${lvT?\" lvt\":\"\"}\">${ab}</span>`:\"\"}${pin}</div>`;",
"  }",
"  $(\"days\").innerHTML = h;",
"  const hasR = md && md.roles && Object.keys(md.roles[DATA.me]||{}).length;",
"  $(\"chips\").innerHTML = md ? chipsHTML(countMonth(me, days)) + (hasR ? `<div class=\"rolek\" style=\"width:100%\"><span><b style=\"color:#2F7BE0\">\u0e1f\u0e49\u0e32</b> In charge</span><span><b style=\"color:#E8742A\">\u0e2a\u0e49\u0e21</b> member</span><span><b style=\"color:#23A05A\">\u0e40\u0e02\u0e35\u0e22\u0e27</b> med</span></div>` : \"\") : `<p class=\"note\" style=\"width:100%\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49 \u0e01\u0e14 \"\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e40\u0e27\u0e23\" \u0e44\u0e14\u0e49\u0e40\u0e25\u0e22</p>`;",
"}",
"function moveMonth(n){ viewM += n; if (viewM<0){viewM=11;viewY--} if (viewM>11){viewM=0;viewY++} selDay=null; frDay=null; renderAll(); }",
"let tx = null;",
"$(\"calCard\").addEventListener(\"touchstart\", e=>tx=e.touches[0].clientX, {passive:true});",
"$(\"calCard\").addEventListener(\"touchend\", e=>{ if (tx==null) return; const dx = e.changedTouches[0].clientX-tx; if (Math.abs(dx)>60) moveMonth(dx<0?1:-1); tx=null; });",
"",
"/* ===== \u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e27\u0e31\u0e19 + \u0e41\u0e01\u0e49\u0e40\u0e27\u0e23 ===== */",
"let editSet = \"\";",
"function openDay(d){",
"  selDay = d; renderCal(); LEAVE_SEL = leaveOf(new Date(viewY, viewM, d)) || \"\";",
"  const md = monthData(), s = sortS(mine()[d]), dt = new Date(viewY, viewM, d), seq = seqInfo(viewY, viewM+1, d, s.join(\"\"));",
"  editSet = s.join(\"\");",
"  const rl0 = ((md && md.roles && md.roles[DATA.me]) || {})[d] || []; EDROLE = {}; s.forEach((c, i) => { if (rl0[i]) EDROLE[c] = rl0[i]; });",
"  const tOf = c => { const x = seq.L.find(z=>z.c===c), e = new Date(x.st.getTime()+8*3600e3), eh = hm(e); return `${x.st.getDate()!==d?\"24:00\":hm(x.st)} \u2013 ${eh===\"00:00\"?\"24:00\":eh}${e.getDate()!==d && eh!==\"00:00\"?\" (\u0e40\u0e0a\u0e49\u0e32\u0e27\u0e31\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b)\":\"\"}`; };",
"  let rows = (seq && s.length > 1 ? `<div class=\"seqh\">${ic(\"timer\")}<b>${seq.name}</b><span>${seq.time}${seq.cont?\" \u00b7 \u0e17\u0e33\u0e15\u0e48\u0e2d\u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\":\"\"}</span></div>` : \"\") + s.map(c=>{",
"    const mates = md ? Object.entries(md.people).filter(([n,v])=>n!==DATA.me && (v[d]||\"\").includes(c)).map(([n])=>first(n)) : [];",
"    const acts = md && Object.keys(md.people).length > 1 ? `<div class=\"sact\"><button onclick=\"openAct(${d},'swap','${c}')\">${ic(\"users\")}\u0e02\u0e2d\u0e41\u0e25\u0e01</button><button onclick=\"openAct(${d},'sell','${c}')\">${ic(\"share\")}\u0e02\u0e32\u0e22 / \u0e2b\u0e32\u0e04\u0e19\u0e41\u0e17\u0e19</button></div>` : \"\";",
"    return `<div class=\"srow ${SH[c].c}\">${cute(SH[c].k,40)}<div style=\"flex:1\"><p class=\"nm\">${SH[c].n}</p><p class=\"tm\">${tOf(c)}</p>${mates.length?`<p class=\"mates\">\u0e2d\u0e22\u0e39\u0e48\u0e14\u0e49\u0e27\u0e22\u0e01\u0e31\u0e19: ${mates.join(\", \")}</p>`:\"\"}${acts}</div></div>`;",
"  }).join(\"\");",
"  if (!s.length) rows = `<div class=\"srow o\">${cute(\"off\",38)}<div><p class=\"nm\">\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14</p><p class=\"tm\">\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19\u0e43\u0e2b\u0e49\u0e40\u0e15\u0e47\u0e21\u0e17\u0e35\u0e48\u0e19\u0e30</p></div></div>`;",
"  const warn = restIssues().filter(w => w.kind !== \"run\" && sameDay(w.d, dt));",
"  if (warn.length) rows += `<div class=\"restw\">${ic(\"warn\")}<div>${warn.map(w=>esc(w.t)).join(\"<br>\")}<br><span>\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19\u0e43\u0e2b\u0e49\u0e1e\u0e2d \u0e14\u0e37\u0e48\u0e21\u0e19\u0e49\u0e33\u0e40\u0e22\u0e2d\u0e30\u0e46 \u0e19\u0e30</span></div></div>`;",
"  rows += tradeRows(d);",
"  if (md && Object.keys(md.people).length > 1 && s.length < 3) rows += `<button class=\"buyb\" onclick=\"openAct(${d},'buy')\">${ic(\"work\")}\u0e0b\u0e37\u0e49\u0e2d\u0e40\u0e27\u0e23 (\u0e02\u0e36\u0e49\u0e19\u0e41\u0e17\u0e19\u0e04\u0e19\u0e2d\u0e37\u0e48\u0e19)</button>`;",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div>",
"    <h2 class=\"big\" style=\"font-size:22px\">${DOWF[dt.getDay()]} ${d} ${MONTHS[viewM]}</h2>",
"    <p class=\"hello\" style=\"margin-bottom:12px\">${isToday(d)?\"\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\":`${MONTHS[viewM]} ${viewY+543}`}</p>${holOf(viewY,viewM,d)?`<div class=\"holb\">${ic(\"party\")}${holOf(viewY,viewM,d)} \u00b7 \u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23${s.length?\" (\u0e21\u0e35\u0e40\u0e27\u0e23)\":\"\"}</div>`:\"\"}${rows}",
"    <p class=\"h3\" style=\"margin-top:18px;display:flex;align-items:center;gap:6px\">${cute(\"note\",24)}\u0e42\u0e19\u0e49\u0e15</p>",
"    <textarea class=\"notebox\" id=\"noteText\" placeholder=\"\u0e08\u0e14\u0e2d\u0e30\u0e44\u0e23\u0e01\u0e47\u0e44\u0e14\u0e49 \u0e40\u0e0a\u0e48\u0e19 \u0e41\u0e25\u0e01\u0e40\u0e27\u0e23 \u0e19\u0e31\u0e14\u0e2b\u0e21\u0e2d \u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e2d\u0e07\" style=\"margin-top:8px\">${esc(noteOf(dt))}</textarea>",
"    <div class=\"qchips\">${[\"\u0e41\u0e25\u0e01\u0e40\u0e27\u0e23\",\"OT\",\"\u0e25\u0e32\",\"\u0e19\u0e31\u0e14\u0e2b\u0e21\u0e2d\",\"\u0e27\u0e31\u0e19\u0e40\u0e01\u0e34\u0e14\",\"\u0e1b\u0e23\u0e30\u0e0a\u0e38\u0e21\"].map(q=>`<button class=\"qchip\" onclick=\"addQuick('${q}')\">+ ${q}</button>`).join(\"\")}</div>",
"    <p class=\"h3\" style=\"margin-top:14px\">\u0e27\u0e31\u0e19\u0e25\u0e32</p>",
"    <div class=\"lvb\">${LEAVES.map(t=>`<button class=\"${leaveOf(dt)===t?\"on\":\"\"}\" onclick=\"pickLeave(this,'${t}')\">\u0e25\u0e32${t}</button>`).join(\"\")}</div>",
"    <details class=\"editd\"${s.length?\"\":\" open\"}><summary>${ic(\"edit\")}\u0e41\u0e01\u0e49\u0e40\u0e27\u0e23\u0e40\u0e2d\u0e07 <span>(\u0e43\u0e0a\u0e49\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e15\u0e32\u0e23\u0e32\u0e07\u0e2d\u0e48\u0e32\u0e19\u0e1c\u0e34\u0e14 \u0e2b\u0e23\u0e37\u0e2d\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e40\u0e27\u0e23)</span></summary>",
"    <div class=\"tog\">${[\"\u0e14\",\"\u0e0a\",\"\u0e1a\"].map(c=>`<button class=\"c${SH[c].c} ${editSet.includes(c)?\"on\":\"\"}\" onclick=\"togEdit('${c}',this)\">${cute(SH[c].k,24)} ${SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")}</button>`).join(\"\")}</div>",
"    <div id=\"roleEd\">${roleEdHTML()}</div>",
"    <label class=\"trail\"><input type=\"checkbox\" id=\"trailN\" ${s.length>1&&s[s.length-1]===\"\u0e14\"?\"checked\":\"\"}> \u0e14\u0e36\u0e01\u0e15\u0e48\u0e2d\u0e17\u0e49\u0e32\u0e22 (\u0e40\u0e02\u0e49\u0e32\u0e40\u0e17\u0e35\u0e48\u0e22\u0e07\u0e04\u0e37\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e40\u0e27\u0e23\u0e2d\u0e37\u0e48\u0e19 \u0e40\u0e0a\u0e48\u0e19 \u0e1a\u0e48\u0e32\u0e22 \u2192 \u0e14\u0e36\u0e01)</label>",
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
"function togEdit(c, el){ editSet = editSet.includes(c) ? editSet.replace(c,\"\") : editSet + c; el.classList.toggle(\"on\"); $(\"roleEd\").innerHTML = roleEdHTML(); }",
"let EDROLE = {};       // \u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e2d\u0e07\u0e15\u0e2d\u0e19\u0e41\u0e01\u0e49\u0e40\u0e27\u0e23: { \"\u0e1a\": \"mb\", ... }",
"const ROLES = [[\"\",\"\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\"],[\"ic\",\"In charge\"],[\"mb\",\"member\"],[\"md\",\"med\"]];",
"function roleEdHTML(){",
"  const L = [\"\u0e14\",\"\u0e0a\",\"\u0e1a\"].filter(c => editSet.includes(c));",
"  return L.length ? `<p class=\"lbl\" style=\"margin:2px 0 6px\">\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48 (\u0e2a\u0e35\u0e43\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07)</p>` + L.map(c => `<div class=\"rrow\"><span>${SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")}</span>${ROLES.map(([r, t]) => `<button class=\"rb r${r||\"0\"} ${(EDROLE[c]||\"\")===r?\"on\":\"\"}\" onclick=\"pickRole('${c}','${r}')\">${t}</button>`).join(\"\")}</div>`).join(\"\") : \"\";",
"}",
"function pickRole(c, r){ if (r) EDROLE[c] = r; else delete EDROLE[c]; $(\"roleEd\").innerHTML = roleEdHTML(); }",
"let LEAVE_SEL;",
"function pickLeave(el, t){ LEAVE_SEL = LEAVE_SEL === t ? \"\" : t; el.parentNode.querySelectorAll(\"button\").forEach(b => b.classList.toggle(\"on\", b === el && LEAVE_SEL === t)); }",
"function saveDay(d){",
"  const k = key(viewY,viewM);",
"  if (!DATA.months[k]) DATA.months[k] = {people:{}, totals:{}};",
"  const me = DATA.months[k].people[DATA.me] = DATA.months[k].people[DATA.me] || {};",
"  let v = [\"\u0e14\",\"\u0e0a\",\"\u0e1a\"].filter(c=>editSet.includes(c));      // \u0e40\u0e23\u0e35\u0e22\u0e07\u0e15\u0e32\u0e21\u0e40\u0e27\u0e25\u0e32 \u0e14\u0e36\u0e01 00:00 \u0e01\u0e48\u0e2d\u0e19 \u0e40\u0e27\u0e49\u0e19\u0e41\u0e15\u0e48\u0e15\u0e34\u0e4a\u0e01 \"\u0e14\u0e36\u0e01\u0e15\u0e48\u0e2d\u0e17\u0e49\u0e32\u0e22\"",
"  if ($(\"trailN\") && $(\"trailN\").checked && v.length > 1 && v[0] === \"\u0e14\") v = v.slice(1).concat(\"\u0e14\");",
"  const R = ((DATA.months[k].roles = DATA.months[k].roles || {})[DATA.me] = DATA.months[k].roles[DATA.me] || {}), rr = v.map(c => EDROLE[c] || \"\");   // \u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48\u0e15\u0e32\u0e21\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01 \u0e40\u0e23\u0e35\u0e22\u0e07\u0e15\u0e32\u0e21\u0e15\u0e31\u0e27\u0e40\u0e27\u0e23",
"  if (rr.some(Boolean)) R[d] = rr; else delete R[d];",
"  v = v.join(\"\");",
"  if (v) me[d] = v; else delete me[d];",
"  send(\"saveMonth\", {key:k, month:DATA.months[k]});",
"  const date = dk(new Date(viewY, viewM, d)), text = ($(\"noteText\") ? $(\"noteText\").value : \"\").trim();",
"  DATA.notes = DATA.notes || {};",
"  if (text !== ((DATA.notes[date]||\"\").trim())){ if (text) DATA.notes[date] = text; else delete DATA.notes[date]; send(\"saveNote\", {date, text}); }",
"  if (LEAVE_SEL !== undefined && LEAVE_SEL !== (leaveOf(new Date(viewY, viewM, d)) || \"\")){ DATA.leave = DATA.leave || {}; if (LEAVE_SEL) DATA.leave[date] = LEAVE_SEL; else delete DATA.leave[date]; send(\"saveLeave\", {date, type: LEAVE_SEL}); }",
"  closeSheet(); renderAll(); toast(\"\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e25\u0e49\u0e27\");",
"}",
"function openSheet(){",
"  const sh = $(\"sheet\");",
"  sh.style.transform = \"\"; sh.scrollTop = 0; $(\"mask\").classList.add(\"on\"); sh.classList.add(\"on\");",
"  if (!document.body.classList.contains(\"lock\")){ LOCKY = window.scrollY; document.body.style.top = -LOCKY + \"px\"; document.body.classList.add(\"lock\"); }   // \u0e25\u0e47\u0e2d\u0e01\u0e2b\u0e19\u0e49\u0e32\u0e02\u0e49\u0e32\u0e07\u0e2b\u0e25\u0e31\u0e07\u0e44\u0e21\u0e48\u0e43\u0e2b\u0e49\u0e40\u0e25\u0e37\u0e48\u0e2d\u0e19",
"}",
"let LOCKY = 0;",
"function unlockBody(){ if (!document.body.classList.contains(\"lock\")) return; document.body.classList.remove(\"lock\"); document.body.style.top = \"\"; window.scrollTo(0, LOCKY); }",
"/* \u0e25\u0e32\u0e01\u0e41\u0e1c\u0e48\u0e19\u0e25\u0e48\u0e32\u0e07\u0e25\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1b\u0e34\u0e14 */",
"(() => {",
"  const sh = $(\"sheet\"); let y0 = null, dy = 0;",
"  sh.addEventListener(\"touchstart\", e => { if (sh.scrollTop > 0 || e.target.closest(\"textarea,input,select\")) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, {passive:true});",
"  sh.addEventListener(\"touchmove\", e => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0){ sh.style.transition = \"none\"; sh.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); } }, {passive:false});",
"  sh.addEventListener(\"touchend\", () => { if (y0 == null) return; sh.style.transition = \"\"; if (dy > 90) closeSheet(); else sh.style.transform = \"\"; y0 = null; dy = 0; });",
"})();",
"function closeSheet(){ $(\"mask\").classList.remove(\"on\"); $(\"sheet\").classList.remove(\"on\"); $(\"sheet\").style.transform = \"\"; unlockBody(); selDay=null; renderCal(); }",
"",
"/* ===== \u0e2a\u0e23\u0e38\u0e1b ===== */",
"let SUMMODE = \"m\";",
"function setSumMode(m){ SUMMODE = m; renderSum(); window.scrollTo(0,0); }",
"function sumMove(n){ if (SUMMODE === \"y\"){ viewY += n; selDay = null; renderAll(); } else moveMonth(n); }",
"function yearStats(y){        // \u0e43\u0e0a\u0e49\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e2a\u0e23\u0e38\u0e1b\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35\u0e41\u0e25\u0e30\u0e23\u0e39\u0e1b\u0e41\u0e0a\u0e23\u0e4c\u0e2a\u0e23\u0e38\u0e1b\u0e1b\u0e35",
"  const per = [], rc = {ic:0, mb:0, md:0};",
"  let tot = {\"\u0e0a\":0,\"\u0e1a\":0,\"\u0e14\":0}, ot = 0, hs = 0, months = 0;",
"  for (let m=0; m<12; m++){",
"    const md = DATA.months[key(y,m)], me = md ? (md.people[DATA.me]||{}) : null;",
"    if (!me){ per.push(null); continue; }",
"    months++;",
"    const days = new Date(y, m+1, 0).getDate(), k = countMonth(me, days);",
"    for (const c of [\"\u0e0a\",\"\u0e1a\",\"\u0e14\"]) tot[c] += k.c[c];",
"    const wk = md.work ? md.work[DATA.me] : null; if (wk != null && k.total > wk) ot += k.total - wk;",
"    for (let d=1; d<=days; d++) if (holOf(y, m, d)) hs += sortS(me[d]).length;",
"    for (const r of Object.values((md.roles||{})[DATA.me]||{}).flat()) if (r in rc) rc[r]++;",
"    per.push(k);",
"  }",
"  const blocks = []; for (const x of allMyShifts()){ if (x.st.getFullYear() !== y) continue; const b = blocks[blocks.length-1]; if (b && x.st.getTime() === b.en.getTime()) b.en = x.en; else blocks.push({st:x.st, en:x.en}); }",
"  const long = blocks.filter(b => b.en - b.st >= 16*36e5).length, total = tot[\"\u0e0a\"]+tot[\"\u0e1a\"]+tot[\"\u0e14\"];",
"  const hv = per.reduce((a, k, m) => k && (!a || k.total > a.k.total) ? {k, m} : a, null);",
"  return {per, tot, ot, hs, months, long, total, hv, rc, off: per.reduce((a,k)=>a+(k?k.off:0),0)};",
"}",
"const RLN = {ic:\"In charge\", mb:\"member\", md:\"med\"}, RLC = {ic:\"#2F7BE0\", mb:\"#E8742A\", md:\"#23A05A\"};",
"const roleLines = rc => rc.ic + rc.mb + rc.md ? `<p class=\"h3\" style=\"margin:14px 0 4px\">\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48</p>` + [\"ic\",\"mb\",\"md\"].map(r=>`<div class=\"li\"><span><b style=\"color:${RLC[r]}\">\u25cf</b> ${RLN[r]}</span><b>${rc[r]} \u0e40\u0e27\u0e23</b></div>`).join(\"\") : \"\";",
"function renderYear(){",
"  const y = viewY, tr = trades().filter(t=>t.date.startsWith(y+\"-\")), {per, tot, ot, hs, months, long, total, hv, rc, off} = yearStats(y);",
"  $(\"sumTitle\").textContent = `\u0e1b\u0e35 ${y+543}`; $(\"sumH\").textContent = \"\u0e2a\u0e23\u0e38\u0e1b\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35\"; $(\"sumShare\").style.display = months ? \"\" : \"none\"; $(\"sumShare\").lastChild.textContent = \"\u0e41\u0e0a\u0e23\u0e4c\u0e2a\u0e23\u0e38\u0e1b\u0e1b\u0e35\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e23\u0e39\u0e1b\";",
"  if (!months){ $(\"sumStats\").innerHTML = \"\"; $(\"sumBar\").parentNode.style.display = \"none\"; $(\"sumList\").innerHTML = `<p class=\"note\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e15\u0e32\u0e23\u0e32\u0e07\u0e02\u0e2d\u0e07\u0e1b\u0e35\u0e19\u0e35\u0e49</p>`; return; }",
"  $(\"sumStats\").innerHTML = `",
"    <div class=\"stat\" style=\"background:var(--tint);color:var(--title)\"><p class=\"k\">${ic(\"work\")}\u0e40\u0e27\u0e23\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35</p><p class=\"v\">${total}</p></div>",
"    <div class=\"stat m\"><p class=\"k\">${ic(\"timer\")}\u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07\u0e07\u0e32\u0e19</p><p class=\"v\">${(total*8).toLocaleString(\"th-TH\")}</p></div>",
"    <div class=\"stat n\"><p class=\"k\">${ic(\"double\")}\u0e40\u0e27\u0e23 OT</p><p class=\"v\">${ot}</p></div>",
"    <div class=\"stat o\"><p class=\"k\">${ic(\"party\")}\u0e40\u0e27\u0e23\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23</p><p class=\"v\">${hs}</p></div>`;",
"  const mx = Math.max(1, ...per.map(k => k ? k.total : 0));",
"  $(\"sumBar\").parentNode.style.display = \"\";",
"  $(\"sumBar\").parentNode.innerHTML = `<p class=\"h3\" style=\"margin-bottom:6px\">\u0e40\u0e27\u0e23\u0e15\u0e48\u0e2d\u0e40\u0e14\u0e37\u0e2d\u0e19</p><div class=\"bar\" id=\"sumBar\" style=\"display:none\"></div>",
"    <div class=\"ych\">${per.map(k => k ? `<div class=\"b\" style=\"height:${k.total/mx*100}%\">${[\"\u0e0a\",\"\u0e1a\",\"\u0e14\"].map(c=>`<span style=\"flex:${k.c[c]};background:var(--${SH[c].c}Fg)\"></span>`).join(\"\")}</div>` : `<div class=\"b\" style=\"height:2px;background:var(--line)\"></div>`).join(\"\")}</div>",
"    <div class=\"ylb\">${MSH.map(m=>`<span>${m.replace(/\\./g,\"\")}</span>`).join(\"\")}</div>",
"    <div class=\"chips\" id=\"sumLegend\">${[\"\u0e0a\",\"\u0e1a\",\"\u0e14\"].map(c=>`<span class=\"chip ${SH[c].c}\">${ic(SH[c].i)}${SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")} ${tot[c]}</span>`).join(\"\")}</div>`;",
"  const buy = tr.filter(t=>t.type===\"buy\"), sell = tr.filter(t=>t.type===\"sell\"), net = buy.reduce((a,t)=>a+(+t.price||0),0) - sell.reduce((a,t)=>a+(+t.price||0),0);",
"  $(\"sumList\").innerHTML = `<p class=\"h3\" style=\"margin-bottom:4px\">\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21\u0e1b\u0e35 ${y+543}</p>",
"    <div class=\"li\"><span>${ic(\"cal\")}\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e21\u0e35\u0e15\u0e32\u0e23\u0e32\u0e07</span><b>${months} \u0e40\u0e14\u0e37\u0e2d\u0e19</b></div>",
"    ${hv?`<div class=\"li\"><span>${ic(\"work\")}\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e31\u0e01\u0e2a\u0e38\u0e14</span><b>${MONTHS[hv.m]} \u00b7 ${hv.k.total} \u0e40\u0e27\u0e23</b></div>`:\"\"}",
"    <div class=\"li\"><span>${ic(\"double\")}\u0e04\u0e27\u0e1a 16 \u0e0a\u0e21.\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b</span><b>${long} \u0e04\u0e23\u0e31\u0e49\u0e07</b></div>",
"    <div class=\"li\"><span>${ic(\"moon\")}\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35</span><b>${tot[\"\u0e14\"]} \u0e04\u0e37\u0e19</b></div>",
"    <div class=\"li\"><span>${ic(\"off\")}\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e27\u0e21</span><b>${off} \u0e27\u0e31\u0e19</b></div>",
"    ${roleLines(rc)}",
"    ${leaveList(y, null)}",
"    ${tr.length?`<div class=\"li\"><span>${ic(\"work\")}\u0e0b\u0e37\u0e49\u0e2d\u0e40\u0e27\u0e23 / \u0e02\u0e32\u0e22\u0e40\u0e27\u0e23</span><b>${buy.length} / ${sell.length}</b></div><div class=\"li\"><span>${ic(\"check\")}\u0e40\u0e07\u0e34\u0e19\u0e0b\u0e37\u0e49\u0e2d-\u0e02\u0e32\u0e22\u0e2a\u0e38\u0e17\u0e18\u0e34</span><b>${net>=0?\"+\":\"\u2212\"}${baht(Math.abs(net))}</b></div>`:\"\"}`;",
"}",
"function renderSum(){",
"  $(\"segM\").classList.toggle(\"on\", SUMMODE===\"m\"); $(\"segY\").classList.toggle(\"on\", SUMMODE===\"y\");",
"  if (SUMMODE === \"y\") return renderYear();",
"  $(\"sumH\").textContent = \"\u0e2a\u0e23\u0e38\u0e1b\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49\"; $(\"sumShare\").style.display = \"\"; $(\"sumShare\").lastChild.textContent = \"\u0e41\u0e0a\u0e23\u0e4c\u0e2a\u0e23\u0e38\u0e1b\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e23\u0e39\u0e1b (\u0e2a\u0e48\u0e07 LINE \u0e44\u0e14\u0e49)\";",
"  restoreSumBar();",
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
"    ${roleLines(Object.values((md.roles||{})[DATA.me]||{}).flat().reduce((a,r)=>(r in a && a[r]++, a), {ic:0, mb:0, md:0}))}",
"    ${breakList()}",
"    ${leaveList(viewY, viewM)}",
"    ${holList(me, days)}",
"    ${tradeSummary()}",
"    ${rest.length?`<p class=\"h3\" style=\"margin:14px 0 4px\">\u0e04\u0e27\u0e23\u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19</p>${rest.map(w=>`<div class=\"li\"><span>${ic(\"warn\")}${esc(w.t)}</span></div>`).join(\"\")}`:\"\"}`;",
"}",
"",
"function restoreSumBar(){ const c = ($(\"sumBar\")||{}).parentNode || document.querySelector(\"#p-sum .card\"); c.style.display = \"\"; c.innerHTML = `<p class=\"h3\" style=\"margin-bottom:10px\">\u0e2a\u0e31\u0e14\u0e2a\u0e48\u0e27\u0e19\u0e40\u0e27\u0e23</p><div class=\"bar\" id=\"sumBar\"></div><div class=\"chips\" id=\"sumLegend\"></div>`; }",
"function breakList(){",
"  const L = longBreaks().filter(r => (r.st.getFullYear()===viewY && r.st.getMonth()===viewM) || (r.en.getFullYear()===viewY && r.en.getMonth()===viewM));",
"  if (!L.length) return \"\";",
"  const f = dt => `${dt.getDate()} ${MSH[dt.getMonth()]}`;",
"  return `<p class=\"h3\" style=\"margin:14px 0 4px\">\u0e2b\u0e22\u0e38\u0e14\u0e22\u0e32\u0e27 (3 \u0e27\u0e31\u0e19\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b)</p>` + L.map(r=>`<div class=\"li\"><span>${ic(\"beach\")}${f(r.st)} \u2013 ${f(r.en)}</span><b>${r.n} \u0e27\u0e31\u0e19</b></div>`).join(\"\");",
"}",
"function leaveList(y, m){       // m = null \u2192 \u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35",
"  const pre = m == null ? `${y}-` : `${key(y, m)}-`, c = {}; let n = 0;",
"  for (const [k, t] of Object.entries(DATA.leave||{})) if (k.startsWith(pre)){ c[t] = (c[t]||0) + 1; n++; }",
"  if (!n) return \"\";",
"  return `<p class=\"h3\" style=\"margin:14px 0 4px\">\u0e27\u0e31\u0e19\u0e25\u0e32${m == null ? \"\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35\" : \"\"} \u00b7 ${n} \u0e27\u0e31\u0e19</p>` + LEAVES.filter(t=>c[t]).map(t=>`<div class=\"li\"><span>${ic(\"list\")}\u0e25\u0e32${t}</span><b>${c[t]} \u0e27\u0e31\u0e19</b></div>`).join(\"\");",
"}",
"function holList(me, days){",
"  const L = []; for (let d=1; d<=days; d++){ const h = holOf(viewY, viewM, d); if (h) L.push({d, h, s: sortS(me[d])}); }",
"  if (!L.length) return \"\";",
"  const on = L.filter(x=>x.s.length);",
"  return `<p class=\"h3\" style=\"margin:14px 0 4px\">\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23 \u00b7 \u0e21\u0e35\u0e40\u0e27\u0e23 ${on.length} \u0e08\u0e32\u0e01 ${L.length} \u0e27\u0e31\u0e19</p>` +",
"    L.map(x=>`<div class=\"li\"><span class=\"hn\">${ic(\"party\")}${x.d} ${MSH[viewM]} \u00b7 ${x.h}</span><b>${x.s.length ? x.s.map(c=>SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\")).join(\"+\") : \"\u0e2b\u0e22\u0e38\u0e14\"}</b></div>`).join(\"\");",
"}",
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
"const FRSTAT = {};   // \u0e2a\u0e16\u0e32\u0e19\u0e30\u0e2d\u0e48\u0e32\u0e19\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e40\u0e1a\u0e37\u0e49\u0e2d\u0e07\u0e2b\u0e25\u0e31\u0e07 \u0e15\u0e48\u0e2d\u0e40\u0e14\u0e37\u0e2d\u0e19",
"window.friendsDone = (k, n, err) => { FRSTAT[k] = {busy:false, n, err}; if (err) toastErr(\"\u0e2d\u0e48\u0e32\u0e19\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08: \" + err); else toast(`\u0e44\u0e14\u0e49\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e41\u0e25\u0e49\u0e27 ${n} \u0e04\u0e19`); renderFr(); };",
"function renderFr(){",
"  const md = monthData(), days = daysIn(), f = firstDow(), st = FRSTAT[key(viewY, viewM)];",
"  $(\"frStat\").innerHTML = st && st.busy ? `<div class=\"msg\">${ic(\"timer\")}<span>\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2d\u0e48\u0e32\u0e19\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e08\u0e32\u0e01\u0e23\u0e39\u0e1b (\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 1\u20132 \u0e19\u0e32\u0e17\u0e35) \u0e2d\u0e22\u0e48\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e07\u0e1b\u0e34\u0e14\u0e41\u0e2d\u0e1b\u0e19\u0e30</span></div>` : st && st.err ? `<div class=\"msg o\">${ic(\"warn\")}<span>\u0e2d\u0e48\u0e32\u0e19\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08: ${st.err}<br>\u0e25\u0e2d\u0e07\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e15\u0e32\u0e23\u0e32\u0e07\u0e43\u0e2b\u0e21\u0e48 \u0e41\u0e25\u0e49\u0e27\u0e40\u0e1b\u0e34\u0e14\u0e41\u0e2d\u0e1b\u0e04\u0e49\u0e32\u0e07\u0e44\u0e27\u0e49\u0e08\u0e19\u0e02\u0e36\u0e49\u0e19\u0e27\u0e48\u0e32\u0e44\u0e14\u0e49\u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e41\u0e25\u0e49\u0e27</span></div>` : \"\";",
"  $(\"frTitle\").textContent = `${MONTHS[viewM]} ${viewY+543}`;",
"  $(\"frPreview\").innerHTML = DATA.preview ? `<p class=\"note\">* \u0e40\u0e27\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e43\u0e19\u0e20\u0e32\u0e1e\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07</p>` : \"\";",
"  if (!md || Object.keys(md.people).length<2){ $(\"strip\").innerHTML=\"\"; $(\"whoList\").innerHTML=`<div class=\"card\"><p class=\"note\">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e27\u0e23\u0e02\u0e2d\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49<br>\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e15\u0e32\u0e23\u0e32\u0e07\u0e41\u0e25\u0e49\u0e27\u0e40\u0e1b\u0e34\u0e14\u0e41\u0e2d\u0e1b\u0e04\u0e49\u0e32\u0e07\u0e44\u0e27\u0e49 1\u20132 \u0e19\u0e32\u0e17\u0e35 \u0e43\u0e2b\u0e49 AI \u0e2d\u0e48\u0e32\u0e19\u0e17\u0e38\u0e01\u0e41\u0e16\u0e27</p></div>`; $(\"togetherCard\").style.display=\"none\"; return; }",
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
"  $(\"setBk\").textContent = DATA.icloud === false ? \"\u0e1b\u0e34\u0e14\u0e2d\u0e22\u0e39\u0e48\" : \"\u0e40\u0e1b\u0e34\u0e14\u0e2d\u0e22\u0e39\u0e48\";",
"  $(\"setNotify\").value = String(DATA.settings.notify);",
"  $(\"setCal\").classList.toggle(\"on\", !!DATA.settings.calendar);",
"  $(\"setEve\").classList.toggle(\"on\", DATA.settings.eve !== false);",
"  $(\"setAI\").value = \"claude\";",
"  document.querySelectorAll(\".ci[data-c]\").forEach(el => { if (!el.innerHTML) el.innerHTML = cute(el.dataset.c, 26); });",
"  const c = careS();",
"  $(\"setAutoDark\").classList.toggle(\"on\", DATA.settings.autoDark !== false);",
"  for (const [id, k] of [[\"cWater\",\"water\"],[\"cMeal\",\"meal\"],[\"cNight\",\"night\"],[\"cCoffee\",\"coffee\"],[\"cSleep\",\"sleep\"]]) $(id).classList.toggle(\"on\", !!c[k]);",
"  $(\"cWaterH\").value = String(c.waterH);",
"}",
"const careS = () => Object.assign({water:true, waterH:2, meal:true, night:true, coffee:false, sleep:true}, DATA.settings.care || {});",
"function saveSettings(){",
"  DATA.settings.notify = +$(\"setNotify\").value;",
"  DATA.settings.autoDark = $(\"setAutoDark\").classList.contains(\"on\");",
"  DATA.settings.calendar = $(\"setCal\").classList.contains(\"on\");",
"  DATA.settings.eve = $(\"setEve\").classList.contains(\"on\");",
"  DATA.settings.ai = $(\"setAI\").value;",
"  DATA.settings.care = {water:$(\"cWater\").classList.contains(\"on\"), waterH:+$(\"cWaterH\").value, meal:$(\"cMeal\").classList.contains(\"on\"),",
"    night:$(\"cNight\").classList.contains(\"on\"), coffee:$(\"cCoffee\").classList.contains(\"on\"), sleep:$(\"cSleep\").classList.contains(\"on\")};",
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
"    if (!ok) return askCorners(img, cv);   // \u0e2b\u0e32\u0e40\u0e2a\u0e49\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d (\u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22\u0e40\u0e2d\u0e35\u0e22\u0e07) \u2192 \u0e43\u0e2b\u0e49\u0e41\u0e15\u0e30\u0e21\u0e38\u0e21\u0e15\u0e32\u0e23\u0e32\u0e07",
"    const qa = checkQuality(); if (qa && qa.bad.length) showQuality(qa, cv); else sendPhoto(cv);",
"  };",
"  img.onerror = () => { inp.value = \"\"; onParsed({error:\"\u0e40\u0e1b\u0e34\u0e14\u0e23\u0e39\u0e1b\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49 \u0e25\u0e2d\u0e07\u0e41\u0e04\u0e1b\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d\u0e15\u0e32\u0e23\u0e32\u0e07\u0e41\u0e25\u0e49\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e39\u0e1b\u0e17\u0e35\u0e48\u0e41\u0e04\u0e1b\u0e41\u0e17\u0e19\"}); };",
"  img.src = url;",
"}",
"/* ===== \u0e15\u0e23\u0e27\u0e08\u0e04\u0e38\u0e13\u0e20\u0e32\u0e1e\u0e23\u0e39\u0e1b\u0e01\u0e48\u0e2d\u0e19\u0e2d\u0e48\u0e32\u0e19 ===== */",
"function checkQuality(){",
"  let q = null; try { q = JSON.parse(imageQuality()); } catch(e){}",
"  if (!q) return (window.__quality = null);",
"  const bad = [], warn = [], lv = {};",
"  if (q.sharp < 40){ bad.push(`\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23\u0e43\u0e19\u0e0a\u0e48\u0e2d\u0e07\u0e40\u0e1a\u0e25\u0e2d (\u0e04\u0e27\u0e32\u0e21\u0e04\u0e21 ${q.sharp}/100) \u0e0a \u0e01\u0e31\u0e1a \u0e1a \u0e08\u0e30\u0e41\u0e22\u0e01\u0e22\u0e32\u0e01`); lv.sharp = \"rd\"; } else if (q.sharp < 80){ warn.push(`\u0e23\u0e39\u0e1b\u0e44\u0e21\u0e48\u0e04\u0e48\u0e2d\u0e22\u0e04\u0e21 (\u0e04\u0e27\u0e32\u0e21\u0e04\u0e21 ${q.sharp}/100)`); lv.sharp = \"y\"; } else lv.sharp = \"g\";",
"  if (q.cellPx < 13){ bad.push(`\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23\u0e40\u0e25\u0e47\u0e01\u0e21\u0e32\u0e01 \u0e0a\u0e48\u0e2d\u0e07\u0e01\u0e27\u0e49\u0e32\u0e07\u0e41\u0e04\u0e48 ~${Math.round(q.cellPx)} \u0e1e\u0e34\u0e01\u0e40\u0e0b\u0e25 (\u0e04\u0e27\u0e23 18 \u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b) \u00b7 \u0e23\u0e39\u0e1b\u0e01\u0e27\u0e49\u0e32\u0e07 ${q.imgW} \u0e1e\u0e34\u0e01\u0e40\u0e0b\u0e25`); lv.size = \"rd\"; } else if (q.cellPx < 17){ warn.push(`\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23\u0e04\u0e48\u0e2d\u0e19\u0e02\u0e49\u0e32\u0e07\u0e40\u0e25\u0e47\u0e01 \u0e0a\u0e48\u0e2d\u0e07\u0e01\u0e27\u0e49\u0e32\u0e07 ~${Math.round(q.cellPx)} \u0e1e\u0e34\u0e01\u0e40\u0e0b\u0e25`); lv.size = \"y\"; } else lv.size = \"g\";",
"  if (q.tilt > 4){ bad.push(`\u0e23\u0e39\u0e1b\u0e40\u0e2d\u0e35\u0e22\u0e07\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 ${q.tilt}\u00b0`); lv.tilt = \"rd\"; } else if (q.tilt >= 1){ warn.push(`\u0e23\u0e39\u0e1b\u0e40\u0e2d\u0e35\u0e22\u0e07\u0e40\u0e25\u0e47\u0e01\u0e19\u0e49\u0e2d\u0e22 ${q.tilt}\u00b0 (\u0e41\u0e2d\u0e1b\u0e1b\u0e23\u0e31\u0e1a\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e41\u0e25\u0e49\u0e27)`); lv.tilt = \"y\"; } else lv.tilt = \"g\";",
"  if (q.shade > 45){ warn.push(\"\u0e41\u0e2a\u0e07\u0e44\u0e21\u0e48\u0e40\u0e17\u0e48\u0e32\u0e01\u0e31\u0e19 \u0e21\u0e35\u0e40\u0e07\u0e32\u0e1a\u0e32\u0e07\u0e2a\u0e48\u0e27\u0e19\u0e02\u0e2d\u0e07\u0e15\u0e32\u0e23\u0e32\u0e07\"); lv.shade = \"y\"; } else lv.shade = \"g\";",
"  return (window.__quality = { q, bad, warn, lv });",
"}",
"function showQuality(qa, cv){",
"  const L = {g:\"\u0e14\u0e35\", y:\"\u0e1e\u0e2d\u0e43\u0e0a\u0e49\", rd:\"\u0e44\u0e21\u0e48\u0e1c\u0e48\u0e32\u0e19\"}, M = [[\"sharp\",\"\u0e04\u0e27\u0e32\u0e21\u0e04\u0e21\u0e0a\u0e31\u0e14\"],[\"size\",\"\u0e02\u0e19\u0e32\u0e14\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23\"],[\"tilt\",\"\u0e04\u0e27\u0e32\u0e21\u0e40\u0e2d\u0e35\u0e22\u0e07\"],[\"shade\",\"\u0e41\u0e2a\u0e07/\u0e40\u0e07\u0e32\"]];",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><h2 class=\"big\" style=\"font-size:22px\">\u0e23\u0e39\u0e1b\u0e19\u0e35\u0e49\u0e2d\u0e32\u0e08\u0e2d\u0e48\u0e32\u0e19\u0e1e\u0e25\u0e32\u0e14</h2>",
"    <p class=\"hello\" style=\"margin:2px 0 10px\">\u0e40\u0e0a\u0e47\u0e01\u0e04\u0e38\u0e13\u0e20\u0e32\u0e1e\u0e23\u0e39\u0e1b\u0e01\u0e48\u0e2d\u0e19\u0e2a\u0e48\u0e07\u0e43\u0e2b\u0e49 AI \u0e2d\u0e48\u0e32\u0e19</p>",
"    <div class=\"qmeter\">${M.map(([k,t])=>`<div>${t}<i class=\"q${qa.lv[k]}\">${L[qa.lv[k]]}</i></div>`).join(\"\")}</div>",
"    <div class=\"qtips\"><b>${ic(\"ai\")}\u0e41\u0e19\u0e30\u0e19\u0e33\u0e43\u0e2b\u0e49\u0e17\u0e33\u0e41\u0e1a\u0e1a\u0e19\u0e35\u0e49 \u0e08\u0e30\u0e2d\u0e48\u0e32\u0e19\u0e41\u0e21\u0e48\u0e19\u0e02\u0e36\u0e49\u0e19</b><ul>",
"      <li><b>\u0e41\u0e04\u0e1b\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d</b> \u0e41\u0e17\u0e19\u0e01\u0e32\u0e23\u0e16\u0e48\u0e32\u0e22\u0e23\u0e39\u0e1b\u0e08\u0e32\u0e01\u0e08\u0e2d\u0e2b\u0e23\u0e37\u0e2d\u0e01\u0e23\u0e30\u0e14\u0e32\u0e29</li>",
"      <li>\u0e43\u0e19\u0e44\u0e25\u0e19\u0e4c \u0e40\u0e1b\u0e34\u0e14\u0e23\u0e39\u0e1b\u0e41\u0e25\u0e49\u0e27<b>\u0e0b\u0e39\u0e21\u0e43\u0e2b\u0e49\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e15\u0e47\u0e21\u0e08\u0e2d</b>\u0e01\u0e48\u0e2d\u0e19\u0e41\u0e04\u0e1b (\u0e2b\u0e21\u0e38\u0e19\u0e41\u0e19\u0e27\u0e19\u0e2d\u0e19\u0e08\u0e30\u0e04\u0e21\u0e01\u0e27\u0e48\u0e32)</li>",
"      <li>\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e40\u0e1b\u0e47\u0e19<b>\u0e20\u0e32\u0e1e\u0e15\u0e49\u0e19\u0e09\u0e1a\u0e31\u0e1a</b> \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e23\u0e39\u0e1b\u0e17\u0e35\u0e48\u0e16\u0e39\u0e01\u0e1a\u0e35\u0e1a</li>",
"      <li>\u0e16\u0e49\u0e32\u0e15\u0e49\u0e2d\u0e07\u0e16\u0e48\u0e32\u0e22\u0e23\u0e39\u0e1b \u0e16\u0e48\u0e32\u0e22\u0e15\u0e23\u0e07\u0e46 \u0e40\u0e15\u0e47\u0e21\u0e01\u0e23\u0e2d\u0e1a \u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e07\u0e32\u0e21\u0e37\u0e2d \u0e44\u0e21\u0e48\u0e22\u0e49\u0e2d\u0e19\u0e41\u0e2a\u0e07</li></ul></div>",
"    <div class=\"why\">${qa.bad.map(t=>`<div class=\"r no\"><i>\u00d7</i><span>${t}</span></div>`).join(\"\")}${qa.warn.map(t=>`<div class=\"r wa\"><i>!</i><span>${t}</span></div>`).join(\"\")}</div>",
"    <div class=\"grid2\" style=\"margin-top:12px\"><button class=\"btn\" onclick=\"closeSheet();pickPhoto()\">\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e39\u0e1b\u0e43\u0e2b\u0e21\u0e48</button><button class=\"btn main\" id=\"qGo\">\u0e2d\u0e48\u0e32\u0e19\u0e15\u0e48\u0e2d\u0e40\u0e25\u0e22</button></div>`;",
"  $(\"qGo\").onclick = () => sendPhoto(cv);",
"  openSheet();",
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
"  PARSED = r; PARSED.checked = PARSED.checked || []; FRSTAT[`${r.year}-${String(r.month).padStart(2,\"0\")}`] = {busy:true};",
"  if (!r.people[DATA.me]){ $(\"sheet\").innerHTML = `<div class=\"grab\"></div><p class=\"big\" style=\"font-size:22px\">\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d\u0e0a\u0e37\u0e48\u0e2d \"${DATA.me}\"</p><div class=\"msg o\">${ic(\"warn\")}<span>\u0e0a\u0e37\u0e48\u0e2d\u0e17\u0e35\u0e48\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e14\u0e49: ${Object.keys(r.people).join(\", \")}<br>\u0e41\u0e01\u0e49\u0e0a\u0e37\u0e48\u0e2d\u0e43\u0e19\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e15\u0e32\u0e23\u0e32\u0e07 \u0e41\u0e25\u0e49\u0e27\u0e2d\u0e31\u0e1b\u0e23\u0e39\u0e1b\u0e43\u0e2b\u0e21\u0e48</span></div>${close}`; openSheet(); return; }",
"  renderResult();",
"};",
"// \u0e04\u0e27\u0e32\u0e21\u0e41\u0e21\u0e48\u0e19\u0e42\u0e14\u0e22\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 = \u0e04\u0e48\u0e32\u0e40\u0e09\u0e25\u0e35\u0e48\u0e22\u0e04\u0e27\u0e32\u0e21\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19 (\u0e08\u0e32\u0e01\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e15\u0e23\u0e27\u0e08\u0e41\u0e15\u0e48\u0e25\u0e30\u0e02\u0e31\u0e49\u0e19) \u0e41\u0e25\u0e49\u0e27\u0e2b\u0e31\u0e01\u0e16\u0e49\u0e32\u0e22\u0e2d\u0e14\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07/\u0e23\u0e39\u0e1b\u0e44\u0e21\u0e48\u0e14\u0e35",
"function scoreResult(r){",
"  const me = r.people[DATA.me], ck = r.checks || null, dim = new Date(r.year, r.month, 0).getDate(), unc = (r.uncertain || []).filter(d => !r.checked.includes(d));",
"  const cnt = Object.values(me).map(sortS).flat().length, v = (r.vdays||{})[DATA.me] || 0, tot = r.totals ? r.totals[DATA.me] : null, qa = window.__quality;",
"  const R = [];  // [\u0e23\u0e30\u0e14\u0e31\u0e1a, \u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21]",
"  let p = 0;",
"  for (let d = 1; d <= dim; d++){",
"    if (r.checked.includes(d)) p += 1;",
"    else if (!ck) p += unc.includes(d) ? 0.6 : 0.93;",
"    else if (ck.glyphChanged.includes(d)) p += 0.75;",
"    else if (ck.majority.includes(d)) p += 0.9;",
"    else if (unc.includes(d)) p += 0.6;",
"    else p += ck.glyphChecked ? 0.997 : 0.99;",
"  }",
"  let pct = p / dim * 100;",
"  if (tot != null){ if (tot === cnt + v) R.push([\"ok\", `\u0e22\u0e2d\u0e14 <b>${cnt} \u0e40\u0e27\u0e23</b>${v?` + v ${v} \u0e27\u0e31\u0e19`:\"\"} \u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e0a\u0e48\u0e2d\u0e07 \u201c\u0e17\u0e33\u0e07\u0e32\u0e19\u0e08\u0e23\u0e34\u0e07\u201d = ${tot}`]); else { R.push([\"wa\", `\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e14\u0e49 <b>${cnt} \u0e40\u0e27\u0e23</b>${v?` + v ${v}`:\"\"} \u0e41\u0e15\u0e48\u0e0a\u0e48\u0e2d\u0e07 \u201c\u0e17\u0e33\u0e07\u0e32\u0e19\u0e08\u0e23\u0e34\u0e07\u201d = ${tot} \u0e21\u0e35\u0e1a\u0e32\u0e07\u0e27\u0e31\u0e19\u0e2d\u0e32\u0e08\u0e2d\u0e48\u0e32\u0e19\u0e1c\u0e34\u0e14\u0e2b\u0e23\u0e37\u0e2d\u0e02\u0e32\u0e14`]); pct *= 0.9; } }",
"  if (ck){",
"    R.push(ck.diff.length ? [\"wa\", `\u0e2d\u0e48\u0e32\u0e19 2 \u0e23\u0e2d\u0e1a\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19 <b>\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 ${ck.diff.join(\", \")}</b> \u2192 \u0e2d\u0e48\u0e32\u0e19\u0e23\u0e2d\u0e1a 3 \u0e15\u0e31\u0e14\u0e2a\u0e34\u0e19\u0e41\u0e25\u0e49\u0e27`] : [\"ok\", `\u0e2d\u0e48\u0e32\u0e19 2 \u0e23\u0e2d\u0e1a \u0e15\u0e23\u0e07\u0e01\u0e31\u0e19 <b>${dim}/${dim} \u0e27\u0e31\u0e19</b>`]);",
"    if (ck.glyphChecked) R.push(ck.glyphChanged.length ? [\"wa\", `\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e15\u0e31\u0e27 \u0e0a/\u0e1a/\u0e14 \u0e01\u0e31\u0e1a\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e41\u0e25\u0e49\u0e27 <b>\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 ${[...new Set(ck.glyphChanged)].join(\", \")}</b> \u0e2d\u0e32\u0e08\u0e2d\u0e48\u0e32\u0e19\u0e1c\u0e34\u0e14 \u0e41\u0e2d\u0e1b\u0e41\u0e01\u0e49\u0e43\u0e2b\u0e49\u0e41\u0e25\u0e49\u0e27`] : [\"ok\", `\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e15\u0e31\u0e27 \u0e0a/\u0e1a/\u0e14 \u0e01\u0e31\u0e1a\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e43\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07 \u0e15\u0e23\u0e07\u0e17\u0e38\u0e01\u0e15\u0e31\u0e27 (${ck.glyphChecked} \u0e15\u0e31\u0e27)`]);",
"    R.push([\"ok\", `\u0e40\u0e08\u0e2d\u0e41\u0e16\u0e27\u0e0a\u0e37\u0e48\u0e2d \u201c${esc(ck.name || DATA.me)}\u201d \u00b7 \u0e15\u0e31\u0e14\u0e0a\u0e48\u0e2d\u0e07\u0e04\u0e23\u0e1a ${Math.min(ck.cols, dim)} \u0e27\u0e31\u0e19`]);",
"  } else { R.push([\"wa\", \"\u0e2b\u0e32\u0e40\u0e2a\u0e49\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e44\u0e21\u0e48\u0e40\u0e08\u0e2d \u0e43\u0e0a\u0e49\u0e27\u0e34\u0e18\u0e35\u0e2d\u0e48\u0e32\u0e19\u0e17\u0e31\u0e49\u0e07\u0e23\u0e39\u0e1b (\u0e41\u0e21\u0e48\u0e19\u0e19\u0e49\u0e2d\u0e22\u0e01\u0e27\u0e48\u0e32)\"]); pct = Math.min(pct, 85); }",
"  if (qa){ for (const t of qa.bad) { R.push([\"no\", t]); pct *= 0.9; } for (const t of qa.warn) { R.push([\"wa\", t]); pct *= 0.98; } }",
"  if (r.checked.length) R.push([\"ok\", `\u0e40\u0e0a\u0e47\u0e01\u0e40\u0e2d\u0e07\u0e41\u0e25\u0e49\u0e27 ${r.checked.length} \u0e27\u0e31\u0e19`]);",
"  pct = Math.max(0, Math.min(99, Math.round(pct)));",
"  return { pct, R, unc, dim };",
"}",
"function renderResult(){",
"  const r = PARSED, me = r.people[DATA.me], S = scoreResult(r), col = S.pct >= 97 ? \"#2fb36b\" : S.pct >= 85 ? \"#f39c3c\" : \"#e04848\";",
"  const verdict = S.unc.length ? (S.pct >= 85 ? `\u0e40\u0e01\u0e37\u0e2d\u0e1a\u0e04\u0e23\u0e1a \u0e40\u0e0a\u0e47\u0e01 ${S.unc.length} \u0e27\u0e31\u0e19` : `\u0e04\u0e27\u0e23\u0e40\u0e0a\u0e47\u0e01 ${S.unc.length} \u0e27\u0e31\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01`) : (S.pct >= 97 ? \"\u0e19\u0e48\u0e32\u0e08\u0e30\u0e16\u0e39\u0e01\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\" : \"\u0e25\u0e2d\u0e07\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e01\u0e31\u0e1a\u0e15\u0e32\u0e23\u0e32\u0e07\u0e2d\u0e35\u0e01\u0e17\u0e35\");",
"  const sub = S.unc.length ? \"\u0e41\u0e15\u0e30\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e21\u0e35\u0e01\u0e23\u0e2d\u0e1a\u0e2a\u0e49\u0e21 \u0e40\u0e17\u0e35\u0e22\u0e1a\u0e01\u0e31\u0e1a\u0e23\u0e39\u0e1b\u0e08\u0e23\u0e34\u0e07\" : \"\u0e17\u0e38\u0e01\u0e01\u0e32\u0e23\u0e15\u0e23\u0e27\u0e08\u0e1c\u0e48\u0e32\u0e19 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e0a\u0e47\u0e01\";",
"  const f = new Date(r.year, r.month-1, 1).getDay();",
"  let cal = DOWS.map(x=>`<div class=\"rh\">${x}</div>`).join(\"\") + \"<div></div>\".repeat(f);",
"  for (let d = 1; d <= S.dim; d++){ const sh = sortS(me[d]); cal += `<div class=\"rd ${S.unc.includes(d)?\"u\":\"\"} ${r.checked.includes(d)?\"ck\":\"\"}\" onclick=\"checkDay(${d})\">${d}<div class=\"ics\">${sh.length ? sh.map(c=>cute(SH[c].k, sh.length>1?14:16)).join(\"\") : `<span style=\"opacity:.6\">${cute(\"off\",13)}</span>`}</div></div>`; }",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><h2 class=\"big\" style=\"font-size:22px\">${MONTHS[r.month-1]} ${r.year+543}</h2>",
"    <p class=\"hello\" style=\"margin:2px 0 10px\">\u0e15\u0e23\u0e27\u0e08\u0e1c\u0e25\u0e01\u0e48\u0e2d\u0e19\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01 \u00b7 \u0e40\u0e27\u0e23\u0e02\u0e2d\u0e07${first(DATA.me)}</p>",
"    <div class=\"score\"><div class=\"ring\" style=\"--p:${S.pct};--c:${col}\"><b>${S.pct}%<small>\u0e04\u0e27\u0e32\u0e21\u0e41\u0e21\u0e48\u0e19</small></b></div><div class=\"verdict\">${verdict}<p>${sub}</p></div></div>",
"    <div class=\"why\">${S.R.map(([k,t])=>`<div class=\"r ${k}\"><i>${k===\"ok\"?\"\u2713\":k===\"no\"?\"\u00d7\":\"!\"}</i><span>${t}</span></div>`).join(\"\")}</div>",
"    <p class=\"note\" style=\"margin:8px 0 0\">% \u0e40\u0e1b\u0e47\u0e19\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e08\u0e32\u0e01\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e15\u0e23\u0e27\u0e08\u0e02\u0e49\u0e32\u0e07\u0e1a\u0e19 \u0e41\u0e15\u0e30\u0e27\u0e31\u0e19\u0e44\u0e2b\u0e19\u0e01\u0e47\u0e44\u0e14\u0e49\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e14\u0e39\u0e23\u0e39\u0e1b\u0e0a\u0e48\u0e2d\u0e07\u0e08\u0e23\u0e34\u0e07</p>",
"    <div class=\"rcal\">${cal}</div>",
"    <div class=\"grid2\" style=\"margin-top:12px\">${S.unc.length ? `<button class=\"btn\" onclick=\"checkDay(${S.unc[0]})\">\u0e40\u0e0a\u0e47\u0e01 ${S.unc.length} \u0e27\u0e31\u0e19</button>` : `<button class=\"btn\" onclick=\"closeSheet()\">\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01</button>`}<button class=\"btn main\" onclick=\"confirmParsed()\">${ic(\"check\")}\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01</button></div>`;",
"  openSheet();",
"}",
"// \u0e40\u0e0a\u0e47\u0e01\u0e17\u0e35\u0e25\u0e30\u0e27\u0e31\u0e19: \u0e23\u0e39\u0e1b\u0e0a\u0e48\u0e2d\u0e07\u0e08\u0e23\u0e34\u0e07\u0e08\u0e32\u0e01\u0e15\u0e32\u0e23\u0e32\u0e07 + \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e27\u0e23\u0e1a\u0e19/\u0e25\u0e48\u0e32\u0e07",
"let CK = null;",
"function checkDay(d){",
"  const r = PARSED, me = r.people[DATA.me], s = sortS(me[d]), ck = r.checks, S = scoreResult(r), list = S.unc;",
"  let img = \"\", ctx = \"\";",
"  try { if (ck && GRID.g && GRID.g.ok){ const g = GRID.g, [y0, y1] = g.bands[ck.label-1], xi = d-1;",
"    img = gridCrop(g.xs[xi], y0, g.xs[xi+1]-g.xs[xi], y1-y0, 84, Math.round(84*(y1-y0)/(g.xs[xi+1]-g.xs[xi]))).toDataURL(\"image/jpeg\", .92);",
"    const a = Math.max(0, xi-1), b = Math.min(g.xs.length-1, xi+2), hh = (y1-y0)*1.0, top = Math.max(0, y0 - (g.bands[0][1]-g.bands[0][0])*0.0);",
"    ctx = gridCrop(g.xs[a], top, g.xs[b]-g.xs[a], hh, 210, Math.round(210*hh/(g.xs[b]-g.xs[a]))).toDataURL(\"image/jpeg\", .9); } } catch(e){}",
"  CK = { d, top: s.length === 2 ? s[0] : \"\", bot: s.length === 2 ? s[1] : (s[0] || \"\") };   // \u0e40\u0e27\u0e23\u0e40\u0e14\u0e35\u0e22\u0e27\u0e2a\u0e48\u0e27\u0e19\u0e43\u0e2b\u0e0d\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e25\u0e48\u0e32\u0e07",
"  const pos = list.indexOf(d), info = seqInfo(r.year, r.month, d, s.join(\"\"));",
"  const opt = (half) => [\"\", \"\u0e14\", \"\u0e0a\", \"\u0e1a\"].map(c=>`<button class=\"${CK[half]===c?\"on\":\"\"}\" onclick=\"CK.${half}='${c}';ckRender()\">${c ? SH[c].n.replace(\"\u0e40\u0e27\u0e23\",\"\") : \"\u0e44\u0e21\u0e48\u0e21\u0e35\"}</button>`).join(\"\");",
"  window.ckRender = () => { $(\"ckTop\").innerHTML = opt(\"top\"); $(\"ckBot\").innerHTML = opt(\"bot\"); const v = [CK.top, CK.bot].filter(Boolean); const si = seqInfo(r.year, r.month, d, v.join(\"\")); $(\"ckNow\").innerHTML = v.length ? `${v.map(c=>cute(SH[c].k,26)).join(\"\")}<b>${si.name}</b><span class=\"note\">${si.time}</span>` : `${cute(\"off\",24)}<b>\u0e2b\u0e22\u0e38\u0e14</b>`; };",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><button class=\"backb\" onclick=\"renderResult()\">${ic(\"l\")}\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e2b\u0e19\u0e49\u0e32\u0e1c\u0e25</button>",
"    <h2 class=\"big\" style=\"font-size:22px;margin-top:4px\">\u0e40\u0e0a\u0e47\u0e01\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 ${d} ${MSH[r.month-1]}</h2><p class=\"hello\" style=\"margin:2px 0 10px\">${pos>=0 ? `${pos+1} \u0e08\u0e32\u0e01 ${list.length} \u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e0a\u0e47\u0e01` : \"\u0e14\u0e39\u0e23\u0e39\u0e1b\u0e0a\u0e48\u0e2d\u0e07\u0e08\u0e23\u0e34\u0e07\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e01\u0e31\u0e1a\u0e17\u0e35\u0e48\u0e2d\u0e48\u0e32\u0e19\u0e44\u0e14\u0e49\"}</p>",
"    ${img ? `<p class=\"lab\">\u0e23\u0e39\u0e1b\u0e08\u0e32\u0e01\u0e15\u0e32\u0e23\u0e32\u0e07</p><div class=\"cmp\"><img src=\"${img}\" style=\"width:64px\"><img src=\"${ctx}\" style=\"width:190px\"></div><p class=\"note\" style=\"margin:4px 2px 0\">\u0e0a\u0e48\u0e2d\u0e07\u0e15\u0e23\u0e07\u0e01\u0e25\u0e32\u0e07\u0e04\u0e37\u0e2d\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 ${d}</p>` : \"\"}",
"    <p class=\"lab\">AI \u0e2d\u0e48\u0e32\u0e19\u0e44\u0e14\u0e49 / \u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49</p><div class=\"cmp\" id=\"ckNow\" style=\"gap:8px\"></div>",
"    <p class=\"lab\">\u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e1a\u0e19</p><div class=\"tog2 ck4\" id=\"ckTop\"></div><p class=\"lab\">\u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e25\u0e48\u0e32\u0e07</p><div class=\"tog2 ck4\" id=\"ckBot\"></div>",
"    <div class=\"grid2\" style=\"margin-top:14px\"><button class=\"btn\" onclick=\"renderResult()\">\u0e02\u0e49\u0e32\u0e21</button><button class=\"btn main\" onclick=\"ckSave()\">\u0e16\u0e39\u0e01\u0e41\u0e25\u0e49\u0e27${list.filter(x=>x!==d).length?\" \u0e44\u0e1b\u0e27\u0e31\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b \u203a\":\"\"}</button></div>`;",
"  ckRender(); openSheet();",
"}",
"function ckSave(){",
"  const r = PARSED, me = r.people[DATA.me], d = CK.d, v = [...new Set([CK.top, CK.bot].filter(Boolean))].join(\"\");",
"  if (v) me[d] = v; else delete me[d];",
"  if (!r.checked.includes(d)) r.checked.push(d);",
"  const next = scoreResult(r).unc.find(x => x !== d);",
"  if (next) checkDay(next); else renderResult();",
"}",
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
"  DATA.months[k] = {people:r.people, totals:r.totals||{}, work:r.work||{}, vdays:r.vdays||{}, roles:r.roles||{}};",
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
"const ROLE_HEX = {ic:\"#2F7BE0\", mb:\"#E8742A\", md:\"#23A05A\"};",
"async function shareYear(){      // \u0e23\u0e39\u0e1b\u0e2a\u0e23\u0e38\u0e1b\u0e1b\u0e35: \u0e15\u0e31\u0e27\u0e40\u0e25\u0e02\u0e40\u0e14\u0e48\u0e19 \u0e46 \u0e19\u0e48\u0e32\u0e23\u0e31\u0e01 \u0e46 \u0e44\u0e27\u0e49\u0e41\u0e0a\u0e23\u0e4c",
"  try { await Promise.all([\"500\",\"700\"].map(w=>document.fonts.load(`${w} 30px Mali`, \"\u0e01\u0e020123\"))); } catch(e){}",
"  const IM = {}; for (const k of [\"sun\",\"sunset\",\"moon\"]) IM[k] = await svgImg(k);",
"  const y = viewY, S = yearStats(y), t = DATA.settings.theme || {}, p = PALETTES[t.palette] || PALETTES.sakura;",
"  const W = 1080, H = 1350, cv = document.createElement(\"canvas\"); cv.width = W; cv.height = H; const x = cv.getContext(\"2d\");",
"  const font = (s,w=600) => `${w} ${s}px Mali, \"Sukhumvit Set\", sans-serif`, draw = (k, cx, cy, s) => { if (IM[k]) x.drawImage(IM[k], cx - s/2, cy - s/2, s, s); };",
"  const g = x.createLinearGradient(0, 0, W*0.6, H); g.addColorStop(0, mixHex(p.body, \"#FFD6E6\", .35)); g.addColorStop(1, mixHex(p.blobs[1], \"#FFFFFF\", .72)); x.fillStyle = g; x.fillRect(0, 0, W, H);",
"  const blob = (cx, cy, r, c, a) => { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, al(c, a)); rg.addColorStop(1, al(c, 0)); x.fillStyle = rg; x.fillRect(cx-r, cy-r, r*2, r*2); };",
"  blob(W*0.95, 40, 480, p.blobs[0], .55); blob(40, H-40, 480, p.blobs[1], .5);",
"  const card = (cx, cy, w, h, fill) => { x.fillStyle = \"rgba(0,0,0,.05)\"; rr(x, cx, cy+4, w, h, 34); x.fill(); x.fillStyle = fill; rr(x, cx, cy, w, h, 34); x.fill(); x.strokeStyle = \"#FFFFFF\"; x.lineWidth = 3; rr(x, cx, cy, w, h, 34); x.stroke(); };",
"  x.textAlign = \"center\"; draw(\"sun\", 140, 120, 104); draw(\"moon\", W-140, 126, 100);",
"  x.fillStyle = p.title; x.font = font(64,700); x.fillText(`\u0e1b\u0e35 ${y+543} \u0e02\u0e2d\u0e07${first(DATA.me)}`, W/2, 130);",
"  x.fillStyle = p.sub; x.font = font(36,500); x.fillText(\"\u0e2a\u0e23\u0e38\u0e1b\u0e40\u0e27\u0e23\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35\", W/2, 190);",
"  card(60, 240, W-120, 230, \"rgba(255,255,255,.9)\");",
"  x.fillStyle = p.title; x.font = font(150,700); x.fillText(S.total, W/2 - 150, 410); x.font = font(38,600); x.fillStyle = p.sub; x.fillText(\"\u0e40\u0e27\u0e23\u0e17\u0e31\u0e49\u0e07\u0e1b\u0e35\", W/2 - 150, 452);",
"  x.fillStyle = p.title; x.font = font(110,700); x.fillText((S.total*8).toLocaleString(\"th-TH\"), W/2 + 200, 395); x.font = font(38,600); x.fillStyle = p.sub; x.fillText(\"\u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07\", W/2 + 200, 452);",
"  const tiles = [[\"sun\",\"#C6EFD6\",\"#1F5A3B\",S.tot[\"\u0e0a\"],\"\u0e40\u0e27\u0e23\u0e40\u0e0a\u0e49\u0e32\"],[\"sunset\",\"#D2E2FF\",\"#24427E\",S.tot[\"\u0e1a\"],\"\u0e40\u0e27\u0e23\u0e1a\u0e48\u0e32\u0e22\"],[\"moon\",\"#E3D7FF\",\"#4A2F8C\",S.tot[\"\u0e14\"],\"\u0e04\u0e37\u0e19\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01\"]];",
"  tiles.forEach(([k, bg, ink, v, l], i) => { const cx = 60 + i*330; card(cx, 500, 300, 250, bg); draw(k, cx+150, 575, 96); x.fillStyle = ink; x.font = font(72,700); x.fillText(v, cx+150, 690); x.font = font(32,600); x.fillText(l, cx+150, 732); });",
"  const R = [[\"ic\",\"In charge\"],[\"mb\",\"member\"],[\"md\",\"med\"]].filter(([r]) => S.rc[r]);",
"  let yy = 790;",
"  if (R.length){ card(60, yy, W-120, 130, \"rgba(255,255,255,.9)\"); const w = (W-120)/R.length;",
"    R.forEach(([r, l], i) => { x.fillStyle = RLC[r]; x.font = font(56,700); x.fillText(S.rc[r], 60 + w*i + w/2, yy+68); x.font = font(28,600); x.fillText(l, 60 + w*i + w/2, yy+108); }); yy += 160; }",
"  card(60, yy, W-120, 250, \"rgba(255,255,255,.9)\"); x.textAlign = \"left\"; x.font = font(34,600);",
"  const L = [S.hv ? `\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e31\u0e01\u0e2a\u0e38\u0e14  ${MONTHS[S.hv.m]} \u00b7 ${S.hv.k.total} \u0e40\u0e27\u0e23` : \"\", `\u0e04\u0e27\u0e1a 16 \u0e0a\u0e21.\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b  ${S.long} \u0e04\u0e23\u0e31\u0e49\u0e07`, `\u0e40\u0e27\u0e23\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23  ${S.hs} \u0e40\u0e27\u0e23`, `\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e27\u0e21  ${S.off} \u0e27\u0e31\u0e19`].filter(Boolean);",
"  L.forEach((l, i) => { x.fillStyle = p.accent; x.beginPath(); x.arc(112, yy + 50 + i*54, 8, 0, 7); x.fill(); x.fillStyle = p.title; x.fillText(l, 134, yy + 62 + i*54); });",
"  x.textAlign = \"center\"; x.fillStyle = p.sub; x.font = font(30,500); x.fillText(\"\u0e40\u0e01\u0e48\u0e07\u0e21\u0e32\u0e01\u0e40\u0e25\u0e22\u0e1b\u0e35\u0e19\u0e35\u0e49 \ud83d\udc97\", W/2, H - 50);",
"  send(\"share\", cv.toDataURL(\"image/png\").split(\",\")[1]);",
"}",
"async function shareMonth(){",
"  try { await Promise.all([\"400\",\"500\",\"600\",\"700\"].map(w=>document.fonts.load(`${w} 30px Mali`, \"\u0e01\u0e020123\"))); } catch(e){}",
"  const IM = {}; for (const k of [\"sun\",\"sunset\",\"moon\",\"off\",\"note\"]) IM[k] = await svgImg(k);",
"  const t = DATA.settings.theme || {}, p = PALETTES[t.palette] || PALETTES.sakura;",
"  const me = mine(), days = daysIn(), f = firstDow(), rows = Math.ceil((f+days)/7), md1 = monthData() || {}, RL = (md1.roles||{})[DATA.me] || {}, hasR = Object.keys(RL).length > 0;",
"  const W = 1080, pad = 54, gap = 16, cell = (W - pad*2 - gap*6)/7, top = 330, H = top + rows*(cell+gap) - gap + 250 + (hasR ? 50 : 0);",
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
"    else if (s.length === 1) draw(SH[s[0]].k, cx+cell/2, cy+cell*0.54, cell*0.48);",
"    else { draw(SH[s[0]].k, cx+cell*0.33, cy+cell*0.55, cell*0.4); draw(SH[s[1]].k, cx+cell*0.67, cy+cell*0.55, cell*0.4); }",
"    if (s.length){ const rl = RL[d] || []; x.font = font(26,700); x.textAlign = \"left\";   // \u0e15\u0e31\u0e27\u0e22\u0e48\u0e2d\u0e2a\u0e35\u0e15\u0e32\u0e21\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48 \u0e40\u0e2b\u0e21\u0e37\u0e2d\u0e19\u0e43\u0e19\u0e1b\u0e0f\u0e34\u0e17\u0e34\u0e19",
"      let lx = cx + (cell - s.reduce((a, c) => a + x.measureText(c).width, 0))/2;",
"      s.forEach((c, j) => { x.fillStyle = ROLE_HEX[rl[j]] || (s.length ? ink[s[0]] : p.text); x.fillText(c, lx, cy + cell - 12); lx += x.measureText(c).width; }); }",
"    if (noteOf(new Date(viewY, viewM, d))) draw(\"note\", cx+cell-26, cy+26, 34);",
"    if (holOf(viewY, viewM, d)){ x.save(); x.strokeStyle = \"#F2A23A\"; x.lineWidth = 6; rr(x, cx+3, cy+3, cell-6, cell-6, 27); x.stroke(); x.restore(); }",
"  }",
"  // \u0e2a\u0e23\u0e38\u0e1b\u0e14\u0e49\u0e32\u0e19\u0e25\u0e48\u0e32\u0e07",
"  const k = countMonth(me, days), items = [[\"sun\", \"\u0e40\u0e0a\u0e49\u0e32\", k.c[\"\u0e0a\"], ink[\"\u0e0a\"]], [\"sunset\", \"\u0e1a\u0e48\u0e32\u0e22\", k.c[\"\u0e1a\"], ink[\"\u0e1a\"]], [\"moon\", \"\u0e14\u0e36\u0e01\", k.c[\"\u0e14\"], ink[\"\u0e14\"]], [\"off\", \"\u0e2b\u0e22\u0e38\u0e14\", k.off, p.accent]];",
"  const cw = 218, cg = 18, sx = (W - (cw*4 + cg*3))/2, sy = H - 200;",
"  if (hasR){ const L = [[\"ic\",\"In charge\"],[\"mb\",\"member\"],[\"md\",\"med\"]]; x.font = font(28,700); x.textAlign = \"left\";",
"    const tw = L.reduce((a, [, t]) => a + 34 + x.measureText(t).width + 40, -40); let lx = (W - tw)/2;",
"    for (const [r, t] of L){ x.fillStyle = ROLE_HEX[r]; x.beginPath(); x.arc(lx + 11, sy - 46, 11, 0, 7); x.fill(); x.fillText(t, lx + 30, sy - 36); lx += 34 + x.measureText(t).width + 40; } }",
"  items.forEach(([ic2, lb, n, col], j) => {",
"    const bx = sx + j*(cw+cg);",
"    x.save(); x.shadowColor = al(p.accent,.12); x.shadowBlur = 16; x.shadowOffsetY = 5; x.fillStyle = \"rgba(255,255,255,.82)\"; rr(x, bx, sy, cw, 96, 30); x.fill(); x.restore();",
"    draw(ic2, bx+52, sy+48, 62);",
"    x.textAlign = \"left\"; x.fillStyle = col; x.font = font(40,700); x.fillText(n, bx+96, sy+52);",
"    x.fillStyle = p.sub; x.font = font(24,500); x.fillText(lb, bx+96, sy+82);",
"  });",
"  x.textAlign = \"center\"; x.fillStyle = al(p.title,.55); x.font = font(24,500); const md0 = monthData() || {}, wk = md0.work ? md0.work[DATA.me] : null, ot = wk != null ? k.total - wk : 0;",
"  let hs = 0; for (let d=1; d<=days; d++) if (holOf(viewY, viewM, d)) hs += sortS(me[d]).length;",
"  x.fillText([`${k.total} \u0e40\u0e27\u0e23 \u00b7 ${k.total*8} \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07`, ot > 0 ? `OT ${ot} \u0e40\u0e27\u0e23` : \"\", hs ? `\u0e40\u0e27\u0e23\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23 ${hs}` : \"\"].filter(Boolean).join(\" \u00b7 \"), W/2, H - 50);",
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
"  $(\"hello\").textContent = `${h<5?\"\u0e23\u0e32\u0e15\u0e23\u0e35\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e34\u0e4c\":h<12?\"\u0e2d\u0e23\u0e38\u0e13\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e34\u0e4c\":h<17?\"\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e15\u0e2d\u0e19\u0e1a\u0e48\u0e32\u0e22\":\"\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e15\u0e2d\u0e19\u0e40\u0e22\u0e47\u0e19\"} ${first(DATA.me)}`;",
"  renderHero(); renderCare(); renderCal(); renderSum(); renderFr(); renderSet();",
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
"function notiIntro(){      // \u0e40\u0e1b\u0e34\u0e14\u0e41\u0e2d\u0e1b\u0e04\u0e23\u0e31\u0e49\u0e07\u0e41\u0e23\u0e01: \u0e0a\u0e27\u0e19\u0e40\u0e1b\u0e34\u0e14\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19",
"  $(\"sheet\").innerHTML = `<div class=\"grab\"></div><h2 class=\"big\" style=\"font-size:22px\">\ud83d\udd14 \u0e40\u0e1b\u0e34\u0e14\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e01\u0e31\u0e19\u0e01\u0e48\u0e2d\u0e19</h2>",
"    <p class=\"hello\" style=\"margin:6px 0 14px;font-size:15px\">\u0e41\u0e2d\u0e1b\u0e08\u0e30\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e01\u0e48\u0e2d\u0e19\u0e02\u0e36\u0e49\u0e19\u0e40\u0e27\u0e23 \u0e40\u0e15\u0e37\u0e2d\u0e19\u0e14\u0e37\u0e48\u0e21\u0e19\u0e49\u0e33 \u0e01\u0e34\u0e19\u0e02\u0e49\u0e32\u0e27 \u0e41\u0e25\u0e30\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e15\u0e31\u0e27\u0e01\u0e48\u0e2d\u0e19\u0e40\u0e27\u0e23\u0e14\u0e36\u0e01<br>\u0e15\u0e49\u0e2d\u0e07\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e02\u0e2d\u0e07 Scriptable \u0e01\u0e48\u0e2d\u0e19\u0e19\u0e30</p>",
"    <button class=\"btn main\" style=\"width:100%;margin-bottom:10px\" onclick=\"send('testNoti');notiDone()\">${ic(\"bell\")}\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19 (\u0e01\u0e14 \"\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15\" \u0e16\u0e49\u0e32\u0e21\u0e35\u0e16\u0e32\u0e21)</button>",
"    <button class=\"btn\" style=\"width:100%;margin-bottom:10px\" onclick=\"send('openNotiSettings');notiDone()\">\u0e44\u0e1b\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19</button>",
"    <button class=\"btn\" style=\"width:100%\" onclick=\"notiDone();closeSheet()\">\u0e44\u0e27\u0e49\u0e17\u0e35\u0e2b\u0e25\u0e31\u0e07</button>`;",
"  openSheet();",
"}",
"function notiDone(){ if (DATA.settings.notiAsked) return; DATA.settings.notiAsked = true; send(\"saveSettings\", DATA.settings); }",
"if (!DATA.preview && !DATA.settings.notiAsked) setTimeout(notiIntro, 700);",
"if (DATA.restored) setTimeout(()=>toast(\"\u0e01\u0e39\u0e49\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e08\u0e32\u0e01 iCloud \u0e41\u0e25\u0e49\u0e27\"), 600);",
"</script>",
"</body>",
"</html>",
""
].join("\n");

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
    } else if (m.type === "saveLeave") {         // วันลา: { "YYYY-MM-DD": "พักผ่อน" | "ป่วย" | "กิจ" }
      d.leave = d.leave || {};
      if (m.payload.type) d.leave[m.payload.date] = m.payload.type; else delete d.leave[m.payload.date];
      saveData(d);
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
        const k = `${r.year}-${pad(r.month)}`;
        const fail = !all ? "ไม่มีผล" : all.err ? String(all.err.message || all.err) : (all.year !== r.year || all.month !== r.month) ? `อ่านได้เดือน ${all.month}/${all.year} ไม่ตรงกับตาราง` : "";
        if (fail) { console.log("friends: " + fail); if (open) await call(`friendsDone(${js(k)}, 0, ${js(fail)})`); return; }   // แจ้งในแอป ไม่เงียบ
        if (restored[k]) return;
        const mo = d.months[k] || (pendingFriends[k] = pendingFriends[k] || {});
        const target = d.months[k] ? d.months[k].people : mo;
        let n = 0; for (const [nm, v] of Object.entries(all.people)) if (nm !== d.me) { target[nm] = v; n++; }
        if (d.months[k]) { saveData(d); await call(`setData(${js(payload())})`); await call(`window.reapplyTrades && reapplyTrades(${js(k)})`); }
        if (open) await call(`friendsDone(${js(k)}, ${n}, "")`);
      });
    } else if (m.type === "testNoti") {          // ครั้งแรกที่ตั้งแจ้งเตือน iOS จะถามอนุญาตเอง
      const n = new Notification(); n.identifier = "shiftapp-test"; n.threadIdentifier = "shiftapp-test";
      n.title = "🔔 แจ้งเตือนใช้ได้แล้ว"; n.body = "ถ้าเห็นข้อความนี้ แปลว่าแอปเวรเตือนได้ปกติ"; n.setTriggerDate(new Date(Date.now() + 5000));
      await n.schedule(); await call(`toast(${js("อีก 5 วินาทีจะมีแจ้งเตือนเด้ง")})`); return;
    } else if (m.type === "openNotiSettings") {
      Safari.open("app-settings:"); return;
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

function wTheme(d, now) {
  const t0 = d.settings.theme || {}, p = PALETTES[t0.palette] || PALETTES.sakura;
  const nightNow = now && d.settings.autoDark !== false && allMyShifts(d).some(x => x.c === "ด" && x.st <= now && x.en > now);   // อยู่เวรดึก → วิดเจ็ตธีมมืด
  const t = nightNow && !["dark", "satin"].includes(t0.style) ? Object.assign({}, t0, { style: "dark" }) : t0;
  const L = { "ช": ["#D9F4E3", "#1F5A3B"], "บ": ["#DFEAFF", "#24427E"], "ด": ["#ECE4FF", "#4A2F8C"] };
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
    shift: { "ช": ["#D9F4E3", "#1F5A3B"], "บ": ["#DFEAFF", "#24427E"], "ด": ["#ECE4FF", "#4A2F8C"] } };
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
  const I = await loadIcons(), T = wTheme(d, now), sz = widgetSize(family); ROLE_C = T.dark ? ROLE_D : ROLE_L;
  const w = new ListWidget(); w.setPadding(0, 0, 0, 0);
  w.backgroundImage = family === "small" ? drawSmall(d, now, I, T, sz) : family === "medium" ? drawMedium(d, now, I, T, sz) : drawLarge(d, now, I, T, sz);
  const next = new Date(now.getTime() + 15 * 6e4); w.refreshAfterDate = next;
  return w;
}


function widgetLock(d, now, family) {
  const w = new ListWidget();
  const { cur, nxt } = nextShift(d, now), x = cur || nxt;
  const dd = x ? Math.round((new Date(x.st.getFullYear(), x.st.getMonth(), x.st.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5) : 0;
  const nm = x ? (x.cs.length > 1 ? x.cs.map(c => SH_LABEL[c]).join("→") : SH[x.c].n) : "";   // เวรต่อกัน = ก้อนเดียว
  const RN = { ic: "In charge", mb: "member", md: "med" }, rs = x ? (x.rs || []) : [], hasR = rs.some(Boolean);   // หน้าที่เป็นตัวหนังสือ (หน้าล็อกไม่มีสี)
  const rTxt = sep => rs.map(r => RN[r] || "–").join(sep);
  if (family === "accessoryInline") {
    txt(w, (!x ? "ยังไม่มีเวร" : cur ? `อยู่${nm.startsWith("เวร") ? nm : "เวร" + nm} เลิก ${bEnd(x)}` : `${nm} ${dayLabel(dd, x.st)} ${hhmm(x.st)}`) + (x && hasR ? ` · ${rTxt("/")}` : ""), Font.systemFont(12), Color.white());
  } else if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const s = w.addStack(); s.layoutVertically(); s.centerAlignContent();
    const a = s.addStack(); a.addSpacer(); txt(a, x ? x.cs.join("") : "-", F("Bold", x && x.cs.length > 1 ? 17 : 20), Color.white()); a.addSpacer();
    const b = s.addStack(); b.addSpacer(); txt(b, !x ? "" : hasR && x.cs.length === 1 ? x.rs[0].toUpperCase().replace("MD", "MED").replace("MB", "MB") : cur ? `ถึง ${bEnd(x).slice(0, 2)}` : dd === 0 ? hhmm(x.st) : dd === 1 ? "พรุ่งนี้" : `${x.st.getDate()}`, F("Medium", 10), Color.white()); b.addSpacer();
  } else {
    const r = w.addStack(); r.centerAlignContent();
    if (x) sym(r, SH[x.c].sym, 14, Color.white());
    r.addSpacer(4); txt(r, !x ? "เวรถัดไป" : cur ? "ตอนนี้" : `เวรถัดไป · ${dayLabel(dd, x.st)}`, F("Medium", 12), Color.white(), { lines: 1 });
    txt(w, x ? (x.cs.length > 1 ? x.cs.map(c => SH_LABEL[c]).join(" → ") : (hasR ? `${SH_LABEL[x.c]} · ${RN[rs[0]]}` : SH[x.c].n)) : "ยังไม่มีเวร", F("Bold", 16), Color.white(), { lines: 1, min: 0.7 });
    if (x && hasR && x.cs.length > 1) txt(w, rTxt(" · "), F("Medium", 12), Color.white(), { lines: 1, min: 0.7 });
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
  const wd = loadData();
  Script.setWidget(await buildWidget(wd, new Date(), config.widgetFamily));
  const stamp = fm.joinPath(fm.documentsDirectory(), "shiftapp-notisync.txt");   // วิดเจ็ตรีเฟรช → ตั้งแจ้งเตือนวันข้างหน้าใหม่เอง (ไม่เกินทุก 30 นาที)
  if (!fm.fileExists(stamp) || Date.now() - +fm.readString(stamp) > 30 * 6e4) {
    try { await syncNotifications(wd); fm.writeString(stamp, String(Date.now())); } catch (e) { console.log("widget notify: " + e); }
  }
} else if (config.runsWithSiri || config.runsFromShortcut) {   // "หวัดดี Siri เวรถัดไป"
  const ans = siriAnswer(loadData(), new Date());
  if (config.runsWithSiri) Speech.speak(ans);
  Script.setShortcutOutput(ans);
} else {
  await runApp();
}
Script.complete();
// ===== จบไฟล์ (ถ้าไม่เห็นบรรทัดนี้ แปลว่าไฟล์มาไม่ครบ) =====
