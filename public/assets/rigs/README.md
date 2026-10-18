# Veikėjų dalys (rig'ai)

Kiekvienam veikėjui – aplankas `{veikejas}/`: `ona/`, `domas/`, `kestas/`, `veja/`, `tadas/`, `gedas/`.

Visos dalys – WebP su permatomu fonu, **vienodo dydžio drobėje** (pvz. 1024×1024), kiekviena **savo vietoje**:
sudėjus visus failus vieną ant kito gaunamas pilnas veikėjas.

| Failas | Privalomas | Pastaba |
|---|---|---|
| `body.webp` | taip | kūnas be galvos ir galūnių |
| `head.webp` | taip | galva be akių ir burnos |
| `eyes_open.webp`, `eyes_closed.webp` | taip | mirksėjimui |
| `mouth_smile.webp`, `mouth_open.webp` | taip | džiaugsmas, kalbėjimas |
| `mouth_o.webp` | ne | galvojimas |
| `eyes_up.webp` | ne | galvojimas (akys žvelgia aukštyn) |
| `arm_left.webp`, `arm_right.webp` | ne | paukščiams – sparnai |
| `leg_left.webp`, `leg_right.webp` | ne | |
| `tail.webp` | ne | |
| `ears.webp` arba `ear_left.webp`, `ear_right.webp` | ne | |
| `extra_*.webp` | ne | papildomi daiktai |

Kol aplanke nėra bent `body.webp` ir `head.webp`, veikėjas animuojamas visu paveikslėliu (atsarginis variantas).

Įkėlus dalis: `npm run dev` → atidarykite `/rig-editor.html`, nustatykite sukimosi taškus ir paspauskite
„Išsaugoti į projektą“ (sukuria `src/rigs/{veikejas}.json`). Tada `npm run build`.
