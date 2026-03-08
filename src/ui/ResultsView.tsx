import React, { useState } from 'react';
import { AnalysisResult, YearResultFinanced, YearResultBase } from '../valuation/engine';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ResultsView: React.FC<{ analysis: AnalysisResult }> = ({ analysis }) => {
  const { cash, financed } = analysis;
  const chartData = cash.yearly.map((c, idx) => {
    const f = financed.yearly[idx] as YearResultFinanced;
    return {
      year: c.year,
      cashCF: c.afterTaxCashFlow,
      finCF: f.afterTaxCashFlow,
      loanBalance: f.loanBalance,
      cumCashCF: cash.yearly.slice(0, idx+1).reduce((a,b)=>a+b.afterTaxCashFlow,0),
      cumFinCF: financed.yearly.slice(0, idx+1).reduce((a,b)=>a+b.afterTaxCashFlow,0),
    };
  });

  const formatCurrencyAxis = (value: number) => `$${(value / 1000).toFixed(0)}k`;
  const formatCurrencyTooltip = (value: number) => `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtC = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const horizonYears = analysis.inputs.horizonYears;

  return (
    <div className="space-y-6">
      {/* Plain-English summary */}
      <div className="bg-white p-4 rounded shadow border-l-4 border-indigo-400">
        <p className="text-base text-gray-800">
          <strong>With a loan:</strong> You invest <strong>{fmtC(financed.cashOutlay)}</strong> upfront and after <strong>{horizonYears} years</strong> you could walk away with <strong>{fmtC(financed.totalWealth)}</strong> — that's a <strong>{financed.irr !== null ? (financed.irr * 100).toFixed(1) : '?'}% annual return</strong> on your money.
        </p>
        <p className="text-base text-gray-800 mt-2">
          <strong>All cash:</strong> You invest <strong>{fmtC(cash.cashOutlay)}</strong> upfront and after <strong>{horizonYears} years</strong> you could walk away with <strong>{fmtC(cash.totalWealth)}</strong> — that's a <strong>{cash.irr !== null ? (cash.irr * 100).toFixed(1) : '?'}% annual return</strong> on your money.
        </p>
      </div>

      {financed.yearly.some(y=>y.afterTaxCashFlow < 0) && (
        <div className="p-2 text-sm bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">⚠️ Heads up: In some years, your loan expenses may exceed rental income.</div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
  <SummaryCard title="Cash Scenario" irr={cash.irr} total={cash.totalWealth} sale={cash.saleProceedsNet} ops={cash.operationsCashFlow} analysis={analysis} />
  <SummaryCard title="Financed Scenario" irr={financed.irr} total={financed.totalWealth} sale={financed.saleProceedsNet} ops={financed.operationsCashFlow} analysis={analysis} />
      </div>
      <div className="h-80 bg-white p-4 rounded shadow">
        <div className="mb-2">
          <h3 className="font-semibold text-sm text-gray-700">📊 How Your Cash Grows Over Time</h3>
          <p className="text-xs text-gray-500">Green: Cash accumulated (no loan). Blue: Cash accumulated (with loan). Red: Remaining loan balance.</p>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chartData}>
            <XAxis dataKey="year" />
            <YAxis tickFormatter={formatCurrencyAxis} />
            <Tooltip formatter={(value: number) => formatCurrencyTooltip(value)} />
            <Legend />
            <Line type="monotone" dataKey="cumCashCF" stroke="#16a34a" name="Total Cash (No Loan)" />
            <Line type="monotone" dataKey="cumFinCF" stroke="#2563eb" name="Total Cash (With Loan)" />
            <Line type="monotone" dataKey="loanBalance" stroke="#dc2626" name="Remaining Loan" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView cash={cash.yearly} fin={financed.yearly as YearResultFinanced[]} />
    </div>
  );
};

const CollapsibleSection: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button onClick={() => setOpen(!open)} className="text-xs text-blue-600 hover:text-blue-800 underline mb-1">
        {open ? `Hide ${label.toLowerCase()}` : `See ${label.toLowerCase()}`}
      </button>
      {open && children}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; irr: number | null; total: number; sale: number; ops: number; analysis: AnalysisResult; }> = ({ title, irr, total, sale, ops, analysis }) => {
  const isCash = title.includes('Cash');
  const { purchasePrice, loanPercent, closingCosts, loanPoints } = analysis.inputs;
  const downPayment = purchasePrice - (purchasePrice * loanPercent);
  const loanAmount = purchasePrice * loanPercent;
  const pointsCost = loanAmount * loanPoints;
  const cashScenarioTotal = purchasePrice + closingCosts;
  const financedScenarioTotal = downPayment + closingCosts + pointsCost;
  
  return (
    <div className="bg-white p-4 rounded shadow text-sm space-y-2">
      <h2 className="font-semibold mb-3 text-base">{title}</h2>
      
      {isCash && (
        <div className="space-y-1 border-l-4 border-gray-300 pl-3 bg-gray-50 py-2 px-2 rounded text-xs mb-3">
          <p className="font-medium mb-1">💵 Cash Needed at Closing</p>
          <div className="ml-2 space-y-0.5 text-gray-700">
            <p>Purchase Price: ${purchasePrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p>Closing Costs: ${closingCosts.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="border-t border-gray-300 mt-1 pt-1 font-semibold">Total Cash: ${cashScenarioTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
        </div>
      )}
      
      {!isCash && (
        <div className="space-y-1 border-l-4 border-gray-300 pl-3 bg-gray-50 py-2 px-2 rounded text-xs mb-3">
          <p className="font-medium mb-1">💵 Cash Needed at Closing</p>
          <div className="ml-2 space-y-0.5 text-gray-700">
            <p>Down Payment: ${downPayment.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p>Closing Costs: ${closingCosts.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            {pointsCost > 0 && <p>Loan Points: ${pointsCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>}
            <p className="border-t border-gray-300 mt-1 pt-1 font-semibold">Total Cash: ${financedScenarioTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="text-gray-600 mt-2">Loan Amount: ${loanAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
        </div>
      )}
      
      <CollapsibleSection label="Year 1 details">
        <div className="space-y-2 mt-1">
          <div className="space-y-1 border-l-4 border-orange-300 pl-3 bg-orange-50 py-2 px-2 rounded text-xs">
            <p className="font-medium mb-1">📈 Year 1 Income vs Expenses</p>
            <div className="ml-2 space-y-0.5 text-gray-700">
              <p>Annual Rent: ${analysis.cash.yearly[0].rent.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p>Annual Expenses: ${analysis.cash.yearly[0].expenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p className="border-t border-orange-200 mt-1 pt-1 font-semibold text-orange-900">Net Rental Income: ${analysis.cash.yearly[0].noi.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
          </div>
          <div className="space-y-1 border-l-4 border-red-300 pl-3 bg-red-50 py-2 px-2 rounded text-xs">
            <p className="font-medium mb-1">📊 Year 1 Expense Breakdown</p>
            <div className="ml-2 space-y-0.5 text-gray-700">
              <p>Property Taxes: ${analysis.inputs.taxes.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p>Insurance: ${analysis.inputs.insurance.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p>HOA Fees: ${analysis.inputs.hoa.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p>Other Expenses: ${analysis.inputs.otherExpenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p className="border-t border-red-200 mt-1 pt-1 font-semibold text-red-900">Total: ${analysis.cash.yearly[0].expenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
      <div className="space-y-1 border-l-4 border-blue-200 pl-3 bg-blue-50 py-2 px-2 rounded text-xs">
        <p><span className="font-medium">Annual Return:</span> {irr !== null ? (irr*100).toFixed(2)+ '%' : 'n/a'}</p>
        <p className="text-gray-600">Yearly return on your money invested</p>
      </div>
      <div className="space-y-1 border-l-4 border-green-200 pl-3 bg-green-50 py-2 px-2 rounded text-xs">
        <p><span className="font-medium">💰 Total Rental Profit:</span> ${ops.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        <p className="text-gray-600 mb-2">Total cash from rent after all expenses & taxes over {analysis.inputs.horizonYears} years</p>
        <CollapsibleSection label="how this is calculated">
          <div className="ml-2 space-y-0.5 text-gray-700 border-t border-green-200 pt-2 mt-2">
          {isCash ? (
            <>
              <p><span className="text-gray-500">Year 1 Net Rental Income:</span> ${analysis.cash.yearly[0].noi.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p><span className="text-gray-500">Less: Taxes (Year 1):</span> -${analysis.cash.yearly[0].taxes.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p><span className="text-gray-500">Plus: Tax Savings (Depreciation):</span> +${analysis.cash.yearly[0].taxShieldDep.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p className="font-semibold"><span className="text-gray-500">Year 1 Cash in Pocket:</span> ${analysis.cash.yearly[0].afterTaxCashFlow.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p className="text-gray-500 text-xs mt-1">× {analysis.inputs.horizonYears} years average = ${ops.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </>
          ) : (
            <>
              <p><span className="text-gray-500">Year 1 Net Rental Income:</span> ${(analysis.financed.yearly[0] as any).noi.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p><span className="text-gray-500">Less: Loan Payments (Year 1):</span> -${(analysis.financed.yearly[0] as any).debtService.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p><span className="text-gray-500">Before Taxes (Year 1):</span> ${((analysis.financed.yearly[0] as any).noi - (analysis.financed.yearly[0] as any).debtService).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p><span className="text-gray-500">Less: Taxes (Year 1):</span> -${(analysis.financed.yearly[0] as any).taxes.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p><span className="text-gray-500">Plus: Tax Savings (Depreciation):</span> +${(analysis.financed.yearly[0] as any).taxShieldDep.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p className="font-semibold"><span className="text-gray-500">Year 1 Cash in Pocket:</span> ${(analysis.financed.yearly[0] as any).afterTaxCashFlow.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p className="text-gray-500 text-xs mt-1">× {analysis.inputs.horizonYears} years average = ${ops.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </>
          )}
          </div>
        </CollapsibleSection>
      </div>
      <div className="space-y-1 border-l-4 border-purple-200 pl-3 bg-purple-50 py-2 px-2 rounded text-xs">
        <p><span className="font-medium">Money from Sale:</span> ${sale.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        <p className="text-gray-600">What you keep after selling{isCash ? '' : ', paying off the loan,'} and taxes</p>
      </div>
      <div className="space-y-1 border-l-4 border-amber-200 pl-3 bg-amber-50 py-2 px-2 rounded text-xs font-semibold">
        <p>💰 Total Profit: ${total.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        <p className="font-normal text-gray-600 mb-2">Rental profit + sale money = your total return</p>
        <CollapsibleSection label="depreciation details" className="font-normal">
          <div className="ml-2 space-y-0.5 text-gray-700 border-t border-amber-200 pt-2 mt-2">
            <p><span className="text-gray-500">Includes Tax Savings (Depreciation):</span> ${(isCash ? analysis.cash.yearly.reduce((a, b) => a + b.taxShieldDep, 0) : (analysis.financed.yearly as any[]).reduce((a, b) => a + b.taxShieldDep, 0)).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="text-gray-500 text-xs">The IRS lets you deduct the building's value over 27.5 years, reducing your taxes each year</p>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

const TableView: React.FC<{ cash: YearResultBase[]; fin: YearResultFinanced[]; }> = ({ cash, fin }) => {
  const [showAll, setShowAll] = useState(false);
  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  
  return (
    <div className="overflow-auto bg-white rounded shadow">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <h3 className="font-semibold text-sm text-gray-700">Year-by-Year Breakdown</h3>
        <button onClick={() => setShowAll(!showAll)} className="text-xs text-blue-600 hover:text-blue-800 underline">
          {showAll ? 'Simple View' : 'Show All Columns'}
        </button>
      </div>
      <table className="min-w-full text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Year</th>
            <th className="p-2 text-right">Rent</th>
            <th className="p-2 text-right">Expenses</th>
            <th className="p-2 text-right">Net Income</th>
            {showAll && <th className="p-2 text-right">Depreciation</th>}
            {showAll && <th className="p-2 text-right">Taxable (Cash)</th>}
            {showAll && <th className="p-2 text-right">Taxable (Loan)</th>}
            <th className="p-2 text-right">Cash in Pocket (Cash)</th>
            <th className="p-2 text-right">Cash in Pocket (Loan)</th>
            {showAll && <th className="p-2 text-right">Before Dep (Cash)</th>}
            {showAll && <th className="p-2 text-right">Before Dep (Loan)</th>}
            {showAll && <th className="p-2 text-right">Tax Savings (Cash)</th>}
            {showAll && <th className="p-2 text-right">Tax Savings (Loan)</th>}
            <th className="p-2 text-right">Loan Balance</th>
          </tr>
        </thead>
        <tbody>
          {cash.map((c,i) => {
            const f = fin[i];
            return (
              <tr key={c.year} className={i%2? 'bg-gray-50':''}>
                <td className="p-2">{c.year}</td>
                <td className="p-2 text-right font-medium">{formatCurrency(c.rent)}</td>
                <td className="p-2 text-right">{formatCurrency(c.expenses)}</td>
                <td className="p-2 text-right">{formatCurrency(c.noi)}</td>
                {showAll && <td className="p-2 text-right">{formatCurrency(c.depreciation)}</td>}
                {showAll && <td className="p-2 text-right">{formatCurrency(c.taxableIncome)}</td>}
                {showAll && <td className="p-2 text-right">{formatCurrency(f.taxableIncome)}</td>}
                <td className="p-2 text-right font-semibold text-green-600">{formatCurrency(c.afterTaxCashFlow)}</td>
                <td className="p-2 text-right font-semibold text-blue-600">{formatCurrency(f.afterTaxCashFlow)}</td>
                {showAll && <td className="p-2 text-right">{formatCurrency(c.afterTaxCFBeforeDep)}</td>}
                {showAll && <td className="p-2 text-right">{formatCurrency(f.afterTaxCFBeforeDep)}</td>}
                {showAll && <td className="p-2 text-right text-purple-600">{formatCurrency(c.taxShieldDep)}</td>}
                {showAll && <td className="p-2 text-right text-purple-600">{formatCurrency(f.taxShieldDep)}</td>}
                <td className="p-2 text-right font-semibold">{formatCurrency(f.loanBalance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
