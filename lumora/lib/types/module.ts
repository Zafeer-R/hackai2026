export interface MCQContent {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface VideoContent {
  title: string;
  video_url: string;
  duration_seconds: number;
}

export interface FillBlankContent {
  sentence: string;
  blanks: string[];
  explanation: string;
}

export interface TextContent {
  title: string;
  body: string;
  image_url: string | null;
}

export interface Module {
  id: string;
  type: 1 | 2 | 3 | 4;
  content: MCQContent | VideoContent | FillBlankContent | TextContent;
}

export interface ChapterModules {
  chapter_id: number;
  modules: Module[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface Quiz {
  quiz_type: 1 | 2 | 3;
  questions: QuizQuestion[];
}
