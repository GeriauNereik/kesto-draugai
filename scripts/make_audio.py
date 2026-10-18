"""Sugeneruoja trūkstamus garso failus lietuvišku neuroniniu balsu (Microsoft Edge TTS).

Reikia interneto tik generuojant; programa vėliau groja paruoštus mp3 be interneto.

    pip install edge-tts
    python3 scripts/make_audio.py           # tik trūkstami failai (tikri įrašai neperrašomi)
    python3 scripts/make_audio.py --force   # perrašyti viską
    python3 scripts/make_audio.py letters/a phrases/labas   # tik nurodyti
"""
import asyncio
import json
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'assets' / 'audio'
VOICES = {'leonas': 'lt-LT-LeonasNeural', 'ona': 'lt-LT-OnaNeural'}


async def make(item, force):
    path = OUT / f"{item['file']}.mp3"
    if path.exists() and not force:
        return 'skip'
    path.parent.mkdir(parents=True, exist_ok=True)
    tts = edge_tts.Communicate(item['text'], VOICES[item['voice']], rate=item.get('rate', '+0%'))
    await tts.save(str(path))
    return 'new'


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    items = json.loads(subprocess.check_output(['node', str(ROOT / 'scripts' / 'audio-list.mjs')], cwd=ROOT))
    if args:
        items = [i for i in items if i['file'] in args]
        force = True
    done = {'new': 0, 'skip': 0}
    for item in items:
        for attempt in range(3):
            try:
                r = await make(item, force)
                break
            except Exception as e:  # tinklo klaidos – bandom dar kartą
                if attempt == 2:
                    print(f"  ✗ {item['file']}: {e}")
                    r = 'skip'
                await asyncio.sleep(1)
        done[r] += 1
        if r == 'new':
            print(f"  ✓ {item['file']}: {item['text']}")
    print(f"Sukurta: {done['new']}, praleista (jau yra): {done['skip']}")


asyncio.run(main())
