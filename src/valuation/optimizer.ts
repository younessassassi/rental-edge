import { InputState } from './inputs';
import { computeAnalysis, AnalysisResult } from './engine';

export interface OptimizationResult {
  bestLoanPercent: number;
  bestIRR: number;
  bestTotalWealth: number;
  bestNetProfit: number;
  currentIRR: number;
  currentTotalWealth: number;
  currentNetProfit: number;
  improvement: {
    irrIncrease: number; // percentage points
    wealthIncrease: number; // dollar amount
    netProfitIncrease: number; // dollar amount
  };
  allScenarios: Array<{
    loanPercent: number;
    irr: number;
    totalWealth: number;
    cashOutlay: number;
    netProfit: number;
    analysis: AnalysisResult;
  }>;
}

export function optimizeFinancing(inputs: InputState): OptimizationResult {
  const scenarios = [];
  // Restrict to maximum 80% financing (minimum 20% down payment)
  const loanPercentOptions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  
  // Test different loan percentages, using per-tier interest rate and points if available
  const rateMap = inputs.rateByLoanPercent || {};
  const pointsMap = inputs.pointsByLoanPercent || {};
  for (const loanPercent of loanPercentOptions) {
    const tierRate = rateMap[String(loanPercent)];
    const interestRate = tierRate !== undefined ? tierRate : inputs.interestRate;
    const tierPoints = pointsMap[String(loanPercent)];
    const loanPoints = tierPoints !== undefined ? tierPoints : inputs.loanPoints;
    const testInputs = { ...inputs, loanPercent, interestRate, loanPoints };
    const analysis = computeAnalysis(testInputs);
    
    // Use financed scenario if loan > 0, otherwise cash scenario
    const relevantScenario = loanPercent > 0 ? analysis.financed : analysis.cash;
    const irr = relevantScenario.irr || 0;
    const totalWealth = relevantScenario.totalWealth;
    const cashOutlay = relevantScenario.cashOutlay;
    const netProfit = relevantScenario.netProfit;
    
    scenarios.push({
      loanPercent,
      irr,
      totalWealth,
      cashOutlay,
      netProfit,
      analysis
    });
  }
  
  // Find best scenario by IRR (primary) and net profit (secondary)
  const bestScenario = scenarios.reduce((best, current) => {
    if (current.irr > best.irr) return current;
    if (current.irr === best.irr && current.netProfit > best.netProfit) return current;
    return best;
  });
  
  // Current scenario results
  const currentAnalysis = computeAnalysis(inputs);
  const currentScenario = inputs.loanPercent > 0 ? currentAnalysis.financed : currentAnalysis.cash;
  const currentIRR = currentScenario.irr || 0;
  const currentTotalWealth = currentScenario.totalWealth;
  const currentNetProfit = currentScenario.netProfit;
  
  return {
    bestLoanPercent: bestScenario.loanPercent,
    bestIRR: bestScenario.irr,
    bestTotalWealth: bestScenario.totalWealth,
    bestNetProfit: bestScenario.netProfit,
    currentIRR,
    currentTotalWealth,
    currentNetProfit,
    improvement: {
      irrIncrease: bestScenario.irr - currentIRR,
      wealthIncrease: bestScenario.totalWealth - currentTotalWealth,
      netProfitIncrease: bestScenario.netProfit - currentNetProfit,
    },
    allScenarios: scenarios
  };
}

export function getOptimizationRecommendation(optimization: OptimizationResult): string {
  const { bestLoanPercent, improvement, allScenarios } = optimization;
  
  if (Math.abs(improvement.irrIncrease) < 0.001 && Math.abs(improvement.wealthIncrease) < 100) {
    return "Your current financing is already optimal!";
  }
  
  const loanPercentDisplay = (bestLoanPercent * 100).toFixed(0);
  const downPaymentDisplay = ((1 - bestLoanPercent) * 100).toFixed(0);
  const irrImprovement = (improvement.irrIncrease * 100).toFixed(2);
  const wealthImprovement = improvement.wealthIncrease.toLocaleString(undefined, { maximumFractionDigits: 0 });
  
  // Get purchase price from the best scenario
  const purchasePrice = allScenarios.find(s => s.loanPercent === bestLoanPercent)?.analysis.inputs.purchasePrice || 0;
  const downPaymentAmount = ((1 - bestLoanPercent) * purchasePrice).toLocaleString(undefined, { maximumFractionDigits: 0 });
  
  if (bestLoanPercent === 0) {
    return `💡 Consider a cash purchase ($${downPaymentAmount} down) to increase your annual return by ${irrImprovement}% and total profit by $${wealthImprovement}`;
  } else {
    return `💡 Consider ${loanPercentDisplay}% financing (${downPaymentDisplay}% down = $${downPaymentAmount}) to increase your annual return by ${irrImprovement}% and total profit by $${wealthImprovement}`;
  }
}
