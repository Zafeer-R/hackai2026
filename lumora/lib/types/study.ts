export interface StudyRecommendation {
  title: string;
  type: 'book' | 'article' | 'video' | 'course';
  reference: string;
  reason: string;
}

export interface ActionLog {
  wrong_answers: string[];
  low_confidence_topics: string[];
  total_time_minutes: number;
  quiz_scores: Record<string, number>;
}
