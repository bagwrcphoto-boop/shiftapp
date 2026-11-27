/* ===== หาเส้นตารางในรูป แล้วตัดช่องรายวันให้ AI อ่านง่าย ===== */
const GRID = { img: null, ok: false };
function gridMask(src, W, H){
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.drawImage(src, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H), L = new Float32Array(W * H);
  for (let i = 0, j = 0; j < m.length; i += 4, j++) L[j] = 0.3*px[i] + 0.59*px[i+1] + 0.11*px[i+2];
  // ความสว่างเฉลี่ยรอบๆ (กันเงา/แสงไม่เท่ากันในรูปถ่าย)
  const I = new Float64Array((W + 1) * (H + 1)), R = 16;
  for (let y = 0; y < H; y++){ let s = 0; for (let xx = 0; xx < W; xx++){ s += L[y*W + xx]; I[(y+1)*(W+1) + xx + 1] = I[y*(W+1) + xx + 1] + s; } }
  for (let y = 0, j = 0; y < H; y++){ const y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1);
    for (let xx = 0; xx < W; xx++, j++){ const x0 = Math.max(0, xx - R), x1 = Math.min(W, xx + R + 1);
      const mean = (I[y1*(W+1) + x1] - I[y0*(W+1) + x1] - I[y1*(W+1) + x0] + I[y0*(W+1) + x0]) / ((y1 - y0) * (x1 - x0));
      const i = j*4, mx = Math.max(px[i], px[i+1], px[i+2]), mn = Math.min(px[i], px[i+1], px[i+2]);
      m[j] = L[j] < Math.min(200, mean - 30) && mx - mn < 55 ? 1 : 0; } }    // เส้นตาราง = เทา/ดำ เข้มกว่ารอบๆ (ไม่ใช่สีพื้นช่อง)
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
  for (let a = -6; a <= 6.001; a += 0.25){
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
  const vx0 = gridLines(col, 0.3).reduce((a, v) => { if (a.length && v - a[a.length-1] < 6) a[a.length-1] = (a[a.length-1] + v) / 2; else a.push(v); return a; }, []), vx = [];
  // เส้นแนวตั้งบางเส้นจาง (ช่องสี/เงา) → เติมเส้นที่หายตรงกลางช่องที่กว้างเป็น 2-3 เท่า
  for (let i = 0; i < vx0.length; i++){
    vx.push(vx0[i]); if (i === vx0.length - 1) continue;
    const g = vx0[i+1] - vx0[i], near = vx0.slice(Math.max(0, i-3), i+5).map((v, k, a) => k ? v - a[k-1] : null).filter(v => v && v > 12).sort((a, b) => a - b), g0 = near[Math.floor(near.length / 2)];
    if (g0) for (const n of [2, 3]) if (Math.abs(g - n*g0) < g0*0.25){ for (let k = 1; k < n; k++) vx.push(vx0[i] + g*k/n); break; }
  }
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
  let hy = gridLines(row, 0.45);
  // เส้นแบ่งบรรทัดบน/ล่างในช่องวันที่ ไม่ใช่เส้นแบ่งคน: เส้นแบ่งคนจริงต้องลากผ่านคอลัมน์ชื่อด้วย
  { const na = Math.max(0, Math.round(xs[0] - cw*8)), nb = Math.max(0, Math.round(xs[0] - cw)), nw = nb - na;
    if (nw > cw*3){
      const inName = y => { let best = 0; for (let yy = Math.max(0, Math.round(y) - 2); yy <= Math.min(H-1, Math.round(y) + 2); yy++){ let c = 0; const r = yy * W; for (let xx = na; xx < nb; xx++) if (m[r + xx]) c++; if (c > best) best = c; } return best >= nw * 0.4; };
      const kept = hy.filter(inName); if (kept.length >= 3) hy = kept; } }
  const bands = [];
  for (let i = 0; i < hy.length - 1; i++){ const h = hy[i+1] - hy[i]; if (h >= cw * 1.45) bands.push([hy[i], hy[i+1]]); }
  if (bands.length < 2) return { ok: false, why: "หาแถวไม่เจอ" };
  // เส้นแบ่งแถวจาง → 2 แถวติดกันเป็นแถบเดียว: แบ่งตามความสูงแถวปกติ
  const hs = bands.map(b => b[1] - b[0]).sort((a, b) => a - b), med = hs[Math.floor(hs.length / 2)];
  for (let i = bands.length - 1; i >= 0; i--){ const [y0, y1] = bands[i], n = Math.round((y1 - y0) / med);
    if ((y1 - y0) > med * 1.7 && n >= 2){ const step = (y1 - y0) / n, parts = []; for (let k = 0; k < n; k++) parts.push([y0 + k*step, y0 + (k+1)*step]); bands.splice(i, 1, ...parts); } }
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

// ดึงรูปให้ตรงจากมุม 4 จุด (ซ้ายบน, ขวาบน, ขวาล่าง, ซ้ายล่าง) — ใช้กับรูปถ่ายเอียง
window.warpQuad = function(img, P){
  const d = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
  let W = Math.round(Math.max(d(P[0],P[1]), d(P[3],P[2]))), H = Math.round(Math.max(d(P[0],P[3]), d(P[1],P[2])));
  const k = Math.min(1, 2400 / Math.max(W, H)); W = Math.round(W*k); H = Math.round(H*k);
  // homography: ปลายทาง (สี่เหลี่ยม) → ต้นทาง (มุมที่แตะ)
  const D = [[0,0],[W,0],[W,H],[0,H]], A = [], B = [];
  for (let i = 0; i < 4; i++){ const [x, y] = D[i], [u, v] = P[i];
    A.push([x, y, 1, 0, 0, 0, -u*x, -u*y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v*x, -v*y]); B.push(v); }
  for (let c = 0; c < 8; c++){ let m = c; for (let r = c+1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
    [A[c], A[m]] = [A[m], A[c]]; [B[c], B[m]] = [B[m], B[c]];
    for (let r = 0; r < 8; r++) if (r !== c){ const f = A[r][c] / A[c][c]; for (let k2 = c; k2 < 8; k2++) A[r][k2] -= f*A[c][k2]; B[r] -= f*B[c]; } }
  const h = B.map((b, i) => b / A[i][i]);
  const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
  const sc = document.createElement("canvas"); sc.width = sw; sc.height = sh; const sx = sc.getContext("2d"); sx.drawImage(img, 0, 0);
  const sp = sx.getImageData(0, 0, sw, sh).data, out = document.createElement("canvas"); out.width = W; out.height = H;
  const ox = out.getContext("2d"), od = ox.createImageData(W, H), dp = od.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const w = h[6]*x + h[7]*y + 1, u = (h[0]*x + h[1]*y + h[2]) / w, v = (h[3]*x + h[4]*y + h[5]) / w;
    const ui = Math.min(sw-2, Math.max(0, u|0)), vi = Math.min(sh-2, Math.max(0, v|0)), fu = u - ui, fv = v - vi, o = (y*W + x)*4;
    for (let c = 0; c < 3; c++){ const i0 = (vi*sw + ui)*4 + c;
      dp[o+c] = (sp[i0]*(1-fu) + sp[i0+4]*fu)*(1-fv) + (sp[i0+sw*4]*(1-fu) + sp[i0+sw*4+4]*fu)*fv; }
    dp[o+3] = 255; }
  ox.putImageData(od, 0, 0); return out;
};

// แบบใหม่: ช่องใหญ่ขึ้น แบ่ง 2 รูป (วันที่ 1-16 / 17-สิ้นเดือน) ให้ไม่เกินขนาดที่ AI ย่อรูป และเส้นแบ่งบน/ล่างชัด
// ทำให้ตัวอักษรดำบนพื้นขาว (ตัดสีพื้นช่องที่ทำให้ AI สับสน เช่น ช บนพื้นฟ้า) + ขีดเส้นแบ่งบรรทัดบน/ล่างให้ชัด
function inkTile(c){
  const x = c.getContext("2d"), W = c.width, H = c.height, im = x.getImageData(0, 0, W, H), p = im.data;
  const rowLine = new Float64Array(H);
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++){ const i = (y*W + xx)*4, r = p[i], g = p[i+1], b = p[i+2], mx = Math.max(r,g,b), mn = Math.min(r,g,b), L = 0.3*r + 0.59*g + 0.11*b;
    if (mx - mn < 40 && L > 140 && L < 225) rowLine[y]++; }     // เส้นแบ่งบาง สีเทา
  let by = Math.round(H/2), best = 0;
  for (let y = Math.round(H*0.3); y < H*0.7; y++){ if (rowLine[y] > best){ best = rowLine[y]; by = y; } }
  // ถ้าไม่มีเส้นเทา ใช้รอยต่อสีพื้น (บน/ล่างคนละสี)
  if (best < W*0.5){ let bd = 0; for (let y = Math.round(H*0.3); y < H*0.7; y++){ let d = 0; for (let xx = 0; xx < W; xx += 3){ const i = (y*W + xx)*4, j = ((y-2)*W + xx)*4; d += Math.abs(p[i]-p[j]) + Math.abs(p[i+1]-p[j+1]) + Math.abs(p[i+2]-p[j+2]); } if (d > bd){ bd = d; by = y; } } }
  // แยกทำทีละครึ่ง (บน/ล่าง): หาสีพื้นของครึ่งนั้น แล้วยืดให้ตัวอักษรเข้ม พื้นขาว
  const V = new Float32Array(W*H); for (let j = 0; j < V.length; j++){ const i = j*4; V[j] = Math.max(p[i], p[i+1], p[i+2]); }
  for (const [ya, yb] of [[0, by], [by, H]]){
    const vals = []; for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx += 2) vals.push(V[y*W + xx]);
    if (!vals.length) continue; vals.sort((a2, b2) => a2 - b2);
    const bg = vals[Math.floor(vals.length*0.6)], ink = vals[Math.floor(vals.length*0.01)], span = bg - ink;
    if (span < 55){ for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx++){ const i = (y*W + xx)*4; p[i] = p[i+1] = p[i+2] = 255; } continue; }   // ครึ่งนี้ว่าง
    for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx++){ const j = y*W + xx, i = j*4, d = Math.max(0, Math.min(1, (bg - V[j] - span*0.2) / (span*0.8)));
      const o = 255 - Math.min(255, d * 1.5 * 255); p[i] = p[i+1] = p[i+2] = o; } }
  x.putImageData(im, 0, 0);
  x.fillStyle = "#e0457c"; x.fillRect(0, by - 1, W, 3);
  x.fillStyle = "#e0457c"; x.font = "600 15px sans-serif"; x.textAlign = "left"; x.textBaseline = "top"; x.fillText("บน", 4, 3); x.textBaseline = "top"; x.fillText("ล่าง", 4, by + 4);
  return c;
}
// ทำให้ตัวอักษรเข้มขึ้นบนพื้นสีเข้ม (ส้ม/ฟ้า) โดยยังเก็บสีพื้นไว้
function darkenInk(c){
  const x = c.getContext("2d"), W = c.width, H = c.height, im = x.getImageData(0, 0, W, H), p = im.data, mid = Math.round(H/2);
  for (const [ya, yb] of [[0, mid], [mid, H]]){
    const v = []; for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx += 2){ const i = (y*W + xx)*4; v.push(Math.max(p[i], p[i+1], p[i+2])); }
    v.sort((a2, b2) => a2 - b2); const bg = v[Math.floor(v.length*0.6)];
    for (let y = ya; y < yb; y++) for (let xx = 0; xx < W; xx++){ const i = (y*W + xx)*4, V = Math.max(p[i], p[i+1], p[i+2]);
      if (V < bg*0.85){ const f = Math.pow(V / bg, 2.2); p[i] *= f; p[i+1] *= f; p[i+2] *= f; } } }
  x.putImageData(im, 0, 0); return c;
}
window.makeTiles2 = function(k, days, mode){
  const g = GRID.g, [y0, y1] = g.bands[k-1], n = Math.min(days || 31, g.xs.length - 1);
  const tw = 200, cwAvg = (g.xs[n] - g.xs[0]) / n, th = Math.round(tw * (y1 - y0) / cwAvg), lab = 52, per = 7, gap = 14;
  const parts = [[1, Math.min(16, n)], [17, n]].filter(([a, b]) => a <= b);
  return JSON.stringify(parts.map(([a, b]) => {
    const cnt = b - a + 1, rows = Math.ceil(cnt / per), W = per * (tw + gap) + gap, H = rows * (th + lab + gap) + gap;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    for (let d = a; d <= b; d++){
      const i = d - a, cx = gap + (i % per) * (tw + gap), cy = gap + Math.floor(i / per) * (th + lab + gap), xi = d - 1;
      x.fillStyle = "#c2185b"; x.font = "700 44px sans-serif"; x.textAlign = "center"; x.textBaseline = "top"; x.fillText(String(d), cx + tw/2, cy + 2);
      const pad = (g.xs[xi+1] - g.xs[xi]) * 0.06;
      const cell = gridCrop(g.xs[xi] + pad, y0 + pad, g.xs[xi+1] - g.xs[xi] - pad*2, y1 - y0 - pad*2, tw, th);
      x.drawImage(mode === "ink" ? inkTile(cell) : mode === "plain" ? cell : darkenInk(cell), cx, cy + lab);
      x.strokeStyle = "#999"; x.lineWidth = 2; x.strokeRect(cx, cy + lab, tw, th);
    }
    return c.toDataURL("image/jpeg", .92).split(",")[1];
  }));
};

// ---- ตรวจ ช/บ/ด ซ้ำแบบเทียบกับตัวอย่างจากตารางเดียวกัน ----
function halfBox(k, d, half){
  const g = GRID.g, [y0, y1] = g.bands[k-1], xi = d - 1, w = g.xs[xi+1] - g.xs[xi], padx = w * 0.06, h = y1 - y0, mid = y0 + h * 0.5;
  return half === "top" ? [g.xs[xi] + padx, y0 + h*0.04, w - padx*2, h*0.48] : [g.xs[xi] + padx, mid, w - padx*2, h*0.46];
}
// ครึ่งไหนมีตัวอักษร (ดูจากความต่างระหว่างหมึกกับพื้น)
window.halfInk = function(k, days){
  const out = {};
  for (let d = 1; d <= days; d++){ out[d] = {};
    for (const half of ["top", "bot"]){
      const [sx, sy, sw, sh] = halfBox(k, d, half), c = gridCrop(sx, sy, sw, sh, 40, 30), p = c.getContext("2d").getImageData(0, 0, 40, 30).data, v = [];
      for (let i = 0; i < p.length; i += 4) v.push(Math.max(p[i], p[i+1], p[i+2]));
      v.sort((a, b) => a - b); out[d][half] = v[Math.floor(v.length*0.6)] - v[Math.floor(v.length*0.02)] > 60;
    } }
  return JSON.stringify(out);
};
// รูปตัวอย่าง (legend) + รูปตัวที่ต้องตรวจ แต่ละตัวขยายใหญ่ มีเลขกำกับ
window.glyphSheet = function(k, items, legend){
  const S = 110, gap = 12, lab = 34;
  const cell = (it) => { const [sx, sy, sw, sh] = halfBox(k, it.d, it.half); return darkenInk(gridCrop(sx, sy, sw, sh, S, Math.round(S * sh / sw))); };
  const draw = (rows) => {
    const per = 8, hh = Math.round(S * 0.95), H = rows.reduce((a, r) => a + Math.ceil(r.items.length / per) * (hh + lab + gap) + 40, gap), W = per * (S + gap) + gap + 10;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    let y = gap;
    for (const r of rows){ x.fillStyle = "#333"; x.font = "700 26px sans-serif"; x.textAlign = "left"; x.textBaseline = "top"; x.fillText(r.title, gap, y); y += 36;
      r.items.forEach((it, i) => { const cx = gap + (i % per) * (S + gap), cy = y + Math.floor(i / per) * (hh + lab + gap);
        x.fillStyle = "#c2185b"; x.font = "700 26px sans-serif"; x.textAlign = "center"; x.fillText(it.label, cx + S/2, cy);
        const im = cell(it); x.drawImage(im, cx, cy + lab, S, Math.min(hh, im.height)); x.strokeStyle = "#999"; x.lineWidth = 2; x.strokeRect(cx, cy + lab, S, Math.min(hh, im.height)); });
      y += Math.ceil(r.items.length / per) * (hh + lab + gap) + 4; }
    return c.toDataURL("image/jpeg", .92).split(",")[1];
  };
  const L = draw(["ช", "บ", "ด"].filter(c => legend[c] && legend[c].length).map(c => ({ title: "ตัวอย่างตัว " + c, items: legend[c].map((it, i) => ({ ...it, label: c })) })));
  const Q = draw([{ title: "ตัวที่ต้องตรวจ", items: items.map((it, i) => ({ ...it, label: "#" + (i + 1) })) }]);
  return JSON.stringify([L, Q]);
};
