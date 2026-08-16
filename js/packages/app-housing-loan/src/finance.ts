/**
 * Mortgage math engine — pure functions, no React. All rates are annual
 * percentages (e.g. 6.5 = 6.5%). Amounts are dollars. Everything here is an
 * ESTIMATE for illustration, not financial advice.
 */

export type Occupancy = "primary" | "secondary" | "vacation" | "investment";
export type LoanType = "fixed" | "arm";

export interface ArmTerms {
  introYears: number; // fixed-rate intro period, e.g. 5 for a 5/1 ARM
  adjustEveryYears: number; // adjustment frequency after intro, e.g. 1
  indexPct: number; // current index value
  marginPct: number; // lender margin (fully-indexed = index + margin)
  capInitialPct: number; // max change at first adjustment
  capPeriodicPct: number; // max change per subsequent adjustment
  capLifetimePct: number; // max increase over the intro rate, ever
}

export interface LoanInputs {
  homePrice: number;
  downPayment: number;
  termYears: number;
  loanType: LoanType;
  /** Fixed rate, or the ARM intro rate. */
  baseRatePct: number;
  /** Occupancy pricing add-on applied to the note rate. */
  occupancyRateAdjPct: number;
  arm: ArmTerms;
  // Monthly costs
  propertyTaxAnnualPct: number; // % of home price / year
  insuranceAnnual: number;
  hoaMonthly: number;
  pmiAnnualPct: number; // % of the ORIGINAL loan / year, charged as a flat monthly amount
  pmiApplies: boolean; // occupancy allows PMI AND down < 20%
  // Extra principal
  extraMonthly: number;
  oneTimeExtra: number;
  // Costs
  pointsPct: number; // % of loan amount paid upfront
  closingCosts: number;
}

export interface MonthRow {
  month: number;
  rate: number; // annual %
  payment: number; // scheduled P&I this month
  principal: number;
  interest: number;
  pmi: number;
  extra: number;
  balance: number;
}

export interface YearRow {
  year: number;
  principal: number;
  interest: number;
  pmi: number;
  balance: number;
}

export interface Amortization {
  loanAmount: number;
  months: MonthRow[];
  schedule: YearRow[];
  firstPI: number; // scheduled P&I in month 1
  maxPI: number; // highest scheduled P&I (ARM worst case)
  totalInterest: number;
  totalPmi: number;
  payoffMonths: number; // actual months to payoff (< term if extra payments)
  pmiEndsMonth: number | null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const safe = (n: number) => (Number.isFinite(n) ? n : 0);

/** Level P&I payment that amortizes `balance` over `n` months at monthly rate `r`. */
export function amortizedPayment(balance: number, r: number, n: number): number {
  if (n <= 0 || balance <= 0) return 0;
  if (r === 0) return balance / n;
  return (balance * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

/**
 * Build the annual-rate path (one entry per month). Fixed loans are flat. ARMs
 * hold the intro rate, then step toward the fully-indexed rate (index + margin)
 * — which may be higher OR lower than the intro rate — by at most the initial /
 * periodic cap per adjustment, never exceeding the lifetime cap and floored at
 * the margin (a simplified ARM floor).
 */
export function buildRateSchedule(inp: LoanInputs, months: number): number[] {
  const start = inp.baseRatePct + inp.occupancyRateAdjPct;
  if (inp.loanType === "fixed") return Array(months).fill(start);

  const { introYears, adjustEveryYears, indexPct, marginPct, capInitialPct, capPeriodicPct, capLifetimePct } = inp.arm;
  const introMonths = Math.max(0, Math.round(introYears * 12));
  const adjMonths = Math.max(1, Math.round(adjustEveryYears * 12));
  const fullyIndexed = indexPct + marginPct;
  const lifetimeMax = start + capLifetimePct;

  const rates: number[] = [];
  let current = start;
  let adjustments = 0;
  for (let m = 1; m <= months; m++) {
    if (m > introMonths && (m - introMonths - 1) % adjMonths === 0) {
      // adjustment month
      const cap = adjustments === 0 ? capInitialPct : capPeriodicPct;
      const target = clamp(fullyIndexed, current - cap, current + cap);
      current = clamp(target, marginPct, lifetimeMax); // floor at margin, ceiling at lifetime
      adjustments++;
    }
    rates.push(current);
  }
  return rates;
}

/**
 * Amortize the loan over a monthly rate path, recasting the P&I payment over the
 * remaining term whenever the rate changes (standard ARM behavior), applying
 * extra principal, and dropping PMI once equity reaches 20%.
 */
export function amortize(inp: LoanInputs): Amortization {
  const loanAmount = Math.max(0, inp.homePrice - inp.downPayment);
  const term = Math.max(0, Math.round(inp.termYears * 12));
  const rates = buildRateSchedule(inp, term);
  const pmiMonthly = inp.pmiApplies ? (inp.pmiAnnualPct / 100) * loanAmount / 12 : 0;
  const pmiDropBalance = inp.homePrice * 0.8;

  const out: Amortization = {
    loanAmount, months: [], schedule: [], firstPI: 0, maxPI: 0,
    totalInterest: 0, totalPmi: 0, payoffMonths: 0, pmiEndsMonth: null,
  };
  if (loanAmount <= 0 || term === 0) return out;

  let balance = loanAmount;
  let payment = amortizedPayment(balance, rates[0] / 100 / 12, term);
  let prevRate = rates[0];
  let yr: YearRow = { year: 1, principal: 0, interest: 0, pmi: 0, balance };

  for (let m = 1; m <= term && balance > 0.005; m++) {
    const rate = rates[m - 1];
    const r = rate / 100 / 12;
    if (rate !== prevRate) {
      payment = amortizedPayment(balance, r, term - (m - 1)); // recast over remaining months
      prevRate = rate;
    }
    const interest = balance * r;
    let principal = payment - interest;

    // One-time extra applied in month 1; recurring extra every month.
    let extra = inp.extraMonthly + (m === 1 ? inp.oneTimeExtra : 0);
    if (principal + extra > balance) {
      // final payment — don't overpay
      extra = Math.max(0, balance - principal);
      if (principal > balance) principal = balance;
    }
    // Actual P&I paid this month (the final month may be less than the scheduled
    // level payment); keep rows consistent (payment === principal + interest).
    const paidPI = principal + interest;

    const endBalance = Math.max(0, balance - principal - extra);
    // PMI drops once equity reaches 20% — decide on the END-of-month balance so
    // it isn't charged in the month the balance crosses ≤ 80% LTV.
    const pmi = endBalance > pmiDropBalance ? pmiMonthly : 0;
    if (pmi === 0 && pmiMonthly > 0 && out.pmiEndsMonth === null && endBalance <= pmiDropBalance) {
      out.pmiEndsMonth = m;
    }

    balance = endBalance;

    if (m === 1) out.firstPI = payment; // scheduled level payment (for display)
    out.maxPI = Math.max(out.maxPI, payment);
    out.totalInterest += interest;
    out.totalPmi += pmi;
    out.payoffMonths = m;

    out.months.push({ month: m, rate, payment: paidPI, principal, interest, pmi, extra, balance });

    yr.principal += principal + extra;
    yr.interest += interest;
    yr.pmi += pmi;
    yr.balance = balance;
    if (m % 12 === 0 || balance <= 0.005 || m === term) {
      out.schedule.push({ ...yr });
      yr = { year: Math.ceil(m / 12) + 1, principal: 0, interest: 0, pmi: 0, balance };
    }
  }
  return out;
}

/** Monthly non-P&I housing costs. */
export function monthlyEscrow(inp: LoanInputs, currentPmi: number) {
  const tax = (inp.propertyTaxAnnualPct / 100) * inp.homePrice / 12;
  const insurance = inp.insuranceAnnual / 12;
  return { tax: safe(tax), insurance: safe(insurance), hoa: safe(inp.hoaMonthly), pmi: safe(currentPmi) };
}

/**
 * Effective APR: the rate that discounts the actual P&I payment stream back to
 * the net proceeds (loan amount minus prepaid finance charges: points +
 * closing costs). Solved by bisection. For ARMs this uses the projected
 * payment path, so it's an estimate.
 */
export function computeApr(inp: LoanInputs, am: Amortization): number {
  if (am.loanAmount <= 0 || am.months.length === 0) return 0;
  const financeCharge = (inp.pointsPct / 100) * am.loanAmount + inp.closingCosts;
  const net = am.loanAmount - financeCharge;
  if (net <= 0) return 0;
  const flows = am.months.map((mo) => mo.payment); // P&I only

  const pv = (monthlyRate: number) =>
    flows.reduce((acc, pay, i) => acc + pay / (1 + monthlyRate) ** (i + 1), 0);

  // pv decreases as the monthly rate rises. Grow the upper bound until pv(hi)
  // brackets net (needed when heavy prepaid charges make net small), capped to
  // avoid a runaway; then bisect.
  let lo = 0, hi = 1;
  while (pv(hi) > net && hi < 1e4) hi *= 2;
  if (pv(hi) > net) return hi * 12 * 100; // net ≈ 0 — root beyond the cap; return it
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > net) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 12 * 100;
}

export interface PointsBreakeven {
  monthlySavings: number | null;
  breakevenMonths: number | null;
}

/** Break-even for points: extra upfront cost ÷ monthly payment reduction vs 0 points. */
export function pointsBreakeven(withPoints: number, withoutPoints: number, upfront: number): PointsBreakeven {
  const monthlySavings = withoutPoints - withPoints;
  if (upfront <= 0 || monthlySavings <= 0) return { monthlySavings: monthlySavings > 0 ? monthlySavings : null, breakevenMonths: null };
  return { monthlySavings, breakevenMonths: upfront / monthlySavings };
}
