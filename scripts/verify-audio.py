"""Decode each MP3 and reject silence, corruption, or inconsistent provenance."""
from pathlib import Path
import json
import hashlib
import numpy as np
import soundfile as sf

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'content/audio-manifest.json').read_text(encoding='utf-8'))
errors = []
duration = 0.0
for name, entry in manifest.items():
    try:
        path = root / 'public/assets/audio' / name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], 'Hash mismatch'
        audio, rate = sf.read(path)
        seconds = len(audio) / rate
        assert seconds > .12, 'Too short'
        assert np.isfinite(audio).all(), 'Invalid samples'
        assert float(np.max(np.abs(audio))) > .005, 'Silent file'
        assert abs(seconds - entry['seconds']) < .15, 'Duration mismatch'
        duration += seconds
    except Exception as error:
        errors.append(f'{name}: {error}')
if errors:
    with (root / 'tmp/content-errors.log').open('a', encoding='utf-8') as log:
        log.write('\n'.join(errors) + '\n')
    print('\n'.join(errors))
    raise SystemExit(1)
print(f'Decoded {len(manifest)} MP3 files, {duration / 60:.1f} minutes, no silence or corruption. Human listening review remains separate.')
