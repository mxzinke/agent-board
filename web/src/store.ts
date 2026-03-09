import { create } from 'zustand';
import { api } from './api';

interface User {
  id: string;
  username: string;
  displayName: string;
  isAgent: boolean;
}

type View = 'boards' | 'settings';

interface AppState {
  user: User | null;
  token: string | null;
  boards: any[];
  currentBoard: any | null;
  goals: any[];
  selectedGoal: any | null;
  loading: boolean;
  view: View;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;

  fetchBoards: () => Promise<void>;
  setCurrentBoard: (board: any) => void;
  fetchGoals: (boardId: string) => Promise<void>;
  setSelectedGoal: (goal: any | null) => void;
  setView: (view: View) => void;
}

export const useStore = create<AppState>((set, _get) => ({
  user: null,
  token: localStorage.getItem('agent-board-token'),
  boards: [],
  currentBoard: null,
  goals: [],
  selectedGoal: null,
  loading: false,
  view: 'boards' as View,

  setAuth: (user, token) => {
    localStorage.setItem('agent-board-token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('agent-board-token');
    set({ user: null, token: null, boards: [], currentBoard: null, goals: [], selectedGoal: null, view: 'boards' as View });
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
  setView: (view) => set({ view, selectedGoal: null, currentBoard: null }),
}));
