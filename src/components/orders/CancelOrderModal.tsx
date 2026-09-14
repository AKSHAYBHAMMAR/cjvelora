'use client';

import React from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

interface CancelOrderModalProps {
  isOpen: boolean;
  orderNumber: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isCancelling: boolean;
  error?: string | null;
}

export default function CancelOrderModal({
  isOpen,
  orderNumber,
  onClose,
  onConfirm,
  isCancelling,
  error,
}: CancelOrderModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full max-w-md bg-[#0f141c] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isCancelling}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Heading */}
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-serif tracking-wide text-white">
              Cancel this order?
            </h3>
            <p className="text-xs font-mono text-[#d4af37] mt-0.5">
              {orderNumber}
            </p>
          </div>
        </div>

        {/* Modal Description */}
        <div className="text-xs text-white/70 leading-relaxed bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <p>
            This order has not been paid yet. Are you sure you want to cancel it?
          </p>
          <p className="mt-1.5 text-white/40 text-[11px]">
            Once cancelled, reserved inventory items will be returned to the boutique catalog.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse xs:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="w-full xs:w-auto px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 text-xs font-medium uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer text-center"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-rose-500/90 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-rose-500/20 cursor-pointer text-center"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Cancel Order</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
