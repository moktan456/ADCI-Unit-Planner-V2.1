
import { WorkspaceState } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const WORKSPACE_DOC_ID = 'default'; // Using a default workspace for now
const WORKSPACE_COLLECTION = 'workspaces';

interface SaveResult {
  success: boolean;
  error?: string;
}

export const apiService = {
  // Load data from Firestore
  load: async (): Promise<WorkspaceState | null> => {
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

  // Save data to Firestore
  save: async (data: WorkspaceState): Promise<SaveResult> => {
    try {
      console.log(`[Firestore] Saving workspace ${WORKSPACE_DOC_ID}...`);
      const docRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
      
      await setDoc(docRef, {
        ...data,
        updatedBy: auth.currentUser?.uid || 'anonymous',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return { success: true };
    } catch (error: any) {
      console.error("[Firestore Save Error]", error);
      return { success: false, error: error.message || "Firestore Write Error" };
    }
  },
  
  // Delete data from Firestore
  delete: async (): Promise<SaveResult> => {
    try {
      console.log(`[Firestore] Deleting workspace ${WORKSPACE_DOC_ID}...`);
      const docRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error: any) {
      console.error("[Firestore Delete Error]", error);
      return { success: false, error: error.message || "Firestore Delete Error" };
    }
  }
};
