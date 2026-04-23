
import * as XLSX from 'xlsx';
import { 
  MASTER_UNIT_ORDER, 
  PREREQUISITES, 
  OFFERED_UNITS as DEFAULT_OFFERED_UNITS, 
  UNIT_SEMESTER_MAP, 
  COMMON_UNITS, 
  STATUS_MAPPING,
  CYBER_ONLY_UNITS,
  DATA_ONLY_UNITS,
  YEAR_2_CYBER_POOL,
  YEAR_2_DATA_POOL,
  YEAR_3_UNITS,
  YEAR_1_POOL
} from '../constants';
import { 
  ProcessedData, 
  RawStudentRow, 
  StudentProfile, 
  StudentPlan, 
  UnitDemand,
  UnitStatus,
  PrerequisiteRule
} from '../types';

export const parsePrerequisiteData = async (file: File): Promise<PrerequisiteRule[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any>(worksheet);

  return data.map(row => ({
    unitCode: String(row.UnitCode || row.unitCode || row.Unit || row.Code || "").trim().toUpperCase(),
    requiredUnits: String(row.Prerequisites || row.prerequisites || "").split(/[,;|]+/).map(u => u.trim().toUpperCase()).filter(u => u),
    minCreditPoints: Number(row.CreditPoints || row.creditPoints || row.MinCP || 0),
    description: row.Description || row.description || ""
  })).filter(r => r.unitCode);
};

export const downloadPrerequisiteTemplate = () => {
    const headers = ["Year", "Unit Code", "Unit Name", "Pre-requisite", "Credit"];
    const sampleData = [
        ["Year One", "CSC101", "Introduction to programming", "", "6"],
        ["Year One", "ARI101", "Introduction to Artificial Intelligence", "CSC101", "6"],
        ["Year Three", "ORG303", "Digital Innovation", "77 credit points", "6"],
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    XLSX.utils.book_append_sheet(wb, ws, "Prerequisites");
    XLSX.writeFile(wb, "ADCI_Prerequisites_Template.xlsx");
};

const parseUnits = (cellText: string): { unit: string; grade: string }[] => {
  if (!cellText) return [];
  const text = String(cellText).replace(/[;/\n\r]+/g, ",");
  const parts = text.split(",").map(p => p.trim()).filter(p => p);
  
  return parts.map(p => {
    const match = p.match(/^([A-Za-z0-9]+)\s*\((.*?)\)$/);
    if (match) {
      return { unit: match[1].trim().toUpperCase(), grade: match[2].trim().toUpperCase() };
    }
    return { unit: p.trim().toUpperCase(), grade: "" };
  });
};

const parseCourseLength = (s: string): { start: string | null; end: string | null } => {
  if (typeof s === 'string' && s.includes(" - ")) {
    const [left, right] = s.split(" - ", 2);
    const toISO = (d: string) => {
      const parts = d.split("/");
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`; 
      return null;
    };
    return { start: toISO(left), end: toISO(right) };
  }
  return { start: null, end: null };
};

const calculateIntake = (dateStr: string | null): string => {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Unknown";

  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  if (month === 1 || month === 2) return `Feb ${year}`;
  if (month === 6 || month === 7) return `July ${year}`;
  if (month === 10 || month === 11) return `Nov ${year}`;
  if (month === 0) return `Nov ${year - 1}`;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Non-Standard ${monthNames[month]} ${year}`;
};

const canTakeUnit = (
  unitCode: string, 
  doneSet: Set<string>, 
  studentStream: 'Cyber' | 'Data' | 'Combined',
  dynamicRules?: PrerequisiteRule[]
): boolean => {
  // Check dynamic rules first
  if (dynamicRules && dynamicRules.length > 0) {
    const rule = dynamicRules.find(r => r.unitCode === unitCode);
    if (rule) {
      // Check specific units
      if (rule.requiredUnits && rule.requiredUnits.length > 0) {
        for (const req of rule.requiredUnits) {
          if (!doneSet.has(req)) return false;
        }
      }
      // Check credit points (1 unit = 6 CP as requested)
      if (rule.minCreditPoints && rule.minCreditPoints > 0) {
        const currentCP = doneSet.size * 6;
        if (currentCP < rule.minCreditPoints) return false;
      }
      return true;
    }
  }

  // SPECIAL CASE: CAP302 MUST have CAP301 completed first (Sequential Requirement)
  // This bypasses the 77 CP "OR" rule to ensure they don't go together
  if (unitCode === 'CAP302') {
    if (!doneSet.has('CAP301')) return false;
    return true;
  }

  // Year 3 Logic: Prereqs OR 77 Credit Points
  if (YEAR_3_UNITS.has(unitCode)) {
    const currentCP = doneSet.size * 6;
    
    // Check CP threshold first (e.g. 77 CP)
    if (currentCP >= 77) return true;

    // Otherwise check specific prerequisites from the PREREQUISITES map
    if (PREREQUISITES[unitCode]) {
      for (const req of PREREQUISITES[unitCode]) {
        if (!doneSet.has(req)) return false;
      }
    }
    return true;
  }

  // All other Units: Standard Prerequisites from map
  if (PREREQUISITES[unitCode]) {
    for (const req of PREREQUISITES[unitCode]) {
      if (!doneSet.has(req)) return false;
    }
  }

  return true;
};

const sortUnits = (a: string, b: string) => {
  const semA = UNIT_SEMESTER_MAP[a] || 99.9;
  const semB = UNIT_SEMESTER_MAP[b] || 99.9;
  if (semA !== semB) return semA - semB;

  const isCommonA = COMMON_UNITS.has(a);
  const isCommonB = COMMON_UNITS.has(b);
  if (isCommonA !== isCommonB) return isCommonA ? -1 : 1;

  const idxA = MASTER_UNIT_ORDER.indexOf(a);
  const idxB = MASTER_UNIT_ORDER.indexOf(b);
  return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
};

export const parseStudentData = async (file: File): Promise<StudentProfile[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames.find(n => n.includes("ReportData")) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

  const studentsMap = new Map<string, StudentProfile>();
  const allFoundUnits = new Set<string>();

  // Flexible column name detection
  const getCol = (row: any, ...aliases: string[]) => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const found = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === alias.toLowerCase().replace(/[\s_]/g, ''));
      if (found) return row[found];
    }
    return null;
  };

  jsonData.forEach(row => {
    const studentId = String(getCol(row, "Studentid", "StudentID", "Student ID", "ID") || "").trim();
    if (!studentId) return;

    if (!studentsMap.has(studentId)) {
      const courseLength = getCol(row, "Course Length", "CourseLength", "Duration") || "";
      const { start, end } = parseCourseLength(courseLength);
      const intake = calculateIntake(start);
      
      studentsMap.set(studentId, {
        id: studentId,
        name: String(getCol(row, "Student Name", "StudentName", "Name") || "").trim(),
        status: String(getCol(row, "Status", "Student Status") || "").trim(),
        stream: 'Combined',
        intake: intake,
        courseStartDate: start,
        plannedEndDate: end,
        units: {},
        progressPercent: 0,
        completedCount: 0,
        totalListedUnits: 0,
        semestersRequired: 0
      });
    }

    const student = studentsMap.get(studentId)!;

    Object.entries(STATUS_MAPPING).forEach(([colName, baseStatus]) => {
      const cellValue = getCol(row, colName);
      if (cellValue) {
        const parsed = parseUnits(String(cellValue));
        parsed.forEach(({ unit, grade }) => {
          allFoundUnits.add(unit);
          const finalStatus = (grade.includes("CPL") || grade.includes("Credit")) ? "CreditTransfer" : baseStatus;
          student.units[unit] = { unitCode: unit, status: finalStatus, grade };
        });
      }
    });
  });

  let fileContextStream: 'Cyber' | 'Data' | 'Combined' = 'Combined';
  let cyberFileCount = 0;
  let dataFileCount = 0;
  allFoundUnits.forEach(u => {
    if (CYBER_ONLY_UNITS.has(u)) cyberFileCount++;
    if (DATA_ONLY_UNITS.has(u)) dataFileCount++;
  });
  if (cyberFileCount > 0 && dataFileCount === 0) fileContextStream = 'Cyber';
  else if (dataFileCount > 0 && cyberFileCount === 0) fileContextStream = 'Data';

  const students = Array.from(studentsMap.values()).map(s => {
    let cyberScore = 0;
    let dataScore = 0;

    Object.values(s.units).forEach(u => {
      const isCyber = CYBER_ONLY_UNITS.has(u.unitCode);
      const isData = DATA_ONLY_UNITS.has(u.unitCode);
      if (!isCyber && !isData) return;

      let weight = 0;
      if (['Completed', 'Enrolled', 'CreditTransfer', 'Failed'].includes(u.status)) {
        weight = 20; 
      } else if (u.status === 'NotEnrolled') {
        weight = 100; 
      } else {
        weight = 1;
      }

      if (isCyber) cyberScore += weight;
      if (isData) dataScore += weight;
    });

    let studentStream: 'Cyber' | 'Data' | 'Combined' = 'Combined';
    if (cyberScore > dataScore) studentStream = 'Cyber';
    else if (dataScore > cyberScore) studentStream = 'Data';
    else studentStream = fileContextStream;

    s.stream = studentStream;

    const allListedUnits = Object.keys(s.units);
    const completedOrCredited = Object.values(s.units).filter(u => 
      u.status === "Completed" || u.status === "CreditTransfer" || u.status === "Enrolled"
    ).length;
    
    s.totalListedUnits = allListedUnits.length;
    s.completedCount = completedOrCredited;
    s.progressPercent = s.totalListedUnits > 0 ? (s.completedCount / s.totalListedUnits) * 100 : 0;
    
    return s;
  });

  return students;
};

export const generatePredictions = (
  students: StudentProfile[], 
  offeredUnits: Set<string>,
  prerequisiteRules?: PrerequisiteRule[],
  manualOverrides?: Record<string, Record<string, string[]>>
): ProcessedData => {
  const plans: StudentPlan[] = [];
  const unitDemandMap = new Map<string, number>();
  let atRiskCount = 0;

  const EXCLUDED_STATUSES = ["Cancelled", "Exit Course", "Visa Refusal", "Withdrawn"];

  students.forEach(student => {
    // Exclude specific inactive statuses as requested
    const isExcluded = EXCLUDED_STATUSES.some(s => student.status.includes(s));
    if (isExcluded) return;

    // Only process students who are considered "Current" or active
    if (!student.status.toLowerCase().includes("current")) return;

    const doneOrEnrolled = new Set<string>();
    Object.values(student.units).forEach(u => {
      if (['Completed', 'CreditTransfer', 'Enrolled'].includes(u.status)) {
        doneOrEnrolled.add(u.unitCode);
      }
    });

    const simDone = new Set(doneOrEnrolled);
    const studentPlansItems = [];
    let termCounter = 1;
    let loopLimit = 0;
    
    while(loopLimit < 20) {
      loopLimit++;
      const isNextSem = termCounter === 1;
      const termLabel = isNextSem ? "Next Semester" : `Following Semester ${termCounter - 1}`;
      
      let currentTerm: string[] = [];

      if (manualOverrides?.[student.id]?.[termLabel]) {
        currentTerm = manualOverrides[student.id][termLabel];
      } else {
        let candidates = MASTER_UNIT_ORDER.filter(u => !simDone.has(u));
        
        if (student.stream === 'Cyber') {
            candidates = candidates.filter(u => !DATA_ONLY_UNITS.has(u));
        } else if (student.stream === 'Data') {
            candidates = candidates.filter(u => !CYBER_ONLY_UNITS.has(u));
        }
      
      if (candidates.length === 0) break;

      const eligibleUnits = candidates.filter(u => {
        // Updated Logic: Use the Year 2 Gate check
        if (!canTakeUnit(u, simDone, student.stream, prerequisiteRules)) return false;
        
        if (isNextSem) {
          if (!offeredUnits.has(u)) return false;
        }
        return true;
      });

      eligibleUnits.sort(sortUnits);

      // Flexibility Logic: Allow mixing backlog units with next semester units
      // Instead of just taking the first 4 (which would be all backlog), 
      // we take a mix if possible.
      
      if (eligibleUnits.length > 0) {
        const unitsBySemester: Record<number, string[]> = {};
        eligibleUnits.forEach(u => {
          const sem = UNIT_SEMESTER_MAP[u] || 99;
          if (!unitsBySemester[sem]) unitsBySemester[sem] = [];
          unitsBySemester[sem].push(u);
        });

        const sortedSemesters = Object.keys(unitsBySemester).map(Number).sort((a, b) => a - b);
        
        if (sortedSemesters.length > 0) {
          const earliestSem = sortedSemesters[0];
          const nextSem = sortedSemesters.find(s => s > earliestSem);

          // Take up to 2 from earliest (backlog)
          const fromEarliest = unitsBySemester[earliestSem].slice(0, 2);
          currentTerm.push(...fromEarliest);

          if (nextSem !== undefined) {
            // Take up to 2 from next semester to allow progression
            const fromNext = unitsBySemester[nextSem].slice(0, 2);
            currentTerm.push(...fromNext);
          }

          // Fill remaining slots (up to 4) from the remaining eligible units in order
          const alreadyPicked = new Set(currentTerm);
          for (const u of eligibleUnits) {
            if (currentTerm.length >= 4) break;
            if (!alreadyPicked.has(u)) {
              currentTerm.push(u);
              alreadyPicked.add(u);
            }
          }
        }
      }
    }

    if (currentTerm.length > 0) {
      studentPlansItems.push({
          term: termLabel,
          units: currentTerm
        });

        currentTerm.forEach(u => simDone.add(u));

        if (isNextSem) {
          if (currentTerm.length < 4) atRiskCount++;
          currentTerm.forEach(u => {
            unitDemandMap.set(u, (unitDemandMap.get(u) || 0) + 1);
          });
        }
      } else {
        if (isNextSem) break; 
        break;
      }
      termCounter++;
    }

    if (studentPlansItems.length > 0) {
      plans.push({
        studentId: student.id,
        studentName: student.name,
        plans: studentPlansItems,
        planType: "Standard"
      });
    }
  });

  const unitDemand: UnitDemand[] = Array.from(unitDemandMap.entries()).map(([code, count]) => {
    let uType: 'Cyber' | 'Data' | 'Common' = 'Common';
    if (CYBER_ONLY_UNITS.has(code)) uType = 'Cyber';
    if (DATA_ONLY_UNITS.has(code)) uType = 'Data';

    return {
        unitCode: code,
        count,
        isCommon: COMMON_UNITS.has(code),
        unitType: uType,
        semester: UNIT_SEMESTER_MAP[code] || 0
    };
  }).sort((a, b) => b.count - a.count);

  const totalEstimatedEnrollments = unitDemand.reduce((sum, item) => sum + item.count, 0);
  const currentStudentsCount = students.filter(s => s.status === "Current Student").length;
  const graduatingSoonCount = students.filter(s => s.status === "Current Student" && s.progressPercent > 90).length;

  return {
    students,
    plans,
    unitDemand,
    stats: {
      totalAllocations: totalEstimatedEnrollments,
      totalStudents: currentStudentsCount,
      atRisk: atRiskCount,
      graduatingSoon: graduatingSoonCount,
      totalUnitsOffered: unitDemand.length
    }
  };
};
