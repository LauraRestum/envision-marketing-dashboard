import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp
} from 'firebase/firestore';

export default function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Tasks listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function addTask(task) {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'tasks'), {
      title: task.title,
      assignee: task.assignee,
      due: task.due || null,
      priority: task.priority || 'medium',
      notes: task.notes || '',
      status: task.status || 'active',
      createdAt: now,
      completedAt: null,
    });
  }

  async function updateTask(id, updates) {
    await updateDoc(doc(db, 'tasks', id), updates);
  }

  async function completeTask(id) {
    await updateDoc(doc(db, 'tasks', id), {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  async function reopenTask(id) {
    await updateDoc(doc(db, 'tasks', id), {
      status: 'active',
      completedAt: null,
    });
  }

  async function removeTask(id) {
    await deleteDoc(doc(db, 'tasks', id));
  }

  function getTasksForAssignee(assignee) {
    return tasks.filter((t) => t.assignee === assignee);
  }

  function getActiveTasks(assignee) {
    return tasks.filter((t) => t.assignee === assignee && t.status === 'active');
  }

  function getUpcomingTasks(assignee) {
    return tasks.filter((t) => t.assignee === assignee && t.status === 'upcoming');
  }

  function getCompletedTasks(assignee) {
    return tasks.filter((t) => t.assignee === assignee && t.status === 'completed');
  }

  function getOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => t.status !== 'completed' && t.due && t.due < today);
  }

  function getDueTodayTasks() {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => t.status !== 'completed' && t.due === today);
  }

  function getThisWeekCompleted(assignee) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return tasks.filter(
      (t) => t.assignee === assignee && t.status === 'completed' &&
        t.completedAt && new Date(t.completedAt) >= startOfWeek
    );
  }

  return {
    tasks, loading,
    addTask, updateTask, completeTask, reopenTask, removeTask,
    getTasksForAssignee, getActiveTasks, getUpcomingTasks, getCompletedTasks,
    getOverdueTasks, getDueTodayTasks, getThisWeekCompleted,
  };
}
