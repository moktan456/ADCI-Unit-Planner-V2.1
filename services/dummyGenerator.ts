
import { StudentProfile, UnitStatus } from '../types';
import { MASTER_UNIT_ORDER, CYBER_ONLY_UNITS, DATA_ONLY_UNITS } from '../constants';

const FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

const STREAMS = ['Cyber', 'Data', 'Combined'] as const;
const STATUSES = ['Current Student', 'Current Student', 'Current Student', 'Current Student', 'Graduated', 'Discontinued'];

const getRandomElement = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateDummyStudents = (count: number = 50): StudentProfile[] => {
  const students: StudentProfile[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = getRandomElement(FIRST_NAMES);
    const lastName = getRandomElement(LAST_NAMES);
    const stream = getRandomElement(STREAMS);
    const status = getRandomElement(STATUSES);
    const startYear = 2022 + Math.floor(Math.random() * 3);
    const studentId = `S${300000 + i}`;
    
    // Simulate random progress through the degree (0 to 100%)
    // Bias towards 20-80% for more interesting data
    const progressFactor = 0.2 + (Math.random() * 0.7); 
    const unitsToComplete = Math.floor(progressFactor * MASTER_UNIT_ORDER.length);
    
    const units: Record<string, UnitStatus> = {};
    
    MASTER_UNIT_ORDER.forEach((unitCode, idx) => {
      // Skip units not in their stream
      if (stream === 'Cyber' && DATA_ONLY_UNITS.has(unitCode)) return;
      if (stream === 'Data' && CYBER_ONLY_UNITS.has(unitCode)) return;

      let uStatus: UnitStatus['status'] = 'NotEnrolled';
      let grade = '';

      if (idx < unitsToComplete) {
        // Past unit: likely completed, maybe failed or credit
        const roll = Math.random();
        if (roll > 0.15) {
            uStatus = 'Completed';
            grade = getRandomElement(['HD', 'D', 'C', 'P']);
        } else if (roll > 0.05) {
            uStatus = 'Failed';
            grade = 'N';
        } else {
             uStatus = 'CreditTransfer';
             grade = 'CPL';
        }
      } else if (idx < unitsToComplete + 4 && status === 'Current Student') {
        // Current enrolled units (approx 4 per sem)
         uStatus = 'Enrolled';
         grade = '';
      }

      if (uStatus !== 'NotEnrolled') {
          units[unitCode] = { unitCode, status: uStatus, grade };
      }
    });

    const student: StudentProfile = {
      id: studentId,
      name: `${firstName} ${lastName}`,
      status: status,
      stream: stream,
      intake: `Feb ${startYear}`,
      courseStartDate: `${startYear}-02-01`,
      plannedEndDate: `${startYear + 3}-11-30`,
      units: units,
      progressPercent: 0, // Will be calculated by logic
      completedCount: 0,
      totalListedUnits: 0,
      semestersRequired: 0
    };
    
    // Recalculate stats manually here for the dummy data
    const allListed = Object.keys(student.units);
    const completed = Object.values(student.units).filter(u => ['Completed', 'CreditTransfer', 'Enrolled'].includes(u.status)).length;
    student.totalListedUnits = allListed.length;
    student.completedCount = completed;
    student.progressPercent = allListed.length > 0 ? (completed / allListed.length) * 100 : 0;

    students.push(student);
  }

  return students;
};
