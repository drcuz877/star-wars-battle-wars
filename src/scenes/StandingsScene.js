import Phaser from 'phaser'
import { TUNING as T } from '../combat/tuning.js'
import { CHARACTERS } from '../data/characters.js'
import { applyCrispCamera } from '../util/display.js'
import { loadTournament, saveTournament } from '../tournament/state.js'
import {
  inRoundRobin,
  matchdayCount,
  playerPool,
  playerRROpponentId,
  poolStandings,
  recordRRResult,
} from '../tournament/roundrobin.js'
import { playMusic, playSfx } from '../audio/audio.js'

const GOLD = '#ffe81f'
const byId = (id) => CHARACTERS.find((c) => c.id === id)

// Round-robin stage hub for Group Play and League tournaments (Phase 7).
// Same controller pattern as BracketScene: always reloads from
// localStorage on create(), applies an incoming match result first, and
// leaves all the math to src/tournament/roundrobin.js. Once the stage
// completes, the state's stage flips to 'knockout' and this scene hands
// off to BracketScene — which also renders the results screen when the
// player failed to qualify.
export class StandingsScene extends Phaser.Scene {
  constructor() {
    super('Standings')
  }

  init(data) {
    // Explicit { result: null } from every non-battle entry point — same
    // Phaser stale-data footgun as BracketScene.init().
    this.pendingResult = data?.result ?? null
  }

  create() {
    applyCrispCamera(this)
    // Same dangling-.once() risk as BracketScene: this key is revisited
    // after every matchday, so clear the slate each time.
    this.input.keyboard.removeAllListeners()
    playMusic('menu')
    this.input.on('pointerdown', () => playSfx('uiClick'))
    const W = T.arena.width
    const H = T.arena.height

    let state = loadTournament()
    if (!state || !state.rr) {
      this.scene.start('Mode')
      return
    }

    if (this.pendingResult && inRoundRobin(state)) {
      state = recordRRResult(state, this.pendingResult === 'win')
      saveTournament(state)
    }

    // Exposed for the automated verify script.
    this.state = state

    if (!inRoundRobin(state)) {
      // Stage complete — the knockout bracket (or the you-didn't-qualify
      // results screen) lives in BracketScene.
      this.scene.start('Bracket', { result: null })
      return
    }

    this.drawBackground(W, H)
    this.renderHeader(state)
    if (state.format === 'league') this.renderLeagueTables(state)
    else this.renderGroupTables(state)
    this.renderPlayButton(state)
    this.makeBackToMenuLink()

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
      this.add.circle(Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.4, 0xffffff, 0.2 + Math.random() * 0.6)
    }
  }

  renderHeader(state) {
    const W = T.arena.width
    const player = byId(state.playerId)
    const oppId = playerRROpponentId(state)
    const opp = oppId ? byId(oppId) : null

    this.add
      .text(W / 2, 34, state.format === 'league' ? 'LEAGUE' : 'GROUP PLAY', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: GOLD,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    const myRow = poolStandings(state, state.rr.playerPool).find((r) => r.id === state.playerId)
    const record = `${myRow.wins}-${myRow.losses}`
    const day = `Matchday ${state.rr.matchday + 1} of ${matchdayCount(state)}`
    const line = opp
      ? `${day} · ${player?.name} (${record}) · Next: ${opp.name}`
      : `${day} · ${player?.name} (${record})`
    this.add
      .text(W / 2, 60, line, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
  }

  // ---- Group Play: player's group large on the left, the other six
  // compact on the right (same tiny-type language as the bracket grid). --

  renderGroupTables(state) {
    const pIdx = state.rr.playerPool
    this.renderTable(state, pIdx, 120, 150, 320, 22, 13, true)

    const others = state.rr.pools.map((_, i) => i).filter((i) => i !== pIdx)
    others.forEach((poolIdx, n) => {
      const col = n % 2
      const row = Math.floor(n / 2)
      this.renderTable(state, poolIdx, 490 + col * 230, 128 + row * 122, 200, 15, 9, false)
    })
  }

  // ---- League: the two full division tables side by side. ---------------

  renderLeagueTables(state) {
    this.renderTable(state, 0, 120, 96, 340, 24, 11, state.rr.playerPool === 0, 8)
    this.renderTable(state, 1, 520, 96, 340, 24, 11, state.rr.playerPool === 1, 8)
  }

  // One standings table. x/y = top-left, rowH/fontPx control density,
  // qualifyLine draws the "everything above advances" cut after that rank.
  renderTable(state, poolIdx, x, y, w, rowH, fontPx, isPlayerPool, qualifyLine = 2) {
    const pool = state.rr.pools[poolIdx]
    const rows = poolStandings(state, poolIdx)
    const height = (rows.length + 1) * rowH + 14

    this.add
      .rectangle(x + w / 2, y + height / 2, w, height, 0x0c1424, 0.85)
      .setStrokeStyle(isPlayerPool ? 2 : 1, isPlayerPool ? 0xffe81f : 0xffffff, isPlayerPool ? 0.9 : 0.2)

    const header = isPlayerPool ? `${pool.name.toUpperCase()} — YOU` : pool.name.toUpperCase()
    this.add
      .text(x + 10, y + rowH / 2 + 4, header, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontPx}px`,
        fontStyle: 'bold',
        color: isPlayerPool ? GOLD : '#8a8ab0',
      })
      .setOrigin(0, 0.5)
    this.add
      .text(x + w - 10, y + rowH / 2 + 4, 'W-L  PTS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontPx - 1}px`,
        color: '#8a8ab0',
      })
      .setOrigin(1, 0.5)

    rows.forEach((row, i) => {
      const ry = y + (i + 1) * rowH + rowH / 2 + 4
      const isPlayer = row.id === state.playerId
      const color = isPlayer ? GOLD : '#ffffff'
      this.add
        .text(x + 10, ry, `${i + 1}. ${byId(row.id)?.name ?? '?'}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontPx}px`,
          fontStyle: isPlayer ? 'bold' : 'normal',
          color,
        })
        .setOrigin(0, 0.5)
      this.add
        .text(x + w - 10, ry, `${row.wins}-${row.losses}   ${row.pts}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${fontPx}px`,
          color,
        })
        .setOrigin(1, 0.5)

      // Qualification cut: groups take the top 2 (plus the two best
      // thirds), the league takes the top 8 — a thin line under the last
      // guaranteed-safe rank.
      if (i + 1 === qualifyLine && rows.length > qualifyLine) {
        this.add.rectangle(x + w / 2, y + (i + 2) * rowH + 2, w - 12, 1, 0xffe81f, 0.45)
      }
    })
  }

  renderPlayButton(state) {
    const W = T.arena.width
    const H = T.arena.height
    const y = H - 34

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
        ret: 'Standings',
        p1: state.playerId,
        p2: playerRROpponentId(state),
        difficulty: state.difficulty,
        arena: 'random',
      })
    }
    box.on('pointerover', () => label.setColor(GOLD))
    box.on('pointerout', () => label.setColor('#ffffff'))
    box.on('pointerdown', launch)
    this.input.keyboard.once('keydown-ENTER', launch)
  }

  makeBackToMenuLink() {
    this.menuLinkPos = { x: 60, y: 20 } // also used by the automated verify script
    const text = this.add
      .text(16, 20, '‹ MAIN MENU', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#8a8ab0',
      })
      .setInteractive({ useHandCursor: true })
    text.on('pointerover', () => text.setColor(GOLD))
    text.on('pointerout', () => text.setColor('#8a8ab0'))
    text.on('pointerdown', () => this.scene.start('Mode'))
  }
}
