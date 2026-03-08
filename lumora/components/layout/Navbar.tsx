'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Route, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProgressStore } from '@/lib/store/useProgressStore';
import { useSessionStore } from '@/lib/store/useSessionStore';

export function Navbar() {
  const pathname = usePathname();
  const roadmap = useSessionStore((s) => s.roadmap);
  const completedChapters = useProgressStore((s) => s.completedChapters);

  const totalChapters = roadmap?.chapters.length ?? 0;
  const progress = totalChapters > 0 ? (completedChapters.length / totalChapters) * 100 : 0;

  // Don't show navbar on landing/auth/welcome pages
  if (pathname === '/' || pathname === '/auth' || pathname === '/welcome') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image src="/starlightlogo.png" alt="Lumora" width={36} height={36} />
        </Link>

        <div className="flex items-center gap-4">
          {roadmap && pathname !== '/roadmap' && (
            <Link
              href="/roadmap"
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              <Route className="w-4 h-4" />
              <span>Roadmap</span>
            </Link>
          )}

          {totalChapters > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-cyan rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="hidden md:inline text-xs text-text-dim">
                {completedChapters.length}/{totalChapters}
              </span>
            </div>
          )}

          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-bg-elevated border border-white/8 flex items-center justify-center text-text-dim hover:text-text-primary hover:border-white/15 transition-colors"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
