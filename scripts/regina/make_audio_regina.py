"""Sugeneruoja programos garso failus balsu kristijonas/krapas-Regina (lietuviškas OmniVoice modelis).

Veikia lokaliai (Apple Silicon MPS / NVIDIA / CPU), tekstai niekur nesiunčiami.
Licencija: CC BY-NC 4.0 – tik nekomerciniam naudojimui. Įrašai – LIEPA projektas, Vilniaus universitetas.

Paruošimas (vieną kartą, reikia Python 3.10–3.12):
    uv venv --python 3.12 .venv-regina && source .venv-regina/bin/activate
    uv pip install omnivoice soundfile lameenc

Naudojimas:
    python scripts/regina/make_audio_regina.py               # tik trūkstami failai
    python scripts/regina/make_audio_regina.py --force       # perdaryti viską (perrašo ir savus įrašus!)
    python scripts/regina/make_audio_regina.py letters/y     # perdaryti konkretų failą

Kiekvienas generavimas šiek tiek skiriasi – nepavykusį failą tiesiog perdarykite.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

import lameenc
import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).parent))
from kirtis import Kirtis  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'assets' / 'audio'
SR = 24000
PAUSE = 0.4  # tyla tarp sakinių, s (kaip modelio autoriaus speak.py)
PEAK = 0.89  # garsumo normalizavimas
# Tempas: 1.0 = natūralus, kaip mokytas modelis. NELĖTINKITE: lietuvių kirtis girdimas iš skiemens
# ilgumo, o tolygiai ištempus visus balsius kirčiuoti ir nekirčiuoti skiemenys susilieja.
SPEED = {'letters': 1.0, 'numbers': 1.0, 'phrases': 1.0, 'draw': 1.0}


def prepare(item):
    """Tekstas modeliui: be daugtaškių; pavieniai žodžiai baigiami tašku (taip mokytas modelis)."""
    t = item['text'].replace('…', '').strip()
    if not re.search(r'[.!?]$', t):
        t += '.'
    return t


def to_mp3(audio):
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv or bool(args)
    items = json.loads(subprocess.check_output(['node', str(ROOT / 'scripts' / 'audio-list.mjs')], cwd=ROOT))
    if args:
        items = [i for i in items if i['file'] in args]
    todo = [i for i in items if force or not (OUT / f"{i['file']}.mp3").exists()]
    print(f'Generuosiu: {len(todo)} iš {len(items)}', flush=True)
    if not todo:
        return

    kirtis = Kirtis()
    for it in todo:
        it['stressed'] = kirtis(prepare(it))
        unsure = [f'{w}({src} {c:.2f})' for w, src, c in kirtis.explain(prepare(it)) if src.startswith('model') and c < 0.95]
        if unsure:
            print(f"  ? {it['file']}: modelis nėra tikras – {', '.join(unsure)}", flush=True)
    del kirtis
    # Sukirčiuoti tekstai – peržiūrai ir taisymams (scripts/regina/kirciai.json).
    log = ROOT / 'scripts' / 'regina' / 'sukirciuota.json'
    old = json.loads(log.read_text()) if log.exists() else {}
    old.update({i['file']: i['stressed'] for i in todo})
    log.write_text(json.dumps(dict(sorted(old.items())), ensure_ascii=False, indent=1))

    from omnivoice import OmniVoice, OmniVoiceGenerationConfig

    device = 'mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
    model = OmniVoice.from_pretrained('kristijonas/krapas-Regina', device_map=device, dtype=torch.float32)
    cfg = OmniVoiceGenerationConfig(guidance_scale=4, num_step=32)

    for n, it in enumerate(todo, 1):
        t0 = time.time()
        speed = SPEED[it['file'].split('/')[0]]
        # Po vieną sakinį – modelis mokytas su trumpais (iki 5 s) klipais.
        sentences = [s for s in re.split(r'(?<=[.!?])\s+', it['stressed']) if s.strip()]
        chunks = []
        for s in sentences:
            kw = {} if speed == 1.0 else {'speed': speed}
            wav = model.generate(text=s, language='lt', generation_config=cfg, normalize_text=False, **kw)[0]
            chunks += [np.asarray(wav, dtype=np.float32).reshape(-1), np.zeros(int(PAUSE * SR), np.float32)]
        audio = np.concatenate(chunks[:-1])
        peak = float(np.abs(audio).max()) or 1.0
        audio = audio * (PEAK / peak)
        path = OUT / f"{it['file']}.mp3"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(to_mp3(audio))
        print(f"[{n}/{len(todo)}] {it['file']:26s} {len(audio) / SR:4.1f}s  {it['stressed']}  ({time.time() - t0:.0f}s)", flush=True)
    print('Baigta.')


if __name__ == '__main__':
    main()
