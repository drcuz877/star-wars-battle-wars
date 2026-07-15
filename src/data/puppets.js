// ============================================================================
// PUPPET ART DEFINITIONS — what each character LOOKS like.
//
// Companion to characters.js (which holds what a character IS — stats, kit,
// special). A character with an entry here is drawn as a layered puppet;
// characters without one keep the placeholder rectangle, so the roster gets
// arted one character at a time through Phase 4.
//
// Colors are hex (0xRRGGBB) — as tweakable as stats. Part `type` picks a
// painter from src/art/puppet.js:
//   head.type    'human' | 'wookiee' | 'mandoHelmet' | 'vaderHelmet'
//   torso.type   'tunic' | 'vest' | 'mandoArmor' | 'furry' | 'vaderArmor'
//   arm.type     'sleeve' (default) | 'fur'
//   leg.type     'pants' (default) | 'fur'
//   weapon.type  'saber' (default) | 'pistol' | 'fists'
// Saber BLADE color is NOT set here — it comes from the character's `saber`
// field in characters.js, so lore colors stay in one place.
// ============================================================================

export const PUPPETS = {
  // Yoda — truly small body (scale 0.65, feet-anchored) with a near
  // full-size head (headScale 1.5 of the scaled body ≈ 98% of a normal
  // head) — the classic proportions. Grogu goes smaller still.
  yoda: {
    scale: 0.65,
    headScale: 1.5,
    head: { type: 'yoda', skin: 0x9ab86a },
    torso: { type: 'tunic', cloth: 0xcabc9c, flap: 0xa89878, belt: 0x6a5a42, buckle: 0x8a7a5c },
    arm: { cloth: 0xcabc9c, hand: 0x9ab86a },
    leg: { cloth: 0xa89878, boot: 0x8a7a5c },
    weapon: { hilt: 0xb7bcc6 },
  },

  // Anakin Skywalker — dark Jedi robes, dirty-blond hair.
  anakin: {
    head: { type: 'human', skin: 0xe0bd94, hair: 0x6e5230 },
    torso: { type: 'tunic', cloth: 0x26221c, flap: 0x322c26, belt: 0x1c1814, buckle: 0x8a8578 },
    arm: { cloth: 0x26221c, hand: 0xe0bd94 },
    leg: { cloth: 0x221e18, boot: 0x181410 },
    weapon: { hilt: 0xb7bcc6 },
  },
  // Luke Skywalker — Return of the Jedi black outfit, sandy-blond hair.
  luke: {
    head: { type: 'human', skin: 0xeac393, hair: 0xc7a15f },
    torso: { type: 'tunic', cloth: 0x1e1e26, flap: 0x2a2a33, belt: 0x241f18, buckle: 0xb9c0cc },
    arm: { cloth: 0x1e1e26, hand: 0xeac393 },
    leg: { cloth: 0x191920, boot: 0x2a2118 },
    weapon: { hilt: 0xb7bcc6 },
  },

  // Mace Windu — bald, brown Jedi robes, purple blade from characters.js.
  mace: {
    head: { type: 'human', skin: 0x7a5238, hair: null },
    torso: { type: 'tunic', cloth: 0x6e5a44, flap: 0x7e6a52, belt: 0x4a3c2c, buckle: 0x8a8578 },
    arm: { cloth: 0x6e5a44, hand: 0x7a5238 },
    leg: { cloth: 0x5e4c38, boot: 0x3a2e20 },
    weapon: { hilt: 0xb7bcc6 },
  },

  // Obi-Wan Kenobi — cream robes, auburn hair and beard.
  obiwan: {
    head: { type: 'human', skin: 0xe4c098, hair: 0xa87848, beard: 0x9a6c3e },
    torso: { type: 'tunic', cloth: 0xd2c6aa, flap: 0xc2b498, belt: 0x6a5138, buckle: 0x8a8578 },
    arm: { cloth: 0xd2c6aa, hand: 0xe4c098 },
    leg: { cloth: 0x9a8a6a, boot: 0x5a452e },
    weapon: { hilt: 0xb7bcc6 },
  },

  // Ahsoka Tano — Togruta montrals/lekku, maroon outfit, twin whites.
  ahsoka: {
    head: { type: 'togruta', skin: 0xd97742, stripe: 0x64809c },
    torso: { type: 'tunic', cloth: 0x6e2840, flap: 0x7e3050, belt: 0x4a1c2c, buckle: 0x8a8578 },
    arm: { cloth: 0x6e2840, hand: 0xd97742 },
    leg: { cloth: 0x5e2236, boot: 0x3a1420 },
    weapon: { hilt: 0x9aa0aa },
  },

  // Rey — light desert wraps, dark hair.
  rey: {
    head: { type: 'human', skin: 0xe2bd96, hair: 0x50412e },
    torso: { type: 'tunic', cloth: 0xd8d0ba, flap: 0xc8c0a8, belt: 0x8a7a5c, buckle: 0x8a8578 },
    arm: { cloth: 0xd8d0ba, hand: 0xe2bd96 },
    leg: { cloth: 0xb0a688, boot: 0x6a5a44 },
    weapon: { hilt: 0xb7bcc6 },
  },

  // Qui-Gon Jinn — long hair and beard, cream robes.
  quigon: {
    head: { type: 'human', skin: 0xe0bd94, hair: 0x6a5238, beard: 0x5e4830, long: true },
    torso: { type: 'tunic', cloth: 0xd2c6aa, flap: 0xc2b498, belt: 0x6a5138, buckle: 0x8a8578 },
    arm: { cloth: 0xd2c6aa, hand: 0xe0bd94 },
    leg: { cloth: 0x8a7a5e, boot: 0x52402c },
    weapon: { hilt: 0xb7bcc6 },
  },

  // Emperor Palpatine — deep hood, gaunt face, black robes.
  palpatine: {
    head: { type: 'hooded', hood: 0x1c161c, skin: 0xd8c4ae },
    torso: { type: 'tunic', cloth: 0x1c161c, flap: 0x281f28, belt: 0x120e12, buckle: 0x2a242a },
    arm: { cloth: 0x1c161c, hand: 0xd8c4ae },
    leg: { cloth: 0x161216, boot: 0x0e0a0e },
    weapon: { hilt: 0x565c68 },
  },

  // Darth Maul — red/black Zabrak face, horn crown, double-blade staff.
  maul: {
    head: { type: 'zabrak', skin: 0xb8362a, marks: 0x1c1010, horns: true, hornColor: 0x8a8074 },
    torso: { type: 'tunic', cloth: 0x1e1a1e, flap: 0x2a242a, belt: 0x141014, buckle: 0x565c68 },
    arm: { cloth: 0x1e1a1e, hand: 0xb8362a },
    leg: { cloth: 0x1a161a, boot: 0x100c10 },
    weapon: { hilt: 0x3a3f4a },
  },

  // Count Dooku — silver hair and beard, caped Serennian finery,
  // curved hilt.
  dooku: {
    head: { type: 'human', skin: 0xe0c8ac, hair: 0xd8d4cc, beard: 0xcfc8bc },
    torso: { type: 'tunic', cloth: 0x2c2734, flap: 0x383144, belt: 0x1e1a26, buckle: 0x8a8578 },
    arm: { cloth: 0x2c2734, hand: 0xe0c8ac },
    leg: { cloth: 0x242030, boot: 0x161220 },
    cape: { color: 0x241e2e },
    weapon: { hilt: 0x8a6e46 },
  },

  // Kylo Ren — long black hair, black layered robes, crossguard blade.
  kylo: {
    head: { type: 'human', skin: 0xe4c4a4, hair: 0x201812, long: true },
    torso: { type: 'tunic', cloth: 0x1a181c, flap: 0x26242a, belt: 0x121014, buckle: 0x565c68 },
    arm: { cloth: 0x1a181c, hand: 0xe4c4a4 },
    leg: { cloth: 0x161418, boot: 0x0e0c10 },
    weapon: { hilt: 0x2a2d33 },
  },

  // Asajj Ventress — bald, pale, gray assassin garb, twin reds.
  ventress: {
    head: { type: 'human', skin: 0xc9c2ba, hair: null },
    torso: { type: 'tunic', cloth: 0x3c3c46, flap: 0x4a4a56, belt: 0x2a2a32, buckle: 0x8a8578 },
    arm: { cloth: 0x3c3c46, hand: 0xc9c2ba },
    leg: { cloth: 0x32323a, boot: 0x1e1e24 },
    weapon: { hilt: 0x565c68 },
  },

  // Grand Inquisitor — pale Pau'an face with red markings, double blade.
  inquisitor: {
    head: { type: 'zabrak', skin: 0xb9b4ae, marks: 0x8a2424, horns: false, eyes: 0xc8b020 },
    torso: { type: 'tunic', cloth: 0x2a2c34, flap: 0x3a3c46, belt: 0x1c1e24, buckle: 0x8a8578 },
    arm: { cloth: 0x2a2c34, hand: 0xb9b4ae },
    leg: { cloth: 0x24262e, boot: 0x16181e },
    weapon: { hilt: 0x565c68 },
  },

  // Din Djarin — unpainted beskar, clean helmet (no rangefinder).
  din: {
    head: { type: 'mandoHelmet', dome: 0x9aa2ac, trim: 0x6a7280 },
    torso: { type: 'mandoArmor', suit: 0x5a4a3c, plate: 0x9aa2ac, belt: 0x3a3228, box: 0x6a7280 },
    arm: { cloth: 0x5a4a3c, hand: 0x3a3228 },
    leg: { cloth: 0x4a3e32, boot: 0x2a2218 },
    weapon: { type: 'pistol', body: 0x2a2d33, grip: 0x3a2c20, trim: 0x9aa2ac },
  },

  // Bo-Katan Kryze — Nite Owl blue-gray armor.
  bokatan: {
    head: { type: 'mandoHelmet', dome: 0x5a7a9c, trim: 0xc8ccd4 },
    torso: { type: 'mandoArmor', suit: 0x3a3e46, plate: 0x5a7a9c, belt: 0x282c34, box: 0x8a8e98 },
    arm: { cloth: 0x3a3e46, hand: 0x282c34 },
    leg: { cloth: 0x32363e, boot: 0x1e2228 },
    weapon: { type: 'pistol', body: 0x2a2d33, grip: 0x282c34, trim: 0xc8ccd4 },
  },

  // Grogu — the smallest fighter in the game: baby body, oversized head,
  // no weapon (his "bolts" are little Force pokes).
  grogu: {
    scale: 0.45,
    headScale: 1.9,
    head: { type: 'yoda', skin: 0x9ab86a },
    torso: { type: 'tunic', cloth: 0xa89878, flap: 0x8a7a5c, belt: 0x6a5a42, buckle: 0x8a7a5c },
    arm: { cloth: 0xa89878, hand: 0x9ab86a },
    leg: { cloth: 0x8a7a5c, boot: 0x9ab86a },
    weapon: { type: 'fists' },
  },

  // Finn — brown resistance jacket over a light shirt.
  finn: {
    head: { type: 'human', skin: 0x6a4632, hair: 0x1a1410 },
    torso: { type: 'vest', shirt: 0xd8d2c2, vest: 0x5a3826, belt: 0x2a2018 },
    arm: { cloth: 0x5a3826, hand: 0x6a4632 },
    leg: { cloth: 0x3a3634, boot: 0x1e1a16 },
    weapon: { type: 'pistol', body: 0x22252b, grip: 0x3a2c20, trim: 0x565c68 },
  },

  // Leia Organa — white senatorial dress, the side buns.
  leia: {
    head: { type: 'human', skin: 0xe8c8a8, hair: 0x4a3220, buns: true },
    torso: { type: 'tunic', cloth: 0xe8e4dc, flap: 0xd8d4cc, belt: 0xb0aca4, buckle: 0x9aa0ad },
    arm: { cloth: 0xe8e4dc, hand: 0xe8c8a8 },
    leg: { cloth: 0xd0ccc4, boot: 0x8a8578 },
    weapon: { type: 'pistol', body: 0x565c68, grip: 0x3a3428, trim: 0x9aa0ad },
  },

  // Lando Calrissian — blue shirt, navy half-cape look, the mustache.
  lando: {
    head: { type: 'human', skin: 0x8a5c40, hair: 0x2a1e16, mustache: 0x2a1e16 },
    torso: { type: 'vest', shirt: 0x3a5a8a, vest: 0x222c44, belt: 0x1a2234, buckle: 0xb9c0cc },
    arm: { cloth: 0x3a5a8a, hand: 0x8a5c40 },
    leg: { cloth: 0x2a3350, boot: 0x1a2030 },
    weapon: { type: 'pistol', body: 0x2a2d33, grip: 0x4a3520, trim: 0xb9c0cc },
  },

  // Padmé Amidala — queen of Naboo: long hair under a gold tiara,
  // deep-red royal gown flowing to the floor.
  padme: {
    head: { type: 'human', skin: 0xe4bd98, hair: 0x3e2a1c, long: true, tiara: 0xc8a03c },
    torso: { type: 'gown', cloth: 0x7a2438, trim: 0xc8a03c },
    arm: { cloth: 0x7a2438, hand: 0xe4bd98 },
    leg: { type: 'gown', cloth: 0x6a1e30, trim: 0xc8a03c, sheen: 0xe8b8c8 },
    weapon: { type: 'pistol', body: 0x565c68, grip: 0x6a1e30, trim: 0xc8a03c },
  },

  // General Grievous — bone-white mask and plating, two of his stolen
  // sabers drawn (blue front, green off-hand); Four-Arm Fury shows the
  // full flurry.
  grievous: {
    head: { type: 'grievous', shell: 0xd8d4c8, eyes: 0xd8b020 },
    torso: { type: 'mandoArmor', suit: 0x2a2c2e, plate: 0xd8d4c8, belt: 0x1a1c1e, box: 0x8a8578 },
    arm: { cloth: 0xc8c4b8, hand: 0x8a8578 },
    leg: { cloth: 0xc8c4b8, boot: 0x8a8578 },
    cape: { color: 0x2e2a30 },
    weapon: { hilt: 0x9aa0aa },
  },

  // Jango Fett — silver-blue armor, rangefinder up.
  jango: {
    head: { type: 'mandoHelmet', dome: 0x6a7a8c, trim: 0x3a5a7a, rangefinder: true },
    torso: { type: 'mandoArmor', suit: 0x4a5058, plate: 0x3a5a7a, belt: 0x32363c, box: 0x8a8e98 },
    arm: { cloth: 0x4a5058, hand: 0x32363c },
    leg: { cloth: 0x3e444c, boot: 0x262a30 },
    weapon: { type: 'pistol', body: 0x2a2d33, grip: 0x32363c, trim: 0x8a8e98 },
  },

  // Cad Bane — Duros bounty hunter: blue skin, red eyes, wide-brim hat.
  cadbane: {
    head: { type: 'duros', skin: 0x4a8a9a, hat: 0x4a3828 },
    torso: { type: 'vest', shirt: 0x8a6a4a, vest: 0x5a3c28, belt: 0x3a281c },
    arm: { cloth: 0x5a3c28, hand: 0x4a8a9a },
    leg: { cloth: 0x4a3830, boot: 0x2a1c14 },
    weapon: { type: 'pistol', body: 0x22252b, grip: 0x2a1c14, trim: 0x8a8578 },
  },

  // Han Solo — white shirt, black vest, DL-44 heavy blaster.
  han: {
    head: { type: 'human', skin: 0xe8bd91, hair: 0x4a3826 },
    torso: { type: 'vest', shirt: 0xd8d2c2, vest: 0x2a2420, belt: 0x5a4632 },
    arm: { cloth: 0xd8d2c2, hand: 0xe8bd91 },
    leg: { cloth: 0x2c3350, boot: 0x241c14 },
    weapon: { type: 'pistol', body: 0x22252b, grip: 0x4a3520, trim: 0x565c68 },
  },

  // Chewbacca — Wookiee fur head to foot, bandolier, fights bare-pawed.
  chewbacca: {
    head: { type: 'wookiee', fur: 0x6a4a2e, shade: 0x4a3220, muzzle: 0x9a7a52 },
    torso: { type: 'furry', fur: 0x6a4a2e, shade: 0x4a3220, strap: 0x8a7a5c, cell: 0x3a3a42 },
    arm: { type: 'fur', fur: 0x6a4a2e, shade: 0x4a3220 },
    leg: { type: 'fur', fur: 0x6a4a2e, shade: 0x4a3220 },
    weapon: { type: 'fists' },
  },

  // Boba Fett — battered green Mandalorian armor, rangefinder helmet.
  boba: {
    head: { type: 'mandoHelmet', dome: 0x4a5d46, trim: 0x8a3c2a, rangefinder: true },
    torso: { type: 'mandoArmor', suit: 0x5a5648, plate: 0x4a5d46, belt: 0x3a3428, box: 0x8a8578 },
    arm: { cloth: 0x5a5648, hand: 0x3a3428 },
    leg: { cloth: 0x5a5648, boot: 0x3a3428 },
    weapon: { type: 'pistol', body: 0x2a2d33, grip: 0x3a3428, trim: 0x8a3c2a },
  },

  // Darth Vader — helmet, chest control panel, cape, all-black armor.
  // (Grays lean lighter than "true" black so he reads against dark arenas.)
  vader: {
    head: { type: 'vaderHelmet', shell: 0x262631, shine: 0x4a4a5e, mask: 0x0e0e14, lens: 0x381016, grille: 0x767c8a },
    torso: { type: 'vaderArmor', armor: 0x1c1c24, pad: 0x2c2c3a, panel: 0x3c3c4c, belt: 0x14141c, box: 0x707684 },
    arm: { cloth: 0x1c1c24, hand: 0x12121a },
    leg: { cloth: 0x191922, boot: 0x101018 },
    cape: { color: 0x1d1d28 },
    weapon: { hilt: 0x565c68 },
  },
}
