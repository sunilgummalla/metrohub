import { useMemo, useState } from "react";
import "./housing-loan.css";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );
const money2 = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

interface YearRow {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}

interface Result {
  loanAmount: number;
  monthly: number;
  totalInterest: number;
  totalPaid: number;
  schedule: YearRow[];
}

/** Standard amortized-loan math. Returns per-year aggregates and totals. */
function compute(loanAmount: number, annualRatePct: number, years: number): Result {
  const n = Math.max(0, Math.round(years * 12));
  const r = annualRatePct / 100 / 12;
  const empty: Result = { loanAmount, monthly: 0, totalInterest: 0, totalPaid: 0, schedule: [] };
  if (loanAmount <= 0 || n === 0) return empty;

  const monthly = r === 0 ? loanAmount / n : (loanAmount * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  if (!Number.isFinite(monthly)) return empty;

  const schedule: YearRow[] = [];
  let balance = loanAmount;
  let yearPrincipal = 0;
  let yearInterest = 0;
  let totalInterest = 0;

  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    let principal = monthly - interest;
    if (principal > balance) principal = balance; // final payment
    balance = Math.max(0, balance - principal);
    yearPrincipal += principal;
    yearInterest += interest;
    totalInterest += interest;
    if (m % 12 === 0 || m === n) {
      schedule.push({ year: Math.ceil(m / 12), principal: yearPrincipal, interest: yearInterest, balance });
      yearPrincipal = 0;
      yearInterest = 0;
    }
  }

  return { loanAmount, monthly, totalInterest, totalPaid: loanAmount + totalInterest, schedule };
}

const DOWN_PRESETS = [5, 10, 20];

export function HousingLoanApp() {
  const [price, setPrice] = useState(450000);
  const [down, setDown] = useState(90000);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(30);
  const [showTable, setShowTable] = useState(false);

  const loanAmount = Math.max(0, price - down);
  const downPct = price > 0 ? (down / price) * 100 : 0;

  const result = useMemo(() => compute(loanAmount, rate, years), [loanAmount, rate, years]);
  const principalShare = result.totalPaid > 0 ? (result.loanAmount / result.totalPaid) * 100 : 0;

  const setDownByPct = (pct: number) => setDown(Math.round((price * pct) / 100));

  return (
    <div className="hlApp">
      <div className="hlGrid">
        {/* ── Inputs ── */}
        <section className="hlCard hlInputs" aria-label="Loan inputs">
          <h2 className="hlH2">Loan details</h2>

          <label className="hlField">
            <span className="hlLabel">Home price</span>
            <div className="hlMoneyInput">
              <span className="hlPrefix">$</span>
              <input
                type="number" min={0} step={5000} value={price}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                aria-label="Home price"
              />
            </div>
          </label>

          <label className="hlField">
            <span className="hlLabel">
              Down payment <span className="hlMuted">· {downPct.toFixed(1)}%</span>
            </span>
            <div className="hlMoneyInput">
              <span className="hlPrefix">$</span>
              <input
                type="number" min={0} max={price} step={5000} value={down}
                onChange={(e) => setDown(Math.min(price, Math.max(0, Number(e.target.value))))}
                aria-label="Down payment"
              />
            </div>
            <div className="hlPresets">
              {DOWN_PRESETS.map((p) => (
                <button
                  key={p} type="button"
                  className={`hlChip ${Math.round(downPct) === p ? "hlChipOn" : ""}`}
                  onClick={() => setDownByPct(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
          </label>

          <div className="hlRow">
            <label className="hlField">
              <span className="hlLabel">Interest rate</span>
              <div className="hlMoneyInput">
                <input
                  type="number" min={0} max={30} step={0.05} value={rate}
                  onChange={(e) => setRate(Math.max(0, Number(e.target.value)))}
                  aria-label="Annual interest rate"
                />
                <span className="hlSuffix">%</span>
              </div>
            </label>

            <label className="hlField">
              <span className="hlLabel">Term</span>
              <div className="hlMoneyInput">
                <input
                  type="number" min={1} max={40} step={1} value={years}
                  onChange={(e) => setYears(Math.max(1, Math.round(Number(e.target.value))))}
                  aria-label="Loan term in years"
                />
                <span className="hlSuffix">yrs</span>
              </div>
            </label>
          </div>

          <p className="hlLoanLine">
            Loan amount <b>{money(loanAmount)}</b>
          </p>
        </section>

        {/* ── Results ── */}
        <section className="hlCard hlResults" aria-label="Results">
          <div className="hlPayment">
            <span className="hlLabel">Monthly payment</span>
            <span className="hlPaymentValue">{money2(result.monthly)}</span>
            <span className="hlMuted">principal &amp; interest</span>
          </div>

          <div className="hlStats">
            <div className="hlStat">
              <span className="hlStatLabel">Total interest</span>
              <span className="hlStatValue hlInterest">{money(result.totalInterest)}</span>
            </div>
            <div className="hlStat">
              <span className="hlStatLabel">Total of payments</span>
              <span className="hlStatValue">{money(result.totalPaid)}</span>
            </div>
          </div>

          {result.totalPaid > 0 && (
            <div className="hlSplit" aria-hidden="true">
              <div className="hlSplitBar">
                <span className="hlSplitPrincipal" style={{ width: `${principalShare}%` }} />
                <span className="hlSplitInterest" style={{ width: `${100 - principalShare}%` }} />
              </div>
              <div className="hlSplitLegend">
                <span><i className="hlDotP" /> Principal {money(result.loanAmount)}</span>
                <span><i className="hlDotI" /> Interest {money(result.totalInterest)}</span>
              </div>
            </div>
          )}

          <button
            type="button" className="hlToggle"
            onClick={() => setShowTable((s) => !s)}
            aria-expanded={showTable}
          >
            {showTable ? "Hide" : "Show"} amortization schedule
          </button>
        </section>
      </div>

      {showTable && result.schedule.length > 0 && (
        <section className="hlCard hlTableCard" aria-label="Amortization schedule">
          <div className="hlTableScroll">
            <table className="hlTable">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="hlR">Principal paid</th>
                  <th className="hlR">Interest paid</th>
                  <th className="hlR">Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="hlR">{money(row.principal)}</td>
                    <td className="hlR hlInterest">{money(row.interest)}</td>
                    <td className="hlR">{money(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
