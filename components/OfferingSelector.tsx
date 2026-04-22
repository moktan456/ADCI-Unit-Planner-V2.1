import React, { useState } from 'react';
import { Check, Search, RotateCcw, Save } from 'lucide-react';
import { MASTER_UNIT_ORDER, COMMON_UNITS, CYBER_ONLY_UNITS, DATA_ONLY_UNITS, OFFERED_UNITS as DEFAULT_OFFERED_UNITS } from '../constants';
import { clsx } from 'clsx';

interface OfferingSelectorProps {
  selectedUnits: Set<string>;
  onUpdate: (newSet: Set<string>) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const OfferingSelector: React.FC<OfferingSelectorProps> = ({ selectedUnits, onUpdate, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedUnits));
  const [hasChanges, setHasChanges] = useState(false);

  const toggleUnit = (unit: string) => {
    const next = new Set(localSelected);
    if (next.has(unit)) {
      next.delete(unit);
    } else {
      next.add(unit);
    }
    setLocalSelected(next);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(localSelected);
    setHasChanges(false);
    showToast("Unit offerings updated successfully");
  };

  const handleReset = () => {
    setLocalSelected(new Set(DEFAULT_OFFERED_UNITS));
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    setLocalSelected(new Set(MASTER_UNIT_ORDER));
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    setLocalSelected(new Set());
    setHasChanges(true);
  };

  const filteredUnits = MASTER_UNIT_ORDER.filter(u => u.toLowerCase().includes(searchTerm.toLowerCase()));

  const getUnitType = (unit: string) => {
    if (CYBER_ONLY_UNITS.has(unit)) return 'Cyber';
    if (DATA_ONLY_UNITS.has(unit)) return 'Data';
    return 'Common';
  };

  const getStyle = (type: string, isSelected: boolean) => {
     if (!isSelected) return "bg-white border-slate-200 hover:border-slate-300 opacity-60 hover:opacity-100";
     switch (type) {
         case 'Cyber': return "bg-indigo-50 border-indigo-200 shadow-sm";
         case 'Data': return "bg-emerald-50 border-emerald-200 shadow-sm";
         default: return "bg-amber-50 border-amber-200 shadow-sm";
     }
  };
  
  const getBadgeColor = (type: string) => {
      switch (type) {
          case 'Cyber': return "text-indigo-400";
          case 'Data': return "text-emerald-400";
          default: return "text-amber-400";
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-200px)] animate-fade-in">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Unit Offerings Configuration</h2>
          <p className="text-sm text-slate-500">Select which units are available for the Upcoming Semester.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {hasChanges && (
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm animate-pulse"
            >
              <Save className="w-4 h-4" /> Apply Changes
            </button>
          )}
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset Default
          </button>
        </div>
      </div>

      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search units..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
         </div>
         <div className="flex gap-2 text-xs">
            <button onClick={handleSelectAll} className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600">Select All</button>
            <button onClick={handleDeselectAll} className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600">Deselect All</button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredUnits.map(unit => {
            const isSelected = localSelected.has(unit);
            const unitType = getUnitType(unit);
            return (
              <div 
                key={unit}
                onClick={() => toggleUnit(unit)}
                className={clsx("relative flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none", getStyle(unitType, isSelected))}
              >
                <div className="flex flex-col">
                  <span className={clsx("font-bold text-sm", isSelected ? "text-slate-800" : "text-slate-500")}>{unit}</span>
                  <span className={clsx("text-[10px] uppercase tracking-wider font-bold", getBadgeColor(unitType))}>{unitType}</span>
                </div>
                <div className={clsx("w-5 h-5 rounded flex items-center justify-center transition-colors", isSelected ? "bg-primary text-white" : "bg-slate-100 text-transparent")}>
                  <Check className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
        {filteredUnits.length === 0 && <div className="text-center py-10 text-slate-400">No units match your search.</div>}
      </div>
      <div className="bg-slate-50 p-3 text-center text-xs text-slate-400 border-t border-slate-100">Changes to unit availability will immediately update all student study plans and demand forecasts.</div>
    </div>
  );
};

export default OfferingSelector;