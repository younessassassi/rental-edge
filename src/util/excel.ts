import * as XLSX from 'xlsx';
import { InputState } from '../valuation/inputs';
import { computeAnalysis, AnalysisResult, YearResultFinanced } from '../valuation/engine';

interface PropertyData {
  name: string;
  inputs: InputState;
}

/**
 * Build and download an Excel workbook with all property data, yearly projections,
 * and documented formulas so the user can reproduce the math locally.
 */
export function downloadExcel(properties: PropertyData[]) {
  const wb = XLSX.utils.book_new();

  // 1. Summary sheet — properties side by side
  buildSummarySheet(wb, properties);

  // 2. Per-property sheets — yearly data with formulas
  for (const prop of properties) {
    const analysis = computeAnalysis(prop.inputs);
    buildPropertySheet(wb, prop.name, prop.inputs, analysis);
  }

  // 3. Formulas Reference sheet
  buildFormulasSheet(wb);

  XLSX.writeFile(wb, 'rental_edge_analysis.xlsx');
}

/* ------------------------------------------------------------------ */
/*  Summary Sheet                                                      */
/* ------------------------------------------------------------------ */
function buildSummarySheet(wb: XLSX.WorkBook, properties: PropertyData[]) {
  const inputLabels: [string, (i: InputState) => string | number][] = [
    ['Address',              i => i.address || ''],
    ['Purchase Price',       i => i.purchasePrice],
    ['Closing Costs',        i => i.closingCosts],
    ['Loan %',               i => i.loanPercent],
    ['Interest Rate',        i => i.interestRate],
    ['Loan Term (yrs)',      i => i.loanTermYears],
    ['Loan Points',          i => i.loanPoints],
    ['Gross Annual Rent',    i => i.grossAnnualRent],
    ['Rent Growth',          i => i.rentGrowth],
    ['Property Taxes',       i => i.taxes],
    ['Insurance',            i => i.insurance],
    ['HOA',                  i => i.hoa],
    ['Other Expenses',       i => i.otherExpenses],
    ['Expense Growth',       i => i.expenseGrowth],
    ['Land %',               i => i.landPercent],
    ['Horizon (yrs)',        i => i.horizonYears],
    ['Appreciation',         i => i.appreciation],
    ['Selling Costs %',      i => i.sellingCostsPercent],
    ['Tax Rate',             i => i.taxRate],
    ['Cap Gains Rate',       i => i.capGainsRate],
  ];

  const resultLabels: [string, (a: AnalysisResult) => string | number][] = [
    ['', () => ''],
    ['--- Cash Scenario ---', () => ''],
    ['Cash Outlay (Cash)',   a => a.cash.cashOutlay],
    ['IRR (Cash)',           a => a.cash.irr ?? 'N/A'],
    ['Total Returns (Cash)', a => a.cash.totalWealth],
    ['Net Profit (Cash)',    a => a.cash.netProfit],
    ['Operations CF (Cash)', a => a.cash.operationsCashFlow],
    ['Sale Proceeds (Cash)', a => a.cash.saleProceedsNet],
    ['', () => ''],
    ['--- Financed Scenario ---', () => ''],
    ['Cash Outlay (Fin)',    a => a.financed.cashOutlay],
    ['IRR (Fin)',            a => a.financed.irr ?? 'N/A'],
    ['Total Returns (Fin)',  a => a.financed.totalWealth],
    ['Net Profit (Fin)',     a => a.financed.netProfit],
    ['Operations CF (Fin)',  a => a.financed.operationsCashFlow],
    ['Sale Proceeds (Fin)',  a => a.financed.saleProceedsNet],
  ];

  const rows: (string | number)[][] = [];

  // Header row
  rows.push(['', ...properties.map(p => p.name)]);

  // Input rows
  rows.push(['=== INPUTS ===', ...properties.map(() => '')]);
  for (const [label, getter] of inputLabels) {
    rows.push([label, ...properties.map(p => getter(p.inputs))]);
  }

  // Result rows
  rows.push(['=== RESULTS ===', ...properties.map(() => '')]);
  const analyses = properties.map(p => computeAnalysis(p.inputs));
  for (const [label, getter] of resultLabels) {
    rows.push([label, ...analyses.map(a => getter(a))]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoWidth(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
}

/* ------------------------------------------------------------------ */
/*  Per-property Sheet                                                 */
/* ------------------------------------------------------------------ */
function buildPropertySheet(
  wb: XLSX.WorkBook,
  name: string,
  inputs: InputState,
  analysis: AnalysisResult,
) {
  const rows: (string | number)[][] = [];

  // Inputs section
  rows.push(['INPUTS']);
  rows.push(['Purchase Price', inputs.purchasePrice]);
  rows.push(['Closing Costs', inputs.closingCosts]);
  rows.push(['Loan %', inputs.loanPercent]);
  rows.push(['Interest Rate', inputs.interestRate]);
  rows.push(['Loan Term (yrs)', inputs.loanTermYears]);
  rows.push(['Loan Points', inputs.loanPoints]);
  rows.push(['Gross Annual Rent', inputs.grossAnnualRent]);
  rows.push(['Rent Growth', inputs.rentGrowth]);
  rows.push(['Property Taxes', inputs.taxes]);
  rows.push(['Insurance', inputs.insurance]);
  rows.push(['HOA', inputs.hoa]);
  rows.push(['Other Expenses', inputs.otherExpenses]);
  rows.push(['Expense Growth', inputs.expenseGrowth]);
  rows.push(['Land %', inputs.landPercent]);
  rows.push(['Horizon (yrs)', inputs.horizonYears]);
  rows.push(['Appreciation', inputs.appreciation]);
  rows.push(['Selling Costs %', inputs.sellingCostsPercent]);
  rows.push(['Tax Rate', inputs.taxRate]);
  rows.push(['Cap Gains Rate', inputs.capGainsRate]);
  rows.push([]);

  // Derived values
  const loanAmount = inputs.purchasePrice * inputs.loanPercent;
  const pointsCost = loanAmount * inputs.loanPoints;
  const bldgValue = inputs.purchasePrice * (1 - inputs.landPercent);
  const annualDep = bldgValue / 27.5;
  rows.push(['DERIVED VALUES']);
  rows.push(['Loan Amount', loanAmount]);
  rows.push(['Points Cost', pointsCost]);
  rows.push(['Down Payment', inputs.purchasePrice - loanAmount + inputs.closingCosts + pointsCost]);
  rows.push(['Building Value', bldgValue]);
  rows.push(['Annual Depreciation', annualDep]);
  rows.push(['Annual Points Amortization', inputs.loanTermYears > 0 ? pointsCost / inputs.loanTermYears : 0]);
  rows.push([]);

  // Key results
  rows.push(['KEY RESULTS']);
  rows.push(['Cash IRR', analysis.cash.irr ?? 'N/A']);
  rows.push(['Financed IRR', analysis.financed.irr ?? 'N/A']);
  rows.push(['Cash Net Profit', analysis.cash.netProfit]);
  rows.push(['Financed Net Profit', analysis.financed.netProfit]);
  rows.push(['Cash Total Returns', analysis.cash.totalWealth]);
  rows.push(['Financed Total Returns', analysis.financed.totalWealth]);
  rows.push([]);

  // Cash Scenario Year-by-Year
  rows.push(['CASH SCENARIO — YEAR BY YEAR']);
  rows.push([
    'Year', 'Rent', 'Expenses', 'NOI', 'Depreciation',
    'Taxable Income', 'Taxes', 'After-Tax CF', 'After-Tax CF (No Dep)',
    'Dep Tax Shield',
  ]);
  for (const yr of analysis.cash.yearly) {
    rows.push([
      yr.year, yr.rent, yr.expenses, yr.noi, yr.depreciation,
      yr.taxableIncome, yr.taxes, yr.afterTaxCashFlow, yr.afterTaxCFBeforeDep,
      yr.taxShieldDep,
    ]);
  }
  rows.push([]);

  // Cash Flows for IRR
  rows.push(['CASH SCENARIO — CASH FLOWS (for IRR)']);
  rows.push(['Period', 'Cash Flow']);
  for (let i = 0; i < analysis.cash.cashFlows.length; i++) {
    rows.push([i === 0 ? 'Initial' : i === analysis.cash.cashFlows.length - 1 ? `Year ${i - 1} + Sale` : `Year ${i}`, analysis.cash.cashFlows[i]]);
  }
  rows.push(['IRR', analysis.cash.irr ?? 'N/A']);
  rows.push([]);

  // Financed Scenario Year-by-Year
  rows.push(['FINANCED SCENARIO — YEAR BY YEAR']);
  rows.push([
    'Year', 'Rent', 'Expenses', 'NOI', 'Depreciation',
    'Interest Paid', 'Principal Paid', 'Debt Service', 'Loan Balance',
    'Taxable Income', 'Taxes', 'After-Tax CF', 'After-Tax CF (No Dep)',
    'Dep Tax Shield',
  ]);
  for (const yr of analysis.financed.yearly as YearResultFinanced[]) {
    rows.push([
      yr.year, yr.rent, yr.expenses, yr.noi, yr.depreciation,
      yr.interestPaid, yr.principalPaid, yr.debtService, yr.loanBalance,
      yr.taxableIncome, yr.taxes, yr.afterTaxCashFlow, yr.afterTaxCFBeforeDep,
      yr.taxShieldDep,
    ]);
  }
  rows.push([]);

  // Financed Cash Flows for IRR
  rows.push(['FINANCED SCENARIO — CASH FLOWS (for IRR)']);
  rows.push(['Period', 'Cash Flow']);
  for (let i = 0; i < analysis.financed.cashFlows.length; i++) {
    rows.push([i === 0 ? 'Initial' : i === analysis.financed.cashFlows.length - 1 ? `Year ${i - 1} + Sale` : `Year ${i}`, analysis.financed.cashFlows[i]]);
  }
  rows.push(['IRR', analysis.financed.irr ?? 'N/A']);
  rows.push([]);

  // Sale Analysis
  const finalPrice = inputs.purchasePrice * Math.pow(1 + inputs.appreciation, inputs.horizonYears);
  const sellingCosts = finalPrice * inputs.sellingCostsPercent;
  rows.push(['SALE ANALYSIS']);
  rows.push(['Future Property Value', finalPrice]);
  rows.push(['Selling Costs', sellingCosts]);
  rows.push(['Gross Sale Proceeds', finalPrice - sellingCosts]);
  rows.push(['Accumulated Depreciation', annualDep * inputs.horizonYears]);
  rows.push(['Adjusted Basis', inputs.purchasePrice - annualDep * inputs.horizonYears]);
  rows.push(['Cash Sale Net Proceeds', analysis.cash.saleProceedsNet]);
  rows.push(['Financed Sale Net Proceeds', analysis.financed.saleProceedsNet]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoWidth(ws, rows);

  // Sanitize sheet name (Excel limit: 31 chars, no special chars)
  const sheetName = sanitizeSheetName(name);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

/* ------------------------------------------------------------------ */
/*  Formulas Reference Sheet                                           */
/* ------------------------------------------------------------------ */
function buildFormulasSheet(wb: XLSX.WorkBook) {
  const rows: string[][] = [
    ['RENTAL PROPERTY ANALYSIS — FORMULA REFERENCE'],
    ['This sheet documents every formula so you can replicate the analysis in your own spreadsheet.'],
    [],
    ['=== CORE INPUTS ==='],
    ['Variable', 'Description'],
    ['purchasePrice', 'Total acquisition price of the property'],
    ['closingCosts', 'One-time closing costs added to initial cash outlay'],
    ['loanPercent', 'Fraction of purchasePrice financed (0 to 1, e.g. 0.7 = 70%)'],
    ['interestRate', 'Annual nominal mortgage rate (decimal, e.g. 0.065 = 6.5%)'],
    ['loanTermYears', 'Mortgage amortization period in years (e.g. 30)'],
    ['loanPoints', 'Loan origination fee as fraction of loan amount (e.g. 0.02 = 2 points)'],
    ['grossAnnualRent', 'First-year total annual rental income'],
    ['rentGrowth', 'Annual rent escalation rate (decimal, e.g. 0.03 = 3%)'],
    ['taxes', 'Annual property tax amount (year 1)'],
    ['insurance', 'Annual insurance cost (year 1)'],
    ['hoa', 'Annual HOA fees (year 1)'],
    ['otherExpenses', 'Annual other expenses — repairs, management, vacancy etc. (year 1)'],
    ['expenseGrowth', 'Annual expense escalation rate (decimal)'],
    ['landPercent', 'Fraction of purchasePrice that is land (non-depreciable)'],
    ['horizonYears', 'Investment holding period in years'],
    ['appreciation', 'Annual property value appreciation rate (decimal)'],
    ['sellingCostsPercent', 'Selling costs as fraction of final sale price'],
    ['taxRate', 'Marginal ordinary income / depreciation recapture tax rate (decimal)'],
    ['capGainsRate', 'Long-term capital gains tax rate (decimal)'],
    [],
    ['=== DERIVED VALUES ==='],
    ['Formula', 'Expression'],
    ['loanAmount', '= purchasePrice × loanPercent'],
    ['pointsCost', '= loanAmount × loanPoints'],
    ['downPayment (financed)', '= purchasePrice − loanAmount + closingCosts + pointsCost'],
    ['cashOutlay (cash)', '= purchasePrice + closingCosts'],
    ['buildingValue', '= purchasePrice × (1 − landPercent)'],
    ['annualDepreciation', '= buildingValue / 27.5    (straight-line residential)'],
    ['annualPointsAmortization', '= pointsCost / loanTermYears'],
    ['baseExpenses', '= taxes + insurance + hoa + otherExpenses'],
    [],
    ['=== MONTHLY MORTGAGE ==='],
    ['monthlyRate', '= interestRate / 12'],
    ['nPayments', '= loanTermYears × 12'],
    ['monthlyPayment', '= loanAmount × monthlyRate / (1 − (1 + monthlyRate)^(−nPayments))'],
    ['  (if rate=0)', '= loanAmount / nPayments'],
    [],
    ['=== ANNUAL LOOP (year y, starting y=1) ==='],
    ['Variable', 'Formula'],
    ['rent(y)', '= grossAnnualRent × (1 + rentGrowth)^(y−1)'],
    ['expenses(y)', '= baseExpenses × (1 + expenseGrowth)^(y−1)'],
    ['noi(y)', '= rent(y) − expenses(y)'],
    [],
    ['--- Cash Scenario ---', ''],
    ['taxableIncome_noDep(y)', '= noi(y)'],
    ['taxes_noDep(y)', '= MAX(taxableIncome_noDep(y), 0) × taxRate'],
    ['taxableIncome(y)', '= noi(y) − annualDepreciation'],
    ['taxes(y)', '= MAX(taxableIncome(y), 0) × taxRate'],
    ['afterTaxCF(y)', '= noi(y) − taxes(y)'],
    ['afterTaxCF_noDep(y)', '= noi(y) − taxes_noDep(y)'],
    ['depTaxShield(y)', '= taxes_noDep(y) − taxes(y)'],
    [],
    ['--- Financed Scenario ---', ''],
    ['For each month m in year y:', ''],
    ['  interest(m)', '= balance × monthlyRate'],
    ['  principal(m)', '= monthlyPayment − interest(m)'],
    ['  balance', '= balance − principal(m)'],
    ['interestPaid(y)', '= SUM of monthly interest in year y'],
    ['principalPaid(y)', '= SUM of monthly principal in year y'],
    ['debtService(y)', '= principalPaid(y) + interestPaid(y)'],
    ['taxableIncome_noDep(y)', '= noi(y) − interestPaid(y) − annualPointsAmortization'],
    ['taxes_noDep(y)', '= MAX(taxableIncome_noDep(y), 0) × taxRate'],
    ['taxableIncome(y)', '= taxableIncome_noDep(y) − annualDepreciation'],
    ['taxes(y)', '= MAX(taxableIncome(y), 0) × taxRate'],
    ['afterTaxCF(y)', '= (noi(y) − debtService(y)) − taxes(y)'],
    ['afterTaxCF_noDep(y)', '= (noi(y) − debtService(y)) − taxes_noDep(y)'],
    ['depTaxShield(y)', '= taxes_noDep(y) − taxes(y)'],
    [],
    ['=== SALE AT END OF HORIZON ==='],
    ['Formula', 'Expression'],
    ['finalPrice', '= purchasePrice × (1 + appreciation)^horizonYears'],
    ['sellingCosts', '= finalPrice × sellingCostsPercent'],
    ['grossSaleProceeds', '= finalPrice − sellingCosts'],
    ['accumulatedDep', '= annualDepreciation × horizonYears'],
    ['adjustedBasis', '= purchasePrice − accumulatedDep'],
    ['gain', '= grossSaleProceeds − adjustedBasis    (cash scenario)'],
    ['gain (financed)', '= grossSaleProceeds − remainingBalance − adjustedBasis'],
    ['recapturePortion', '= MIN(accumulatedDep, MAX(gain, 0))'],
    ['capitalGainPortion', '= MAX(gain − recapturePortion, 0)'],
    ['recaptureTax', '= recapturePortion × taxRate'],
    ['capGainsTax', '= capitalGainPortion × capGainsRate'],
    ['saleNet (cash)', '= grossSaleProceeds − recaptureTax − capGainsTax'],
    ['saleNet (financed)', '= grossSaleProceeds − remainingBalance − recaptureTax − capGainsTax'],
    [],
    ['=== AGGREGATE RESULTS ==='],
    ['Formula', 'Expression'],
    ['operationsCashFlow', '= SUM of afterTaxCF(y) for all years'],
    ['totalWealth', '= operationsCashFlow + saleNet'],
    ['netProfit', '= totalWealth − cashOutlay'],
    [],
    ['=== IRR ==='],
    ['Cash Flows array', '[ −cashOutlay, afterTaxCF(1), afterTaxCF(2), ..., afterTaxCF(N) + saleNet ]'],
    ['IRR', '= rate r such that NPV(r) = SUM( CF(t) / (1+r)^t ) = 0'],
    ['  In Excel:', '= IRR(array_of_cash_flows)'],
    [],
    ['=== EXCEL TIPS ==='],
    ['To compute IRR in Excel:', 'Put cash flows in a column (e.g. B2:B17), then =IRR(B2:B17)'],
    ['To compute NPV:', '=NPV(rate, B3:B17) + B2   (B2 is the initial outflow at t=0)'],
    ['Monthly amortization:', 'Use =PMT(monthlyRate, nPayments, −loanAmount) for monthly payment'],
    ['Compound growth:', '= startValue * (1 + growthRate) ^ periods'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoWidth(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Formulas Reference');
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function autoWidth(ws: XLSX.WorkSheet, rows: (string | number)[][]) {
  const colWidths: number[] = [];
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const len = String(row[c] ?? '').length;
      colWidths[c] = Math.min(60, Math.max(colWidths[c] || 8, len + 2));
    }
  }
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
}

function sanitizeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no [ ] * ? / \
  return name.replace(/[[\]*?/\\]/g, '').substring(0, 31) || 'Property';
}
