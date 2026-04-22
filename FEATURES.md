# ADCI Course Planner & Timetable Optimizer - Feature Log

This document outlines the enhancements and features added to the application to improve course planning efficiency and scheduling accuracy.

## 1. Enhanced Study Plan Visualization
*   **Updated Terminology**: Refined the user interface to use "Booking" terminology for student plans, aligning with institutional standards.
*   **Roadmap Watermarks**: Implemented "NO BOOKING" watermarks in the student roadmap view to clearly distinguish between active units and completed/inactive semesters.
*   **Empty State Handling**: Improved empty states to provide clearer guidance when no active study plan is detected for a student.

## 2. Advanced Timetable Scheduler
The timetable module has been significantly upgraded from a static view to a dynamic optimization tool.

### A. Intelligent Auto-Generation
*   **Demand-Based Scheduling**: One-click generation that prioritizes units based on the number of students enrolled.
*   **Minimum Threshold Filter**: Automatically identifies and excludes "low-demand" units (less than 3 students) from the auto-scheduler to ensure resource efficiency. These units are moved to the unassigned sidebar for manual review.

### B. Manual Control & Flexibility
*   **Manual Override**: A "Manual / Clear" option allows administrators to wipe the schedule and build it from scratch using drag-and-drop.
*   **Drag-and-Drop Interface**: Seamlessly move units between days, times, and rooms.

### C. Real-Time Conflict Detection
*   **Student Clash Monitoring**: The system cross-references every scheduled unit with individual student "Next Semester" plans.
*   **Visual Alert System**: If a student is required to take two units scheduled at the same time, a red **"Student Clashes"** badge appears on the unit cards, showing the exact number of affected students.
*   **Teacher Conflict Prevention**: Prevents assigning teachers to slots where they have marked themselves as unavailable.

### D. Resource & Staff Management
*   **Dynamic Classrooms**: Add or remove rooms on the fly; the timetable grid expands automatically to accommodate new spaces.
*   **Teacher Availability Profiles**: Interactive availability matrix for each teacher (Morning, Afternoon, Evening) across the work week.

### E. Data Portability
*   **Excel Export**: Generates a professional, formatted Excel spreadsheet of the final timetable, including unit codes, teacher assignments, and room locations.

---
*Last Updated: April 2026*
