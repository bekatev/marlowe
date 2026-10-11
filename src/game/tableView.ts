import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { Application, Assets, Container, Graphics, Text } from 'pixi.js'
import { isRedSuit, rankLabel, suitSymbol } from './cards.ts'
import { CHIP_COLORS, stackChips } from './theme.ts'
import type { Card, TableSnapshot } from './types.ts'

const SKELETON = 'dealer-skeleton'
const ATLAS = 'dealer-atlas'

let spineAssets: Promise<void> | null = null

function loadSpineAssets(): Promise<void> {
  if (!spineAssets) {
    spineAssets = Assets.load([
      { alias: SKELETON, src: '/spine/spineboy-pro.json' },
      { alias: ATLAS, src: '/spine/spineboy.atlas' },
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        spineAssets = null
        throw error
      })
  }
  return spineAssets
}

export type TableHandlers = {
  onBetSpot: () => void
}

export type TableView = {
  show: (snapshot: TableSnapshot) => void
  destroy: () => void
}

const CARD_W = 78
const CARD_H = 112

export async function createTable(
  host: HTMLElement,
  handlersRef: { current: TableHandlers },
): Promise<TableView> {
  const app = new Application()
  await app.init({
    background: '#07140f',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    resizeTo: host,
    preference: 'webgl',
  })
  app.canvas.style.touchAction = 'none'

  try {
    await loadSpineAssets()
    host.appendChild(app.canvas)

    const backdrop = new Graphics()
    const world = new Container()
    app.stage.addChild(backdrop, world)

    const dealer = Spine.from({
      skeleton: SKELETON,
      atlas: ATLAS,
    })
    dealer.scale.set(0.46)
    dealer.position.set(0, -42)
    dealer.state.data.defaultMix = 0.18
    dealer.state.setAnimation(0, 'idle', true)

    const table = new Graphics()
    table.ellipse(0, 78, 340, 188).fill({ color: 0x000000, alpha: 0.28 })
    table.ellipse(0, 70, 326, 176).fill(0x0c5c3a)
    table.ellipse(0, 70, 326, 176).stroke({ width: 16, color: 0x5c3a22 })
    table.ellipse(0, 70, 294, 150).stroke({ width: 2, color: 0xe3c27a, alpha: 0.8 })

    const rules = new Text({
      text: 'DEALER STANDS ON 17     BLACKJACK PAYS 3 TO 2',
      anchor: 0.5,
      style: {
        fill: 0xd7c4a0,
        fontFamily: 'Georgia, serif',
        fontSize: 12,
        letterSpacing: 1.2,
      },
    })
    rules.position.set(0, 196)
    rules.alpha = 0.8

    const betRing = new Graphics()
    betRing.circle(0, 72, 42).stroke({ width: 2, color: 0xe3c27a, alpha: 0.9 })
    betRing.circle(0, 72, 30).stroke({ width: 1, color: 0xe3c27a, alpha: 0.4 })
    betRing.eventMode = 'static'
    betRing.cursor = 'pointer'
    betRing.on('pointertap', () => {
      handlersRef.current.onBetSpot()
    })

    const dealerCards = new Container()
    const playerCards = new Container()
    const chipLayer = new Container()
    const dealerTotal = makeTotal()
    const playerTotal = makeTotal()
    dealerTotal.position.set(0, -78)
    playerTotal.position.set(0, 232)

    world.addChild(dealer, table, rules, betRing, dealerCards, playerCards, dealerTotal, playerTotal, chipLayer)

    let destroyed = false
    let pose = 'idle'

    function layout() {
      if (destroyed) return
      const { width, height } = app.screen
      if (width < 2 || height < 2) return
      backdrop.clear()
      backdrop.rect(0, 0, width, height).fill(0x07110e)
      backdrop.circle(width / 2, height * 0.42, Math.max(width, height) * 0.48).fill({ color: 0x0c3a28, alpha: 0.9 })
      const fit = Math.min((width * 0.92) / 720, ((height - 180) * 0.92) / 520)
      world.scale.set(Math.max(0.48, Math.min(fit, 1.05)))
      world.position.set(width / 2, height * 0.46)
    }

    layout()
    app.renderer.on('resize', layout)

    function show(snapshot: TableSnapshot) {
      if (destroyed) return
      betRing.eventMode = snapshot.phase === 'betting' ? 'static' : 'none'
      betRing.cursor = snapshot.phase === 'betting' ? 'pointer' : 'default'
      betRing.alpha = snapshot.phase === 'betting' ? 1 : 0.4

      replaceChildren(dealerCards, layoutCards(snapshot.dealer, snapshot.hideHole, DEALER_CARD_Y))
      replaceChildren(playerCards, layoutCards(snapshot.player, false, PLAYER_CARD_Y))
      replaceChildren(chipLayer, layoutChips(snapshot.chipAmount))

      dealerTotal.text = snapshot.dealerTotal === null ? '' : `Dealer ${snapshot.dealerTotal}`
      playerTotal.text = snapshot.playerTotal === null ? '' : `You ${snapshot.playerTotal}`

      const nextPose = poseFor(snapshot.mood)
      if (nextPose === pose) return
      pose = nextPose
      if (nextPose === 'idle') {
        dealer.state.setAnimation(0, 'idle', true)
        return
      }
      dealer.state.setAnimation(0, nextPose, false)
      dealer.state.addAnimation(0, 'idle', true, 0)
    }

    function destroy() {
      if (destroyed) return
      destroyed = true
      try {
        app.renderer.off('resize', layout)
        dealer.autoUpdate = false
        dealer.state.clearListeners()
        dealer.removeFromParent()
      } catch {
        // The ticker may already be gone during a strict-mode remount.
      }
      try {
        app.destroy({ removeView: true }, { children: true })
      } catch {
        // Same remount path: the canvas was already removed.
      }
    }

    return { show, destroy }
  } catch (error) {
    app.destroy({ removeView: true }, { children: true })
    throw error
  }
}

function makeTotal(): Text {
  return new Text({
    text: '',
    anchor: 0.5,
    style: {
      fill: 0xf6ecd9,
      fontFamily: 'Georgia, serif',
      fontSize: 16,
    },
  })
}

const DEALER_CARD_Y = -8
const PLAYER_CARD_Y = 158

function layoutCards(cards: readonly Card[], hideHole: boolean, y: number): Container[] {
  const gap = cards.length <= 1 ? 0 : Math.min(54, 280 / (cards.length - 1))
  const width = gap * (cards.length - 1)
  return cards.map((card, index) => {
    const view = createCard(hideHole && index === 1 ? null : card)
    view.position.set(-width / 2 + index * gap, y)
    return view
  })
}

function layoutChips(amount: number): Container[] {
  const chips = stackChips(amount)
  return chips.map((value, index) => {
    const chip = createChip(value)
    const column = index % 6
    const row = Math.floor(index / 6)
    const width = Math.min(chips.length, 6)
    chip.position.set(-(width - 1) * 8 + column * 16, 72 - row * 6)
    return chip
  })
}

function createCard(card: Card | null): Container {
  const view = new Container()
  const face = new Graphics()
  if (!card) {
    face.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8).fill(0x0d3f2e)
    face.roundRect(-CARD_W / 2 + 7, -CARD_H / 2 + 7, CARD_W - 14, CARD_H - 14, 6).stroke({
      width: 2,
      color: 0xe3c27a,
      alpha: 0.9,
    })
    face.circle(0, 0, 16).stroke({ width: 1.5, color: 0xe3c27a, alpha: 0.8 })
    view.addChild(face)
    return view
  }

  face.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8).fill(0xf7f1e6)
  face.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8).stroke({ width: 1, color: 0xded3c2 })
  const ink = isRedSuit(card.suit) ? 0x9d2430 : 0x1c140e
  const rank = new Text({
    text: rankLabel(card.rank),
    style: { fill: ink, fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: '700' },
  })
  rank.position.set(-30, -50)
  const smallSuit = new Text({
    text: suitSymbol(card.suit),
    style: { fill: ink, fontFamily: 'Georgia, serif', fontSize: 14 },
  })
  smallSuit.position.set(-28, -28)
  const pip = new Text({
    text: suitSymbol(card.suit),
    anchor: 0.5,
    style: { fill: ink, fontFamily: 'Georgia, serif', fontSize: 34 },
  })
  view.addChild(face, rank, smallSuit, pip)
  return view
}

function createChip(value: keyof typeof CHIP_COLORS): Container {
  const color = CHIP_COLORS[value]
  const chip = new Container()
  const body = new Graphics()
  body.circle(0, 0, 15).fill(color.pixi)
  body.circle(0, 0, 15).stroke({ width: 2, color: 0xf6ecd9, alpha: 0.45 })
  body.circle(0, 0, 10).stroke({ width: 1.5, color: 0xe3c27a })
  const label = new Text({
    text: String(value),
    anchor: 0.5,
    style: {
      fill: color.ink,
      fontFamily: 'Georgia, serif',
      fontSize: value >= 100 ? 8 : 11,
      fontWeight: '700',
    },
  })
  chip.addChild(body, label)
  return chip
}

function replaceChildren(layer: Container, children: Container[]) {
  for (const child of layer.removeChildren()) child.destroy({ children: true })
  for (const child of children) layer.addChild(child)
}

function poseFor(mood: TableSnapshot['mood']): string {
  if (mood === 'win') return 'jump'
  if (mood === 'lose') return 'idle-turn'
  return 'idle'
}
