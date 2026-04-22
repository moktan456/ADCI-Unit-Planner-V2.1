import React, { useState } from 'react';
import { Calendar, ChevronRight, Book, AlertTriangle, Edit3, Trash2, Check, X as CloseIcon } from 'lucide-react';
import { ProcessedData, StudentProfile } from '../types';
import { clsx } from 'clsx';
import { MASTER_UNIT_ORDER } from '../constants';

interface StudyPlanViewProps {
  data: ProcessedData;
  student: StudentProfile | null;
  onClose: () => void;
  onUpdateManualPlan?: (studentId: string, term: string, units: string[]) => void;
}

const StudyPlanView: React.FC<StudyPlanViewProps> = ({ data, student, onClose, onUpdateManualPlan }) => {
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [editUnits, setEditUnits] = useState<string[]>([]);
  
  if (!student) return null;

  const plan = data.plans.find(p => p.studentId === student.id);
  const planItems = plan ? plan.plans : [];

  const handleStartEdit = (term: string, currentUnits: string[]) => {
    setEditingTerm(term);
    setEditUnits([...currentUnits]);
  };

  const handleSaveEdit = () => {
    if (editingTerm && onUpdateManualPlan) {
      onUpdateManualPlan(student.id, editingTerm, editUnits);
    }
    setEditingTerm(null);
  };

  const handleAddUnit = (unit: string) => {
    if (!editUnits.includes(unit)) {
      setEditUnits([...editUnits, unit]);
    }
  };

  const handleRemoveUnit = (unit: string) => {
    setEditUnits(editUnits.filter(u => u !== unit));
  };

  const allAvailableUnits = MASTER_UNIT_ORDER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{student.name}</h2>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-xs">{student.id}</span>
              <span className="text-sm">• {student.status}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {student && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl">
              <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Backlog / Failed Units
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.values(student.units).filter(u => u.status === 'Failed').length > 0 ? (
                  Object.values(student.units).filter(u => u.status === 'Failed').map(u => (
                    <div key={u.unitCode} className="px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-bold shadow-sm">
                      {u.unitCode}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm italic">No failed units recorded.</span>
                )}
              </div>
            </div>
          )}

          {!plan ? (
            <div className="text-center py-20 text-slate-400">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="font-bold text-slate-600">No booking found.</p>
              <p className="text-sm">This student may have completed all degree requirements or is currently inactive.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <h3 className="text-xl font-bold text-slate-800">Projected Timeline</h3>
                </div>
                <div className="text-xs text-slate-500 italic">
                  * Manual overrides will bypass prerequisite checks for that specific semester.
                </div>
              </div>

              {/* Timeline Grid */}
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-8 pb-4">
                {planItems.map((item, idx) => (
                  <div key={idx} className="relative group">
                    {/* Dot */}
                    <div className={clsx(
                      "absolute -left-[41px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-all z-10",
                      idx === 0 ? "bg-primary" : "bg-slate-300 group-hover:bg-primary/50"
                    )}>
                      {idx === 0 && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                    </div>

                    <div className={clsx(
                      "bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all",
                      editingTerm === item.term ? "border-primary ring-2 ring-primary/10" : "border-slate-200"
                    )}>
                       <div className="flex justify-between items-center mb-4">
                         <h4 className={clsx(
                           "text-sm font-bold uppercase tracking-wider flex items-center gap-2",
                           idx === 0 ? "text-primary" : "text-slate-500"
                         )}>
                           {item.term} 
                           {idx === 0 && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] ml-2 font-black">NEXT SEMESTER</span>}
                         </h4>
                         
                         {editingTerm === item.term ? (
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={handleSaveEdit}
                               className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm"
                             >
                               <Check className="w-3 h-3" /> Save Changes
                             </button>
                             <button 
                               onClick={() => setEditingTerm(null)}
                               className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                             >
                               Cancel
                             </button>
                           </div>
                         ) : (
                           <button 
                             onClick={() => handleStartEdit(item.term, item.units)}
                             className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all text-xs font-bold group/edit"
                           >
                             <Edit3 className="w-3.5 h-3.5" /> 
                             <span className="opacity-0 group-hover/edit:opacity-100 transition-opacity">Manual Overide</span>
                           </button>
                         )}
                       </div>
                       
                       {editingTerm === item.term ? (
                         <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                           <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[50px]">
                             {editUnits.map(unit => (
                               <div key={unit} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-primary/30 text-primary rounded-lg text-sm font-bold shadow-sm">
                                 {unit}
                                 <button onClick={() => handleRemoveUnit(unit)} className="hover:text-red-500 transition-colors">
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             ))}
                             {editUnits.length === 0 && <span className="text-slate-400 text-sm italic py-1">No units selected</span>}
                           </div>
                           
                           <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[150px] overflow-y-auto p-1">
                             {allAvailableUnits.filter(u => !editUnits.includes(u)).map(unit => (
                               <button 
                                 key={unit}
                                 onClick={() => handleAddUnit(unit)}
                                 className="px-2 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[11px] font-bold hover:border-primary hover:text-primary transition-all text-center"
                               >
                                 + {unit}
                               </button>
                             ))}
                           </div>
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                           {item.units.map(unit => (
                             <div key={unit} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all group/unit">
                                <div className="p-2 bg-white rounded-md shadow-sm text-primary/70 group-hover/unit:text-primary group-hover/unit:scale-110 transition-all">
                                  <Book className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-slate-700 tracking-tight">{unit}</span>
                             </div>
                           ))}
                           {item.units.length === 0 && (
                             <span className="text-slate-400 italic text-sm py-2">No units planned (Break or Finished)</span>
                           )}
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="text-[10px] text-slate-400 max-w-md italic">
            * Manual overrides are saved automatically and remain effective until data is reset. These overrides bypass automated prerequisite logic for the selected term.
          </div>
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            Close Degree Roadmap
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanView;