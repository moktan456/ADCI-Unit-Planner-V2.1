
import React, { useState, useMemo } from 'react';
import { Search, Filter, AlertTriangle, User, Book, Calendar, Download, ChevronRight } from 'lucide-react';
import { ProcessedData, StudentProfile } from '../types';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';

interface FailureAnalysisProps {
  data: ProcessedData;
  onSelectStudent: (student: StudentProfile) => void;
}

const FailureAnalysis: React.FC<FailureAnalysisProps> = ({ data, onSelectStudent }) => {
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('All');
  const [intakeFilter, setIntakeFilter] = useState('All');

  const failedData = useMemo(() => {
    const results: { student: StudentProfile; failedUnits: any[] }[] = [];
    
    data.students.forEach(student => {
      const failed = Object.values(student.units).filter(u => u.status === 'Failed');
      if (failed.length > 0) {
        results.push({ student, failedUnits: failed });
      }
    });
    
    return results;
  }, [data.students]);

  const { availableUnits, availableIntakes } = useMemo(() => {
    const units = new Set<string>();
    const intakes = new Set<string>();
    failedData.forEach(({ student, failedUnits }) => {
      failedUnits.forEach(u => units.add(u.unitCode));
      if (student.intake) intakes.add(student.intake);
    });
    return {
      availableUnits: Array.from(units).sort(),
      availableIntakes: Array.from(intakes).sort()
    };
  }, [failedData]);

  const filteredData = useMemo(() => {
    let result = [...failedData];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(({ student }) => 
        student.name.toLowerCase().includes(q) || student.id.toLowerCase().includes(q)
      );
    }

    if (unitFilter !== 'All') {
      result = result.filter(({ failedUnits }) => 
        failedUnits.some(u => u.unitCode === unitFilter)
      );
    }

    if (intakeFilter !== 'All') {
      result = result.filter(({ student }) => student.intake === intakeFilter);
    }

    return result;
  }, [failedData, search, unitFilter, intakeFilter]);

  const handleExport = () => {
    const exportData = filteredData.flatMap(({ student, failedUnits }) => 
      failedUnits.map(u => ({
        'Student ID': student.id,
        'Student Name': student.name,
        'Intake': student.intake,
        'Stream': student.stream,
        'Failed Unit': u.unitCode,
        'Grade': u.grade || 'F'
      }))
    );

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failure Analysis");
    XLSX.writeFile(wb, "ADCI_Failure_Analysis.xlsx");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Failure Analysis</h2>
          <p className="text-slate-500">Identify students with failed units and analyze trends.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Failed Students</p>
            <p className="text-2xl font-bold text-slate-900">{failedData.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
            <Book className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Failed Units</p>
            <p className="text-2xl font-bold text-slate-900">{availableUnits.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtered Count</p>
            <p className="text-2xl font-bold text-slate-900">{filteredData.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Student ID or Name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="relative min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
            >
              <option value="All">All Units</option>
              {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="relative min-w-[160px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={intakeFilter}
              onChange={e => setIntakeFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
            >
              <option value="All">All Intakes</option>
              {availableIntakes.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Intake</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Failed Units</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(({ student, failedUnits }) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{student.name}</span>
                      <span className="text-xs font-mono text-slate-500">{student.id}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium border border-slate-200">
                      {student.intake}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {failedUnits.map(u => (
                        <div key={u.unitCode} className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100 text-xs font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          {u.unitCode}
                          {u.grade && <span className="opacity-60">({u.grade})</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onSelectStudent(student)}
                      className="inline-flex items-center gap-1 text-primary hover:text-indigo-700 font-bold text-sm transition-colors"
                    >
                      View Profile <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                    No failed students found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FailureAnalysis;
