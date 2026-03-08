import { create } from 'zustand';

interface WrongAnswer {
  moduleId: string;
  questionId: string;
  selectedIndex: number;
}

interface ActionLogState {
  wrongAnswers: WrongAnswer[];
  moduleTimestamps: Record<string, { enter: number; exit?: number }>;
  skippedModules: string[];
  hesitations: string[];

  logWrongAnswer: (moduleId: string, questionId: string, selectedIndex: number) => void;
  enterModule: (moduleId: string) => void;
  exitModule: (moduleId: string) => void;
  logSkip: (moduleId: string) => void;
  logHesitation: (moduleId: string) => void;
  reset: () => void;
}

export const useActionLogStore = create<ActionLogState>((set) => ({
  wrongAnswers: [],
  moduleTimestamps: {},
  skippedModules: [],
  hesitations: [],

  logWrongAnswer: (moduleId, questionId, selectedIndex) => set((s) => ({
    wrongAnswers: [...s.wrongAnswers, { moduleId, questionId, selectedIndex }],
  })),
  enterModule: (moduleId) => set((s) => ({
    moduleTimestamps: { ...s.moduleTimestamps, [moduleId]: { enter: Date.now() } },
  })),
  exitModule: (moduleId) => set((s) => ({
    moduleTimestamps: {
      ...s.moduleTimestamps,
      [moduleId]: { ...s.moduleTimestamps[moduleId], exit: Date.now() },
    },
  })),
  logSkip: (moduleId) => set((s) => ({
    skippedModules: [...s.skippedModules, moduleId],
  })),
  logHesitation: (moduleId) => set((s) => ({
    hesitations: [...s.hesitations, moduleId],
  })),
  reset: () => set({
    wrongAnswers: [],
    moduleTimestamps: {},
    skippedModules: [],
    hesitations: [],
  }),
}));
