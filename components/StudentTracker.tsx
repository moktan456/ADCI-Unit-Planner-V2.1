
import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ArrowUpDown, Calendar, Download } from 'lucide-react';
import { ProcessedData, StudentProfile } from '../types';
import { clsx } from 'clsx';
import { MASTER_UNIT_ORDER, CYBER_ONLY_UNITS, DATA_ONLY_UNITS } from '../constants';
import * as XLSX from 'xlsx';

interface StudentTrackerProps {
  data: ProcessedData;
  onSelectStudent: (student: StudentProfile) => void;
  streamFilter: 'Combined' | 'Cyber' | 'Data';
}

const StudentTracker: React.FC<StudentTrackerProps> = ({ data, onSelectStudent, streamFilter }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Current Student');
  const [filterIntake, setFilterIntake] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StudentProfile; direction: 'asc' | 'desc' } | null>(null);

  const getIntakeScore = (intake: string) => {
    if (!intake || intake === 'Unknown') return 0;
    const yearMatch = intake.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 0;
    let month = 0;
    const lower = intake.toLowerCase();
    
    if (lower.includes('feb')) month = 2;
    else if (lower.includes('jul')) month = 7;
    else if (lower.includes('nov')) month = 11;
    else if (lower.includes('jan')) month = 1;
    else if (lower.includes('mar')) month = 3;
    else if (lower.includes('apr')) month = 4;
    else if (lower.includes('may')) month = 5;
    else if (lower.includes('jun')) month = 6;
    else if (lower.includes('aug')) month = 8;
    else if (lower.includes('sep')) month = 9;
    else if (lower.includes('oct')) month = 10;
    else if (lower.includes('dec')) month = 12;

    return (year * 100) + month;
  };

  const { availableStatuses, availableIntakes } = useMemo(() => {
    const statuses = new Set<string>();
    const intakes = new Set<string>();
    data.students.forEach(s => {
        if (s.status) statuses.add(s.status);
        if (s.intake && !s.intake.includes('2023')) intakes.add(s.intake);
    });
    return {
      availableStatuses: Array.from(statuses).sort(),
      availableIntakes: Array.from(intakes).sort((a, b) => getIntakeScore(a) - getIntakeScore(b))
    };
  }, [data.students]);

  const visibleUnits = useMemo(() => {
    return MASTER_UNIT_ORDER.filter(unit => {
      if (streamFilter === 'Cyber' && DATA_ONLY_UNITS.has(unit)) return false;
      if (streamFilter === 'Data' && CYBER_ONLY_UNITS.has(unit)) return false;
      return true;
    });
  }, [streamFilter]);

  const filteredStudents = useMemo(() => {
    let result = [...data.students];
    result = result.filter(s => !s.intake.includes('2023'));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    if (filterStatus !== 'All') {
      result = result.filter(s => s.status === filterStatus);
    }
    if (filterIntake !== 'All') {
      result = result.filter(s => s.intake === filterIntake);
    }

    if (sortConfig) {
      result.sort((a, b) => {
        if (sortConfig.key === 'intake') {
            const aScore = getIntakeScore(a.intake);
            const bScore = getIntakeScore(b.intake);
            if (aScore < bScore) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aScore > bScore) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
        // @ts-ignore
        const aVal = String(a[sortConfig.key] || '');
        // @ts-ignore
        const bVal = String(b[sortConfig.key] || '');
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data.students, search, filterStatus, filterIntake, sortConfig]);

  const handleSort = (key: keyof StudentProfile) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getUnitStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CreditTransfer': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Enrolled': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Failed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const getStudentStatusStyle = (status: string) => {
    const s = String(status).toLowerCase();
    if (s.includes('current')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s.includes('complet') || s.includes('grad')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('discontinued') || s.includes('cancel')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };
  
  const getIntakeColor = (intake: string) => {
    if (intake.startsWith('Feb')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (intake.startsWith('July')) return 'bg-lime-100 text-lime-800 border-lime-200';
    if (intake.startsWith('Nov')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const isUnitIrrelevant = (student: StudentProfile, unitCode: string) => {
    if (student.stream === 'Cyber' && DATA_ONLY_UNITS.has(unitCode)) return true;
    if (student.stream === 'Data' && CYBER_ONLY_UNITS.has(unitCode)) return true;
    return false;
  };

  const handleExportList = () => {
    const exportData = filteredStudents.map(s => {
      const row: Record<string, string | number> = {
        'Student ID': s.id, 'Name': s.name, 'Intake': s.intake, 'Status': s.status, 'Stream': s.stream
      };
      visibleUnits.forEach(unit => {
        const u = s.units[unit];
        row[unit] = u ? u.status : '';
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Tracker");
    XLSX.writeFile(wb, "Student_Tracker_Export.xlsx");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-200px)] animate-fade-in overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row gap-4 items-center justify-between bg-white shrink-0 z-20">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">Student Progress Tracker</h2>
          <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">{filteredStudents.length}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search ID or Name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none min-w-[140px]">
              <option value="All">All Statuses</option>
              <optgroup label="Detected Statuses">{availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <select value={filterIntake} onChange={e => setFilterIntake(e.target.value)} className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none min-w-[130px]">
              <option value="All">All Intakes</option>
              {availableIntakes.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={handleExportList} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        <table className="min-w-max w-full text-left border-collapse border-spacing-0">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 w-32 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>ID</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-32 z-20 bg-slate-50 border-b border-r border-slate-200 w-64 cursor-pointer hover:bg-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]" onClick={() => handleSort('name')}>Name</th>
              
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-48 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-200" onClick={() => handleSort('intake')}>Intake</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-48 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-200" onClick={() => handleSort('status')}>Status</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 border-b border-r border-slate-200 text-center" onClick={() => handleSort('progressPercent')}>Progress</th>
              
              {visibleUnits.map(unit => (
                <th key={unit} className="p-2 text-xs font-bold text-slate-400 uppercase text-center min-w-[80px] border-b border-r border-slate-200 bg-slate-50/50">
                  {unit}
                </th>
              ))}
              <th className="p-2 text-center border-b bg-slate-50 min-w-[60px]"></th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-50 bg-white">
            {filteredStudents.map(student => (
              <tr key={student.id} onClick={() => onSelectStudent(student)} className="hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                <td className="p-4 text-sm font-mono text-slate-600 sticky left-0 z-10 bg-white border-r border-slate-100 group-hover:bg-indigo-50/30">{student.id}</td>
                <td className="p-4 text-sm font-bold text-slate-800 sticky left-32 z-10 bg-white border-r border-slate-100 group-hover:bg-indigo-50/30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] break-words leading-tight">
                    {student.name}
                    <div className={clsx("text-[10px] font-normal uppercase mt-1 tracking-wider", student.stream === 'Cyber' ? "text-indigo-500" : student.stream === 'Data' ? "text-emerald-500" : "text-slate-400")}>
                        {student.stream} Stream
                    </div>
                </td>
                <td className="p-4 border-r border-slate-100">
                    <span className={clsx("px-2 py-1 rounded text-xs font-bold border whitespace-nowrap", getIntakeColor(student.intake))}>
                        {student.intake}
                    </span>
                </td>
                <td className="p-4 border-r border-slate-100">
                    <span className={clsx("px-2 py-1 rounded text-xs font-medium border whitespace-nowrap block w-fit", getStudentStatusStyle(student.status))}>
                        {student.status}
                    </span>
                </td>
                <td className="p-4 border-r border-slate-100 text-center">
                    <span className="text-xs font-bold text-slate-600">{Math.round(student.progressPercent)}%</span>
                </td>
                {visibleUnits.map(unit => {
                    const u = student.units[unit];
                    const status = u ? u.status : "NotEnrolled";
                    if (isUnitIrrelevant(student, unit)) {
                        return <td key={unit} className="p-2 border-r border-slate-50 text-center bg-slate-50/20"><span className="text-slate-200 text-[10px]">•</span></td>;
                    }
                    return (
                        <td key={unit} className="p-2 border-r border-slate-50 text-center">
                            {status !== "NotEnrolled" && (
                                <div className={clsx("w-full py-1 text-[10px] font-bold rounded border shadow-sm whitespace-nowrap px-1", getUnitStatusColor(status))}>
                                    {u.grade || (status === "Completed" ? "CMP" : status.substring(0,3).toUpperCase())}
                                </div>
                            )}
                        </td>
                    );
                })}
                <td className="p-2 text-center text-slate-400 text-xs group-hover:text-primary sticky right-0 bg-white group-hover:bg-indigo-50/30 border-l border-slate-100">View</td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
                <tr><td colSpan={40} className="p-10 text-center text-slate-400 italic">No students found matching criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTracker;
