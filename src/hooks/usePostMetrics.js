import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';

export default function usePostMetrics() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'post_metrics'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMetrics(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  async function addMetric(entry) {
    await addDoc(collection(db, 'post_metrics'), {
      platform: entry.platform || '',
      date: entry.date || new Date().toISOString().slice(0, 10),
      title: entry.title || '',
      likes: parseInt(entry.likes) || 0,
      comments: parseInt(entry.comments) || 0,
      shares: parseInt(entry.shares) || 0,
      reach: parseInt(entry.reach) || 0,
      impressions: parseInt(entry.impressions) || 0,
      saves: parseInt(entry.saves) || 0,
      link: entry.link || '',
      createdAt: new Date().toISOString(),
    });
  }

  async function updateMetric(id, updates) {
    await updateDoc(doc(db, 'post_metrics', id), updates);
  }

  async function deleteMetric(id) {
    await deleteDoc(doc(db, 'post_metrics', id));
  }

  return { metrics, loading, addMetric, updateMetric, deleteMetric };
}
