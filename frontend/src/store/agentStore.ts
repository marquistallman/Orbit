/**
 * Zustand store for AI Agent state management
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AgentTask {
  id: string;
  task: string;
  response: string;
  toolUsed: string | null;
  toolResult: string | null;
  status: string | null;
  createdAt: Date;
  error: string | null;
}

interface AgentState {
  // State
  tasks: AgentTask[];
  currentTaskId: string | null;
  isLoading: boolean;
  error: string | null;
  availableTools: Record<string, { description: string; endpoint: string }> | null;

  // Actions
  addTask(task: AgentTask): void;
  updateTask(id: string, updates: Partial<AgentTask>): void;
  setCurrentTaskId(id: string | null): void;
  setLoading(isLoading: boolean): void;
  setError(error: string | null): void;
  setAvailableTools(tools: Record<string, { description: string; endpoint: string }>): void;
  clearTasks(): void;
  getCurrentTask(): AgentTask | undefined;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      // Initial state
      tasks: [],
      currentTaskId: null,
      isLoading: false,
      error: null,
      availableTools: null,

      // Actions
      addTask: (task) => {
        set((state) => ({
          tasks: [task, ...state.tasks],
          currentTaskId: task.id,
        }));
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }));
      },

      setCurrentTaskId: (id) => {
        set({ currentTaskId: id });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      setAvailableTools: (tools) => {
        set({ availableTools: tools });
      },

      clearTasks: () => {
        set({ tasks: [], currentTaskId: null });
      },

      getCurrentTask: () => {
        const state = get();
        if (!state.currentTaskId) return undefined;
        return state.tasks.find((task) => task.id === state.currentTaskId);
      },
    }),
    {
      name: "agent-storage", // localStorage key
      partialize: (state) => ({
        tasks: state.tasks,
        availableTools: state.availableTools,
      }), // Only persist tasks and tools, not UI state
    }
  )
);
