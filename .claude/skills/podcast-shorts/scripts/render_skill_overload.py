"""Render the skill-overload excerpt using the approved editorial treatment.

Graphics depict the actual wrong-skill examples. They are authored illustrations,
not captured agent logs. Original podcast audio is preserved.
"""
from pathlib import Path
import argparse
import json
from PIL import ImageDraw, ImageFont
from render_short import SKILL, ease, srt_time
from render_editorial import EditorialShort


class SkillOverloadShort(EditorialShort):
    def __init__(self, source, edit, kit, output):
        super().__init__(source, edit, kit, output)
        self.hook_font=ImageFont.truetype(str(kit/'fonts/archivo-display.ttf'),60)
        self.highlight_words={'skill','skill-skill','salah','brainstorming','grill','review','lama','random','diinstalin','dicobain'}
        self.timing=self.edit['graphicTiming']

    def portrait(self, source, left=True, short=False):
        frame=self.background.copy()
        crop=(0,0,640,720) if left else (680,0,1280,575)
        self.pane(frame,source,crop,(0,0,1080,1150 if short else 1370),contain=short)
        draw=ImageDraw.Draw(frame)
        draw.rectangle((48,126,456,247),fill=self.colors['navy'])
        self.add_logo(frame)
        return frame

    def graphic_base(self, source, lines):
        frame=self.background.copy()
        self.add_logo(frame)
        self.pane(frame,source,(0,0,640,720),(560,170,450,420),contain=True)
        for i,line in enumerate(lines):
            self.text(frame,line,(72,410+i*90),self.heading,self.colors['orange'] if i else None)
        return frame

    def overload(self, source, t):
        wrong=t>=self.timing['wrongChoiceAt']
        frame=self.graphic_base(source, ['Salah','pilih.'] if wrong else ['Semua','diinstal.'])
        draw=ImageDraw.Draw(frame)
        self.text(frame,'Contoh skill',(72,650),self.note_font)
        elapsed=t-3.3
        selected=int(max(0,elapsed)*2)%4
        for i,label in enumerate(self.timing['pileLabels']):
            if elapsed>=i*.35:
                y=720+i*126
                self.node(frame,(72,y,900,y+108),label,False,self.head_small)
                if i==selected:
                    draw.rounded_rectangle((72,y,900,y+108),radius=16,outline=self.colors['orange'],width=5)
                # Slide the selection indicator, not the caption or the host.
                if i==selected:
                    x=90+32*ease((elapsed*2)%1)
                    draw.ellipse((x,y+40,x+20,y+60),fill=self.colors['orange'])
        return frame

    def routing(self, source, t, review=False):
        frame=self.graphic_base(source,['Code','review'] if review else ['Nanya','biasa'])
        draw=ImageDraw.Draw(frame)
        request='Code review' if review else 'Nanya biasa'
        self.text(frame,'Yang diminta',(72,680),self.note_font)
        self.node(frame,(72,750,900,890),request,True,self.bold)
        reveal=self.timing['reviewSkillAt'] if review else self.timing['brainstormingAt']
        self.line(draw,(486,900),(486,995),self.colors['orange'],ease((t-reveal)/.35))
        if t>=reveal:
            if review:
                chosen='Skill code review'
            else:
                chosen='Grill' if t>=self.timing['grillAt'] else 'Brainstorming'
            self.node(frame,(72,1010,900,1150),chosen,False,self.head_small if review else self.bold)
            draw.rounded_rectangle((72,1010,900,1150),radius=16,outline=self.colors['orange'],width=5)
            if review and t>=self.timing['oldBadgeAt']:
                draw.rounded_rectangle((650,1174,900,1248),radius=12,fill=self.colors['orange'])
                self.text(frame,'VERSI LAMA',(672,1193),self.note_font,self.colors['navy'])
                self.text(frame,'Skill lama yang terpilih.',(72,1290),self.note_font)
            elif not review:
                self.text(frame,'Pilihan skill melenceng.',(72,1220),self.note_font)
        else:
            self.node(frame,(72,1010,900,1150),'Skill terpilih?',False,self.note_font)
        return frame

    def body_frame(self, source, body_time):
        t=body_time
        scene=next(b['scene'] for b in reversed(self.beats) if b['start']<=t)
        if scene=='overload':
            frame=self.overload(source,t)
        elif scene=='casual-routing':
            frame=self.routing(source,t)
        elif scene=='old-review':
            frame=self.routing(source,t,review=True)
        else:
            frame=self.portrait(source,left=scene!='reaction-right',short=scene in ('cold-open','payoff'))
            if scene=='cold-open':
                for i,line in enumerate(self.edit['title']):
                    if ImageDraw.Draw(frame).textlength(line,font=self.hook_font)>828:
                        raise ValueError('Hook line exceeds safe width')
                    self.text(frame,line,(72,1160+i*62),self.hook_font,self.colors['orange'] if i==2 else None)
            elif scene=='payoff':
                self.text(frame,'Banyak skill.',(72,1170),self.hook_font)
                self.text(frame,'Bisa salah pilih.',(72,1250),self.hook_font,self.colors['orange'])
        self.caption(frame,t)
        return frame

    def prepare(self):
        self.output.mkdir(parents=True,exist_ok=True)
        previews=[('cold-open',.7),('overload',5.4),('casual-question',11.7),('wrong-brainstorming',12.8),('wrong-grill',15.5),('reaction',16),('old-review',29.1),('payoff',32.8)]
        for name,t in previews:
            src=self.source_frame(self.edit['start']+t)
            self.body_frame(src,t).save(self.output/f'preview-{name}.png')
        self.outro_frame(.7).save(self.output/'preview-episode-card.png')
        (self.output/'captions.json').write_text(json.dumps(self.cues,ensure_ascii=False,indent=2))
        (self.output/'captions.srt').write_text('\n\n'.join(f"{i+1}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}" for i,c in enumerate(self.cues))+'\n')

    def render(self):
        super().render()
        path=self.output/'manifest.json'
        m=json.loads(path.read_text())
        m.update({'version':'skill-overload-editorial-v1','graphicTiming':self.timing,'mainSpeaker':'Left source camera, manually selected','graphics':'Authored illustration of the spoken wrong-selection examples; not captured tool output','sourceExtractOffset':self.edit['sourceOffset'],'captionProvenance':self.edit['captionProvenance']})
        path.write_text(json.dumps(m,ensure_ascii=False,indent=2))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,required=True)
    p.add_argument('--edit',type=Path,default=SKILL/'references/kyzTP34JNao-skill-overload.json')
    p.add_argument('--kit',type=Path,default=SKILL/'assets/brand-kit')
    p.add_argument('--output-dir',type=Path,required=True)
    p.add_argument('--preview-only',action='store_true')
    args=p.parse_args()
    name=json.loads(args.edit.read_text())['outputName']
    if (args.output_dir/name).exists():
        p.error('Use a fresh output directory; previous videos are never overwritten')
    video=SkillOverloadShort(args.source,args.edit,args.kit,args.output_dir)
    video.prepare()
    if not args.preview_only:video.render()
    else:print('Skill-overload previews prepared:',args.output_dir)

if __name__=='__main__':main()
