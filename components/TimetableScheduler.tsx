
import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, User, Plus, X, Trash2, Calendar, Check, AlertTriangle, MapPin, Download } from 'lucide-react';
import { ProcessedData } from '../types';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';

interface TimetableSchedulerProps {
  data: ProcessedData;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIME_SLOTS = [
    { id: 'morning', label: '09:00 - 12:00' }, 
    { id: 'afternoon', label: '13:00 - 16:00' },
    { id: 'evening', label: '17:00 - 20:00' }
];

const getSlotId = (day: string, timeLabel: string, room: string) => `${day}|${timeLabel}|${room}`;

interface DragItem {
  type: 'unit' | 'teacher';
  id: string; 
  sourceSlotId?: string | 'unassigned';
}

interface Teacher {
  id: string;
  name: string;
  color: string;
  availability: Record<string, string[]>; 
}

const TEACHER_COLORS = [
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-lime-100 text-lime-700 border-lime-200',
];

interface UnitCardProps {
  code: string;
  sourceId: string;
  demand: number;
  unitType: 'Cyber' | 'Data' | 'Common';
  assignedTeacher?: Teacher;
  roomName?: string;
  isConflict?: boolean;
  onDragStart: (e: React.DragEvent, type: 'unit', id: string, sourceSlotId: string | 'unassigned') => void;
  onTeacherRemove: () => void;
  studentClashes?: number;
}

const UnitCard: React.FC<UnitCardProps> = ({ code, sourceId, demand, unitType, assignedTeacher, roomName, isConflict, onDragStart, onTeacherRemove, studentClashes }) => {
  const getColorClass = () => {
    switch (unitType) {
        case 'Cyber': return "bg-indigo-50 hover:bg-indigo-100 border-indigo-200";
        case 'Data': return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
        default: return "bg-amber-50 hover:bg-amber-100 border-amber-200";
    }
  };
  const getBadgeClass = () => {
    switch (unitType) {
        case 'Cyber': return "text-indigo-600";
        case 'Data': return "text-emerald-600";
        default: return "text-amber-600";
    }
  };

  return (
    <div draggable onDragStart={(e) => onDragStart(e, 'unit', code, sourceId)} className={clsx("p-2 rounded-lg shadow-sm border cursor-move transition-all active:scale-95 group relative flex flex-col gap-1 min-h-[80px]", getColorClass())}>
      <div className="flex justify-between items-start">
          <span className="font-bold text-slate-700 text-sm leading-tight">{code}</span>
          <span className="text-xs font-mono font-bold text-slate-600 bg-white/50 px-1.5 rounded">{demand}</span>
      </div>
      <div className="flex justify-between items-end mt-auto mb-1">
          <span className={clsx("text-[9px] uppercase tracking-tighter font-bold", getBadgeClass())}>{unitType}</span>
      </div>
      {assignedTeacher && (
        <div className={clsx("flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors", isConflict ? "bg-red-100 text-red-700 border-red-300 animate-pulse" : assignedTeacher.color)}>
           <div className="flex items-center gap-1">
             {isConflict ? <AlertTriangle className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
             <span className="truncate max-w-[60px]">{assignedTeacher.name}</span>
           </div>
           <button onClick={(e) => { e.stopPropagation(); onTeacherRemove(); }} className="hover:bg-black/10 rounded-full p-0.5 ml-1"><X className="w-2.5 h-2.5" /></button>
        </div>
      )}
      {roomName && (
        <div className="mt-1 pt-1 border-t border-black/5 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <MapPin className="w-2.5 h-2.5" />{roomName}
            </div>
            {studentClashes && studentClashes > 0 ? (
                <div className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 px-1 rounded border border-red-100 animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5" /> {studentClashes} Student Clashes
                </div>
            ) : null}
        </div>
      )}
    </div>
  );
};

const TimetableScheduler: React.FC<TimetableSchedulerProps> = ({ data, showToast }) => {
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, string>>({});
  const [unassignedUnits, setUnassignedUnits] = useState<string[]>([]);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<string[]>(['Room 1', 'Room 2']);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  useEffect(() => {
    const savedTeachers = localStorage.getItem('adci_timetable_teachers');
    const savedAssignments = localStorage.getItem('adci_timetable_assignments');
    const savedRooms = localStorage.getItem('adci_timetable_rooms');
    if (savedTeachers) { try { setTeachers(JSON.parse(savedTeachers)); } catch (e) { console.error(e); } }
    if (savedAssignments) { try { setTeacherAssignments(JSON.parse(savedAssignments)); } catch (e) { console.error(e); } }
    if (savedRooms) { try { setRooms(JSON.parse(savedRooms)); } catch (e) { console.error(e); } }
  }, []);

  useEffect(() => {
    const savedSchedule = localStorage.getItem('adci_timetable_schedule');
    if (savedSchedule) {
        try {
            const parsedSchedule = JSON.parse(savedSchedule);
            setSchedule(parsedSchedule);
            const assignedSet = new Set(Object.values(parsedSchedule));
            const allDemand = data.unitDemand.map(u => u.unitCode);
            setUnassignedUnits(allDemand.filter(u => !assignedSet.has(u as string)));
        } catch (e) { initAutoSchedule(); }
    } else { initAutoSchedule(); }
  }, [data.unitDemand]);

  useEffect(() => { localStorage.setItem('adci_timetable_schedule', JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem('adci_timetable_teachers', JSON.stringify(teachers)); }, [teachers]);
  useEffect(() => { localStorage.setItem('adci_timetable_assignments', JSON.stringify(teacherAssignments)); }, [teacherAssignments]);
  useEffect(() => { localStorage.setItem('adci_timetable_rooms', JSON.stringify(rooms)); }, [rooms]);

  const initAutoSchedule = (filterLowDemand: boolean = false) => {
    let unitsToSchedule = [...data.unitDemand];
    
    if (filterLowDemand) {
      unitsToSchedule = unitsToSchedule.filter(u => u.count >= 3);
    }

    const sortedUnits = unitsToSchedule.sort((a, b) => b.count - a.count).map(u => u.unitCode);
    const newSchedule: Record<string, string> = {};
    const slots: string[] = [];
    DAYS.forEach(day => { 
      TIME_SLOTS.forEach(time => { 
        if (time.id === 'evening') return; 
        rooms.forEach(room => { 
          slots.push(getSlotId(day, time.label, room)); 
        }); 
      }); 
    });
    
    let slotIndex = 0;
    const assigned = new Set<string>();
    for (const unit of sortedUnits) {
      if (slotIndex < slots.length) { 
        newSchedule[slots[slotIndex]] = unit; 
        assigned.add(unit); 
        slotIndex++; 
      }
    }
    
    setSchedule(newSchedule);
    setTeacherAssignments({}); // Clear assignments when re-generating
    
    const allDemand = data.unitDemand.map(u => u.unitCode);
    setUnassignedUnits(allDemand.filter(u => !assigned.has(u)));
    
    if (filterLowDemand) {
      showToast("Timetable auto-generated (Units with < 3 students excluded)", "success");
    } else {
      showToast("Timetable auto-generated (All units included)", "info");
    }
  };

  const clearTimetable = () => {
    setSchedule({});
    setTeacherAssignments({});
    setUnassignedUnits(data.unitDemand.map(u => u.unitCode).sort());
    showToast("Timetable cleared for manual entry", "info");
  };

  const addTeacher = () => {
    if (!newTeacherName.trim()) return;
    const id = `t-${Date.now()}`;
    const color = TEACHER_COLORS[teachers.length % TEACHER_COLORS.length];
    const defaultAvailability: Record<string, string[]> = {};
    DAYS.forEach(d => defaultAvailability[d] = ['morning', 'afternoon']);
    setTeachers(prev => [...prev, { id, name: newTeacherName, color, availability: defaultAvailability }]);
    setNewTeacherName('');
    showToast(`Added teacher: ${newTeacherName}`);
  };

  const removeTeacher = (id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    setTeacherAssignments(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => { if (next[key] === id) delete next[key]; });
        return next;
    });
    showToast("Teacher removed");
  };

  const addRoom = () => {
    if (!newRoomName.trim()) return;
    if (rooms.includes(newRoomName.trim())) {
        showToast("Room already exists", "error");
        return;
    }
    setRooms(prev => [...prev, newRoomName.trim()]);
    setNewRoomName('');
    showToast(`Added room: ${newRoomName}`);
  };

  const removeRoom = (roomName: string) => {
    if (rooms.length <= 1) {
        showToast("At least one room is required", "error");
        return;
    }
    setRooms(prev => prev.filter(r => r !== roomName));
    setSchedule(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => { if (key.endsWith(`|${roomName}`)) delete next[key]; });
        return next;
    });
    showToast("Room removed");
  };

  const toggleAvailability = (teacherId: string, day: string, timeSlotId: string) => {
      setTeachers(prev => prev.map(t => {
          if (t.id !== teacherId) return t;
          const currentDaySlots = t.availability[day] || [];
          const newDaySlots = currentDaySlots.includes(timeSlotId) ? currentDaySlots.filter(s => s !== timeSlotId) : [...currentDaySlots, timeSlotId];
          return { ...t, availability: { ...t.availability, [day]: newDaySlots } };
      }));
  };

  const checkConflict = (teacherId: string, slotId: string): boolean => {
      const parts = slotId.split('|');
      if (parts.length < 3) return false;
      const [day, timeLabel] = parts;
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) return false;
      const timeObj = TIME_SLOTS.find(t => t.label === timeLabel);
      if (!timeObj) return false;
      const availableSlots = teacher.availability[day] || [];
      return !availableSlots.includes(timeObj.id);
  };

  const handleDragStart = (e: React.DragEvent, type: 'unit' | 'teacher', id: string, sourceSlotId?: string | 'unassigned') => {
    const item: DragItem = { type, id, sourceSlotId };
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent, slotId: string | 'unassigned') => {
    e.preventDefault();
    if (slotId !== 'unassigned' && slotId !== dragOverSlot) { setDragOverSlot(slotId); }
  };

  const handleDrop = (e: React.DragEvent, targetSlotId: string | 'unassigned') => {
    e.preventDefault();
    setDragOverSlot(null);
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    const { type, id, sourceSlotId } = JSON.parse(dataStr) as DragItem;

    if (type === 'teacher') {
       if (targetSlotId === 'unassigned') return; 
       if (checkConflict(id, targetSlotId)) { showToast("Action Blocked: Teacher is not available at this time.", "error"); return; }
       setTeacherAssignments(prev => ({ ...prev, [targetSlotId]: id }));
       showToast("Teacher assigned successfully", "success");
       return;
    }

    if (type === 'unit') {
        const unitCode = id;
        if (sourceSlotId === targetSlotId) return;
        setSchedule(prev => {
            const next = { ...prev };
            if (sourceSlotId && sourceSlotId !== 'unassigned') delete next[sourceSlotId];
            else setUnassignedUnits(curr => curr.filter(u => u !== unitCode));
            if (targetSlotId === 'unassigned') {
                setUnassignedUnits(curr => [...curr, unitCode].sort());
            } else {
                const existingUnit = next[targetSlotId];
                next[targetSlotId] = unitCode;
                if (existingUnit) {
                    if (sourceSlotId && sourceSlotId !== 'unassigned') next[sourceSlotId] = existingUnit;
                    else setUnassignedUnits(curr => [...curr, existingUnit].sort());
                }
            }
            return next;
        });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverSlot(null);
  };

  const handleRemoveTeacherFromSlot = (slotId: string) => {
    setTeacherAssignments(prev => { const next = { ...prev }; delete next[slotId]; return next; });
    showToast("Teacher assignment removed", "info");
  };

  const handleExportTimetable = () => {
    const headers = ["Time", "Room", ...DAYS];
    const dataRows: (string)[][] = [];
    TIME_SLOTS.forEach(time => {
      rooms.forEach(room => {
        const row = [time.label, room];
        DAYS.forEach(day => {
          const slotId = getSlotId(day, time.label, room);
          const unitCode = schedule[slotId];
          const teacherId = teacherAssignments[slotId];
          const teacher = teachers.find(t => t.id === teacherId);
          let cellContent = "";
          if (unitCode) { cellContent += unitCode; if (teacher) { cellContent += `\n(${teacher.name})`; } }
          row.push(cellContent);
        });
        dataRows.push(row);
      });
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Timetable");
    XLSX.writeFile(wb, "ADCI_Timetable.xlsx");
    showToast("Timetable exported to Excel");
  };

  const getUnitInfo = (code: string) => data.unitDemand.find(u => u.unitCode === code);
  const getTeacher = (id: string) => teachers.find(t => t.id === id);

  const getStudentClashes = (unitCode: string, slotId: string) => {
      const parts = slotId.split('|');
      if (parts.length < 3) return 0;
      const [day, timeLabel] = parts;
      
      // Find all other units scheduled at the same time
      const unitsAtSameTime: string[] = [];
      rooms.forEach(r => {
          const otherSlotId = getSlotId(day, timeLabel, r);
          const otherUnit = schedule[otherSlotId];
          if (otherUnit && otherUnit !== unitCode) {
              unitsAtSameTime.push(otherUnit);
          }
      });

      if (unitsAtSameTime.length === 0) return 0;

      // Count students who have both this unit and any of the other units in their "Next Semester" plan
      let clashCount = 0;
      data.plans.forEach(plan => {
          const nextSem = plan.plans.find(p => p.term === "Next Semester");
          if (nextSem && nextSem.units.includes(unitCode)) {
              const hasOtherUnit = nextSem.units.some(u => unitsAtSameTime.includes(u));
              if (hasOtherUnit) clashCount++;
          }
      });

      return clashCount;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6 animate-fade-in relative">
      <div className="flex justify-between items-end shrink-0">
        <div><h2 className="text-xl font-bold text-slate-800">Predicted Unit Timetable</h2><p className="text-sm text-slate-500">Auto-generate based on demand or create manually.</p></div>
        <div className="flex items-center gap-3">
             <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => initAutoSchedule(true)} 
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white text-primary shadow-sm rounded-md hover:bg-slate-50 transition-all border border-slate-200"
                  title="Excludes units with < 3 students"
                >
                  Auto-Generate
                </button>
                <button 
                  onClick={clearTimetable} 
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-all"
                >
                  Manual / Clear
                </button>
             </div>
             <button onClick={handleExportTimetable} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-all shadow-sm">
                <Download className="w-4 h-4" /> Export
             </button>
        </div>
      </div>
      <div className="flex gap-6 flex-1 overflow-hidden">
        <div className="w-64 flex flex-col gap-6 shrink-0">
            <div className={clsx("flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col transition-colors min-h-0", dragOverSlot === 'unassigned' && "bg-slate-50 border-primary/50")} onDragOver={(e) => handleDragOver(e, 'unassigned')} onDrop={(e) => handleDrop(e, 'unassigned')}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl shrink-0">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4 text-amber-500" /> Unassigned Units</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{unassignedUnits.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {unassignedUnits.map(code => ( <UnitCard key={code} code={code} sourceId="unassigned" demand={getUnitInfo(code)?.count || 0} unitType={getUnitInfo(code)?.unitType || 'Common'} onDragStart={handleDragStart} onTeacherRemove={() => {}} /> ))}
                </div>
            </div>
            <div className="h-2/5 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col shrink-0">
                 <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl shrink-0">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2"><User className="w-4 h-4 text-indigo-500" /> Teachers</h3>
                    <div className="flex gap-2">
                        <input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="Add Name..." className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-primary" onKeyDown={(e) => e.key === 'Enter' && addTeacher()} />
                        <button onClick={addTeacher} className="p-1 bg-primary text-white rounded hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-2">
                     {teachers.map(t => (
                         <div key={t.id} className={clsx("flex items-center justify-between p-2 rounded border group", t.color)}>
                            <div draggable onDragStart={(e) => handleDragStart(e, 'teacher', t.id)} className="flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing font-bold text-xs"><User className="w-3 h-3 opacity-50" /><span>{t.name}</span></div>
                            <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingTeacherId(t.id)} className="p-1 hover:bg-white/50 rounded text-slate-600"><Calendar className="w-3 h-3" /></button>
                                <button onClick={() => removeTeacher(t.id)} className="p-1 hover:bg-white/50 rounded text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                         </div>
                     ))}
                 </div>
            </div>
            <div className="h-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col shrink-0">
                 <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl shrink-0">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-emerald-500" /> Classrooms</h3>
                    <div className="flex gap-2">
                        <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room Name..." className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-primary" onKeyDown={(e) => e.key === 'Enter' && addRoom()} />
                        <button onClick={addRoom} className="p-1 bg-primary text-white rounded hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-2">
                     {rooms.map(r => (
                         <div key={r} className="flex items-center justify-between p-2 rounded border bg-slate-50 border-slate-200 group">
                            <div className="flex-1 flex items-center gap-2 font-bold text-xs text-slate-700"><MapPin className="w-3 h-3 opacity-50" /><span>{r}</span></div>
                            <button onClick={() => removeRoom(r)} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                         </div>
                     ))}
                 </div>
            </div>
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="p-3 border-r border-slate-200 flex items-center justify-center text-slate-400"><Clock className="w-5 h-5" /></div>
                {DAYS.map(day => <div key={day} className="p-3 text-center font-bold text-slate-700 uppercase tracking-wider text-sm">{day}</div>)}
            </div>
            <div className="flex-1 overflow-y-auto">
                {TIME_SLOTS.map((time) => (
                    <React.Fragment key={time.id}>
                        <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-slate-100 min-h-[160px]">
                            <div className="p-2 border-r border-slate-200 bg-slate-50/30 flex flex-col justify-center items-center text-center">
                                <span className="font-bold text-slate-700 text-xs block">{time.label.split(' - ')[0]}</span>
                                <span className="font-bold text-slate-700 text-xs block">{time.label.split(' - ')[1]}</span>
                            </div>
                            {DAYS.map(day => (
                                <div key={`${day}-${time.id}`} className="border-r border-slate-100 p-2 flex flex-col gap-2 relative bg-slate-50/10 hover:bg-slate-50/50 transition-colors">
                                    {rooms.map(room => {
                                        const slotId = getSlotId(day, time.label, room);
                                        const unitCode = schedule[slotId];
                                        return (
                                            <div key={slotId} onDragOver={(e) => handleDragOver(e, slotId)} onDrop={(e) => handleDrop(e, slotId)} onDragLeave={handleDragLeave} className={clsx("flex-1 rounded-lg border-2 border-dashed transition-all relative flex flex-col justify-center", dragOverSlot === slotId ? "border-primary bg-primary/5 scale-[1.02] z-10" : "border-slate-100 bg-white hover:border-slate-300", unitCode && "border-solid border-transparent bg-transparent p-0 hover:border-transparent")}>
                                                {!unitCode && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">{dragOverSlot === slotId ? 'Drop' : room}</div></div>}
                                                {unitCode && <div className="h-full w-full relative group"><UnitCard code={unitCode} sourceId={slotId} demand={getUnitInfo(unitCode)?.count || 0} unitType={getUnitInfo(unitCode)?.unitType || 'Common'} assignedTeacher={teacherAssignments[slotId] ? getTeacher(teacherAssignments[slotId]) : undefined} roomName={room} isConflict={teacherAssignments[slotId] && checkConflict(teacherAssignments[slotId], slotId)} studentClashes={getStudentClashes(unitCode, slotId)} onDragStart={handleDragStart} onTeacherRemove={() => handleRemoveTeacherFromSlot(slotId)} /></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
      </div>
      {editingTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500" /> Set Availability</h3>
                   <button onClick={() => setEditingTeacherId(null)} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
               </div>
               <div className="p-6">
                   <div className="space-y-4">
                       <div className="grid grid-cols-[50px_repeat(3,1fr)] gap-2 mb-2 text-center text-xs font-bold text-slate-500 uppercase"><div></div><div>Morning</div><div>Afternoon</div><div>Evening</div></div>
                       {DAYS.map(day => {
                           const teacher = teachers.find(t => t.id === editingTeacherId);
                           const availableSlots = teacher?.availability[day] || [];
                           return (
                               <div key={day} className="grid grid-cols-[50px_repeat(3,1fr)] gap-2 items-center">
                                   <div className="font-bold text-slate-700 text-sm">{day}</div>
                                   {['morning', 'afternoon', 'evening'].map(slot => (
                                       <button key={slot} onClick={() => toggleAvailability(editingTeacherId, day, slot)} className={clsx("h-10 rounded-lg border transition-all flex items-center justify-center", availableSlots.includes(slot) ? "bg-emerald-500 border-emerald-600 text-white shadow-sm" : "bg-slate-50 border-slate-200 text-slate-300 hover:bg-slate-100")}>{availableSlots.includes(slot) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}</button>
                                   ))}
                               </div>
                           );
                       })}
                   </div>
               </div>
               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end"><button onClick={() => setEditingTeacherId(null)} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors">Done</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TimetableScheduler;
