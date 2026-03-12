// Shared TypeScript interfaces for the agent-board frontend

export interface User {
  id: string;
  username: string;
  displayName: string;
  isAgent: boolean;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members?: BoardMember[];
  role?: string; // present in list response (joined via boardMembers)
  isFavorite?: boolean;
  position?: number;
}

export interface BoardMember {
  userId: string;
  role: string;
  joinedAt: string;
  username: string;
  displayName: string | null;
  isAgent: boolean;
}

export interface Goal {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  position: number;
  assigneeId: string | null;
  archived?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  acceptanceCriteria?: AcceptanceCriterion[];
  comments?: Comment[];
}

export interface AcceptanceCriterion {
  id: string;
  goalId: string;
  text: string;
  met: boolean;
  position: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  goalId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorIsAgent: boolean;
}

export interface Attachment {
  id: string;
  goalId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  size: number;
  storageBackend: string;
  storageKey: string | null;
  createdAt: string;
}

export interface Webhook {
  id: string;
  boardId: string;
  url: string;
  events: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  secret?: string; // only returned on creation
}

export interface InviteToken {
  id: string;
  boardId: string;
  token: string;
  createdBy: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  createdAt: string;
  url?: string;
}

export interface Passkey {
  id: string;
  credentialId: string;
  deviceType: string | null;
  backedUp: boolean;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}
