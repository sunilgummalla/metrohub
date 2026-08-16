import { useMemo, useState } from "react";
import {
  amortize, computeApr, monthlyEscrow, pointsBreakeven,
  type LoanInputs, type Occupancy, type LoanType,
} from "./finance";
import "./housing-loan.css";

// Hoisted formatters — reused across renders (cheaper than per-call construction).
const FMT0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const FMT2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const money = (n: number) => FMT0.format(Number.isFinite(n) ? n : 0);
const money2 = (n: number) => FMT2.format(Number.isFinite(n) ? n : 0);
const pct = (n: number, d = 1) => `${(Number.isFinite(n) ? n : 0).toFixed(d)}%`;

/** Illustrative per-occupancy defaults that seed editable fields (not financial advice). */
const OCC: Record<Occupancy, { label: string; minDownPct: number; rateAdjPct: number; pmi: boolean }> = {
  primary: { label: "Primary", minDownPct: 5, rateAdjPct: 0, pmi: true },
  secondary: { label: "Secondary", minDownPct: 10, rateAdjPct: 0.375, pmi: true },
  vacation: { label: "Vacation", minDownPct: 10, rateAdjPct: 0.375, pmi: true },
  investment: { label: "Investment", minDownPct: 20, rateAdjPct: 0.75, pmi: false },
};

// ── small field helpers ──────────────────────────────────────────────────────
function Field(props: {
  label: string; value: number; onChange: (n: number) => void;
  prefix?: string; suffix?: string; step?: number; min?: number; max?: number; hint?: string;
}) {
  const { label, value, onChange, prefix, suffix, step = 1, min = 0, max, hint } = props;
  return (
    <label className="hlField">
      <span className="hlLabel">{label}{hint && <span className="hlMuted"> · {hint}</span>}</span>
      <div className="hlInput">
        {prefix && <span className="hlAffix">{prefix}</span>}
        <input
          type="number" value={value} step={step} min={min} max={max}
          onChange={(e) => { const n = Number(e.target.value); onChange(Number.isFinite(n) ? Math.max(min, max != null ? Math.min(max, n) : n) : min); }}
          aria-label={label}
        />
        {suffix && <span className="hlAffix">{suffix}</span>}
      </div>
    </label>
  );
}

export function HousingLoanApp() {
  const [occ, setOcc] = useState<Occupancy>("primary");
  const [price, setPrice] = useState(450000);
  const [down, setDown] = useState(90000);
  const [years, setYears] = useState(30);

  const [loanType, setLoanType] = useState<LoanType>("fixed");
  const [rate, setRate] = useState(6.5);
  const [occRateAdj, setOccRateAdj] = useState(0);

  // ARM
  const [introYears, setIntroYears] = useState(5);
  const [adjEvery, setAdjEvery] = useState(1);
  const [indexPct, setIndexPct] = useState(4.5);
  const [marginPct, setMarginPct] = useState(2.75);
  const [capInitial, setCapInitial] = useState(2);
  const [capPeriodic, setCapPeriodic] = useState(1);
  const [capLifetime, setCapLifetime] = useState(5);

  // PITI
  const [taxPct, setTaxPct] = useState(1.1);
  const [insAnnual, setInsAnnual] = useState(1800);
  const [hoa, setHoa] = useState(0);
  const [pmiPct, setPmiPct] = useState(0.6);

  // Extra + costs
  const [extra, setExtra] = useState(0);
  const [oneTime, setOneTime] = useState(0);
  const [points, setPoints] = useState(0);
  const [closing, setClosing] = useState(6000);
  const [rateNoPoints, setRateNoPoints] = useState(0);

  // Qualification
  const [income, setIncome] = useState(11000);
  const [otherDebts, setOtherDebts] = useState(600);
  const [dtiCap, setDtiCap] = useState(43);
  const [rent, setRent] = useState(3200);
  const [expensePct, setExpensePct] = useState(25);
  const [dscrMin, setDscrMin] = useState(1.2);

  const [showTable, setShowTable] = useState(false);

  const chooseOcc = (o: Occupancy) => {
    setOcc(o);
    setOccRateAdj(OCC[o].rateAdjPct);
    const minDown = Math.round((price * OCC[o].minDownPct) / 100);
    setDown((d) => Math.max(d, minDown));
  };

  // Clamp the down payment when the price drops below it, so derived state
  // (loan amount, down %) can't go invalid.
  const setHomePrice = (n: number) => {
    setPrice(n);
    setDown((d) => Math.min(d, n));
  };

  const loanAmount = Math.max(0, price - down);
  const downPct = price > 0 ? (down / price) * 100 : 0;
  const pmiApplies = OCC[occ].pmi && downPct < 20;
  const isInvestment = occ === "investment";

  const inp: LoanInputs = {
    homePrice: price, downPayment: down, termYears: years,
    loanType, baseRatePct: rate, occupancyRateAdjPct: occRateAdj,
    arm: { introYears, adjustEveryYears: adjEvery, indexPct, marginPct, capInitialPct: capInitial, capPeriodicPct: capPeriodic, capLifetimePct: capLifetime },
    propertyTaxAnnualPct: taxPct, insuranceAnnual: insAnnual, hoaMonthly: hoa, pmiAnnualPct: pmiPct, pmiApplies,
    extraMonthly: extra, oneTimeExtra: oneTime, pointsPct: points, closingCosts: closing,
  };

  const am = useMemo(() => amortize(inp), [price, down, years, loanType, rate, occRateAdj, introYears, adjEvery, indexPct, marginPct, capInitial, capPeriodic, capLifetime, taxPct, insAnnual, hoa, pmiPct, pmiApplies, extra, oneTime]);
  // APR is a property of the loan terms, so compute it from a schedule WITHOUT
  // extra principal — otherwise toggling prepayments would shift the APR.
  const amForApr = useMemo(() => amortize({ ...inp, extraMonthly: 0, oneTimeExtra: 0 }), [price, down, years, loanType, rate, occRateAdj, introYears, adjEvery, indexPct, marginPct, capInitial, capPeriodic, capLifetime, taxPct, insAnnual, hoa, pmiPct, pmiApplies]);
  const apr = useMemo(() => computeApr(inp, amForApr), [amForApr, points, closing]);

  const firstPmi = am.months[0]?.pmi ?? 0;
  const esc = monthlyEscrow(inp, firstPmi);
  const totalMonthly = am.firstPI + esc.tax + esc.insurance + esc.hoa + esc.pmi;
  const cashToClose = down + (points / 100) * loanAmount + closing;
  const principalShare = am.totalInterest + loanAmount > 0 ? (loanAmount / (loanAmount + am.totalInterest)) * 100 : 0;

  // break-even for points (needs the alternative no-points rate)
  const be = useMemo(() => {
    if (rateNoPoints <= 0) return null;
    const noPts = amortize({ ...inp, baseRatePct: rateNoPoints, pointsPct: 0 });
    return pointsBreakeven(am.firstPI, noPts.firstPI, (points / 100) * loanAmount);
  }, [rateNoPoints, am.firstPI, points, loanAmount]);

  // qualification
  const hasIncome = income > 0;
  const dtiBack = hasIncome ? ((totalMonthly + otherDebts) / income) * 100 : 0;
  const dtiFront = hasIncome ? (totalMonthly / income) * 100 : 0;
  const dtiPass = hasIncome && dtiBack <= dtiCap; // no income → not a pass
  const effRent = rent * (1 - expensePct / 100);
  const dscr = totalMonthly > 0 ? effRent / totalMonthly : 0;
  const dscrPass = dscr >= dscrMin;

  return (
    <div className="hlApp">
      <div className="hlDisclaimer">Estimates for illustration only — not financial advice. Every value is editable.</div>

      <div className="hlGrid">
        {/* ══ LEFT: inputs ══ */}
        <div className="hlInputsCol">
          {/* Property & loan */}
          <section className="hlCard">
            <h3 className="hlH3">Property &amp; loan</h3>
            <div className="hlSeg" role="group" aria-label="Occupancy">
              {(Object.keys(OCC) as Occupancy[]).map((o) => (
                <button key={o} type="button" aria-pressed={occ === o}
                  className={`hlSegBtn ${occ === o ? "hlSegOn" : ""}`} onClick={() => chooseOcc(o)}>
                  {OCC[o].label}
                </button>
              ))}
            </div>
            <Field label="Home price" prefix="$" step={5000} value={price} onChange={setHomePrice} />
            <Field label="Down payment" prefix="$" step={5000} max={price} value={down} onChange={setDown}
              hint={`${pct(downPct)} · min ${OCC[occ].minDownPct}%`} />
            <div className="hlPresets">
              {[OCC[occ].minDownPct, 10, 20].filter((v, i, a) => a.indexOf(v) === i).map((p) => (
                <button key={p} type="button" className={`hlChip ${Math.round(downPct) === p ? "hlChipOn" : ""}`}
                  onClick={() => setDown(Math.round((price * p) / 100))}>{p}%</button>
              ))}
            </div>

            <div className="hlSeg hlSeg2">
              <button type="button" className={`hlSegBtn ${loanType === "fixed" ? "hlSegOn" : ""}`} onClick={() => setLoanType("fixed")}>Fixed-rate</button>
              <button type="button" className={`hlSegBtn ${loanType === "arm" ? "hlSegOn" : ""}`} onClick={() => setLoanType("arm")}>ARM</button>
            </div>
            <div className="hlRow">
              <Field label={loanType === "arm" ? "Intro rate" : "Interest rate"} suffix="%" step={0.05} value={rate} onChange={setRate} />
              <Field label="Occupancy rate adj." suffix="%" step={0.125} value={occRateAdj} onChange={setOccRateAdj} hint="pricing add-on" />
            </div>
            <Field label="Term" suffix="yrs" step={1} min={1} max={40} value={years} onChange={(n) => setYears(Math.round(n))} />

            {loanType === "arm" && (
              <div className="hlSub">
                <div className="hlRow">
                  <Field label="Intro period" suffix="yrs" value={introYears} onChange={(n) => setIntroYears(Math.round(n))} min={1} />
                  <Field label="Adjusts every" suffix="yrs" value={adjEvery} onChange={(n) => setAdjEvery(Math.round(n))} min={1} />
                </div>
                <div className="hlRow">
                  <Field label="Index" suffix="%" step={0.05} value={indexPct} onChange={setIndexPct} />
                  <Field label="Margin" suffix="%" step={0.05} value={marginPct} onChange={setMarginPct} />
                </div>
                <div className="hlRow3">
                  <Field label="Cap: initial" suffix="%" step={0.5} value={capInitial} onChange={setCapInitial} />
                  <Field label="periodic" suffix="%" step={0.5} value={capPeriodic} onChange={setCapPeriodic} />
                  <Field label="lifetime" suffix="%" step={0.5} value={capLifetime} onChange={setCapLifetime} />
                </div>
                <p className="hlNote">Fully-indexed ≈ {pct(indexPct + marginPct, 2)} · caps limit each move.</p>
              </div>
            )}
          </section>

          {/* Monthly costs */}
          <section className="hlCard">
            <h3 className="hlH3">Monthly costs</h3>
            <div className="hlRow">
              <Field label="Property tax" suffix="%/yr" step={0.05} value={taxPct} onChange={setTaxPct} />
              <Field label="Home insurance" prefix="$" suffix="/yr" step={100} value={insAnnual} onChange={setInsAnnual} />
            </div>
            <div className="hlRow">
              <Field label="HOA" prefix="$" suffix="/mo" step={25} value={hoa} onChange={setHoa} />
              <Field label="PMI rate" suffix="%/yr" step={0.05} value={pmiPct} onChange={setPmiPct} hint={pmiApplies ? "applies" : "n/a"} />
            </div>
          </section>

          {/* Extra + costs */}
          <section className="hlCard">
            <h3 className="hlH3">Extra payments &amp; closing</h3>
            <div className="hlRow">
              <Field label="Extra / month" prefix="$" step={50} value={extra} onChange={setExtra} />
              <Field label="One-time extra" prefix="$" step={1000} value={oneTime} onChange={setOneTime} />
            </div>
            <div className="hlRow">
              <Field label="Discount points" suffix="%" step={0.25} value={points} onChange={setPoints} />
              <Field label="Closing costs" prefix="$" step={500} value={closing} onChange={setClosing} />
            </div>
            <Field label="Rate without points" suffix="%" step={0.05} value={rateNoPoints} onChange={setRateNoPoints} hint="optional · for break-even" />
          </section>

          {/* Qualification */}
          <section className="hlCard">
            <h3 className="hlH3">Qualification · {isInvestment ? "DSCR" : "DTI / DSR"}</h3>
            {isInvestment ? (
              <>
                <div className="hlRow">
                  <Field label="Expected rent" prefix="$" suffix="/mo" step={100} value={rent} onChange={setRent} />
                  <Field label="Expenses/vacancy" suffix="%" step={1} min={0} max={100} value={expensePct} onChange={setExpensePct} />
                </div>
                <Field label="DSCR minimum" step={0.05} value={dscrMin} onChange={setDscrMin} hint="lender threshold" />
              </>
            ) : (
              <>
                <div className="hlRow">
                  <Field label="Gross income" prefix="$" suffix="/mo" step={250} value={income} onChange={setIncome} />
                  <Field label="Other debts" prefix="$" suffix="/mo" step={50} value={otherDebts} onChange={setOtherDebts} />
                </div>
                <Field label="Max DTI (back-end)" suffix="%" step={1} value={dtiCap} onChange={setDtiCap} hint="lender cap" />
              </>
            )}
          </section>
        </div>

        {/* ══ RIGHT: results ══ */}
        <div className="hlResultsCol">
          <section className="hlCard hlHero">
            <span className="hlLabel">Estimated total monthly (PITI)</span>
            <span className="hlHeroValue">{money2(totalMonthly)}</span>
            {loanType === "arm" && (
              <span className="hlMuted">Intro P&amp;I {money(am.firstPI)} → max P&amp;I {money(am.maxPI)}</span>
            )}
            <div className="hlBreak">
              <span><i className="hlDotP" aria-hidden="true" /> P&amp;I {money(am.firstPI)}</span>
              <span><i className="hlDotT" aria-hidden="true" /> Tax {money(esc.tax)}</span>
              <span><i className="hlDotI2" aria-hidden="true" /> Ins {money(esc.insurance)}</span>
              {esc.pmi > 0 && <span><i className="hlDotM" aria-hidden="true" /> PMI {money(esc.pmi)}</span>}
              {esc.hoa > 0 && <span><i className="hlDotH" aria-hidden="true" /> HOA {money(esc.hoa)}</span>}
            </div>
          </section>

          <section className="hlCard hlSummary">
            <div className="hlKV"><span>Loan amount</span><b>{money(loanAmount)}</b></div>
            <div className="hlKV"><span>Cash to close</span><b>{money(cashToClose)}</b></div>
            <div className="hlKV"><span>Total interest</span><b className="hlInterest">{money(am.totalInterest)}</b></div>
            <div className="hlKV"><span>Total of payments</span><b>{money(loanAmount + am.totalInterest + am.totalPmi)}</b></div>
            <div className="hlKV"><span>Effective APR</span><b>{pct(apr, 3)}</b></div>
            {(extra > 0 || oneTime > 0) && am.payoffMonths < years * 12 && (
              <div className="hlKV"><span>Payoff</span><b>{(am.payoffMonths / 12).toFixed(1)} yrs <span className="hlSaved">({(years - am.payoffMonths / 12).toFixed(1)} yrs early)</span></b></div>
            )}
            {am.pmiEndsMonth && <div className="hlKV"><span>PMI drops</span><b>year {Math.ceil(am.pmiEndsMonth / 12)}</b></div>}
            {be?.breakevenMonths != null && <div className="hlKV"><span>Points break-even</span><b>{Math.ceil(be.breakevenMonths)} mo</b></div>}

            <div className="hlSplitBar" aria-hidden="true">
              <span className="hlSplitP" style={{ width: `${principalShare}%` }} />
              <span className="hlSplitI" style={{ width: `${100 - principalShare}%` }} />
            </div>
            <div className="hlSplitLegend"><span>Principal {money(loanAmount)}</span><span>Interest {money(am.totalInterest)}</span></div>
          </section>

          {/* Qualification result */}
          <section className={`hlCard hlQual ${isInvestment ? (dscrPass ? "hlPass" : "hlFail") : !hasIncome ? "" : dtiPass ? "hlPass" : "hlFail"}`}>
            {isInvestment ? (
              <>
                <div className="hlQualTop">
                  <span className="hlLabel">DSCR</span>
                  <span className="hlQualValue">{dscr.toFixed(2)}×</span>
                  <span className={`hlBadge ${dscrPass ? "ok" : "no"}`}>{dscrPass ? "Qualifies" : "Below min"}</span>
                </div>
                <p className="hlNote">Net rent {money(effRent)}/mo ÷ debt service {money(totalMonthly)}/mo · needs ≥ {dscrMin.toFixed(2)}×</p>
              </>
            ) : (
              <>
                <div className="hlQualTop">
                  <span className="hlLabel">DTI (back-end)</span>
                  <span className="hlQualValue">{hasIncome ? pct(dtiBack) : "—"}</span>
                  {hasIncome && <span className={`hlBadge ${dtiPass ? "ok" : "no"}`}>{dtiPass ? "Within cap" : "Over cap"}</span>}
                </div>
                <p className="hlNote">{hasIncome ? `Housing ${pct(dtiFront)} front-end · needs ≤ ${dtiCap}% back-end` : "Enter gross income to check DTI"}</p>
              </>
            )}
          </section>

          <button type="button" className="hlToggle" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
            {showTable ? "Hide" : "Show"} amortization schedule
          </button>
        </div>
      </div>

      {showTable && am.schedule.length > 0 && (
        <section className="hlCard hlTableCard">
          <div className="hlTableScroll">
            <table className="hlTable">
              <thead><tr><th>Year</th><th className="hlR">Principal</th><th className="hlR">Interest</th><th className="hlR">PMI</th><th className="hlR">Balance</th></tr></thead>
              <tbody>
                {am.schedule.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="hlR">{money(row.principal)}</td>
                    <td className="hlR hlInterest">{money(row.interest)}</td>
                    <td className="hlR">{row.pmi > 0 ? money(row.pmi) : "—"}</td>
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
