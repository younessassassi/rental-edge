import React, { useEffect, useState } from 'react';
import { initialInputs, InputState, RateByLoanPercent, PointsByLoanPercent } from '../valuation/inputs';
import { computeAnalysis } from '../valuation/engine';
import { ResultsView } from './ResultsView';
import { InputsForm } from './InputsForm';
import { AuthForm } from './AuthForm';
import { PropertyManager } from './PropertyManager';
import { OptimizationPanel } from './OptimizationPanel';
import { buildCsv, downloadCsv } from '../util/csv';
import { downloadExcel } from '../util/excel';
import { useAuth } from '../auth/AuthContext';
import { optimizeFinancing, getOptimizationRecommendation } from '../valuation/optimizer';
import { PropertyService } from '../auth/service';

export const App: React.FC = () => {
  const { isAuthenticated, user, signOut, loading: authLoading } = useAuth();
  const [inputs, setInputs] = useState<InputState>(initialInputs);
  const [hasAutoLoadedLatest, setHasAutoLoadedLatest] = useState(false);
  
  const handleInputChange = (newInputs: InputState) => {
    setInputs(newInputs);
  };

  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [currentPropertyName, setCurrentPropertyName] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [propertyRefreshKey, setPropertyRefreshKey] = useState(0);
  // Resolve per-tier rate/points overrides for the current loan percent
  const effectiveInputs = (() => {
    const rateMap = inputs.rateByLoanPercent || {};
    const pointsMap = inputs.pointsByLoanPercent || {};
    const tierRate = rateMap[String(inputs.loanPercent)];
    const tierPoints = pointsMap[String(inputs.loanPercent)];
    return {
      ...inputs,
      interestRate: tierRate !== undefined ? tierRate : inputs.interestRate,
      loanPoints: tierPoints !== undefined ? tierPoints : inputs.loanPoints,
    };
  })();
  const analysis = computeAnalysis(effectiveInputs);
  const optimization = optimizeFinancing(inputs);
  const recommendation = getOptimizationRecommendation(optimization);

  useEffect(() => {
    if (!user?.id || hasAutoLoadedLatest) {
      return;
    }

    PropertyService.getProperties(user.id).then((userProperties) => {
      if (userProperties.length > 0) {
        const latestProperty = userProperties[0];
        const mergedInputs = { ...initialInputs, ...latestProperty.inputs };
        setCurrentPropertyId(latestProperty.id);
        setCurrentPropertyName(latestProperty.name);
        setInputs(mergedInputs);
      }
      setHasAutoLoadedLatest(true);
    });
  }, [user?.id, hasAutoLoadedLatest]);

  useEffect(() => {
    if (!user?.id) {
      setHasAutoLoadedLatest(false);
    }
  }, [user?.id]);

  const handleLoadProperty = (propertyId: string, propertyInputs: InputState, propertyName: string) => {
    setCurrentPropertyId(propertyId);
    setCurrentPropertyName(propertyName);

    // Merge with defaults to ensure all required fields are present (for backward compatibility)
    const mergedInputs = { ...initialInputs, ...propertyInputs };

    setInputs(mergedInputs);
  };

  const handleSaveCurrentProperty = async () => {
    if (currentPropertyId) {
      try {
        await PropertyService.updateProperty(currentPropertyId, { inputs });
        setSaveSuccess(true);
        setPropertyRefreshKey(k => k + 1);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: any) {
        alert('Error saving property: ' + err.message);
      }
    }
  };

  const handleCreateNewProperty = () => {
    setCurrentPropertyId(null);
    setCurrentPropertyName(null);
    setSaveSuccess(false);
    setInputs(initialInputs);
  };

  const handleExportExcel = async () => {
    if (!user?.id) return;
    try {
      const allProperties = await PropertyService.getProperties(user.id);
      const propertyDataList = allProperties.map(p => ({
        name: p.name,
        inputs: { ...initialInputs, ...p.inputs } as InputState,
      }));
      if (propertyDataList.length === 0) {
        // No saved properties — export current inputs
        propertyDataList.push({
          name: currentPropertyName || 'Current Property',
          inputs: inputs,
        });
      }
      downloadExcel(propertyDataList);
    } catch (err: any) {
      alert('Error exporting: ' + err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

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
            refreshKey={propertyRefreshKey}
            onLoadProperty={(propertyId, inputs, name) => handleLoadProperty(propertyId, inputs, name)}
            onCreateNewProperty={handleCreateNewProperty}
          />
        </div>
        
        <div className="lg:col-span-3 space-y-6">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border rounded-lg shadow-sm px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentPropertyName || 'Untitled Property'}
              </h2>
              {!currentPropertyId && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Unsaved</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentPropertyId && (
                <button
                  onClick={handleSaveCurrentProperty}
                  className={`text-sm px-4 py-1.5 rounded font-medium ${
                    saveSuccess
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                  } text-white`}
                >
                  {saveSuccess ? '\u2713 Saved' : 'Save Changes'}
                </button>
              )}
              <button
                onClick={() => {
                  const csv = buildCsv(analysis.cash.yearly as any, analysis.financed.yearly as any);
                  downloadCsv('analysis.csv', csv);
                }}
                className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded hover:bg-emerald-700">
                Export All (Excel)
              </button>
            </div>
          </div>

          <OptimizationPanel
            optimization={optimization}
            recommendation={recommendation}
            rateByLoanPercent={inputs.rateByLoanPercent || {}}
            pointsByLoanPercent={inputs.pointsByLoanPercent || {}}
            defaultRate={inputs.interestRate}
            defaultPoints={inputs.loanPoints}
            onApplyOptimal={(loanPercent, interestRate, loanPoints) => setInputs({ ...inputs, loanPercent, interestRate, loanPoints })}
            onRateMapChange={(rateMap: RateByLoanPercent) => setInputs({ ...inputs, rateByLoanPercent: rateMap })}
            onPointsMapChange={(pointsMap: PointsByLoanPercent) => setInputs({ ...inputs, pointsByLoanPercent: pointsMap })}
          />
          
          <InputsForm value={inputs} onChange={handleInputChange} />
          <ResultsView analysis={analysis} />
        </div>
      </div>
    </div>
  );
};
