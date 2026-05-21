
import { WorkspaceState } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const WORKSPACE_DOC_ID = 'default'; // Using a default workspace for now
const WORKSPACE_COLLECTION = 'workspaces';

interface SaveResult {
  success: boolean;
  error?: string;
}

export const apiService = {
  // Load data: Prioritize local server /api/workspace, fallback to Firestore
  load: async (): Promise<WorkspaceState | null> => {
    try {
      console.log(`[Storage] Loading workspace from local server Express database...`);
      const response = await fetch('/api/workspace', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.ok) {
        const localData = await response.json();
        if (localData && localData.rawStudents && localData.rawStudents.length > 0) {
          console.log(`[Storage] Successfully loaded data from local server.`);
          return localData as WorkspaceState;
        }
      }
    } catch (apiError) {
      console.warn("[Storage] Local server API load failed, trying Firestore...", apiError);
    }

    try {
      console.log(`[Firestore] Loading workspace ${WORKSPACE_DOC_ID}...`);
      const docRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.warn("[Firestore] Workspace document not found.");
        return null;
      }

      return docSnap.data() as WorkspaceState;
    } catch (error: any) {
      console.error("[Firestore Load Error]", error);
      throw error;
    }
  },

  // Save data: Double-write to local server storage and Firestore
  save: async (data: WorkspaceState): Promise<SaveResult> => {
    let localSaved = false;
    let localError = "";

    // 1. Try local Express server write
    try {
      console.log(`[Storage] Saving workspace to local server...`);
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });
      if (response.ok) {
        console.log(`[Storage] Successfully saved locally.`);
        localSaved = true;
      } else {
        localError = `HTTP ${response.status}`;
      }
    } catch (apiError: any) {
      console.warn("[Storage] Local server API save failed:", apiError);
      localError = apiError.message || "Network Error";
    }

    // 2. Try Firestore write as synchronized cloud backup
    try {
      console.log(`[Firestore] Saving workspace ${WORKSPACE_DOC_ID} to Cloud...`);
      const docRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
      await setDoc(docRef, {
        ...data,
        updatedBy: 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return { success: true };
    } catch (firestoreError: any) {
      console.error("[Firestore Save Error]", firestoreError);
      // If local write succeeded, we still consider this save successful overall
      if (localSaved) {
        return { success: true };
      }
      return { success: false, error: `Local: ${localError || "failed"}. Firestore: ${firestoreError.message}` };
    }
  },
  
  // Delete data: Clean up both local server storage and Firestore
  delete: async (): Promise<SaveResult> => {
    let localDeleted = false;

    try {
      console.log(`[Storage] Deleting workspace from local server...`);
      const response = await fetch('/api/workspace', { method: 'DELETE' });
      if (response.ok) {
        localDeleted = true;
      }
    } catch (apiError) {
      console.warn("[Storage] Local server API delete failed:", apiError);
    }

    try {
      console.log(`[Firestore] Deleting workspace ${WORKSPACE_DOC_ID} from Cloud...`);
      const docRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error: any) {
      console.error("[Firestore Delete Error]", error);
      if (localDeleted) {
        return { success: true };
      }
      return { success: false, error: error.message || "Firestore Delete Error" };
    }
  }
};
