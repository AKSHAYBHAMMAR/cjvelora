'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { AnnouncementBarContent } from '@/types/content';
import { DEFAULT_ANNOUNCEMENT } from '@/lib/content';

interface AnnouncementBarProps {
  initialContent?: AnnouncementBarContent;
}

export default function AnnouncementBar({ initialContent }: AnnouncementBarProps) {
  const [content, setContent] = useState<AnnouncementBarContent>(
    initialContent || DEFAULT_ANNOUNCEMENT
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // Check if dismissed in this browser session
  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('velora_announcement_dismissed');
      if (isDismissed === 'true') {
        setDismissed(true);
      }
    } catch {
      // Ignore sessionStorage issues
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('velora_announcement_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  if (!content.enabled || dismissed || !content.message) {
    return null;
  }

  // Date scheduling check
  const now = new Date();
  if (content.startDate && new Date(content.startDate) > now) {
    return null;
  }
  if (content.endDate && new Date(content.endDate) < now) {
    return null;
  }

  return (
    <aside aria-label="Announcement" className="relative z-50 bg-[#121518] text-ivory border-b border-white/10 text-xs py-2.5 px-4 sm:px-8 transition-all">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        
        {/* Left spacer for centered balance */}
        <div className="hidden sm:block w-6" />

        {/* Central Announcement Copy */}
        <div className="flex-1 flex items-center justify-center gap-2 text-center flex-wrap sm:flex-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-soft-gold flex-shrink-0 animate-pulse" />
          <span className="font-sans text-[11px] sm:text-xs tracking-wide text-ivory/90 font-light">
            {content.message}
          </span>

          {content.ctaText && content.ctaLink && (
            <Link
              href={content.ctaLink}
              className="inline-flex items-center gap-1 font-tech text-[10px] sm:text-[11px] uppercase tracking-wider text-soft-gold hover:text-white font-semibold underline underline-offset-4 decoration-soft-gold/50 ml-1.5 transition-colors"
            >
              <span>{content.ctaText}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss Announcement"
          className="p-1 text-ivory/50 hover:text-white rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
