import React from 'react';
import { InputState } from '../valuation/inputs';

export const InputsForm: React.FC<{ value: InputState; onChange(v: InputState): void; }> = ({ value, onChange }) => {
  function update<K extends keyof InputState>(k: K, v: InputState[K]) {
    onChange({ ...value, [k]: typeof v === 'number' ? Number(v) : v } as InputState);
  }

  const numInput = (label: string, k: keyof InputState, step = 0.01, min = 0, desc?: string) => (
    <label className="flex flex-col gap-1 text-sm" key={k as string}>
      <span className="font-medium">{label}</span>
      {desc && <span className="text-xs text-gray-500 leading-tight">{desc}</span>}
      <input
        type="number"
        step={step}
        min={min}
        value={value[k] as number}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          const finalValue = isNaN(parsed) ? '' : Math.max(parsed, min);
          update(k, finalValue as any);
        }}
        className="border rounded px-2 py-1"
      />
    </label>
  );

  const pctInput = (label: string, k: keyof InputState, step = 0.1, min = 0, desc?: string) => (
    <label className="flex flex-col gap-1 text-sm" key={k as string}>
      <span className="font-medium">{label}</span>
      {desc && <span className="text-xs text-gray-500 leading-tight">{desc}</span>}
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          min={min}
          value={typeof value[k] === 'number' ? parseFloat(((value[k] as number) * 100).toFixed(4)) : ''}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            const finalValue = isNaN(parsed) ? '' : Math.max(parsed, min) / 100;
            update(k, finalValue as any);
          }}
          className="border rounded px-2 py-1 flex-1"
        />
        <span className="text-gray-400 text-sm">%</span>
      </div>
    </label>
  );

  const textInput = (label: string, k: keyof InputState) => (
    <label className="flex flex-col gap-1 text-sm" key={k as string}>
      <span className="font-medium">{label}</span>
      <input
        type="text"
        value={(value[k] as string) || ''}
        onChange={(e) => update(k, e.target.value)}
        className="border rounded px-2 py-1"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-800">
        <strong>How to use:</strong> Enter your property details below. Percentages are entered as whole numbers (e.g. enter 6.5 for 6.5%).
      </div>
      
      <div className="bg-white p-4 rounded shadow space-y-3">
        <div className="font-semibold text-sm">Property Address (Optional)</div>
        <div className="flex gap-2">
          <div className="flex-1">
            {textInput('Address', 'address')}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 bg-white p-4 rounded shadow">
        {numInput('Purchase Price', 'purchasePrice', 1000, 0, 'Total price of the property.')}
        {numInput('Closing Costs', 'closingCosts', 100, 0, 'One-time fees at purchase (title, escrow, etc.).')}
        {pctInput('Loan %', 'loanPercent', 1, 0, 'How much of the price you borrow. 70 means a 70% loan.')}
        {pctInput('Interest Rate', 'interestRate', 0.1, 0, 'Your mortgage rate. Drives your monthly payment amount.')}
        {numInput('Loan Term (yrs)', 'loanTermYears', 1, 1, 'Length of the mortgage in years.')}
        {pctInput('Loan Points', 'loanPoints', 0.1, 0, 'Upfront fee to the lender. 1 point = 1% of the loan amount.')}
        {numInput('Gross Annual Rent', 'grossAnnualRent', 100, 0, 'Total yearly rental income before any expenses.')}
        {pctInput('Rent Growth', 'rentGrowth', 0.1, 0, 'How much rent goes up each year. 3 means 3% per year.')}
        {numInput('Taxes (annual)', 'taxes', 100, 0, 'Yearly property tax.')}
        {numInput('Insurance (annual)', 'insurance', 50, 0, 'Yearly insurance cost.')}
        {numInput('HOA (annual)', 'hoa', 50, 0, 'Yearly HOA fees, if any.')}
        {numInput('Other Expenses (annual)', 'otherExpenses', 50, 0, 'Repairs, property management, vacancy allowance, etc.')}
        {pctInput('Expense Growth', 'expenseGrowth', 0.1, 0, 'How much expenses go up each year.')}
        {pctInput('Land %', 'landPercent', 1, 0, 'Portion that is land. Only the building part gets a tax deduction.')}
        {numInput('Hold Period (yrs)', 'horizonYears', 1, 1, 'How many years you plan to hold the property.')}
        {pctInput('Appreciation', 'appreciation', 0.1, 0, 'How much the property goes up in value each year.')}
        {pctInput('Selling Costs', 'sellingCostsPercent', 0.1, 0, 'Fees when you sell (agent commission, etc.) as % of sale price.')}
        {pctInput('Tax Rate', 'taxRate', 0.1, 0, 'Your income tax bracket. Applied to rental income and parts of the sale.')}
        {pctInput('Capital Gains Tax', 'capGainsRate', 0.1, 0, 'Tax on profit when you sell. Usually 15% or 20%.')}
      </div>
    </div>
  );
};
