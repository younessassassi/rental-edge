import React, { useState } from 'react';
import { InputState } from '../valuation/inputs';
import { fetchListing, Listing } from '../util/listingClient';
import { PropertyPreview } from './PropertyPreview';

export const InputsForm: React.FC<{ value: InputState; onChange(v: InputState): void; }> = ({ value, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listing, setListing] = useState<Listing | null>(null);

  function update<K extends keyof InputState>(k: K, v: InputState[K]) {
    onChange({ ...value, [k]: typeof v === 'number' ? Number(v) : v } as InputState);
  }

  const handleFetchListing = async () => {
    if (!value.address?.trim()) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError('');
    setListing(null);

    try {
      const fetchedListing = await fetchListing(value.address);
      setListing(fetchedListing);
      onChange({
        ...value,
        purchasePrice: fetchedListing.listPrice,
        grossAnnualRent: fetchedListing.grossAnnualRent || value.grossAnnualRent,
        taxes: fetchedListing.taxes || value.taxes,
        insurance: fetchedListing.insurance || value.insurance,
        hoa: fetchedListing.hoa ?? value.hoa,
      });
    } catch (err: any) {
      setError(`Error fetching listing: ${err.message}`);
      setListing(null);
    } finally {
      setLoading(false);
    }
  };

  const numInput = (label: string, k: keyof InputState, step = 0.01) => (
    <label className="flex flex-col gap-1 text-sm" key={k as string}>
      <span className="font-medium">{label}</span>
      <input
        type="number"
        step={step}
        value={value[k] as number}
        onChange={(e) => update(k, parseFloat(e.target.value))}
        className="border rounded px-2 py-1"
      />
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
        placeholder="Enter property address"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow space-y-3">
        <div className="font-semibold text-sm">📍 Property Address (Optional)</div>
        <div className="flex gap-2">
          <div className="flex-1">
            {textInput('Address', 'address')}
          </div>
          <button
            onClick={handleFetchListing}
            disabled={loading}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400 self-end h-fit font-medium transition-colors"
          >
            {loading ? '⏳ Fetching...' : '🔍 Fetch Listing'}
          </button>
        </div>
        {error && <div className="text-red-600 text-xs bg-red-50 p-2 rounded">{error}</div>}
      </div>

      {/* Property Preview */}
      <PropertyPreview listing={listing} loading={loading} error={error} />

      <div className="grid md:grid-cols-4 gap-4 bg-white p-4 rounded shadow">
        {numInput('Purchase Price', 'purchasePrice', 1000)}
        {numInput('Closing Costs', 'closingCosts', 100)}
        {numInput('Loan %', 'loanPercent', 0.01)}
        {numInput('Interest Rate', 'interestRate', 0.001)}
        {numInput('Loan Term (yrs)', 'loanTermYears', 1)}
        {numInput('Gross Annual Rent', 'grossAnnualRent', 100)}
        {numInput('Rent Growth %', 'rentGrowth', 0.001)}
        {numInput('Taxes (annual)', 'taxes', 100)}
        {numInput('Insurance (annual)', 'insurance', 50)}
        {numInput('HOA (annual)', 'hoa', 50)}
        {numInput('Other Expenses (annual)', 'otherExpenses', 50)}
        {numInput('Expense Growth %', 'expenseGrowth', 0.001)}
        {numInput('Land %', 'landPercent', 0.01)}
        {numInput('Horizon (yrs)', 'horizonYears', 1)}
        {numInput('Appreciation %', 'appreciation', 0.001)}
        {numInput('Selling Costs %', 'sellingCostsPercent', 0.001)}
        {numInput('Tax Rate %', 'taxRate', 0.001)}
        {numInput('Cap Gains Rate %', 'capGainsRate', 0.001)}
      </div>
    </div>
  );
};
