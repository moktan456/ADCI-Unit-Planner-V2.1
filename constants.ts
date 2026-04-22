
export const MASTER_UNIT_ORDER = [
  "CSC101", "CSC102", "DNA101", "MAT101", "SEC101", "DNA102", "ARI101", "SEC102",
  "CSC203", "CYB201", "CYB202", "CYB203", "CSC204", "CYB204", "CYB205",
  "ARI202", "DNA203", "MAT202", "MAT203", "DNA204", "ORG201", "ORG202",
  "CYB307", "CYB308", "SEC303", "CSC305", "ARI303", "DNA305",
  "CYB306", "CAP301", "ORG303", "CAP302", "ORG304"
];

// In a real app, this might come from a config file or API
export const OFFERED_UNITS = new Set([
  "CSC101", "CSC102", "DNA101", "MAT101", "SEC101", "DNA102", "ARI101", "SEC102",
  "CSC203", "CYB201", "CYB202", "CYB203", "CSC204", "CYB204", "CYB205",
  "ARI202", "DNA203", "MAT202", "MAT203", "DNA204", "ORG201", "ORG202",
  "CYB307", "CYB308", "SEC303", "CSC305", "ARI303", "DNA305",
  "CYB306", "CAP301", "ORG303", "CAP302", "ORG304"
]);

export const CYBER_ONLY_UNITS = new Set([
  "CYB201", "CYB202", "CYB203", "CSC204", "CYB204", "CYB205", 
  "CYB307", "CYB308", "SEC303"
]);

export const DATA_ONLY_UNITS = new Set([
  "ARI202", "DNA203", "MAT202", "MAT203", "DNA204", "ORG201", 
  "CSC305", "ARI303", "DNA305"
]);

// Progression Pools
export const YEAR_1_POOL = new Set([
  "CSC101", "CSC102", "DNA101", "MAT101", "SEC101", "DNA102", "ARI101", "SEC102"
]);

export const YEAR_2_CYBER_POOL = new Set([
  "CSC203", "ORG202", "CYB201", "CYB202", "CYB203", "CSC204", "CYB204", "CYB205"
]);

export const YEAR_2_DATA_POOL = new Set([
  "CSC203", "ORG202", "ARI202", "DNA203", "MAT202", "MAT203", "DNA204", "ORG201"
]);

export const YEAR_3_UNITS = new Set([
  "CYB307", "CYB308", "SEC303", "CSC305", "ARI303", "DNA305",
  "CYB306", "CAP301", "ORG303", "CAP302", "ORG304"
]);

export const PREREQUISITES: Record<string, string[]> = {
  // Year 1
  "ARI101": ["CSC101"],
  
  // Year 2
  "ARI202": ["ARI101"],
  "DNA203": ["DNA101"],
  "DNA204": ["CSC101", "DNA101"],
  "MAT202": ["MAT101"],
  "MAT203": ["CSC101", "MAT101"],
  "ORG201": ["SEC101", "DNA102"],
  "ORG202": ["SEC101"],
  "CSC203": ["CSC101"],
  "CYB201": ["CSC102"],
  "CYB202": ["MAT101"],
  "CYB203": ["SEC102"],
  "CYB204": ["CSC101", "CSC102"],
  "CYB205": ["CSC101", "CSC102"],
  "CSC204": ["CSC102", "SEC102"],

  // Year 3
  "CAP302": ["CAP301"],
  "CYB307": ["CSC101", "CSC102", "CSC203"],
  "SEC303": ["SEC102"],
  "CSC305": ["DNA203"],
  "ARI303": ["ARI202"],
  "DNA305": ["DNA204"]
};

export const UNIT_SEMESTER_MAP: Record<string, number> = {
  "CSC101": 1.1, "CSC102": 1.1, "DNA101": 1.1, "MAT101": 1.1,
  "SEC101": 1.2, "DNA102": 1.2, "ARI101": 1.2, "SEC102": 1.2,
  "CSC203": 2.1, "CYB201": 2.1, "CYB202": 2.1, "CYB203": 2.1,
  "ARI202": 2.1, "DNA203": 2.1, "MAT202": 2.1,
  "CSC204": 2.2, "CYB204": 2.2, "CYB205": 2.2, "ORG202": 2.2,
  "MAT203": 2.2, "DNA204": 2.2, "ORG201": 2.2,
  "CYB307": 3.1, "CYB306": 3.1, "CAP301": 3.1, "ORG303": 3.1,
  "CSC305": 3.1, "ARI303": 3.1,
  "CYB308": 3.2, "SEC303": 3.2, "CAP302": 3.2, "ORG304": 3.2,
  "DNA305": 3.2
};

export const COMMON_UNITS = new Set([
  "CSC101", "CSC102", "DNA101", "MAT101", "SEC101", "DNA102", "ARI101", "SEC102",
  "CSC203", "ORG202", "CYB306", "CAP301", "ORG303", "CAP302", "ORG304"
]);

export const STATUS_MAPPING: Record<string, "Completed" | "Enrolled" | "Failed" | "NotEnrolled" | "Other"> = {
  "Subject Completed": "Completed",
  "Subject Enrolled": "Enrolled",
  "Subject Failed": "Failed",
  "Subject Not Enrolled": "NotEnrolled",
  "Other": "Other"
};
