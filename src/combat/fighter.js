import Phaser from 'phaser'
import { TUNING as T } from './tuning.js'
import { deriveStats } from './derive.js'
import { startSpecial, updateSpecial, cancelSpecial, specialLocks } from './specials.js'
import { createPuppet } from '../art/puppet.js'
import { shakeCamera } from '../util/display.js'
import { playSfx } from '../audio/audio.js'

// One fighter: a physics rectangle plus combat state (HP, stamina, special
// meter, swing/hitstun timers). The player and the AI both drive a Fighter
// through the same "intents" object, so nothing in here knows or cares who
// is controlling it:
//   { left, right, defend, jumpPressed, attackPressed, specialPressed }
//
// Since Phase 2 a Fighter is built from a character entry (characters.js):
// all its numbers come from deriveStats(), and its Defend button means
// different things per archetype — saber block/deflect, blaster dodge
// with i-frames, brawler brace. Blasters attack with ranged bolts.
export class Fighter {
  constructor(scene, { x, character, facing, hpMult = 1 }) {
    this.scene = scene
    this.character = character
    this.name = character.name
    this.facing = facing // 1 = facing right, -1 = facing left
    this.baseColor = character.color
    this.d = deriveStats(character)
    this.d.maxHp = Math.round(this.d.maxHp * hpMult) // epic-duel bonus (scene decides)

    this.hp = this.d.maxHp
    this.stamina = T.fighter.maxStamina
    this.special = 0

    this.rect = scene.add.rectangle(
      x,
      T.arena.groundY - T.fighter.height / 2,
      T.fighter.width,
      T.fighter.height,
      character.color,
    )
    scene.physics.add.existing(this.rect)
    this.body.setCollideWorldBounds(true)
    this.body.setGravityY(T.fighter.gravity)
    this.body.setDragX(900)

    // Melee swing flash — tinted with the character's saber color.
    this.weaponColor = character.saber?.colors?.[0] ?? 0xffffff
    this.weapon = scene.add.rectangle(x, 0, T.attack.reach, 16, this.weaponColor).setVisible(false)

    // Phase 4 art: characters with a puppets.js entry render as a layered
    // puppet that follows this (hidden) physics rectangle. Everyone else
    // keeps the rectangle until their art lands. Combat never branches on
    // this — only visuals do.
    this.puppet = createPuppet(scene, this)
    if (this.puppet) this.rect.setVisible(false)

    this.swingT = -1 // ms since the current swing started; -1 = not swinging
    this.swingLanded = false
    this.cooldown = 0 // ms until the next attack is allowed
    this.fireRoot = 0 // ms a blaster is planted after firing (anti-kite)
    this.hitstun = 0 // ms of stun remaining after being hit
    this.staminaPause = 0 // ms until stamina regen resumes
    this.blocking = false
    this.blockHeldMs = 0 // how long the current block has been held (deflect timing)
    this.prevDefend = false // edge detection for the blaster dodge
    this.dodgeT = -1 // ms into the current dodge; -1 = not dodging
    this.dodgeCooldown = 0
    this.barrierMs = 0 // Force Barrier invulnerability remaining
    this.buffMs = 0 // Rage-style buff time remaining
    this.buffDamageMult = 1
    this.buffTakenMult = 1
    this.critNext = false // Shatterpoint: next landed hit crits
    this.counterActive = false // High Ground stance
    this.counterReflect = 0
    this.specialRun = null // active signature-special state (specials.js)
    this.ko = false
  }

  get body() {
    return this.rect.body
  }

  get onGround() {
    return this.body.blocked.down
  }

  get swinging() {
    return this.swingT >= 0
  }

  get specialReady() {
    return this.special >= T.fighter.maxSpecial
  }

  get dodging() {
    return this.dodgeT >= 0 && this.dodgeT < this.d.dodgeIframesMs
  }

  get invulnerable() {
    return this.barrierMs > 0
  }

  canDeflect() {
    return (
      this.d.archetype === 'saber' && this.blocking && this.blockHeldMs <= this.d.deflectWindowMs
    )
  }

  // A swing can only connect during its active window (after the windup),
  // and only once per swing.
  hitboxActive() {
    if (!this.swinging || this.swingLanded) return false
    return this.swingT >= T.attack.windupMs && this.swingT <= T.attack.windupMs + T.attack.activeMs
  }

  hitbox(reach = T.attack.reach) {
    const cx = this.rect.x + this.facing * (T.fighter.width / 2 + reach / 2)
    return new Phaser.Geom.Rectangle(cx - reach / 2, this.rect.y - 24, reach, 48)
  }

  update(intents, dtMs, opponent) {
    if (this.ko) {
      this.weapon.setVisible(false)
      return
    }

    this.cooldown = Math.max(0, this.cooldown - dtMs)
    this.staminaPause = Math.max(0, this.staminaPause - dtMs)
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dtMs)
    this.barrierMs = Math.max(0, this.barrierMs - dtMs)
    this.fireRoot = Math.max(0, this.fireRoot - dtMs)
    if (this.buffMs > 0) {
      this.buffMs -= dtMs
      if (this.buffMs <= 0) {
        this.buffDamageMult = 1
        this.buffTakenMult = 1
      }
    }

    if (this.staminaPause === 0 && !this.swinging) {
      this.stamina = Math.min(
        T.fighter.maxStamina,
        this.stamina + (T.stamina.regenPerSecond * dtMs) / 1000,
      )
    }

    if (this.hitstun > 0) {
      // Stunned: no control, knockback velocity keeps carrying us.
      this.hitstun -= dtMs
      this.blocking = false
      this.dodgeT = -1
      this.endSwing()
      this.updateVisuals()
      return
    }

    // Signature special in progress: it runs its own show, and most
    // templates lock out normal controls until they finish.
    if (this.specialRun) {
      updateSpecial(this, dtMs)
      if (this.specialRun && specialLocks(this.specialRun)) {
        this.blocking = false
        this.updateVisuals()
        return
      }
    }

    // Mid-dodge: the slide plays out, then a short vulnerable recovery.
    if (this.dodgeT >= 0) {
      this.dodgeT += dtMs
      if (this.dodgeT >= this.d.dodgeIframesMs + T.dodge.recoverMs) this.dodgeT = -1
      this.updateVisuals()
      this.prevDefend = intents.defend
      return
    }

    if (this.swinging) {
      this.swingT += dtMs
      if (this.swingT > T.attack.windupMs + T.attack.activeMs) this.endSwing()
    }

    // Defend, per archetype: sabers and brawlers hold to block/brace;
    // blasters tap it to dodge through attacks.
    const defendPressed = intents.defend && !this.prevDefend
    this.prevDefend = intents.defend

    if (this.d.ranged) {
      this.blocking = false
      if (
        defendPressed &&
        this.onGround &&
        this.dodgeCooldown === 0 &&
        this.stamina >= T.dodge.staminaCost
      ) {
        this.startDodge(intents)
        this.updateVisuals()
        return
      }
    } else {
      this.blocking = intents.defend && this.onGround && !this.swinging
      this.blockHeldMs = this.blocking ? this.blockHeldMs + dtMs : 0
    }

    // Just fired and still on the ground: planted for a beat (anti-kite —
    // a blaster can't fire and full-speed retreat in the same instant).
    const firePlanted = this.fireRoot > 0 && this.onGround

    // Movement is locked while blocking, mid-swing on the ground, or planted
    // after a shot.
    if (!this.blocking && !(this.swinging && this.onGround) && !firePlanted) {
      const dir = intents.left ? -1 : intents.right ? 1 : 0
      if (dir !== 0) {
        // Backpedaling (moving away from the opponent, i.e. opposite the way
        // we're facing) is slower than advancing — this is what stops a
        // blaster from firing and out-running a melee chaser forever.
        const backpedal = dir === -this.facing
        this.body.setVelocityX(dir * this.d.moveSpeed * (backpedal ? T.fighter.backpedalMult : 1))
      } else if (this.onGround) {
        this.body.setVelocityX(0)
      }
      if (intents.jumpPressed && this.onGround) {
        this.body.setVelocityY(-T.fighter.jumpVelocity)
        playSfx('jump')
      }
    } else if (this.blocking || firePlanted) {
      this.body.setVelocityX(0)
    }

    // Special with an uncharged meter falls back to a normal attack
    // (forgiving for younger players mashing buttons).
    const wantsSpecial = intents.specialPressed && this.specialReady && !this.specialRun
    const wantsAttack = intents.attackPressed || (intents.specialPressed && !this.specialReady)

    if (!this.swinging && !this.blocking && this.cooldown === 0) {
      if (wantsSpecial) startSpecial(this)
      else if (wantsAttack && this.stamina >= this.d.staminaCost) {
        if (this.d.ranged) {
          const dist = opponent ? Math.abs(opponent.rect.x - this.rect.x) : 0
          if (dist <= T.bolt.maxRange) this.fireBolt()
          else this.popup('OUT OF RANGE', '#ff8877', 14)
        } else this.startSwing()
      }
    }

    this.updateVisuals()
  }

  startSwing() {
    this.swingT = 0
    this.swingLanded = false
    this.cooldown = T.attack.windupMs + T.attack.activeMs + this.d.attackCooldownMs
    this.stamina -= this.d.staminaCost
    this.staminaPause = T.attack.windupMs + T.attack.activeMs + T.stamina.regenDelayMs
    playSfx(this.d.archetype === 'saber' ? 'saberSwing' : 'brawlerSwing')
  }

  fireBolt() {
    this.cooldown = T.attack.windupMs + T.attack.activeMs + this.d.attackCooldownMs
    this.stamina -= this.d.staminaCost
    this.staminaPause = T.attack.windupMs + T.attack.activeMs + T.stamina.regenDelayMs
    this.fireRoot = T.bolt.fireRootMs
    playSfx('blasterShot')
    const x = this.rect.x + this.facing * (T.fighter.width / 2 + 12)
    const y = this.rect.y - 12
    this.scene.projectiles.spawn({
      owner: this,
      x,
      y,
      vx: this.facing * T.bolt.speed,
      damage: this.d.boltDamage,
      knockback: this.d.knockback * T.bolt.knockbackMult,
      color: this.character.boltColor ?? 0xff5533,
    })
    // Muzzle flash so the shot reads even before the bolt travels.
    const flash = this.scene.add
      .circle(x, y, 7, 0xffdd88)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(21)
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 0.3, duration: 110, onComplete: () => flash.destroy() })
  }

  startDodge(intents) {
    const dir = intents.left ? -1 : intents.right ? 1 : -this.facing
    this.dodgeT = 0
    this.dodgeCooldown = this.d.dodgeCooldownMs
    this.stamina -= T.dodge.staminaCost
    // Dodging AWAY from the opponent (including the default no-direction
    // back-hop) is slowed like ordinary backpedaling (2026-07-14 playtest
    // fix) — otherwise it was a free, unpenalized full-speed escape that
    // undid the anti-kite backpedal rule. The invulnerability frames still
    // apply in full either way, so dodging away from an incoming swing is
    // just as safe — it just no longer also re-opens a huge gap for free.
    // Dodging TOWARD the opponent keeps full speed.
    const backpedal = dir === -this.facing
    this.body.setVelocityX(dir * T.dodge.speed * (backpedal ? T.fighter.backpedalMult : 1))
    playSfx('dodge')
  }

  endSwing() {
    this.swingT = -1
  }

  updateVisuals() {
    // Puppet fighters pose themselves on the scene's post-update (their
    // ground ring shows the same state colors the outline used to), and
    // the weapon flash stays hidden — the animated saber IS the swing.
    if (this.puppet) return

    // Outline = current defensive/special state, at a glance (and a tell
    // when the AI has one): cyan block, white counter stance, green
    // barrier, orange rage, gold special-ready.
    if (this.blocking) this.rect.setStrokeStyle(3, 0x66ffff)
    else if (this.counterActive) this.rect.setStrokeStyle(3, 0xffffff)
    else if (this.invulnerable) this.rect.setStrokeStyle(3, 0x7fe08f)
    else if (this.buffMs > 0) this.rect.setStrokeStyle(3, 0xff8844)
    else if (this.specialReady) this.rect.setStrokeStyle(3, 0xffe81f)
    else this.rect.setStrokeStyle(0)

    this.rect.setAlpha(this.dodging ? 0.45 : 1)

    // The weapon flash is the real hitbox: faint during windup, solid while
    // it can connect. Tinted with the character's saber color.
    this.weapon.setVisible(this.swinging)
    if (this.swinging) {
      const hb = this.hitbox()
      const inActiveWindow = this.swingT >= T.attack.windupMs
      this.weapon.setPosition(hb.centerX, hb.centerY)
      this.weapon.setDisplaySize(hb.width, hb.height * 0.4)
      this.weapon.setFillStyle(this.weaponColor, inActiveWindow ? 1 : 0.3)
    }
  }

  // Every source of damage — melee swings, bolts, special templates —
  // lands through here, so dodge i-frames, barrier, counter stance,
  // blocking, armor, buffs, crits, and the ±variance all apply everywhere.
  // charges=false for hits dealt BY a special — landing your special
  // shouldn't refill the meter that paid for it.
  applyHit({ attacker, damage, knockback = 0, hitstunMs = T.attack.hitstunMs, unblockable = false, melee = false, ranged = false, charges = true }) {
    if (this.ko) return { missed: true }

    // Barrier beats everything; dodge i-frames beat everything dodgeable.
    if (this.invulnerable || (this.dodging && !unblockable)) {
      this.popup(this.invulnerable ? 'BARRIER' : 'DODGE', '#7ff0ff', 15)
      return { missed: true }
    }

    // High Ground: a melee hit into the stance is negated and thrown back.
    if (this.counterActive && melee && !unblockable && attacker) {
      const reflect = this.counterReflect
      cancelSpecial(this)
      this.popup('COUNTER!', '#ffffff', 18)
      playSfx('saberClash')
      attacker.applyHit({ attacker: this, damage: reflect, knockback: 380, hitstunMs: 350, charges: false })
      return { missed: true }
    }

    let dmg = damage
    dmg *= 1 + (Math.random() * 2 - 1) * T.variance // upsets happen
    if (attacker) dmg *= attacker.buffDamageMult
    dmg *= this.buffTakenMult

    // Shatterpoint: the buffed hit crits and ignores block and armor.
    let crit = false
    if (attacker?.critNext) {
      crit = true
      attacker.critNext = false
      dmg *= T.templates.buff.critMult
    }

    let blocked = false
    if (this.blocking && !unblockable && !crit) {
      blocked = true
      dmg *= this.d.blockMult
    }
    if (!crit) dmg -= this.d.armor // Mandalorian beskar: flat reduction
    dmg = Math.max(1, Math.round(dmg))

    const dir = attacker ? Math.sign(this.rect.x - attacker.rect.x) || attacker.facing : -this.facing

    if (blocked) {
      this.hitstun = T.defend.blockedHitstunMs
      this.body.setVelocityX(dir * knockback * 0.4)
      if (charges) attacker?.gainMeter(T.attack.meterGainOnBlocked)
      playSfx('blockedHit')
    } else {
      if (this.specialRun) cancelSpecial(this) // a clean hit interrupts a special
      this.hitstun = hitstunMs
      this.body.setVelocityX(dir * knockback)
      if (melee) this.body.setVelocityY(-140)
      if (charges) attacker?.gainMeter(T.attack.meterGainOnHit * attacker.d.meterGainMult)
      playSfx('hitImpact')
    }

    this.hp = Math.max(0, this.hp - dmg)
    this.flash()

    this.popup(
      crit ? `${dmg}!!` : `${dmg}`,
      crit ? '#ffd700' : blocked ? '#8ab4ff' : '#ffffff',
      crit ? 26 : 20,
    )
    shakeCamera(this.scene, crit ? 160 : 60, crit ? 0.009 : 0.004)

    if (this.hp === 0) this.knockOut(dir)
    return { damage: dmg, blocked, missed: false }
  }

  gainMeter(amount) {
    this.special = Math.min(T.fighter.maxSpecial, this.special + amount)
  }

  popup(text, color, size = 20) {
    const t = this.scene.add
      .text(this.rect.x, this.rect.y - 60, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
      })
      .setOrigin(0.5)
      .setDepth(45)
    this.scene.tweens.add({
      targets: t,
      y: t.y - 34,
      alpha: 0,
      duration: 650,
      onComplete: () => t.destroy(),
    })
  }

  flash() {
    if (this.puppet) return this.puppet.flash()
    this.rect.setFillStyle(0xffffff)
    this.scene.time.delayedCall(80, () => {
      if (!this.ko) this.rect.setFillStyle(this.baseColor)
    })
  }

  knockOut(dir) {
    this.ko = true
    playSfx('ko')
    if (this.specialRun) cancelSpecial(this)
    this.endSwing()
    this.weapon.setVisible(false)
    this.blocking = false
    if (this.puppet) this.puppet.setKo()
    else {
      this.rect.setFillStyle(0x555566)
      this.rect.setAlpha(1)
    }
    this.body.setVelocity(dir * 180, -220)
    this.scene.tweens.add({
      targets: this.rect,
      angle: dir * 90,
      duration: 400,
      ease: 'Quad.easeOut',
    })
  }
}
