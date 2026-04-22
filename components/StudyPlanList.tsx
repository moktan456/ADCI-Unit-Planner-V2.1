import React, { useMemo, useState } from 'react';
import { Search, Download, Info, ArrowRight } from 'lucide-react';
import { ProcessedData, StudentPlan } from '../types';
import { clsx } from 'clsx';
import { CYBER_ONLY_UNITS, DATA_ONLY_UNITS, MASTER_UNIT_ORDER } from '../constants';
import * as XLSX from 'xlsx';

interface StudyPlanListProps {
  data: ProcessedData;
}

const StudyPlanList: React.FC<StudyPlanListProps> = ({ data }) => {
  const [search, setSearch] = useState('');

  const filteredPlans = useMemo(() => {
    return data.plans.filter(p => 
      p.studentName.toLowerCase().includes(search.toLowerCase()) || 
      p.studentId.toLowerCase().includes(search.toLowerCase())
    );
  }, [data.plans, search]);

  const maxSemesters = useMemo(() => {
    if (filteredPlans.length === 0) return 1;
    return Math.max(...filteredPlans.map(p => p.plans.length));
  }, [filteredPlans]);

  const getStudentStream = (id: string) => {
    return data.students.find(s => s.id === id)?.stream || 'Combined';
  };

  const getUnitColor = (unit: string) => {
    if (CYBER_ONLY_UNITS.has(unit)) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (DATA_ONLY_UNITS.has(unit)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const exportToExcel = () => {
    const exportData = filteredPlans.map(row => {
      const stream = getStudentStream(row.studentId);
      const rowData: Record<string, string | number> = {
        "Student ID": row.studentId, "Student Name": row.studentName, "Stream": stream,
      };
      row.plans.forEach((termPlan, idx) => {
        const termLabel = idx === 0 ? "Next Semester" : `Sem ${idx + 1}`;
        rowData[termLabel] = termPlan.units.join(", ");
      });
      const failedUnits = student ? Object.values(student.units).filter(u => u.status === 'Failed').map(u => u.unitCode).join(", ") : "";
      return {
        "Student ID": row.studentId,
        "Student Name": row.studentName,
        "Stream": stream,
        "Backlog / Failed": failedUnits,
        ...rowData
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Full Degree Roadmap");
    XLSX.writeFile(wb, "Student_Degree_Roadmaps.xlsx");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-200px)] animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        <div><h2 className="text-lg font-bold text-slate-800">Projected Degree Roadmaps</h2><div className="flex items-center gap-2 text-xs text-slate-500 mt-1"><Info className="w-3 h-3" /><span>Showing full future progression. Scroll right for future semesters.</span></div></div>
        <div className="flex gap-3 w-full md:w-auto"><div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search Student..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" /></div><button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"><Download className="w-4 h-4" /> Export Roadmap</button></div>
      </div>
      <div className="flex-1 overflow-auto relative">
        <table className="text-left border-collapse w-full min-w-max">
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-64 bg-slate-50 border-b border-r border-slate-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student Profile</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-r border-slate-200 min-w-[150px] text-center">Backlog / Failed</th>
              {Array.from({ length: maxSemesters }).map((_, idx) => (
                <th key={idx} className={clsx("p-4 text-xs font-bold uppercase tracking-wider border-b border-r border-slate-200 min-w-[200px] text-center", idx === 0 ? "bg-primary/5 sticky z-20" : "bg-slate-50")}>
                  <div className="flex items-center justify-center gap-2">
                    {idx === 0 ? (
                      <div className="flex flex-col items-center">
                        <span className="text-primary font-black text-[10px] bg-primary/10 px-2 py-0.5 rounded-full mb-1">CURRENT FOCUS</span>
                        <span className="text-primary font-extrabold">Next Semester</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">Future Sem {idx + 1}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPlans.map((row) => {
              const student = data.students.find(s => s.id === row.studentId);
              const stream = student?.stream || 'Combined';
              const failedUnits = student ? Object.values(student.units).filter(u => u.status === 'Failed') : [];
              
              return (
                <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 bg-white hover:bg-slate-50 sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] align-top">
                    <div className="font-bold text-slate-800 text-sm">{row.studentName}</div>
                    <div className="font-mono text-xs text-slate-400 mb-2">{row.studentId}</div>
                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", stream === 'Cyber' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : stream === 'Data' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100")}>{stream}</span>
                  </td>
                  <td className="p-3 border-r border-slate-100 align-top bg-red-50/10">
                    <div className="flex flex-col gap-1">
                      {failedUnits.length > 0 ? (
                        failedUnits.map(u => (
                          <div key={u.unitCode} className="text-[10px] font-bold px-2 py-1 bg-red-100 text-red-700 border border-red-200 rounded text-center">
                            {u.unitCode}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 text-[10px] text-center italic py-2">No Backlog</span>
                      )}
                    </div>
                  </td>
                  {Array.from({ length: maxSemesters }).map((_, idx) => {
                    const termPlan = row.plans[idx];
                    if (!termPlan) { return <td key={idx} className="p-4 border-r border-slate-50 bg-slate-50/20 text-center align-top"><span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No booking</span></td>; }
                    const sortedUnits = [...termPlan.units].sort((a, b) => {
                        const idxA = MASTER_UNIT_ORDER.indexOf(a);
                        const idxB = MASTER_UNIT_ORDER.indexOf(b);
                        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                    });
                    return (
                      <td key={idx} className={clsx("p-3 border-r border-slate-100 align-top", idx === 0 && "bg-primary/5 shadow-inner")}>
                        <div className="flex flex-col gap-1.5">
                          {sortedUnits.length > 0 ? ( sortedUnits.map(unit => ( <div key={unit} className={clsx("text-[11px] font-bold px-2 py-1.5 rounded border shadow-sm text-center transition-colors", getUnitColor(unit))}>{unit}</div> )) ) : ( <span className="text-slate-300 text-xs text-center block py-4">- Break / Empty -</span> )}
                          {sortedUnits.length > 0 && sortedUnits.length < 4 && ( <div className="mt-1 text-[10px] text-red-500 font-medium text-center flex items-center justify-center gap-1"><span>⚠️ Under-load ({sortedUnits.length})</span></div> )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudyPlanList;