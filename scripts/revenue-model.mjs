// Waffles revenue model — cohort-compounded, pool economics.
// Run: node scripts/revenue-model.mjs   (tweak the CONFIG block)

const CONFIG = {
  usersPerDay: 600,
  daysPerMonth: 30,
  months: 12,

  conversion: 0.06,        // visitor → paying player (old game baseline)
  monthlyRetention: 0.7,   // a payer still active next month (30% monthly churn)
  entriesPerPayerMo: 20,   // paid tournament entries per active payer / month

  pegUsdt: 0.1,            // 1 ticket = $0.10
  ticketSalePrice: 0.15,   // what a payer actually pays per ticket (bundle avg)
  rake: 0.1,               // house take on the prize pool
};

// House net per paid entry = sale margin + rake on the pegged pool contribution.
const houseNetPerEntry = (CONFIG.ticketSalePrice - CONFIG.pegUsdt) + CONFIG.pegUsdt * CONFIG.rake;
const grossPerEntry = CONFIG.ticketSalePrice;

function run(conversion) {
  const newPayersPerMonth = CONFIG.usersPerDay * CONFIG.daysPerMonth * conversion;
  const rows = [];
  let active = 0;
  let cumGross = 0;
  let cumNet = 0;
  for (let m = 1; m <= CONFIG.months; m++) {
    active = active * CONFIG.monthlyRetention + newPayersPerMonth; // retain + acquire
    const entries = active * CONFIG.entriesPerPayerMo;
    const gross = entries * grossPerEntry;
    const net = entries * houseNetPerEntry;
    cumGross += gross;
    cumNet += net;
    rows.push({ m, active, gross, net });
  }
  const steadyActive = newPayersPerMonth / (1 - CONFIG.monthlyRetention);
  return { newPayersPerMonth, rows, cumGross, cumNet, steadyActive };
}

const usd = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

console.log(`\n===== Waffles revenue model =====`);
console.log(`${CONFIG.usersPerDay}/day = ${(CONFIG.usersPerDay * CONFIG.daysPerMonth).toLocaleString()} visitors/mo`);
console.log(`conv ${(CONFIG.conversion * 100).toFixed(0)}% · retention ${(CONFIG.monthlyRetention * 100).toFixed(0)}%/mo · ${CONFIG.entriesPerPayerMo} entries/payer/mo`);
console.log(`ticket sale ${usd(CONFIG.ticketSalePrice)} (peg ${usd(CONFIG.pegUsdt)}) · rake ${(CONFIG.rake * 100).toFixed(0)}% → house net ${houseNetPerEntry.toFixed(3)}/entry\n`);

const base = run(CONFIG.conversion);
console.log(`New payers acquired / month: ${Math.round(base.newPayersPerMonth).toLocaleString()}`);
console.log(`Steady-state active payers:  ${Math.round(base.steadyActive).toLocaleString()}  (acquire ÷ churn)\n`);

console.log(`Month  ActivePayers   GrossBookings   HouseNet`);
for (const r of base.rows) {
  console.log(
    `${String(r.m).padStart(4)}   ${String(Math.round(r.active)).padStart(11)}   ${usd(r.gross).padStart(13)}   ${usd(r.net).padStart(9)}`,
  );
}
console.log(`\nYear 1 total — gross bookings: ${usd(base.cumGross)} · HOUSE NET: ${usd(base.cumNet)}`);
console.log(`Run-rate at month 12 — house net: ${usd(base.rows[CONFIG.months - 1].net)}/mo (~${usd(base.rows[CONFIG.months - 1].net * 12)}/yr)\n`);

console.log(`--- Conversion sensitivity (Year-1 house net) ---`);
for (const c of [0.03, 0.06, 0.1, 0.15]) {
  const r = run(c);
  console.log(`  ${(c * 100).toFixed(0).padStart(2)}% → ${usd(r.cumNet).padStart(10)}  (steady ${Math.round(r.steadyActive).toLocaleString()} payers, mo12 ${usd(r.rows[CONFIG.months - 1].net)}/mo)`);
}
console.log();
