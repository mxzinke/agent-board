import type { User, Board, Goal, Subtask, Comment, Attachment, Webhook, InviteToken, Passkey, ApiKey } from './types';

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
    const errorMsg = typeof body.error === 'string'
      ? body.error
      : body.error?.issues?.[0]?.message || res.statusText;
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  getCaptcha: (mode: 'human' | 'agent') =>
    request<{ token: string; svg?: string; challenge?: string }>('/auth/captcha', { method: 'POST', body: JSON.stringify({ mode }) }),
  register: (data: { username: string; password: string; displayName?: string; isAgent?: boolean; captchaToken: string; captchaAnswer: string }) =>
    request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  checkUsername: (username: string) =>
    request<{ exists: boolean; hasPasskeys: boolean }>('/auth/check-username', { method: 'POST', body: JSON.stringify({ username }) }),
  me: () => request<User>('/auth/me'),
  createApiKey: (label?: string) =>
    request<{ id: string; key: string; keyPrefix: string }>('/auth/api-keys', { method: 'POST', body: JSON.stringify({ label }) }),
  listApiKeys: () => request<ApiKey[]>('/auth/api-keys'),
  deleteApiKey: (id: string) =>
    request<{ ok: boolean }>(`/auth/api-keys/${id}`, { method: 'DELETE' }),

  // Profile & Password
  updateProfile: (data: { displayName: string }) =>
    request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Passkeys
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WebAuthn options have complex types managed by @simplewebauthn
  passkeyRegisterOptions: () =>
    request<any>('/auth/passkey/register-options', { method: 'POST' }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WebAuthn credential types
  passkeyRegisterVerify: (data: { credential: any; name?: string }) =>
    request<{ id: string }>('/auth/passkey/register-verify', { method: 'POST', body: JSON.stringify(data) }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WebAuthn options have complex types managed by @simplewebauthn
  passkeyLoginOptions: (username?: string) =>
    request<{ options: any; storeKey: string }>('/auth/passkey/login-options', { method: 'POST', body: JSON.stringify({ username }) }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WebAuthn credential types
  passkeyLoginVerify: (data: { storeKey: string; credential: any }) =>
    request<{ user: User; token: string }>('/auth/passkey/login-verify', { method: 'POST', body: JSON.stringify(data) }),
  listPasskeys: () => request<Passkey[]>('/auth/passkeys'),
  deletePasskey: (id: string) =>
    request<{ ok: boolean }>(`/auth/passkeys/${id}`, { method: 'DELETE' }),

  // Boards
  listBoards: () => request<Board[]>('/boards'),
  createBoard: (data: { name: string; description?: string }) =>
    request<Board>('/boards', { method: 'POST', body: JSON.stringify(data) }),
  getBoard: (id: string) => request<Board>(`/boards/${id}`),
  updateBoard: (id: string, data: { name?: string; description?: string }) =>
    request<Board>(`/boards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBoard: (id: string) =>
    request<{ ok: boolean }>(`/boards/${id}`, { method: 'DELETE' }),
  toggleFavorite: (boardId: string, isFavorite: boolean) =>
    request<{ ok: boolean; isFavorite: boolean }>(`/boards/${boardId}/favorite`, { method: 'PATCH', body: JSON.stringify({ isFavorite }) }),
  reorderBoards: (orderedIds: string[]) =>
    request<{ ok: boolean }>('/boards/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) }),
  createInvite: (boardId: string, data?: { maxUses?: number; expiresInHours?: number }) =>
    request<InviteToken>(`/boards/${boardId}/invite`, { method: 'POST', body: JSON.stringify(data || {}) }),
  joinBoard: (token: string) =>
    request<{ boardId: string; role: string }>('/boards/join', { method: 'POST', body: JSON.stringify({ token }) }),
  removeMember: (boardId: string, userId: string) =>
    request<{ ok: boolean }>(`/boards/${boardId}/members/${userId}`, { method: 'DELETE' }),
  updateMemberRole: (boardId: string, userId: string, role: string) =>
    request<{ boardId: string; userId: string; role: string }>(`/boards/${boardId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  // Goals
  listGoals: (boardId: string, params?: { status?: string; archived?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.archived) q.set('archived', 'true');
    const qs = q.toString();
    return request<Goal[]>(`/boards/${boardId}/goals${qs ? `?${qs}` : ''}`);
  },
  createGoal: (boardId: string, data: { title: string; description?: string; acceptanceCriteria?: string; status?: string }) =>
    request<Goal>(`/boards/${boardId}/goals`, { method: 'POST', body: JSON.stringify(data) }),
  getGoal: (boardId: string, goalId: string) =>
    request<Goal>(`/boards/${boardId}/goals/${goalId}`),
  updateGoal: (boardId: string, goalId: string, data: Partial<Pick<Goal, 'title' | 'description' | 'acceptanceCriteria' | 'status' | 'position' | 'assigneeId' | 'archived'>>) =>
    request<Goal>(`/boards/${boardId}/goals/${goalId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoal: (boardId: string, goalId: string) =>
    request<{ ok: boolean }>(`/boards/${boardId}/goals/${goalId}`, { method: 'DELETE' }),
  reorderGoals: (boardId: string, status: string, orderedIds: string[]) =>
    request<{ ok: boolean }>(`/boards/${boardId}/goals/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds, status }) }),

  // Subtasks
  listSubtasks: (goalId: string) => request<Subtask[]>(`/goals/${goalId}/subtasks`),
  createSubtask: (goalId: string, title: string) =>
    request<Subtask>(`/goals/${goalId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateSubtask: (goalId: string, subtaskId: string, data: { title?: string; done?: boolean; position?: number }) =>
    request<Subtask>(`/goals/${goalId}/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSubtask: (goalId: string, subtaskId: string) =>
    request<{ ok: boolean }>(`/goals/${goalId}/subtasks/${subtaskId}`, { method: 'DELETE' }),
  reorderSubtasks: (goalId: string, orderedIds: string[]) =>
    request<{ ok: boolean }>(`/goals/${goalId}/subtasks/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds }) }),

  // Comments
  listComments: (goalId: string) => request<Comment[]>(`/goals/${goalId}/comments`),
  createComment: (goalId: string, body: string) =>
    request<Comment>(`/goals/${goalId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteComment: (goalId: string, commentId: string) =>
    request<{ ok: boolean }>(`/goals/${goalId}/comments/${commentId}`, { method: 'DELETE' }),

  // Attachments
  listAttachments: (goalId: string) =>
    request<Attachment[]>(`/goals/${goalId}/attachments`),
  uploadAttachment: async (goalId: string, file: File): Promise<Attachment> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/goals/${goalId}/attachments`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const errorMsg = typeof body.error === 'string'
        ? body.error
        : body.error?.issues?.[0]?.message || res.statusText;
      throw new Error(errorMsg);
    }
    return res.json();
  },
  downloadAttachment: (id: string) => `${BASE}/attachments/${id}/download`,
  deleteAttachment: (id: string) =>
    request<{ ok: boolean }>(`/attachments/${id}`, { method: 'DELETE' }),
};
