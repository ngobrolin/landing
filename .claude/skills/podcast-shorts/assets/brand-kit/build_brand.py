"""Build outlined vector branding and video design-system review assets.
uv run --no-project --with fonttools --with brotli --with pillow python build_brand.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json

P=Path(__file__).resolve().parent
AS=P/'assets'; AS.mkdir(exist_ok=True)
F=P/'fonts'; F.mkdir(exist_ok=True)
SRC=F/'archivo-variable.woff2'
fonts={}
for name,weight,width in [('display',800,118),('bold',800,100),('medium',600,100),('regular',400,100)]:
    ft=instantiateVariableFont(TTFont(SRC),{'wght':weight,'wdth':width},inplace=False)
    ft.flavor=None; ft.save(F/f'archivo-{name}.ttf'); fonts[name]=ft

C={'navy':'#0e1122','blue':'#2f4fd0','orange':'#f0a030','white':'#f2f4fd','panel':'#191d3a','muted':'#b7c2e4','paper':'#f1f2f6'}

def textpath(text,x,y,size,fill,style='display',tracking=0):
    ft=fonts[style]; gs=ft.getGlyphSet(); cmap=ft.getBestCmap(); scale=size/ft['head'].unitsPerEm
    parts=[]; advance=0
    for ch in text:
        key=cmap[ord(ch)]; pen=SVGPathPen(gs); gs[key].draw(pen)
        parts.append(f'<path d="{pen.getCommands()}" transform="translate({x+advance*scale:.3f} {y}) scale({scale:.6f} {-scale:.6f})" fill="{fill}"/>')
        advance+=gs[key].width+tracking/scale
    return ''.join(parts),advance*scale

def mark(x=0,y=0,size=160,mono=None):
    blue=mono or C['blue']; orange=mono or C['orange']; white=C['navy'] if mono==C['navy'] else C['white']
    # Offset reply bubble is the secondary voice. No tiny waveform or code glyph.
    s=f'<g transform="translate({x} {y}) scale({size/160})">'
    s+=f'<path d="M44 36 H144 Q160 36 160 52 V126 Q160 142 144 142 H130 L130 160 L106 142 H44 Q28 142 28 126 V52 Q28 36 44 36Z" fill="{orange}"/>'
    s+=f'<path d="M16 0 H116 Q132 0 132 16 V94 Q132 110 116 110 H43 L20 130 V110 H16 Q0 110 0 94 V16 Q0 0 16 0Z" fill="{blue}"/>'
    if mono:
        # True transparent knockouts, not painted background-colour strokes.
        shapes=s[s.index('>')+1:]
        mask='<mask id="voices-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160"><rect width="160" height="160" fill="black"/>'+shapes.replace(f'fill="{mono}"','fill="white"')+'<path d="M132 36V94Q132 110 116 110H44" fill="none" stroke="black" stroke-width="6"/><path d="M28 34H101 M28 55H83 M56 77H101" stroke="black" stroke-width="9" stroke-linecap="round"/></mask>'
        return f'<g transform="translate({x} {y}) scale({size/160})"><defs>{mask}</defs><rect width="160" height="160" fill="{mono}" mask="url(#voices-mask)"/></g>'
    # Alternating line alignment carries the two-voice motif.
    s+=f'<path d="M28 34H101 M28 55H83 M56 77H101" stroke="{C['white']}" stroke-width="9" stroke-linecap="round"/>'
    return s+'</g>'

def svg(name,w,h,body):
    text=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title"><title id="title">Ngobrolin WEB</title>{body}</svg>'
    (AS/name).write_text(text)

# Transparent logo assets. Every letter is an outline, no font installation required.
for variant,ink,mono in [('dark',C['white'],None),('light',C['navy'],None),('mono-dark',C['white'],C['white']),('mono-light',C['navy'],C['navy'])]:
    body=mark(0,0,160,mono)
    t,_=textpath('NGOBROLIN',205,69,78,ink,tracking=-1.1); body+=t
    t,_=textpath('WEB',205,139,78,ink,tracking=-1.1); body+=t
    svg(f'logo-{variant}.svg',790,160,body)
svg('symbol.svg',160,160,mark())
svg('symbol-mono-dark.svg',160,160,mark(mono=C['white']))
svg('symbol-mono-light.svg',160,160,mark(mono=C['navy']))
for variant,ink in [('dark',C['white']),('light',C['navy'])]:
    body=mark(224,0,192)
    t,tw=textpath('NGOBROLIN',0,292,88,ink,tracking=-1.1)
    # Derive the true word width so the asset has equal horizontal margins.
    body+=f'<g transform="translate({(640-tw)/2:.3f} 0)">{t}</g>'
    t,tw=textpath('WEB',0,389,108,ink,tracking=-1.1)
    body+=f'<g transform="translate({(640-tw)/2:.3f} 0)">{t}</g>'
    svg(f'logo-stacked-{variant}.svg',640,410,body)

tokens={
 'status':'direction-approved-v1-video-implementation-pending',
 'colors':C,
 'typography':{'family':'Archivo','display':{'weight':800,'width':118},'caption':{'weight':800,'width':100,'size':56,'lineHeight':66},'label':{'weight':600,'size':32}},
 'video':{'width':1080,'height':1920,'fps':30,'safe':{'left':72,'right':180,'top':150,'bottom':370},'caption':{'x':72,'y':1390,'maxWidth':828,'maxLines':2,'fontSize':56,'lineHeight':66,'padding':24,'maxWordsPerCue':9},'logo':{'x':72,'y':150,'width':360},'title':{'maxLines':2,'size':80,'introOnly':True}},
 'motion':{'layoutTransitionMs':240,'captionTransitionMs':0,'logoRevealMs':420,'introMaxMs':900,'outroMaxMs':1500,'ease':'cubic-bezier(0.16,1,0.3,1)','minimumShotHoldMs':2000}
}
(P/'tokens.json').write_text(json.dumps(tokens,indent=2))

# Raster portrait layout studies use actual podcast footage, not synthetic people.
# Reuse the included source still. No external checkout or media download required.
assert (AS/'source-frame.jpg').exists(), 'Included source still is missing'
photo=Image.open(AS/'source-frame.jpg').convert('RGB')
font=lambda size,kind='bold':ImageFont.truetype(str(F/f'archivo-{kind}.ttf'),size)

def make_shell(mode):
    im=Image.new('RGB',(1080,1920),C['navy']); d=ImageDraw.Draw(im)
    if mode=='solo':
        face=ImageOps.fit(photo.crop((740,0,1260,405)),(1080,1080),method=Image.Resampling.LANCZOS,centering=(.5,.35))
        im.paste(face,(0,260))
    elif mode=='duo':
        a=ImageOps.contain(photo.crop((640,0,1280,405)),(1080,580),method=Image.Resampling.LANCZOS)
        b=ImageOps.contain(photo.crop((0,0,640,575)),(1080,540),method=Image.Resampling.LANCZOS)
        im.paste(a,((1080-a.width)//2,220));im.paste(b,((1080-b.width)//2,820))
        d.rectangle((72,802,900,808),fill=C['blue'])
    else:
        # Repeatable bookend design, not a rendered intro animation.
        d.rounded_rectangle((72,510,1008,1100),radius=16,fill=C['blue'])
        d.text((112,570),'LLM itu kayak',font=font(80,'display'),fill=C['white'])
        d.text((112,675),'kuda liar.',font=font(90,'display'),fill=C['white'])
        d.rectangle((112,855,252,865),fill=C['orange'])
        d.text((112,925),'Coding Harness',font=font(40,'medium'),fill=C['white'])
    if mode!='title':
        d.rounded_rectangle((48,1370,924,1550),radius=16,fill=C['navy'])
        d.text((72,1390),'LLM itu kayak kuda.',font=font(56),fill=C['white'])
        d.text((72,1456),'Bisa lari ke mana-mana.',font=font(56),fill=C['white'])
        # This is a static style study. The two lines are intentionally illustrative,
        # not claimed to be the simultaneously spoken caption in an actual edit.
    im.save(AS/f'layout-{mode}.png')
for mode in ['solo','duo','title']:make_shell(mode)

# Explicit origin metadata for sourced imagery and authored raster studies.
provenance={'source-frame.jpg':{'source':'https://www.youtube.com/watch?v=kyzTP34JNao','timestampSeconds':1620,'method':'FFmpeg extract from original podcast footage'},**{f'layout-{m}.png':{'source':'source-frame.jpg' if m!='title' else 'authored typography and geometry','method':'Pillow layout study; not an edited video; caption copy illustrative'} for m in ['solo','duo','title']}}
(P/'asset-provenance.json').write_text(json.dumps(provenance,indent=2))
assert (F/'OFL.txt').is_file(), 'Include the font license before distributing assets'
print('Built',len(list(AS.iterdir())),'assets in',P)
