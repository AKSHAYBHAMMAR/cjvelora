'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQS } from '@/data/mock-data';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-12 sm:py-24 px-3.5 sm:px-6 md:px-12 lg:px-20 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="text-center mb-10 sm:mb-16 space-y-2 sm:space-y-3">
        <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent block font-medium">
          Common Inquiries
        </span>
        <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-semibold text-charcoal tracking-tight">
          Frequently Asked Questions
        </h2>
      </div>

      {/* Accordion List */}
      <div className="space-y-3 sm:space-y-4">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="glass-card rounded-2xl p-4 sm:p-6 overflow-hidden bg-white/80 border border-white transition-all duration-300"
            >
              <button
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between text-left font-serif text-base sm:text-lg font-semibold text-charcoal hover:text-soft-gold transition-colors cursor-pointer"
              >
                <span className="pr-3 sm:pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-soft-gold shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="pt-3 sm:pt-4 font-sans text-xs text-charcoal/70 leading-relaxed border-t border-charcoal/10 mt-3 sm:mt-4 animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
}
