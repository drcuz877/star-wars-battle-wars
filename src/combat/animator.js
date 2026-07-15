import { TUNING as T } from './tuning.js'

// Maps a fighter's combat state to a puppet pose, every frame. Pure
// function: reads the fighter, returns numbers; puppet.js applies them.
//
// Angle convention (before the facing flip): 0 = limb hanging straight
// down, negative swings it FORWARD (toward the opponent), positive swings
// it BACK. `wpn` is the saber's angle relative to the forearm — 180 means
// the blade continues the arm's line, smaller values fold it upward.
// The same numbers work for both fighters because the whole puppet is
// mirrored by facing, exactly like the combat code's facing convention.
//
// Poses are TARGETS: puppet.js eases toward them (about 70ms), except
// attacks, which set `snap` so the swing arc is frame-accurate with the
// real hitbox timing in fighter.js (90ms windup + 140ms active window).

const easeOut = (p) => 1 - (1 - p) * (1 - p)

export function computePose(f, now) {
  const ranged = f.d.ranged
  // Brawlers punch — unless they carry sabers (Grievous), in which case
  // the saber swing/block poses fit their melee mechanics just as well.
  const fists = f.d.archetype === 'brawler' && !f.character.saber
  const pose = {
    // Rest stance per archetype: saber angled low-forward, pistol at low
    // ready, brawler hands loose and a touch forward.
    armF: ranged ? -32 : fists ? -14 : -22,
    armB: fists ? -8 : 12,
    legF: 0, legB: 0,
    head: 0, wpn: ranged ? 174 : 168,
    wpnB: 168, // off-hand saber, when the character has one
    rigY: Math.sin(now / 420) * 1.6, rigAng: 0,
    cape: Math.sin(now / 500) * 2,
    snap: false,
  }

  if (f.ko) {
    // Limp: the KO topple itself is the rect-angle tween mirrored by root.
    Object.assign(pose, { armF: -10, armB: 14, legF: -6, legB: 8, head: 12, wpn: 172, rigY: 0, rigAng: 0 })
    return pose
  }

  // Legs first — they follow locomotion regardless of what the arms do.
  if (!f.onGround) {
    pose.legF = -26
    pose.legB = 30
    pose.armB = -30
    pose.rigY = 0
  } else {
    const vx = f.body.velocity.x
    if (Math.abs(vx) > 40) {
      const ph = Math.sin(now * 0.014)
      pose.legF = ph * 28
      pose.legB = -ph * 28
      pose.armB = 12 - ph * 10
      pose.rigY = -Math.abs(Math.cos(now * 0.014)) * 1.4
      pose.rigAng = Math.sign(vx) * f.facing * 2.5 // slight lean into the run
    }
  }

  // Blaster dodge slide: lean hard into the direction of travel while the
  // i-frames (and the vulnerable recovery tail) play out.
  if (f.dodgeT >= 0) {
    const lean = Math.sign(f.body.velocity.x || -f.facing) * f.facing * 16
    Object.assign(pose, {
      rigAng: lean, rigY: 5, head: -lean * 0.4,
      legF: -34, legB: 38, armF: -20, armB: 30, wpn: 170,
    })
    return pose
  }

  if (f.hitstun > 0) {
    Object.assign(pose, { armF: -40, armB: 45, head: -14, wpn: 150, rigAng: -9 })
    return pose
  }

  if (f.specialRun) {
    const tpl = f.specialRun.template
    if (tpl === 'grip') {
      // Force Push / Choke: off-hand thrust forward, saber pulled back.
      Object.assign(pose, { armB: -100, armF: 25, wpn: 160, rigAng: 6 })
    } else if (tpl === 'dash') {
      Object.assign(pose, { armF: -92, wpn: 178, legF: -30, legB: 34, rigAng: 12 })
    } else {
      // Generic channel: both arms raised outward.
      Object.assign(pose, { armF: -35, armB: -25, wpn: 150, rigAng: 3 })
    }
    return pose
  }

  // Blaster fire: planted, arm locked out, barrel extending the arm. The
  // fireRoot timer (anti-kite plant after each shot) doubles as the pose
  // window — the same beat the combat rules already impose.
  if (ranged && f.fireRoot > 0) {
    Object.assign(pose, {
      snap: true, armF: -88, wpn: 180, armB: -26,
      head: -3, rigAng: 4, legF: -10, legB: 12,
    })
    return pose
  }

  if (f.swinging) {
    pose.snap = true
    if (fists) {
      // Brawler punch: short pull-back, then a straight jab with the
      // off-hand up as a guard.
      if (f.swingT < T.attack.windupMs) {
        const p = f.swingT / T.attack.windupMs
        pose.armF = -14 + (42 - -14) * p
        pose.armB = -30
        pose.rigAng = -4
      } else {
        const p = Math.min(1, (f.swingT - T.attack.windupMs) / T.attack.activeMs)
        pose.armF = 42 + (-92 - 42) * easeOut(p)
        pose.armB = -38
        pose.rigAng = 9
        pose.head = 2
      }
      return pose
    }
    if (f.character.saber?.style === 'double') {
      // Double-bladed staff (Maul, Inquisitor): the arm holds mostly
      // forward while the staff itself twirls a full revolution through
      // the strike — both blades sweep the arc.
      if (f.swingT < T.attack.windupMs) {
        const p = f.swingT / T.attack.windupMs
        pose.armF = -22 + (30 - -22) * p
        pose.wpn = 168 - 40 * p
        pose.head = -5
        pose.rigAng = -4
      } else {
        const p = Math.min(1, (f.swingT - T.attack.windupMs) / T.attack.activeMs)
        pose.armF = 30 + (-80 - 30) * easeOut(p)
        pose.wpn = 128 - 380 * easeOut(p) // the spin
        pose.head = 2
        pose.rigAng = 8
      }
      return pose
    }
    if (f.swingT < T.attack.windupMs) {
      // Saber windup: arm cocked up and back, blade raised — the telegraph.
      // The off hand pulls across the body (its saber cocks too, if any).
      const p = f.swingT / T.attack.windupMs
      pose.armF = -22 + (145 - -22) * p
      pose.wpn = 150
      pose.armB = 30
      pose.wpnB = 150
      pose.head = -6
      pose.rigAng = -5
    } else {
      // Active window: sweep from up-back to low-front while the real
      // hitbox can connect; the off hand follows through underneath, so
      // twin wielders (Ahsoka, Ventress, Grievous) slash with both.
      const p = Math.min(1, (f.swingT - T.attack.windupMs) / T.attack.activeMs)
      pose.armF = 145 + (-110 - 145) * easeOut(p)
      pose.wpn = 178
      pose.armB = 30 + (-75 - 30) * easeOut(p)
      pose.wpnB = 186
      pose.head = 2
      pose.rigAng = 7
    }
    return pose
  }

  if (f.blocking) {
    if (fists) {
      // Brace: both arms crossed in front, hunkered down.
      Object.assign(pose, {
        armF: -52, armB: -44, head: 6, rigY: pose.rigY + 3,
        legF: -10, legB: 12,
      })
      return pose
    }
    Object.assign(pose, {
      armF: -70, armB: 25, wpn: 62, head: -4,
      legF: -8, legB: 10, rigY: pose.rigY + 2,
    })
    return pose
  }

  return pose
}
