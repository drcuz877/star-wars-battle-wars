import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { RENDER_SCALE as S } from '../util/display.js'
import { PUPPETS } from '../data/puppets.js'
import { computePose } from '../combat/animator.js'

// Parts-based puppet renderer (Phase 4). A puppet is a container of small
// textures — head, torso, arms, legs, weapon — that follows the fighter's
// invisible physics rectangle and gets posed every frame by animator.js.
// Combat logic never touches this file: the rectangle is still the body,
// the hitboxes are unchanged, this is purely how a fighter LOOKS.
//
// Each part is drawn once with vector commands at RENDER_SCALE× resolution
// and baked to a texture (so it stays crisp on big/high-DPI screens and can
// be tinted for hit flashes), then reused for every rematch. Characters
// without an entry in src/data/puppets.js keep their placeholder rectangle,
// so the roster can be arted one character at a time.

// Logical part sizes (game units; textures are S× these).
const HEAD_W = 26, HEAD_H = 24
const TORSO_W = 26, TORSO_H = 28
const ARM_W = 10, ARM_H = 30
const LEG_W = 10, LEG_H = 38
const CAPE_W = 34, CAPE_H = 54
const HILT_W = 8, HILT_H = 12
const BLADE_W = 10, BLADE_H = 40
const GLOW_W = 22, GLOW_H = 48
const ARM_LEN = 26 // shoulder pivot -> hand
const SHOULDER = { x: 4, y: -16 } // front-arm pivot in rig space

// Small wrapper so painters draw in logical units; it multiplies by S.
class Pen {
  constructor(g) {
    this.g = g
  }
  rect(x, y, w, h, c, a = 1) {
    this.g.fillStyle(c, a)
    this.g.fillRect(x * S, y * S, w * S, h * S)
  }
  round(x, y, w, h, r, c, a = 1) {
    this.g.fillStyle(c, a)
    this.g.fillRoundedRect(x * S, y * S, w * S, h * S, r * S)
  }
  ellipse(cx, cy, w, h, c, a = 1) {
    this.g.fillStyle(c, a)
    this.g.fillEllipse(cx * S, cy * S, w * S, h * S)
  }
  poly(pts, c, a = 1) {
    this.g.fillStyle(c, a)
    this.g.fillPoints(pts.map(([x, y]) => ({ x: x * S, y: y * S })), true)
  }
}

// ---------------------------------------------------------------------------
// Part painters. Each draws one part into its texture rectangle, top-left
// origin, using the palette from the character's puppets.js entry.
// ---------------------------------------------------------------------------

const HEADS = {
  // Generic human head. Options: hair color (omit/null = bald), beard
  // color, long: true for shoulder-length side hair.
  human(p, o) {
    p.rect(10.5, 19, 5, 5, o.skin) // neck
    if (o.hair) p.ellipse(13, 10, 21, 16, o.hair) // hair mass behind the face
    p.round(6, 7, 14, 15, 4, o.skin) // face
    if (o.hair) {
      p.ellipse(13, 6, 18, 7, o.hair) // fringe over the forehead
      p.rect(5.5, 6, 3.5, o.long ? 16 : 10, o.hair) // side hair, far
      p.rect(17, 6, 3.5, o.long ? 15 : 8, o.hair) // side hair, near
    }
    if (o.beard) {
      p.round(7.5, 16, 11, 6, 2.5, o.beard)
      p.rect(9, 14.5, 1.6, 3, o.beard) // jawline up the cheeks
      p.rect(15.4, 14.5, 1.6, 3, o.beard)
    }
    p.rect(10.2, 13, 2, 2.4, 0x232730) // eyes (toward the facing side)
    p.rect(15, 13, 2, 2.4, 0x232730)
    if (!o.beard) p.rect(10.8, 18.2, 4.4, 1.1, 0xc09070) // mouth line
  },

  // Yoda: green skin, winged ears, white wisps. Pair with def.scale.
  yoda(p, o) {
    p.rect(10.5, 19.5, 5, 4.5, o.skin)
    p.poly([[0.5, 8], [7, 11], [7, 15], [1, 13]], o.skin) // ears stick out
    p.poly([[25.5, 8], [19, 11], [19, 15], [25, 13]], o.skin)
    p.ellipse(13, 13, 16, 14, o.skin)
    p.ellipse(13, 7.5, 9, 4, 0xe8e4da, 0.6) // white wisps
    p.rect(9.6, 11.5, 2.4, 2.6, 0x2a3020)
    p.rect(14, 11.5, 2.4, 2.6, 0x2a3020)
    p.rect(11, 16.8, 4, 1, 0x5a7040)
  },

  // Togruta (Ahsoka): striped montrals + lekku framing the face, white
  // facial markings.
  togruta(p, o) {
    const bone = 0xe8e6e0
    p.poly([[2.5, 1.5], [8, 5], [7.5, 12], [2, 9]], bone) // left montral
    p.poly([[23.5, 1.5], [18, 5], [18.5, 12], [24, 9]], bone)
    p.round(3, 8, 5, 16, 2, bone) // lekku tails down both sides
    p.round(18, 8, 5, 16, 2, bone)
    p.rect(3, 11, 20, 2.2, o.stripe) // stripes across montrals + lekku
    p.rect(3, 16, 5, 2.2, o.stripe)
    p.rect(18, 16, 5, 2.2, o.stripe)
    p.rect(3.5, 3.5, 4, 2, o.stripe)
    p.rect(18.5, 3.5, 4, 2, o.stripe)
    p.round(7.5, 6.5, 11, 15, 4, o.skin) // face
    p.poly([[13, 7.2], [14.8, 9.6], [13, 12], [11.2, 9.6]], 0xf2eee6) // forehead diamond
    p.ellipse(9.8, 15.5, 2.2, 1.8, 0xf2eee6) // cheek marks
    p.ellipse(16.2, 15.5, 2.2, 1.8, 0xf2eee6)
    p.rect(10.3, 13, 2, 2.4, 0x2a3040)
    p.rect(13.9, 13, 2, 2.4, 0x2a3040)
    p.rect(11, 18.4, 4, 1, 0xa05038)
  },

  // Zabrak/Pau'an family (Maul, Grand Inquisitor): patterned face,
  // optional horn crown, colored eyes.
  zabrak(p, o) {
    p.rect(10.5, 19, 5, 5, o.skin)
    p.ellipse(13, 13, 19, 17, o.skin)
    p.poly([[13, 8], [15.5, 5.5], [13, 10.5], [10.5, 5.5]], o.marks) // brow V
    p.rect(7.5, 10, 2.2, 6, o.marks) // cheek stripes
    p.rect(16.3, 10, 2.2, 6, o.marks)
    p.round(11, 16.5, 4, 4.5, 1.5, o.marks) // chin patch
    if (o.horns) {
      p.poly([[12, 4.5], [13, 1], [14, 4.5]], o.hornColor ?? 0x8a8074) // crown
      p.poly([[7.5, 6.5], [8, 3.5], [9.8, 6]], o.hornColor ?? 0x8a8074)
      p.poly([[16.2, 6], [18, 3.5], [18.5, 6.5]], o.hornColor ?? 0x8a8074)
    }
    p.rect(10, 12.5, 2.2, 2.4, o.eyes ?? 0xd8b020)
    p.rect(13.8, 12.5, 2.2, 2.4, o.eyes ?? 0xd8b020)
  },

  // Deep hood with a gaunt face inside (Palpatine).
  hooded(p, o) {
    p.poly([[13, 0.5], [21, 7], [5, 7]], o.hood) // hood peak
    p.ellipse(13, 13, 24, 21, o.hood) // hood body
    p.ellipse(13, 14, 15, 15, 0x060608) // interior shadow
    p.round(9, 9.5, 8, 11, 3, o.skin) // gaunt face
    p.rect(10.2, 13, 2, 2, 0x16161c) // sunken eyes
    p.rect(13.8, 13, 2, 2, 0x16161c)
    p.rect(11, 17.8, 4, 1, 0x8a7060)
  },

  // Wookiee: all fur, lighter muzzle, dark nose (Chewbacca).
  wookiee(p, o) {
    p.rect(9, 19, 8, 5, o.fur) // neck fur
    p.ellipse(13, 12, 21, 20, o.fur) // head mass
    p.ellipse(13, 5.5, 13, 7, o.crown ?? o.fur) // crown tuft
    p.rect(5, 8, 3, 9, o.shade, 0.55) // fur shading streaks
    p.rect(18.5, 9, 3, 8, o.shade, 0.55)
    p.ellipse(13, 15.5, 11, 9, o.muzzle) // lighter muzzle patch
    p.ellipse(13, 13.5, 4.5, 3, 0x1c120c) // nose
    p.rect(9.6, 9.5, 2.2, 2.6, 0x2a1c12) // eyes
    p.rect(14.4, 9.5, 2.2, 2.6, 0x2a1c12)
  },

  // Mandalorian helmet: dome, ear caps, black T-visor, optional
  // rangefinder stalk (Boba/Jango; Din's is clean).
  mandoHelmet(p, o) {
    p.rect(8, 19, 10, 5, o.dome) // neck seal
    p.round(4.5, 4, 17, 18, 5, o.dome) // helmet shell
    p.ellipse(13, 6.5, 17, 7, o.dome) // dome top
    p.rect(3.5, 9, 3, 7, o.ear ?? o.trim) // ear caps
    p.rect(19.5, 9, 3, 7, o.ear ?? o.trim)
    p.rect(6.5, 8.5, 13, 3, 0x0c0e10) // visor: horizontal bar
    p.rect(11.6, 8.5, 2.8, 9, 0x0c0e10) // visor: vertical drop
    p.rect(6.5, 7.9, 13, 1, o.trim, 0.8) // brow trim
    if (o.rangefinder) {
      p.rect(20.5, 1.5, 1.8, 8, o.trim) // stalk
      p.rect(19.4, 0.5, 4, 2.4, 0x22262c) // antenna head
    }
  },

  // Vader's helmet: dome, flared skirt, angular mask, silver grille.
  vaderHelmet(p, o) {
    p.rect(8, 19, 10, 5, o.mask) // neck seal
    p.poly([[3, 11], [23, 11], [26, 22], [0, 22]], o.shell) // flared skirt
    p.ellipse(13, 9.5, 22, 17, o.shell) // dome
    p.ellipse(9.5, 5.5, 9, 4.5, o.shine, 0.55) // dome highlight
    p.poly([[6.5, 12], [19.5, 12], [13, 23.5]], o.mask) // face mask triangle
    p.rect(6.5, 11.2, 13, 1.3, 0x07070a) // brow line
    p.poly([[8, 13], [12.2, 13], [11.2, 16.2], [8.4, 15.4]], o.lens) // eye lenses
    p.poly([[13.8, 13], [18, 13], [17.6, 15.4], [14.8, 16.2]], o.lens)
    p.rect(11, 17.6, 1, 4.2, o.grille) // mouth grille bars
    p.rect(12.5, 18, 1, 4.4, o.grille)
    p.rect(14, 17.6, 1, 4.2, o.grille)
  },
}

const TORSOS = {
  // Cloth tunic with belt (Luke's black RotJ outfit, most Jedi later).
  tunic(p, o) {
    p.round(1.5, 0.5, 23, 6, 2.5, o.cloth) // shoulder line
    p.round(3, 1, 20, 25, 3, o.cloth)
    p.poly([[9, 1], [17, 1], [13, 12]], o.flap) // tunic V-flap
    p.rect(3, 18, 20, 5, o.belt)
    p.round(11, 18.7, 4, 3.6, 1, o.buckle)
  },

  // Open vest over a shirt, gun belt (Han, Lando).
  vest(p, o) {
    p.round(1.5, 0.5, 23, 6, 2.5, o.shirt) // shoulder line
    p.round(3, 1, 20, 25, 3, o.shirt)
    p.round(3, 1, 6.5, 20, 2, o.vest) // vest panels
    p.round(16.5, 1, 6.5, 20, 2, o.vest)
    p.rect(3, 18, 20, 4.5, o.belt)
    p.round(10.5, 18.6, 4.5, 3.4, 1, o.buckle ?? 0xb9c0cc)
    p.rect(17, 21, 4.5, 4, o.belt, 0.9) // holster drop
  },

  // Mandalorian plate armor over a flight suit (Boba, Jango, Din).
  mandoArmor(p, o) {
    p.round(2.5, 0.5, 21, 25.5, 3, o.suit)
    p.round(0.5, 0, 9.5, 6, 2, o.plate) // shoulder plates
    p.round(16, 0, 9.5, 6, 2, o.plate)
    p.round(5, 6.5, 7, 6, 1.5, o.plate) // chest plates
    p.round(14, 6.5, 7, 6, 1.5, o.plate)
    p.round(9.5, 13, 7, 4, 1, o.plate) // abdomen plate
    p.rect(2.5, 19, 21, 4.5, o.belt)
    p.rect(5, 20, 3.5, 2.6, o.box ?? 0x8a8578) // belt pouches
    p.rect(11.2, 20, 3.5, 2.6, o.box ?? 0x8a8578)
    p.rect(17.4, 20, 3.5, 2.6, o.box ?? 0x8a8578)
  },

  // Full-body fur with a bandolier (Chewbacca).
  furry(p, o) {
    p.round(2.5, 0.5, 21, 26, 4, o.fur)
    p.rect(4, 3, 3, 16, o.shade, 0.5) // fur streaks
    p.rect(11.5, 5, 3, 18, o.shade, 0.45)
    p.rect(19, 3, 3, 14, o.shade, 0.5)
    // Bandolier: right shoulder to left hip, with ammo cells.
    p.poly([[20, 0.5], [24, 3], [6, 26], [2.5, 23]], o.strap)
    p.rect(16.5, 4.5, 3.4, 4, o.cell)
    p.rect(12.5, 9.5, 3.4, 4, o.cell)
    p.rect(8.5, 14.5, 3.4, 4, o.cell)
  },

  // Vader's chest armor: shoulder pads, control panel, belt boxes.
  vaderArmor(p, o) {
    p.round(2.5, 1, 21, 25, 3, o.armor)
    p.round(0.5, 0, 10.5, 6.5, 2, o.pad) // shoulder pads
    p.round(15, 0, 10.5, 6.5, 2, o.pad)
    p.rect(9, 1.2, 8, 2, o.pad) // collar chain
    p.round(8, 7, 10, 9.5, 1, o.panel) // chest control box
    p.rect(9.3, 8.4, 2.1, 1.7, 0xd03030) // panel lights
    p.rect(12, 8.4, 2.1, 1.7, 0x9aa0ad)
    p.rect(14.7, 8.4, 2.1, 1.7, 0x3a6cff)
    p.rect(9.3, 11.2, 7.5, 1, 0x14141a) // panel slots
    p.rect(9.3, 13, 7.5, 1, 0x14141a)
    p.rect(2.5, 19, 21, 5, o.belt)
    p.rect(4.5, 20, 4, 3, o.box) // belt function boxes
    p.rect(11, 20, 4, 3, o.box)
    p.rect(17.5, 20, 4, 3, o.box)
  },
}

const ARMS = {
  sleeve(p, o) {
    p.round(2, 1, 6, 22, 2.5, o.cloth)
    p.ellipse(5, 25.5, 6.5, 6.5, o.hand)
  },
  fur(p, o) {
    p.round(1.5, 1, 7, 23, 3, o.fur)
    p.rect(3, 4, 2, 14, o.shade, 0.45)
    p.ellipse(5, 25.5, 7, 7, o.fur) // paw
  },
}

const LEGS = {
  pants(p, o) {
    p.round(2, 1, 6, 23, 2.5, o.cloth)
    p.round(1.5, 22, 7, 12.5, 2, o.boot)
    p.round(1.5, 31, 9.5, 3.8, 1.5, o.boot) // toe points forward (+x)
  },
  fur(p, o) {
    p.round(1.5, 1, 7, 31, 3, o.fur)
    p.rect(3, 5, 2, 18, o.shade, 0.45)
    p.ellipse(5.5, 33, 8, 5, o.fur) // furry foot
  },
}

function drawCape(p, o) {
  p.poly([[6, 0], [28, 0], [34, 52], [0, 52]], o.color)
  p.poly([[10, 4], [24, 4], [29, 50], [5, 50]], o.shade ?? 0x000000, 0.25)
}

// Saber weapon, three layers assembled in the wpn container: hilt (grip
// point at the fighter's hand), blade (also baked alone so swing-trail
// ghosts can reuse it), and a wide soft glow rendered additively.
function drawHilt(p, o, style) {
  p.round(2, 0.5, 4, 11, 1, o.hilt)
  p.rect(2, 3, 4, 1.3, 0x14161c) // grip bands
  p.rect(2, 6, 4, 1.3, 0x14161c)
  p.rect(2.4, 1.2, 1.4, 1.4, 0xd03030) // activation stud
  if (style === 'curved') p.poly([[2, 9.5], [6, 10], [7.5, 11.8], [2.5, 11.8]], o.hilt) // Dooku's hooked pommel
  if (style === 'crossguard') p.rect(0.5, 0.5, 7, 1.6, o.hilt) // quillon housing
}

function drawBlade(p, color, style) {
  p.round(3, 2, 4, 37, 2, color, 0.95)
  p.round(4, 3.5, 2, 33, 1, 0xffffff, 0.9) // hot core
  if (style === 'crossguard') {
    p.rect(0, 33.5, 3.2, 2.4, color, 0.95) // side vents (Kylo)
    p.rect(6.8, 33.5, 3.2, 2.4, color, 0.95)
    p.rect(0.5, 34.1, 2.2, 1.1, 0xffffff, 0.85)
    p.rect(7.3, 34.1, 2.2, 1.1, 0xffffff, 0.85)
  }
}

function drawGlow(p, color) {
  p.round(3, 4, 16, 42, 8, color, 0.1)
  p.round(6, 3, 10, 43, 5, color, 0.2)
  p.round(8, 2, 6, 44, 3, color, 0.32)
}

// Blaster pistol, barrel pointing up (same convention as the blade, so
// the animator's wpn angles mean the same thing for every archetype).
// Texture 10×20, grip point at (5, 15).
const PISTOL_W = 10, PISTOL_H = 20
function drawPistol(p, o) {
  p.rect(3.5, 1, 3, 10, o.body ?? 0x2a2d33) // barrel
  p.rect(3, 0.5, 4, 2, o.trim ?? 0x40454e) // muzzle
  p.round(2.5, 9.5, 5, 4.5, 1, o.body ?? 0x2a2d33) // receiver
  p.rect(2.8, 13.5, 4, 6, o.grip ?? 0x4a3520) // grip
  p.rect(1.8, 10.5, 1.6, 2.4, o.trim ?? 0x40454e) // scope nub / sight
}

function bake(scene, key, w, h, painter) {
  if (scene.textures.exists(key)) return
  const g = scene.make.graphics({ x: 0, y: 0, add: false })
  painter(new Pen(g))
  g.generateTexture(key, w * S, h * S)
  g.destroy()
}

// ---------------------------------------------------------------------------

// Returns a Puppet for characters that have an art definition, else null
// (the fighter keeps its placeholder rectangle).
export function createPuppet(scene, fighter) {
  const def = PUPPETS[fighter.character.id]
  if (!def) return null
  return new Puppet(scene, fighter, def)
}

// Menu portraits reuse the battle head, baked on demand: returns the head
// texture key for an arted character, or null so menus keep their
// placeholder swatch. Textures are game-global, so whichever scene bakes
// first (menu or battle), the other reuses it.
export function portraitKey(scene, character) {
  const def = PUPPETS[character.id]
  if (!def) return null
  const key = `pp:${character.id}:head`
  bake(scene, key, HEAD_W, HEAD_H, (p) => HEADS[def.head.type](p, def.head))
  return key
}

export class Puppet {
  constructor(scene, fighter, def) {
    this.scene = scene
    this.f = fighter
    const id = fighter.character.id
    const k = (part) => `pp:${id}:${part}`

    bake(scene, k('head'), HEAD_W, HEAD_H, (p) => HEADS[def.head.type](p, def.head))
    bake(scene, k('torso'), TORSO_W, TORSO_H, (p) => TORSOS[def.torso.type](p, def.torso))
    bake(scene, k('arm'), ARM_W, ARM_H, (p) => ARMS[def.arm.type ?? 'sleeve'](p, def.arm))
    bake(scene, k('leg'), LEG_W, LEG_H, (p) => LEGS[def.leg.type ?? 'pants'](p, def.leg))
    if (def.cape) bake(scene, k('cape'), CAPE_W, CAPE_H, (p) => drawCape(p, def.cape))

    this.weaponType = def.weapon?.type ?? 'saber'
    this.saberStyle = fighter.character.saber?.style ?? 'single'
    if (this.weaponType === 'saber') {
      const bladeColor = fighter.character.saber?.colors?.[0] ?? 0xffffff
      bake(scene, k('hilt'), HILT_W, HILT_H, (p) => drawHilt(p, def.weapon, this.saberStyle))
      bake(scene, k('blade'), BLADE_W, BLADE_H, (p) => drawBlade(p, bladeColor, this.saberStyle))
      bake(scene, k('glow'), GLOW_W, GLOW_H, (p) => drawGlow(p, bladeColor))
      this.bladeKey = k('blade')
    } else if (this.weaponType === 'pistol') {
      bake(scene, k('pistol'), PISTOL_W, PISTOL_H, (p) => drawPistol(p, def.weapon))
    }

    const img = (part, ox, oy) =>
      scene.add.image(0, 0, k(part)).setScale(1 / S).setOrigin(ox, oy)

    // Small-stature characters (Yoda, Grogu): the whole rig scales down,
    // anchored at the feet. The PHYSICS rect is untouched — hitboxes are
    // identical for the whole roster, this is purely visual.
    this.bodyScale = def.scale ?? 1

    // Ground marker: a soft shadow that doubles as the state "tell" ring
    // (replaces the old rectangle outline colors — gold special-ready, cyan
    // block, etc.). Separate from the body so it never flips or rotates.
    this.aura = scene.add
      .ellipse(fighter.rect.x, T.arena.groundY + 5, 58 * this.bodyScale, 12 * this.bodyScale, 0x000000, 0.28)
      .setDepth(9)

    // root: physics position + facing flip + KO rotation.
    // rig: pose-only offsets (bob, lean) so physics stays untouched.
    this.root = scene.add.container(fighter.rect.x, fighter.rect.y).setDepth(12)
    this.rig = scene.add.container(0, 0).setScale(this.bodyScale)
    this.root.add(this.rig)

    this.cape = null
    if (def.cape) {
      this.cape = img('cape', 0.5, 0.02)
      this.cape.setPosition(-3, -18)
      this.rig.add(this.cape)
    }

    // Limb containers pivot at the joint; the image hangs from the pivot.
    const limb = (part, x, y, py) => {
      const c = scene.add.container(x, y)
      const i = img(part, 0.5, py)
      c.add(i)
      this.rig.add(c)
      return c
    }

    this.armB = limb('arm', -4, -16, 2 / ARM_H)
    this.legB = limb('leg', -4.5, 6, 2 / LEG_H)
    this.legF = limb('leg', 4.5, 6, 2 / LEG_H)

    this.torso = img('torso', 0.5, 0.5)
    this.torso.setPosition(0, -6)
    this.rig.add(this.torso)

    this.head = scene.add.container(0, -20)
    this.head.add(img('head', 0.5, 1))
    this.rig.add(this.head)

    this.armF = limb('arm', SHOULDER.x, SHOULDER.y, 2 / ARM_H)
    // Weapon container pivots at the hand; grip point is the container
    // origin. Sabers: glow behind, then blade, then hilt. Pistols: just
    // the gun. Brawlers: an empty container (fists), so animator wpn
    // angles are harmless no-ops.
    this.wpn = scene.add.container(0, ARM_LEN)
    this.blades = [] // every live blade+glow, for KO switch-off / shimmer
    this.glows = []
    // Adds one blade+glow pair to a hand container; flip=true points it
    // DOWN from the grip (the second end of a double-bladed staff).
    const saberInto = (cont, flip = false) => {
      const glow = img('glow', 0.5, 1).setBlendMode(Phaser.BlendModes.ADD)
      const blade = img('blade', 0.5, 1)
      if (flip) {
        glow.setPosition(0, 3).setAngle(180)
        blade.setPosition(0, 4).setAngle(180)
      } else {
        glow.setPosition(0, -3)
        blade.setPosition(0, -4)
      }
      cont.add([glow, blade])
      this.glows.push(glow)
      this.blades.push(blade)
    }
    if (this.weaponType === 'saber') {
      saberInto(this.wpn)
      if (this.saberStyle === 'double') saberInto(this.wpn, true) // Maul/Inquisitor staff
      this.wpn.add(img('hilt', 0.5, 0.5))
      if (this.saberStyle === 'twin') {
        // Second saber in the off hand (Ahsoka, Ventress), held at a
        // fixed angle — the back arm's own motion animates it.
        this.wpnB = scene.add.container(0, ARM_LEN).setAngle(168)
        saberInto(this.wpnB)
        this.wpnB.add(img('hilt', 0.5, 0.5))
        this.armB.add(this.wpnB)
      }
    } else if (this.weaponType === 'pistol') {
      this.wpn.add(img('pistol', 0.5, 15 / PISTOL_H))
    }
    this.blade = this.blades[0] ?? null // front blade: trail source
    this.armF.add(this.wpn)
    this.trailAccum = 0

    // Everything tintable, for hit flashes and the KO fade.
    this.images = []
    for (const c of [this.rig, this.armB, this.legB, this.legF, this.head, this.armF, this.wpn]) {
      for (const child of c.list) if (child.setTintFill) this.images.push(child)
    }

    // Current pose (lerped toward the animator's target each frame).
    this.cur = { armF: -22, armB: 12, legF: 0, legB: 0, head: 0, wpn: 168, rigY: 0, rigAng: 0, cape: 0 }
    this.tintMode0 = this.images[0]?.tintMode ?? 0

    // Sync on the scene's post-update, not from fighter.update(): the
    // fighter stops being updated once the round ends, but the KO topple
    // tween and knockback slide keep moving the rect — the puppet must
    // keep following it.
    this.onPost = (_t, delta) => this.sync(delta)
    scene.events.on('postupdate', this.onPost)
    this.root.once('destroy', () => scene.events.off('postupdate', this.onPost))
  }

  sync(dtMs) {
    const f = this.f
    this.root.setPosition(f.rect.x, f.rect.y)
    this.root.angle = f.rect.angle // KO topple tween lives on the rect
    this.root.scaleX = f.facing
    this.root.setAlpha(f.dodging ? 0.45 : 1)

    const target = computePose(f, this.scene.time.now)
    // Attacks are timing-critical (the pose IS the telegraph), so they snap;
    // everything else eases for a fluid look.
    const k = target.snap ? 1 : 1 - Math.exp(-(dtMs || 16.7) / 70)
    const c = this.cur
    for (const key of ['armF', 'armB', 'legF', 'legB', 'head', 'wpn', 'rigY', 'rigAng', 'cape']) {
      c[key] += ((target[key] ?? 0) - c[key]) * k
    }

    // Blade hum: a slow shimmer on the additive glows (sabers only).
    const hum = 0.75 + Math.sin(this.scene.time.now / 140) * 0.15
    for (const glow of this.glows) glow.setAlpha(hum)

    // Swing trail: while the swing can connect, drop fading additive
    // ghosts of the blade along its arc (in rig space, so they mirror and
    // travel with the fighter like classic fighting-game trails).
    if (this.blade && f.swinging && f.swingT >= T.attack.windupMs && !f.ko) {
      this.trailAccum += dtMs || 16.7
      if (this.trailAccum >= 15) {
        this.trailAccum = 0
        const rad = Phaser.Math.DegToRad(c.armF)
        const hx = SHOULDER.x - Math.sin(rad) * ARM_LEN
        const hy = SHOULDER.y + Math.cos(rad) * ARM_LEN
        const ghost = this.scene.add
          .image(hx, hy, this.bladeKey)
          .setScale(1 / S)
          .setOrigin(0.5, 1)
          .setAngle(c.armF + c.wpn)
          .setAlpha(0.4)
          .setBlendMode(Phaser.BlendModes.ADD)
        this.rig.add(ghost)
        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 140,
          onComplete: () => ghost.destroy(),
        })
      }
    } else this.trailAccum = 15 // first active frame always drops a ghost

    this.armF.angle = c.armF
    this.armB.angle = c.armB
    this.legF.angle = c.legF
    this.legB.angle = c.legB
    this.head.angle = c.head
    this.wpn.angle = c.wpn
    // Feet-anchored: a scaled-down rig sits lower so its feet still touch
    // the ground line (rect center is 40 above the ground).
    this.rig.y = (T.fighter.height / 2) * (1 - this.bodyScale) + c.rigY * this.bodyScale
    this.rig.angle = c.rigAng
    if (this.cape) this.cape.angle = c.cape

    // State ring: same colors the rectangle outline used to signal.
    const a = this.aura
    a.setPosition(f.rect.x, T.arena.groundY + 5)
    if (f.ko) a.setVisible(false)
    else if (f.blocking) a.setFillStyle(0x66ffff, 0.4)
    else if (f.counterActive) a.setFillStyle(0xffffff, 0.45)
    else if (f.invulnerable) a.setFillStyle(0x7fe08f, 0.45)
    else if (f.buffMs > 0) a.setFillStyle(0xff8844, 0.45)
    else if (f.specialReady) a.setFillStyle(0xffe81f, 0.4)
    else a.setFillStyle(0x000000, 0.28)
  }

  flash() {
    for (const i of this.images) i.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
    this.scene.time.delayedCall(80, () => {
      for (const i of this.images) {
        i.clearTint()
        i.setTintMode(this.tintMode0)
      }
      if (this.f.ko) this.setKo()
    })
  }

  setKo() {
    for (const i of this.images) i.setTint(0x8890a8)
    // The sabers switch off when their owner goes down.
    for (const b of this.blades) b.setVisible(false)
    for (const g of this.glows) g.setVisible(false)
  }
}
