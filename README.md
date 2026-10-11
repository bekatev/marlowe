# Marlowe

Single-table blackjack. React runs the hand, PixiJS draws the felt and the cards, and Spine animates the dealer.

## Play

```bash
npm install
npm run dev
```

Open the local address Vite prints. Place a wager, then deal.

Dealer stands on 17, including soft 17. Blackjack pays 3 to 2, rounded down. Double is offered on the first two cards. Minimum wager 5, maximum 500. A buy-in is 1,000.

Keys: `1`–`4` place chips, `Enter` deals or advances, `H` hit, `S` stand, `D` double, `C` clear, `R` rebet.

The dealer art in `public/spine` is Spineboy by Esoteric Software, included with the license in that folder. Those images are not for commercial use.
