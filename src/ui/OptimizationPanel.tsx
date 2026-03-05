import React, { useState } from 'react';
import { OptimizationResult } from '../valuation/optimizer';
import { RateByLoanPercent } from '../valuation/inputs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface OptimizationPanelProps {
  optimization: OptimizationResult;
  recommendation: string;
  rateByLoanPercent: RateByLoanPercent;
  onApplyOptimal: (loanPercent: number, interestRate: number) => void;
  onRateMapChange: (rateMap: RateByLoanPercent) => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  optimization,
  recommendation,
  rateByLoanPercent,
  onApplyOptimal,
  onRateMapChange,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showRateEditor, setShowRateEditor] = useState(false);

  const loanPercentOptions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

  const handleRateChange = (loanPct: number, newRate: string) => {
    const parsed = parseFloat(newRate);
    const rate = isNaN(parsed) ? '' : parsed;
    onRateMapChange({ ...rateByLoanPercent, [String(loanPct)]: rate as any });
  };

  const getBestRate = () => {
    const bestLp = optimization.bestLoanPercent;
    const tierRate = rateByLoanPercent[String(bestLp)];
    return tierRate !== undefined ? tierRate : 0;
  };
  
  const chartData = optimization.allScenarios.map(s => ({
    loanPercent: s.loanPercent * 100,
    irr: s.irr * 100,
    totalWealth: s.totalWealth
  }));

  const formatCurrencyAxis = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  const hasImprovement = Math.abs(optimization.improvement.irrIncrease) > 0.001 || 
                        Math.abs(optimization.improvement.wealthIncrease) > 100;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-900">Financing Optimization</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRateEditor(!showRateEditor)}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            {showRateEditor ? 'Hide Rates' : 'Edit Rates by Down Payment'}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {showRateEditor && (
        <div className="mb-4 p-3 bg-white rounded border">
          <h4 className="font-medium text-sm text-blue-900 mb-2">Interest Rate by Down Payment</h4>
          <p className="text-xs text-gray-500 mb-3">Set a different mortgage rate for each financing level. The optimizer will use these rates when comparing scenarios.</p>
          <div className="grid grid-cols-3 gap-2">
            {loanPercentOptions.map(lp => {
              const downPct = ((1 - lp) * 100).toFixed(0);
              const currentRate = rateByLoanPercent[String(lp)];
              return (
                <label key={lp} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-gray-700">{downPct}% down:</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={currentRate ?? ''}
                    onChange={(e) => handleRateChange(lp, e.target.value)}
                    className="border rounded px-1.5 py-0.5 w-20 text-xs"
                    placeholder={lp === 0 ? 'N/A' : 'rate'}
                    disabled={lp === 0}
                  />
                  {lp > 0 && currentRate !== undefined && <span className="text-gray-400">{(Number(currentRate) * 100).toFixed(2)}%</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-blue-800 mb-2">{recommendation}</p>
        
        {hasImprovement && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => onApplyOptimal(optimization.bestLoanPercent, getBestRate())}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Apply Optimal ({(optimization.bestLoanPercent * 100).toFixed(0)}% financing, ${((1 - optimization.bestLoanPercent) * optimization.allScenarios[0].analysis.inputs.purchasePrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} down)
            </button>
            <span className="text-sm text-blue-600">
              Current IRR: {(optimization.currentIRR * 100).toFixed(2)}% → 
              Optimal IRR: {(optimization.bestIRR * 100).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-900 mb-1">📈 IRR by Loan-to-Value Ratio</h4>
              <p className="text-xs text-gray-600 mb-2">How much return you make per year at different debt levels. Higher point = better annual return. Sweet spot balances borrowing with profitability.</p>
              <div className="h-40 bg-white p-2 rounded border">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="loanPercent" />
                    <YAxis tickFormatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Tooltip formatter={(value, name) => [
                      name === 'irr' ? `${Number(value).toFixed(2)}%` : value,
                      name === 'irr' ? 'IRR' : 'Total Wealth'
                    ]} />
                    <Line type="monotone" dataKey="irr" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-900 mb-1">💰 Total Wealth by Loan-to-Value Ratio</h4>
              <p className="text-xs text-gray-600 mb-2">Total money you'll have after 15 years at different debt levels. Shows if borrowing more saves you or costs you in the long run.</p>
              <div className="h-40 bg-white p-2 rounded border">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="loanPercent" />
                    <YAxis tickFormatter={formatCurrencyAxis} />
                    <Tooltip formatter={(value) => [
                      `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                      'Total Wealth'
                    ]} />
                    <Line type="monotone" dataKey="totalWealth" stroke="#16a34a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-900 mb-2">📊 All Scenarios (Green = Recommended)</h4>
            <div className="bg-white rounded border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Loan %</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">IRR</th>
                    <th className="p-2 text-right">Total Wealth</th>
                    <th className="p-2 text-right">Down Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {optimization.allScenarios.map((scenario, i) => {
                    const tierRate = rateByLoanPercent[String(scenario.loanPercent)];
                    const displayRate = scenario.loanPercent === 0 ? 'N/A' : (tierRate !== undefined ? `${(Number(tierRate) * 100).toFixed(2)}%` : `${(scenario.analysis.inputs.interestRate * 100).toFixed(2)}%`);
                    return (
                    <tr key={i} className={`${scenario.loanPercent === optimization.bestLoanPercent ? 'bg-green-50 font-medium' : ''} ${i % 2 ? 'bg-gray-25' : ''}`}>
                      <td className="p-2">{(scenario.loanPercent * 100).toFixed(0)}%</td>
                      <td className="p-2 text-right">{displayRate}</td>
                      <td className="p-2 text-right">{(scenario.irr * 100).toFixed(2)}%</td>
                      <td className="p-2 text-right">${scenario.totalWealth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-2 text-right">${((1 - scenario.loanPercent) * scenario.analysis.inputs.purchasePrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
