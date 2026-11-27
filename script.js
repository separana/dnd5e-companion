const CHARACTERS = {
  sam: {
    name: 'Sam',
    sub: 'Level 3 Human Champion Fighter • Folk Hero',
    maxHp: 28, ac: 18, init: 2, prof: 2, speed: '30 ft',
    hitDie: 'd10', maxHitDice: 3, critRange: 19,
    stats: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 10 },
    resources: [
      { id: 'second_wind', name: 'Second Wind (Bonus Action: 1d10 + 3 HP)', max: 1, reset: 'short' },
      { id: 'action_surge', name: 'Action Surge (Extra Action in beurt)', max: 1, reset: 'short' }
    ],
    actions: [
      { name: 'Longsword (Dueling)', atkBonus: 5, dmgDice: '1d8', dmgBonus: 5, note: 'Slashing • Crit op 19-20!' },
      { name: 'Second Wind Heal', healDice: '1d10', healBonus: 3, note: 'Bonus Action zelfgenezing' },
      { name: 'Shove / Grapple (Athletics)', skillBonus: 5, note: 'Contested check vs. target' },
      { name: 'Handaxe (Thrown 20/60 ft)', atkBonus: 5, dmgDice: '1d6', dmgBonus: 3, note: 'Slashing' }
    ],
    notes: [
      '<b>Champion – Improved Critical:</b> Je scoort al een Critical Hit bij een <b>19 of 20</b> op de d20!',
      '<b>Dueling Fighting Style:</b> +2 schade wanneer je een melee wapen in één hand houdt en geen ander wapen draagt (al meegerekend in Longsword 1d8+5).',
      '<b>Second Wind & Action Surge:</b> Komen allebei terug na een <b>Short Rest</b> (1 uur).'
    ]
  },
  waldor: {
    name: 'Waldor Wolfbane',
    sub: 'Level 3 Variant Human Soulknife Rogue • Chef',
    maxHp: 24, ac: 15, init: 3, prof: 2, speed: '30 ft',
    hitDie: 'd8', maxHitDice: 3, critRange: 20,
    stats: { STR: 10, DEX: 17, CON: 14, INT: 12, WIS: 13, CHA: 10 },
    resources: [
      { id: 'psi_dice', name: 'Psionic Energy Dice (d6)', max: 4, reset: 'long' }
    ],
    actions: [
      { name: 'Psychic Blade (Main Action)', atkBonus: 5, dmgDice: '1d6', dmgBonus: 3, note: 'Psychic • 60 ft bereik • laat geen wond na' },
      { name: 'Psychic Blade (Bonus Action)', atkBonus: 5, dmgDice: '1d4', dmgBonus: 3, note: 'Psychic • na aanval met hoofd-blade' },
      { name: 'Sneak Attack (2d6 extra)', dmgDice: '2d6', dmgBonus: 0, note: '1x/beurt bij Advantage of bondgenoot binnen 5 ft' },
      { name: 'Stealth / Sleight of Hand (Expertise)', skillBonus: 7, note: 'Dubbele proficiency (+7)' }
    ],
    notes: [
      '<b>Cunning Action (Bonus Action):</b> Dash, Disengage of Hide als Bonus Action.',
      '<b>Psi-Bolstered Knack:</b> Faal je een skill check met proficiency? Rol 1 Psionic Die (d6) en tel die erbij op (alleen verbruikt als het alsnog lukt!).',
      '<b>Psychic Whispers:</b> Telepathische groepsverbinding voor uren.'
    ]
  },
  thrain: {
    name: 'Thrain "Boulder-Breaker"',
    sub: 'Level 3 Goliath Berserker Barbarian',
    maxHp: 35, ac: 15, init: 2, prof: 2, speed: '30 ft',
    hitDie: 'd12', maxHitDice: 3, critRange: 20,
    stats: { STR: 17, DEX: 14, CON: 16, INT: 8, WIS: 12, CHA: 10 },
    resources: [
      { id: 'rage', name: 'Rage (Bonus Action • +2 dmg • halve fysieke schade)', max: 3, reset: 'long' },
      { id: 'stones_endurance', name: "Stone's Endurance (Reaction: 1d12 + 3 schade reductie)", max: 1, reset: 'short' }
    ],
    actions: [
      { name: 'Greataxe (Normaal)', atkBonus: 5, dmgDice: '1d12', dmgBonus: 3, note: 'Slashing' },
      { name: 'Greataxe (In Rage)', atkBonus: 5, dmgDice: '1d12', dmgBonus: 5, note: 'Slashing +2 Rage damage' },
      { name: 'Frenzy Bonus Attack (In Rage)', atkBonus: 5, dmgDice: '1d12', dmgBonus: 5, note: 'Geeft 1 level Exhaustion na Rage' }
    ],
    notes: [
      '<b>Reckless Attack:</b> Kies bij je eerste aanval voor Advantage op al je Strength-aanvallen deze beurt (aanvallen tegen jou hebben dan ook Advantage).',
      '<b>Danger Sense:</b> Advantage op Dexterity saving throws tegen zichtbare effecten.'
    ]
  }
};

const STATE_KEY = 'dnd5e-companion-v1';
let STATE = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
if (!STATE.activeChar) STATE.activeChar = 'sam';
if (!STATE.chars) STATE.chars = {};
if (!STATE.party) STATE.party = [
  { id: 'p1', name: 'Human Monk', hp: 24, maxHp: 24, ac: 16, conds: [] },
  { id: 'p2', name: 'College of Lore Bard', hp: 21, maxHp: 21, ac: 14, conds: [] }
];
if (!STATE.log) STATE.log = [];

let DICE_MODE = 'norm';
const CONDITIONS = ['Prone', 'Grappled', 'Poisoned', 'Stunned', 'Concentrating', 'Inspired'];

function getCharData() {
  const id = STATE.activeChar;
  const base = CHARACTERS[id];
  if (!STATE.chars[id]) {
    const resState = {};
    base.resources.forEach(r => resState[r.id] = r.max);
    STATE.chars[id] = { hp: base.maxHp, tempHp: 0, hitDice: base.maxHitDice, res: resState };
  }
  return { base, dyn: STATE.chars[id] };
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(STATE));
}

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
}

// Tabs
const TABS = ['char', 'dice', 'party', 'rules'];
function switchTab(target) {
  TABS.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === target);
    document.getElementById(`view-${t}`).style.display = (t === target) ? 'block' : 'none';
  });
}
TABS.forEach(t => document.getElementById(`tab-${t}`).onclick = () => switchTab(t));

// Character dropdown
const charSelect = document.getElementById('charSelect');
charSelect.innerHTML = Object.entries(CHARACTERS).map(([k, c]) => `<option value="${k}">${c.name}</option>`).join('');
charSelect.value = STATE.activeChar;
charSelect.onchange = () => {
  STATE.activeChar = charSelect.value;
  saveState();
  renderCharacter();
};

function mod(score) {
  return Math.floor((score - 10) / 2);
}
function fmtMod(m) {
  return (m >= 0 ? '+' : '') + m;
}

function renderCharacter() {
  const { base, dyn } = getCharData();
  document.getElementById('charSub').textContent = base.sub;
  document.getElementById('curHp').textContent = dyn.hp;
  document.getElementById('maxHp').textContent = base.maxHp;
  document.getElementById('statAc').textContent = base.ac;
  document.getElementById('statInit').textContent = fmtMod(base.init);
  document.getElementById('statProf').textContent = fmtMod(base.prof);
  document.getElementById('statSpeed').textContent = base.speed;
  document.getElementById('hitDiceTxt').textContent = `${dyn.hitDice}/${base.maxHitDice} ${base.hitDie}`;

  const tempBadge = document.getElementById('tempHpBadge');
  if (dyn.tempHp > 0) {
    tempBadge.style.display = 'inline-block';
    tempBadge.textContent = `+${dyn.tempHp} Temp`;
  } else {
    tempBadge.style.display = 'none';
  }

  const pct = Math.max(0, Math.min(100, (dyn.hp / base.maxHp) * 100));
  const hpBar = document.getElementById('hpBar');
  hpBar.style.width = pct + '%';
  hpBar.parentElement.classList.toggle('low', pct <= 30);

  // Abilities
  const abGrid = document.getElementById('abilityGrid');
  abGrid.innerHTML = Object.entries(base.stats).map(([ab, sc]) => {
    const m = mod(sc);
    return `<div class="ab-box" data-ab="${ab}" data-mod="${m}">
      <div class="ab-name">${ab}</div>
      <div class="ab-mod">${fmtMod(m)}</div>
      <div class="ab-score">${sc}</div>
    </div>`;
  }).join('');
  abGrid.querySelectorAll('.ab-box').forEach(box => {
    box.onclick = () => {
      const m = parseInt(box.dataset.mod, 10);
      rollD20Action(`${box.dataset.ab} Check`, m);
      switchTab('dice');
    };
  });

  // Resources
  const resList = document.getElementById('resourcesList');
  resList.innerHTML = base.resources.map(r => {
    const rem = dyn.res[r.id] ?? r.max;
    const pips = Array.from({ length: r.max }, (_, i) => `<div class="pip ${i >= rem ? 'used' : ''}" data-idx="${i}"></div>`).join('');
    return `<div class="res-item">
      <div><div style="font-weight:700;font-size:13px">${r.name}</div><div class="small">Herstelt bij ${r.reset === 'short' ? 'Short Rest' : 'Long Rest'}</div></div>
      <div class="pips" data-rid="${r.id}" data-max="${r.max}">${pips}</div>
    </div>`;
  }).join('');
  resList.querySelectorAll('.pips').forEach(wrap => {
    wrap.onclick = () => {
      const id = wrap.dataset.rid;
      const max = parseInt(wrap.dataset.max, 10);
      const cur = dyn.res[id] ?? max;
      dyn.res[id] = cur > 0 ? cur - 1 : max;
      saveState();
      renderCharacter();
    };
  });

  // Actions
  const actList = document.getElementById('actionsList');
  actList.innerHTML = base.actions.map((a, idx) => {
    let badge = '';
    if (typeof a.atkBonus === 'number') badge = `Aanval ${fmtMod(a.atkBonus)} • ${a.dmgDice}${fmtMod(a.dmgBonus)}`;
    else if (a.healDice) badge = `Heal ${a.healDice}${fmtMod(a.healBonus)}`;
    else if (typeof a.skillBonus === 'number') badge = `Check ${fmtMod(a.skillBonus)}`;
    else badge = a.dmgDice;
    return `<button class="act-btn" data-aidx="${idx}">
      <div><div style="font-weight:700">${a.name}</div><div class="small">${a.note}</div></div>
      <div class="act-meta">${badge}</div>
    </button>`;
  }).join('');
  actList.querySelectorAll('.act-btn').forEach(btn => {
    btn.onclick = () => {
      const a = base.actions[parseInt(btn.dataset.aidx, 10)];
      triggerActionRoll(a);
      switchTab('dice');
    };
  });

  // Notes
  document.getElementById('charNotesBox').innerHTML = `<div class="label" style="margin-bottom:8px">${base.name} – Belangrijke Features</div>` +
    base.notes.map(n => `<div class="rule-item">${n}</div>`).join('');
}

// HP knoppen
document.querySelectorAll('[data-hp]').forEach(btn => {
  btn.onclick = () => {
    const { base, dyn } = getCharData();
    let delta = parseInt(btn.dataset.hp, 10);
    if (delta < 0 && dyn.tempHp > 0) {
      const absorbed = Math.min(dyn.tempHp, Math.abs(delta));
      dyn.tempHp -= absorbed;
      delta += absorbed;
    }
    dyn.hp = Math.max(0, Math.min(base.maxHp, dyn.hp + delta));
    saveState();
    renderCharacter();
  };
});

document.getElementById('btnTempHp').onclick = () => {
  const { dyn } = getCharData();
  const val = parseInt(prompt('Hoeveel Temporary HP toevoegen?', '5'), 10);
  if (!isNaN(val) && val >= 0) {
    dyn.tempHp = val;
    saveState();
    renderCharacter();
    showToast(`Temporary HP ingesteld op +${val}`);
  }
};

document.getElementById('btnShortRest').onclick = () => {
  const { base, dyn } = getCharData();
  base.resources.forEach(r => { if (r.reset === 'short') dyn.res[r.id] = r.max; });
  if (dyn.hitDice > 0 && dyn.hp < base.maxHp) {
    const dieSides = parseInt(base.hitDie.replace('d', ''), 10);
    const roll = Math.ceil(Math.random() * dieSides);
    const conMod = mod(base.stats.CON);
    const healed = Math.max(1, roll + conMod);
    dyn.hitDice -= 1;
    dyn.hp = Math.min(base.maxHp, dyn.hp + healed);
    showToast(`Short Rest: Abilities hersteld + ${healed} HP (1${base.hitDie}[${roll}]+${conMod})`);
  } else {
    showToast('Short Rest: Short-rest abilities hersteld!');
  }
  saveState();
  renderCharacter();
};

document.getElementById('btnLongRest').onclick = () => {
  const { base, dyn } = getCharData();
  dyn.hp = base.maxHp;
  dyn.tempHp = 0;
  dyn.hitDice = Math.min(base.maxHitDice, dyn.hitDice + Math.max(1, Math.floor(base.maxHitDice / 2)));
  base.resources.forEach(r => dyn.res[r.id] = r.max);
  saveState();
  renderCharacter();
  showToast('Long Rest voltooid: Volledige HP & abilities hersteld!');
};

// Dobbelstenen Engine
function parseAndRollDice(expr) {
  const [countStr, sidesStr] = expr.toLowerCase().split('d');
  const count = parseInt(countStr || '1', 10);
  const sides = parseInt(sidesStr, 10);
  const rolls = [];
  for (let i = 0; i < count; i++) rolls.push(Math.ceil(Math.random() * sides));
  return { sum: rolls.reduce((a, b) => a + b, 0), rolls };
}

function rollD20Action(label, bonus = 0) {
  const { base } = getCharData();
  const r1 = Math.ceil(Math.random() * 20);
  const r2 = Math.ceil(Math.random() * 20);
  let chosen = r1;
  let rollText = `d20(${r1})`;
  if (DICE_MODE === 'adv') { chosen = Math.max(r1, r2); rollText = `2d20↑(${r1}, ${r2} → ${chosen})`; }
  if (DICE_MODE === 'dis') { chosen = Math.min(r1, r2); rollText = `2d20↓(${r1}, ${r2} → ${chosen})`; }

  const total = chosen + bonus;
  const isCrit = chosen >= (base.critRange || 20);
  const isFumble = chosen === 1;

  displayRoll(label, total, `${rollText} ${bonus !== 0 ? fmtMod(bonus) : ''}`, isCrit ? 'crit' : (isFumble ? 'fumble' : ''));
  return { chosen, total, isCrit };
}

function triggerActionRoll(a) {
  if (typeof a.atkBonus === 'number') {
    const atk = rollD20Action(`${a.name} – Aanval`, a.atkBonus);
    const dmg = parseAndRollDice(a.dmgDice);
    const critExtra = atk.isCrit ? parseAndRollDice(a.dmgDice) : { sum: 0, rolls: [] };
    const totalDmg = dmg.sum + critExtra.sum + (a.dmgBonus || 0);
    const critTag = atk.isCrit ? ` ⚡ CRIT! (+[${critExtra.rolls.join('+')}])` : '';
    document.getElementById('rollDetail').textContent += `  |  Schade: ${totalDmg} (${a.dmgDice}[${dmg.rolls.join('+')}]${fmtMod(a.dmgBonus || 0)}${critTag})`;
    addLog(`${a.name}`, `Hit ${atk.total}${atk.isCrit ? ' CRIT' : ''} • Dmg ${totalDmg}`);
  } else if (a.healDice) {
    const h = parseAndRollDice(a.healDice);
    const tot = h.sum + (a.healBonus || 0);
    displayRoll(a.name, tot, `${a.healDice}[${h.rolls.join('+')}] ${fmtMod(a.healBonus || 0)}`);
  } else if (typeof a.skillBonus === 'number') {
    rollD20Action(a.name, a.skillBonus);
  } else {
    const d = parseAndRollDice(a.dmgDice);
    displayRoll(a.name, d.sum, `${a.dmgDice}[${d.rolls.join('+')}]`);
  }
}

function displayRoll(formula, total, detail, stateClass = '') {
  document.getElementById('rollFormula').textContent = formula;
  const totEl = document.getElementById('rollTotal');
  totEl.textContent = total;
  totEl.className = 'roll-total ' + stateClass;
  document.getElementById('rollDetail').textContent = detail;
  addLog(formula, `${total} (${detail})`);
}

function addLog(label, res) {
  STATE.log.unshift({ t: new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }), label, res });
  if (STATE.log.length > 25) STATE.log.pop();
  saveState();
  renderLog();
}

function renderLog() {
  document.getElementById('rollLog').innerHTML = STATE.log.map(item =>
    `<div class="log-row"><span><span class="muted">${item.t}</span> <b>${item.label}</b></span><span style="color:#f7e7ac;font-weight:700">${item.res}</span></div>`
  ).join('') || '<div class="small">Nog geen worpen gelogd.</div>';
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.onclick = () => {
    DICE_MODE = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
  };
});

document.querySelectorAll('.die-btn').forEach(btn => {
  btn.onclick = () => {
    const sides = parseInt(btn.dataset.die, 10);
    if (sides === 20) {
      rollD20Action('Losse d20', 0);
    } else {
      const r = Math.ceil(Math.random() * sides);
      displayRoll(`Losse d${sides}`, r, `1d${sides}[${r}]`);
    }
  };
});

document.getElementById('btnClearLog').onclick = () => { STATE.log = []; saveState(); renderLog(); };

// Party & Vijanden
function renderParty() {
  const list = document.getElementById('partyList');
  list.innerHTML = STATE.party.map((m, idx) => `
    <div class="party-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><b style="font-size:15px">${m.name}</b> <span class="small">• AC ${m.ac}</span></div>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="dmg" style="padding:4px 9px" data-pidx="${idx}" data-d="-5">-5</button>
          <button class="dmg" style="padding:4px 9px" data-pidx="${idx}" data-d="-1">-1</button>
          <b style="min-width:54px;text-align:center">${m.hp}/${m.maxHp}</b>
          <button class="heal" style="padding:4px 9px" data-pidx="${idx}" data-d="1">+1</button>
          <button style="padding:4px 8px;color:#9ab0c7" data-del="${idx}">✕</button>
        </div>
      </div>
      <div class="cond-row">
        ${CONDITIONS.map(c => `<span class="cond-chip ${(m.conds || []).includes(c) ? 'on' : ''}" data-pidx="${idx}" data-cond="${c}">${c}</span>`).join('')}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-d]').forEach(b => {
    b.onclick = () => {
      const m = STATE.party[parseInt(b.dataset.pidx, 10)];
      m.hp = Math.max(0, Math.min(m.maxHp, m.hp + parseInt(b.dataset.d, 10)));
      saveState(); renderParty();
    };
  });
  list.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = () => {
      STATE.party.splice(parseInt(b.dataset.del, 10), 1);
      saveState(); renderParty();
    };
  });
  list.querySelectorAll('[data-cond]').forEach(chip => {
    chip.onclick = () => {
      const m = STATE.party[parseInt(chip.dataset.pidx, 10)];
      m.conds = m.conds || [];
      const c = chip.dataset.cond;
      if (m.conds.includes(c)) m.conds = m.conds.filter(x => x !== c);
      else m.conds.push(c);
      saveState(); renderParty();
    };
  });
}

document.getElementById('btnAddMember').onclick = () => {
  const name = document.getElementById('newMemberName').value.trim();
  const maxHp = parseInt(document.getElementById('newMemberHp').value, 10) || 15;
  const ac = parseInt(document.getElementById('newMemberAc').value, 10) || 13;
  if (!name) return;
  STATE.party.push({ id: 'm' + Date.now(), name, hp: maxHp, maxHp, ac, conds: [] });
  document.getElementById('newMemberName').value = '';
  saveState(); renderParty();
};

// Init
renderCharacter();
renderLog();
renderParty();
