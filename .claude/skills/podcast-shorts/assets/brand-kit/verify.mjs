import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const p=path.dirname(fileURLToPath(import.meta.url));
let root=p;
while (!fs.existsSync(path.join(root,'package.json'))) {
  const parent=path.dirname(root);
  if(parent===root) throw new Error('Run from a landing checkout with dependencies installed');
  root=parent;
}
const require=createRequire(path.join(root,'package.json'));
const {chromium}=require('@playwright/test');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+path.join(p,'index.html'));
await page.evaluate(()=>document.fonts.ready);
await page.locator('img').evaluateAll(async imgs=>Promise.all(imgs.map(i=>i.decode())));
await page.locator('#logo-board').screenshot({path:path.join(p,'logo-board.png')});
await page.locator('#system-board').screenshot({path:path.join(p,'design-system-board.png')});
const before=await page.locator('.safe').first().isVisible();
await page.locator('#safe-toggle').click();
if(before || !await page.locator('.safe').first().isVisible())throw Error('Safe area toggle failed');
await page.locator('#safe-toggle').click();
const desktopOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:path.join(p,'mobile-review.png'),fullPage:true});
const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
if(errors.length || desktopOverflow || mobileOverflow) throw Error(JSON.stringify({errors,desktopOverflow,mobileOverflow}));
// Render independent SVG rasters through the browser. Outlines do not need fonts.
for(const name of fs.readdirSync(path.join(p,'assets')).filter(f=>f.endsWith('.svg')).map(f=>f.slice(0,-4))){
  await page.setViewportSize(name.startsWith('symbol')?{width:640,height:640}:name.includes('stacked')?{width:1280,height:820}:{width:1580,height:320});
  await page.goto('file://'+path.join(p,'assets',name+'.svg'));
  await page.evaluate(()=>{document.documentElement.style.width='100vw';document.documentElement.style.height='100vh'});
  await page.screenshot({path:path.join(p,'assets',name+'.png'),omitBackground:true});
}
await browser.close();
const receipt={pageErrors:errors,desktopOverflow,mobileOverflow,safeAreaToggle:'passed',assetImagesDecoded:true,viewports:[1440,390],screenshots:['logo-board.png','design-system-board.png','mobile-review.png']};
fs.writeFileSync(path.join(p,'browser-verification.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt,null,2));
