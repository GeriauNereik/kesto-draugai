// Tėvų skiltis: apsaugota daugybos klausimu (vaikams 3–8 m. per sunku).
import { h, onTap, randInt, pulse } from '../ui/dom.js';
import { button, iconButton } from '../ui/button.js';
import { stars } from '../ui/stars.js';
import { allGames } from '../config/games.js';
import { getStars, getSetting, setSetting, resetProgress, getProfiles, updateProfile, deleteProfile } from '../storage.js';
import { charPortrait } from '../config/characters.js';
import { ICONS } from '../ui/icons.js';
import { vocative, tidyName } from '../names.js';
import { setMuted, voiceStatus } from '../audio.js';

export function parentsScreen(root, { onHome }) {
  const screen = h('section', { class: 'screen parents' });
  root.append(screen);
  showGate();

  function topbar(title) {
    return h('header', { class: 'topbar' }, [
      iconButton({ icon: 'home', ariaLabel: 'Atgal į meniu', onClick: onHome }),
      h('h1', { class: 'parents-title', text: title }),
    ]);
  }

  // ---------- Vartai ----------
  function showGate() {
    let a, b, entered;
    const question = h('p', { class: 'gate-q' });
    const display = h('div', { class: 'gate-display', 'aria-live': 'polite' });

    const newQuestion = () => {
      a = randInt(3, 9);
      b = randInt(4, 9);
      entered = '';
      question.textContent = `Kiek bus ${a} × ${b}?`;
      render();
    };
    const render = () => {
      display.textContent = entered || ' ';
    };
    const press = (k) => {
      if (k === '⌫') entered = entered.slice(0, -1);
      else if (k === 'OK') return check();
      else if (entered.length < 3) entered += k;
      render();
    };
    const check = () => {
      if (Number(entered) === a * b) return showPanel();
      pulse(display, 'shake');
      setTimeout(newQuestion, 400);
    };

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
    const pad = h(
      'div',
      { class: 'keypad' },
      keys.map((k) =>
        onTap(
          h('button', {
            type: 'button',
            class: `key ${k === 'OK' ? 'key-ok' : ''}`,
            'aria-label': k === '⌫' ? 'Ištrinti' : k === 'OK' ? 'Patvirtinti' : k,
            text: k,
          }),
          () => press(k)
        )
      )
    );

    screen.replaceChildren(
      topbar('Tėvams'),
      h('div', { class: 'gate' }, [
        h('p', { class: 'gate-hint', text: 'Ši skiltis skirta suaugusiems. Atsakykite į klausimą:' }),
        question,
        display,
        pad,
      ])
    );
    newQuestion();
  }

  // ---------- Nustatymai ----------
  function showPanel() {
    const panel = h('div', { class: 'parents-panel fade-in' }, [soundCard(), ...profilesCards(), starsCard(), infoCard()]);
    screen.replaceChildren(topbar('Tėvams'), panel);
  }

  function soundCard() {
    const v = voiceStatus();
    const status = v.recordings
      ? `Naudojami įrašai (${v.recordings} failai).`
      : v.ttsVoice
        ? `Įrašų nėra, kalba iPhone balsas „${v.ttsVoice}“.`
        : 'Įrašų nėra ir lietuviško balso nerasta – rodomas tik tekstas.';

    const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-label': 'Garsas' }, h('span', { class: 'switch-knob' }));
    const label = h('span', { class: 'switch-label' });
    const sync = () => {
      const on = getSetting('sound');
      sw.setAttribute('aria-checked', String(on));
      label.textContent = on ? 'Įjungtas' : 'Išjungtas';
    };
    onTap(sw, () => {
      const on = !getSetting('sound');
      setSetting('sound', on);
      setMuted(!on);
      sync();
    });
    sync();

    return h('div', { class: 'p-card' }, [
      h('div', { class: 'p-row' }, [h('h2', { text: 'Garsas' }), h('div', { class: 'switch-wrap' }, [label, sw])]),
      h('p', { class: 'p-note', text: status }),
    ]);
  }

  function profilesCards() {
    const list = getProfiles();
    if (!list.length) return [h('div', { class: 'p-card' }, h('p', { class: 'p-note', text: 'Žaidėjų dar nėra.' }))];
    return list.map((p) => profileCard(p));
  }

  function profileCard(p) {
    const card = h('div', { class: 'p-card' });

    const nameInput = h('input', {
      class: 'p-name',
      type: 'text',
      value: p.name,
      maxlength: '20',
      autocomplete: 'off',
      autocapitalize: 'words',
      'aria-label': 'Vardas',
    });
    const voc = h('p', { class: 'p-note' });
    const chips = h('div', { class: 'chips chips-sm', role: 'group', 'aria-label': 'Lytis' });
    const sync = () => {
      chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.g === p.gender)));
      voc.textContent = `Kreipiamasi: „${vocative(p.name, p.gender)}“`;
    };
    [['m', 'Berniukas'], ['f', 'Mergaitė']].forEach(([g, label]) =>
      chips.append(
        onTap(h('button', { type: 'button', class: 'chip', 'data-g': g, text: label }), () => {
          updateProfile(p.id, { gender: g });
          sync();
        })
      )
    );
    nameInput.addEventListener('change', () => {
      const n = tidyName(nameInput.value);
      if (n.length < 2) {
        nameInput.value = p.name;
        return;
      }
      updateProfile(p.id, { name: n });
      nameInput.value = n;
      sync();
    });

    const table = h('div', { class: 'p-table' });
    const fill = () =>
      table.replaceChildren(
        // Kiekvienas žaidimas – eilutė, joje visi lygiai su geriausiu rezultatu (lygio pavadinimas ir žvaigždutės).
        ...allGames().flatMap((g) => [
          h('span', { class: 'p-game', text: g.parent ? `${g.parent.title}: ${g.title}` : g.title }),
          h(
            'div',
            { class: 'p-levels' },
            g.levels.map((lvl, i) =>
              h('div', { class: 'p-level', title: lvl.label }, [h('span', { class: 'p-th', text: g.levels.length > 2 && lvl.label.length > 3 ? `${i + 1}` : lvl.label }), stars(getStars(g.id, i + 1, p))])
            )
          ),
        ]),
        h('span', { class: 'p-game', text: 'Iš viso surinkta' }),
        h('span', { class: 'p-jar', html: `${ICONS.star} ${p.jar || 0}` })
      );

    const actions = h('div', { class: 'p-actions' });
    const showButtons = () =>
      actions.replaceChildren(
        h('div', { class: 'p-confirm' }, [
          button({ label: 'Ištrinti progresą', variant: 'secondary', onClick: () => confirm('Visos šio vaiko žvaigždutės bus ištrintos.', doReset) }),
          button({ label: 'Ištrinti žaidėją', variant: 'secondary', onClick: () => confirm(`${p.name} bus ištrintas visam laikui.`, doDelete) }),
        ])
      );
    const confirm = (msg, action) =>
      actions.replaceChildren(
        h('p', { class: 'p-warn', text: `Ar tikrai? ${msg}` }),
        h('div', { class: 'p-confirm' }, [
          button({ label: 'Ištrinti', cls: 'btn-danger', onClick: action }),
          button({ label: 'Atšaukti', variant: 'secondary', onClick: showButtons }),
        ])
      );
    const doReset = () => {
      resetProgress(p.id);
      fill();
      actions.replaceChildren(h('p', { class: 'p-note', text: 'Progresas ištrintas.' }));
      setTimeout(showButtons, 1800);
    };
    const doDelete = () => {
      deleteProfile(p.id);
      card.remove();
    };

    fill();
    sync();
    showButtons();
    card.append(
      h('div', { class: 'p-profile-head' }, [h('img', { src: charPortrait(p.avatar), alt: '', draggable: 'false' }), nameInput]),
      chips,
      voc,
      table,
      actions
    );
    return card;
  }

  function starsCard() {
    return h('div', { class: 'p-card' }, [
      h('h2', { text: 'Ką reiškia žvaigždutės' }),
      h('p', {
        class: 'p-note',
        text: 'Po kiekvieno žaidimo (10 užduočių) vaikas gauna 1–3 žvaigždutes: 3 – jei suklydo ne daugiau kaip 2 kartus, 2 – jei iki 5 kartų, 1 – už pastangas (pralaimėti negalima). Porose skaičiuojami papildomi bandymai.',
      }),
      h('p', {
        class: 'p-note',
        text: 'Meniu kortelėse rodomas geriausias kiekvieno lygio rezultatas – tai rodo, ką vaikas jau įvaldė. Visos surinktos žvaigždutės krenta į „stiklainį“ prie vardo ir auga po kiekvieno žaidimo.',
      }),
    ]);
  }

  function infoCard() {
    return h('div', { class: 'p-card' }, [
      h('h2', { text: 'Apie' }),
      h('p', {
        class: 'p-note',
        text: 'Kiek ir ką žaista, siunčiama tik į tėvų panelę (Firebase), kad tėvai matytų veiklą ir galėtų uždėti kodą. Jokios kitos analitikos ar reklamų.',
      }),
      h('p', {
        class: 'p-note',
        text: 'Balsas: Regina Jokubauskaitė, LIEPA projekto įrašai (Vilniaus universitetas, CC BY 4.0), sintezė – modelis krapas-Regina (Kristijonas, CC BY-NC 4.0), kirčiavimas – banano-kirtis-v2. Tik nekomerciniam naudojimui.',
      }),
      h('p', { class: 'p-note', text: `Versija: ${__APP_VERSION__}` }),
    ]);
  }
}
