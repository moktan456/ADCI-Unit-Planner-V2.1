
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// --- CONSTANTS (Mirrored from constants.ts) ---
const MASTER_UNIT_ORDER = [
  "CSC101", "CSC102", "DNA101", "MAT101", "SEC101", "DNA102", "ARI101", "SEC102",
  "CSC203", "CYB201", "CYB202", "CYB203", "CSC204", "CYB204", "CYB205",
  "ARI202", "DNA203", "MAT202", "MAT203", "DNA204", "ORG201", "ORG202",
  "CYB307", "CYB308", "SEC303", "CSC305", "ARI303", "DNA305",
  "CYB306", "CAP301", "ORG303", "CAP302", "ORG304"
];
const COMMON_UNITS = new Set([
  "CSC101", "CSC102", "DNA101", "MAT101", "SEC101", "DNA102", "ARI101", "SEC102",
  "CSC203", "ORG202", "CYB306", "CAP301", "ORG303", "CAP302", "ORG304"
]);
const CYBER_ONLY_UNITS = new Set(["CYB201", "CYB202", "CYB203", "CSC204", "CYB204", "CYB205", "CYB307", "CYB308", "SEC303"]);
const DATA_ONLY_UNITS = new Set(["ARI202", "DNA203", "MAT202", "MAT203", "DNA204", "ORG201", "CSC305", "ARI303", "DNA305"]);
const STATUS_MAPPING = {
  "Subject Completed": "Completed", "Subject Enrolled": "Enrolled",
  "Subject Failed": "Failed", "Subject Not Enrolled": "NotEnrolled", "Other": "Other"
};

// --- HELPERS ---
const parseUnits = (cellText) => {
  if (!cellText) return [];
  const text = String(cellText).replace(/[;/\n\r]+/g, ",");
  return text.split(",").map(p => p.trim()).filter(p => p).map(p => {
    const match = p.match(/^([A-Za-z0-9]+)\s*\((.*?)\)$/);
    return match ? { unit: match[1].trim().toUpperCase(), grade: match[2].trim().toUpperCase() } 
                 : { unit: p.trim().toUpperCase(), grade: "" };
  });
};

const calculateIntake = (dateStr) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Unknown";
    const month = date.getMonth(); 
    const year = date.getFullYear();
    if (month === 1 || month === 2) return `Feb ${year}`;
    if (month === 6 || month === 7) return `July ${year}`;
    if (month === 10 || month === 11) return `Nov ${year}`;
    if (month === 0) return `Nov ${year - 1}`;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `Non-Standard ${monthNames[month]} ${year}`;
};

const parseCourseLength = (s) => {
    if (typeof s === 'string' && s.includes(" - ")) {
      const [left, right] = s.split(" - ", 2);
      const toISO = (d) => {
        const parts = d.split("/");
        return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : null;
      };
      return { start: toISO(left), end: toISO(right) };
    }
    return { start: null, end: null };
};

// --- MAIN INGEST FUNCTION ---
async function runIngest() {
    const IMPORTS_DIR = path.join(__dirname, '..', 'imports');
    const DATA_DIR = path.join(__dirname, '..', 'data');
    const OUTPUT_FILE = path.join(DATA_DIR, 'workspace.json');

    if (!fs.existsSync(IMPORTS_DIR)) {
        fs.mkdirSync(IMPORTS_DIR, { recursive: true });
        console.log(`[Ingest] Created 'imports' directory. Please place .xlsx files there and run again.`);
        return;
    }
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const files = fs.readdirSync(IMPORTS_DIR).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    if (files.length === 0) {
        console.log("[Ingest] No Excel files found in 'imports' directory.");
        return;
    }

    console.log(`[Ingest] Found ${files.length} files. Processing...`);

    const studentsMap = new Map();
    const allFoundUnits = new Set();

    for (const file of files) {
        const filePath = path.join(IMPORTS_DIR, file);
        console.log(`   - Reading ${file}...`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames.find(n => n.includes("ReportData")) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        jsonData.forEach(row => {
            const studentId = String(row["Studentid"] || "").trim();
            if (!studentId) return;

            if (!studentsMap.has(studentId)) {
                const { start, end } = parseCourseLength(row["Course Length"] || "");
                studentsMap.set(studentId, {
                    id: studentId,
                    name: String(row["Student Name"] || "").trim(),
                    status: String(row["Status"] || "").trim(),
                    stream: 'Combined',
                    intake: calculateIntake(start),
                    courseStartDate: start,
                    plannedEndDate: end,
                    units: {},
                    progressPercent: 0,
                    completedCount: 0,
                    totalListedUnits: 0,
                    semestersRequired: 0
                });
            }

            const student = studentsMap.get(studentId);
            Object.entries(STATUS_MAPPING).forEach(([colName, baseStatus]) => {
                if (row[colName]) {
                    const parsed = parseUnits(row[colName]);
                    parsed.forEach(({ unit, grade }) => {
                        allFoundUnits.add(unit);
                        const finalStatus = (grade.includes("CPL") || grade.includes("Credit")) ? "CreditTransfer" : baseStatus;
                        student.units[unit] = { unitCode: unit, status: finalStatus, grade };
                    });
                }
            });
        });
    }

    // --- STREAM LOGIC ---
    let fileContextStream = 'Combined';
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
            if (CYBER_ONLY_UNITS.has(u.unitCode)) cyberScore++;
            if (DATA_ONLY_UNITS.has(u.unitCode)) dataScore++;
        });

        if (cyberScore > dataScore) s.stream = 'Cyber';
        else if (dataScore > cyberScore) s.stream = 'Data';
        else s.stream = fileContextStream;

        const allListed = Object.keys(s.units);
        const completed = Object.values(s.units).filter(u => ['Completed','CreditTransfer','Enrolled'].includes(u.status)).length;
        s.totalListedUnits = allListed.length;
        s.completedCount = completed;
        s.progressPercent = s.totalListedUnits > 0 ? (s.completedCount / s.totalListedUnits) * 100 : 0;
        return s;
    });

    // --- CREATE WORKSPACE ---
    // We do NOT generate predictions here to save space; the frontend does it on load.
    // We just save the raw data.
    const workspace = {
        rawStudents: students,
        offeredUnits: MASTER_UNIT_ORDER, // Default offered units
        timetable: { schedule: {}, teachers: [], assignments: {} },
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(workspace, null, 2));
    console.log(`[Ingest] Successfully wrote ${students.length} students to data/workspace.json`);
}

runIngest();
