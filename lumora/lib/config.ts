// ⚙️ LUMORA CONFIGURATION — SINGLE SOURCE OF TRUTH

// ─── Environment & Secrets ───────────────────────────────
export const env = {
  llmProvider: (process.env.NEXT_PUBLIC_LLM_PROVIDER ?? 'mock') as 'openai' | 'anthropic' | 'mock',
  openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? '',
  anthropicApiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? '',
  whisperApiUrl: process.env.NEXT_PUBLIC_WHISPER_API_URL ?? '',
  whisperApiKey: process.env.NEXT_PUBLIC_WHISPER_API_KEY ?? '',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  mongodbUri: process.env.NEXT_PUBLIC_MONGODB_URI ?? '',
} as const;

// ─── Feature Flags ───────────────────────────────────────
function isSampleRun(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('lumora_sample_run') === 'true';
}

export const flags = {
  get useMocks() {
    return process.env.NEXT_PUBLIC_USE_MOCKS === 'true' || isSampleRun();
  },
  enableVoice: process.env.NEXT_PUBLIC_ENABLE_VOICE === 'true',
  enableSaveList: process.env.NEXT_PUBLIC_ENABLE_SAVE_LIST === 'true',
} as const;

// ─── API Endpoints ───────────────────────────────────────
const base = env.apiBaseUrl;
export const endpoints = {
  chat: {
    sendMessage: `${base}/api/chat/message`,
    voiceSocket: `${base}/api/chat/voice`,
  },
  roadmap: {
    generate: `${base}/api/roadmap/generate`,
    adjust: `${base}/api/roadmap/adjust`,
  },
  modules: {
    getByChapter: (chapterId: string | number) => `${base}/api/modules/${chapterId}`,
    getQuiz: (chapterId: string | number) => `${base}/api/modules/${chapterId}/quiz`,
  },
  results: {
    furtherStudy: `${base}/api/results/further-study`,
    saveList: `${base}/api/results/save-list`,
  },
} as const;

// ─── Mock Delays (ms) ───────────────────────────────────
export const mockDelays = {
  chatReply: 800,
  roadmapGenerate: 1500,
  roadmapAdjust: 1200,
  moduleLoad: 600,
  quizSubmit: 400,
  furtherStudy: 1000,
} as const;

// ─── LLM System Prompts ─────────────────────────────────
export const prompts = {
  chatSystemPrompt: `You are Lumora, a friendly and curious learning assistant. Your job is to have a conversation with the user to figure out exactly what they want to learn. You have access to their skill profile (provided in context). Ask clarifying questions to narrow from a broad interest to a specific, teachable topic. Don't go too broad ("machine learning") or too narrow without agreement. When you've identified the topic, present it clearly for confirmation. Be warm, encouraging, and concise.`,
  roadmapSystemPrompt: `Generate a learning roadmap as a JSON array of 5-7 chapters. Each chapter should logically build on the previous one, starting from the user's current knowledge level and ending at a clear understanding of the target topic. Keep chapter titles short and engaging.`,
  moduleSystemPrompt: `Generate learning module content as JSON. Select the most appropriate module type for the content. Use MCQ (type 1) for knowledge checks, Video (type 2) for visual explanations, Fill-in-the-blank (type 3) for active recall, and Text (type 4) for explanations. Keep language clear and accessible.`,
} as const;

// ─── Tunable Parameters ──────────────────────────────────
export const params = {
  maxChapters: 7,
  minChapters: 4,
  maxModulesPerChapter: 6,
  quizPassThreshold: 0.7,
  hesitationThresholdMs: 15000,
  skipThresholdMs: 3000,
  mockResponseCycleCount: 5,
} as const;
