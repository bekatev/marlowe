import { CHIP_VALUES, type ChipValue } from './types.ts'

export const CHIP_COLORS: Record<ChipValue, { pixi: number; css: string; ink: string }> = {
  5: { pixi: 0xc5363a, css: '#c5363a', ink: '#fff8ee' },
  25: { pixi: 0x1f4fa3, css: '#1f4fa3', ink: '#f3f7ff' },
  100: { pixi: 0x161616, css: '#161616', ink: '#e3c27a' },
  500: { pixi: 0xc6a15b, css: '#c6a15b', ink: '#1c140e' },
}

export function stackChips(amount: number): ChipValue[] {
  const chips: ChipValue[] = []
  let left = amount
  for (const value of [...CHIP_VALUES].reverse()) {
    while (left >= value) {
      chips.push(value)
      left -= value
    }
  }
  return chips
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US')
}
