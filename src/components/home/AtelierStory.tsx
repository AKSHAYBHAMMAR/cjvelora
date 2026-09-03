'use client';

import React from 'react';
import { Sparkles, HeartHandshake, ShieldCheck } from 'lucide-react';

export default function AtelierStory() {
  return (
    <section id="about" className="py-24 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-soft-gold" />
            <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent font-medium">
              The Atelier Journey
            </span>
          </div>

          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-charcoal leading-tight tracking-tight">
            The Story Behind<br />
            <span className="italic text-olive-accent font-normal">VELORA</span>
          </h2>

          <p className="font-sans text-base text-charcoal/80 leading-relaxed font-light">
            Founded on the unwavering belief that handmade goods possess a soul that automated machines can never replicate, <strong className="font-medium text-charcoal">VELORA</strong> bridges traditional crochet heritage with sleek modern luxury aesthetics.
          </p>

          <p className="font-sans text-base text-charcoal/80 leading-relaxed font-light">
            From hand-selecting 100% natural organic cotton yarn to spending over 12 hours perfecting a single tapestry, our artisan workshop infuses warmth, elegance, and intentionality into every stitch.
          </p>

          {/* 3 Key Atelier Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-charcoal/10">
            <div>
              <span className="font-serif text-3xl font-bold text-navy block">100%</span>
              <span className="font-tech text-[10px] uppercase text-olive-accent tracking-wider font-semibold">
                Handmade
              </span>
            </div>
            <div>
              <span className="font-serif text-3xl font-bold text-navy block">12+</span>
              <span className="font-tech text-[10px] uppercase text-olive-accent tracking-wider font-semibold">
                Hours / Piece
              </span>
            </div>
            <div>
              <span className="font-serif text-3xl font-bold text-navy block">Zero</span>
              <span className="font-tech text-[10px] uppercase text-olive-accent tracking-wider font-semibold">
                Plastic Waste
              </span>
            </div>
          </div>
        </div>

        {/* Right Bento Showcase (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Main Artisan Photo (Left / Large) */}
          <div className="glass-card rounded-3xl p-3 h-80 sm:h-96 overflow-hidden">
            <img
              src="/images/story/story-main.png"
              alt="Crochet Artisan Hands"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          {/* Stacked Bento Blocks */}
          <div className="flex flex-col gap-6">
            
            {/* Heritage Guarantee Card */}
            <div className="glass-card rounded-3xl p-8 flex flex-col justify-center shadow-xl">
              <span className="font-tech text-[10px] uppercase tracking-widest text-navy mb-2 font-semibold">
                Heritage Guarantee
              </span>
              <h3 className="font-serif text-2xl font-semibold mb-2 text-charcoal">
                Crafted to Last
              </h3>
              <p className="font-sans text-xs text-charcoal/80 leading-relaxed">
                Each piece is reinforced with double-loop locking knots and washed with organic botanical scents before dispatch.
              </p>
            </div>

            {/* Detailed Macro Texture (Right / Bottom) */}
            <div className="glass-card rounded-3xl p-3 h-48 overflow-hidden">
              <img
                src="/images/story/story-secondary.jpg"
                alt="Detailed Crochet Yarn Texture"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
