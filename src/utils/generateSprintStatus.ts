import type { JiraIssue, JiraSprint } from './jiraApi';

function formatTimeInStatus(statuscategorychangedate: string | undefined): string {
  if (!statuscategorychangedate) return '-';

  const changed = new Date(statuscategorychangedate);
  const now = new Date();
  const diffMs = now.getTime() - changed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
}

export function generateSprintStatus(sprint: JiraSprint, issues: JiraIssue[]): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`# Sprint Status ${date}`);
  lines.push('');
  if (sprint.name) {
    lines.push(`**Sprint:** ${sprint.name}`);
    lines.push('');
  }

  // Group by assignee
  const byAssignee = new Map<string, JiraIssue[]>();
  for (const issue of issues) {
    const name = issue.fields.assignee?.displayName ?? 'Unassigned';
    const list = byAssignee.get(name) ?? [];
    list.push(issue);
    byAssignee.set(name, list);
  }

  // Sort assignees alphabetically, but put Unassigned last
  const sortedNames = [...byAssignee.keys()].sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  for (const name of sortedNames) {
    const assigneeIssues = byAssignee.get(name)!;
    lines.push(`## ${name}`);
    lines.push('');
    lines.push('| Ticket | Status | Time in Status |');
    lines.push('|--------|--------|----------------|');

    for (const issue of assigneeIssues) {
      const timeInStatus = formatTimeInStatus(issue.fields.statuscategorychangedate);
      lines.push(`| ${issue.key} | ${issue.fields.status.name} | ${timeInStatus} |`);
    }

    lines.push('');
  }

  return lines.join('\n');
}
