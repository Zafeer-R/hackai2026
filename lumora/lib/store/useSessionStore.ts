import { create } from 'zustand';
import type { UserProfile } from '@/lib/types/user';
import type { Roadmap } from '@/lib/types/roadmap';
import type { SuggestedGoal, DetectedStartingPoint } from '@/lib/types/chat';

interface SessionState {
  sessionId: string | null;
  userProfile: UserProfile | null;
  inputMode: 'voice' | 'text' | null;
  roadmap: Roadmap | null;
  startingPoint: DetectedStartingPoint | null;
  endGoal: SuggestedGoal | null;
  currentChapterId: number | null;
  savedStudyList: boolean;

  setSessionId: (id: string) => void;
  setUserProfile: (profile: UserProfile) => void;
  setInputMode: (mode: 'voice' | 'text') => void;
  setRoadmap: (roadmap: Roadmap) => void;
  setStartingPoint: (sp: DetectedStartingPoint) => void;
  setEndGoal: (goal: SuggestedGoal) => void;
  setCurrentChapterId: (id: number) => void;
  setSavedStudyList: (saved: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  userProfile: null,
  inputMode: null,
  roadmap: null,
  startingPoint: null,
  endGoal: null,
  currentChapterId: null,
  savedStudyList: false,

  setSessionId: (id) => set({ sessionId: id }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setRoadmap: (roadmap) => set({ roadmap }),
  setStartingPoint: (sp) => set({ startingPoint: sp }),
  setEndGoal: (goal) => set({ endGoal: goal }),
  setCurrentChapterId: (id) => set({ currentChapterId: id }),
  setSavedStudyList: (saved) => set({ savedStudyList: saved }),
  reset: () => set({
    sessionId: null,
    userProfile: null,
    inputMode: null,
    roadmap: null,
    startingPoint: null,
    endGoal: null,
    currentChapterId: null,
    savedStudyList: false,
  }),
}));
