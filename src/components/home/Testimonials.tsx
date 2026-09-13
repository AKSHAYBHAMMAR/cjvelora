'use client';

import React from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import { TESTIMONIALS } from '@/data/mock-data';

export default function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 py-12 sm:py-24 px-3.5 sm:px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 space-y-2 sm:space-y-3">
        <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent block font-medium">
          Client Expressions
        </span>
        <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-semibold text-charcoal tracking-tight">
          Loved Across the Globe
        </h2>
      </div>

      {/* Testimonials 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.id}
            className="glass-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between space-y-4 sm:space-y-6 bg-white/80 border border-white"
          >
            <div className="space-y-3 sm:space-y-4">
              {/* Star Rating */}
              <div className="flex text-soft-gold gap-1">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-soft-gold text-soft-gold" />
                ))}
              </div>

              {/* Quote */}
              <p className="font-serif text-sm sm:text-base italic text-charcoal/85 leading-relaxed font-light">
                &ldquo;{t.content}&rdquo;
              </p>
            </div>

            {/* Client Signature */}
            <div className="flex items-center gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-charcoal/10">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-soft-gold/20 flex items-center justify-center font-serif text-xs sm:font-bold text-navy shrink-0">
                {t.initials}
              </div>
              <div>
                <h4 className="font-serif text-xs sm:text-sm font-semibold text-charcoal tracking-wide">
                  {t.name.toUpperCase()}
                </h4>
                <span className="font-tech text-[9px] sm:text-[10px] uppercase text-olive-accent tracking-wider block">
                  {t.role} • {t.location.toUpperCase()}
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>

    </section>
  );
}
