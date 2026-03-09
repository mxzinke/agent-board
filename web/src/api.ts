const BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('agent-board-token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data: { username: string; password: string; displayName?: string }) =>
    request<{ user: any; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    request<{ user: any; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/auth/me'),
  createApiKey: (label?: string) =>
    request<{ id: string; key: string; keyPrefix: string }>('/auth/api-keys', { method: 'POST', body: JSON.stringify({ label }) }),
  listApiKeys: () => request<any[]>('/auth/api-keys'),
  deleteApiKey: (id: string) =>
    request<{ ok: boolean }>(`/auth/api-keys/${id}`, { method: 'DELETE' }),

  // Boards
  listBoards: () => request<any[]>('/boards'),
  createBoard: (data: { name: string; description?: string }) =>
    request<any>('/boards', { method: 'POST', body: JSON.stringify(data) }),
  getBoard: (id: string) => request<any>(`/boards/${id}`),
  updateBoard: (id: string, data: { name?: string; description?: string }) =>
    request<any>(`/boards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBoard: (id: string) =>
    request<{ ok: boolean }>(`/boards/${id}`, { method: 'DELETE' }),
  createInvite: (boardId: string, data?: { maxUses?: number; expiresInHours?: number }) =>
    request<any>(`/boards/${boardId}/invite`, { method: 'POST', body: JSON.stringify(data || {}) }),
  joinBoard: (token: string) =>
    request<any>('/boards/join', { method: 'POST', body: JSON.stringify({ token }) }),

  // Goals
  listGoals: (boardId: string, status?: string) =>
    request<any[]>(`/boards/${boardId}/goals${status ? `?status=${status}` : ''}`),
  createGoal: (boardId: string, data: { title: string; description?: string; status?: string }) =>
    request<any>(`/boards/${boardId}/goals`, { method: 'POST', body: JSON.stringify(data) }),
  getGoal: (boardId: string, goalId: string) =>
    request<any>(`/boards/${boardId}/goals/${goalId}`),
  updateGoal: (boardId: string, goalId: string, data: any) =>
    request<any>(`/boards/${boardId}/goals/${goalId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoal: (boardId: string, goalId: string) =>
    request<{ ok: boolean }>(`/boards/${boardId}/goals/${goalId}`, { method: 'DELETE' }),

  // Subtasks
  listSubtasks: (goalId: string) => request<any[]>(`/goals/${goalId}/subtasks`),
  createSubtask: (goalId: string, title: string) =>
    request<any>(`/goals/${goalId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateSubtask: (goalId: string, subtaskId: string, data: { title?: string; done?: boolean }) =>
    request<any>(`/goals/${goalId}/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSubtask: (goalId: string, subtaskId: string) =>
    request<{ ok: boolean }>(`/goals/${goalId}/subtasks/${subtaskId}`, { method: 'DELETE' }),

  // Comments
  listComments: (goalId: string) => request<any[]>(`/goals/${goalId}/comments`),
  createComment: (goalId: string, body: string) =>
    request<any>(`/goals/${goalId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteComment: (goalId: string, commentId: string) =>
    request<{ ok: boolean }>(`/goals/${goalId}/comments/${commentId}`, { method: 'DELETE' }),
};
