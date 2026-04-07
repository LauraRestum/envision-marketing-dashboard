import { useMemo } from 'react';
import useTasks from './useTasks';

export default function useNotificationBadges() {
  const { tasks } = useTasks();

  const badges = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const overdueTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.due && t.due < today
    ).length;

    const needsAttentionTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.priority === 'high'
    ).length;

    return {
      tasks: overdueTasks > 0 ? overdueTasks : 0,
      clickup: 0,
      inbox: 0,
      calendar: 0,
      ensight: 0,
    };
  }, [tasks]);

  return badges;
}
