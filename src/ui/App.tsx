import React, { useState } from 'react';
import { initialInputs, InputState } from '../valuation/inputs';
import { computeAnalysis } from '../valuation/engine';
import { ResultsView } from './ResultsView';
import { InputsForm } from './InputsForm';
import { AuthForm } from './AuthForm';
import { PropertyManager } from './PropertyManager';
import { OptimizationPanel } from './OptimizationPanel';
import { buildCsv, downloadCsv } from '../util/csv';
import { useAuth } from '../auth/AuthContext';
import { optimizeFinancing, getOptimizationRecommendation } from '../valuation/optimizer';
import { PropertyService } from '../auth/service';

export const App: React.FC = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const [inputs, setInputs] = useState<InputState>(initialInputs);
  console.log('🎯 App state interestRate:', inputs.interestRate);
  
  const handleInputChange = (newInputs: InputState) => {
    console.log('📝 InputsForm onChange fired - interestRate:', newInputs.interestRate);
    setInputs(newInputs);
  };

  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const analysis = computeAnalysis(inputs);
  const optimization = optimizeFinancing(inputs);
  const recommendation = getOptimizationRecommendation(optimization);

  const handleLoadProperty = (propertyId: string, propertyInputs: InputState) => {
    setCurrentPropertyId(propertyId);
    console.log('📂 Loading property with inputs:', propertyInputs);
    console.log('📊 Loaded field count:', Object.keys(propertyInputs).length);
    console.log('📋 Loaded fields:', Object.keys(propertyInputs));
    
    // Merge with defaults to ensure all required fields are present (for backward compatibility)
    const mergedInputs = { ...initialInputs, ...propertyInputs };
    console.log('✅ After merge field count:', Object.keys(mergedInputs).length);
    console.log('✅ After merge fields:', Object.keys(mergedInputs));
    
    setInputs(mergedInputs);
  };

  const handleSaveCurrentProperty = () => {
    if (currentPropertyId) {
      console.log('💾 Saving property with inputs:', inputs);
      console.log('📊 Input field count:', Object.keys(inputs).length);
      console.log('📋 All fields:', Object.keys(inputs));
      console.log('🔍 Individual values:', {
        address: inputs.address,
        purchasePrice: inputs.purchasePrice,
        closingCosts: inputs.closingCosts,
        loanPercent: inputs.loanPercent,
        interestRate: inputs.interestRate,
        loanTermYears: inputs.loanTermYears,
        grossAnnualRent: inputs.grossAnnualRent,
        rentGrowth: inputs.rentGrowth,
        taxes: inputs.taxes,
        insurance: inputs.insurance,
        hoa: inputs.hoa,
        otherExpenses: inputs.otherExpenses,
        expenseGrowth: inputs.expenseGrowth,
        landPercent: inputs.landPercent,
        horizonYears: inputs.horizonYears,
        appreciation: inputs.appreciation,
        sellingCostsPercent: inputs.sellingCostsPercent,
        taxRate: inputs.taxRate,
        capGainsRate: inputs.capGainsRate,
      });
      try {
        PropertyService.updateProperty(currentPropertyId, { inputs });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: any) {
        alert('Error saving property: ' + err.message);
      }
    }
  };

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Rental Property Analyzer</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
          <button
            onClick={signOut}
            className="bg-gray-600 text-white text-sm px-3 py-1 rounded hover:bg-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <PropertyManager
            userId={user!.id}
            currentInputs={inputs}
            onLoadProperty={(propertyId, inputs) => handleLoadProperty(propertyId, inputs)}
          />
        </div>
        
        <div className="lg:col-span-3 space-y-6">
          <OptimizationPanel
            optimization={optimization}
            recommendation={recommendation}
            onApplyOptimal={(loanPercent) => setInputs({ ...inputs, loanPercent })}
          />
          
          <div className="flex gap-2 flex-wrap">
            {currentPropertyId && (
              <button
                onClick={handleSaveCurrentProperty}
                className={`text-sm px-3 py-1 rounded ${
                  saveSuccess
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                } text-white`}
              >
                {saveSuccess ? '✓ Saved' : 'Save Changes'}
              </button>
            )}
            <button
              onClick={() => {
                const csv = buildCsv(analysis.cash.yearly as any, analysis.financed.yearly as any);
                downloadCsv('analysis.csv', csv);
              }}
              className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700">
              Export CSV
            </button>
          </div>
          <InputsForm value={inputs} onChange={handleInputChange} />
          <ResultsView analysis={analysis} />
        </div>
      </div>
    </div>
  );
};
