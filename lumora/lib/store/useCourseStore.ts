import { create } from 'zustand';
import type { ChapterContent } from '@/lib/types/course';

interface CourseState {
  courseId: string | null;
  // Keyed by flat chapter ID (1-indexed, matching our roadmap chapter IDs)
  chapters: Record<number, ChapterContent>;
  readyChapterIds: number[];
  failedChapterIds: number[];
  isGenerating: boolean;
  isComplete: boolean;

  // The API roadmap structure, used to map module_idx/chapter_idx to flat IDs
  apiRoadmap: Array<{ title: string; chapters: Array<{ title: string }> }> | null;

  setCourseId: (id: string) => void;
  setApiRoadmap: (roadmap: Array<{ title: string; chapters: Array<{ title: string }> }>) => void;
  addChapter: (flatId: number, content: ChapterContent) => void;
  markFailed: (flatId: number) => void;
  setGenerating: (v: boolean) => void;
  markComplete: () => void;
  reset: () => void;

  // Helper: convert module_idx + chapter_idx to flat chapter ID
  getFlatChapterId: (moduleIdx: number, chapterIdx: number) => number;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courseId: null,
  chapters: {},
  readyChapterIds: [],
  failedChapterIds: [],
  isGenerating: false,
  isComplete: false,
  apiRoadmap: null,

  setCourseId: (id) => set({ courseId: id }),

  setApiRoadmap: (roadmap) => set({ apiRoadmap: roadmap }),

  addChapter: (flatId, content) => set((state) => ({
    chapters: { ...state.chapters, [flatId]: content },
    readyChapterIds: [...state.readyChapterIds, flatId],
  })),

  markFailed: (flatId) => set((state) => ({
    failedChapterIds: [...state.failedChapterIds, flatId],
  })),

  setGenerating: (v) => set({ isGenerating: v }),

  markComplete: () => set({ isComplete: true, isGenerating: false }),

  reset: () => set({
    courseId: null,
    chapters: {},
    readyChapterIds: [],
    failedChapterIds: [],
    isGenerating: false,
    isComplete: false,
    apiRoadmap: null,
  }),

  getFlatChapterId: (moduleIdx, chapterIdx) => {
    const roadmap = get().apiRoadmap;
    if (!roadmap) return 1;

    let flatId = 1;
    for (let m = 0; m < roadmap.length; m++) {
      for (let c = 0; c < roadmap[m].chapters.length; c++) {
        if (m === moduleIdx && c === chapterIdx) return flatId;
        flatId++;
      }
    }
    return flatId;
  },
}));
