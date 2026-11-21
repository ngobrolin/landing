"""Render a local captioned portrait short with the approved project kit.

Requires FFmpeg and Pillow. No downloads, uploads, or synthetic speech.
The source must be the exact extract described by the edit recipe.
"""
from pathlib import Path
import argparse
import io
import json
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

SKILL = Path(__file__).resolve().parents[1]


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def ease(value):
    value = max(0.0, min(1.0, value))
    return 1 - (1 - value) ** 4


def interpolate(a, b, amount):
    return tuple(round(x + (y - x) * amount) for x, y in zip(a, b))


def srt_time(seconds):
    value = round(seconds * 1000)
    hours, value = divmod(value, 3600000)
    minutes, value = divmod(value, 60000)
    secs, millis = divmod(value, 1000)
    return f'{hours:02}:{minutes:02}:{secs:02},{millis:03}'


class Short:
    def __init__(self, source, edit, kit, output):
        self.source, self.kit, self.output = source, kit, output
        self.edit = json.loads(edit.read_text())
        self.tokens = json.loads((kit / 'tokens.json').read_text())
        video = self.tokens['video']
        self.w, self.h, self.fps = video['width'], video['height'], video['fps']
        self.colors = self.tokens['colors']
        self.intro = self.edit['intro']
        self.body = self.edit['end'] - self.edit['start']
        self.outro = self.edit['outro']
        self.frames = [round(t * self.fps) for t in (self.intro, self.body, self.outro)]
        self.duration = sum(self.frames) / self.fps
        self.background = Image.new('RGB', (self.w, self.h), self.colors['navy'])
        self.logo = Image.open(kit / 'assets/logo-dark.png').convert('RGBA')
        self.stacked = Image.open(kit / 'assets/logo-stacked-dark.png').convert('RGBA')
        self.bold = ImageFont.truetype(str(kit / 'fonts/archivo-bold.ttf'), 56)
        self.display = ImageFont.truetype(str(kit / 'fonts/archivo-display.ttf'), 80)
        self.small = ImageFont.truetype(str(kit / 'fonts/archivo-medium.ttf'), 32)
        self.caption_geometry = []
        self.cues = self.prepare_cues()
        self.probe = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_streams', '-show_format',
            '-of', 'json', str(source)
        ]))
        video_stream = next(s for s in self.probe['streams'] if s['codec_type'] == 'video')
        self.source_w, self.source_h = video_stream['width'], video_stream['height']
        if (self.source_w, self.source_h) != (1280, 720):
            raise ValueError('This source-composite recipe requires the original 1280x720 extract')
        if float(self.probe['format']['duration']) < self.edit['end']:
            raise ValueError('Source extract does not cover the requested edit')
        if self.edit['shots'][0]['start'] != 0:
            raise ValueError('The first shot must begin at the excerpt start')
        if any(s['layout'] not in ('solo-right', 'solo-left', 'duo') for s in self.edit['shots']):
            raise ValueError('Unknown shot layout')
        if any(a['start'] >= b['start'] for a, b in zip(self.edit['shots'], self.edit['shots'][1:])):
            raise ValueError('Shots must be ordered')
        if self.edit['shots'][-1]['start'] >= self.body:
            raise ValueError('A shot starts after the excerpt ends')

    def wrap(self, text):
        draw = ImageDraw.Draw(self.background)
        lines, line = [], ''
        for word in text.split():
            candidate = f'{line} {word}'.strip()
            if line and draw.textlength(candidate, font=self.bold) > self.tokens['video']['caption']['maxWidth']:
                lines.append(line)
                line = word
            else:
                line = candidate
        if line:
            lines.append(line)
        if len(lines) > 2 or any(draw.textlength(line, font=self.bold) > 828 for line in lines):
            raise ValueError(f'Caption needs a shorter timed phrase: {text}')
        return lines

    def prepare_cues(self):
        result = []
        end = self.intro + self.body
        for cue in self.edit['captions']:
            start = cue['start'] - self.edit['start'] + self.intro
            stop = cue['end'] - self.edit['start'] + self.intro
            if start < self.intro or stop > end + 0.001 or stop <= start:
                raise ValueError(f'Invalid caption timing: {cue}')
            lines = self.wrap(cue['text'])
            result.append({'start': round(start, 3), 'end': round(stop, 3), 'text': '\n'.join(lines)})
        if any(a['end'] > b['start'] for a, b in zip(result, result[1:])):
            raise ValueError('Captions overlap')
        return result

    def add_logo(self, image, width=360, xy=(72, 150), opacity: float = 1.0):
        logo = self.logo.resize((width, round(width * self.logo.height / self.logo.width)), Image.Resampling.LANCZOS)
        if opacity < 1:
            logo.putalpha(logo.getchannel('A').point([round(x * opacity) for x in range(256)]))
        image.paste(logo, xy, logo)

    def caption(self, frame, time):
        cue = next((c for c in self.cues if c['start'] <= time < c['end']), None)
        if cue is None:
            return
        draw = ImageDraw.Draw(frame)
        lines = cue['text'].split('\n')
        widths = [draw.textlength(line, font=self.bold) for line in lines]
        x, y, spacing = 72, 1390, 66
        # Anchor top-left by glyph bounds rather than Pillow's default ascender offset.
        bottom = y + (len(lines) - 1) * spacing + 58
        rect = (x - 24, y - 24, math.ceil(x + max(widths) + 24), bottom + 24)
        if rect[3] > self.h - self.tokens['video']['safe']['bottom']:
            raise ValueError('Caption backing extends into bottom UI reserve')
        draw.rounded_rectangle(rect, radius=16, fill=self.colors['navy'])
        for index, line in enumerate(lines):
            draw.text((x, y + index * spacing), line, font=self.bold, fill=self.colors['white'], anchor='lt')

    def pane(self, frame, source, crop, rect, contain=False):
        x, y, width, height = (round(v) for v in rect)
        if width < 2 or height < 2 or y >= self.h:
            return
        video = source.crop(crop)
        if contain:
            video = ImageOps.contain(video, (width, height), method=Image.Resampling.LANCZOS)
            x += (width - video.width) // 2
            y += (height - video.height) // 2
        else:
            video = ImageOps.fit(video, (width, height), method=Image.Resampling.LANCZOS)
        frame.paste(video, (x, y))

    def layout(self, source, name, reframe=None):
        frame = self.background.copy()
        if reframe is not None:
            # The same right-hand source shot expands/contracts. The other host
            # enters from below; there is no cross-dissolve ghosting of faces.
            amount = reframe
            crop = interpolate((680, 0, 1280, 575), (640, 0, 1280, 575), amount)
            rect = interpolate((0, 260, 1080, 1060), (234, 260, 612, 550), amount)
            self.pane(frame, source, crop, rect)
            self.pane(frame, source, (0, 0, 640, 575), (0, 1900 - 1070 * amount, 1080, 500), contain=True)
        elif name == 'solo-right':
            self.pane(frame, source, (680, 0, 1280, 575), (0, 260, 1080, 1060))
        elif name == 'solo-left':
            self.pane(frame, source, (20, 20, 640, 575), (0, 260, 1080, 1060))
        else:
            self.pane(frame, source, (640, 0, 1280, 575), (0, 260, 1080, 550), contain=True)
            self.pane(frame, source, (0, 0, 640, 575), (0, 830, 1080, 500), contain=True)
        self.add_logo(frame)
        return frame

    def body_frame(self, source, body_time):
        shots = self.edit['shots']
        index = max(i for i, shot in enumerate(shots) if shot['start'] <= body_time)
        shot = shots[index]
        reframe = None
        transition = self.tokens['motion']['layoutTransitionMs'] / 1000
        if index and shot.get('transition') == 'reframe' and body_time - shot['start'] < transition:
            previous = shots[index - 1]['layout']
            if {previous, shot['layout']} == {'solo-right', 'duo'}:
                amount = ease((body_time - shot['start']) / transition)
                reframe = amount if shot['layout'] == 'duo' else 1 - amount
        frame = self.layout(source, shot['layout'], reframe)
        self.caption(frame, body_time + self.intro)
        return frame

    def intro_frame(self, time):
        frame = self.background.copy()
        progress = ease(time / (self.tokens['motion']['logoRevealMs'] / 1000))
        # Brand appears in-place, without stretching or redrawing the logo.
        self.add_logo(frame, 790, (72, round(400 + 24 * (1 - progress))), .35 + .65 * progress)
        draw = ImageDraw.Draw(frame)
        for index, line in enumerate(self.edit['title']):
            if draw.textlength(line, font=self.display) > 828:
                raise ValueError('Opening title exceeds safe width')
            draw.text((72, 730 + index * 92), line, font=self.display, fill=self.colors['white'], anchor='lt')
        draw.rectangle((72, 970, round(72 + 140 * progress), 978), fill=self.colors['orange'])
        return frame

    def outro_frame(self, time):
        frame = self.background.copy()
        progress = ease(time / .42)
        logo = self.stacked.resize((640, 410), Image.Resampling.LANCZOS)
        logo.putalpha(logo.getchannel('A').point([round(x * (.35 + .65 * progress)) for x in range(256)]))
        frame.paste(logo, (180, round(340 + 24 * (1 - progress))), logo)
        draw = ImageDraw.Draw(frame)
        draw.text((72, 970), 'Obrolan lengkap', font=self.bold, fill=self.colors['white'], anchor='lt')
        draw.text((72, 1044), 'di ngobrol.in', font=self.bold, fill=self.colors['white'], anchor='lt')
        draw.rectangle((72, 1180, round(72 + 140 * progress), 1188), fill=self.colors['orange'])
        return frame

    def source_frame(self, relative_seconds):
        data = subprocess.check_output([
            'ffmpeg', '-v', 'error', '-ss', str(relative_seconds), '-i', str(self.source),
            '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'
        ])
        return Image.open(io.BytesIO(data)).convert('RGB')

    def prepare(self):
        self.output.mkdir(parents=True, exist_ok=True)
        for name, time in [('solo-right', 1), ('duo', 19.5), ('solo-left', 26)]:
            source = self.source_frame(self.edit['start'] + time)
            frame = self.layout(source, name)
            self.caption(frame, time + self.intro)
            frame.save(self.output / f'preview-{name}.png')
        self.intro_frame(.25).save(self.output / 'preview-intro.png')
        self.outro_frame(.8).save(self.output / 'preview-outro.png')
        (self.output / 'captions.json').write_text(json.dumps(self.cues, ensure_ascii=False, indent=2))
        (self.output / 'captions.srt').write_text('\n\n'.join(
            f"{i+1}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}"
            for i, c in enumerate(self.cues)
        ) + '\n')

    def render(self):
        silent = self.output / 'picture.mp4'
        encoder = subprocess.Popen([
            'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
            '-s', f'{self.w}x{self.h}', '-r', str(self.fps), '-i', 'pipe:0',
            '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', str(silent)
        ], stdin=subprocess.PIPE)
        decoder = None
        assert encoder.stdin is not None
        try:
            for i in range(self.frames[0]):
                encoder.stdin.write(self.intro_frame(i / self.fps).tobytes())
            decoder = subprocess.Popen([
                'ffmpeg', '-v', 'error', '-ss', str(self.edit['start']), '-i', str(self.source),
                '-t', str(self.body), '-vf', f'fps={self.fps}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'
            ], stdout=subprocess.PIPE)
            assert decoder.stdout is not None
            length = self.source_w * self.source_h * 3
            for i in range(self.frames[1]):
                data = decoder.stdout.read(length)
                if len(data) != length:
                    raise RuntimeError(f'Missing source video frame {i}')
                source = Image.frombytes('RGB', (self.source_w, self.source_h), data)
                encoder.stdin.write(self.body_frame(source, i / self.fps).tobytes())
            decoder.stdout.close()
            if decoder.wait() != 0:
                raise RuntimeError('Source decoder failed')
            for i in range(self.frames[2]):
                encoder.stdin.write(self.outro_frame(i / self.fps).tobytes())
            encoder.stdin.close()
            if encoder.wait() != 0:
                raise RuntimeError('Video encoder failed')
        finally:
            for process in (decoder, encoder):
                if process and process.poll() is None:
                    process.terminate()
                    process.wait()
        audio = (
            f"[1:a]atrim=start={self.edit['start']}:end={self.edit['end']},"
            f'asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.03,'
            f'afade=t=out:st={self.body-.06}:d=0.06,'
            f'adelay={round(self.intro*1000)}:all=1,apad[a]'
        )
        target = self.output / self.edit.get('outputName', 'ngobrolin-llm-kuda-v2.mp4')
        run('ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', str(self.source),
            '-filter_complex', audio, '-map', '0:v', '-map', '[a]', '-t', str(self.duration),
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
            '-metadata:s:a:0', 'language=ind', '-movflags', '+faststart', str(target))
        manifest = {
            'videoId': self.edit['videoId'], 'source': self.edit['sourceUrl'],
            'sourceCutStart': self.edit['sourceOffset'] + self.edit['start'],
            'sourceCutEnd': self.edit['sourceOffset'] + self.edit['end'],
            'intro': self.intro, 'outro': self.outro, 'duration': self.duration,
            'width': self.w, 'height': self.h, 'fps': self.fps, 'frames': sum(self.frames),
            'captionCues': len(self.cues), 'shots': self.edit['shots'],
            'audio': 'Original Indonesian podcast audio. No synthetic narration or added music.',
            'brand': 'Approved project podcast-shorts brand kit', 'auditoryReview': False,
            'speakerSelection': 'Manual editorial recipe, not automatic speaker detection',
        }
        (self.output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        print(json.dumps(manifest, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--edit', type=Path, default=SKILL / 'references/kyzTP34JNao-horse.json')
    parser.add_argument('--kit', type=Path, default=SKILL / 'assets/brand-kit')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--preview-only', action='store_true')
    args = parser.parse_args()
    output_name = json.loads(args.edit.read_text()).get('outputName', 'ngobrolin-llm-kuda-v2.mp4')
    if (args.output_dir / output_name).exists():
        parser.error('Use a fresh output directory; an existing final video is never overwritten')
    short = Short(args.source, args.edit, args.kit, args.output_dir)
    short.prepare()
    if not args.preview_only:
        short.render()
    else:
        print('Portrait previews and caption exports prepared:', args.output_dir)


if __name__ == '__main__':
    main()
