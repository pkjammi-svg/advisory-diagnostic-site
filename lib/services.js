// The four client services. Each one defines:
//   - sections/fields: what the client fills in on the data collection page
//   - documents: what the client can upload (required or optional, sometimes
//     only when a field answer makes them relevant)
//   - deliverables: what the client receives on the solution page
//   - solutionTemplate: the starting outline for the consultant's write-up
//
// assess() compares a client's answers and uploads against these definitions
// to produce the "what you shared / what we still need" confirmation.

export const SERVICES = {
  startup: {
    key: "startup",
    number: "01",
    label: "New Business Evaluation & Investor Readiness",
    short: "New business evaluation",
    desc: "Is the idea good? Is it feasible? Get a feasibility assessment, 5-year projected financials, a marketing plan with cost analysis, and a research roadmap to test the waters.",
    deliverables: [
      "Idea & feasibility assessment",
      "5-year projected financials (P&L, cash, break-even)",
      "Marketing plan & cost analysis",
      "Market-testing and research roadmap",
      "Investor-readiness checklist"
    ],
    sections: [
      {
        title: "About the idea",
        fields: [
          { key: "business_name", label: "Business / working name", type: "text", required: true },
          { key: "idea_summary", label: "Describe the idea in a few sentences", type: "textarea", required: true },
          { key: "problem_solved", label: "What problem does it solve, and for whom?", type: "textarea", required: true },
          { key: "target_customer", label: "Who is the target customer?", type: "textarea", required: true, help: "Age, income, business type, location — be as specific as you can." },
          { key: "location", label: "Where will you operate (city / country / online)?", type: "text", required: true },
          { key: "stage", label: "Current stage", type: "select", required: true, options: ["Idea only", "Researching / validating", "Prototype or pilot", "Early customers", "Generating revenue"] }
        ]
      },
      {
        title: "Market & competition",
        fields: [
          { key: "competitors", label: "Main competitors or alternatives customers use today", type: "textarea", required: true },
          { key: "differentiation", label: "Why would customers choose you instead?", type: "textarea", required: true },
          { key: "market_size", label: "Any idea of the market size?", type: "textarea", help: "Rough numbers are fine — e.g. number of potential customers in your area." },
          { key: "validation_done", label: "What have you already done to test the idea?", type: "textarea", help: "Surveys, conversations, pre-orders, pilot sales…" }
        ]
      },
      {
        title: "Revenue assumptions",
        fields: [
          { key: "revenue_model", label: "How will you make money?", type: "select", required: true, options: ["One-time product sales", "Subscription / recurring", "Services / hourly", "Commission / marketplace", "Mixed"] },
          { key: "price_per_unit", label: "Average selling price per unit / customer / month", type: "number", required: true, prefix: "₹ / $" },
          { key: "units_month1", label: "Expected units (or customers) sold per month in year 1", type: "number", required: true },
          { key: "growth_rate", label: "Expected yearly growth in volume (%)", type: "number", required: true, suffix: "%" },
          { key: "variable_cost_pct", label: "Direct cost as % of price (materials, delivery, commissions)", type: "number", required: true, suffix: "%" }
        ]
      },
      {
        title: "Costs & funding",
        fields: [
          { key: "startup_capex", label: "One-time setup cost (equipment, fit-out, licences, website)", type: "number", required: true },
          { key: "monthly_fixed_costs", label: "Monthly fixed costs excluding salaries (rent, utilities, software)", type: "number", required: true },
          { key: "monthly_salaries", label: "Monthly salaries incl. founders (year 1)", type: "number", required: true },
          { key: "marketing_budget", label: "Planned marketing budget for year 1", type: "number" },
          { key: "funding_available", label: "Funding you already have", type: "number", required: true },
          { key: "funding_needed", label: "Additional funding you want to raise (if any)", type: "number" },
          { key: "team", label: "Founding team and key skills", type: "textarea", required: true }
        ]
      },
      {
        title: "Marketing",
        fields: [
          { key: "channels", label: "How do you plan to reach customers?", type: "multiselect", required: true, options: ["Social media", "Search / Google ads", "LinkedIn / B2B outreach", "Referrals / word of mouth", "Retail / distributors", "Events / exhibitions", "Marketplaces (Amazon etc.)", "Not sure yet"] },
          { key: "marketing_notes", label: "Anything else about your go-to-market plan?", type: "textarea" }
        ]
      },
      {
        title: "What you want from us",
        fields: [
          { key: "goals", label: "Select everything you want", type: "multiselect", required: true, options: ["Feasibility check", "5-year projected financials", "Marketing plan & cost analysis", "Market research / testing roadmap", "Investor pitch readiness"] },
          { key: "deadline", label: "Any deadline (e.g. investor meeting date)?", type: "text" }
        ]
      }
    ],
    documents: [
      { key: "pitch_deck", label: "Pitch deck or idea presentation", required: false },
      { key: "business_plan", label: "Draft business plan", required: false },
      { key: "research", label: "Market research, surveys or customer feedback", required: false },
      { key: "quotes", label: "Supplier quotations / cost estimates", required: false },
      { key: "founder_profiles", label: "Founder CVs / LinkedIn profiles", required: false }
    ],
    solutionTemplate: `## Executive summary
(Is the idea viable? One-paragraph verdict.)

## Feasibility assessment
- Market need:
- Competitive position:
- Operational feasibility:
- Financial feasibility:
- Key risks:

## 5-year projected financials
(Paste the projection table from the Analysis tools and comment on break-even and funding need.)

## Marketing plan & cost analysis
| Channel | Objective | Year-1 budget | Expected result |
|---|---|---|---|
|  |  |  |  |

## How to test the waters
1.
2.
3.

## Investor-readiness checklist
-

## Recommended next steps
1.
`
  },

  problem: {
    key: "problem",
    number: "02",
    label: "Business Problem — Root Cause & Solution",
    short: "Root cause & solution",
    desc: "Facing a problem you can't pin down? We analyse the root cause and recommend the best possible solution with a clear action plan.",
    deliverables: [
      "Problem definition",
      "Root cause analysis (5-Whys / fishbone)",
      "Evaluated solution options",
      "Recommended solution & action plan",
      "KPIs to track improvement"
    ],
    sections: [
      {
        title: "Your company",
        fields: [
          { key: "company_name", label: "Company name", type: "text", required: true },
          { key: "industry", label: "Industry", type: "text", required: true },
          { key: "company_size", label: "Number of employees", type: "select", required: true, options: ["1–10", "11–50", "51–200", "201–1000", "1000+"] },
          { key: "annual_revenue", label: "Approximate annual revenue", type: "text" }
        ]
      },
      {
        title: "The problem",
        fields: [
          { key: "problem_area", label: "Which area is the problem in?", type: "select", required: true, options: ["Sales / revenue decline", "Profitability / margins", "Cash flow", "Operations / production", "Quality / customer complaints", "People / team / turnover", "Compliance / controls", "Technology / systems", "Other"] },
          { key: "problem_statement", label: "Describe the problem in your own words", type: "textarea", required: true },
          { key: "symptoms", label: "What are you seeing? (symptoms, numbers, examples)", type: "textarea", required: true },
          { key: "impact", label: "What is it costing you? (money, customers, time)", type: "textarea", required: true },
          { key: "started_when", label: "When did it start?", type: "text", required: true },
          { key: "what_changed", label: "Anything that changed around that time?", type: "textarea", help: "New staff, pricing, supplier, system, competitor, policy…" }
        ]
      },
      {
        title: "What's been tried",
        fields: [
          { key: "tried", label: "What have you already tried, and what happened?", type: "textarea", required: true },
          { key: "suspected_causes", label: "What do you think is causing it?", type: "textarea" },
          { key: "stakeholders", label: "Who is involved or affected (teams, customers, suppliers)?", type: "textarea" }
        ]
      },
      {
        title: "Your expectations",
        fields: [
          { key: "desired_outcome", label: "What does 'solved' look like to you?", type: "textarea", required: true },
          { key: "urgency", label: "How urgent is it?", type: "select", required: true, options: ["Critical — this week", "High — this month", "Medium — this quarter", "Low — planning ahead"] }
        ]
      }
    ],
    documents: [
      { key: "problem_data", label: "Data showing the problem (sales, complaints, production or cost reports)", required: true },
      { key: "financials", label: "Recent financial statements", required: false },
      { key: "org_chart", label: "Organisation chart", required: false },
      { key: "process_docs", label: "Process documents / SOPs for the affected area", required: false },
      { key: "other_support", label: "Emails, reports or anything else relevant", required: false }
    ],
    solutionTemplate: `## Problem definition
(What the problem is — and what it is not.)

## What the data shows
-

## Root cause analysis
**5-Whys**
1. Why?
2. Why?
3. Why?
4. Why?
5. Why? → Root cause:

**Contributing factors (fishbone)**
| Category | Factor | Evidence | Confirmed? |
|---|---|---|---|
| People |  |  |  |
| Process |  |  |  |
| Technology |  |  |  |
| Market / customers |  |  |  |

## Solution options
| Option | Impact | Cost | Time | Recommended |
|---|---|---|---|---|
|  |  |  |  |  |

## Recommended solution & action plan
| # | Action | Owner | Deadline |
|---|---|---|---|
| 1 |  |  |  |

## KPIs to track
-
`
  },

  performance: {
    key: "performance",
    number: "03",
    label: "Business Performance Analysis",
    short: "Performance analysis",
    desc: "Share your accounting and business data. We summarise your business and compare customer, salesperson and production performance, costing, expenses and more.",
    deliverables: [
      "Business summary",
      "Customer performance comparison",
      "Salesperson performance comparison",
      "Production & costing analysis",
      "Expense analysis",
      "Key findings & recommendations"
    ],
    sections: [
      {
        title: "Your company",
        fields: [
          { key: "company_name", label: "Company name", type: "text", required: true },
          { key: "industry", label: "Industry / what you sell", type: "text", required: true },
          { key: "annual_revenue", label: "Approximate annual revenue", type: "text", required: true },
          { key: "employees", label: "Number of employees", type: "select", required: true, options: ["1–10", "11–50", "51–200", "201–1000", "1000+"] },
          { key: "accounting_software", label: "Accounting software", type: "select", required: true, options: ["Tally", "QuickBooks", "Zoho Books", "Xero", "SAP", "Excel only", "Other"] }
        ]
      },
      {
        title: "Scope of analysis",
        fields: [
          { key: "areas", label: "What should we analyse?", type: "multiselect", required: true, options: ["Customers", "Salespeople", "Production", "Costing / product profitability", "Expenses", "Receivables", "Inventory"] },
          { key: "period", label: "Period to analyse", type: "select", required: true, options: ["Last 12 months", "Last 2 years", "Last 3 years", "Current financial year to date"] },
          { key: "key_questions", label: "What questions do you most want answered?", type: "textarea", required: true, help: "e.g. 'Which customers are actually profitable?' 'Why are margins falling?'" },
          { key: "concerns", label: "Any areas you are already worried about?", type: "textarea" }
        ]
      }
    ],
    documents: [
      { key: "pl", label: "Profit & Loss statement(s) for the period", required: true },
      { key: "balance_sheet", label: "Balance sheet(s)", required: true },
      { key: "trial_balance", label: "Trial balance or general ledger export", required: true },
      { key: "sales_by_customer", label: "Sales register by customer (CSV/Excel)", required: true, when: { field: "areas", includes: "Customers" } },
      { key: "sales_by_salesperson", label: "Sales by salesperson (CSV/Excel)", required: true, when: { field: "areas", includes: "Salespeople" } },
      { key: "production", label: "Production reports (output, wastage, machine/labour hours)", required: true, when: { field: "areas", includes: "Production" } },
      { key: "costing", label: "Product costing / bill of materials", required: true, when: { field: "areas", includes: "Costing / product profitability" } },
      { key: "expenses", label: "Expense ledger / detailed expense report", required: true, when: { field: "areas", includes: "Expenses" } },
      { key: "ar_aging", label: "Receivables ageing report", required: true, when: { field: "areas", includes: "Receivables" } },
      { key: "inventory", label: "Inventory / stock report", required: true, when: { field: "areas", includes: "Inventory" } },
      { key: "budget", label: "Budget or targets for the period", required: false }
    ],
    solutionTemplate: `## Business summary
| Metric | This period | Prior period | Change |
|---|---|---|---|
| Revenue |  |  |  |
| Gross margin % |  |  |  |
| Operating expenses |  |  |  |
| Net profit |  |  |  |

## Customer performance
(Top customers, concentration, growth/decline, profitability.)

## Salesperson performance
(Sales vs target, average deal size, customer count.)

## Production & costing
-

## Expense analysis
-

## Key findings
1.

## Recommendations
1.
`
  },

  risk: {
    key: "risk",
    number: "04",
    label: "Risk Assessment, SOPs & Controls",
    short: "Risk & controls",
    desc: "Map your processes into SOPs and flowcharts, identify risks, design and implement controls, and reduce your risk exposure.",
    deliverables: [
      "Process SOPs & flowcharts",
      "Risk register with likelihood × impact rating",
      "Risk & control matrix (RCM)",
      "Control implementation plan",
      "Residual-risk summary"
    ],
    sections: [
      {
        title: "Your company",
        fields: [
          { key: "company_name", label: "Company name", type: "text", required: true },
          { key: "industry", label: "Industry", type: "text", required: true },
          { key: "employees", label: "Number of employees", type: "select", required: true, options: ["1–10", "11–50", "51–200", "201–1000", "1000+"] },
          { key: "locations", label: "Locations / branches / plants", type: "text", required: true },
          { key: "systems", label: "Main systems used (ERP, accounting, HR, CRM)", type: "text" }
        ]
      },
      {
        title: "Scope",
        fields: [
          { key: "services_needed", label: "Which services do you need?", type: "multiselect", required: true, options: ["Risk assessment", "SOP / flowchart creation", "Risk & control matrix", "Control implementation", "Control testing / review"] },
          { key: "processes", label: "Which processes are in scope?", type: "multiselect", required: true, options: ["Procure to pay", "Order to cash", "Record to report (finance close)", "Payroll & HR", "Inventory & warehouse", "IT access & security", "Treasury & banking", "Regulatory compliance"] },
          { key: "existing_sops", label: "Do you have documented SOPs today?", type: "select", required: true, options: ["Yes, mostly up to date", "Partially / outdated", "No"] }
        ]
      },
      {
        title: "Risk background",
        fields: [
          { key: "known_issues", label: "Known incidents, frauds, losses or audit findings", type: "textarea", required: true, help: "Write 'None' if there are none." },
          { key: "regulations", label: "Regulations or standards you must follow", type: "textarea", help: "e.g. Companies Act / IFC, SOX, GST, ISO, RBI, FDA…" },
          { key: "risk_appetite", label: "What worries you most?", type: "textarea", required: true },
          { key: "timeline", label: "Target timeline", type: "select", required: true, options: ["Within 1 month", "1–3 months", "3–6 months", "No fixed deadline"] }
        ]
      }
    ],
    documents: [
      { key: "org_chart", label: "Organisation chart", required: true },
      { key: "existing_sops", label: "Existing SOPs / policies", required: true, when: { field: "existing_sops", notEquals: "No" } },
      { key: "doa", label: "Delegation of authority / approval matrix", required: false },
      { key: "audit_reports", label: "Previous internal / external audit reports", required: false },
      { key: "process_notes", label: "Process walkthrough notes, forms or checklists", required: false },
      { key: "system_access", label: "System user-access list", required: false, when: { field: "processes", includes: "IT access & security" } }
    ],
    solutionTemplate: `## Scope & approach
-

## Process SOPs & flowcharts
(Summarise each process; attach full SOPs and flowcharts as deliverable files.)

## Risk register
Rating: Likelihood (1–5) × Impact (1–5). 15+ = High, 8–14 = Medium, below 8 = Low.

| # | Process | Risk | Likelihood | Impact | Score | Rating |
|---|---|---|---|---|---|---|
| R1 |  |  |  |  |  |  |

## Risk & control matrix
(Paste the starter matrix from Analysis tools and tailor it.)

## Control implementation plan
| Control | Owner | Implementation steps | Deadline |
|---|---|---|---|
|  |  |  |  |

## Residual risk summary
-
`
  }
};

export const SERVICE_KEYS = Object.keys(SERVICES);

export const STATUSES = {
  draft: { label: "Draft", tone: "muted", clientHint: "Not submitted yet — finish and submit your information." },
  submitted: { label: "Submitted", tone: "info", clientHint: "We've received your information and will review it shortly." },
  needs_info: { label: "More info needed", tone: "warn", clientHint: "We need a few more items from you — see the list below." },
  in_review: { label: "In analysis", tone: "info", clientHint: "We're working on your analysis." },
  solution_ready: { label: "Solution ready", tone: "good", clientHint: "Your solution is ready to view." }
};

export function isEmpty(v) {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}

export function allFields(service) {
  return service.sections.flatMap((s) => s.fields);
}

export function docApplies(doc, inputs) {
  if (!doc.when) return true;
  const v = inputs?.[doc.when.field];
  if (doc.when.includes) return Array.isArray(v) && v.includes(doc.when.includes);
  if (doc.when.notEquals) return !isEmpty(v) && v !== doc.when.notEquals;
  return true;
}

export function formatValue(field, v) {
  if (isEmpty(v)) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (field?.type === "number") {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString("en-IN") + (field.suffix === "%" ? "%" : "") : String(v);
  }
  return String(v);
}

// Compare what the client has provided against what the service needs.
// `requests` are extra items the consultant has asked for (see admin page).
export function assess(serviceKey, inputs = {}, files = [], requests = []) {
  const service = SERVICES[serviceKey];
  const fields = allFields(service);
  const filesByType = {};
  for (const f of files) {
    if (f.doc_type === "deliverable") continue;
    (filesByType[f.doc_type] ||= []).push(f);
  }

  const answered = fields.filter((f) => !isEmpty(inputs[f.key]));
  const missingFields = fields.filter((f) => f.required && isEmpty(inputs[f.key]));
  const skippedOptionalFields = fields.filter((f) => !f.required && isEmpty(inputs[f.key]));

  const applicableDocs = service.documents.filter((d) => docApplies(d, inputs));
  const docsReceived = applicableDocs.filter((d) => filesByType[d.key]?.length).map((d) => ({ ...d, files: filesByType[d.key] }));
  const missingDocs = applicableDocs.filter((d) => d.required && !filesByType[d.key]?.length);
  const optionalDocsNotProvided = applicableDocs.filter((d) => !d.required && !filesByType[d.key]?.length);

  const openRequests = requests.filter((r) => !requestFulfilled(r, inputs, filesByType));
  const fulfilledRequests = requests.filter((r) => requestFulfilled(r, inputs, filesByType));

  const requiredTotal = fields.filter((f) => f.required).length + applicableDocs.filter((d) => d.required).length + requests.length;
  const requiredDone = requiredTotal - missingFields.length - missingDocs.length - openRequests.length;
  const percent = requiredTotal ? Math.round((requiredDone / requiredTotal) * 100) : 100;

  const otherFiles = files.filter((f) => f.doc_type === "other");

  return {
    service,
    answered,
    missingFields,
    skippedOptionalFields,
    docsReceived,
    missingDocs,
    optionalDocsNotProvided,
    openRequests,
    fulfilledRequests,
    otherFiles,
    fileCount: files.filter((f) => f.doc_type !== "deliverable").length,
    percent,
    complete: missingFields.length === 0 && missingDocs.length === 0 && openRequests.length === 0
  };
}

function requestFulfilled(r, inputs, filesByType) {
  if (r.resolved) return true;
  return !isEmpty(inputs[`req:${r.id}`]) || Boolean(filesByType[`req:${r.id}`]?.length);
}
