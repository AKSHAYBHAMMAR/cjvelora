'use client';

import React from 'react';
import { CategoryItem } from '@/types';
import { Sparkles, Check } from 'lucide-react';

interface CategoryCardProps {
  category: CategoryItem;
  isActive: boolean;
  onSelect: (categoryName: string) => void;
}

export default function CategoryCard({
  category,
  isActive,
  onSelect,
}: CategoryCardProps) {
  return (
    <button
      onClick={() => onSelect(category.name)}
      className={`group relative w-full text-left rounded-3xl overflow-hidden glass-card transition-all duration-500 cursor-pointer flex flex-col justify-between ${
        isActive
          ? 'ring-2 ring-soft-gold shadow-luxury-hover border-soft-gold/60 -translate-y-1.5'
          : 'border-white/80 hover:border-soft-gold/40'
      }`}
      aria-pressed={isActive}
      aria-label={`Filter by ${category.name}`}
    >
      {/* Visual Image Container */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-beige/60">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />

        {/* Top Active & Count Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="font-tech text-[10px] uppercase tracking-wider bg-white/90 text-navy backdrop-blur-md px-2.5 py-1 rounded-full font-semibold shadow-sm">
            {category.itemCount} Items
          </span>

          {isActive && (
            <span className="flex items-center gap-1 font-tech text-[10px] uppercase tracking-wider bg-soft-gold text-navy px-2.5 py-1 rounded-full font-bold shadow-md animate-scale-in">
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Selected</span>
            </span>
          )}
        </div>

        {/* Bottom Category Name Overlay */}
        <div className="absolute bottom-3 left-4 right-4 text-ivory">
          <span className="font-tech text-[9px] uppercase tracking-[0.25em] text-champagne/90 block -mb-0.5">
            {category.subtitle}
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-white group-hover:text-champagne transition-colors">
            {category.name}
          </h3>
        </div>
      </div>

      {/* Subtle Bottom Action Strip */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between text-xs font-sans font-medium transition-colors ${
          isActive
            ? 'bg-navy text-soft-gold'
            : 'bg-white/70 text-charcoal/75 group-hover:text-navy group-hover:bg-white'
        }`}
      >
        <span className="font-tech text-[10px] uppercase tracking-widest">
          {isActive ? 'Active Category' : 'Browse Category'}
        </span>
        <span
          className={`transform transition-transform duration-300 font-serif text-sm ${
            isActive ? 'translate-x-0 font-bold' : 'group-hover:translate-x-1'
          }`}
        >
          {isActive ? '●' : '→'}
        </span>
      </div>
    </button>
  );
}
