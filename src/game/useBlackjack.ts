import { useCallback, useEffect, useRef, useState } from 'react'
import { dealerShouldHit, handTotal, isBlackjack, isBust, makeShoe, settle, takeCard } from './cards.ts'
import type { TableHandlers, TableView } from './tableView.ts'
import {
  MAX_BET,
  MIN_BET,
  STARTING_BALANCE,
  type Card,
  type ChipValue,
  type Phase,
  type TableSnapshot,
} from './types.ts'

const DEAL_GAP = 280
const DEALER_GAP = 460

export type HandState = {
  balance: number
  wager: number
  lastWager: number
  phase: Phase
  shoe: Card[]
  player: Card[]
  dealer: Card[]
  hideHole: boolean
  message: string
  mood: TableSnapshot['mood']
  selectedChip: ChipValue
}

function createInitialState(): HandState {
  return {
    balance: STARTING_BALANCE,
    wager: 0,
    lastWager: 0,
    phase: 'betting',
    shoe: makeShoe(),
    player: [],
    dealer: [],
    hideHole: true,
    message: '',
    mood: 'idle',
    selectedChip: 25,
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function toSnapshot(state: HandState): TableSnapshot {
  const dealerCards = state.hideHole && state.dealer.length > 1 ? [state.dealer[0]!] : state.dealer
  return {
    phase: state.phase,
    player: state.player,
    dealer: state.dealer,
    hideHole: state.hideHole,
    chipAmount: state.wager,
    playerTotal: state.player.length > 0 ? handTotal(state.player) : null,
    dealerTotal: state.dealer.length > 0 ? handTotal(dealerCards) : null,
    mood: state.mood,
  }
}

export function useBlackjack() {
  const [state, setState] = useState(createInitialState)
  const stateRef = useRef(state)
  const viewRef = useRef<TableView | null>(null)
  const tokenRef = useRef(0)
  const handlersRef = useRef<TableHandlers>({ onBetSpot: () => {} })

  useEffect(() => {
    stateRef.current = state
    viewRef.current?.show(toSnapshot(state))
  }, [state])

  useEffect(() => {
    return () => {
      tokenRef.current += 1
    }
  }, [])

  const publish = useCallback((next: HandState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const finish = useCallback(
    (token: number, draft: HandState) => {
      if (tokenRef.current !== token) return
      const result = settle(draft.player, draft.dealer, draft.wager)
      publish({
        ...draft,
        hideHole: false,
        phase: 'result',
        balance: draft.balance + result.payout,
        lastWager: draft.wager,
        wager: 0,
        message: result.message,
        mood: result.mood,
      })
    },
    [publish],
  )

  const dealerPlay = useCallback(
    async (token: number, start: HandState) => {
      let draft: HandState = { ...start, hideHole: false, phase: 'dealer', message: '' }
      publish(draft)
      await wait(DEALER_GAP)
      if (tokenRef.current !== token) return

      while (dealerShouldHit(draft.dealer)) {
        const drawn = takeCard(draft.shoe)
        draft = { ...draft, shoe: drawn.shoe, dealer: [...draft.dealer, drawn.card] }
        publish(draft)
        await wait(DEALER_GAP)
        if (tokenRef.current !== token) return
      }
      finish(token, draft)
    },
    [finish, publish],
  )

  const addChip = useCallback(
    (value: ChipValue) => {
      const current = stateRef.current
      if (current.phase !== 'betting') return
      if (current.balance < value) return
      if (current.wager + value > MAX_BET) {
        publish({ ...current, message: `Maximum wager is ${MAX_BET}`, selectedChip: value })
        return
      }
      publish({
        ...current,
        balance: current.balance - value,
        wager: current.wager + value,
        message: '',
        mood: 'idle',
        selectedChip: value,
      })
    },
    [publish],
  )

  const clearWager = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'betting' || current.wager === 0) return
    publish({
      ...current,
      balance: current.balance + current.wager,
      wager: 0,
      message: '',
    })
  }, [publish])

  const rebet = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'betting' || current.wager !== 0) return
    if (current.lastWager < MIN_BET || current.balance < current.lastWager) return
    publish({
      ...current,
      balance: current.balance - current.lastWager,
      wager: current.lastWager,
      message: '',
      mood: 'idle',
    })
  }, [publish])

  const rebuy = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'betting' || current.wager !== 0) return
    if (current.balance >= MIN_BET) return
    publish({ ...current, balance: STARTING_BALANCE, message: '' })
  }, [publish])

  const deal = useCallback(async () => {
    const current = stateRef.current
    if (current.phase !== 'betting' || current.wager < MIN_BET) return
    const token = ++tokenRef.current

    let shoe = current.shoe
    const first = takeCard(shoe)
    const second = takeCard(first.shoe)
    const third = takeCard(second.shoe)
    const fourth = takeCard(third.shoe)
    const p1 = first.card
    const d1 = second.card
    const p2 = third.card
    const d2 = fourth.card
    shoe = fourth.shoe

    const player = [p1, p2]
    const dealer = [d1, d2]
    let draft: HandState = {
      ...current,
      shoe,
      phase: 'dealing',
      player: [],
      dealer: [],
      hideHole: true,
      message: '',
      mood: 'idle',
    }
    publish(draft)

    const steps: Array<Pick<HandState, 'player' | 'dealer'>> = [
      { player: [p1], dealer: [] },
      { player: [p1], dealer: [d1] },
      { player, dealer: [d1] },
      { player, dealer },
    ]
    for (const step of steps) {
      await wait(DEAL_GAP)
      if (tokenRef.current !== token) return
      draft = { ...draft, ...step }
      publish(draft)
    }
    await wait(180)
    if (tokenRef.current !== token) return

    if (isBlackjack(player) || isBlackjack(dealer)) {
      finish(token, { ...draft, player, dealer, hideHole: false })
      return
    }
    publish({ ...draft, player, dealer, hideHole: true, phase: 'player' })
  }, [finish, publish])

  const hit = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'player') return
    const token = ++tokenRef.current
    const drawn = takeCard(current.shoe)
    const player = [...current.player, drawn.card]
    const draft: HandState = { ...current, shoe: drawn.shoe, player, message: '' }
    if (isBust(player)) {
      finish(token, { ...draft, hideHole: false })
      return
    }
    if (handTotal(player) === 21) {
      publish({ ...draft, phase: 'dealer' })
      void dealerPlay(token, { ...draft, phase: 'dealer' })
      return
    }
    publish({ ...draft, phase: 'player' })
  }, [dealerPlay, finish, publish])

  const stand = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'player') return
    const token = ++tokenRef.current
    void dealerPlay(token, { ...current, phase: 'dealer' })
  }, [dealerPlay])

  const doubleDown = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'player' || current.player.length !== 2) return
    if (current.balance < current.wager) return
    const token = ++tokenRef.current
    const drawn = takeCard(current.shoe)
    const draft: HandState = {
      ...current,
      shoe: drawn.shoe,
      player: [...current.player, drawn.card],
      balance: current.balance - current.wager,
      wager: current.wager * 2,
      phase: 'dealer',
      message: '',
    }
    if (isBust(draft.player)) {
      finish(token, { ...draft, hideHole: false })
      return
    }
    void dealerPlay(token, draft)
  }, [dealerPlay, finish])

  const nextHand = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'result') return
    tokenRef.current += 1
    publish({
      ...current,
      phase: 'betting',
      player: [],
      dealer: [],
      hideHole: true,
      message: '',
      mood: 'idle',
      wager: 0,
    })
  }, [publish])

  useEffect(() => {
    handlersRef.current = {
      onBetSpot() {
        addChip(stateRef.current.selectedChip)
      },
    }
  }, [addChip])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === '1') addChip(5)
      if (key === '2') addChip(25)
      if (key === '3') addChip(100)
      if (key === '4') addChip(500)
      if (key === 'c') clearWager()
      if (key === 'h') hit()
      if (key === 's') stand()
      if (key === 'd') doubleDown()
      if (key === 'r') rebet()
      if (event.key === 'Enter') {
        event.preventDefault()
        const phase = stateRef.current.phase
        if (phase === 'betting') void deal()
        if (phase === 'result') nextHand()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addChip, clearWager, deal, doubleDown, hit, nextHand, rebet, stand])

  const bindView = useCallback((view: TableView | null) => {
    viewRef.current = view
    if (view) view.show(toSnapshot(stateRef.current))
  }, [])

  return {
    state,
    handlersRef,
    bindView,
    addChip,
    clearWager,
    rebet,
    rebuy,
    deal,
    hit,
    stand,
    doubleDown,
    nextHand,
  }
}
