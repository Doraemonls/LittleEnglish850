"""Generate natural Chinese audio for Little English 850 using Edge-TTS.

Supports dual voices:
- Default: zh-CN-XiaoxiaoNeural (warm, clear female voice)
- Alternative: zh-CN-YunxiaNeural (authentic lively child voice)

Outputs:
- Xiaoxiao: public/assets/audio/*-meaning.mp3, prompt-*.mp3
- Yunxia:   public/assets/audio/yunxia/*-meaning.mp3, prompt-*.mp3
Updates content/audio-manifest.json.
"""
from pathlib import Path
import argparse
import asyncio
import hashlib
import json
import os
import sys
import time

import edge_tts
import numpy as np
import soundfile as sf

root = Path(__file__).resolve().parents[1]
output_base = root / 'public/assets/audio'
output_yunxia = output_base / 'yunxia'
output_base.mkdir(parents=True, exist_ok=True)
output_yunxia.mkdir(parents=True, exist_ok=True)

manifest_path = root / 'content/audio-manifest.json'
words_path = root / 'content/words.json'
guidance_path = root / 'content/guidance.json'

VOICES = {
    'xiaoxiao': {'voice': 'zh-CN-XiaoxiaoNeural', 'dir': output_base, 'prefix': ''},
    'yunxia': {'voice': 'zh-CN-YunxiaNeural', 'dir': output_yunxia, 'prefix': 'yunxia/'},
}


def load_jobs(limit=None):
    words = json.loads(words_path.read_text(encoding='utf-8'))
    guidance = json.loads(guidance_path.read_text(encoding='utf-8'))
    if limit is not None:
        words = words[:limit]

    base_items = []
    # Guidance prompts
    for key, text in guidance.items():
        base_items.append((f'prompt-{key}.mp3', text))
    # Word meanings
    for word in words:
        base_items.append((f"{word['word'].lower()}-meaning.mp3", word['meaning']))

    return base_items


async def synthesize_one(sem, text, voice_name, target_path, retries=4):
    async with sem:
        temp_path = target_path.with_suffix('.tmp.mp3')
        for attempt in range(retries):
            try:
                communicate = edge_tts.Communicate(text, voice_name, rate='-4%')
                await communicate.save(str(temp_path))
                # Validate output
                data, rate = sf.read(str(temp_path))
                assert len(data) / rate > 0.12, 'Audio too short'
                assert np.isfinite(data).all(), 'Non-finite samples'
                assert float(np.max(np.abs(data))) > 0.005, 'Silent audio'
                temp_path.replace(target_path)
                return True
            except Exception as e:
                if temp_path.exists():
                    temp_path.unlink(missing_ok=True)
                if attempt == retries - 1:
                    print(f'Failed {target_path.name} ({voice_name}) after {retries} attempts: {e}', file=sys.stderr)
                    return False
                await asyncio.sleep(2 ** attempt)
        return False


async def run_batch(items, selected_voices, concurrency=6):
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    sem = asyncio.Semaphore(concurrency)

    tasks_to_run = []
    for voice_key in selected_voices:
        voice_cfg = VOICES[voice_key]
        for filename, text in items:
            manifest_key = f"{voice_cfg['prefix']}{filename}"
            target_path = voice_cfg['dir'] / filename
            voice_name = voice_cfg['voice']
            digest = hashlib.sha256(json.dumps([text, voice_name, '-4%', 'edge-tts-7.3.1'], ensure_ascii=False).encode()).hexdigest()

            # Skip if already up-to-date and matches hash
            if (
                manifest.get(manifest_key, {}).get('inputHash') == digest
                and target_path.exists()
                and hashlib.sha256(target_path.read_bytes()).hexdigest() == manifest[manifest_key].get('sha256')
            ):
                continue

            tasks_to_run.append((manifest_key, filename, text, voice_name, target_path, digest))

    total = len(tasks_to_run)
    print(f'Generating {total} Chinese audio files (voices: {selected_voices})...')
    if not total:
        print('All requested Chinese audio files are already up-to-date.')
        return

    started = time.monotonic()
    completed_count = 0
    failed_keys = []

    # Process in chunks of 20 to save checkpoints periodically
    chunk_size = 20
    for i in range(0, total, chunk_size):
        chunk = tasks_to_run[i:i + chunk_size]
        results = await asyncio.gather(*(
            synthesize_one(sem, text, voice_name, target_path)
            for _, _, text, voice_name, target_path, _ in chunk
        ))

        for (manifest_key, filename, text, voice_name, target_path, digest), success in zip(chunk, results):
            if success:
                data, rate = sf.read(str(target_path))
                sec = round(len(data) / rate, 3)
                manifest[manifest_key] = {
                    'inputHash': digest,
                    'sha256': hashlib.sha256(target_path.read_bytes()).hexdigest(),
                    'text': text,
                    'voice': voice_name,
                    'seconds': sec,
                    'review': 'approved'
                }
                completed_count += 1
            else:
                failed_keys.append(manifest_key)

        # Write checkpoint
        checkpoint = manifest_path.with_suffix('.next.json')
        checkpoint.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        checkpoint.replace(manifest_path)

        elapsed = time.monotonic() - started
        print(f'Progress: {completed_count}/{total} files ({elapsed:.1f}s, {completed_count/max(elapsed, 0.1):.1f} files/s, failed: {len(failed_keys)})', flush=True)

    if failed_keys:
        print(f'Failed to synthesize {len(failed_keys)} files: {failed_keys[:10]}', file=sys.stderr)
        sys.exit(1)
    print(f'Successfully generated {completed_count} Chinese audio files.')


def main():
    parser = argparse.ArgumentParser(description='Generate natural Chinese audio with Edge-TTS')
    parser.add_argument('--limit', type=int, help='Limit sample count of words')
    parser.add_argument('--voice', choices=['all', 'xiaoxiao', 'yunxia'], default='all', help='Voice selection')
    parser.add_argument('--concurrency', type=int, default=6, help='Concurrency limit')
    args = parser.parse_args()

    items = load_jobs(args.limit)
    selected_voices = ['xiaoxiao', 'yunxia'] if args.voice == 'all' else [args.voice]
    asyncio.run(run_batch(items, selected_voices, args.concurrency))


if __name__ == '__main__':
    main()
