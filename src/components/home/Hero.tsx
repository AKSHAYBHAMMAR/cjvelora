'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

interface HeroProps {
  videoSrc?: string;
}

export default function Hero({
  videoSrc = '/videos/velora-hero.mp4',
}: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure muted video plays automatically in all browsers
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log('Video autoplay prevented or not supported:', err);
      });
    }
  }, []);

  return (
    <section
      id="hero"
      className="relative w-full min-h-[92vh] flex items-center pt-28 pb-16 overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row items-center justify-between w-full px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto gap-10 lg:gap-14">
        
        {/* Left Column: Brand Message & CTAs (~45%) */}
        <div className="w-full lg:w-5/12 flex flex-col justify-center z-10 space-y-6 pt-4 lg:pt-0">

          {/* Luxury Editorial Headline */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.12] text-charcoal tracking-tight">
            Made by Hand.<br />
            <span className="italic font-normal text-olive-accent">
              Meant to Be Loved.
            </span>
          </h1>

          {/* Supporting Philosophy */}
          <p className="font-sans text-base lg:text-lg text-charcoal/80 font-light leading-relaxed max-w-xl">
            Step into the serene universe of <strong className="font-medium text-charcoal">VELORA</strong>. 
            Thoughtfully handcrafted crochet pieces designed to bring warmth, character, and tactile magic into everyday life.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="#collections"
              className="bg-navy text-ivory font-sans text-xs uppercase tracking-widest px-8 py-4 rounded-full hover:bg-soft-gold hover:text-navy transition-all duration-300 shadow-luxury flex items-center gap-3 group"
            >
              <span>Shop Crochet</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="#about"
              className="glass-panel text-charcoal border border-charcoal/20 font-sans text-xs uppercase tracking-widest px-8 py-4 rounded-full hover:bg-white hover:border-soft-gold transition-all duration-300"
            >
              Our Story
            </Link>
          </div>

          {/* Micro Trust Indicators */}
          <div className="pt-6 border-t border-charcoal/10 flex items-center gap-6 text-xs text-charcoal/70">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-navy">100%</span>
              <span className="font-tech text-[10px] uppercase tracking-wider text-olive-accent">
                Organic Cotton
              </span>
            </div>
            <div className="h-4 w-px bg-charcoal/15" />
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-navy">Zero</span>
              <span className="font-tech text-[10px] uppercase tracking-wider text-olive-accent">
                Factory Machines
              </span>
            </div>
            <div className="h-4 w-px bg-charcoal/15" />
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-navy">Global</span>
              <span className="font-tech text-[10px] uppercase tracking-wider text-olive-accent">
                Express Delivery
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Hero Video Frame (~55%) */}
        <div className="w-full lg:w-7/12 h-[50vh] sm:h-[62vh] lg:h-[74vh] relative flex items-center justify-center">
          <div className="w-full h-full glass-card rounded-3xl overflow-hidden relative shadow-2xl border border-white/90">
            
            {/* Main Autoplaying Hero Video */}
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover rounded-3xl"
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Subtle Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent pointer-events-none rounded-3xl" />

            {/* Floating Atelier Hallmark Badge */}
            <div className="absolute bottom-6 right-6 glass-panel px-5 py-3.5 rounded-2xl border border-white/80 flex items-center gap-3.5 shadow-lg backdrop-blur-md">
              <div className="w-10 h-10 rounded-full bg-soft-gold/25 flex items-center justify-center text-soft-gold shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-tech text-[10px] uppercase tracking-widest text-olive-dark block font-semibold">
                  Handcrafted Excellence
                </span>
                <span className="font-serif text-sm text-charcoal font-medium">
                  100% Pure Organic Crochet
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
