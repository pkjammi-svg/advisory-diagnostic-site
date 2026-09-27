// Simple 5-year P&L and cash projection from the startup intake form.
// Everything is annual. Assumptions are editable in the admin Analysis tools.

export function defaultAssumptions(inputs = {}) {
  const n = (k, d = 0) => {
    const v = Number(inputs[k]);
    return Number.isFinite(v) ? v : d;
  };
  return {
    price: n("price_per_unit"),
    unitsPerMonth: n("units_month1"),
    growthPct: n("growth_rate", 20),
    variableCostPct: n("variable_cost_pct", 40),
    fixedMonthly: n("monthly_fixed_costs"),
    salariesMonthly: n("monthly_salaries"),
    salaryInflationPct: 8,
    marketingYear1: n("marketing_budget"),
    marketingPctOfRevenue: 5,
    capex: n("startup_capex"),
    depreciationYears: 5,
    taxPct: 25,
    openingCash: n("funding_available")
  };
}

export function project(a, years = 5) {
  const rows = [];
  let cash = a.openingCash - a.capex;
  let cumulativeProfit = 0;
  let breakEvenYear = null;
  let lowestCash = cash;
  const depreciation = a.depreciationYears > 0 ? a.capex / a.depreciationYears : 0;

  for (let y = 1; y <= years; y++) {
    const units = a.unitsPerMonth * 12 * Math.pow(1 + a.growthPct / 100, y - 1);
    const revenue = units * a.price;
    const directCost = revenue * (a.variableCostPct / 100);
    const grossProfit = revenue - directCost;
    const salaries = a.salariesMonthly * 12 * Math.pow(1 + a.salaryInflationPct / 100, y - 1);
    const fixed = a.fixedMonthly * 12;
    const marketing = y === 1 && a.marketingYear1 ? a.marketingYear1 : revenue * (a.marketingPctOfRevenue / 100);
    const ebitda = grossProfit - salaries - fixed - marketing;
    const dep = y <= a.depreciationYears ? depreciation : 0;
    const ebt = ebitda - dep;
    const tax = ebt > 0 ? ebt * (a.taxPct / 100) : 0;
    const netProfit = ebt - tax;
    cash += netProfit + dep;
    cumulativeProfit += netProfit;
    lowestCash = Math.min(lowestCash, cash);
    if (breakEvenYear === null && netProfit > 0) breakEvenYear = y;
    rows.push({
      year: y, units, revenue, directCost, grossProfit,
      grossMarginPct: revenue ? (grossProfit / revenue) * 100 : 0,
      salaries, fixed, marketing, ebitda, depreciation: dep, tax, netProfit,
      netMarginPct: revenue ? (netProfit / revenue) * 100 : 0,
      closingCash: cash
    });
  }
  return {
    rows,
    breakEvenYear,
    cumulativeProfit,
    fundingGap: lowestCash < 0 ? -lowestCash : 0
  };
}

export const PROJECTION_LINES = [
  ["units", "Units / customers sold"],
  ["revenue", "Revenue"],
  ["directCost", "Direct costs"],
  ["grossProfit", "Gross profit"],
  ["grossMarginPct", "Gross margin %"],
  ["salaries", "Salaries"],
  ["fixed", "Fixed overheads"],
  ["marketing", "Marketing"],
  ["ebitda", "EBITDA"],
  ["depreciation", "Depreciation"],
  ["tax", "Tax"],
  ["netProfit", "Net profit"],
  ["netMarginPct", "Net margin %"],
  ["closingCash", "Closing cash"]
];
