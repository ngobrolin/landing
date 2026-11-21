import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const sourceDir=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
if(args.length!==0&&(args.length!==2||args[0]!=='--kit-dir'))throw new Error('Usage: node verify.mjs [--kit-dir <path>]');
const p=args.length===2?path.resolve(args[1]):sourceDir;
if(!fs.existsSync(path.join(p,'index.html')))throw new Error(`Brand kit not found at ${p}`);

const tokens=JSON.parse(fs.readFileSync(path.join(p,'tokens.json'),'utf8'));
const dtcg=JSON.parse(fs.readFileSync(path.join(p,'tokens.dtcg.json'),'utf8'));
const tokenChecks=[];
const checkToken=(name,actual,expected)=>tokenChecks.push({name,actual,expected,passed:typeof actual==='number'&&typeof expected==='number'?Math.abs(actual-expected)<1e-9:actual===expected});
const colorFields=[['blue','primary'],['navy','background'],['white','foreground'],['panel','panel'],['muted','muted'],['orange','highlight'],['paper','paper']];
for(const [tokenName,dtcgName] of colorFields){
  const hex=tokens.colors[tokenName];
  const portable=dtcg.color[dtcgName].$value;
  checkToken(`${dtcgName} color space`,portable.colorSpace,'srgb');
  checkToken(`${dtcgName} hex`,portable.hex,hex);
  for(const [index,offset] of [1,3,5].entries())checkToken(`${dtcgName} component ${index}`,portable.components[index],Math.round(Number.parseInt(hex.slice(offset,offset+2),16)/255*1000)/1000);
}
const typographyStyles=[['display','title'],['caption','caption'],['label','label']];
for(const [tokenName,dtcgName] of typographyStyles){
  const token=tokens.typography[tokenName];
  const portable=dtcg.typography[dtcgName].$value;
  checkToken(`${dtcgName} font family`,portable.fontFamily,tokens.typography.family);
  checkToken(`${dtcgName} font size`,portable.fontSize.value,token.size);
  checkToken(`${dtcgName} font size unit`,portable.fontSize.unit,'px');
  checkToken(`${dtcgName} font weight`,portable.fontWeight,token.weight);
  checkToken(`${dtcgName} letter spacing`,portable.letterSpacing.value,token.letterSpacing);
  checkToken(`${dtcgName} letter spacing unit`,portable.letterSpacing.unit,'px');
  checkToken(`${dtcgName} line height`,portable.lineHeight,token.lineHeight/token.size);
}
const spacingFields=[['unit','unit'],['captionPadding','caption-padding'],['safeLeft','safe-left'],['safeRight','safe-right'],['safeTop','safe-top'],['safeBottom','safe-bottom']];
for(const [tokenName,dtcgName] of spacingFields){
  checkToken(`${dtcgName} spacing`,dtcg.spacing[dtcgName].$value.value,tokens.spacing[tokenName]);
  checkToken(`${dtcgName} spacing unit`,dtcg.spacing[dtcgName].$value.unit,'px');
}
checkToken('panel radius',dtcg.rounded.panel.$value.value,tokens.rounded.panel);
checkToken('panel radius unit',dtcg.rounded.panel.$value.unit,'px');
checkToken('caption font size',tokens.video.caption.fontSize,tokens.typography.caption.size);
checkToken('caption line height',tokens.video.caption.lineHeight,tokens.typography.caption.lineHeight);
checkToken('caption padding',tokens.video.caption.padding,tokens.spacing.captionPadding);
checkToken('title font size',tokens.video.title.size,tokens.typography.display.size);
for(const side of ['left','right','top','bottom'])checkToken(`video safe ${side}`,tokens.video.safe[side],tokens.spacing[`safe${side[0].toUpperCase()}${side.slice(1)}`]);
const tokenMismatches=tokenChecks.filter(check=>!check.passed);
if(tokenMismatches.length)throw new Error(`Generated token mismatch: ${JSON.stringify(tokenMismatches)}`);

let root=sourceDir;
while (!fs.existsSync(path.join(root,'package.json'))) {
  const parent=path.dirname(root);
  if(parent===root) throw new Error('Run from a landing checkout with dependencies installed');
  root=parent;
}
const require=createRequire(path.join(root,'package.json'));
const {chromium}=require('@playwright/test');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(p,'index.html')).href);
  const requiredArchivoFaces=[
    {name:'body',weight:400,stretch:100},
    {name:'label',weight:600,stretch:100},
    {name:'caption',weight:800,stretch:100},
    {name:'display',weight:800,stretch:118}
  ];
  const fontVerification=await page.evaluate(async required=>{
    const normalizeFamily=family=>family.replaceAll('"','').replaceAll("'",'').trim();
    const includesValue=(descriptor,value)=>{
      const values=descriptor.match(/[\d.]+/g)?.map(Number)??[];
      return values.length===1?values[0]===value:values.length===2&&value>=values[0]&&value<=values[1];
    };
    const declared=[...document.fonts].filter(face=>normalizeFamily(face.family)==='Archivo');
    const loaded=await Promise.all(declared.map(async face=>{
      let loadError=null;
      try{await face.load()}catch(error){loadError=String(error)}
      return {family:normalizeFamily(face.family),weight:face.weight,stretch:face.stretch,status:face.status,loadError};
    }));
    await document.fonts.ready;
    const checks=required.map(face=>{
      const descriptor=`${face.weight} 24px "Archivo"`;
      const supportingFaces=loaded.filter(candidate=>candidate.status==='loaded'&&includesValue(candidate.weight,face.weight)&&includesValue(candidate.stretch,face.stretch));
      return {...face,documentCheck:document.fonts.check(descriptor),supportingFaces:supportingFaces.length,passed:document.fonts.check(descriptor)&&supportingFaces.length>0};
    });
    return {declared:loaded,checks};
  },requiredArchivoFaces);
  const missingFonts=fontVerification.checks.filter(check=>!check.passed);
  if(missingFonts.length)throw new Error(`Required Archivo faces failed to load: ${JSON.stringify({missingFonts,declared:fontVerification.declared})}`);
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
    await page.goto(pathToFileURL(path.join(p,'assets',name+'.svg')).href);
    await page.evaluate(()=>{document.documentElement.style.width='100vw';document.documentElement.style.height='100vh'});
    await page.screenshot({path:path.join(p,'assets',name+'.png'),omitBackground:true});
  }
  const receipt={pageErrors:errors,desktopOverflow,mobileOverflow,safeAreaToggle:'passed',assetImagesDecoded:true,tokenAgreement:{passed:true,checks:tokenChecks.length},fontFaces:fontVerification.checks,viewports:[1440,390],screenshots:['logo-board.png','design-system-board.png','mobile-review.png']};
  fs.writeFileSync(path.join(p,'browser-verification.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
}finally{
  await browser.close();
}
