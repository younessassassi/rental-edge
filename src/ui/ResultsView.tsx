import React from 'react';
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

  return (
    <div className="space-y-6">
      {financed.yearly.some(y=>y.afterTaxCashFlow < 0) && (
        <div className="p-2 text-sm bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">Warning: Negative after-tax cash flow detected in financed scenario.</div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
  <SummaryCard title="Cash Scenario" irr={cash.irr} total={cash.totalWealth} sale={cash.saleProceedsNet} ops={cash.operationsCashFlow} analysis={analysis} />
  <SummaryCard title="Financed Scenario" irr={financed.irr} total={financed.totalWealth} sale={financed.saleProceedsNet} ops={financed.operationsCashFlow} analysis={analysis} />
      </div>
      <div className="h-80 bg-white p-4 rounded shadow">
        <div className="mb-2">
          <h3 className="font-semibold text-sm text-gray-700">📊 Cumulative Cash Flow & Loan Balance</h3>
          <p className="text-xs text-gray-500">Green line: Total cash accumulated over time (buy & hold). Blue line: Same but with financing. Red line: How much you still owe on the loan each year.</p>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chartData}>
            <XAxis dataKey="year" />
            <YAxis tickFormatter={formatCurrencyAxis} />
            <Tooltip formatter={(value: number) => formatCurrencyTooltip(value)} />
            <Legend />
            <Line type="monotone" dataKey="cumCashCF" stroke="#16a34a" name="Cumulative Cash CF" />
            <Line type="monotone" dataKey="cumFinCF" stroke="#2563eb" name="Cumulative Fin CF" />
            <Line type="monotone" dataKey="loanBalance" stroke="#dc2626" name="Loan Balance" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView cash={cash.yearly} fin={financed.yearly as YearResultFinanced[]} />
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; irr: number | null; total: number; sale: number; ops: number; analysis: AnalysisResult; }> = ({ title, irr, total, sale, ops, analysis }) => {
  const totalRev = ops + sale;
  const isCash = title.includes('Cash');
  const { purchasePrice, loanPercent, closingCosts } = analysis.inputs;
  const downPayment = purchasePrice - (purchasePrice * loanPercent);
  const loanAmount = purchasePrice * loanPercent;
  const cashScenarioTotal = purchasePrice + closingCosts;
  const financedScenarioTotal = downPayment + closingCosts;
  
  return (
    <div className="bg-white p-4 rounded shadow text-sm space-y-2">
      <h2 className="font-semibold mb-3 text-base">{title}</h2>
      
      {isCash && (
        <div className="space-y-1 border-l-4 border-gray-300 pl-3 bg-gray-50 py-2 px-2 rounded text-xs mb-3">
          <p className="font-medium mb-1">💵 Cash Needed</p>
          <div className="ml-2 space-y-0.5 text-gray-700">
            <p>Purchase Price: ${purchasePrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p>Closing Costs: ${closingCosts.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="border-t border-gray-300 mt-1 pt-1 font-semibold">Total Cash: ${cashScenarioTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
        </div>
      )}
      
      {!isCash && (
        <div className="space-y-1 border-l-4 border-gray-300 pl-3 bg-gray-50 py-2 px-2 rounded text-xs mb-3">
          <p className="font-medium mb-1">💵 Cash Needed</p>
          <div className="ml-2 space-y-0.5 text-gray-700">
            <p>Down Payment: ${downPayment.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p>Closing Costs: ${closingCosts.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="border-t border-gray-300 mt-1 pt-1 font-semibold">Total Cash: ${financedScenarioTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="text-gray-600 mt-2">Loan Amount: ${loanAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
        </div>
      )}
      <div className="space-y-1 border-l-4 border-blue-200 pl-3 bg-blue-50 py-2 px-2 rounded text-xs">
        <p><span className="font-medium">IRR:</span> {irr !== null ? (irr*100).toFixed(2)+ '%' : 'n/a'}</p>
        <p className="text-gray-600">Annual return on your money invested</p>
      </div>
      <div className="space-y-1 border-l-4 border-green-200 pl-3 bg-green-50 py-2 px-2 rounded text-xs">
        <p><span className="font-medium">Operations Cash Flow:</span> ${ops.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        <p className="text-gray-600">Total cash from rent after all expenses & taxes over {title.includes('Cash') ? 'buy & hold' : 'financing'}</p>
      </div>
      <div className="space-y-1 border-l-4 border-purple-200 pl-3 bg-purple-50 py-2 px-2 rounded text-xs">
        <p><span className="font-medium">Sale Proceeds (Net):</span> ${sale.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        <p className="text-gray-600">Money left after selling {isCash ? '' : 'and paying off loan'} and taxes</p>
      </div>
      <div className="space-y-1 border-l-4 border-amber-200 pl-3 bg-amber-50 py-2 px-2 rounded text-xs font-semibold">
        <p>💰 Total Wealth: ${total.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        <p className="font-normal text-gray-600">Operations cash + sale proceeds = your total profit</p>
      </div>
    </div>
  );
};

const TableView: React.FC<{ cash: YearResultBase[]; fin: YearResultFinanced[]; }> = ({ cash, fin }) => {
  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  
  return (
    <div className="overflow-auto bg-white rounded shadow">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Year</th>
            <th className="p-2 text-right">Rent</th>
            <th className="p-2 text-right">Expenses</th>
            <th className="p-2 text-right">NOI Cash</th>
            <th className="p-2 text-right">NOI Fin</th>
            <th className="p-2 text-right">Depreciation</th>
            <th className="p-2 text-right">Taxable Cash</th>
            <th className="p-2 text-right">Taxable Fin</th>
            <th className="p-2 text-right">AfterTax CF Cash</th>
            <th className="p-2 text-right">AfterTax CF Fin</th>
            <th className="p-2 text-right">Cash CF (No Dep)</th>
            <th className="p-2 text-right">Fin CF (No Dep)</th>
            <th className="p-2 text-right">Dep Shield Cash</th>
            <th className="p-2 text-right">Dep Shield Fin</th>
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
                <td className="p-2 text-right">{formatCurrency(f.noi)}</td>
                <td className="p-2 text-right">{formatCurrency(c.depreciation)}</td>
                <td className="p-2 text-right">{formatCurrency(c.taxableIncome)}</td>
                <td className="p-2 text-right">{formatCurrency(f.taxableIncome)}</td>
                <td className="p-2 text-right font-semibold text-green-600">{formatCurrency(c.afterTaxCashFlow)}</td>
                <td className="p-2 text-right font-semibold text-blue-600">{formatCurrency(f.afterTaxCashFlow)}</td>
                <td className="p-2 text-right">{formatCurrency(c.afterTaxCFBeforeDep)}</td>
                <td className="p-2 text-right">{formatCurrency(f.afterTaxCFBeforeDep)}</td>
                <td className="p-2 text-right text-purple-600">{formatCurrency(c.taxShieldDep)}</td>
                <td className="p-2 text-right text-purple-600">{formatCurrency(f.taxShieldDep)}</td>
                <td className="p-2 text-right font-semibold">{formatCurrency(f.loanBalance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
