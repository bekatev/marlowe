import { formatMoney, CHIP_COLORS } from '../game/theme.ts'
import { CHIP_VALUES, MAX_BET, MIN_BET, STARTING_BALANCE, type ChipValue, type Phase } from '../game/types.ts'

type HudProps = {
  balance: number
  wager: number
  lastWager: number
  phase: Phase
  message: string
  mood: 'idle' | 'win' | 'lose' | 'push'
  selectedChip: ChipValue
  playerTotal: number | null
  dealerTotal: number | null
  onChip: (value: ChipValue) => void
  onClear: () => void
  onRebet: () => void
  onRebuy: () => void
  onDeal: () => void
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onNext: () => void
  canDouble: boolean
}

export function Hud({
  balance,
  wager,
  lastWager,
  phase,
  message,
  mood,
  selectedChip,
  playerTotal,
  dealerTotal,
  onChip,
  onClear,
  onRebet,
  onRebuy,
  onDeal,
  onHit,
  onStand,
  onDouble,
  onNext,
  canDouble,
}: HudProps) {
  const broke = phase === 'betting' && wager === 0 && balance < MIN_BET
  const canRebet = phase === 'betting' && wager === 0 && lastWager >= MIN_BET && balance >= lastWager

  return (
    <div className="hud">
      <header className="topbar">
        <div>
          <p className="mark">Marlowe</p>
          <p className="room">Blackjack</p>
        </div>
        <p className="balance">
          <span>Balance</span>
          <strong>{formatMoney(balance)}</strong>
        </p>
      </header>

      <div className="felt-readout">
        {message ? <p className={`outcome outcome-${mood}`}>{message}</p> : null}
        <p className="totals">
          {dealerTotal !== null ? <span>Dealer {dealerTotal}</span> : null}
          {playerTotal !== null ? <span>You {playerTotal}</span> : null}
        </p>
      </div>

      <footer className="rail">
        <p className="status">{statusLine(phase, wager)}</p>
        <div className="tray">
          <div className="chips" aria-label="Chip values">
            {CHIP_VALUES.map((value) => {
              const disabled = phase !== 'betting' || balance < value || wager + value > MAX_BET
              return (
                <button
                  key={value}
                  type="button"
                  className={value === selectedChip ? 'chip is-on' : 'chip'}
                  style={{ background: CHIP_COLORS[value].css, color: CHIP_COLORS[value].ink }}
                  disabled={disabled}
                  aria-pressed={value === selectedChip}
                  onClick={() => onChip(value)}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <div className="actions">
            {phase === 'betting' ? (
              <>
                <button type="button" onClick={onClear} disabled={wager === 0}>
                  Clear
                </button>
                {canRebet ? (
                  <button type="button" onClick={onRebet}>
                    Rebet {formatMoney(lastWager)}
                  </button>
                ) : null}
                {broke ? (
                  <button type="button" className="primary" onClick={onRebuy}>
                    Buy in {formatMoney(STARTING_BALANCE)}
                  </button>
                ) : (
                  <button type="button" className="primary" onClick={onDeal} disabled={wager < MIN_BET}>
                    Deal
                  </button>
                )}
              </>
            ) : null}
            {phase === 'player' ? (
              <>
                <button type="button" onClick={onHit}>
                  Hit
                </button>
                <button type="button" onClick={onStand}>
                  Stand
                </button>
                <button type="button" onClick={onDouble} disabled={!canDouble}>
                  Double
                </button>
              </>
            ) : null}
            {phase === 'result' ? (
              <button type="button" className="primary" onClick={onNext}>
                Next hand
              </button>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  )
}

function statusLine(phase: Phase, wager: number): string {
  if (phase === 'dealing') return 'Dealing'
  if (phase === 'dealer') return 'Dealer playing'
  if (phase === 'player') return `Wager ${formatMoney(wager)}`
  if (phase === 'result') return 'Hand complete'
  if (wager === 0) return 'Place a wager'
  return `Wager ${formatMoney(wager)}`
}
