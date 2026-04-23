
import React, { useState, useCallback, useEffect } from 'react';
import { LayoutDashboard, Users, BookOpen, Settings, CalendarRange, SlidersHorizontal, FileText, Shield, X, CheckCircle, Info, LogOut, Save, DownloadCloud, AlertTriangle, Upload, Loader2, ListChecks } from 'lucide-react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import StudentTracker from './components/StudentTracker';
import StudyPlanView from './components/StudyPlanView';
import UnitDemandList from './components/UnitDemandList';
import TimetableScheduler from './components/TimetableScheduler';
import OfferingSelector from './components/OfferingSelector';
import StudyPlanList from './components/StudyPlanList';
import FailureAnalysis from './components/FailureAnalysis';
import Login from './components/Login';
import { parseStudentData, generatePredictions, parsePrerequisiteData, downloadPrerequisiteTemplate } from './services/dataProcessor';
import { apiService } from './services/api';
import { ProcessedData, StudentProfile, WorkspaceState, PrerequisiteRule } from './types';
import { OFFERED_UNITS as DEFAULT_OFFERED_UNITS } from './constants';
import { clsx } from 'clsx';
import { auth, db, onAuthStateChanged, signOut, User } from './firebase';

type StreamFilter = 'Combined' | 'Cyber' | 'Data';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [data, setData] = useState<ProcessedData | null>(null);
  const [rawStudents, setRawStudents] = useState<StudentProfile[] | null>(null);
  const [offeredUnits, setOfferedUnits] = useState<Set<string>>(new Set(DEFAULT_OFFERED_UNITS));
  const [prerequisiteRules, setPrerequisiteRules] = useState<PrerequisiteRule[]>([]);
  const [manualOverrides, setManualOverrides] = useState<Record<string, Record<string, string[]>>>({});

  const [streamFilter, setStreamFilter] = useState<StreamFilter>('Combined');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracker' | 'plans' | 'demand' | 'timetable' | 'offerings' | 'failures'>('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getCurrentState = (
    currentRawStudents: StudentProfile[], 
    currentOfferedUnits: Set<string>,
    rules?: PrerequisiteRule[],
    overrides?: Record<string, Record<string, string[]>>
  ): WorkspaceState => {
      const timetableSchedule = JSON.parse(localStorage.getItem('adci_timetable_schedule') || '{}');
      const timetableTeachers = JSON.parse(localStorage.getItem('adci_timetable_teachers') || '[]');
      const timetableAssignments = JSON.parse(localStorage.getItem('adci_timetable_assignments') || '{}');
      const timetableRooms = JSON.parse(localStorage.getItem('adci_timetable_rooms') || '["Room 1", "Room 2"]');

      return {
          rawStudents: currentRawStudents,
          offeredUnits: Array.from(currentOfferedUnits),
          timetable: {
              schedule: timetableSchedule,
              teachers: timetableTeachers,
              assignments: timetableAssignments,
              rooms: timetableRooms
          },
          prerequisiteRules: rules || prerequisiteRules,
          manualOverrides: overrides || manualOverrides,
          exportedAt: new Date().toISOString(),
          version: '1.0'
      };
  };

  const restoreState = (workspace: WorkspaceState) => {
      if (!workspace.rawStudents || workspace.rawStudents.length === 0) return;

      setRawStudents(workspace.rawStudents);
      const loadedOfferings = new Set(workspace.offeredUnits);
      setOfferedUnits(loadedOfferings);
      setPrerequisiteRules(workspace.prerequisiteRules || []);
      setManualOverrides(workspace.manualOverrides || {});
      
      // Update local storage for redundancy
      localStorage.setItem('adci_timetable_schedule', JSON.stringify(workspace.timetable?.schedule || {}));
      localStorage.setItem('adci_timetable_teachers', JSON.stringify(workspace.timetable?.teachers || []));
      localStorage.setItem('adci_timetable_assignments', JSON.stringify(workspace.timetable?.assignments || {}));
      localStorage.setItem('adci_timetable_rooms', JSON.stringify(workspace.timetable?.rooms || ["Room 1", "Room 2"]));

      const processed = generatePredictions(workspace.rawStudents, loadedOfferings, workspace.prerequisiteRules, workspace.manualOverrides);
      setData(processed);
  };

  const loadFromServer = async () => {
      setIsLoading(true);
      try {
        let serverData = await apiService.load();
        
        if (serverData && serverData.rawStudents && serverData.rawStudents.length > 0) {
            restoreState(serverData);
            showToast("Data loaded from server");
        } else {
            // No data on server, remain in "Upload" state
            console.log("No existing data found on server.");
        }
      } catch (err: any) {
        console.warn("Load failed:", err);
        showToast("Could not load data. Check console.", "error");
      } finally {
        setIsLoading(false);
      }
  };

  const saveToServer = async (studentsOverride?: StudentProfile[], offeringsOverride?: Set<string>) => {
      const studentsToSave = studentsOverride || rawStudents;
      const offeringsToSave = offeringsOverride || offeredUnits;
      
      if (!studentsToSave) return;
      
      setIsLoading(true);
      const currentState = getCurrentState(studentsToSave, offeringsToSave);
      
      try {
        const result = await apiService.save(currentState);
        if (result.success) {
            showToast("Saved to Firestore", "success");
        } else {
            showToast(`Save Failed: ${result.error}`, "warning"); 
        }
      } catch (e) {
        showToast("Could not write to server.", "error");
      } finally {
        setIsLoading(false);
      }
  };

  const handleLogin = async (u: string, p: string): Promise<boolean> => {
    if (u === 'admin' && p === 'admin123') {
      const mockUser = {
        uid: 'admin-id',
        email: 'admin@adci.edu',
        displayName: 'ADCI Admin',
        emailVerified: true,
        isAnonymous: false,
        providerData: [],
        metadata: {},
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({})
      } as unknown as User;
      
      setUser(mockUser);
      showToast("Logged in as Admin", "success");
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null); // Explicitly clear in case of mock user
      setData(null);
      setRawStudents(null);
    } catch (error) {
      showToast("Logout failed", "error");
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Don't overwrite if we have a hardcoded admin session
      if (user?.uid === 'admin-id' && !currentUser) return;
      
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Sync user profile to Firestore
        try {
          const { doc, setDoc, getDoc } = await import('firebase/firestore');
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
             await setDoc(userRef, {
               uid: currentUser.uid,
               email: currentUser.email,
               role: 'viewer', // Default role for new users
               createdAt: new Date().toISOString()
             });
          }
        } catch (e) {
          console.error("Profile sync error:", e);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Initial Load
  useEffect(() => {
    if (user) {
        loadFromServer();
    }
  }, [user]);

  const handleFileProcess = async (files: File[]) => {
    setIsLoading(true);
    try {
      const workspaceFile = files.find(f => f.name.endsWith('.json'));
      if (workspaceFile) {
          const text = await workspaceFile.text();
          const workspace: WorkspaceState = JSON.parse(text);
          restoreState(workspace);
          await saveToServer(workspace.rawStudents, new Set(workspace.offeredUnits), workspace.prerequisiteRules, workspace.manualOverrides);
          setIsLoading(false);
          return;
      }

      const allStudents: StudentProfile[] = [];
      for (const file of files) {
        const fileStudents = await parseStudentData(file);
        allStudents.push(...fileStudents);
      }
      
      if (allStudents.length === 0) {
        showToast("No valid student data found in the uploaded files. Please check the column headers.", "error");
        setIsLoading(false);
        return;
      }
      
      setRawStudents(allStudents);
      const processed = generatePredictions(allStudents, offeredUnits, prerequisiteRules, manualOverrides);
      setData(processed);
      
      // Immediately save to server JSON file
      await saveToServer(allStudents, offeredUnits, prerequisiteRules, manualOverrides);
      showToast(`Successfully analyzed ${allStudents.length} students`, "success");

    } catch (error) {
      console.error("Failed to process file", error);
      showToast("Error processing files", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLocalFile = () => {
      if (!rawStudents) return;
      const state = getCurrentState(rawStudents, offeredUnits);
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADCI_Workspace_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Workspace downloaded");
  };

  const handlePrerequisiteProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const rules = await parsePrerequisiteData(file);
      setPrerequisiteRules(rules);
      
      if (rawStudents) {
        const processed = generatePredictions(rawStudents, offeredUnits, rules, manualOverrides);
        setData(processed);
      }
      
      showToast(`Updated ${rules.length} prerequisite rules`, "success");
      // Trigger save
      if (rawStudents) await saveToServer(rawStudents, offeredUnits, rules, manualOverrides);
    } catch (error) {
      console.error("Failed to process prerequisites", error);
      showToast("Error processing prerequisite file", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePredictions = useCallback((students: StudentProfile[], offerings: Set<string>, filter: StreamFilter, rules?: PrerequisiteRule[], overrides?: Record<string, Record<string, string[]>>) => {
    setIsLoading(true);
    setTimeout(() => {
      const filteredStudents = students.filter(s => filter === 'Combined' || s.stream === filter);
      const updatedData = generatePredictions(filteredStudents, offerings, rules || prerequisiteRules, overrides || manualOverrides);
      setData(updatedData);
      setIsLoading(false);
    }, 50);
  }, [prerequisiteRules, manualOverrides]);

  const handleUpdateManualPlan = (studentId: string, term: string, units: string[]) => {
    const newOverrides = { ...manualOverrides };
    if (!newOverrides[studentId]) newOverrides[studentId] = {};
    newOverrides[studentId][term] = units;
    setManualOverrides(newOverrides);
    
    if (rawStudents) {
      updatePredictions(rawStudents, offeredUnits, streamFilter, prerequisiteRules, newOverrides);
      saveToServer(rawStudents, offeredUnits, prerequisiteRules, newOverrides);
    }
  };

  const handleOfferingsUpdate = (newOfferings: Set<string>) => {
    if (!rawStudents) return;
    setOfferedUnits(newOfferings);
    updatePredictions(rawStudents, newOfferings, streamFilter);
    saveToServer(rawStudents, newOfferings, prerequisiteRules, manualOverrides);
  };

  const handleStreamFilterChange = (newFilter: StreamFilter) => {
    if (!rawStudents) return;
    setStreamFilter(newFilter);
    updatePredictions(rawStudents, offeredUnits, newFilter);
  };

  const handleResetData = async () => {
    setIsLoading(true);
    try {
      // 1. Delete from server FIRST to ensure it's gone before we clear local state
      const result = await apiService.delete();
      
      if (result.success) {
        // 2. Clear local state
        setData(null);
        setRawStudents(null);
        setOfferedUnits(new Set(DEFAULT_OFFERED_UNITS));
        
        // 3. Clear ALL storage
        localStorage.clear();
        sessionStorage.clear();
        
        showToast("All data cleared and removed from server", "info");
        
        // 4. Hard reload to ensure all states are reset
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        showToast(`Server cleanup failed: ${result.error}`, "error");
      }
      
    } catch (error) {
      console.error("Reset failed:", error);
      showToast("Failed to clear server data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="absolute top-6 right-6">
           <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-slate-600 hover:text-red-600 transition-colors text-sm font-bold">
             <LogOut className="w-4 h-4" /> Sign Out
           </button>
        </div>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ADCI Unit Planner 2.1</h1>
          <p className="text-lg text-slate-500">Intelligent Progression Tracking & Study Planning</p>
        </div>
        
        {/* Empty State / Upload options */}
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl p-8 border border-white/50 backdrop-blur-sm relative overflow-hidden flex flex-col items-center">
           <FileUpload onFileProcess={handleFileProcess} isProcessing={isLoading} />
        </div>

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(toast => (
            <div key={toast.id} className={clsx("flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium min-w-[300px] animate-slide-up", toast.type === 'success' ? "bg-emerald-600" : toast.type === 'error' ? "bg-red-600" : toast.type === 'warning' ? "bg-amber-500" : "bg-slate-800")}>
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              <span className="flex-1">{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab; icon: React.ElementType; label: string }) => (
    <button onClick={() => setActiveTab(id)} className={clsx("flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full", activeTab === id ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
      <Icon className="w-5 h-5" /><span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-100">
          <div className="mb-6 flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /><span className="font-extrabold text-xl tracking-tight text-primary leading-tight">ADCI Unit Planner 2.1</span></div>
          <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-semibold">
            {['Combined', 'Cyber', 'Data'].map((filter) => (
               <button key={filter} onClick={() => handleStreamFilterChange(filter as StreamFilter)} className={clsx("flex-1 py-1.5 rounded-md transition-all", streamFilter === filter ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}>{filter === 'Combined' ? 'All' : filter}</button>
            ))}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Overview" />
          <NavItem id="tracker" icon={Users} label="Student Tracker" />
          <NavItem id="failures" icon={AlertTriangle} label="Failure Analysis" />
          <NavItem id="plans" icon={FileText} label="Study Plans" />
          <NavItem id="demand" icon={BookOpen} label="Unit Demand" />
          <NavItem id="timetable" icon={CalendarRange} label="Timetable" />
          <div className="pt-4 pb-2"><div className="h-px bg-slate-100 mx-2"></div></div>
          <NavItem id="offerings" icon={SlidersHorizontal} label="Offerings" />
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-2">
          <button onClick={() => saveToServer()} disabled={isLoading} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-indigo-600 transition-colors w-full text-sm font-medium">
             <Save className={clsx("w-4 h-4", isLoading && "animate-pulse")} />
             <span>{isLoading ? 'Saving...' : 'Save to Server'}</span>
          </button>
          <button onClick={handleSaveToLocalFile} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-emerald-600 transition-colors w-full text-sm font-medium">
             <DownloadCloud className="w-4 h-4" />
             <span>Download JSON</span>
          </button>
          
          <div className="pt-2">
            <button onClick={downloadPrerequisiteTemplate} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-primary transition-colors w-full text-sm font-medium">
              <DownloadCloud className="w-4 h-4" />
              <span>Download Template</span>
            </button>

            <label className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-primary transition-colors w-full text-sm font-medium cursor-pointer">
              <ListChecks className="w-4 h-4" />
              <span>Upload Prerequisites</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handlePrerequisiteProcess} 
              />
            </label>
          </div>

          <button onClick={handleResetData} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-orange-600 transition-colors w-full text-sm font-medium">
             <Upload className="w-4 h-4" />
             <span>Upload New Data</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 transition-colors w-full text-sm font-medium"><LogOut className="w-4 h-4" /><span>Sign Out</span></button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800 capitalize">
              {activeTab === 'dashboard' ? 'Executive Dashboard' : activeTab === 'tracker' ? 'Student Progression' : activeTab === 'plans' ? 'Projected Study Plans' : activeTab === 'demand' ? 'Unit Offerings' : activeTab === 'timetable' ? 'Smart Timetable' : activeTab === 'failures' ? 'Failure Analysis' : 'Configuration'}
            </h1>
            <span className={clsx("px-2 py-0.5 rounded text-xs font-bold border", streamFilter === 'Cyber' ? "bg-indigo-50 text-indigo-700 border-indigo-200" : streamFilter === 'Data' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200")}>{streamFilter} View</span>
          </div>
          <div className="flex items-center gap-4">
             {isLoading && <span className="text-sm text-emerald-600 animate-pulse font-bold flex items-center gap-2">Saving...</span>}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 relative">
          {activeTab === 'dashboard' && <Dashboard data={data} />}
          {activeTab === 'tracker' && <StudentTracker data={data} onSelectStudent={setSelectedStudent} streamFilter={streamFilter} />}
          {activeTab === 'failures' && <FailureAnalysis data={data} onSelectStudent={setSelectedStudent} />}
          {activeTab === 'plans' && <StudyPlanList data={data} />}
          {activeTab === 'demand' && <UnitDemandList data={data} />}
          {activeTab === 'timetable' && <TimetableScheduler data={data} showToast={showToast} />}
          {activeTab === 'offerings' && <OfferingSelector selectedUnits={offeredUnits} onUpdate={handleOfferingsUpdate} showToast={showToast} />}
        </div>
      </main>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={clsx("pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white text-sm font-medium min-w-[320px] animate-slide-up transition-all", toast.type === 'success' ? "bg-emerald-600" : toast.type === 'error' ? "bg-red-600" : toast.type === 'warning' ? "bg-amber-500" : "bg-slate-800")}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="hover:opacity-75"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      {selectedStudent && (
        <StudyPlanView 
          data={data!} 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          onUpdateManualPlan={handleUpdateManualPlan}
        />
      )}
    </div>
  );
}

export default App;
