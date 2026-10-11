export const CHIP_VALUES = [5, 25, 100, 500] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

export const MIN_BET = 5
export const MAX_BET = 500
export const STARTING_BALANCE = 1000

export type Suit = 'S' | 'H' | 'D' | 'C'
export type Card = { rank: number; suit: Suit }

export type Phase = 'betting' | 'dealing' | 'player' | 'dealer' | 'result'
export type Mood = 'idle' | 'win' | 'lose' | 'push'

export type TableSnapshot = {
  phase: Phase
  player: Card[]
  dealer: Card[]
  hideHole: boolean
  chipAmount: number
  playerTotal: number | null
  dealerTotal: number | null
  mood: Mood
}
