// Waffles economy — POOL design simulation.
//
// Design under test (user's proposal):
//   • 20 players/hour: 10 free + 10 paid
//   • prize pool = the PAID players' entry fees that hour (pari-mutuel)
//   • only the TOP 6 are paid → concentrated, attractive prizes
//   • paid players tend to win (they're more invested / skilled)
//
// Run: node scripts/economy-sim-pool.mjs

const N_FREE = 10;
const N_PAID = 10;
const TOP = 6;
const ENTRY_USDT = 0.1; // 1 ticket = $0.10
const RAKE = 0.1; // house take on the pool
// Concentrated top-6 split (sums to 1.0).
const SPLIT = [0.4, 0.22, 0.15, 0.1, 0.08, 0.05];
// Skill edge for paid players (added to a U(0,1) base score). Tune to control
// how dominant paid players are in the standings.
const PAID_EDGE = 0.35;
// Real-money price paid players actually pay per ticket (bundle avg) vs the
// $0.10 peg — the house's ticket-sale margin.
const SALE_PRICE = 0.15;

const TOURNEYS_PER_MONTH = 24 * 30; // hourly
const SAMPLES = 200000; // for stable averages

let seed = 99;
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

let paidInTop6 = 0;
let paidWin = 0; // USDT won by paid players (summed)
let freeWin = 0; // USDT won by free players (summed)

for (let t = 0; t < SAMPLES; t++) {
  const players = [];
  for (let i = 0; i < N_PAID; i++) players.push({ paid: true, s: rng() + PAID_EDGE });
  for (let i = 0; i < N_FREE; i++) players.push({ paid: false, s: rng() });
  players.sort((a, b) => b.s - a.s);
  const netPool = N_PAID * ENTRY_USDT * (1 - RAKE);
  for (let k = 0; k < TOP; k++) {
    const pay = netPool * SPLIT[k];
    if (players[k].paid) { paidWin += pay; paidInTop6++; } else { freeWin += pay; }
  }
}

const grossPool = N_PAID * ENTRY_USDT;
const rakePer = grossPool * RAKE;
const paidWinPer = paidWin / SAMPLES;
const freeWinPer = freeWin / SAMPLES;
const paidInTop6Avg = paidInTop6 / SAMPLES;
const paidCostPer = N_PAID * ENTRY_USDT; // paid players' entry fees (at peg)
const saleMarginPer = N_PAID * (SALE_PRICE - ENTRY_USDT); // house margin on selling those tickets

const fmt = (n) => `$${n.toFixed(3)}`;
const fmt2 = (n) => `$${n.toFixed(2)}`;

console.log(`\n===== POOL design: 10 free + 10 paid, top ${TOP} paid from the paid pool =====`);
console.log(`Entry ${fmt(ENTRY_USDT)} · rake ${(RAKE * 100).toFixed(0)}% · paid skill edge ${PAID_EDGE} · split ${SPLIT.map((s) => (s * 100) + "%").join("/")}\n`);

console.log(`--- Per tournament (avg over ${SAMPLES.toLocaleString()}) ---`);
console.log(`Gross pool (paid fees):     ${fmt2(grossPool)}`);
console.log(`Paid players in top 6:      ${paidInTop6Avg.toFixed(2)} / 6   (free: ${(TOP - paidInTop6Avg).toFixed(2)})`);
console.log(`Pool won by PAID players:   ${fmt(paidWinPer)}  (${((paidWinPer / (grossPool * (1 - RAKE))) * 100).toFixed(0)}% of net pool)`);
console.log(`Pool won by FREE players:   ${fmt(freeWinPer)}  (${((freeWinPer / (grossPool * (1 - RAKE))) * 100).toFixed(0)}% of net pool)`);
console.log(`House rake:                 ${fmt(rakePer)}\n`);

console.log(`--- Player economics ---`);
console.log(`Paid: stake ${fmt2(paidCostPer)}/tourney → win back ${fmt(paidWinPer)}  → collective ROI ${((paidWinPer / paidCostPer - 1) * 100).toFixed(0)}%`);
console.log(`Free: stake $0 (time) → win ${fmt(freeWinPer)}  → pure upside (avg ${fmt(freeWinPer / N_FREE)}/free player)`);
console.log(`  (the ${((freeWinPer / (grossPool * (1 - RAKE))) * 100).toFixed(0)}% free players take is the transfer FROM paid players — the key dial)\n`);

console.log(`--- House, monthly (${TOURNEYS_PER_MONTH} tournaments) ---`);
console.log(`Rake revenue:               ${fmt2(rakePer * TOURNEYS_PER_MONTH)}`);
console.log(`Ticket-sale margin:         ${fmt2(saleMarginPer * TOURNEYS_PER_MONTH)}  (selling at ${fmt(SALE_PRICE)} vs ${fmt(ENTRY_USDT)} peg)`);
console.log(`Faucet cash cost:           $0.00  ← ONLY if free tickets are entry-only (cash out by WINNING, not redeeming)`);
console.log(`HOUSE NET:                  ${fmt2((rakePer + saleMarginPer) * TOURNEYS_PER_MONTH)} / month  (per this 20-seat hourly bracket)\n`);
