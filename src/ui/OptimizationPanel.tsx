import React, { useState } from 'react';
import { OptimizationResult } from '../valuation/optimizer';
import { RateByLoanPercent, PointsByLoanPercent } from '../valuation/inputs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface OptimizationPanelProps {
  optimization: OptimizationResult;
  recommendation: string;
  rateByLoanPercent: RateByLoanPercent;
  pointsByLoanPercent: PointsByLoanPercent;
  defaultRate: number;
  defaultPoints: number;
  onApplyOptimal: (loanPercent: number, interestRate: number, loanPoints: number) => void;
  onRateMapChange: (rateMap: RateByLoanPercent) => void;
  onPointsMapChange: (pointsMap: PointsByLoanPercent) => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  optimization,
  recommendation,
  rateByLoanPercent,
  pointsByLoanPercent,
  defaultRate,
  defaultPoints,
  onApplyOptimal,
  onRateMapChange,
  onPointsMapChange,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showRateEditor, setShowRateEditor] = useState(false);

  const loanPercentOptions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

  const handleRateChange = (loanPct: number, newRate: string) => {
    const parsed = parseFloat(newRate);
    if (isNaN(parsed)) {
      const { [String(loanPct)]: _, ...rest } = rateByLoanPercent;
      onRateMapChange(rest);
    } else {
      onRateMapChange({ ...rateByLoanPercent, [String(loanPct)]: parsed / 100 });
    }
  };

  const handlePointsChange = (loanPct: number, newPoints: string) => {
    const parsed = parseFloat(newPoints);
    if (isNaN(parsed)) {
      const { [String(loanPct)]: _, ...rest } = pointsByLoanPercent;
      onPointsMapChange(rest);
    } else {
      onPointsMapChange({ ...pointsByLoanPercent, [String(loanPct)]: parsed / 100 });
    }
  };

  const getBestRate = () => {
    const best = optimization.allScenarios.find(s => s.loanPercent === optimization.bestLoanPercent);
    return best ? best.analysis.inputs.interestRate : defaultRate;
  };

  const getBestPoints = () => {
    const best = optimization.allScenarios.find(s => s.loanPercent === optimization.bestLoanPercent);
    return best ? best.analysis.inputs.loanPoints : defaultPoints;
  };
  
  const chartData = optimization.allScenarios.map(s => ({
    downPercent: ((1 - s.loanPercent) * 100),
    irr: s.irr * 100,
    totalWealth: s.totalWealth,
    netProfit: s.netProfit,
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
        <h3 className="text-lg font-semibold text-blue-900">Find Your Best Down Payment</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRateEditor(!showRateEditor)}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            {showRateEditor ? 'Hide Rates & Points' : 'Edit Rates & Points by Down Payment'}
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
          <h4 className="font-medium text-sm text-blue-900 mb-2">Interest Rate & Loan Points by Down Payment</h4>
          <p className="text-xs text-gray-500 mb-3">Set a different mortgage rate and loan points (fees) for each financing level. The optimizer will use these when comparing scenarios.</p>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="p-1 w-20">Down Pmt</th>
                  <th className="p-1">Rate</th>
                  <th className="p-1">Points</th>
                </tr>
              </thead>
              <tbody>
                {loanPercentOptions.map(lp => {
                  const currentRate = rateByLoanPercent[String(lp)];
                  const currentPoints = pointsByLoanPercent[String(lp)];
                  return (
                    <tr key={lp}>
                      <td className="p-1 text-gray-700 font-medium">{((1 - lp) * 100).toFixed(0)}% down</td>
                      <td className="p-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={currentRate !== undefined ? parseFloat((currentRate * 100).toFixed(4)) : ''}
                            onChange={(e) => handleRateChange(lp, e.target.value)}
                            className={`border rounded px-1.5 py-0.5 w-20 text-xs ${currentRate === undefined && lp > 0 ? 'text-gray-400' : ''}`}
                            placeholder={lp === 0 ? 'N/A' : String(parseFloat((defaultRate * 100).toFixed(4)))}
                            disabled={lp === 0}
                          />
                          {lp > 0 && <span className="text-gray-400 text-xs">%</span>}
                        </div>
                      </td>
                      <td className="p-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={currentPoints !== undefined ? parseFloat((currentPoints * 100).toFixed(4)) : ''}
                            onChange={(e) => handlePointsChange(lp, e.target.value)}
                            className={`border rounded px-1.5 py-0.5 w-20 text-xs ${currentPoints === undefined && lp > 0 ? 'text-gray-400' : ''}`}
                            placeholder={lp === 0 ? 'N/A' : String(parseFloat((defaultPoints * 100).toFixed(4)))}
                            disabled={lp === 0}
                          />
                          {lp > 0 && <span className="text-gray-400 text-xs">%</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-blue-800 mb-2">{recommendation}</p>
        
        {hasImprovement && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => onApplyOptimal(optimization.bestLoanPercent, getBestRate(), getBestPoints())}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Apply Recommended ({((1 - optimization.bestLoanPercent) * 100).toFixed(0)}% down, ${((1 - optimization.bestLoanPercent) * optimization.allScenarios[0].analysis.inputs.purchasePrice).toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </button>
            <span className="text-sm text-blue-600">
              Your Return: {(optimization.currentIRR * 100).toFixed(2)}% → 
              Best Return: {(optimization.bestIRR * 100).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-900 mb-1">📈 Annual Return by Down Payment</h4>
              <p className="text-xs text-gray-600 mb-2">How much return you earn per year at each down payment level. Higher = better.</p>
              <div className="h-40 bg-white p-2 rounded border">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="downPercent" tickFormatter={(v: number) => `${v}%`} />
                    <YAxis tickFormatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Tooltip formatter={(value, name) => [
                      name === 'irr' ? `${Number(value).toFixed(2)}%` : value,
                      name === 'irr' ? 'Annual Return' : 'Total Profit'
                    ]} />
                    <Line type="monotone" dataKey="irr" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-900 mb-1">💰 Net Profit by Down Payment</h4>
              <p className="text-xs text-gray-600 mb-2">Total profit (rental income + sale) minus your upfront cash investment.</p>
              <div className="h-40 bg-white p-2 rounded border">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="downPercent" tickFormatter={(v: number) => `${v}%`} />
                    <YAxis tickFormatter={formatCurrencyAxis} />
                    <Tooltip formatter={(value) => [
                      `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                      'Net Profit'
                    ]} />
                    <Line type="monotone" dataKey="netProfit" stroke="#16a34a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-900 mb-2">📊 All Down Payment Options (Green = Recommended)</h4>
            <div className="bg-white rounded border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Down Pmt</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Points</th>
                    <th className="p-2 text-right">Annual Return</th>
                    <th className="p-2 text-right">Cash Outlay</th>
                    <th className="p-2 text-right">Total Returns</th>
                    <th className="p-2 text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {optimization.allScenarios.map((scenario, i) => {
                    const computedRate = scenario.analysis.inputs.interestRate;
                    const computedPoints = scenario.analysis.inputs.loanPoints;
                    const displayRate = scenario.loanPercent === 0 ? 'N/A' : `${(computedRate * 100).toFixed(2)}%`;
                    const displayPoints = scenario.loanPercent === 0 ? 'N/A' : (computedPoints > 0 ? `${(computedPoints * 100).toFixed(2)}%` : '0');
                    return (
                    <tr key={i} className={`${scenario.loanPercent === optimization.bestLoanPercent ? 'bg-green-50 font-medium' : ''} ${i % 2 ? 'bg-gray-25' : ''}`}>
                      <td className="p-2">{((1 - scenario.loanPercent) * 100).toFixed(0)}% down</td>
                      <td className="p-2 text-right">{displayRate}</td>
                      <td className="p-2 text-right">{displayPoints}</td>
                      <td className="p-2 text-right">{(scenario.irr * 100).toFixed(2)}%</td>
                      <td className="p-2 text-right">${scenario.cashOutlay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-2 text-right">${scenario.totalWealth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-2 text-right font-semibold">${scenario.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
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
