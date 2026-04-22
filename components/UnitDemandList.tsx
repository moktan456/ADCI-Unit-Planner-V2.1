import React, { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { clsx } from 'clsx';
import { Users, X, Search, GraduationCap } from 'lucide-react';

const UnitDemandList: React.FC<{ data: ProcessedData }> = ({ data }) => {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  
  const getTypeBadge = (type: 'Cyber' | 'Data' | 'Common') => {
    switch (type) {
      case 'Cyber':
        return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200">Cyber Security</span>;
      case 'Data':
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">Data Science</span>;
      default:
        return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">Common Core</span>;
    }
  };

  const getBarColor = (type: 'Cyber' | 'Data' | 'Common') => {
    switch (type) {
        case 'Cyber': return 'bg-indigo-600';
        case 'Data': return 'bg-emerald-500';
        default: return 'bg-amber-400';
    }
  };

  const enrolledStudents = useMemo(() => {
    if (!selectedUnit) return [];

    const students = data.plans
      .filter(p => {
        const nextSem = p.plans.find(pl => pl.term === "Next Semester");
        return nextSem?.units.includes(selectedUnit);
      })
      .map(p => {
        const profile = data.students.find(s => s.id === p.studentId);
        return {
          id: p.studentId,
          name: p.studentName,
          stream: profile?.stream || 'Combined',
          status: profile?.status || 'Unknown'
        };
      });

    if (!studentSearch) return students;
    return students.filter(s => 
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.id.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [selectedUnit, data, studentSearch]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-200px)] animate-fade-in">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Unit Offering Demand (Next Semester)</h2>
          <p className="text-sm text-slate-500">Click on any row to view the list of enrolled students.</p>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Unit Code</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Est. Enrollment</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Discipline</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Typical Sem</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Demand Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.unitDemand.map((item) => (
                <tr 
                  key={item.unitCode} 
                  onClick={() => { setSelectedUnit(item.unitCode); setStudentSearch(''); }}
                  className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                >
                  <td className="p-4 font-bold text-slate-700 group-hover:text-primary">{item.unitCode}</td>
                  <td className="p-4 font-mono text-slate-800 font-bold flex items-center gap-2">
                    {item.count}
                    <Users className="w-3 h-3 text-slate-400 group-hover:text-primary" />
                  </td>
                  <td className="p-4">
                    {getTypeBadge(item.unitType)}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{item.semester}</td>
                  <td className="p-4 w-1/3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={clsx("h-full rounded-full transition-all duration-500", getBarColor(item.unitType))}
                        style={{ width: `${Math.min((item.count / (data.stats.totalStudents || 1)) * 100 * 2, 100)}%` }} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  {selectedUnit}
                  <span className="text-sm font-normal text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">
                    {enrolledStudents.length} Students
                  </span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">Projected enrollment list for next semester.</p>
              </div>
              <button 
                onClick={() => setSelectedUnit(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 bg-white">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                    type="text"
                    placeholder="Filter list..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {enrolledStudents.length > 0 ? (
                <ul className="divide-y divide-slate-50">
                  {enrolledStudents.map(student => (
                    <li key={student.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                           {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{student.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{student.id}</div>
                        </div>
                      </div>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                        student.stream === 'Cyber' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                        student.stream === 'Data' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        "bg-slate-50 text-slate-500 border-slate-100"
                      )}>
                        {student.stream}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No students found.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedUnit(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors shadow-sm"
              >
                Close List
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnitDemandList;