'use client';

import React, { useState } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: 'Custom Order Commission',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: '',
        email: '',
        inquiryType: 'Custom Order Commission',
        message: '',
      });
    }, 4000);
  };

  return (
    <section id="contact" className="py-24 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent block font-medium">
            Get In Touch
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-charcoal tracking-tight">
            Connect With VELORA
          </h2>
          <p className="font-sans text-base text-charcoal/80 leading-relaxed font-light">
            Have questions about a bespoke custom crochet commission, personalized heirloom gifts, or wholesale boutique inquiries? Send us a message and our master artisan concierge will respond within 24 hours.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-soft-gold/20 flex items-center justify-center text-soft-gold shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="font-tech text-[10px] uppercase text-olive-accent tracking-wider block">
                  Email Atelier Concierge
                </span>
                <a
                  href="mailto:cjsvelora01@gmail.com"
                  className="font-sans text-sm font-medium text-charcoal hover:text-soft-gold transition-colors block"
                >
                  cjsvelora01@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form (7 cols) */}
        <div className="lg:col-span-7 glass-card p-8 md:p-12 rounded-3xl border border-white bg-white/80 shadow-luxury">
          {submitted ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-soft-gold/20 flex items-center justify-center text-soft-gold">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-charcoal">
                Message Received
              </h3>
              <p className="font-sans text-xs text-charcoal/70 max-w-md">
                Thank you for connecting with VELORA. Our master artisan concierge will review your inquiry and get back to you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="font-tech text-[10px] uppercase tracking-wider text-olive-accent block mb-2 font-medium">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Lady Eleanor"
                    className="w-full bg-white/80 border border-charcoal/15 rounded-xl px-4 py-3 font-sans text-sm text-charcoal focus:outline-none focus:border-soft-gold focus:ring-1 focus:ring-soft-gold transition-all"
                  />
                </div>
                <div>
                  <label className="font-tech text-[10px] uppercase tracking-wider text-olive-accent block mb-2 font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="eleanor@domain.com"
                    className="w-full bg-white/80 border border-charcoal/15 rounded-xl px-4 py-3 font-sans text-sm text-charcoal focus:outline-none focus:border-soft-gold focus:ring-1 focus:ring-soft-gold transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="font-tech text-[10px] uppercase tracking-wider text-olive-accent block mb-2 font-medium">
                  Inquiry Type
                </label>
                <select
                  value={formData.inquiryType}
                  onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                  className="w-full bg-white/80 border border-charcoal/15 rounded-xl px-4 py-3 font-sans text-sm text-charcoal focus:outline-none focus:border-soft-gold focus:ring-1 focus:ring-soft-gold transition-all"
                >
                  <option value="Custom Order Commission">Custom Order Commission</option>
                  <option value="General Product Question">General Product Question</option>
                  <option value="Wholesale & Boutique Partnership">Wholesale & Boutique Partnership</option>
                  <option value="Press & Media">Press & Media</option>
                </select>
              </div>

              <div>
                <label className="font-tech text-[10px] uppercase tracking-wider text-olive-accent block mb-2 font-medium">
                  Your Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your vision or question in detail..."
                  className="w-full bg-white/80 border border-charcoal/15 rounded-xl px-4 py-3 font-sans text-sm text-charcoal focus:outline-none focus:border-soft-gold focus:ring-1 focus:ring-soft-gold transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-navy text-ivory font-sans text-xs uppercase tracking-widest py-4 rounded-xl hover:bg-soft-gold hover:text-navy transition-all duration-300 shadow-md font-semibold cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Send Message to Atelier</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

      </div>
    </section>
  );
}
