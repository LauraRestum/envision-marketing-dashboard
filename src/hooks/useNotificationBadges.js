import { useMemo } from 'react';
import useTasks from './useTasks';
import useSubmissions from './useSubmissions';

export default function useNotificationBadges() {
  const { tasks } = useTasks();
  const { submissions } = useSubmissions();

  const badges = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const overdueTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.due && t.due < today
    ).length;

    const newSubmissions = submissions.filter((s) => s.status === 'new').length;

    return {
      tasks: overdueTasks > 0 ? overdueTasks : 0,
      inbox: newSubmissions,
      clickup: 0,
      calendar: 0,
      ensight: 0,
    };
  }, [tasks, submissions]);

  return badges;
}
