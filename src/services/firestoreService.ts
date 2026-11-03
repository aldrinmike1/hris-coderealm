import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection } from '../firebase';

export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  SHIFTS: 'shifts',
  DTR_RECORDS: 'dtrRecords',
  DTR_DRAFTS: 'dtrDrafts',
  PAY_PERIODS: 'payPeriods',
  PAYSLIPS: 'payslips',
  DEDUCTIONS: 'employeeDeductions',
  THIRTEENTH_MONTH: 'thirteenthMonthRecords',
  AUDIT_LOGS: 'auditLogs',
  COMPANY_PROFILE: 'companyProfile',
  SYSTEM_USERS: 'systemUsers',
};

// Generic fetch all documents from a Firestore collection
export async function getCollectionDocs<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnap => docSnap.data() as T);
  } catch (error) {
    console.warn(`[Firestore] Failed to fetch collection ${collectionName}:`, error);
    return [];
  }
}

// Single document upsert returning success boolean
export async function syncDocToFirestore<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<boolean> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    // Remove undefined values which Firestore rejects
    const sanitized = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error(`[Firestore Error] Failed syncing to ${path}:`, error);
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      // Re-throw or return false so caller can notify UI
    }
    return false;
  }
}

// Single document delete
export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`[Firestore Error] Failed deleting ${path}:`, error);
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch {
      // Re-throw or return false
    }
    return false;
  }
}

// Batch upsert multiple documents
export async function batchSyncDocsToFirestore<T extends { id?: string | number }>(
  collectionName: string,
  items: T[],
  idKey: keyof T = 'id' as keyof T
): Promise<boolean> {
  try {
    if (items.length === 0) return true;
    const batch = writeBatch(db);
    items.forEach(item => {
      const docId = String(item[idKey] || (item as any)['year'] || Math.random().toString(36).substring(2, 9));
      const docRef = doc(db, collectionName, docId);
      const cleanData = JSON.parse(JSON.stringify(item));
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error(`[Firestore Error] Batch write failed for ${collectionName}:`, error);
    try {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    } catch {
      // Re-throw or return false
    }
    return false;
  }
}

// Batch delete documents by ID list
export async function batchDeleteDocsFromFirestore(
  collectionName: string,
  docIds: string[]
): Promise<boolean> {
  try {
    if (docIds.length === 0) return true;
    const batch = writeBatch(db);
    docIds.forEach(id => {
      const docRef = doc(db, collectionName, id);
      batch.delete(docRef);
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error(`[Firestore Error] Batch delete failed for ${collectionName}:`, error);
    try {
      handleFirestoreError(error, OperationType.DELETE, collectionName);
    } catch {
      // Re-throw or return false
    }
    return false;
  }
}

// Batch seed initial data if remote collection is empty
export async function seedCollectionIfEmpty<T extends { id?: string | number }>(
  collectionName: string,
  initialItems: T[],
  idKey: keyof T = 'id' as keyof T
): Promise<void> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty && initialItems.length > 0) {
      const batch = writeBatch(db);
      initialItems.slice(0, 100).forEach(item => {
        const docId = String(item[idKey] || item['year' as keyof T] || Math.random().toString(36).substring(2, 9));
        const docRef = doc(db, collectionName, docId);
        const cleanData = JSON.parse(JSON.stringify(item));
        batch.set(docRef, cleanData);
      });
      await batch.commit();
      console.log(`[Firestore] Seeded ${collectionName} with ${initialItems.length} initial records.`);
    }
  } catch (error) {
    console.warn(`[Firestore] Seeding skipped for ${collectionName}:`, error);
  }
}

export { testConnection };
