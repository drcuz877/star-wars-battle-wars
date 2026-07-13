// ============================================================================
// STAR WARS BATTLE WARS — THE CHARACTER FILE
//
// This is the file to edit when you want to tinker with the roster.
// Change a number, save, push to GitHub — about a minute later the live
// game updates on every device. Typos can't break combat: stats are
// clamped to 0–25 at load and problems are reported in the console.
//
// What each field means:
//   name       Shown in menus and on the battle HUD.
//   side       'light' or 'dark' — used for menu grouping/border color.
//   archetype  Fighting kit. One of:
//                'saber'   melee swings; holding Defend blocks, and a
//                          well-TIMED block deflects blaster bolts back.
//                'blaster' shoots bolts from range; Defend is a quick
//                          DODGE with invulnerability frames instead.
//                'brawler' melee, no deflect — Defend is a heavy BRACE,
//                          and brawlers get the biggest health bars.
//   armor      true = Mandalorian beskar: every hit taken is reduced by a
//              flat amount (scales with DEF). Only the Mandalorians.
//   stats      Each 0–25. What they drive in combat:
//                str  damage per hit, knockback, physical special power
//                spd  movement speed, attack rate, dodge recovery
//                frc  Force special power, special-meter charge rate
//                def  health + block/deflect/dodge/armor quality
//              Overall rating (shown on the select screen) is the sum.
//   saber      Lightsaber look, for saber users (and Grievous): color(s)
//              as hex, and style: 'single' | 'double' | 'twin' |
//              'crossguard' | 'curved' | 'quad'. Drives blade/trail art.
//   special    Signature move. 'template' picks the mechanic (the shared
//              engine in src/combat/specials.js), 'scales' says which stat
//              powers it up ('frc' or 'str'), and any extra numbers here
//              override that template's defaults in src/combat/tuning.js.
//              Templates: beam, grip, projectile, buff, heal, dash,
//              counter, flurry, sureShot.
//   color      Placeholder body color until the Phase 4 art pass.
// ============================================================================

const GREEN = 0x4ade50
const BLUE = 0x38a0ff
const PURPLE = 0xa855f7
const WHITE = 0xf1f5ff
const RED = 0xff3030

export const CHARACTERS = [
  // ------------------------------ LIGHT SIDE ------------------------------
  {
    id: 'yoda',
    name: 'Yoda',
    side: 'light',
    archetype: 'saber',
    stats: { str: 18, spd: 25, frc: 25, def: 24 },
    saber: { colors: [GREEN], style: 'single' },
    special: { name: 'Force Whirlwind', template: 'dash', scales: 'frc', hits: 4 },
    color: 0x9ee06a,
  },
  {
    id: 'anakin',
    name: 'Anakin Skywalker',
    side: 'light',
    archetype: 'saber',
    stats: { str: 22, spd: 20, frc: 24, def: 18 },
    saber: { colors: [BLUE], style: 'single' },
    special: { name: 'Relentless Assault', template: 'dash', scales: 'str', hits: 3 },
    color: 0x5aa7ff,
  },
  {
    id: 'luke',
    name: 'Luke Skywalker',
    side: 'light',
    archetype: 'saber',
    stats: { str: 20, spd: 18, frc: 23, def: 21 },
    saber: { colors: [GREEN], style: 'single' },
    special: { name: 'Force Push', template: 'grip', scales: 'frc', damage: 13, stunMs: 350, knockback: 540 },
    color: 0x7fd98a,
  },
  {
    id: 'mace',
    name: 'Mace Windu',
    side: 'light',
    archetype: 'saber',
    stats: { str: 20, spd: 19, frc: 22, def: 20 },
    saber: { colors: [PURPLE], style: 'single' },
    special: { name: 'Shatterpoint', template: 'buff', scales: 'frc', critNext: true },
    color: 0xb277e8,
  },
  {
    id: 'obiwan',
    name: 'Obi-Wan Kenobi',
    side: 'light',
    archetype: 'saber',
    stats: { str: 17, spd: 18, frc: 21, def: 24 },
    saber: { colors: [BLUE], style: 'single' },
    special: { name: 'High Ground', template: 'counter', scales: 'frc' },
    color: 0x6fc3ff,
  },
  {
    id: 'ahsoka',
    name: 'Ahsoka Tano',
    side: 'light',
    archetype: 'saber',
    stats: { str: 16, spd: 22, frc: 20, def: 19 },
    saber: { colors: [WHITE, WHITE], style: 'twin' },
    special: { name: 'Twin Saber Cross', template: 'dash', scales: 'str', hits: 2, hitDamage: 9 },
    color: 0xff9a5a,
  },
  {
    id: 'rey',
    name: 'Rey',
    side: 'light',
    archetype: 'saber',
    stats: { str: 17, spd: 19, frc: 22, def: 18 },
    saber: { colors: [BLUE], style: 'single' },
    special: { name: 'Force Heal', template: 'heal', scales: 'frc', hp: 24 },
    color: 0xd8c9a3,
  },
  {
    id: 'quigon',
    name: 'Qui-Gon Jinn',
    side: 'light',
    archetype: 'saber',
    stats: { str: 17, spd: 17, frc: 20, def: 19 },
    saber: { colors: [GREEN], style: 'single' },
    special: { name: 'Force Serenity', template: 'heal', scales: 'frc', hp: 10, stamina: 70 },
    color: 0x8fb98b,
  },
  {
    id: 'chewbacca',
    name: 'Chewbacca',
    side: 'light',
    archetype: 'brawler',
    stats: { str: 24, spd: 12, frc: 0, def: 22 },
    special: { name: 'Wookiee Rage', template: 'buff', scales: 'str' },
    color: 0xa5764a,
  },
  {
    id: 'din',
    name: 'Din Djarin',
    side: 'light',
    archetype: 'blaster',
    armor: true,
    stats: { str: 16, spd: 15, frc: 0, def: 25 },
    special: { name: 'Whistling Birds', template: 'projectile', scales: 'str', count: 5, damage: 3.2, homing: true },
    color: 0x9aa7b8,
  },
  {
    id: 'bokatan',
    name: 'Bo-Katan Kryze',
    side: 'light',
    archetype: 'blaster',
    armor: true,
    stats: { str: 15, spd: 18, frc: 0, def: 22 },
    special: { name: 'Nite Owl Dive', template: 'dash', scales: 'str', hits: 2 },
    color: 0x7f9bc4,
  },
  {
    id: 'han',
    name: 'Han Solo',
    side: 'light',
    archetype: 'blaster',
    stats: { str: 16, spd: 18, frc: 1, def: 16 },
    special: { name: 'First Shot', template: 'sureShot', scales: 'str' },
    color: 0xc9b48a,
  },
  {
    id: 'grogu',
    name: 'Grogu',
    side: 'light',
    // The fun underdog: weak ranged Force pokes with a blaster-style dodge.
    archetype: 'blaster',
    stats: { str: 3, spd: 10, frc: 23, def: 12 },
    special: { name: 'Force Barrier', template: 'heal', scales: 'frc', hp: 6, barrierMs: 1300 },
    boltColor: 0x9fe08f, // green Force pokes, not blaster fire
    color: 0x99d98f,
  },
  {
    id: 'finn',
    name: 'Finn',
    side: 'light',
    archetype: 'blaster',
    stats: { str: 15, spd: 15, frc: 2, def: 14 },
    special: { name: 'Riot Breaker', template: 'dash', scales: 'str', hits: 1, hitDamage: 15, knockback: 520 },
    color: 0x8a5a3a,
  },
  {
    id: 'leia',
    name: 'Leia Organa',
    side: 'light',
    archetype: 'blaster',
    stats: { str: 12, spd: 16, frc: 2, def: 15 },
    special: { name: 'Stun Shot', template: 'grip', scales: 'str', damage: 6, stunMs: 950, range: 430 },
    color: 0xf0f0f0,
  },
  {
    id: 'lando',
    name: 'Lando Calrissian',
    side: 'light',
    archetype: 'blaster',
    stats: { str: 13, spd: 16, frc: 0, def: 14 },
    special: { name: 'Double Down', template: 'projectile', scales: 'str', count: 2, damage: 8.5 },
    color: 0x6a8fe0,
  },
  {
    id: 'padme',
    name: 'Padmé Amidala',
    side: 'light',
    archetype: 'blaster',
    stats: { str: 11, spd: 17, frc: 0, def: 14 },
    special: { name: 'Aggressive Negotiations', template: 'projectile', scales: 'str', count: 3, damage: 5.5 },
    color: 0xd96a8a,
  },

  // ------------------------------- DARK SIDE ------------------------------
  {
    id: 'palpatine',
    name: 'Emperor Palpatine',
    side: 'dark',
    archetype: 'saber',
    stats: { str: 17, spd: 24, frc: 25, def: 24 },
    saber: { colors: [RED], style: 'single' },
    special: { name: 'Force Lightning', template: 'beam', scales: 'frc' },
    color: 0x554466,
  },
  {
    id: 'vader',
    name: 'Darth Vader',
    side: 'dark',
    archetype: 'saber',
    stats: { str: 25, spd: 14, frc: 24, def: 23 },
    saber: { colors: [RED], style: 'single' },
    special: { name: 'Force Choke', template: 'grip', scales: 'frc', damage: 16, stunMs: 900 },
    color: 0x3a3a4a,
  },
  {
    id: 'maul',
    name: 'Darth Maul',
    side: 'dark',
    archetype: 'saber',
    stats: { str: 19, spd: 23, frc: 19, def: 18 },
    saber: { colors: [RED], style: 'double' },
    special: { name: 'Spinning Saber Throw', template: 'projectile', scales: 'str', count: 1, damage: 13, returning: true },
    color: 0xd94a3a,
  },
  {
    id: 'dooku',
    name: 'Count Dooku',
    side: 'dark',
    archetype: 'saber',
    stats: { str: 16, spd: 18, frc: 22, def: 22 },
    saber: { colors: [RED], style: 'curved' },
    special: { name: 'Sith Lightning', template: 'beam', scales: 'frc', durationMs: 800 },
    color: 0x6a5a4a,
  },
  {
    id: 'kylo',
    name: 'Kylo Ren',
    side: 'dark',
    archetype: 'saber',
    stats: { str: 21, spd: 17, frc: 21, def: 17 },
    saber: { colors: [RED], style: 'crossguard' },
    special: { name: 'Force Freeze', template: 'grip', scales: 'frc', damage: 6, stunMs: 1300 },
    color: 0x4a3a4a,
  },
  {
    id: 'ventress',
    name: 'Asajj Ventress',
    side: 'dark',
    archetype: 'saber',
    stats: { str: 16, spd: 21, frc: 18, def: 17 },
    saber: { colors: [RED, RED], style: 'twin' },
    special: { name: 'Twin Saber Frenzy', template: 'flurry', scales: 'str' },
    color: 0xb0a8c0,
  },
  {
    id: 'inquisitor',
    name: 'Grand Inquisitor',
    side: 'dark',
    archetype: 'saber',
    stats: { str: 16, spd: 19, frc: 18, def: 17 },
    saber: { colors: [RED], style: 'double' },
    special: { name: 'Spinning Blade Assault', template: 'dash', scales: 'str', hits: 3 },
    color: 0x8a9aa0,
  },
  {
    id: 'grievous',
    name: 'General Grievous',
    side: 'dark',
    archetype: 'brawler',
    stats: { str: 23, spd: 19, frc: 0, def: 20 },
    saber: { colors: [BLUE, GREEN], style: 'quad' }, // stolen Jedi sabers
    special: { name: 'Four-Arm Fury', template: 'flurry', scales: 'str', hits: 6 },
    color: 0xc8ccd0,
  },
  {
    id: 'boba',
    name: 'Boba Fett',
    side: 'dark',
    archetype: 'blaster',
    armor: true,
    stats: { str: 17, spd: 16, frc: 0, def: 24 },
    special: { name: 'Flame Projector', template: 'beam', scales: 'str', range: 180, tickDamage: 3.4, flame: true },
    color: 0x6a8a5a,
  },
  {
    id: 'jango',
    name: 'Jango Fett',
    side: 'dark',
    archetype: 'blaster',
    armor: true,
    stats: { str: 16, spd: 17, frc: 0, def: 23 },
    special: { name: 'Jetpack Missile', template: 'projectile', scales: 'str', count: 1, damage: 15, arc: true },
    color: 0x5a6a9a,
  },
  {
    id: 'cadbane',
    name: 'Cad Bane',
    side: 'dark',
    archetype: 'blaster',
    stats: { str: 14, spd: 19, frc: 0, def: 18 },
    special: { name: 'Quick Draw', template: 'grip', scales: 'str', damage: 5, stunMs: 600, range: 410, followUpBolt: true },
    color: 0x4a8a9a,
  },
]

// Overall rating = the four stats added together (0–100).
export function overall(character) {
  const s = character.stats
  return s.str + s.spd + s.frc + s.def
}

const VALID_TEMPLATES = ['beam', 'grip', 'projectile', 'buff', 'heal', 'dash', 'counter', 'flurry', 'sureShot']
const VALID_ARCHETYPES = ['saber', 'blaster', 'brawler']

// Runs once at load. Clamps every stat to 0–25 and falls back to safe
// defaults on bad archetype/template values, logging what it fixed —
// so an editing typo can never break combat.
export function validateCharacters(list = CHARACTERS) {
  const problems = []
  for (const c of list) {
    for (const key of ['str', 'spd', 'frc', 'def']) {
      const v = c.stats[key]
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 25) {
        const fixed = Math.min(25, Math.max(0, Number(v) || 0))
        problems.push(`${c.name}: stat ${key} was ${v}, clamped to ${fixed}`)
        c.stats[key] = fixed
      }
    }
    if (!VALID_ARCHETYPES.includes(c.archetype)) {
      problems.push(`${c.name}: unknown archetype '${c.archetype}', using 'saber'`)
      c.archetype = 'saber'
    }
    if (!c.special || !VALID_TEMPLATES.includes(c.special.template)) {
      problems.push(`${c.name}: unknown special template, using 'dash'`)
      c.special = { name: c.special?.name ?? 'Signature Strike', template: 'dash', scales: 'str', ...c.special, template: 'dash' }
    }
    if (c.special.scales !== 'frc' && c.special.scales !== 'str') {
      problems.push(`${c.name}: special.scales must be 'frc' or 'str', using 'str'`)
      c.special.scales = 'str'
    }
  }
  if (problems.length) console.warn('[characters.js] fixed at load:\n  ' + problems.join('\n  '))
  return problems
}
