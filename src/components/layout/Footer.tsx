'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send, Sparkles, Check } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail('');
      }, 3500);
    }
  };

  return (
    <footer className="w-full bg-charcoal text-ivory pt-20 pb-12 border-t border-soft-gold/20">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-ivory/10">
        
        {/* Brand Column (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <Link href="#hero" className="inline-block">
            <span className="font-serif text-3xl font-bold text-ivory tracking-tight block">
              VELORA
            </span>
            <span className="font-tech text-[9px] uppercase tracking-[0.35em] text-soft-gold">
              Handmade Luxury Atelier
            </span>
          </Link>
          <p className="font-serif italic text-base text-ivory/70 max-w-sm font-light">
            Luxury handmade crochet brand bridging traditional heirloom artisan techniques with soft modern aesthetics.
          </p>
        </div>

        {/* Navigation Quick Links (3 cols) */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="font-tech text-xs uppercase tracking-widest text-soft-gold font-semibold">
            Navigation
          </h4>
          <ul className="space-y-2.5 font-sans text-xs text-ivory/70">
            <li>
              <Link href="#hero" className="hover:text-soft-gold transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="#categories" className="hover:text-soft-gold transition-colors">
                Shop by Category
              </Link>
            </li>
            <li>
              <Link href="#most-loved" className="hover:text-soft-gold transition-colors">
                Most Loved by You ❤️
              </Link>
            </li>
            <li>
              <Link href="#about" className="hover:text-soft-gold transition-colors">
                Atelier Story
              </Link>
            </li>
            <li>
              <Link href="#process" className="hover:text-soft-gold transition-colors">
                Crafting Process
              </Link>
            </li>
            <li>
              <Link href="#contact" className="hover:text-soft-gold transition-colors">
                Contact Concierge
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter (4 cols) */}
        <div className="md:col-span-4 space-y-4">
          <h4 className="font-tech text-xs uppercase tracking-widest text-soft-gold font-semibold">
            Atelier Journal
          </h4>
          <p className="font-sans text-xs text-ivory/70 leading-relaxed">
            Subscribe to receive private previews of seasonal crochet drops, limited editions, and bespoke commissions.
          </p>

          {subscribed ? (
            <div className="flex items-center gap-2 text-soft-gold font-sans text-xs pt-2">
              <Check className="w-4 h-4" />
              <span>Thank you for subscribing to our journal.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2 pt-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-white/10 border border-ivory/20 rounded-xl px-4 py-2.5 font-sans text-xs text-ivory placeholder-ivory/40 focus:outline-none focus:border-soft-gold flex-grow transition-all"
              />
              <button
                type="submit"
                className="bg-soft-gold text-navy font-sans text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-white font-semibold transition-colors cursor-pointer"
              >
                Join
              </button>
            </form>
          )}
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-8 flex flex-col sm:flex-row items-center justify-between font-tech text-[10px] text-ivory/50 uppercase tracking-widest gap-4">
        <p>© 2026 VELORA. All Rights Reserved. Crafted with passion.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-ivory transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-ivory transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-ivory transition-colors">Shipping & Care Guide</a>
        </div>
      </div>
    </footer>
  );
}
