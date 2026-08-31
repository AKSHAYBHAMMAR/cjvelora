'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { COLLECTIONS } from '@/data/mock-data';

export default function CollectionsGrid() {
  return (
    <section id="collections" className="py-24 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
        <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent block font-medium">
          Handmade Catalog
        </span>
        <h2 className="font-serif text-3xl md:text-5xl font-semibold text-charcoal tracking-tight">
          Our Crochet Collections
        </h2>
        <p className="font-serif italic text-lg md:text-xl text-olive-accent font-normal max-w-2xl mx-auto">
          Every handcrafted creation is thoughtfully designed to bring warmth, elegance, and timeless beauty into everyday living.
        </p>
      </div>

      {/* Grid of 8 Collection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {COLLECTIONS.map((col) => {
          const isBespoke = col.id === 'c8';
          return (
            <div
              key={col.id}
              className={`glass-card rounded-3xl overflow-hidden group flex flex-col h-full ${
                isBespoke
                  ? 'border-2 border-dashed border-soft-gold/50 bg-navy text-ivory'
                  : 'bg-white/80'
              }`}
            >
              {/* Image Canvas */}
              <div
                className={`h-60 relative overflow-hidden ${
                  isBespoke ? 'bg-navy-light' : 'bg-beige/60'
                }`}
              >
                <img
                  src={col.image}
                  alt={col.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {isBespoke && (
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
                )}
                {col.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="font-tech text-[10px] uppercase tracking-wider bg-soft-gold text-navy font-semibold px-3 py-1 rounded-full shadow-sm">
                      {col.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div
                className={`p-6 sm:p-7 flex flex-col flex-grow justify-between ${
                  isBespoke ? 'bg-navy text-ivory' : ''
                }`}
              >
                <div>
                  <span
                    className={`font-tech text-[10px] uppercase tracking-[0.2em] block mb-1.5 ${
                      isBespoke ? 'text-soft-gold' : 'text-olive-accent'
                    }`}
                  >
                    {col.subtitle}
                  </span>
                  <h3
                    className={`font-serif text-2xl font-semibold mb-2.5 ${
                      isBespoke ? 'text-ivory' : 'text-charcoal'
                    }`}
                  >
                    {col.title}
                  </h3>
                  <p
                    className={`font-sans text-xs leading-relaxed ${
                      isBespoke ? 'text-ivory/70' : 'text-charcoal/70'
                    }`}
                  >
                    {col.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-charcoal/10">
                  <Link
                    href="#featured"
                    className={`inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest font-semibold transition-all group/link ${
                      isBespoke
                        ? 'text-soft-gold hover:text-white'
                        : 'text-navy hover:text-soft-gold'
                    }`}
                  >
                    <span>{isBespoke ? 'Request Custom Commission' : 'Explore Collection'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
