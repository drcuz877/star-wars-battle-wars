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
  // Luke Skywalker — Return of the Jedi black outfit, sandy-blond hair.
  luke: {
    head: { type: 'human', skin: 0xeac393, hair: 0xc7a15f },
    torso: { type: 'tunic', cloth: 0x1e1e26, flap: 0x2a2a33, belt: 0x241f18, buckle: 0xb9c0cc },
    arm: { cloth: 0x1e1e26, hand: 0xeac393 },
    leg: { cloth: 0x191920, boot: 0x2a2118 },
    weapon: { hilt: 0xb7bcc6 },
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
