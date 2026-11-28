import json, re
pal = open('src/palettes.js').read()
html = open('src/app.html').read().replace('/*__PALETTES__*/', pal + open('src/icons.js').read() + open('src/grid.js').read())
main = open('src/main.js').read().replace('/*__PALETTES__*/', pal).replace('/*__WIDGETS__*/', open('src/widgets.js').read())
lines = html.split('\n')
arr = '[\n' + ',\n'.join(json.dumps(l, ensure_ascii=True) for l in lines) + '\n].join("\\n")'
main = main.replace('/*__HTML__*/""', arr)
main = main.rstrip('\n') + '\n// ===== จบไฟล์ (ถ้าไม่เห็นบรรทัดนี้ แปลว่าไฟล์มาไม่ครบ) =====\n'
import subprocess   # กันพัง: สคริปต์ในหน้าเว็บ (grid.js) ต้องคอมไพล์ผ่าน เพราะ node --check app.js ไม่ตรวจโค้ดที่อยู่ในสตริง HTML
r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync('src/grid.js','utf8'))"], capture_output=True, text=True)
if r.returncode: raise SystemExit('grid.js syntax error:\n' + r.stderr)
open('app.js','w').write(main)
open('preview.html','w').write(html)
print(len(main), 'bytes')
