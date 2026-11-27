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

const GEMINI_OFF = true;   // ปิด Gemini ชั่วคราว (อ่านตารางพลาด) ใช้ Claude อย่างเดียว
const DEFAULT_NAME = String(CFG.name || "");
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"];
const CLAUDE_MODEL = "claude-sonnet-5-5";
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
งาน: อ่านทุกคนในตาราง ตอบเป็น JSON อย่างเดียว รูปแบบ:
{"year_be":2569,"month":12,"people":[{"name":"ชื่อ นามสกุลตามตาราง","shifts":{"1":"ชด","2":"บ"},"total":30}]}
shifts ใส่เฉพาะวันที่มีเวร (ใช้ตัวอักษร ช/บ/ด เท่านั้น) total คือเลขในคอลัมน์ "ทำงานจริง" ของคนนั้น (ถ้าไม่มีใส่ null)`;

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
async function askClaude(b64, apiKey) {
  const req = new Request("https://api.anthropic.com/v1/messages");
  req.method = "POST"; req.timeoutInterval = 120;
  req.headers = { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  req.body = JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 8000, messages: [{ role: "user", content: [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }, { type: "text", text: PROMPT }] }] });
  const res = await req.loadJSON();
  if (res.error) throw new Error(res.error.message || JSON.stringify(res.error));
  return res.content.map(c => c.text || "").join("");
}
function parseRoster(text, me) {
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const people = {}, totals = {};
  for (const p of j.people || []) {
    if (!p.name) continue;
    const v = {};
    for (const [day, s] of Object.entries(p.shifts || {})) { const c = sortS(String(s)).join(""); if (c && +day >= 1 && +day <= 31) v[+day] = c; }
    people[p.name.trim()] = v;
    if (p.total != null && !isNaN(+p.total)) totals[p.name.trim()] = +p.total;
  }
  const found = findMe(people, me);
  if (found && found !== me) { people[me] = people[found]; delete people[found]; if (found in totals) { totals[me] = totals[found]; delete totals[found]; } }
  const month = +j.month, year = +j.year_be > 2400 ? +j.year_be - 543 : +j.year_be;
  if (!(month >= 1 && month <= 12) || !year) throw new Error("อ่านเดือน/ปีจากหัวตารางไม่ได้");
  return { year, month, people, totals };
}
async function readRoster(b64, d) {
  const ai = GEMINI_OFF ? "claude" : (d.settings.ai === "claude" ? "claude" : "gemini");
  const k = getKey(ai);
  if (!k) throw new Error(`ยังไม่ได้ใส่ ${ai === "claude" ? "Claude" : "Gemini"} key (วางไว้บนสุดของสคริปต์ หรือใส่ในหน้าตั้งค่า)`);
  const text = ai === "claude" ? await askClaude(b64, k) : await askGemini(b64, k);
  return parseRoster(text, d.me);
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
  const before = +d.settings.notify;
  if (!before) return;
  const now = new Date();
  const list = allMyShifts(d).filter(x => x.st.getTime() - before * 6e4 > now.getTime()).slice(0, 50);
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
  const payload = () => Object.assign({}, d, { hasKey: hasKey() });
  const js = v => JSON.stringify(v).replace(/</g, "\\u003c").split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
  const html = APP_HTML.replace("/*__DATA__*/null", js(payload()));
  const call = s => wv.evaluateJavaScript(s, false);
  let busy = false;

  async function handle(m) {
    if (m.type === "saveMonth") {
      d.months[m.payload.key] = m.payload.month; saveData(d); await syncAll(d);
    } else if (m.type === "saveNote") {
      d.notes = d.notes || {};
      if (m.payload.text) d.notes[m.payload.date] = m.payload.text; else delete d.notes[m.payload.date];
      saveData(d);
    } else if (m.type === "saveSettings") {
      d.settings = Object.assign(d.settings, m.payload); saveData(d); await syncAll(d);
    } else if (m.type === "readPhoto") {
      let r;
      try { r = await readRoster(m.payload, d); } catch (e) { r = { error: String(e.message || e) }; }
      await call(`onParsed(${js(r)})`);
    } else if (m.type === "share") {
      const img = Image.fromData(Data.fromBase64String(m.payload));
      await ShareSheet.present([img]);
    } else if (m.type === "editSettings") {
      const a = new Alert();
      a.title = "ชื่อ และ API key";
      a.message = "ชื่อให้ตรงกับในตารางเวร\nGemini key ขอฟรีได้ที่ aistudio.google.com\nClaude key ไม่ใส่ก็ได้";
      a.addTextField("ชื่อ นามสกุล", d.me);
      a.addSecureTextField("Gemini API key", Keychain.contains(K_GEMINI) ? Keychain.get(K_GEMINI) : "");
      a.addSecureTextField("Claude API key (ไม่บังคับ)", Keychain.contains(K_CLAUDE) ? Keychain.get(K_CLAUDE) : "");
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
