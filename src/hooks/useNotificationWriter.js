import { useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export default function useNotificationWriter(tasks) {
  const processed = useRef(new Set());

  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(
      (t) => t.status !== 'completed' && t.due && t.due < today
    );

    overdue.forEach(async (task) => {
      const key = `overdue-${task.id}`;
      if (processed.current.has(key)) return;
      processed.current.add(key);

      try {
        const existing = await getDocs(
          query(
            collection(db, 'notifications'),
            where('refId', '==', task.id),
            where('type', '==', 'overdue')
          )
        );
        if (!existing.empty) return;

        await addDoc(collection(db, 'notifications'), {
          type: 'overdue',
          module: 'Team & Tasks',
          message: `"${task.title}" assigned to ${task.assignee} is overdue (was due ${task.due})`,
          refId: task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to write notification:', err);
      }
    });
  }, [tasks]);
}
