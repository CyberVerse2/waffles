// Waffles economy simulation.
//
// Question: if FREE (time-earned) tickets are withdrawable as USDT, with hourly
// tournaments and 1,000 users, what happens to the treasury?
//
// Models real constants: entry = 1 ticket, prize ladder 25/10/3 (1st / Top10 /
// Top100), 1 ticket = $0.10 USDT, daily-reward faucet, small payer fraction.
// Run: node scripts/economy-sim.mjs

const USERS = 1000;
const DAYS = 30;
const HOURS = 24; // one tournament per hour
const USDT_PER_TICKET = 0.1;
const ENTRY_COST = 1;
const STARTING_TICKETS = 3;

// Prize ladder (fixed ranks — exactly as in state.tsx).
const prize = (rank) => (rank <= 1 ? 25 : rank <= 10 ? 10 : rank <= 100 ? 3 : 0);

// FAUCET CAP: at most one free ticket per day (the proposal under test).
const FREE_TICKETS_PER_DAY = 1;

// Bundle a payer buys when out of tickets: 5 tickets for $0.99.
const BUNDLE_TICKETS = 5;
const BUNDLE_PRICE = 0.99;

// Seeded RNG for reproducibility.
let seed = 12345;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

// User segments: how many tournaments they attempt + how often they log in.
// Heavy-tailed: a few regulars, a long tail of lurkers.
const SEGMENTS = [
  { name: "regular", share: 0.08, perHour: 5 / 24, loginP: 0.95 },
  { name: "casual", share: 0.32, perHour: 1.2 / 24, loginP: 0.6 },
  { name: "lurker", share: 0.6, perHour: 0.15 / 24, loginP: 0.15 },
];
const PAYER_FRACTION = 0.06; // % who will top up with real money when out
const TOPUP_P = 0.5; // chance a payer actually buys when blocked

const users = [];
for (let i = 0; i < USERS; i++) {
  let r = rng();
  let seg = SEGMENTS[2];
  let acc = 0;
  for (const s of SEGMENTS) {
    acc += s.share;
    if (r <= acc) { seg = s; break; }
  }
  users.push({
    seg,
    payer: rng() < PAYER_FRACTION,
    balance: STARTING_TICKETS,
    streakDay: 0,
    faucetTickets: STARTING_TICKETS, // free tickets received (incl. starting grant)
    boughtTickets: 0,
    wonTickets: 0,
    spentEntries: 0,
    usdtSpent: 0,
  });
}

let totalEntries = 0;
let totalPrizeTickets = 0;
let totalFaucetTickets = USERS * STARTING_TICKETS;
let totalBoughtTickets = 0;
let usdtIn = 0; // real money from purchases
let fieldSizes = [];

for (let d = 0; d < DAYS; d++) {
  // Daily login → claim daily reward.
  for (const u of users) {
    if (rng() < u.seg.loginP) {
      u.streakDay++;
      const t = FREE_TICKETS_PER_DAY; // hard cap: one free ticket per day
      u.balance += t;
      u.faucetTickets += t;
      totalFaucetTickets += t;
    }
  }
  // Hourly tournaments.
  for (let h = 0; h < HOURS; h++) {
    const entrants = [];
    for (const u of users) {
      if (rng() >= u.seg.perHour) continue; // not playing this hour
      if (u.balance < ENTRY_COST) {
        // Out of tickets — payer may top up, otherwise the entry is lost.
        if (u.payer && rng() < TOPUP_P) {
          u.balance += BUNDLE_TICKETS;
          u.boughtTickets += BUNDLE_TICKETS;
          totalBoughtTickets += BUNDLE_TICKETS;
          u.usdtSpent += BUNDLE_PRICE;
          usdtIn += BUNDLE_PRICE;
        } else {
          continue;
        }
      }
      u.balance -= ENTRY_COST; // entry burns the ticket
      u.spentEntries += ENTRY_COST;
      entrants.push(u);
    }
    const N = entrants.length;
    if (N === 0) continue;
    fieldSizes.push(N);
    totalEntries += N;
    // Random finishing order → ranks 1..N.
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [entrants[i], entrants[j]] = [entrants[j], entrants[i]];
    }
    for (let k = 0; k < N; k++) {
      const won = prize(k + 1);
      if (won > 0) {
        entrants[k].balance += won;
        entrants[k].wonTickets += won;
        totalPrizeTickets += won;
      }
    }
  }
}

// ---- Ledger ----
const avgField = fieldSizes.reduce((a, b) => a + b, 0) / fieldSizes.length;
const circulating = users.reduce((s, u) => s + u.balance, 0); // all withdrawable
const usdtLiability = circulating * USDT_PER_TICKET; // every ticket is cashable
const payoutRatio = totalPrizeTickets / totalEntries; // prizes paid per entry ticket

// Per-user net USDT = value of everything they hold + (winnings are cashable) − money they spent.
let netPos = 0;
let userNet = 0;
for (const u of users) {
  const net = u.balance * USDT_PER_TICKET - u.usdtSpent;
  userNet += net;
  if (net > 0) netPos++;
}

// Pool-based alternative: prizes funded from entry fees, house takes a rake.
const RAKE = 0.15;
const poolHouseRakeUsdt = totalEntries * USDT_PER_TICKET * RAKE;
// Under a pool, tournaments mint no new tickets (redistribution), so the only
// USDT the house is on the hook for is the free faucet itself.
const faucetLiabilityUsdt = totalFaucetTickets * USDT_PER_TICKET;

const fmtUsd = (n) => `$${n.toFixed(2)}`;
const perMonthUser = (n) => n / USERS;

console.log(`\n===== Waffles economy sim — ${USERS} users, ${DAYS} days, hourly tournaments =====`);
console.log(`Assumptions: entry 1🎟, prizes 25/10/3 (1st/Top10/Top100), 1🎟 = ${fmtUsd(USDT_PER_TICKET)}, ${(PAYER_FRACTION * 100).toFixed(0)}% payers\n`);

console.log(`Tournaments run:        ${DAYS * HOURS}`);
console.log(`Avg field size:         ${avgField.toFixed(1)} entrants/tournament`);
console.log(`Total entries:          ${totalEntries.toLocaleString()} 🎟`);
console.log(`Total prizes paid:      ${totalPrizeTickets.toLocaleString()} 🎟  (payout ratio ${payoutRatio.toFixed(2)}× entries)`);
console.log(`Free tickets minted:    ${totalFaucetTickets.toLocaleString()} 🎟  (faucet + starting grant)`);
console.log(`Bought tickets:         ${totalBoughtTickets.toLocaleString()} 🎟`);
console.log(`Tickets in circulation: ${circulating.toLocaleString()} 🎟  (all withdrawable)\n`);

console.log(`--- Treasury (CURRENT model: fixed-rank prizes, free tickets cash out) ---`);
console.log(`USDT in (purchases):    ${fmtUsd(usdtIn)}`);
console.log(`USDT liability owed:    ${fmtUsd(usdtLiability)}   (circulating tickets, all cashable)`);
console.log(`HOUSE NET:              ${fmtUsd(usdtIn - usdtLiability)}  over ${DAYS} days`);
console.log(`  → per user / month:   ${fmtUsd(perMonthUser(usdtIn - usdtLiability))}`);
console.log(`Users net-positive USDT: ${netPos}/${USERS} (${((netPos / USERS) * 100).toFixed(0)}%)  — paid to play`);
console.log(`Total paid out to users: ${fmtUsd(userNet)}\n`);

console.log(`--- For contrast: POOL model (prizes = entries × (1−${RAKE}), rake to house) ---`);
console.log(`Prize blow-out eliminated (tournaments redistribute, mint nothing).`);
console.log(`House rake revenue:     ${fmtUsd(poolHouseRakeUsdt)}`);
console.log(`Faucet still cashable:  ${fmtUsd(faucetLiabilityUsdt)}  ← the irreducible cost of free→cash`);
console.log(`HOUSE NET (pool):       ${fmtUsd(usdtIn + poolHouseRakeUsdt - faucetLiabilityUsdt)}\n`);
