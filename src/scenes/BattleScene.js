import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { Fighter } from '../combat/fighter.js'
import { SparAI } from '../combat/ai.js'
import { KeyboardControls } from '../input/controls.js'
import { TouchControls } from '../input/touch.js'
import { Hud } from '../ui/hud.js'

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle')
  }

  create() {
    // Floor of the physics world = the arena ground line.
    this.physics.world.setBounds(0, -160, T.arena.width, T.arena.groundY + 160)

    this.add.rectangle(T.arena.width / 2, T.arena.height / 2, T.arena.width, T.arena.height, 0x0a0a14)
    for (let i = 0; i < 60; i++) {
      this.add.circle(
        Math.random() * T.arena.width,
        Math.random() * (T.arena.groundY - 40),
        Math.random() * 1.5 + 0.5,
        0xffffff,
        0.25 + Math.random() * 0.5,
      )
    }
    this.add.rectangle(
      T.arena.width / 2,
      (T.arena.groundY + T.arena.height) / 2,
      T.arena.width,
      T.arena.height - T.arena.groundY,
      0x1c1c2e,
    )

    this.player = new Fighter(this, { x: 300, color: 0x4da6ff, name: 'PLAYER', facing: 1 })
    this.enemy = new Fighter(this, { x: 660, color: 0xff5555, name: 'OPPONENT', facing: -1 })
    this.physics.add.collider(this.player.rect, this.enemy.rect)

    this.keyboard = new KeyboardControls(this)
    this.touch = this.sys.game.device.input.touch ? new TouchControls(this) : null
    this.ai = new SparAI()

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

  pauseGame() {
    if (this.roundOver) return
    this.scene.launch('Pause')
    this.scene.pause()
  }

  update(_time, delta) {
    if (this.roundOver) return

    // Fighters always face each other.
    this.player.facing = this.enemy.rect.x >= this.player.rect.x ? 1 : -1
    this.enemy.facing = this.player.rect.x >= this.enemy.rect.x ? 1 : -1

    let intents = this.keyboard.read()
    if (this.touch) intents = this.mergeIntents(intents, this.touch.read())

    this.player.update(intents, delta)
    this.enemy.update(this.ai.read(delta, this.enemy, this.player), delta)

    this.resolveHits(this.player, this.enemy)
    this.resolveHits(this.enemy, this.player)

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

  resolveHits(attacker, defender) {
    if (!attacker.hitboxActive() || defender.ko) return
    if (!Phaser.Geom.Rectangle.Overlaps(attacker.hitbox(), defender.rect.getBounds())) return

    attacker.swingLanded = true
    const result = defender.takeHit(attacker, attacker.swingIsSpecial)

    this.cameras.main.shake(
      attacker.swingIsSpecial ? 180 : 60,
      attacker.swingIsSpecial ? 0.01 : 0.004,
    )

    const popup = this.add
      .text(defender.rect.x, defender.rect.y - 60, `${result.damage}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: result.blocked ? '#8ab4ff' : '#ffffff',
      })
      .setOrigin(0.5)
    this.tweens.add({
      targets: popup,
      y: popup.y - 34,
      alpha: 0,
      duration: 600,
      onComplete: () => popup.destroy(),
    })
  }

  timeoutWinner() {
    if (this.player.hp === this.enemy.hp) return null
    return this.player.hp > this.enemy.hp ? this.player : this.enemy
  }

  endRound(winner, headline) {
    if (this.roundOver) return
    this.roundOver = true
    this.cameras.main.shake(200, 0.006)

    const cx = T.arena.width / 2
    const cy = T.arena.height / 2
    this.add
      .text(cx, cy - 40, headline, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffe81f',
      })
      .setOrigin(0.5)
      .setDepth(60)
    this.add
      .text(cx, cy + 14, winner ? `${winner.name} WINS` : 'DRAW', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(60)

    this.time.delayedCall(900, () => {
      this.add
        .text(cx, cy + 62, 'tap or press ENTER for rematch', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#8a8ab0',
        })
        .setOrigin(0.5)
        .setDepth(60)
      const rematch = () => this.scene.restart()
      this.input.once('pointerdown', rematch)
      this.input.keyboard.once('keydown-ENTER', rematch)
    })
  }
}
