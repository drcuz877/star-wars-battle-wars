import Phaser from 'phaser'
import { TUNING as T } from './tuning.js'

// One fighter: a physics rectangle plus combat state (HP, stamina, special
// meter, swing/hitstun timers). The player and the AI both drive a Fighter
// through the same "intents" object, so nothing in here knows or cares who
// is controlling it:
//   { left, right, defend, jumpPressed, attackPressed, specialPressed }
export class Fighter {
  constructor(scene, { x, color, name, facing }) {
    this.scene = scene
    this.name = name
    this.facing = facing // 1 = facing right, -1 = facing left
    this.baseColor = color

    this.hp = T.fighter.maxHp
    this.stamina = T.fighter.maxStamina
    this.special = 0

    this.rect = scene.add.rectangle(
      x,
      T.arena.groundY - T.fighter.height / 2,
      T.fighter.width,
      T.fighter.height,
      color,
    )
    scene.physics.add.existing(this.rect)
    this.body.setCollideWorldBounds(true)
    this.body.setGravityY(T.fighter.gravity)
    this.body.setDragX(900)

    this.weapon = scene.add.rectangle(x, 0, T.attack.reach, 16, 0xffffff).setVisible(false)

    this.swingT = -1 // ms since the current swing started; -1 = not swinging
    this.swingIsSpecial = false
    this.swingLanded = false
    this.cooldown = 0 // ms until the next swing is allowed
    this.hitstun = 0 // ms of stun remaining after being hit
    this.staminaPause = 0 // ms until stamina regen resumes
    this.blocking = false
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

  swingSpec() {
    return this.swingIsSpecial ? T.special : T.attack
  }

  // A swing can only connect during its active window (after the windup),
  // and only once per swing.
  hitboxActive() {
    if (!this.swinging || this.swingLanded) return false
    const spec = this.swingSpec()
    return this.swingT >= spec.windupMs && this.swingT <= spec.windupMs + spec.activeMs
  }

  hitbox() {
    const spec = this.swingSpec()
    const w = spec.reach
    const cx = this.rect.x + this.facing * (T.fighter.width / 2 + w / 2)
    return new Phaser.Geom.Rectangle(cx - w / 2, this.rect.y - 24, w, 48)
  }

  update(intents, dtMs) {
    if (this.ko) {
      this.weapon.setVisible(false)
      return
    }

    this.cooldown = Math.max(0, this.cooldown - dtMs)
    this.staminaPause = Math.max(0, this.staminaPause - dtMs)

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
      this.endSwing()
      this.updateVisuals()
      return
    }

    if (this.swinging) {
      this.swingT += dtMs
      const spec = this.swingSpec()
      if (this.swingT > spec.windupMs + spec.activeMs) this.endSwing()
    }

    this.blocking = intents.defend && this.onGround && !this.swinging

    // Movement is locked while blocking or mid-swing on the ground.
    if (!this.blocking && !(this.swinging && this.onGround)) {
      if (intents.left) this.body.setVelocityX(-T.fighter.moveSpeed)
      else if (intents.right) this.body.setVelocityX(T.fighter.moveSpeed)
      else if (this.onGround) this.body.setVelocityX(0)
      if (intents.jumpPressed && this.onGround) this.body.setVelocityY(-T.fighter.jumpVelocity)
    } else if (this.blocking) {
      this.body.setVelocityX(0)
    }

    // S+A with an uncharged meter falls back to a normal swing (forgiving
    // for younger players mashing buttons).
    const wantsSpecial = intents.specialPressed && this.specialReady
    const wantsAttack = intents.attackPressed || (intents.specialPressed && !this.specialReady)

    if (!this.swinging && !this.blocking && this.cooldown === 0) {
      if (wantsSpecial) this.startSwing(true)
      else if (wantsAttack && this.stamina >= T.attack.staminaCost) this.startSwing(false)
    }

    this.updateVisuals()
  }

  startSwing(isSpecial) {
    const spec = isSpecial ? T.special : T.attack
    this.swingT = 0
    this.swingIsSpecial = isSpecial
    this.swingLanded = false
    this.cooldown = spec.windupMs + spec.activeMs + spec.cooldownMs
    if (isSpecial) {
      this.special = 0
      // Placeholder special spectacle: gold screen flash + expanding
      // shockwave ring. Character signature specials replace this in Phase 2.
      this.scene.cameras.main.flash(130, 255, 225, 80)
      const ring = this.scene.add
        .circle(this.rect.x, this.rect.y, 24)
        .setStrokeStyle(5, 0xffd700)
        .setDepth(40)
      this.scene.tweens.add({
        targets: ring,
        scale: 4.5,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      })
    } else {
      this.stamina -= T.attack.staminaCost
      this.staminaPause = spec.windupMs + spec.activeMs + T.stamina.regenDelayMs
    }
  }

  endSwing() {
    this.swingT = -1
  }

  updateVisuals() {
    // Cyan outline while blocking; gold outline when a special is charged —
    // the at-a-glance "use it now" cue (and a tell when the AI has one).
    if (this.blocking) this.rect.setStrokeStyle(3, 0x66ffff)
    else if (this.specialReady) this.rect.setStrokeStyle(3, 0xffe81f)
    else this.rect.setStrokeStyle(0)

    // The weapon flash is the real hitbox: faint during windup, solid while
    // it can connect. Specials are gold and bigger.
    this.weapon.setVisible(this.swinging)
    if (this.swinging) {
      const spec = this.swingSpec()
      const hb = this.hitbox()
      const inActiveWindow = this.swingT >= spec.windupMs
      this.weapon.setPosition(hb.centerX, hb.centerY)
      this.weapon.setDisplaySize(hb.width, this.swingIsSpecial ? hb.height : hb.height * 0.4)
      this.weapon.setFillStyle(this.swingIsSpecial ? 0xffd700 : 0xffffff, inActiveWindow ? 1 : 0.3)
    }
  }

  takeHit(attacker, isSpecial) {
    const spec = isSpecial ? T.special : T.attack
    const dir = Math.sign(this.rect.x - attacker.rect.x) || attacker.facing
    const blocked = this.blocking
    let damage = spec.damage

    if (blocked) {
      damage = Math.max(1, Math.round(damage * T.defend.damageMultiplier))
      this.hitstun = T.defend.blockedHitstunMs
      this.body.setVelocityX(dir * spec.knockback * 0.4)
      attacker.gainMeter(T.attack.meterGainOnBlocked)
    } else {
      this.hitstun = spec.hitstunMs
      this.body.setVelocityX(dir * spec.knockback)
      this.body.setVelocityY(-140)
      attacker.gainMeter(T.attack.meterGainOnHit)
    }

    this.hp = Math.max(0, this.hp - damage)
    this.flash()
    if (this.hp === 0) this.knockOut(dir)
    return { damage, blocked }
  }

  gainMeter(amount) {
    this.special = Math.min(T.fighter.maxSpecial, this.special + amount)
  }

  flash() {
    this.rect.setFillStyle(0xffffff)
    this.scene.time.delayedCall(80, () => {
      if (!this.ko) this.rect.setFillStyle(this.baseColor)
    })
  }

  knockOut(dir) {
    this.ko = true
    this.endSwing()
    this.weapon.setVisible(false)
    this.blocking = false
    this.rect.setFillStyle(0x555566)
    this.body.setVelocity(dir * 180, -220)
    this.scene.tweens.add({
      targets: this.rect,
      angle: dir * 90,
      duration: 400,
      ease: 'Quad.easeOut',
    })
  }
}
