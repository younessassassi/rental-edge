import { InputState } from './inputs';

export interface YearResultBase {
  year: number;
  rent: number;
  expenses: number; // excluding financing
  noi: number; // rent - expenses
  depreciation: number;
  taxableIncome: number;
  taxes: number;
  afterTaxCashFlow: number;
  afterTaxCFBeforeDep: number; // after-tax CF if depreciation weren't deductible
  taxShieldDep: number; // reduction in taxes due to depreciation
}

export interface YearResultFinanced extends YearResultBase {
  loanBalance: number;
  principalPaid: number;
  interestPaid: number;
  debtService: number; // principal + interest
}

export interface ScenarioResults {
  yearly: (YearResultBase | YearResultFinanced)[];
  cashFlows: number[]; // includes initial investment negative outflow at t0, annual after-tax CF, final sale proceeds net taxes
  irr: number | null;
  totalWealth: number; // sum of CF after t0 (operations + sale net)
  saleProceedsNet: number; // net after taxes and payoff (if any)
  operationsCashFlow: number; // sum of annual after-tax cash flows (excluding sale)
  totalRevenue: number; // operationsCashFlow + saleProceedsNet
}

export interface AnalysisResult {
  inputs: InputState;
  cash: ScenarioResults;
  financed: ScenarioResults;
}

function irr(cashFlows: number[]): number | null {
  // Simple IRR via Newton-Raphson fallback to bisection.
  const maxIter = 100;
  const tol = 1e-6;
  let low = -0.9999, high = 5; // allow very high IRR
  const npv = (r: number) => cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i), 0);
  if (npv(0) < 0) return null; // if even at 0 discount NPV negative, IRR meaningless for our quick calc
  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const val = npv(mid);
    if (Math.abs(val) < tol) return mid;
    if (val > 0) low = mid; else high = mid;
  }
  return null;
}

export function computeAnalysis(inputs: InputState): AnalysisResult {
  const bldgValue = inputs.purchasePrice * (1 - inputs.landPercent);
  const annualDep = bldgValue / 27.5;
  // Pre-compute expense base (excluding financing)
  const baseExpenses = inputs.taxes + inputs.insurance + inputs.hoa + inputs.otherExpenses;

  // CASH SCENARIO
  const cashYearly: YearResultBase[] = [];
  let rent = inputs.grossAnnualRent;
  let expenses = baseExpenses;
  for (let y = 1; y <= inputs.horizonYears; y++) {
    const noi = rent - expenses;
  const taxableIncomeNoDep = noi; // without depreciation
  const taxesNoDep = Math.max(taxableIncomeNoDep, 0) * inputs.taxRate;
  const taxableIncome = noi - annualDep;
  const taxes = Math.max(taxableIncome, 0) * inputs.taxRate;
  const afterTaxCFBeforeDep = noi - taxesNoDep;
  const afterTaxCashFlow = noi - taxes;
  const taxShieldDep = taxesNoDep - taxes;
  cashYearly.push({ year: y, rent, expenses, noi, depreciation: annualDep, taxableIncome, taxes, afterTaxCashFlow, afterTaxCFBeforeDep, taxShieldDep });
    rent *= (1 + inputs.rentGrowth);
    expenses *= (1 + inputs.expenseGrowth);
  }
  // Sale for cash scenario
  const finalPrice = inputs.purchasePrice * Math.pow(1 + inputs.appreciation, inputs.horizonYears);
  const sellingCosts = finalPrice * inputs.sellingCostsPercent;
  const saleGross = finalPrice - sellingCosts;
  const accumulatedDep = annualDep * inputs.horizonYears;
  const adjustedBasis = inputs.purchasePrice - accumulatedDep;
  const gain = saleGross - adjustedBasis;
  const recapturePortion = Math.min(accumulatedDep, gain);
  const capitalGainPortion = Math.max(gain - recapturePortion, 0);
  const recaptureTax = recapturePortion * inputs.taxRate; // using ordinary tax rate as approximation
  const capGainsTax = capitalGainPortion * inputs.capGainsRate;
  const saleNet = saleGross - recaptureTax - capGainsTax;

  const initialInvestment = -(inputs.purchasePrice + inputs.closingCosts);
  const cashCF: number[] = [initialInvestment, ...cashYearly.map(r => r.afterTaxCashFlow), saleNet];
  const cashIrr = irr(cashCF);
  const operationsCashFlowCash = cashYearly.reduce((a,b)=>a+b.afterTaxCashFlow,0);
  const cashTotalWealth = operationsCashFlowCash + saleNet;

  // FINANCED SCENARIO
  const loanAmount = inputs.purchasePrice * inputs.loanPercent;
  const downPayment = inputs.purchasePrice - loanAmount + inputs.closingCosts;
  const monthlyRate = inputs.interestRate / 12;
  const nPayments = inputs.loanTermYears * 12;
  const monthlyPayment = loanAmount * (monthlyRate) / (1 - Math.pow(1 + monthlyRate, -nPayments));

  let balance = loanAmount;
  rent = inputs.grossAnnualRent;
  expenses = baseExpenses;
  const finYearly: YearResultFinanced[] = [];
  for (let y = 1; y <= inputs.horizonYears; y++) {
    let interestPaid = 0; let principalPaid = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      interestPaid += interest;
      principalPaid += principal;
      balance -= principal;
    }
    const debtService = principalPaid + interestPaid;
    const noiPreDebt = rent - expenses;
  const taxableIncomeNoDep = (noiPreDebt - interestPaid);
  const taxesNoDep = Math.max(taxableIncomeNoDep, 0) * inputs.taxRate;
  const taxableIncome = taxableIncomeNoDep - annualDep; // interest deductible, principal not
  const taxes = Math.max(taxableIncome, 0) * inputs.taxRate;
  const afterTaxCFBeforeDep = (noiPreDebt - debtService) - taxesNoDep;
  const afterTaxCashFlow = (noiPreDebt - debtService) - taxes;
  const taxShieldDep = taxesNoDep - taxes;
  finYearly.push({ year: y, rent, expenses, noi: noiPreDebt, depreciation: annualDep, taxableIncome, taxes, afterTaxCashFlow, afterTaxCFBeforeDep, taxShieldDep, loanBalance: Math.max(balance,0), principalPaid, interestPaid, debtService });
    rent *= (1 + inputs.rentGrowth);
    expenses *= (1 + inputs.expenseGrowth);
  }
  // Sale financed
  const saleGrossFin = finalPrice - sellingCosts;
  const remainingLoanPayoff = balance;
  const gainFin = saleGrossFin - remainingLoanPayoff - adjustedBasis;
  const recaptureFin = Math.min(accumulatedDep, Math.max(gainFin,0));
  const capGainFinPortion = Math.max(gainFin - recaptureFin, 0);
  const recaptureTaxFin = recaptureFin * inputs.taxRate;
  const capGainsTaxFin = capGainFinPortion * inputs.capGainsRate;
  const saleNetFin = saleGrossFin - remainingLoanPayoff - recaptureTaxFin - capGainsTaxFin;

  const financedCF: number[] = [-downPayment, ...finYearly.map(r => r.afterTaxCashFlow), saleNetFin];
  const financedIrr = irr(financedCF);
  const operationsCashFlowFin = finYearly.reduce((a,b)=>a+b.afterTaxCashFlow,0);
  const financedTotalWealth = operationsCashFlowFin + saleNetFin;

  return {
    inputs,
  cash: { yearly: cashYearly, cashFlows: cashCF, irr: cashIrr, totalWealth: cashTotalWealth, saleProceedsNet: saleNet, operationsCashFlow: operationsCashFlowCash, totalRevenue: cashTotalWealth },
  financed: { yearly: finYearly, cashFlows: financedCF, irr: financedIrr, totalWealth: financedTotalWealth, saleProceedsNet: saleNetFin, operationsCashFlow: operationsCashFlowFin, totalRevenue: financedTotalWealth },
  };
}
