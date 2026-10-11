import type { Card, Suit } from './types.ts'

const SUITS: Suit[] = ['S', 'H', 'D', 'C']
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export type Payout = {
  /** Chips returned to the balance. The wager was already removed when it was placed. */
  payout: number
  message: string
  mood: 'win' | 'lose' | 'push'
}

export function makeShoe(decks = 6): Card[] {
  const cards: Card[] = []
  for (let deck = 0; deck < decks; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ rank, suit })
    }
  }
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = cards[index]
    cards[index] = cards[swap]!
    cards[swap] = current!
  }
  return cards
}

export function handTotal(cards: readonly Card[]): number {
  let total = 0
  let aces = 0
  for (const card of cards) {
    if (card.rank === 1) {
      aces += 1
      total += 11
    } else if (card.rank >= 10) {
      total += 10
    } else {
      total += card.rank
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handTotal(cards) === 21
}

export function isBust(cards: readonly Card[]): boolean {
  return handTotal(cards) > 21
}

/** Dealer stands on 17, including a soft 17. */
export function dealerShouldHit(cards: readonly Card[]): boolean {
  return handTotal(cards) < 17
}

export function settle(player: readonly Card[], dealer: readonly Card[], wager: number): Payout {
  const playerTotal = handTotal(player)
  const dealerTotal = handTotal(dealer)
  const playerNatural = isBlackjack(player)
  const dealerNatural = isBlackjack(dealer)

  if (playerTotal > 21) return { payout: 0, message: 'Bust', mood: 'lose' }
  if (playerNatural && dealerNatural) return { payout: wager, message: 'Push', mood: 'push' }
  if (playerNatural) {
    const profit = Math.floor((wager * 3) / 2)
    return { payout: wager + profit, message: `Blackjack +${profit}`, mood: 'win' }
  }
  if (dealerNatural) return { payout: 0, message: 'Dealer blackjack', mood: 'lose' }
  if (dealerTotal > 21) return { payout: wager * 2, message: `Dealer busts +${wager}`, mood: 'win' }
  if (playerTotal > dealerTotal) return { payout: wager * 2, message: `You win +${wager}`, mood: 'win' }
  if (playerTotal < dealerTotal) return { payout: 0, message: 'Dealer wins', mood: 'lose' }
  return { payout: wager, message: 'Push', mood: 'push' }
}

export function rankLabel(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

export function suitSymbol(suit: Suit): string {
  if (suit === 'S') return '♠'
  if (suit === 'H') return '♥'
  if (suit === 'D') return '♦'
  return '♣'
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'H' || suit === 'D'
}

export function takeCard(shoe: Card[]): { card: Card; shoe: Card[] } {
  const next = shoe.length < 52 ? makeShoe() : shoe.slice()
  const card = next.pop()
  if (!card) throw new Error('The shoe was empty')
  return { card, shoe: next }
}
