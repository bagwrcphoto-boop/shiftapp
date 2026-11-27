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

const APP_VERSION = "27 พ.ย. 69 · 19";
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
- ช = เวรเช้า, บ = เวรบ่าย, ด = เวรดึก ส่วน x, ลา, กิจ, EN, D, E, ไม่ต, วันเกิด, ตัวเลข หรือช่องว่าง ไม่ใช่เวร
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
ช = เวรเช้า, บ = เวรบ่าย, ด = เวรดึก ส่วน x, ลา, กิจ, EN, D, E, ไม่ต, ตัวเลข หรือช่องว่าง ไม่ใช่เวร
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
  const tiles = await page(`makeTiles(${+j.label}, ${days})`);
  const total = j.total != null && !isNaN(+j.total) ? +j.total : null;
  const workdays = j.workdays != null && +j.workdays > 0 && +j.workdays <= 31 ? +j.workdays : null;
  const ask = async (hint, model) => {
    const t = await claudeCall(model || CLAUDE_MODEL, tiles,
`รูปนี้คือช่องตารางเวรของคนคนเดียว แยกเป็นวัน วันละ 1 ช่อง มีเลขวันที่สีชมพูอยู่เหนือแต่ละช่อง (1 ถึง ${days})
ในแต่ละช่องมีบรรทัดบนกับบรรทัดล่าง อ่านตัวอักษรทั้งสองบรรทัด
ช = เวรเช้า, บ = เวรบ่าย, ด = เวรดึก ส่วน x, ลา, กิจ, EN, D, E, ไม่ต, ตัวเลข หรือช่องว่าง ไม่ใช่เวร (สีพื้นไม่มีความหมาย ดูแค่ตัวอักษร)
${hint ? "หมายเหตุ: " + hint + "\n" : ""}ตอบบรรทัดเดียว ไม่ต้องอธิบาย ครบทุกวัน รูปแบบ วันที่=เวร คั่นด้วยเว้นวรรค ใช้ - ถ้าไม่มีเวร เช่น
1=ดช 2=บ 3=- 4=ช`, key, 2000);
    const out = {}, seen = new Set();
    for (const x of t.matchAll(/(\d{1,2})\s*=\s*([ชบด]*)/g)) { seen.add(+x[1]); const s = sortS(x[2]).join(""); if (s && +x[1] >= 1 && +x[1] <= days) out[+x[1]] = s; }
    return { days: out, count: Object.values(out).join("").length, full: seen.has(days) };
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
  if (diff.length || (total != null && r1.count !== total)) {
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
  return { year, month, days: my.days, total, workdays, count: my.count, uncertain: [...new Set(uncertain)].sort((a, b) => a - b) };
}

async function readRosterClaude(b64, d, key, grid, page) {
  if (grid && page) {
    const friends = askClaude(b64, key).then(t => parseRoster(t, d.me)).catch(e => ({ err: e }));   // เวรเพื่อน: อ่านเบื้องหลัง ไม่ต้องรอ
    const tiles = await readByTiles(b64, d, key, page).catch(e => ({ err: e }));
    if (!tiles.err) {
      const people = { [d.me]: tiles.days }, totals = tiles.total != null ? { [d.me]: tiles.total } : {};
      const work = tiles.workdays != null ? { [d.me]: tiles.workdays } : {};
      const old = d.months[`${tiles.year}-${pad(tiles.month)}`];
      if (old) for (const [n, v] of Object.entries(old.people || {})) if (n !== d.me) people[n] = v;   // เวรเพื่อนเดิม (ถ้ามี)
      return { year: tiles.year, month: tiles.month, people, totals, work, method: "tiles", uncertain: tiles.uncertain, friendsLater: friends };
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
const APP_HTML = /*__HTML__*/"";

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

/*__WIDGETS__*/

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
