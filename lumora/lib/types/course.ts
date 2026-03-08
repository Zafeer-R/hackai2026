export interface YouTubeContent {
  video_id: string;
  url: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  views: number;
  likes: number;
  dislikes: number;
  score: number;
  start_seconds: number;
}

export interface ArticleContent {
  title: string;
  url: string;
  source: string;
  summary: string;
  estimated_read_time: string;
}

export interface MemeContent {
  image_b64: string;
  prompt_used: string;
}

export interface SongContent {
  audio_b64: string;
  lyrics: string;
  duration_seconds: number;
}

export interface CourseQuizQuestion {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  question: string;
  options: string[] | null;
  answer: string;
  explanation: string;
}

export interface ChapterContent {
  title: string;
  summary: string;
  key_concepts: string[];
  youtube: YouTubeContent | null;
  article: ArticleContent | null;
  meme: MemeContent | null;
  song: SongContent | null;
  quiz: CourseQuizQuestion[];
  learn_more: string[];
}
