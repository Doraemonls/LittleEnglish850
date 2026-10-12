"""Download pinned Kokoro assets sequentially, with bounded retries."""
from pathlib import Path
import hashlib
import json
import time
import urllib.request

root = Path(__file__).resolve().parents[1]
cache = root / '.cache' / 'models'
cache.mkdir(parents=True, exist_ok=True)
log = root / 'tmp' / 'content-errors.log'
log.parent.mkdir(exist_ok=True)
base = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
manifest = []
for name in ['kokoro-v1.0.int8.onnx', 'voices-v1.0.bin']:
    target = cache / name
    if not target.exists():
        for attempt in range(4):
            try:
                with urllib.request.urlopen(base + name, timeout=120) as response:
                    temporary = target.with_suffix('.download')
                    with temporary.open('wb') as output:
                        while chunk := response.read(1024 * 1024):
                            output.write(chunk)
                temporary.replace(target)
                break
            except Exception as error:
                with log.open('a', encoding='utf-8') as output:
                    output.write(f'{name} attempt {attempt + 1}: {error}\n')
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    manifest.append({'file': name, 'source': base + name, 'sha256': digest})
    print(name, target.stat().st_size, digest, flush=True)
(root / 'content' / 'audio-model.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
