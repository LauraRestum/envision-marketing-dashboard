import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';

export default function useMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMeetings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Meetings listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function addMeeting(meeting) {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'meetings'), {
      title: meeting.title,
      date: meeting.date,
      attendees: meeting.attendees || [],
      agenda: meeting.agenda || [],
      notes: meeting.notes || '',
      actionItems: meeting.actionItems || [],
      tags: meeting.tags || [],
      createdAt: now,
    });
  }

  async function updateMeeting(id, updates) {
    await updateDoc(doc(db, 'meetings', id), updates);
  }

  async function removeMeeting(id) {
    await deleteDoc(doc(db, 'meetings', id));
  }

  function getNextMondaySync() {
    const now = new Date();
    const upcoming = meetings.find((m) =>
      m.title && m.title.toLowerCase().includes('sync') && m.date >= now.toISOString().split('T')[0]
    );
    return upcoming || null;
  }

  return { meetings, loading, addMeeting, updateMeeting, removeMeeting, getNextMondaySync };
}
