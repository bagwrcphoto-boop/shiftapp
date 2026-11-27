// ===== เวรของฉัน (ตัวโหลด) =====
// ตั้งค่าตรงนี้ครั้งเดียว แล้วแอปจะโหลดเวอร์ชันล่าสุดจาก GitHub เอง
const CONFIG = {
  name: "ชื่อ นามสกุล ตามตารางเวร",
  geminiKey: "",   // วาง Gemini key ระหว่าง ""
  claudeKey: "",   // ไม่ใส่ก็ได้
};
const URL = "https://raw.githubusercontent.com/bagwrcphoto-boop/shiftapp/main/app.js";
const fm = FileManager.local(), cache = fm.joinPath(fm.documentsDirectory(), "shiftapp-code.js");
let code = null;
const inWidget = config.runsInWidget || config.runsInAccessoryWidget;
if (!(inWidget && fm.fileExists(cache))) {
  try {
    const r = new Request(URL); r.timeoutInterval = inWidget ? 6 : 10;
    const s = await r.loadString();
    if (r.response.statusCode === 200 && s.includes("จบไฟล์")) { code = s; fm.writeString(cache, s); }
  } catch (e) {}
}
if (!code && fm.fileExists(cache)) code = fm.readString(cache);
if (!code) throw new Error("โหลดแอปไม่ได้ ต่ออินเทอร์เน็ตแล้วลองใหม่");
await new Function("CONFIG", "return (async () => {\n" + code + "\n})()")(CONFIG);
