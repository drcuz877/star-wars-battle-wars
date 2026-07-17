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
import { applyCrispCamera, shakeCamera } from '../util/display.js'
import { playMusic, stopMusic, playSfx } from '../audio/audio.js'

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
    // 'random' re-rolls every match, including rematches; a picked arena
    // sticks for rematches until a new one is chosen.
    if (data?.arena) this.arenaId = data.arena
    this.arenaId = this.arenaId ?? 'random'
    // 'single' = normal Rematch/Change Character end menu. 'tournament' =
    // a single Continue that reports win/loss back to BracketScene, which
    // owns all advance/champion/eliminate logic.
    this.mode = data?.mode ?? this.mode ?? 'single'
  }

  create() {
    applyCrispCamera(this)
    playMusic('battle')
    // endRound() below registers `.once('keydown-ENTER'/'keydown-C', ...)`
    // end-of-match handlers that only self-remove once fired — if the
    // player clicks an end-of-match option instead of using the key, the
    // other one dangles and can misfire on a later, unrelated keypress
    // after Battle restarts/reruns (same key, same scene instance reused
    // across rematches). Clear the slate on every create().
    this.input.keyboard.removeAllListeners()

    // Floor of the physics world = the arena ground line.
    this.physics.world.setBounds(0, -160, T.arena.width, T.arena.groundY + 160)

    // Backdrop: the chosen arena, or a random one (Phase 4). Purely
    // cosmetic — the ground line and bounds are identical for all.
    this.arena = createArena(this, this.arenaId === 'random' ? undefined : this.arenaId)

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
    pauseButton.on('pointerdown', () => {
      playSfx('uiClick')
      this.pauseGame()
    })
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
    shakeCamera(this, 200, 0.006)
    stopMusic()
    if (winner) playSfx('victory')

    const cx = T.arena.width / 2
    const cy = T.arena.height / 2
    // Panel behind the verdict so it reads on bright arenas (Tatooine's
    // dusk sky washed out bare text), in the menus' shared language.
    this.add
      .rectangle(cx, cy + 34, 440, 300, 0x0c1424, 0.82)
      .setStrokeStyle(2, 0xffe81f, 0.5)
      .setDepth(59)
    this.add
      .text(cx, cy - 60, headline, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffe81f',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
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
      if (this.mode === 'tournament') {
        // No branching menu here — Bracket owns advance/champion/eliminate.
        // A draw (winner === null) counts as not-a-win, same as a loss.
        const playerWon = winner === this.player
        const goToBracket = () => this.scene.start('Bracket', { result: playerWon ? 'win' : 'loss' })
        this.makeEndOption(cx, cy + 60, playerWon ? 'CONTINUE' : 'SEE RESULTS', goToBracket)
        this.add
          .text(cx, cy + 100, 'ENTER to continue', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#8a8ab0',
          })
          .setOrigin(0.5)
          .setDepth(60)
        this.input.keyboard.once('keydown-ENTER', goToBracket)
        return
      }

      this.makeEndOption(cx, cy + 50, 'REMATCH', () =>
        this.scene.restart({ p1: this.p1Char.id, p2: this.p2Char.id, difficulty: this.difficultyId }),
      )
      this.makeEndOption(cx, cy + 90, 'CHANGE CHARACTER', () => this.scene.start('Select'))
      // A single-match win/loss had no way back to the main menu (and so no
      // way to switch into Tournament mode) — tournament matches already
      // route through Bracket -> Mode; this closes the same gap for singles.
      this.makeEndOption(cx, cy + 130, 'MAIN MENU', () => this.scene.start('Mode'))
      this.add
        .text(cx, cy + 166, 'ENTER rematch · C change character · M main menu', {
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
      this.input.keyboard.once('keydown-M', () => this.scene.start('Mode'))
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
    text.on('pointerdown', () => {
      playSfx('uiClick')
      onSelect()
    })
  }
}
