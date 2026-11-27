import json, re
pal = open('src/palettes.js').read()
html = open('src/app.html').read().replace('/*__PALETTES__*/', pal)
main = open('src/main.js').read().replace('/*__PALETTES__*/', pal)
lines = html.split('\n')
arr = '[\n' + ',\n'.join(json.dumps(l, ensure_ascii=True) for l in lines) + '\n].join("\\n")'
main = main.replace('/*__HTML__*/""', arr)
main = main.rstrip('\n') + '\n// ===== จบไฟล์ (ถ้าไม่เห็นบรรทัดนี้ แปลว่าไฟล์มาไม่ครบ) =====\n'
import os; pass
open('app.js','w').write(main)
open('preview.html','w').write(html)
print(len(main), 'bytes')
