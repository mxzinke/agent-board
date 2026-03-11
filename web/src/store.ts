import { create } from 'zustand';
import { api } from './api';
import type { User, Board, Goal } from './types';

interface AppState {
  user: User | null;
  token: string | null;
  boards: Board[];
  currentBoard: Board | null;
  goals: Goal[];
  selectedGoal: Goal | null;
  loading: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;

  fetchBoards: () => Promise<void>;
  setCurrentBoard: (board: Board | null) => void;
  fetchGoals: (boardId: string) => Promise<void>;
  setSelectedGoal: (goal: Goal | null) => void;

  // Load data from URL on initial page load
  loadFromPath: (path: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem('agent-board-token'),
  boards: [],
  currentBoard: null,
  goals: [],
  selectedGoal: null,
  loading: false,

  setAuth: (user, token) => {
    localStorage.setItem('agent-board-token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('agent-board-token');
    set({ user: null, token: null, boards: [], currentBoard: null, goals: [], selectedGoal: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('agent-board-token');
    if (!token) return;
    try {
      const user = await api.me();
      set({ user, token });
    } catch {
      localStorage.removeItem('agent-board-token');
      set({ user: null, token: null });
    }
  },

  fetchBoards: async () => {
    const boards = await api.listBoards();
    set({ boards });
  },

  setCurrentBoard: (board) => set({ currentBoard: board }),

  fetchGoals: async (boardId) => {
    const goals = await api.listGoals(boardId);
    set({ goals });
  },

  setSelectedGoal: (goal) => set({ selectedGoal: goal }),

  loadFromPath: async (path) => {
    // Parse URL and load appropriate data
    const boardMatch = path.match(/^\/b\/([^/]+)$/);
    const goalMatch = path.match(/^\/b\/([^/]+)\/([^/]+)$/);

    if (goalMatch) {
      const [, boardId, goalId] = goalMatch;
      try {
        const board = await api.getBoard(boardId);
        set({ currentBoard: board });
        await get().fetchGoals(boardId);
        const goal = await api.getGoal(boardId, goalId);
        set({ selectedGoal: goal });
      } catch {
        // If data can't be loaded, fall back to board list
        window.history.replaceState({}, '', '/');
      }
    } else if (boardMatch) {
      const [, boardId] = boardMatch;
      try {
        const board = await api.getBoard(boardId);
        set({ currentBoard: board });
        await get().fetchGoals(boardId);
      } catch {
        window.history.replaceState({}, '', '/');
      }
    }
  },
}));
