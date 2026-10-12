"""Generate one file at a time, resume by text/config hash; errors stay project-local."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import time

import jieba
import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro
from misaki import zh

root = Path(__file__).resolve().parents[1]
os.chdir(root)
parser = argparse.ArgumentParser()
parser.add_argument('--limit', type=int, help='Explicit sample word count; default is all 850')
args = parser.parse_args()
cache = root / '.cache/models'
temporary = root / 'tmp'
temporary.mkdir(exist_ok=True)
jieba.dt.tmp_dir = str(temporary)
output = root / 'public/assets/audio'
output.mkdir(parents=True, exist_ok=True)
manifest_path = root / 'content/audio-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
options = ort.SessionOptions()
options.intra_op_num_threads = 4
options.inter_op_num_threads = 1
session = ort.InferenceSession(str(cache / 'kokoro-v1.0.int8.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
kokoro = Kokoro.from_session(session, str(cache / 'voices-v1.0.bin'))
chinese = zh.ZHG2P()
words = json.loads((root / 'content/words.json').read_text(encoding='utf-8'))
guidance = json.loads((root / 'content/guidance.json').read_text(encoding='utf-8'))
# Nouns/adjectives whose isolated TTS reading otherwise changes meaning.
phonemes = {'lead': 'lˈɛd', 'wind': 'wˈɪnd', 'use': 'jˈuːs', 'record': 'ɹˈɛkɚd', 'produce': 'pɹˈoʊduːs', 'separate': 'sˈɛpɚət', 'present': 'pɹˈɛzənt', 'minute': 'mˈɪnɪt', 'wound': 'wˈuːnd', 'polish': 'pˈɑːlɪʃ', 'frequent': 'fɹˈiːkwənt'}
jobs = [(f'prompt-{key}.mp3', text, 'zh', None) for key, text in guidance.items()]
for word in words[:args.limit]:
    target_phonemes = phonemes.get(word['word'].lower())
    sentence_override = None
    if target_phonemes:
        parts = re.split(r'\b' + re.escape(word['word']) + r'\b', word['sentence'], flags=re.IGNORECASE)
        sentence_override = (' ' + target_phonemes + ' ').join(kokoro.tokenizer.phonemize(part, lang='en-us') if part.strip() else '' for part in parts).strip()
    jobs.extend([
        (f"{word['word'].lower()}-word.mp3", word['word'], 'en', target_phonemes),
        (f"{word['word'].lower()}-sentence.mp3", word['sentence'], 'en', sentence_override),
        (f"{word['word'].lower()}-meaning.mp3", word['meaning'], 'zh', None),
    ])
helpers = {helper['audio']: helper['word'].lower() for word in words[:args.limit] for helper in word['support'] if '/support-' in helper['audio']}
helper_phonemes = {'use': 'jˈuːz', 'read': 'ɹˈiːd', 'lives': 'lˈɪvz'}
jobs.extend((Path(path).name, text, 'en', helper_phonemes.get(text)) for path, text in helpers.items())
assert len(jobs) == len({job[0] for job in jobs}), 'Audio output filenames must be unique'
failed = []
started = time.monotonic()
for index, (filename, text, lang, override) in enumerate(jobs):
    voice = 'af_heart' if lang == 'en' else 'zf_xiaoxiao'
    speed = 0.9 if lang == 'en' else 0.95
    digest = hashlib.sha256(json.dumps([text, voice, speed, override, 'kokoro-v1.0-int8-0.6.1-misaki-0.9.4'], ensure_ascii=False).encode()).hexdigest()
    target = output / filename
    if manifest.get(filename, {}).get('inputHash') == digest and target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == manifest[filename].get('sha256'):
        continue
    for attempt in range(3):
        try:
            prepared = override or (chinese(text)[0] if lang == 'zh' else text)
            audio, rate = kokoro.create(prepared, voice=voice, speed=speed, lang='en-us', is_phonemes=lang == 'zh' or override is not None)
            assert len(audio) / rate > 0.12, 'Audio too short'
            wav = temporary / 'audio-current.wav'
            mp3 = temporary / 'audio-current.mp3'
            sf.write(wav, audio, rate)
            padded = np.concatenate([audio, np.zeros(round(rate * .15))])
            # libsndfile invokes LAME in process: 64 kb/s at Kokoro's 24 kHz.
            sf.write(mp3, padded, rate, format='MP3', subtype='MPEG_LAYER_III', bitrate_mode='CONSTANT', compression_level=.6)
            target.write_bytes(mp3.read_bytes())
            manifest[filename] = {'inputHash': digest, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'text': text, 'voice': voice, 'seconds': round(len(audio) / rate + 0.15, 3), 'review': 'pending'}
            # Incremental checkpoint makes interruption safe without repeating synthesis.
            checkpoint = manifest_path.with_suffix('.next.json')
            checkpoint.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            checkpoint.replace(manifest_path)
            break
        except Exception as error:
            with (temporary / 'content-errors.log').open('a', encoding='utf-8') as log:
                log.write(f'{filename}, attempt {attempt + 1}: {error}\n')
            if attempt == 2:
                failed.append(filename)
            else:
                time.sleep(2 ** attempt)
    if (index + 1) % 25 == 0:
        print(f'{index + 1}/{len(jobs)} files; {time.monotonic() - started:.0f}s; failed {len(failed)}', flush=True)
print(f'Audio generation finished: {len(jobs)} requested, {len(failed)} failed', flush=True)
if failed:
    raise SystemExit(1)
