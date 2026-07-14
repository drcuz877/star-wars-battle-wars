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
//   head.type   'human' (skin + hair) | 'vaderHelmet'
//   torso.type  'tunic' (cloth + belt) | 'vaderArmor'
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
