export type ConversationState = 'exploring' | 'narrowing' | 'confirming' | 'confirmed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SuggestedGoal {
  title: string;
  description: string;
}

export interface DetectedStartingPoint {
  familiar_concepts: string[];
  level: string;
}

export interface ChatResponse {
  reply: string;
  conversation_state: ConversationState;
  suggested_goal: SuggestedGoal | null;
  detected_starting_point: DetectedStartingPoint | null;
}
