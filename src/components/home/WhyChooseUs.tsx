'use client';

import React from 'react';
import {
  HandMetal,
  Leaf,
  Heart,
  Recycle,
  Palette,
  Gift,
  Globe2,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: HandMetal,
    title: '100% Handmade',
    desc: 'No automated machines or mass factories. Every knot is crafted with patience by master artisans.',
    color: 'text-soft-gold bg-soft-gold/15',
  },
  {
    icon: Leaf,
    title: 'Premium Cotton Yarn',
    desc: 'Hypoallergenic, ultra-soft natural cotton threads dyed with non-toxic botanical colors.',
    color: 'text-olive-accent bg-olive-accent/15',
  },
  {
    icon: Heart,
    title: 'Made With Love',
    desc: 'Carefully finished with hand-embroidered brand signatures and protective blessings.',
    color: 'text-soft-gold bg-soft-gold/15',
  },
  {
    icon: Recycle,
    title: 'Eco Friendly',
    desc: 'Sustainable practices, biodegradable threads, and zero single-use plastic packaging.',
    color: 'text-olive-accent bg-olive-accent/15',
  },
  {
    icon: Palette,
    title: 'Custom Orders',
    desc: 'Tailored colors, custom dimensions, and personalized initials woven upon request.',
    color: 'text-soft-gold bg-soft-gold/15',
  },
  {
    icon: Gift,
    title: 'Gift Ready Packaging',
    desc: 'Arrives wrapped in luxury linen ribbon, dried lavender sprig, and personalized card.',
    color: 'text-olive-accent bg-olive-accent/15',
  },
  {
    icon: Globe2,
    title: 'Worldwide Express Shipping',
    desc: 'Tracked air shipping in protective organic cotton dustbags directly to your doorstep globally.',
    color: 'text-navy bg-navy/10',
    spanTwo: true,
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-24 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent block font-medium">
          Uncompromising Quality
        </span>
        <h2 className="font-serif text-3xl md:text-5xl font-semibold text-charcoal tracking-tight">
          Why Choose VELORA
        </h2>
      </div>

      {/* 7 Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`glass-card p-8 rounded-3xl flex flex-col space-y-4 border border-white bg-white/80 ${
                item.spanTwo ? 'lg:col-span-2' : ''
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color}`}
              >
                <Icon className="w-7 h-7 stroke-[1.75]" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-charcoal">
                {item.title}
              </h3>
              <p className="font-sans text-xs text-charcoal/70 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

    </section>
  );
}
