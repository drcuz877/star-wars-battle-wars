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
const WPN_W = 10, WPN_H = 58
const WPN_GRIP_Y = 46 // grip point inside the weapon texture (rotation pivot)
const ARM_LEN = 26 // shoulder pivot -> hand

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
  // Generic human head: skin + hair colors from the definition.
  human(p, o) {
    p.rect(10.5, 19, 5, 5, o.skin) // neck
    p.ellipse(13, 10, 21, 16, o.hair) // hair mass behind the face
    p.round(6, 7, 14, 15, 4, o.skin) // face
    p.ellipse(13, 6, 18, 7, o.hair) // fringe over the forehead
    p.rect(5.5, 6, 3.5, 10, o.hair) // sideburn, far side
    p.rect(17, 6, 3.5, 8, o.hair) // sideburn, near side
    p.rect(10.2, 13, 2, 2.4, 0x232730) // eyes (toward the facing side)
    p.rect(15, 13, 2, 2.4, 0x232730)
    p.rect(10.8, 18.2, 4.4, 1.1, 0xc09070) // mouth line
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

function drawArm(p, o) {
  p.round(2, 1, 6, 22, 2.5, o.cloth)
  p.ellipse(5, 25.5, 6.5, 6.5, o.hand)
}

function drawLeg(p, o) {
  p.round(2, 1, 6, 23, 2.5, o.cloth)
  p.round(1.5, 22, 7, 12.5, 2, o.boot)
  p.round(1.5, 31, 9.5, 3.8, 1.5, o.boot) // toe points forward (+x)
}

function drawCape(p, o) {
  p.poly([[6, 0], [28, 0], [34, 52], [0, 52]], o.color)
  p.poly([[10, 4], [24, 4], [29, 50], [5, 50]], o.shade ?? 0x000000, 0.25)
}

// Saber weapon: hilt + a simple blade in the character's lore color.
// (The real glow/trail treatment is Segment 2 — this makes the blade exist.)
function drawSaber(p, o, bladeColor) {
  p.round(2, 2, 6, 39, 3, bladeColor, 0.3) // halo
  p.round(3, 3, 4, 37, 2, bladeColor, 0.95) // blade
  p.round(4, 4.5, 2, 33, 1, 0xffffff, 0.9) // hot core
  p.round(3, 41, 4, 11, 1, o.hilt) // hilt
  p.rect(3, 43.5, 4, 1.3, 0x14161c) // grip bands
  p.rect(3, 46.5, 4, 1.3, 0x14161c)
  p.rect(3.4, 41.8, 1.4, 1.4, 0xd03030) // activation stud
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

export class Puppet {
  constructor(scene, fighter, def) {
    this.scene = scene
    this.f = fighter
    const id = fighter.character.id
    const k = (part) => `pp:${id}:${part}`

    bake(scene, k('head'), HEAD_W, HEAD_H, (p) => HEADS[def.head.type](p, def.head))
    bake(scene, k('torso'), TORSO_W, TORSO_H, (p) => TORSOS[def.torso.type](p, def.torso))
    bake(scene, k('arm'), ARM_W, ARM_H, (p) => drawArm(p, def.arm))
    bake(scene, k('leg'), LEG_W, LEG_H, (p) => drawLeg(p, def.leg))
    if (def.cape) bake(scene, k('cape'), CAPE_W, CAPE_H, (p) => drawCape(p, def.cape))
    const bladeColor = fighter.character.saber?.colors?.[0] ?? 0xffffff
    bake(scene, k('wpn'), WPN_W, WPN_H, (p) => drawSaber(p, def.weapon, bladeColor))

    const img = (part, ox, oy) =>
      scene.add.image(0, 0, k(part)).setScale(1 / S).setOrigin(ox, oy)

    // Ground marker: a soft shadow that doubles as the state "tell" ring
    // (replaces the old rectangle outline colors — gold special-ready, cyan
    // block, etc.). Separate from the body so it never flips or rotates.
    this.aura = scene.add
      .ellipse(fighter.rect.x, T.arena.groundY + 5, 58, 12, 0x000000, 0.28)
      .setDepth(9)

    // root: physics position + facing flip + KO rotation.
    // rig: pose-only offsets (bob, lean) so physics stays untouched.
    this.root = scene.add.container(fighter.rect.x, fighter.rect.y).setDepth(12)
    this.rig = scene.add.container(0, 0)
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

    this.armF = limb('arm', 4, -16, 2 / ARM_H)
    this.wpn = scene.add.container(0, ARM_LEN)
    this.wpn.add(img('wpn', 0.5, WPN_GRIP_Y / WPN_H))
    this.armF.add(this.wpn)

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

    this.armF.angle = c.armF
    this.armB.angle = c.armB
    this.legF.angle = c.legF
    this.legB.angle = c.legB
    this.head.angle = c.head
    this.wpn.angle = c.wpn
    this.rig.y = c.rigY
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
  }
}
