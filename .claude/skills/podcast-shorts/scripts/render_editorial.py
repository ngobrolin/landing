"""Editorial horse-analogy short with timed explanatory graphics.

Uses the same source and speech-aligned captions as the earlier pilot.
No stock media, synthetic people, narration or publication actions.
"""
from pathlib import Path
import argparse
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageOps
from render_short import Short, SKILL, ease, srt_time


class EditorialShort(Short):
    def __init__(self, source, edit, kit, output):
        super().__init__(source, edit, kit, output)
        self.beats = self.edit['editorialBeats']
        self.heading = ImageFont.truetype(str(kit/'fonts/archivo-display.ttf'), 76)
        self.head_small = ImageFont.truetype(str(kit/'fonts/archivo-bold.ttf'), 44)
        self.diagram_font = ImageFont.truetype(str(kit/'fonts/archivo-bold.ttf'), 36)
        self.note_font = ImageFont.truetype(str(kit/'fonts/archivo-medium.ttf'), 34)
        self.thumbnail = Image.open(SKILL/'assets/episode-thumbnails'/f"{self.edit['videoId']}.jpg").convert('RGB')
        if self.beats[0]['start'] != 0:
            raise ValueError('Editorial cold open must start at zero')
        self.highlight_words = {'llm','kuda','liar','dikendalikan','mengendalikan','harness','harness-nya','lurus','jinak','dijinakkan'}

    def text(self, image, text, xy, font, fill=None):
        ImageDraw.Draw(image).text(xy, text, font=font, fill=fill or self.colors['white'], anchor='lt')

    def video_background(self, source, left=False):
        frame = self.background.copy()
        crop = (120, 0, 580, 575) if left else (795, 0, 1225, 575)
        # Fill the picture area, not only the text-safe rectangle. Keep the mouth
        # and chin; source live-chat remains where baked into the recording.
        self.pane(frame, source, crop, (0, 0, 1080, 1540))
        draw = ImageDraw.Draw(frame)
        draw.rectangle((48,126,456,247), fill=self.colors['navy'])
        self.add_logo(frame)
        return frame

    def reaction(self, frame, source):
        # Secondary host remains close to the active picture instead of creating
        # a second tiny video pane surrounded by unused navy space.
        x,y,w,h = 72,1120,280,230
        draw = ImageDraw.Draw(frame)
        draw.rectangle((x-4,y-4,x+w+4,y+h+4), fill=self.colors['navy'])
        self.pane(frame,source,(100,40,600,575),(x,y,w,h),contain=True)

    def caption(self, frame, time):
        cue = next((c for c in self.cues if c['start'] <= time < c['end']),None)
        if not cue:
            return
        draw=ImageDraw.Draw(frame)
        lines=cue['text'].split('\n')
        widths=[draw.textlength(line,font=self.bold) for line in lines]
        x,y=72,1390
        rect=(48,y-24,math.ceil(x+max(widths)+24),y+(len(lines)-1)*66+82)
        if rect[3]>1550:
            raise ValueError('Caption exceeds safe region')
        draw.rounded_rectangle(rect,radius=16,fill=self.colors['navy'])
        for i,line in enumerate(lines):
            xx=float(x)
            for word in line.split(' '):
                key=word.lower().strip('.,!?;:')
                fill=self.colors['orange'] if key in self.highlight_words else self.colors['white']
                draw.text((xx,y+i*66),word,font=self.bold,fill=fill,anchor='lt')
                xx+=draw.textlength(word+' ',font=self.bold)
            if xx>924:
                raise ValueError('Highlighted phrase exceeds safe width')

    def line(self, draw, a, b, color, progress=1.0, width=6):
        progress=max(0,min(1,progress))
        end=(a[0]+(b[0]-a[0])*progress,a[1]+(b[1]-a[1])*progress)
        draw.line((a,end),fill=color,width=width)
        if progress>=1:
            angle=math.atan2(b[1]-a[1],b[0]-a[0])
            points=[b,(b[0]-18*math.cos(angle-.45),b[1]-18*math.sin(angle-.45)),(b[0]-18*math.cos(angle+.45),b[1]-18*math.sin(angle+.45))]
            draw.polygon(points,fill=color)

    def node(self, frame, rect, title, active=False, font=None):
        draw=ImageDraw.Draw(frame)
        draw.rounded_rectangle(rect,radius=16,fill=self.colors['blue'] if active else self.colors['panel'])
        font=font or self.diagram_font
        width=draw.textlength(title,font=font)
        if width>rect[2]-rect[0]-20:
            raise ValueError(f'Diagram label does not fit: {title}')
        draw.text(((rect[0]+rect[2]-width)/2,(rect[1]+rect[3])/2-22),title,font=font,fill=self.colors['white'],anchor='lt')

    def diagram(self, source, body_time, kind):
        frame=self.background.copy()
        self.add_logo(frame)
        # Retain a real, live host inset while the explanatory diagram leads.
        self.pane(frame,source,(680,0,1280,575),(560,170,450,420),contain=True)
        if kind=='branching':
            self.text(frame,'Tanpa', (72,410),self.heading)
            self.text(frame,'kendali', (72,500),self.heading,self.colors['orange'])
            self.node(frame,(72,760,292,900),'LLM',True,self.head_small)
            draw=ImageDraw.Draw(frame)
            elapsed=body_time-2.62
            labels=[('ke sini',650),('ke sana',830),('ke mana?',1010)]
            for i,(label,y) in enumerate(labels):
                self.node(frame,(660,y,900,y+110),label)
                self.line(draw,(292,830),(650,y+55),self.colors['muted'],ease((elapsed-i*.12)/.45))
                amount=max(0,min(1,(elapsed-.3-i*.16)/1.7))
                if elapsed>.3+i*.16:
                    x=292+(650-292)*amount;yy=830+(y+55-830)*amount
                    draw.ellipse((x-10,yy-10,x+10,yy+10),fill=self.colors['orange'])
            self.text(frame,'Arahnya bisa ke mana-mana.',(72,1200),self.note_font)
            return frame

        heading={'harness':'HARNESS','focused':'Satu arah.','resolution':'Lebih terarah.'}[kind]
        if kind=='resolution':
            self.text(frame,'Lebih',(72,410),self.heading)
            self.text(frame,'terarah.',(72,500),self.heading,self.colors['orange'])
        else:
            self.text(frame,heading,(72,450),self.heading,self.colors['orange'] if kind=='harness' else None)
            self.text(frame,'Membatasi arah',(72,548),self.note_font)
        draw=ImageDraw.Draw(frame)
        first=(72,760,292,900);middle=(380,760,600,900);last=(680,760,900,900)
        resolved=kind=='resolution' and body_time>=33.66
        self.node(frame,first,'LLM',True,self.head_small)
        self.node(frame,middle,'HARNESS',True)
        self.node(frame,last,'TUJUAN',resolved)
        self.line(draw,(300,830),(370,830),self.colors['orange'],ease((body_time-7.28)/.5))
        right_color=self.colors['orange'] if kind in ('focused','resolution') else self.colors['muted']
        self.line(draw,(608,830),(670,830),right_color,ease((body_time-7.78)/.5))
        if kind in ('focused','resolution'):
            if kind=='resolution':
                amount=max(0,min(1,(body_time-30.82)/(33.66-30.82)))
            else:
                amount=max(0,min(1,(body_time-16.74)/1.72))
            xx=182+(790-182)*amount
            draw.ellipse((xx-11,923,xx+11,945),fill=self.colors['orange'])
            draw.line((182,934,790,934),fill=self.colors['muted'],width=2)
            draw.line((182,934,xx,934),fill=self.colors['orange'],width=6)
        for i,control in enumerate(self.edit['controlReveals']):
            if body_time>=control['at']:
                if i<3:
                    x=72+i*282;rect=(x,1030,x+264,1120)
                else:
                    rect=(72,1150,900,1240)
                self.node(frame,rect,control['label'],kind=='focused' and i==3)
        if resolved:
            self.text(frame,'Kendali membantu menjaga arah.',(72,1280),self.note_font)
        return frame

    def body_frame(self, source, body_time):
        scene=next(b['scene'] for b in reversed(self.beats) if b['start']<=body_time)
        if scene in ('branching','harness','focused','resolution'):
            frame=self.diagram(source,body_time,scene)
        else:
            frame=self.video_background(source,left=scene=='solo-left')
            if scene=='duo':
                self.reaction(frame,source)
            if scene=='cold-open':
                draw=ImageDraw.Draw(frame)
                draw.rectangle((48,1120,915,1320),fill=self.colors['navy'])
                self.text(frame,'LLM =',(72,1140),self.heading)
                self.text(frame,'KUDA LIAR',(72,1230),self.heading,self.colors['orange'])
        self.caption(frame,body_time)
        return frame

    def outro_frame(self,time):
        frame=self.background.copy()
        self.add_logo(frame,640,(72,220))
        image=self.thumbnail.crop(self.edit['thumbnailCrop'])
        image=ImageOps.fit(image,(828,466),method=Image.Resampling.LANCZOS)
        # Only a small position settle. Real thumbnail content stays legible.
        y=round(440+18*(1-ease(time/.24)))
        frame.paste(image,(72,y))
        self.text(frame,self.edit['episodeTitle'],(72,970),self.heading)
        self.text(frame,'Tonton obrolan lengkap',(72,1110),self.head_small)
        self.text(frame,'ngobrol.in',(72,1190),self.bold,self.colors['orange'])
        return frame

    def prepare(self):
        self.output.mkdir(parents=True,exist_ok=True)
        for name,t in [('cold-open',.7),('branching',4.4),('harness',14.8),('focused',18.6),('resolution',34.6),('duo',6),('solo-left',25.5)]:
            source=self.source_frame(self.edit['start']+t)
            self.body_frame(source,t).save(self.output/f'preview-{name}.png')
        self.outro_frame(.7).save(self.output/'preview-episode-card.png')
        (self.output/'captions.json').write_text(json.dumps(self.cues,ensure_ascii=False,indent=2))
        (self.output/'captions.srt').write_text('\n\n'.join(f"{i+1}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}" for i,c in enumerate(self.cues))+'\n')

    def render(self):
        super().render()
        path=self.output/'manifest.json'
        manifest=json.loads(path.read_text())
        manifest.update({'version':'v3-editorial','coldOpen':True,'shots':self.beats,'controlReveals':self.edit['controlReveals'],'graphics':'Authored conceptual diagrams, not source-podcast visuals','thumbnailSource':self.edit['thumbnailSource'],'sourceChat':'Retained where present in the source footage','captionEmphasis':'Selected concept words only, not word-by-word animation'})
        path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
        print('Editorial output:',self.output/self.edit['outputName'])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--edit',type=Path,default=SKILL/'references/kyzTP34JNao-horse-v3.json')
    parser.add_argument('--kit',type=Path,default=SKILL/'assets/brand-kit')
    parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--preview-only',action='store_true')
    args=parser.parse_args()
    name=json.loads(args.edit.read_text())['outputName']
    if (args.output_dir/name).exists():
        parser.error('Use a fresh output directory; previous versions are never overwritten')
    video=EditorialShort(args.source,args.edit,args.kit,args.output_dir)
    video.prepare()
    if not args.preview_only:
        video.render()
    else:
        print('Editorial previews prepared:',args.output_dir)


if __name__=='__main__':
    main()
