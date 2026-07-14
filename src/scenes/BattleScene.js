import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { CHARACTERS, overall } from '../data/characters.js'
import { Fighter } from '../combat/fighter.js'
import { Projectiles } from '../combat/projectiles.js'
import { TierAI } from '../combat/ai.js'
import { tierById, DEFAULT_TIER_ID } from '../data/ai-tiers.js'
import { KeyboardControls } from '../input/controls.js'
import { TouchControls } from '../input/touch.js'
import { Hud } from '../ui/hud.js'
import { createArena } from './arenas/index.js'

const byId = (id) => CHARACTERS.find((c) => c.id === id)

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle')
  }

  // Characters arrive from the select screen; a restart (rematch / pause
  // menu) passes no data and keeps the previous matchup. Fallback only
  // matters when jumping straight into Battle (e.g. during development).
  init(data) {
    if (data?.p1) this.p1Char = byId(data.p1) ?? this.p1Char
    if (data?.p2) this.p2Char = byId(data.p2) ?? this.p2Char
    this.p1Char = this.p1Char ?? byId('luke')
    this.p2Char = this.p2Char ?? byId('vader')
    if (data?.difficulty) this.difficultyId = data.difficulty
    this.difficultyId = this.difficultyId ?? DEFAULT_TIER_ID
  }

  create() {
    // Floor of the physics world = the arena ground line.
    this.physics.world.setBounds(0, -160, T.arena.width, T.arena.groundY + 160)

    // Backdrop: one of the arenas, picked at random each match (Phase 4).
    // Purely cosmetic — the ground line and bounds are identical for all.
    this.arena = createArena(this)

    this.projectiles = new Projectiles(this)

    // Legendary duel: two top-tier fighters both get extra HP so the
    // marquee matches last longer (see tuning.epicDuel).
    const epic =
      overall(this.p1Char) >= T.epicDuel.minOvr && overall(this.p2Char) >= T.epicDuel.minOvr
    const hpMult = epic ? T.epicDuel.hpMult : 1

    this.player = new Fighter(this, { x: 300, character: this.p1Char, facing: 1, hpMult })
    this.enemy = new Fighter(this, { x: 660, character: this.p2Char, facing: -1, hpMult })
    this.physics.add.collider(this.player.rect, this.enemy.rect)

    if (epic) {
      const banner = this.add
        .text(T.arena.width / 2, 200, '⚔  LEGENDARY DUEL  ⚔', {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '30px',
          fontStyle: 'bold',
          color: '#ffe81f',
          stroke: '#000000',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(55)
      this.tweens.add({ targets: banner, alpha: 0, delay: 1600, duration: 700, onComplete: () => banner.destroy() })
    }

    this.keyboard = new KeyboardControls(this)
    this.touch = this.sys.game.device.input.touch ? new TouchControls(this) : null
    const tier = tierById(this.difficultyId)
    this.ai = new TierAI(tier)

    this.huds = [new Hud(this, this.player, 'left'), new Hud(this, this.enemy, 'right')]

    this.timeLeft = T.round.timeSeconds
    this.timerText = this.add
      .text(T.arena.width / 2, 34, `${T.round.timeSeconds}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffe81f',
      })
      .setOrigin(0.5)

    // Pause: ❚❚ button (tap or click) or ESC / P on keyboard.
    const pauseButton = this.add
      .circle(T.arena.width / 2 + 70, 34, 20, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setDepth(50)
      .setInteractive()
    this.add
      .text(T.arena.width / 2 + 70, 34, '❚❚', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setAlpha(0.75)
    pauseButton.on('pointerdown', () => this.pauseGame())
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame())
    this.input.keyboard.on('keydown-P', () => this.pauseGame())

    // Build stamp so any device can confirm it's running the latest deploy.
    this.add.text(24, 92, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
    this.add.text(24, 106, `AI: ${tier.label}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#8a8ab0',
    })

    if (!this.touch) {
      const hint = this.add
        .text(
          T.arena.width / 2,
          T.arena.height - 22,
          '← → move    SPACE jump    A attack    D defend (hold)    W (or S+A) special',
          { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#8a8ab0' },
        )
        .setOrigin(0.5)
      this.tweens.add({ targets: hint, alpha: 0, delay: 7000, duration: 1000 })
    }

    this.roundOver = false
  }

  opponentOf(fighter) {
    return fighter === this.player ? this.enemy : this.player
  }

  pauseGame() {
    if (this.roundOver) return
    this.scene.launch('Pause')
    this.scene.pause()
  }

  update(_time, delta) {
    // Ambient arena motion (embers, dust) runs even after the round ends.
    this.arena.update?.(delta)

    if (this.roundOver) return

    // Fighters always face each other.
    this.player.facing = this.enemy.rect.x >= this.player.rect.x ? 1 : -1
    this.enemy.facing = this.player.rect.x >= this.enemy.rect.x ? 1 : -1

    let intents = this.keyboard.read()
    if (this.touch) intents = this.mergeIntents(intents, this.touch.read())

    this.player.update(intents, delta, this.enemy)
    this.enemy.update(this.ai.read(delta, this.enemy, this.player), delta, this.player)

    this.resolveHits(this.player, this.enemy)
    this.resolveHits(this.enemy, this.player)
    this.projectiles.update(delta, [this.player, this.enemy])

    this.huds.forEach((hud) => hud.update())
    if (this.touch) this.touch.setSpecialReady(this.player.specialReady)

    this.timeLeft -= delta / 1000
    this.timerText.setText(`${Math.max(0, Math.ceil(this.timeLeft))}`)

    if (this.player.ko && this.enemy.ko) this.endRound(null, 'DOUBLE KO!')
    else if (this.enemy.ko) this.endRound(this.player, 'KO!')
    else if (this.player.ko) this.endRound(this.enemy, 'KO!')
    else if (this.timeLeft <= 0) this.endRound(this.timeoutWinner(), 'TIME!')
  }

  mergeIntents(a, b) {
    return {
      left: a.left || b.left,
      right: a.right || b.right,
      defend: a.defend || b.defend,
      jumpPressed: a.jumpPressed || b.jumpPressed,
      attackPressed: a.attackPressed || b.attackPressed,
      specialPressed: a.specialPressed || b.specialPressed,
    }
  }

  // Normal melee swings. Bolts resolve in Projectiles, specials in
  // specials.js — every path lands through Fighter.applyHit.
  resolveHits(attacker, defender) {
    if (!attacker.hitboxActive() || defender.ko) return
    if (!Phaser.Geom.Rectangle.Overlaps(attacker.hitbox(), defender.rect.getBounds())) return

    attacker.swingLanded = true
    defender.applyHit({
      attacker,
      damage: attacker.d.damage,
      knockback: attacker.d.knockback,
      hitstunMs: T.attack.hitstunMs,
      melee: true,
    })
  }

  // Health bars differ in size now, so timeout compares remaining percent.
  timeoutWinner() {
    const pPct = this.player.hp / this.player.d.maxHp
    const ePct = this.enemy.hp / this.enemy.d.maxHp
    if (pPct === ePct) return null
    return pPct > ePct ? this.player : this.enemy
  }

  endRound(winner, headline) {
    if (this.roundOver) return
    this.roundOver = true
    this.cameras.main.shake(200, 0.006)

    const cx = T.arena.width / 2
    const cy = T.arena.height / 2
    this.add
      .text(cx, cy - 60, headline, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffe81f',
      })
      .setOrigin(0.5)
      .setDepth(60)
    this.add
      .text(cx, cy - 6, winner ? `${winner.name.toUpperCase()} WINS` : 'DRAW', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(60)

    this.time.delayedCall(900, () => {
      this.makeEndOption(cx, cy + 52, 'REMATCH', () =>
        this.scene.restart({ p1: this.p1Char.id, p2: this.p2Char.id, difficulty: this.difficultyId }),
      )
      this.makeEndOption(cx, cy + 96, 'CHANGE CHARACTER', () => this.scene.start('Select'))
      this.add
        .text(cx, cy + 134, 'ENTER rematch · C change character', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          color: '#8a8ab0',
        })
        .setOrigin(0.5)
        .setDepth(60)
      this.input.keyboard.once('keydown-ENTER', () =>
        this.scene.restart({ p1: this.p1Char.id, p2: this.p2Char.id, difficulty: this.difficultyId }),
      )
      this.input.keyboard.once('keydown-C', () => this.scene.start('Select'))
    })
  }

  makeEndOption(x, y, label, onSelect) {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor('#ffe81f'))
    text.on('pointerout', () => text.setColor('#ffffff'))
    text.on('pointerdown', onSelect)
  }
}
