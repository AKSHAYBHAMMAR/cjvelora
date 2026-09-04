'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Boxes,
  Layers,
  ClipboardList,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Database,
  TrendingUp,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#171B1F] to-[#121517] border border-soft-gold/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-soft-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-soft-gold/10 border border-soft-gold/30">
            <Sparkles className="w-3.5 h-3.5 text-soft-gold" />
            <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-soft-gold font-bold">
              Atelier Management
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            VELORA Atelier Dashboard
          </h1>
          <p className="font-sans text-xs sm:text-sm text-ivory/70 mt-2 max-w-2xl leading-relaxed">
            Welcome to the centralized management console. Manage handcrafted catalog creations,
            track artisan inventory, and monitor boutique sales operations.
          </p>
        </div>
      </div>

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Products Card */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Products
            </span>
            <div className="p-2.5 rounded-xl bg-soft-gold/10 text-soft-gold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-white mb-1">21</div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>Across 6 categories</span>
            <span className="text-emerald-400 font-tech">100% Active</span>
          </div>
        </div>

        {/* Categories Card */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Categories
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-white mb-1">6</div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>Curated Collections</span>
            <span className="text-blue-400 font-tech">Bags to Mats</span>
          </div>
        </div>

        {/* Inventory SKUs Card */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Tracked SKUs
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-white mb-1">21</div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>Threshold: 5 units</span>
            <span className="text-amber-400 font-tech">Initialized</span>
          </div>
        </div>

        {/* Orders Card */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Orders
            </span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-bold text-white mb-1">0</div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>Storefront Ready</span>
            <span className="text-purple-400 font-tech">Phase 3</span>
          </div>
        </div>
      </div>

      {/* System Status & Architecture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backend & Security Status */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#14171A] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-soft-gold" />
              <span>Backend Architecture Status</span>
            </h3>
            <span className="font-tech text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
              Supabase Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-tech text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Row Level Security (RLS)</span>
              </div>
              <p className="font-sans text-xs text-ivory/60 leading-relaxed">
                Categories, Products, and Inventory tables are enforced by PostgreSQL RLS policies.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-soft-gold font-tech text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Admin Role Verification</span>
              </div>
              <p className="font-sans text-xs text-ivory/60 leading-relaxed">
                Guarded by <code className="text-white bg-white/10 px-1 py-0.5 rounded">admin_roles</code> with Super Admin & Staff privileges.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-400 font-tech text-xs font-semibold uppercase tracking-wider">
                <PackageCheck className="w-4 h-4" />
                <span>Product Catalog Sync</span>
              </div>
              <p className="font-sans text-xs text-ivory/60 leading-relaxed">
                21 artisan crochet pieces connected with zero-downtime mock fallback.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-tech text-xs font-semibold uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Storage & Local Assets</span>
              </div>
              <p className="font-sans text-xs text-ivory/60 leading-relaxed">
                Original photography preserved in <code className="text-white bg-white/10 px-1 py-0.5 rounded">public/images/</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-white">Atelier Navigation</h3>
            <p className="font-sans text-xs text-ivory/60 leading-relaxed">
              Quick shortcuts to the future management modules:
            </p>

            <div className="space-y-2">
              <Link
                href="/admin"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-ivory transition-colors group"
              >
                <span>View Products Catalog (21)</span>
                <ArrowUpRight className="w-4 h-4 text-ivory/40 group-hover:text-soft-gold transition-colors" />
              </Link>
              <Link
                href="/admin"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-ivory transition-colors group"
              >
                <span>View Inventory Levels (21)</span>
                <ArrowUpRight className="w-4 h-4 text-ivory/40 group-hover:text-soft-gold transition-colors" />
              </Link>
              <Link
                href="/"
                target="_blank"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-soft-gold/10 hover:bg-soft-gold/20 text-xs text-soft-gold transition-colors group"
              >
                <span>Open Public Storefront</span>
                <ArrowUpRight className="w-4 h-4 text-soft-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-white/10 text-[11px] font-tech text-ivory/40 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Admin session authenticated via Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
