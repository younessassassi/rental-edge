export interface InputState {
  address?: string; // property address for fetching listing data
  purchasePrice: number;
  closingCosts: number; // closing costs added to down payment
  loanPercent: number; // 0-1
  interestRate: number; // annual nominal, 0-1
  loanTermYears: number;
  grossAnnualRent: number;
  rentGrowth: number; // 0-1
  taxes: number; // annual property tax amount
  insurance: number; // annual
  hoa: number; // annual HOA
  otherExpenses: number; // starting other expenses (repairs, mgmt etc.)
  expenseGrowth: number; // 0-1
  landPercent: number; // 0-1 (portion of value that is land)
  horizonYears: number;
  appreciation: number; // 0-1
  sellingCostsPercent: number; // 0-1 of sale price
  taxRate: number; // combined marginal tax rate on ordinary income & depreciation recapture
  capGainsRate: number; // long-term capital gains rate
}

export const initialInputs: InputState = {
  address: '',
  purchasePrice: 400000,
  closingCosts: 15000,
  loanPercent: 0.7,
  interestRate: 0.065,
  loanTermYears: 30,
  grossAnnualRent: 36000,
  rentGrowth: 0.03,
  taxes: 4800,
  insurance: 1500,
  hoa: 0,
  otherExpenses: 3000,
  expenseGrowth: 0.025,
  landPercent: 0.2,
  horizonYears: 15,
  appreciation: 0.035,
  sellingCostsPercent: 0.06,
  taxRate: 0.32,
  capGainsRate: 0.15,
};
