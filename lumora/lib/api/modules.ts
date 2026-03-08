import { flags, endpoints, mockDelays } from '@/lib/config';
import type { ChapterModules, Quiz } from '@/lib/types/module';
import chapter1 from '@/mocks/modules/chapter-1.json';
import chapter2 from '@/mocks/modules/chapter-2.json';
import chapter3 from '@/mocks/modules/chapter-3.json';
import chapter4 from '@/mocks/modules/chapter-4.json';
import chapter5 from '@/mocks/modules/chapter-5.json';

const mockModules: Record<number, ChapterModules> = {
  1: chapter1 as unknown as ChapterModules,
  2: chapter2 as unknown as ChapterModules,
  3: chapter3 as unknown as ChapterModules,
  4: chapter4 as unknown as ChapterModules,
  5: chapter5 as unknown as ChapterModules,
};

export async function getChapterModules(chapterId: number): Promise<ChapterModules> {
  if (flags.useMocks) {
    await new Promise(r => setTimeout(r, mockDelays.moduleLoad));
    const data = mockModules[chapterId];
    if (data) return data;
    // Fallback to chapter 1 for chapters without mock data
    return { ...mockModules[1], chapter_id: chapterId };
  }

  const res = await fetch(endpoints.modules.getByChapter(chapterId));
  return res.json();
}

export async function getChapterQuiz(chapterId: number): Promise<Quiz> {
  if (flags.useMocks) {
    await new Promise(r => setTimeout(r, mockDelays.moduleLoad));
    return {
      quiz_type: 1,
      questions: [
        {
          id: `quiz_${chapterId}_q1`,
          question: "Which of the following best describes the concept covered in this chapter?",
          options: [
            "The correct understanding based on what we learned",
            "A common misconception about this topic",
            "An unrelated concept from a different field",
            "An oversimplification that misses key details"
          ],
          correct_index: 0
        }
      ]
    };
  }

  const res = await fetch(endpoints.modules.getQuiz(chapterId));
  return res.json();
}
