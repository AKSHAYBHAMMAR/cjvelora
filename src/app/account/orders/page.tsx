'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Calendar,
  CreditCard,
  ChevronRight,
  ShoppingBag,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

export default function CustomerOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomerOrders() {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(user);

        // Fetch orders belonging strictly to authenticated customer
        const { data: ordersData, error: ordersErr } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersErr) {
          throw new Error(ordersErr.message);
        }

        setOrders(ordersData || []);
      } catch (err: any) {
        console.error('Error fetching customer orders:', err);
        setError(err.message || 'Failed to retrieve your order history.');
      } finally {
        setLoading(false);
      }
    }

    loadCustomerOrders();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0e14] text-white pt-32 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white/[0.02] border border-white/10 p-8 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-[#d4af37] mx-auto mb-4" />
          <h1 className="text-2xl font-serif mb-2">Access Your Orders</h1>
          <p className="text-sm text-white/60 mb-6">
            Please sign in with your customer account to view your past orders and status.
          </p>
          <Link
            href="/admin/login?next=/account/orders"
            className="inline-block px-8 py-3 bg-[#d4af37] text-black text-xs uppercase tracking-widest font-semibold rounded-lg hover:bg-[#e5c158] transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <Link
            href="/"
            className="flex items-center text-xs tracking-widest uppercase text-white/60 hover:text-[#d4af37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Boutique
          </Link>
          <span className="text-xs text-white/40 tracking-wider">
            Client: {user.email}
          </span>
        </div>

        <div className="mb-10">
          <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-medium">
            Account Portfolio
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif tracking-wide text-white mt-2">
            My Orders
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Review your acquisition records, tracking, and purchase order history.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl p-8">
            <Package className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h2 className="text-xl font-serif text-white/80 mb-2">No Acquisitions Found</h2>
            <p className="text-sm text-white/50 mb-6 max-w-sm mx-auto">
              You have not placed any orders yet. Discover timeless pieces crafted to perfection.
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-[#d4af37] text-black text-xs uppercase tracking-widest font-semibold rounded-lg hover:bg-[#c29e2e] transition-all"
            >
              Explore Boutique
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.order_number}`}
                className="block group bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-[#d4af37]/40 rounded-2xl p-6 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-serif text-white font-medium group-hover:text-[#d4af37] transition-colors">
                        {order.order_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          order.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : order.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/50 mt-2">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-[#d4af37]" />
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center">
                        <CreditCard className="w-3.5 h-3.5 mr-1 text-[#d4af37]" />
                        Payment: <span className="text-white/80 ml-1 capitalize">{order.payment_status}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-white/40 block">Order Total</span>
                      <span className="text-base font-bold text-[#d4af37]">
                        ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[#d4af37] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
