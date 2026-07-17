import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { CHARACTERS } from '../data/characters.js'
import { applyCrispCamera } from '../util/display.js'
import { loadTournament, saveTournament, clearTournament } from '../tournament/state.js'
import {
  playerOpponentId,
  recordPlayerResult,
  isOver,
  isChampion,
  championId,
  roundName,
  competitorId,
} from '../tournament/bracket.js'
import { playMusic, playSfx } from '../audio/audio.js'

const GOLD = '#ffe81f'
const byId = (id) => CHARACTERS.find((c) => c.id === id)

// Tournament hub/controller. Always reloads from localStorage on create()
// (a fresh tournament from Difficulty and a Resume from Mode take the same
// path); if arriving back from a match it applies the result first. All
// bracket math lives in src/tournament/bracket.js — this scene only
// renders and transitions scenes.
export class BracketScene extends Phaser.Scene {
  constructor() {
    super('Bracket')
  }

  init(data) {
    this.pendingResult = data?.result ?? null
  }

  create() {
    applyCrispCamera(this)
    const W = T.arena.width
    const H = T.arena.height

    // This scene key gets reused many times across one tournament (every
    // round bounces back here). A `.once('keydown-ENTER', ...)` bound to
    // the PLAY button below never fires — and never self-removes — if the
    // player taps/clicks it instead of pressing Enter, so it dangles and
    // can misfire on a LATER, unrelated Enter press in a future visit to
    // this scene. Clear the slate on every create() so nothing from a
    // prior round can leak forward.
    this.input.keyboard.removeAllListeners()
    playMusic('menu')
    this.input.on('pointerdown', () => playSfx('uiClick'))

    this.drawBackground(W, H)

    let state = loadTournament()
    if (!state) {
      // No saved tournament (direct nav, cleared storage) — bounce home.
      this.scene.start('Mode')
      return
    }

    if (this.pendingResult) {
      state = recordPlayerResult(state, this.pendingResult === 'win')
      saveTournament(state)
    }

    // Exposed for the automated verify script (same convention as
    // Select/Difficulty's `cards`/`arenaChips`).
    this.state = state

    this.renderBracketGrid(state)

    if (isOver(state)) {
      this.renderResultsScreen(state)
      clearTournament()
    } else {
      this.renderStandings(state)
      this.renderPlayButton(state)
    }

    this.add.text(16, H - 20, `build ${__BUILD_TIME__}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#555577',
    })
  }

  drawBackground(W, H) {
    const sky = this.add.graphics()
    sky.fillGradientStyle(0x03030a, 0x03030a, 0x191a33, 0x141428, 1)
    sky.fillRect(0, 0, W, H)
    for (let i = 0; i < 90; i++) {
      const star = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        Math.random() * 1.4 + 0.4,
        0xffffff,
        0.2 + Math.random() * 0.6,
      )
      if (i % 14 === 0) {
        this.tweens.add({
          targets: star,
          alpha: 0.1,
          duration: 900 + Math.random() * 1400,
          yoyo: true,
          repeat: -1,
        })
      }
    }
  }

  // ---- Bracket grid: 4 columns (Ro16 -> QF -> SF -> Final) --------------

  renderBracketGrid(state) {
    const gridTop = 108
    const gridBottom = 476
    const colX = [150, 380, 610, 830]
    const tileW = 138
    const tileH = 34

    const headers = ['ROUND OF 16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL']
    headers.forEach((label, i) => {
      this.add
        .text(colX[i], 82, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#8a8ab0',
        })
        .setOrigin(0.5)
    })

    // Round 0 evenly spaced; later rounds sit at the midpoint of their two
    // feeder matches, which naturally draws the classic funnel shape.
    const rowH = (gridBottom - gridTop) / 8
    const roundY = [[], [], [], []]
    for (let i = 0; i < 8; i++) roundY[0].push(gridTop + rowH * (i + 0.5))
    for (let i = 0; i < 4; i++) roundY[1].push((roundY[0][2 * i] + roundY[0][2 * i + 1]) / 2)
    for (let i = 0; i < 2; i++) roundY[2].push((roundY[1][2 * i] + roundY[1][2 * i + 1]) / 2)
    roundY[3].push((roundY[2][0] + roundY[2][1]) / 2)

    // Simple diagonal connectors into the next round's slot — cosmetic only.
    const lines = this.add.graphics()
    lines.lineStyle(1, 0xffffff, 0.15)
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < roundY[r].length; i++) {
        const nextI = Math.floor(i / 2)
        lines.lineBetween(colX[r] + tileW / 2, roundY[r][i], colX[r + 1] - tileW / 2, roundY[r + 1][nextI])
      }
    }

    for (let r = 0; r < 4; r++) {
      state.rounds[r].forEach((match, i) => {
        this.drawMatchTile(colX[r], roundY[r][i], tileW, tileH, match, state)
      })
    }
  }

  drawMatchTile(x, y, w, h, match, state) {
    const isPlayerMatch = match.aSeed === state.playerSlot || match.bSeed === state.playerSlot
    this.add
      .rectangle(x, y, w, h, 0x0c1424, 0.85)
      .setStrokeStyle(isPlayerMatch ? 2 : 1, isPlayerMatch ? 0xffe81f : 0xffffff, isPlayerMatch ? 1 : 0.2)

    const nameFor = (seed) => {
      if (seed === null || seed === undefined) return 'TBD'
      const c = byId(competitorId(state, seed))
      return c ? c.name : '?'
    }
    const colorFor = (seed) => {
      if (!match.played) return '#ffffff'
      if (seed === match.winnerSeed) return seed === state.playerSlot ? GOLD : '#ffffff'
      return '#555577'
    }

    this.add
      .text(x, y - 9, nameFor(match.aSeed), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: match.played && match.aSeed === match.winnerSeed ? 'bold' : 'normal',
        color: colorFor(match.aSeed),
      })
      .setOrigin(0.5)
    this.add
      .text(x, y + 9, nameFor(match.bSeed), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: match.played && match.bSeed === match.winnerSeed ? 'bold' : 'normal',
        color: colorFor(match.bSeed),
      })
      .setOrigin(0.5)
  }

  // ---- In-progress: standings + play button ------------------------------

  renderStandings(state) {
    const W = T.arena.width
    const player = byId(state.playerId)
    const oppId = playerOpponentId(state)
    const opp = oppId ? byId(oppId) : null

    this.add
      .text(W / 2, 34, 'TOURNAMENT', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    const record = `${state.currentRound}-0`
    const line = opp
      ? `${roundName(state.currentRound)} · ${player?.name} (${record}) · Next: ${opp.name}`
      : `${roundName(state.currentRound)} · ${player?.name} (${record})`
    this.add
      .text(W / 2, 60, line, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
  }

  renderPlayButton(state) {
    const W = T.arena.width
    const H = T.arena.height
    const y = H - 44

    this.playButtonPos = { x: W / 2, y } // also used by the automated verify script

    const box = this.add
      .rectangle(W / 2, y, 260, 40, 0xffffff, 0.08)
      .setStrokeStyle(2, GOLD, 0.8)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(W / 2, y, 'PLAY NEXT MATCH', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const launch = () => {
      this.scene.start('Battle', {
        mode: 'tournament',
        p1: state.playerId,
        p2: playerOpponentId(state),
        difficulty: state.difficulty,
        arena: 'random',
      })
    }
    box.on('pointerover', () => label.setColor(GOLD))
    box.on('pointerout', () => label.setColor('#ffffff'))
    box.on('pointerdown', launch)
    this.input.keyboard.once('keydown-ENTER', launch)
  }

  // ---- Results: champion or eliminated ------------------------------------

  renderResultsScreen(state) {
    const W = T.arena.width
    const H = T.arena.height
    const cx = W / 2
    const cy = H / 2

    this.add.rectangle(cx, cy, W, H, 0x000000, 0.55).setDepth(58)
    this.add.rectangle(cx, cy + 20, 460, 260, 0x0c1424, 0.92).setStrokeStyle(2, GOLD, 0.6).setDepth(59)

    const champ = byId(championId(state))
    const playerWonAll = isChampion(state)

    this.add
      .text(cx, cy - 66, playerWonAll ? 'CHAMPION!' : 'ELIMINATED', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(60)

    const sub = playerWonAll
      ? `${champ?.name?.toUpperCase() ?? '?'} WINS THE TOURNAMENT`
      : `You went out in ${roundName(state.eliminatedRound)}.\nChampion: ${champ?.name ?? '?'}`
    this.add
      .text(cx, cy - 14, sub, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(60)

    this.resultButtons = [] // {id, x, y} — also used by the automated verify script
    this.makeResultOption('new', cx, cy + 50, 'NEW TOURNAMENT', () => this.scene.start('Select', { mode: 'tournament' }))
    this.makeResultOption('menu', cx, cy + 90, 'BACK TO MENU', () => this.scene.start('Mode'))
  }

  makeResultOption(id, x, y, label, onSelect) {
    this.resultButtons.push({ id, x, y })
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor(GOLD))
    text.on('pointerout', () => text.setColor('#ffffff'))
    text.on('pointerdown', onSelect)
  }
}
