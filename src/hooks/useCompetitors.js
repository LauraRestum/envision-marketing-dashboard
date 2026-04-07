import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';

export default function useCompetitors() {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'competitors'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCompetitors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  async function addCompetitor(comp) {
    await addDoc(collection(db, 'competitors'), {
      name: comp.name,
      followers: comp.followers || {},
      lastChecked: comp.lastChecked || '',
      notes: comp.notes || '',
      createdAt: new Date().toISOString(),
    });
  }

  async function updateCompetitor(id, updates) {
    await updateDoc(doc(db, 'competitors', id), updates);
  }

  async function removeCompetitor(id) {
    await deleteDoc(doc(db, 'competitors', id));
  }

  return { competitors, loading, addCompetitor, updateCompetitor, removeCompetitor };
}
