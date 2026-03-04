import React, { useState, useEffect } from 'react';
import { SavedProperty } from '../auth/types';
import { PropertyService } from '../auth/service';
import { InputState } from '../valuation/inputs';

interface PropertyManagerProps {
  userId: string;
  currentInputs: InputState;
  onLoadProperty: (propertyId: string, inputs: InputState) => void;
}

export const PropertyManager: React.FC<PropertyManagerProps> = ({ 
  userId, 
  currentInputs, 
  onLoadProperty 
}) => {
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [propertyName, setPropertyName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadProperties();
  }, [userId]);

  const loadProperties = () => {
    const userProperties = PropertyService.getProperties(userId);
    setProperties(userProperties);
  };

  const handleSave = () => {
    if (!propertyName.trim()) {
      setError('Property name is required');
      return;
    }

    try {
      PropertyService.saveProperty({
        name: propertyName,
        inputs: currentInputs,
        userId
      });
      setPropertyName('');
      setSaveDialogOpen(false);
      setError('');
      loadProperties();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLoad = (property: SavedProperty) => {
    onLoadProperty(property.id, property.inputs);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      PropertyService.deleteProperty(id);
      loadProperties();
    }
  };

  const startEdit = (property: SavedProperty) => {
    setEditingId(property.id);
    setEditName(property.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) {
      setError('Property name is required');
      return;
    }

    try {
      PropertyService.updateProperty(id, { name: editName });
      setEditingId(null);
      setEditName('');
      setError('');
      loadProperties();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Saved Properties</h3>
        <button
          onClick={() => setSaveDialogOpen(true)}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          Save Current
        </button>
      </div>

      {saveDialogOpen && (
        <div className="mb-4 p-3 border rounded bg-gray-50">
          <input
            type="text"
            placeholder="Property name"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            className="w-full px-2 py-1 border rounded mb-2"
          />
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setSaveDialogOpen(false);
                setPropertyName('');
                setError('');
              }}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {properties.length === 0 ? (
          <p className="text-gray-500 text-sm">No saved properties yet</p>
        ) : (
          properties.map((property) => (
            <div key={property.id} className="p-2 border rounded">
              {editingId === property.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                    autoFocus
                  />
                  {error && <div className="text-red-600 text-xs">{error}</div>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(property.id)}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{property.name}</div>
                    <div className="text-sm text-gray-500">
                      Saved {new Date(property.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleLoad(property)}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => startEdit(property)}
                      className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(property.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
