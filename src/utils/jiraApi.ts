// JIRA REST API client
// Note: JIRA API calls from the browser will hit CORS restrictions.
// Users must configure their JIRA instance to allow CORS from the app origin,
// or use a CORS proxy.

export interface JiraConfig {
  instanceUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    assignee: { displayName: string } | null;
    statuscategorychangedate?: string;
  };
}

function authHeader(config: JiraConfig): string {
  return 'Basic ' + btoa(config.email + ':' + config.apiToken);
}

async function jiraFetch<T>(config: JiraConfig, path: string): Promise<T> {
  const url = `${config.instanceUrl.replace(/\/+$/, '')}${path}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': authHeader(config),
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`JIRA API error ${response.status}: ${text || response.statusText}`);
  }

  return response.json();
}

export async function getBoards(config: JiraConfig): Promise<JiraBoard[]> {
  const data = await jiraFetch<{ values: JiraBoard[] }>(
    config,
    '/rest/agile/1.0/board'
  );
  return data.values;
}

export async function getActiveSprint(config: JiraConfig, boardId: string): Promise<JiraSprint | null> {
  const data = await jiraFetch<{ values: JiraSprint[] }>(
    config,
    `/rest/agile/1.0/board/${boardId}/sprint?state=active`
  );
  return data.values[0] ?? null;
}

export async function getSprintIssues(config: JiraConfig, sprintId: number): Promise<JiraIssue[]> {
  const data = await jiraFetch<{ issues: JiraIssue[] }>(
    config,
    `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=200`
  );
  return data.issues;
}

export async function testConnection(config: JiraConfig): Promise<boolean> {
  await jiraFetch<unknown>(config, '/rest/api/3/myself');
  return true;
}
