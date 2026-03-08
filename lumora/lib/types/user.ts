export interface SkillEntry {
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number; // 0-1
}

export interface UserProfile {
  name: string;
  background: string;
  skills: SkillEntry[];
  interests: string[];
  linkedin?: string;
  github?: string;
}
