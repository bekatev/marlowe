import { Hud } from './components/Hud.tsx'
import { Stage } from './components/Stage.tsx'
import { handTotal } from './game/cards.ts'
import { useBlackjack } from './game/useBlackjack.ts'

export default function App() {
  const game = useBlackjack()
  const { state } = game
  const dealerCards = state.hideHole && state.dealer.length > 1 ? [state.dealer[0]!] : state.dealer

  return (
    <main className="app">
      <Stage handlersRef={game.handlersRef} onReady={game.bindView} />
      <Hud
        balance={state.balance}
        wager={state.wager}
        lastWager={state.lastWager}
        phase={state.phase}
        message={state.message}
        mood={state.mood}
        selectedChip={state.selectedChip}
        playerTotal={state.player.length > 0 ? handTotal(state.player) : null}
        dealerTotal={state.dealer.length > 0 ? handTotal(dealerCards) : null}
        onChip={game.addChip}
        onClear={game.clearWager}
        onRebet={game.rebet}
        onRebuy={game.rebuy}
        onDeal={() => {
          void game.deal()
        }}
        onHit={game.hit}
        onStand={game.stand}
        onDouble={game.doubleDown}
        onNext={game.nextHand}
        canDouble={state.phase === 'player' && state.player.length === 2 && state.balance >= state.wager}
      />
    </main>
  )
}
