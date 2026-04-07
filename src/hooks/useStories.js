import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';

const STAGES = ['pitch', 'assigned', 'draft', 'review', 'approved', 'published', 'repurposed'];

export default function useStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Stories listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function addStory(story) {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'stories'), {
      issueMonth: story.issueMonth || '',
      slot: story.slot || null,
      title: story.title || '',
      pillar: story.pillar || '',
      assignedTo: story.assignedTo || null,
      source: story.source || '',
      angle: story.angle || '',
      brief: story.brief || { who: '', what: '', when: '', where: '', why: '' },
      stage: story.stage || 'pitch',
      platformRollout: story.platformRollout || { facebook: false, instagram: false, tiktok: false, linkedin: false },
      notes: story.notes || '',
      createdAt: now,
      updatedAt: now,
    });
  }

  async function updateStory(id, updates) {
    await updateDoc(doc(db, 'stories', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async function removeStory(id) {
    await deleteDoc(doc(db, 'stories', id));
  }

  function getStoriesForMonth(issueMonth) {
    return stories.filter((s) => s.issueMonth === issueMonth);
  }

  return { stories, loading, addStory, updateStory, removeStory, getStoriesForMonth, STAGES };
}
