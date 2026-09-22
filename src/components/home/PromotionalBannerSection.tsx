'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Tag } from 'lucide-react';
import { PromotionalBanner } from '@/types/content';
import { isOfferActive, getCollectionRoute } from '@/lib/offers';

interface PromotionalBannerSectionProps {
  banners?: PromotionalBanner[];
}

export default function PromotionalBannerSection({ banners }: PromotionalBannerSectionProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Filter active banners using the unified offer activation logic
  const activeBanners = banners.filter((b) => isOfferActive(b));

  if (activeBanners.length === 0) {
    return null;
  }

  return (
    <section className="py-6 sm:py-10 px-3.5 sm:px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto">
      <div className="space-y-6">
        {activeBanners.map((banner) => {
          const targetRoute =
            getCollectionRoute(banner.collectionSlug, banner.collectionName) ||
            banner.ctaLink ||
            '/#shop';
          const buttonText = banner.ctaText || 'EXPLORE COLLECTION →';
          const badgeText = banner.badge || 'Limited Atelier Edition';
          const discountVal = banner.discountValue ? Number(banner.discountValue) : 0;

          return (
            <div
              key={banner.id}
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#121518] to-[#1E232A] text-ivory border border-white/10 shadow-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                {/* Left Column: Copy & Action */}
                <div className="md:col-span-7 p-6 sm:p-10 lg:p-14 space-y-4 sm:space-y-6 z-10">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-soft-gold/15 border border-soft-gold/30 text-soft-gold font-tech text-[10px] uppercase tracking-[0.25em] font-semibold">
                      <Tag className="w-3 h-3" />
                      <span>{badgeText}</span>
                    </div>

                    {discountVal > 0 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-soft-gold text-charcoal font-tech text-[11px] uppercase tracking-[0.2em] font-bold shadow-md animate-pulse">
                        <Sparkles className="w-3 h-3 text-charcoal fill-charcoal" />
                        <span>{discountVal}% OFF</span>
                      </span>
                    )}

                    {banner.collectionName && (
                      <span className="font-tech text-[10px] text-ivory/60 uppercase tracking-widest px-2 py-0.5 border border-white/10 rounded-md">
                        {banner.collectionName}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-snug">
                    {banner.title}
                  </h3>

                  {banner.description && (
                    <p className="font-sans text-xs sm:text-sm lg:text-base text-ivory/70 leading-relaxed font-light max-w-xl">
                      {banner.description}
                    </p>
                  )}

                  <div className="pt-2">
                    <Link
                      href={targetRoute}
                      className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-soft-gold hover:bg-white text-charcoal font-sans text-xs uppercase tracking-widest font-bold shadow-luxury transition-all duration-300 group"
                    >
                      <span>{buttonText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Right Column: Hero Visual Asset */}
                {banner.imageUrl && (
                  <div className="md:col-span-5 h-56 sm:h-72 md:h-full min-h-[260px] relative overflow-hidden">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121518] via-transparent to-transparent hidden md:block" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

