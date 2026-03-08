export interface Chapter {
  id: number;
  title: string;
  summary: string;
  estimated_minutes: number;
  accent_color: string;
}

export interface Roadmap {
  roadmap_id: string;
  title: string;
  chapters: Chapter[];
}
