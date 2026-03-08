import { create } from 'zustand';

interface ProgressState {
  completedModules: string[];
  completedChapters: number[];
  quizScores: Record<number, number>;
  currentModuleIndex: number;

  completeModule: (moduleId: string) => void;
  completeChapter: (chapterId: number) => void;
  setQuizScore: (chapterId: number, score: number) => void;
  setCurrentModuleIndex: (index: number) => void;
  reset: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  completedModules: [],
  completedChapters: [],
  quizScores: {},
  currentModuleIndex: 0,

  completeModule: (moduleId) => set((s) => ({
    completedModules: [...s.completedModules, moduleId],
  })),
  completeChapter: (chapterId) => set((s) => ({
    completedChapters: [...s.completedChapters, chapterId],
  })),
  setQuizScore: (chapterId, score) => set((s) => ({
    quizScores: { ...s.quizScores, [chapterId]: score },
  })),
  setCurrentModuleIndex: (index) => set({ currentModuleIndex: index }),
  reset: () => set({
    completedModules: [],
    completedChapters: [],
    quizScores: {},
    currentModuleIndex: 0,
  }),
}));
