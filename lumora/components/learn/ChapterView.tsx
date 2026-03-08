'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, ExternalLink, BookOpen, Music, ImageIcon,
  CheckCircle, XCircle, ChevronRight, Lightbulb,
} from 'lucide-react';
import type { ChapterContent, CourseQuizQuestion } from '@/lib/types/course';

interface ChapterViewProps {
  content: ChapterContent;
  onComplete: () => void;
}

export function ChapterView({ content, onComplete }: ChapterViewProps) {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h2 className="text-xl md:text-2xl font-bold text-white mb-3">{content.title}</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">{content.summary}</p>
        {content.key_concepts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {content.key_concepts.map((concept) => (
              <span
                key={concept}
                className="px-2.5 py-1 rounded-md bg-accent-cyan/10 text-accent-cyan text-xs font-medium border border-accent-cyan/15"
              >
                {concept}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* YouTube */}
      {content.youtube && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-surface border border-white/8 rounded-lg overflow-hidden"
        >
          <div className="aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${content.youtube.video_id}${content.youtube.start_seconds ? `?start=${content.youtube.start_seconds}` : ''}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={content.youtube.title}
            />
          </div>
          <div className="px-4 py-3">
            <p className="text-white text-sm font-medium">{content.youtube.title}</p>
            <p className="text-text-dim text-xs">{content.youtube.channel} &middot; {(content.youtube.views / 1000).toFixed(0)}K views</p>
          </div>
        </motion.div>
      )}

      {/* Article */}
      {content.article && (
        <motion.a
          href={content.article.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="block bg-bg-surface border border-white/8 border-l-4 border-l-accent-blue rounded-lg p-5 hover:border-white/15 transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4 text-accent-blue" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">{content.article.title}</h3>
                <p className="text-text-dim text-xs mb-2">{content.article.source} &middot; {content.article.estimated_read_time}</p>
                <p className="text-text-secondary text-xs leading-relaxed">{content.article.summary}</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-text-dim group-hover:text-accent-blue shrink-0 transition-colors" />
          </div>
        </motion.a>
      )}

      {/* Meme */}
      {content.meme && content.meme.image_b64 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-bg-surface border border-white/8 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-accent-purple" />
            <span className="text-text-secondary text-xs font-medium">Meme Break</span>
          </div>
          <img
            src={`data:image/png;base64,${content.meme.image_b64}`}
            alt="Learning meme"
            className="rounded-lg max-w-sm mx-auto w-full"
          />
        </motion.div>
      )}

      {/* Song */}
      {content.song && content.song.audio_b64 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-bg-surface border border-white/8 border-l-4 border-l-accent-green rounded-lg p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-accent-green" />
            <span className="text-white text-sm font-medium">Listen & Learn</span>
          </div>
          <audio
            controls
            className="w-full mb-3 h-10"
            src={`data:audio/mp3;base64,${content.song.audio_b64}`}
          />
          {content.song.lyrics && (
            <p className="text-text-dim text-xs italic leading-relaxed whitespace-pre-line">
              {content.song.lyrics}
            </p>
          )}
        </motion.div>
      )}

      {/* Quiz */}
      {content.quiz && content.quiz.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent-orange" />
            Knowledge Check
          </h3>
          <div className="space-y-4">
            {content.quiz.map((q) => (
              <QuizCard key={q.id} question={q} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Learn More */}
      {content.learn_more && content.learn_more.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-bg-surface border border-white/8 rounded-lg p-4"
        >
          <p className="text-text-dim text-xs font-medium mb-2">Explore next</p>
          <div className="flex flex-wrap gap-2">
            {content.learn_more.map((topic) => (
              <span
                key={topic}
                className="px-2.5 py-1 rounded-md bg-bg-elevated text-text-secondary text-xs border border-white/5"
              >
                {topic}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Complete button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-4"
      >
        <button
          onClick={onComplete}
          className="w-full py-3 rounded-xl bg-accent-green text-white font-medium text-sm hover:bg-accent-green/90 transition-colors flex items-center justify-center gap-2"
        >
          Complete Chapter
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

// --- Quiz Card (inline) ---

function QuizCard({ question }: { question: CourseQuizQuestion }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const isCorrect = selected === question.answer;

  const handleSelect = (option: string) => {
    if (revealed) return;
    setSelected(option);
  };

  const handleSubmit = () => {
    if (!selected) return;
    setRevealed(true);
  };

  // True/False questions
  const options = question.type === 'true_false'
    ? ['true', 'false']
    : question.options || [];

  return (
    <div className="bg-bg-surface border border-white/8 rounded-lg p-4">
      <p className="text-white text-sm font-medium mb-3">{question.question}</p>

      <div className="space-y-2 mb-3">
        {options.map((opt) => {
          let optClass = 'bg-bg-elevated border border-white/8 hover:border-white/15';
          if (revealed && opt === question.answer) {
            optClass = 'bg-accent-green/10 border border-accent-green/30';
          } else if (revealed && opt === selected && !isCorrect) {
            optClass = 'bg-accent-red/10 border border-accent-red/30';
          } else if (selected === opt && !revealed) {
            optClass = 'bg-accent-cyan/10 border border-accent-cyan/30';
          }

          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={revealed}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${optClass} ${
                revealed ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={revealed && opt === question.answer ? 'text-accent-green' : 'text-text-secondary'}>
                  {opt}
                </span>
                {revealed && opt === question.answer && <CheckCircle className="w-4 h-4 text-accent-green" />}
                {revealed && opt === selected && !isCorrect && opt !== question.answer && <XCircle className="w-4 h-4 text-accent-red" />}
              </div>
            </button>
          );
        })}
      </div>

      {!revealed && selected && (
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded-lg bg-accent-cyan text-white text-xs font-medium hover:bg-accent-cyan/90 transition-colors"
        >
          Check Answer
        </button>
      )}

      {revealed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 px-3 py-2 rounded-lg bg-bg-elevated"
        >
          <p className="text-text-dim text-xs leading-relaxed">{question.explanation}</p>
        </motion.div>
      )}
    </div>
  );
}
