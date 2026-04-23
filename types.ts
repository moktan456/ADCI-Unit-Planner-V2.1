export interface User {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

export interface RawStudentRow {
  Studentid: string;
  "Student Name": string;
  Status: string; // e.g. "Current Student"
  "Course Length": string;
  [key: string]: string | undefined; // For dynamic subject columns
}

export interface UnitStatus {
  unitCode: string;
  status: "Completed" | "Enrolled" | "Failed" | "CreditTransfer" | "NotEnrolled" | "Other";
  grade: string;
}

export interface PrerequisiteRule {
  unitCode: string;
  requiredUnits?: string[]; // List of specific unit codes needed
  minCreditPoints?: number; // Accumulated CP required before taking this unit
  description?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  status: string;
  stream: 'Cyber' | 'Data' | 'Combined';
  intake: string; // Calculated Intake Label
  courseStartDate: string | null;
  plannedEndDate: string | null;
  units: Record<string, UnitStatus>; // Map of UnitCode -> Status
  progressPercent: number;
  completedCount: number;
  totalListedUnits: number;
  semestersRequired: number;
}

export interface StudyPlanItem {
  term: string;
  units: string[];
}

export interface StudentPlan {
  studentId: string;
  studentName: string;
  plans: StudyPlanItem[];
  planType: "Standard" | "Summer";
}

export interface UnitDemand {
  unitCode: string;
  count: number;
  isCommon: boolean;
  unitType: 'Cyber' | 'Data' | 'Common';
  semester: number | string;
}

export interface ProcessedData {
  students: StudentProfile[];
  plans: StudentPlan[];
  unitDemand: UnitDemand[];
  stats: {
    totalAllocations: number;
    totalStudents: number;
    atRisk: number;
    graduatingSoon: number;
    totalUnitsOffered: number;
  };
}

export interface TimetableState {
  schedule: Record<string, string>;
  teachers: any[];
  assignments: Record<string, string>;
  rooms?: string[];
}

export interface WorkspaceState {
  rawStudents: StudentProfile[];
  offeredUnits: string[];
  timetable: TimetableState;
  prerequisiteRules?: PrerequisiteRule[];
  manualOverrides?: Record<string, Record<string, string[]>>; // studentId -> term -> unitCodes
  exportedAt: string;
  version: string;
}