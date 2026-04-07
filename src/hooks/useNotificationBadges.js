import { useMemo } from 'react';
import useTasks from './useTasks';
import useSubmissions from './useSubmissions';
import usePosts from './usePosts';
import useStories from './useStories';

export default function useNotificationBadges() {
  const { tasks } = useTasks();
  const { submissions } = useSubmissions();
  const { posts } = usePosts();
  const { stories } = useStories();

  const badges = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const overdueTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.due && t.due < today
    ).length;

    const newSubmissions = submissions.filter((s) => s.status === 'new').length;

    const pendingApproval = posts.filter((p) => p.status === 'needs_approval').length;

    // Ensight: stories with approaching deadlines (within 5 days of draft deadline and not yet in draft stage)
    const ensightAlerts = stories.filter((s) => {
      if (['draft', 'review', 'approved', 'published', 'repurposed'].includes(s.stage)) return false;
      // Rough check: if story exists and isn't in draft yet, count it
      return s.issueMonth && s.stage && ['pitch', 'assigned'].includes(s.stage);
    }).length;

    return {
      tasks: overdueTasks > 0 ? overdueTasks : 0,
      inbox: newSubmissions,
      clickup: 0,
      calendar: pendingApproval,
      ensight: ensightAlerts,
    };
  }, [tasks, submissions, posts, stories]);

  return badges;
}
