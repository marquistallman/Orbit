import { create } from 'zustand'

interface AgentState {
  isRunning: boolean
  currentTask: string | null
  progress: number
  setRunning: (running: boolean) => void
  setTask: (task: string | null) => void
  setProgress: (progress: number) => void
}

export const useAgentStore = create<AgentState>((set) => ({
  isRunning: false,
  currentTask: null,
  progress: 0,
  setRunning: (running) => set({ isRunning: running }),
  setTask: (task) => set({ currentTask: task }),
  setProgress: (progress) => set({ progress }),
}))
