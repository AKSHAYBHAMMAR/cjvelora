'use client';

import React from 'react';

const STEPS = [
  {
    step: 'Step 01',
    num: 1,
    title: 'Choose Design',
    desc: 'Select from our catalog or share bespoke custom specifications.',
  },
  {
    step: 'Step 02',
    num: 2,
    title: 'Hand Crochet',
    desc: 'Artisans spend 8–15 hours looping premium cotton thread into shape.',
  },
  {
    step: 'Step 03',
    num: 3,
    title: 'Quality Check',
    desc: 'Strict stitch count verification, seam tension & knot strength audit.',
  },
  {
    step: 'Step 04',
    num: 4,
    title: 'Premium Packaging',
    desc: 'Wrapped in branded tissue, dried floral accent & personalized card.',
  },
  {
    step: 'Step 05',
    num: 5,
    title: 'Delivered to You',
    desc: 'Dispatched via express air delivery with real-time tracking.',
    isGold: true,
  },
];

export default function CraftProcess() {
  return (
    <section
      id="process"
      className="py-24 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto bg-warm-white/70 rounded-3xl my-12"
    >
      <div className="text-center max-w-3xl mx-auto mb-20 space-y-3">
        <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent block font-medium">
          Step-by-step Artistry
        </span>
        <h2 className="font-serif text-3xl md:text-5xl font-semibold text-charcoal tracking-tight">
          Our Crafting Process
        </h2>
        <p className="font-serif italic text-lg md:text-xl text-olive-accent font-normal">
          From raw organic thread selection to your doorstep
        </p>
      </div>

      {/* 5-Step Horizontal Timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 relative">
        {STEPS.map((s, idx) => (
          <div
            key={idx}
            className="glass-card p-6 rounded-3xl flex flex-col items-center text-center space-y-4 bg-white/80"
          >
            <span className="font-tech text-xs text-soft-gold uppercase tracking-widest font-semibold">
              {s.step}
            </span>

            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-serif text-lg font-bold shadow-md ${
                s.isGold
                  ? 'bg-soft-gold text-navy'
                  : 'bg-navy text-ivory'
              }`}
            >
              {s.num}
            </div>

            <h3 className="font-serif text-lg font-semibold text-charcoal">
              {s.title}
            </h3>

            <p className="font-sans text-xs text-charcoal/70 leading-relaxed">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
