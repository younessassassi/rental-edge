import { SavedProperty } from './types';
import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const PROPERTIES_COLLECTION = 'properties';

function toSavedProperty(id: string, data: Record<string, any>): SavedProperty {
  return {
    id,
    name: data.name ?? '',
    inputs: data.inputs ?? {},
    userId: data.userId ?? '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt ?? ''),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt ?? ''),
  };
}

// Firestore property storage service
export class PropertyService {
  static async getProperties(userId: string): Promise<SavedProperty[]> {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toSavedProperty(d.id, d.data()));
  }

  static async saveProperty(
    property: Omit<SavedProperty, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SavedProperty> {
    const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), {
      name: property.name,
      inputs: property.inputs,
      userId: property.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      ...property,
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static async updateProperty(
    id: string,
    updates: Partial<Pick<SavedProperty, 'name' | 'inputs'>>,
  ): Promise<void> {
    const ref = doc(db, PROPERTIES_COLLECTION, id);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  }

  static async deleteProperty(id: string): Promise<void> {
    await deleteDoc(doc(db, PROPERTIES_COLLECTION, id));
  }
}
