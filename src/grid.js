/* ===== หาเส้นตารางในรูป แล้วตัดช่องรายวันให้ AI อ่านง่าย ===== */
const GRID = { img: null, ok: false };
function gridMask(src, W, H){
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.drawImage(src, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
  for (let i = 0, j = 0; j < m.length; i += 4, j++){ const r = px[i], g = px[i+1], b = px[i+2], mx = Math.max(r,g,b), mn = Math.min(r,g,b);
    m[j] = (0.3*r + 0.59*g + 0.11*b) < 165 && mx - mn < 55 ? 1 : 0; }    // เส้นตาราง = เทา/ดำ (ไม่ใช่สีพื้นช่อง)
  return m;
}
function gridLines(prof, frac){
  let mx = 0; for (const v of prof) if (v > mx) mx = v;
  const thr = mx * frac, out = []; let s = -1;
  for (let i = 0; i <= prof.length; i++){ const on = i < prof.length && prof[i] >= thr; if (on && s < 0) s = i; if (!on && s >= 0){ out.push((s + i - 1)/2); s = -1; } }
  return out;
}
function gridDetect(img){
  const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height;
  const sc = 1600 / W0, W = 1600, H = Math.round(H0 * sc);
  let m = gridMask(img, W, H);
  // หามุมเอียง (เช่นรูปถ่ายจอ) โดยลองเอียงทีละนิดให้เส้นแนวตั้งคมที่สุด
  let bestA = 0, bestS = -1;
  for (let a = -2.5; a <= 2.501; a += 0.25){
    const t = Math.tan(a * Math.PI / 180), col = new Float64Array(W + 200);
    for (let y = 0; y < H; y += 2){ const off = Math.round((y - H/2) * t) + 100, row = y * W; for (let xx = 0; xx < W; xx++) if (m[row + xx]) col[xx + off]++; }
    let s = 0; for (const v of col) s += v * v;
    if (s > bestS){ bestS = s; bestA = a; }
  }
  let src = img;
  if (Math.abs(bestA) > 0.01){     // หมุนรูปกลับให้ตรง
    const c = document.createElement("canvas"); c.width = W0; c.height = H0; const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, W0, H0); x.translate(W0/2, H0/2); x.rotate(-bestA * Math.PI / 180); x.drawImage(img, -W0/2, -H0/2);
    src = c; m = gridMask(src, W, H);
  }
  const col = new Array(W).fill(0);
  for (let y = 0; y < H; y++){ const row = y * W; for (let xx = 0; xx < W; xx++) if (m[row + xx]) col[xx]++; }
  const vx = gridLines(col, 0.42);
  let best = null;     // ชุดเส้นแนวตั้งที่ห่างเท่าๆ กันยาวที่สุด = คอลัมน์วันที่
  for (let i = 0; i < vx.length - 1; i++){
    const g0 = vx[i+1] - vx[i]; if (g0 < 12) continue;
    let j = i + 1;
    while (j < vx.length - 1){ const g = vx[j+1] - vx[j]; if (Math.abs(g - g0) > g0 * 0.3) break; j++; }
    if (!best || j - i > best.n) best = { s: i, n: j - i };
  }
  if (!best || best.n < 28) return { ok: false, why: "หาคอลัมน์วันที่ไม่เจอ", angle: bestA, n: best && best.n };
  const xs = vx.slice(best.s, best.s + best.n + 1), cw = (xs[xs.length-1] - xs[0]) / best.n;
  const row = new Array(H).fill(0), xa = Math.round(xs[0]), xb = Math.round(xs[xs.length-1]);
  for (let y = 0; y < H; y++){ const r = y * W; for (let xx = xa; xx <= xb; xx++) if (m[r + xx]) row[y]++; }
  const hy = gridLines(row, 0.45);
  const bands = [];
  for (let i = 0; i < hy.length - 1; i++){ const h = hy[i+1] - hy[i]; if (h >= cw * 1.45) bands.push([hy[i], hy[i+1]]); }
  if (bands.length < 2) return { ok: false, why: "หาแถวไม่เจอ" };
  GRID.img = src;
  return { ok: true, sc, angle: bestA, xs, bands, nameX: [Math.max(0, xs[0] - cw * 9), xs[0]] };
}
function gridCrop(sx, sy, sw, sh, dw, dh){ const s = 1 / GRID.g.sc, c = document.createElement("canvas"); c.width = dw; c.height = dh; const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.fillStyle = "#fff"; x.fillRect(0, 0, dw, dh); x.drawImage(GRID.img, sx*s, sy*s, sw*s, sh*s, 0, 0, dw, dh); return c; }
// รูปชื่อของทุกแถว พร้อมเลขกำกับ #1, #2, ...
window.makeNames = function(){
  const g = GRID.g, [x0, x1] = g.nameX, w = 700, lh = 64, H = g.bands.length * (lh + 6) + 6;
  const c = document.createElement("canvas"); c.width = w + 90; c.height = H; const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, H);
  g.bands.forEach(([y0, y1], i) => {
    const yy = 6 + i * (lh + 6);
    x.drawImage(gridCrop(x0, y0, x1 - x0, y1 - y0, w, lh), 90, yy);
    x.fillStyle = "#d0115b"; x.font = "700 30px sans-serif"; x.textBaseline = "middle"; x.fillText("#" + (i+1), 8, yy + lh/2);
  });
  return c.toDataURL("image/jpeg", .92).split(",")[1];
};
// ช่องของแต่ละวันในแถว k ขยายใหญ่ พร้อมเลขวันที่ตัวโต
window.makeTiles = function(k, days){
  const g = GRID.g, [y0, y1] = g.bands[k-1], n = Math.min(days || 31, g.xs.length - 1);
  const tw = 150, th = Math.round(tw * (y1 - y0) / ((g.xs[n] - g.xs[0]) / n)), lab = 46, per = 8, gap = 14;
  const rows = Math.ceil(n / per), W = per * (tw + gap) + gap, H = rows * (th + lab + gap) + gap;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++){
    const cx = gap + (i % per) * (tw + gap), cy = gap + Math.floor(i / per) * (th + lab + gap);
    x.fillStyle = "#c2185b"; x.font = "700 40px sans-serif"; x.textAlign = "center"; x.textBaseline = "top"; x.fillText(String(i+1), cx + tw/2, cy + 2);
    const pad = (g.xs[i+1] - g.xs[i]) * 0.06;
    x.drawImage(gridCrop(g.xs[i] + pad, y0 + pad, g.xs[i+1] - g.xs[i] - pad*2, y1 - y0 - pad*2, tw, th), cx, cy + lab);
    x.strokeStyle = "#999"; x.lineWidth = 2; x.strokeRect(cx, cy + lab, tw, th);
  }
  return c.toDataURL("image/jpeg", .92).split(",")[1];
};
