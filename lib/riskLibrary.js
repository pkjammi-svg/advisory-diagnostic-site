// Starter risks and controls per process, used to seed a Risk & Control Matrix
// for the "Risk Assessment, SOPs & Controls" service. The consultant tailors it.

export const RISK_LIBRARY = {
  "Procure to pay": [
    ["Purchases made without approval or outside budget", "Purchase orders approved per delegation of authority before ordering", "Preventive"],
    ["Payment to fictitious or duplicate vendors", "Vendor master changes approved and reviewed monthly; duplicate check on vendor bank details", "Preventive"],
    ["Paying for goods not received or at wrong price", "Three-way match (PO, goods receipt, invoice) before payment", "Preventive"]
  ],
  "Order to cash": [
    ["Sales to customers who cannot pay", "Credit limits set and approved before first sale; blocked on breach", "Preventive"],
    ["Revenue recorded in the wrong period", "Cut-off review of dispatches vs invoices at month end", "Detective"],
    ["Receivables not collected on time", "Weekly ageing review with follow-up owner for items over 60 days", "Detective"]
  ],
  "Record to report (finance close)": [
    ["Errors or manipulation through manual journal entries", "Journals above threshold reviewed and approved by a second person", "Preventive"],
    ["Balance sheet accounts not reconciled", "Monthly reconciliation of bank, receivables, payables and inventory with sign-off", "Detective"],
    ["Late or inaccurate management reporting", "Close calendar with owners and a variance review of P&L vs budget", "Detective"]
  ],
  "Payroll & HR": [
    ["Ghost employees or unauthorised pay changes", "HR master changes require documented approval; payroll register reviewed vs headcount", "Preventive"],
    ["Incorrect statutory deductions (PF, ESI, TDS, etc.)", "Statutory computation reviewed before filing; compliance calendar tracked", "Detective"],
    ["Access not removed for leavers", "Exit checklist includes system-access removal within 1 day", "Preventive"]
  ],
  "Inventory & warehouse": [
    ["Stock loss or theft", "Periodic cycle counts with investigation of variances above threshold", "Detective"],
    ["Obsolete or slow-moving stock not identified", "Quarterly ageing review and provisioning", "Detective"],
    ["Goods issued without authorisation", "Material issue against approved requisition only", "Preventive"]
  ],
  "IT access & security": [
    ["Excessive or inappropriate user access", "Quarterly user-access review signed off by process owners", "Detective"],
    ["Data loss from system failure or ransomware", "Automated daily backups with quarterly restore test", "Corrective"],
    ["Shared or weak passwords", "Password policy and multi-factor authentication enforced", "Preventive"]
  ],
  "Treasury & banking": [
    ["Unauthorised payments from bank accounts", "Dual authorisation on bank payments above threshold", "Preventive"],
    ["Cash shortfall not anticipated", "Rolling 13-week cash-flow forecast reviewed weekly", "Detective"],
    ["Bank balances not matching books", "Monthly bank reconciliation reviewed and signed", "Detective"]
  ],
  "Regulatory compliance": [
    ["Missed statutory filings or deadlines", "Compliance calendar with owners and monthly status review", "Preventive"],
    ["Changes in law not identified", "Quarterly regulatory update review with advisors", "Detective"],
    ["Penalties from non-compliance", "Periodic compliance self-assessment and certification by process owners", "Detective"]
  ]
};

export function starterMatrix(processes = []) {
  const rows = [];
  let n = 1;
  for (const p of processes) {
    for (const [risk, control, type] of RISK_LIBRARY[p] || []) {
      rows.push({ id: `R${n++}`, process: p, risk, control, type });
    }
  }
  return rows;
}

export function matrixToMarkdown(rows) {
  const head = "| # | Process | Risk | Control | Control type | Owner | Frequency |\n|---|---|---|---|---|---|---|";
  return [head, ...rows.map((r) => `| ${r.id} | ${r.process} | ${r.risk} | ${r.control} | ${r.type} |  |  |`)].join("\n");
}
