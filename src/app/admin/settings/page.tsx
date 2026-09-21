'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Store,
  Receipt,
  Boxes,
  Truck,
  CreditCard,
  Bell,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  KeyRound,
  ExternalLink,
  Sparkles,
  Server,
  Mail,
  Phone,
  MapPin,
  Globe,
  Share2,
  Megaphone,
  Clock,
  IndianRupee,
  Layers,
  AlertCircle,
  FileText,
  Sliders,
  Check,
  X,
  Loader2,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import {
  fetchAdminSettings,
  saveAdminSettingsSection,
  updateAdminPassword,
  validateStoreSettings,
  validateOrderSettings,
  validateInventorySettings,
  validateShippingSettings,
  validatePaymentSettings,
  validateNotificationSettings,
} from '@/lib/settings';
import {
  AllAppSettings,
  PaymentEnvStatus,
  SettingsSectionKey,
  OutOfStockBehavior,
} from '@/types/settings';
import { signOutAdmin } from '@/lib/auth';

type TabKey = 'store' | 'orders' | 'inventory' | 'shipping' | 'payments' | 'notifications' | 'security';

interface TabItem {
  id: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  isSensitive?: boolean;
}

const TABS: TabItem[] = [
  { id: 'store', label: 'Store Settings', icon: Store, description: 'Brand identity, localization & contact channels' },
  { id: 'orders', label: 'Order Settings', icon: Receipt, description: 'Order identifiers, checkout thresholds & taxes' },
  { id: 'inventory', label: 'Inventory Settings', icon: Boxes, description: 'Stock thresholds, reservations & audit policies' },
  { id: 'shipping', label: 'Shipping Settings', icon: Truck, description: 'Fulfillment tiers, freight fees & delivery estimates' },
  { id: 'payments', label: 'Payment Gateway', icon: CreditCard, description: 'Credentials status, COD & gateway enforcement', isSensitive: true },
  { id: 'notifications', label: 'Notification Settings', icon: Bell, description: 'Client dispatch notices & atelier restock alerts' },
  { id: 'security', label: 'Admin Profile & Security', icon: Shield, description: 'Security clearance, credentials & privileges' },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('store');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Settings Data & Env Status
  const [initialSettings, setInitialSettings] = useState<AllAppSettings | null>(null);
  const [formSettings, setFormSettings] = useState<AllAppSettings | null>(null);
  const [envStatus, setEnvStatus] = useState<PaymentEnvStatus | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'staff'>('staff');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Notifications / Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Tab switch confirmation modal
  const [pendingTabSwitch, setPendingTabSwitch] = useState<TabKey | null>(null);

  // Inline Validation Errors per Section
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Password Change Form State
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Load Settings from API
  const loadSettings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchAdminSettings();
      setInitialSettings(data.settings);
      setFormSettings(JSON.parse(JSON.stringify(data.settings)));
      setEnvStatus(data.envStatus);
      setAdminRole(data.adminRole);
      setAdminEmail(data.adminEmail || '');
      if (data.updatedAt) {
        setLastSavedTime(new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      setValidationErrors({});
    } catch (err: any) {
      console.error('Failed to load admin settings:', err);
      setToast({
        type: 'error',
        message: err?.message || 'Failed to load configuration settings from server.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Determine if a section has unsaved changes
  const isSectionDirty = useCallback(
    (sectionKey: SettingsSectionKey): boolean => {
      if (!initialSettings || !formSettings) return false;
      return JSON.stringify(initialSettings[sectionKey]) !== JSON.stringify(formSettings[sectionKey]);
    },
    [initialSettings, formSettings]
  );

  // Check if current active tab is dirty
  const isCurrentTabDirty = useMemo(() => {
    if (activeTab === 'security') return false;
    return isSectionDirty(activeTab as SettingsSectionKey);
  }, [activeTab, isSectionDirty]);

  // Check if any tab has unsaved changes
  const hasAnyDirtySection = useMemo(() => {
    if (!initialSettings || !formSettings) return false;
    const sections: SettingsSectionKey[] = ['store', 'orders', 'inventory', 'shipping', 'payments', 'notifications'];
    return sections.some((s) => isSectionDirty(s));
  }, [initialSettings, formSettings, isSectionDirty]);

  // Prevent accidental browser closure / reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyDirtySection) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your settings. Are you sure you want to exit?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyDirtySection]);

  // Tab change handler with dirty protection
  const handleTabChange = (newTab: TabKey) => {
    if (newTab === activeTab) return;
    if (isCurrentTabDirty) {
      setPendingTabSwitch(newTab);
      return;
    }
    setActiveTab(newTab);
    setValidationErrors({});
  };

  // Discard changes for current tab
  const handleDiscardCurrentTab = () => {
    if (!initialSettings || !formSettings || activeTab === 'security') return;
    const section = activeTab as SettingsSectionKey;
    setFormSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: JSON.parse(JSON.stringify(initialSettings[section])),
      };
    });
    setValidationErrors({});
    setPendingTabSwitch(null);
    setToast({
      type: 'info',
      message: `Discarded unsaved changes in ${TABS.find((t) => t.id === activeTab)?.label}.`,
    });
  };

  // Discard and proceed to pending tab
  const handleConfirmDiscardAndSwitch = () => {
    handleDiscardCurrentTab();
    if (pendingTabSwitch) {
      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
    }
  };

  // Validate current tab before saving
  const validateCurrentSection = (section: SettingsSectionKey): boolean => {
    if (!formSettings) return false;
    let errors: Record<string, string> = {};

    if (section === 'store') errors = validateStoreSettings(formSettings.store);
    else if (section === 'orders') errors = validateOrderSettings(formSettings.orders);
    else if (section === 'inventory') errors = validateInventorySettings(formSettings.inventory);
    else if (section === 'shipping') errors = validateShippingSettings(formSettings.shipping);
    else if (section === 'payments') errors = validatePaymentSettings(formSettings.payments);
    else if (section === 'notifications') errors = validateNotificationSettings(formSettings.notifications);

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save current active tab changes
  const handleSaveCurrentSection = async () => {
    if (!formSettings || activeTab === 'security') return;
    const section = activeTab as SettingsSectionKey;

    // Super admin check for sensitive sections
    if (section === 'payments' && adminRole !== 'super_admin') {
      setToast({
        type: 'error',
        message: 'Super Administrator clearance is required to modify payment configuration.',
      });
      return;
    }

    if (!validateCurrentSection(section)) {
      setToast({
        type: 'error',
        message: 'Please resolve the highlighted validation errors before saving.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await saveAdminSettingsSection(section, formSettings[section]);
      if (res.success) {
        // Update baseline initial settings
        setInitialSettings((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [section]: JSON.parse(JSON.stringify(res.data)),
          };
        });
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setValidationErrors({});
        setToast({
          type: 'success',
          message: `${TABS.find((t) => t.id === section)?.label} saved and deployed to Atelier.`,
        });

        // If there was a pending tab switch requested, proceed
        if (pendingTabSwitch) {
          setActiveTab(pendingTabSwitch);
          setPendingTabSwitch(null);
        }
      } else {
        throw new Error(res.error || 'Server rejected configuration update.');
      }
    } catch (err: any) {
      console.error('Error saving settings section:', err);
      setToast({
        type: 'error',
        message: err?.message || 'Failed to save configuration. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Password update handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please re-enter.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const res = await updateAdminPassword(newPassword);
      if (res.success) {
        setPasswordSuccess('Security credentials updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentAdminPassword('');
      } else {
        setPasswordError(res.error || 'Failed to update credentials.');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'An unexpected error occurred.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Helper updater for nested form state
  const updateField = <K extends SettingsSectionKey, F extends keyof AllAppSettings[K]>(
    section: K,
    field: F,
    value: AllAppSettings[K][F]
  ) => {
    setFormSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
  };

  // Auto-clear toasts
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-9 h-9 text-soft-gold animate-spin" />
        <div className="text-center">
          <p className="font-serif text-lg text-white">Loading Atelier Configuration</p>
          <p className="font-tech text-xs uppercase tracking-[0.25em] text-ivory/50 mt-1">
            Establishing Secure Administration Context
          </p>
        </div>
      </div>
    );
  }

  if (!formSettings) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl text-white">Configuration Unavailable</h2>
          <p className="text-sm text-ivory/60 max-w-md mx-auto">
            Unable to communicate with the administration backend. Please check network connectivity and verify
            database credentials.
          </p>
        </div>
        <button
          onClick={() => loadSettings()}
          className="px-5 py-2.5 rounded-xl bg-soft-gold text-charcoal font-semibold text-xs uppercase tracking-wider hover:bg-soft-gold/90 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-32">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-[#10241B]/95 border-emerald-500/40 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-[#2B1115]/95 border-rose-500/40 text-rose-200'
              : 'bg-[#1A1E24]/95 border-white/20 text-ivory'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-soft-gold flex-shrink-0" />}
          <p className="text-xs font-medium tracking-wide">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-white/50 hover:text-white rounded-lg transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white">
              Atelier Settings
            </h1>
            <span
              className={`font-tech text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                adminRole === 'super_admin'
                  ? 'bg-soft-gold/15 text-soft-gold border-soft-gold/30'
                  : 'bg-white/5 text-ivory/70 border-white/10'
              }`}
            >
              {adminRole === 'super_admin' ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-soft-gold" />
                  Super Admin
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 text-ivory/50" />
                  Staff Admin
                </>
              )}
            </span>
          </div>
          <p className="font-sans text-xs md:text-sm text-ivory/60 max-w-2xl">
            Configure global store parameters, logistics criteria, stock threshold automation, and gateway policies.
          </p>
        </div>

        {/* Global Controls & Sync indicator */}
        <div className="flex items-center gap-3">
          {lastSavedTime && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-tech text-ivory/40 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Synced {lastSavedTime}
            </div>
          )}

          <button
            onClick={() => loadSettings(true)}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/80 text-xs font-semibold tracking-wider flex items-center gap-2 border border-white/10 transition-colors disabled:opacity-50"
            title="Reload settings from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none border-b border-white/5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDirty = tab.id !== 'security' && isSectionDirty(tab.id as SettingsSectionKey);

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-sans text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all duration-200 relative ${
                isActive
                  ? 'bg-soft-gold text-charcoal shadow-luxury'
                  : 'bg-[#14171A] text-ivory/70 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-charcoal' : 'text-ivory/60'}`} />
              <span>{tab.label}</span>

              {/* Unsaved changes dot on tab */}
              {isDirty && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-charcoal' : 'bg-amber-400 animate-pulse'
                  }`}
                  title="Unsaved modifications"
                />
              )}

              {tab.isSensitive && adminRole !== 'super_admin' && (
                <Lock className="w-3 h-3 text-ivory/30 ml-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Header Context */}
      <div className="bg-[#14171A]/60 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-white">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          <p className="text-xs text-ivory/50 mt-0.5">
            {TABS.find((t) => t.id === activeTab)?.description}
          </p>
        </div>

        {activeTab !== 'security' && isCurrentTabDirty && (
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Unsaved changes in this section</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STORE SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Store Identity */}
            <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Store className="w-4 h-4 text-soft-gold" />
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Brand Identity
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Store Legal Name *
                </label>
                <input
                  type="text"
                  value={formSettings.store.storeName}
                  onChange={(e) => updateField('store', 'storeName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="VELORA Atelier"
                />
                {validationErrors.storeName && (
                  <p className="text-[11px] text-rose-400">{validationErrors.storeName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Brand Tagline / Atelier Subtitle
                </label>
                <input
                  type="text"
                  value={formSettings.store.tagline}
                  onChange={(e) => updateField('store', 'tagline', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="Luxury Handcrafted Crochet Heirloom Creations"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Currency Code *
                  </label>
                  <input
                    type="text"
                    value={formSettings.store.currencyCode}
                    onChange={(e) => updateField('store', 'currencyCode', e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors uppercase"
                    placeholder="INR"
                  />
                  {validationErrors.currencyCode && (
                    <p className="text-[11px] text-rose-400">{validationErrors.currencyCode}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Currency Symbol *
                  </label>
                  <input
                    type="text"
                    value={formSettings.store.currencySymbol}
                    onChange={(e) => updateField('store', 'currencySymbol', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                    placeholder="₹"
                  />
                  {validationErrors.currencySymbol && (
                    <p className="text-[11px] text-rose-400">{validationErrors.currencySymbol}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Support & Contact Coordinates */}
            <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Mail className="w-4 h-4 text-soft-gold" />
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Client Communication
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Concierge Email
                </label>
                <input
                  type="email"
                  value={formSettings.store.contactEmail}
                  onChange={(e) => updateField('store', 'contactEmail', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="contact@velora.in"
                />
                {validationErrors.contactEmail && (
                  <p className="text-[11px] text-rose-400">{validationErrors.contactEmail}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Direct Atelier Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formSettings.store.supportPhone}
                  onChange={(e) => updateField('store', 'supportPhone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Physical Studio Address
                </label>
                <textarea
                  rows={2}
                  value={formSettings.store.operatingAddress}
                  onChange={(e) => updateField('store', 'operatingAddress', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
                  placeholder="Velora Luxury Atelier, Craft District, Mumbai, India"
                />
              </div>
            </div>
          </div>

          {/* Social Presence & Announcement Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Share2 className="w-4 h-4 text-soft-gold" />
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Social Channels
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Instagram Atelier Profile URL
                </label>
                <input
                  type="text"
                  value={formSettings.store.socialInstagram}
                  onChange={(e) => updateField('store', 'socialInstagram', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="https://instagram.com/cjvelora"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Pinterest Collection URL
                </label>
                <input
                  type="text"
                  value={formSettings.store.socialPinterest}
                  onChange={(e) => updateField('store', 'socialPinterest', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="https://pinterest.com/cjvelora"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  WhatsApp Direct Number
                </label>
                <input
                  type="text"
                  value={formSettings.store.socialWhatsapp}
                  onChange={(e) => updateField('store', 'socialWhatsapp', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="+919876543210"
                />
              </div>
            </div>

            {/* Announcement & Maintenance Mode */}
            <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Megaphone className="w-4 h-4 text-soft-gold" />
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Storefront Notices & State
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Header Announcement Bar
                  </label>
                  <input
                    type="checkbox"
                    checked={formSettings.store.announcementBannerEnabled}
                    onChange={(e) =>
                      updateField('store', 'announcementBannerEnabled', e.target.checked)
                    }
                    className="w-4 h-4 accent-soft-gold cursor-pointer rounded"
                  />
                </div>
                <textarea
                  rows={2}
                  value={formSettings.store.announcementBannerText}
                  onChange={(e) => updateField('store', 'announcementBannerText', e.target.value)}
                  disabled={!formSettings.store.announcementBannerEnabled}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none disabled:opacity-40"
                  placeholder="Complimentary bespoke luxury packaging on all heirloom orders across India"
                />
              </div>

              {/* Maintenance Mode: Sensitive */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-tech text-[10px] uppercase tracking-wider text-rose-300 font-bold">
                        Maintenance Mode
                      </span>
                      {adminRole !== 'super_admin' && (
                        <span className="font-tech text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">
                          Super Admin Only
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ivory/40">
                      Temporarily pause storefront ordering and display an artisanal maintenance notice.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSettings.store.maintenanceMode}
                    disabled={adminRole !== 'super_admin'}
                    onChange={(e) => updateField('store', 'maintenanceMode', e.target.checked)}
                    className="w-5 h-5 accent-rose-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ORDER SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Receipt className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Order Identifiers & Thresholds
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Order Number Prefix *
              </label>
              <input
                type="text"
                value={formSettings.orders.orderPrefix}
                onChange={(e) => updateField('orders', 'orderPrefix', e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors uppercase"
                placeholder="VEL-"
              />
              <p className="text-[11px] text-ivory/40">
                Prepended to all newly generated orders, e.g. <span className="text-soft-gold font-tech">VEL-84920</span>
              </p>
              {validationErrors.orderPrefix && (
                <p className="text-[11px] text-rose-400">{validationErrors.orderPrefix}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Minimum Order Value (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formSettings.orders.minOrderAmount}
                onChange={(e) =>
                  updateField('orders', 'minOrderAmount', Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="0"
              />
              <p className="text-[11px] text-ivory/40">Set to 0 to disable minimum checkout threshold.</p>
              {validationErrors.minOrderAmount && (
                <p className="text-[11px] text-rose-400">{validationErrors.minOrderAmount}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Auto-Cancel Unpaid Orders Timeout (Minutes)
              </label>
              <input
                type="number"
                min="5"
                value={formSettings.orders.autoCancelUnpaidMinutes}
                onChange={(e) =>
                  updateField(
                    'orders',
                    'autoCancelUnpaidMinutes',
                    Math.max(5, parseInt(e.target.value, 10) || 60)
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="60"
              />
              <p className="text-[11px] text-ivory/40">
                Releases reserved crochet stock if checkout is abandoned without payment.
              </p>
            </div>
          </div>

          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Sliders className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Taxation & Policies
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                GST / Sales Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formSettings.orders.taxRatePercent}
                onChange={(e) =>
                  updateField('orders', 'taxRatePercent', Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="18"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Prices Include All Applicable Taxes</p>
                <p className="text-[11px] text-ivory/40">
                  When enabled, listed product prices already account for GST.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.orders.pricesIncludeTax}
                onChange={(e) => updateField('orders', 'pricesIncludeTax', e.target.checked)}
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Enable Guest Checkout</p>
                <p className="text-[11px] text-ivory/40">
                  Allow patrons to complete acquisitions without requiring registration.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.orders.enableGuestCheckout}
                onChange={(e) => updateField('orders', 'enableGuestCheckout', e.target.checked)}
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Invoice Custom Footer Note
              </label>
              <textarea
                rows={2}
                value={formSettings.orders.invoiceFooterNote}
                onChange={(e) => updateField('orders', 'invoiceFooterNote', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
                placeholder="Thank you for choosing VELORA handcrafted luxury."
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVENTORY SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Boxes className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Stock Thresholds & Behavior
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Default Low Stock Alert Threshold (Units)
              </label>
              <input
                type="number"
                min="0"
                value={formSettings.inventory.defaultLowStockThreshold}
                onChange={(e) =>
                  updateField(
                    'inventory',
                    'defaultLowStockThreshold',
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="3"
              />
              <p className="text-[11px] text-ivory/40">
                Products falling below this quantity trigger atelier re-order notices and admin badges.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Out of Stock Customer Experience
              </label>
              <select
                value={formSettings.inventory.outOfStockBehavior}
                onChange={(e) =>
                  updateField('inventory', 'outOfStockBehavior', e.target.value as OutOfStockBehavior)
                }
                className="w-full px-4 py-2.5 rounded-xl bg-[#1D2126] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
              >
                <option value="show_out_of_stock">Display "Sold Out" badge (Prevent checkout)</option>
                <option value="allow_backorder">Allow Made-to-Order Backorder (Artisanal waitlist)</option>
                <option value="hide">Hide Product from Public Atelier Catalog</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Cart Stock Hold Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                value={formSettings.inventory.stockReservationMinutes}
                onChange={(e) =>
                  updateField(
                    'inventory',
                    'stockReservationMinutes',
                    Math.max(1, parseInt(e.target.value, 10) || 15)
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="15"
              />
              <p className="text-[11px] text-ivory/40">
                Duration inventory units remain reserved during active payment gateway handshakes.
              </p>
            </div>
          </div>

          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <FileText className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Auditing & Surveillance
              </h3>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Inventory Audit Logging</p>
                <p className="text-[11px] text-ivory/40">
                  Record all manual adjustments, order allocations, and restocks in the `audit_logs` table.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.inventory.enableInventoryAuditLog}
                onChange={(e) =>
                  updateField('inventory', 'enableInventoryAuditLog', e.target.checked)
                }
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Low Stock Email Alerts</p>
                <p className="text-[11px] text-ivory/40">
                  Send immediate notifications to atelier staff when limited-edition crochet stock is depleted.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.inventory.notifyLowStock}
                onChange={(e) => updateField('inventory', 'notifyLowStock', e.target.checked)}
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SHIPPING SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'shipping' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Truck className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Rates & Complimentary Delivery
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Standard Shipping Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formSettings.shipping.standardShippingFee}
                onChange={(e) =>
                  updateField(
                    'shipping',
                    'standardShippingFee',
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="150"
              />
              <p className="text-[11px] text-ivory/40">Charged when order subtotal is below complimentary threshold.</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Free Shipping Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formSettings.shipping.freeShippingThreshold}
                onChange={(e) =>
                  updateField(
                    'shipping',
                    'freeShippingThreshold',
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="2500"
              />
              <p className="text-[11px] text-ivory/40">
                Orders equal or exceeding this value receive complimentary courier dispatch.
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-xs font-medium text-white">Enable Express Courier Priority</p>
                  <p className="text-[11px] text-ivory/40">Offer premium expedited air dispatch.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formSettings.shipping.enableExpressShipping}
                  onChange={(e) =>
                    updateField('shipping', 'enableExpressShipping', e.target.checked)
                  }
                  className="w-4 h-4 accent-soft-gold cursor-pointer"
                />
              </div>

              {formSettings.shipping.enableExpressShipping && (
                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Express Shipping Surcharge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formSettings.shipping.expressShippingFee}
                    onChange={(e) =>
                      updateField(
                        'shipping',
                        'expressShippingFee',
                        Math.max(0, parseInt(e.target.value, 10) || 0)
                      )
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                    placeholder="350"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Globe className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Logistics & Windows
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Standard Delivery Transit Time
              </label>
              <input
                type="text"
                value={formSettings.shipping.estimatedDeliveryDaysStandard}
                onChange={(e) =>
                  updateField('shipping', 'estimatedDeliveryDaysStandard', e.target.value)
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="4-7 business days"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Express Delivery Transit Time
              </label>
              <input
                type="text"
                value={formSettings.shipping.estimatedDeliveryDaysExpress}
                onChange={(e) =>
                  updateField('shipping', 'estimatedDeliveryDaysExpress', e.target.value)
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="2-3 business days"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Atelier Dispatch Origin Hub
              </label>
              <input
                type="text"
                value={formSettings.shipping.shippingOriginCity}
                onChange={(e) => updateField('shipping', 'shippingOriginCity', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="Mumbai, Maharashtra"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">International Global Shipping</p>
                <p className="text-[11px] text-ivory/40">Accept cross-border orders outside India.</p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.shipping.enableInternationalShipping}
                onChange={(e) =>
                  updateField('shipping', 'enableInternationalShipping', e.target.checked)
                }
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PAYMENT CONFIGURATION STATUS */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Super Admin Notice Banner if user is Staff */}
          {adminRole !== 'super_admin' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="text-xs text-amber-200">
                <span className="font-bold uppercase tracking-wider font-tech text-amber-300">
                  Read-Only Clearance:
                </span>{' '}
                Only <span className="underline font-semibold">Super Administrators</span> are authorized to
                modify payment gateway switches and financial checkout restrictions.
              </div>
            </div>
          )}

          {/* Section 1: Environment-Controlled Configuration Status (Strict Zero-Secret Display) */}
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-soft-gold" />
                <div>
                  <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                    Infrastructure & Gateway Detection Status
                  </h3>
                  <p className="text-[11px] text-ivory/40">
                    Inspected from secure environment runtime. Secrets are never exposed to client-side scripts.
                  </p>
                </div>
              </div>
              <span className="font-tech text-[10px] text-ivory/50 uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                Read-Only Runtime
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Razorpay Gateway Card */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold text-white">Razorpay Key ID</span>
                  {envStatus?.razorpayKeyIdConfigured ? (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      {envStatus.razorpayKeyIdMode === 'live' ? 'Live Mode' : 'Test Mode'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <X className="w-3 h-3" />
                      Missing
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      envStatus?.razorpayKeyIdConfigured ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <p className="font-tech text-xs text-ivory/70">
                    {envStatus?.razorpayKeyIdConfigured
                      ? '✓ Configuration detected in environment'
                      : 'Not configured in environment'}
                  </p>
                </div>
                <p className="text-[10px] text-ivory/40 font-mono">NEXT_PUBLIC_RAZORPAY_KEY_ID</p>
              </div>

              {/* Razorpay Key Secret Status */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold text-white">Razorpay Key Secret</span>
                  {envStatus?.razorpaySecretConfigured ? (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Detected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <X className="w-3 h-3" />
                      Missing
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      envStatus?.razorpaySecretConfigured ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <p className="font-tech text-xs text-ivory/70">
                    {envStatus?.razorpaySecretConfigured
                      ? '✓ Configuration detected (Server-side)'
                      : 'Missing in server environment'}
                  </p>
                </div>
                <p className="text-[10px] text-ivory/40 font-mono">RAZORPAY_KEY_SECRET</p>
              </div>

              {/* Supabase Host URL */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold text-white">Supabase Endpoint</span>
                  {envStatus?.supabaseUrlConfigured ? (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <X className="w-3 h-3" />
                      Missing
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      envStatus?.supabaseUrlConfigured ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <p className="font-tech text-xs text-ivory/70">
                    {envStatus?.supabaseUrlConfigured
                      ? '✓ Supabase host reachable'
                      : 'Endpoint URL not detected'}
                  </p>
                </div>
                <p className="text-[10px] text-ivory/40 font-mono">NEXT_PUBLIC_SUPABASE_URL</p>
              </div>

              {/* Supabase Anon Key */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold text-white">Supabase Public Anon Key</span>
                  {envStatus?.supabaseAnonKeyConfigured ? (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Detected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <X className="w-3 h-3" />
                      Missing
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      envStatus?.supabaseAnonKeyConfigured ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <p className="font-tech text-xs text-ivory/70">
                    {envStatus?.supabaseAnonKeyConfigured
                      ? '✓ Public client authorization ready'
                      : 'Anon key missing'}
                  </p>
                </div>
                <p className="text-[10px] text-ivory/40 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
              </div>

              {/* Supabase Service Role Key */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold text-white">Service Role Key</span>
                  {envStatus?.supabaseServiceRoleConfigured ? (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Detected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Not Detected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      envStatus?.supabaseServiceRoleConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <p className="font-tech text-xs text-ivory/70">
                    {envStatus?.supabaseServiceRoleConfigured
                      ? '✓ Configured in server environment'
                      : 'Optional (RLS bypass disabled)'}
                  </p>
                </div>
                <p className="text-[10px] text-ivory/40 font-mono">SUPABASE_SERVICE_ROLE_KEY</p>
              </div>
            </div>
          </div>

          {/* Section 2: Policy Controls (Sensitive - super_admin restricted) */}
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <CreditCard className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Storefront Payment Policies & Restrictions
              </h3>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-semibold text-white">Cash on Delivery (COD) Checkout</p>
                <p className="text-[11px] text-ivory/40">
                  Allow patrons to complete acquisitions paying upon delivery.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={adminRole !== 'super_admin'}
                checked={formSettings.payments.codEnabled}
                onChange={(e) => updateField('payments', 'codEnabled', e.target.checked)}
                className="w-5 h-5 accent-soft-gold cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {formSettings.payments.codEnabled && (
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Maximum Order Cap for COD (₹)
                </label>
                <input
                  type="number"
                  disabled={adminRole !== 'super_admin'}
                  min="0"
                  value={formSettings.payments.codMaxAmount}
                  onChange={(e) =>
                    updateField(
                      'payments',
                      'codMaxAmount',
                      Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors disabled:opacity-50"
                  placeholder="10000"
                />
                <p className="text-[11px] text-ivory/40">Orders exceeding this total must be prepaid online.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Prepaid Discount Incentive (%)
              </label>
              <input
                type="number"
                disabled={adminRole !== 'super_admin'}
                min="0"
                max="100"
                step="0.5"
                value={formSettings.payments.prepaidDiscountPercent}
                onChange={(e) =>
                  updateField(
                    'payments',
                    'prepaidDiscountPercent',
                    Math.max(0, parseFloat(e.target.value) || 0)
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors disabled:opacity-50"
                placeholder="0"
              />
              <p className="text-[11px] text-ivory/40">
                Automatic incentive applied to carts completing checkout via Razorpay online payment.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-semibold text-white">
                  Enforce HMAC Payment Verification
                </p>
                <p className="text-[11px] text-ivory/40">
                  Strictly validates Razorpay cryptographic signature before transitioning orders to paid state.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={adminRole !== 'super_admin'}
                checked={formSettings.payments.enforcePaymentVerification}
                onChange={(e) =>
                  updateField('payments', 'enforcePaymentVerification', e.target.checked)
                }
                className="w-5 h-5 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NOTIFICATION SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Bell className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Patron Dispatch Communications
              </h3>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Order Placement Confirmation</p>
                <p className="text-[11px] text-ivory/40">
                  Send immediate receipt upon order creation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.notifications.orderConfirmationEmail}
                onChange={(e) =>
                  updateField('notifications', 'orderConfirmationEmail', e.target.checked)
                }
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Order Dispatched & Tracking Email</p>
                <p className="text-[11px] text-ivory/40">
                  Trigger courier airway bill update when order transitions to "shipped".
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.notifications.orderShippedEmail}
                onChange={(e) =>
                  updateField('notifications', 'orderShippedEmail', e.target.checked)
                }
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Order Cancellation Notification</p>
                <p className="text-[11px] text-ivory/40">
                  Notify customer if reservation expires or order is cancelled.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.notifications.orderCancelledEmail}
                onChange={(e) =>
                  updateField('notifications', 'orderCancelledEmail', e.target.checked)
                }
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">WhatsApp Order Updates</p>
                <p className="text-[11px] text-ivory/40">
                  Send transactional updates via WhatsApp messaging bridge.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.notifications.customerWhatsappNotifications}
                onChange={(e) =>
                  updateField('notifications', 'customerWhatsappNotifications', e.target.checked)
                }
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Mail className="w-4 h-4 text-soft-gold" />
              <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                Internal Atelier Alerts
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Staff Notification Recipient Emails (Comma separated)
              </label>
              <textarea
                rows={3}
                value={formSettings.notifications.adminNotificationEmails}
                onChange={(e) =>
                  updateField('notifications', 'adminNotificationEmails', e.target.value)
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
                placeholder="admin@velora.in, orders@velora.in"
              />
              <p className="text-[11px] text-ivory/40">
                These addresses receive copies of all client orders and urgent inventory shortages.
              </p>
              {validationErrors.adminNotificationEmails && (
                <p className="text-[11px] text-rose-400">
                  {validationErrors.adminNotificationEmails}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-sans text-xs font-medium text-white">Low Stock Critical Alerts</p>
                <p className="text-[11px] text-ivory/40">
                  Immediate dispatch to staff when heirloom piece inventory hits 0.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formSettings.notifications.lowStockAlertEmail}
                onChange={(e) =>
                  updateField('notifications', 'lowStockAlertEmail', e.target.checked)
                }
                className="w-4 h-4 accent-soft-gold cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ADMIN PROFILE & SECURITY */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Privileges Card */}
            <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <ShieldCheck className="w-5 h-5 text-soft-gold" />
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Active Administration Credentials
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-tech uppercase text-ivory/50">Admin Identifier</span>
                  <span
                    className={`font-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      adminRole === 'super_admin'
                        ? 'bg-soft-gold/20 text-soft-gold border-soft-gold/30'
                        : 'bg-white/10 text-ivory/70 border-white/10'
                    }`}
                  >
                    {adminRole === 'super_admin' ? 'Super Administrator' : 'Staff Administrator'}
                  </span>
                </div>
                <p className="font-sans text-sm text-white font-medium break-all">{adminEmail}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-serif text-xs font-semibold text-white uppercase tracking-wider">
                  Security Clearance Matrix
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-ivory/70">View & Search Orders</span>
                    <span className="text-emerald-400 font-semibold font-tech">✓ Authorized</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-ivory/70">Manage Products & Inventory</span>
                    <span className="text-emerald-400 font-semibold font-tech">✓ Authorized</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-ivory/70">Modify Store & Shipping Settings</span>
                    <span className="text-emerald-400 font-semibold font-tech">✓ Authorized</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-ivory/70">Payment Gateway Switches & COD Caps</span>
                    <span
                      className={`font-tech font-semibold ${
                        adminRole === 'super_admin' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {adminRole === 'super_admin' ? '✓ Super Admin Only' : '✗ Restricted'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-ivory/70">Maintenance Mode Toggle</span>
                    <span
                      className={`font-tech font-semibold ${
                        adminRole === 'super_admin' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {adminRole === 'super_admin' ? '✓ Super Admin Only' : '✗ Restricted'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5">
                <button
                  onClick={async () => {
                    await signOutAdmin();
                    window.location.href = '/admin/login';
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 border border-rose-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Terminate Atelier Session</span>
                </button>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <KeyRound className="w-4 h-4 text-soft-gold" />
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Update Administrative Password
                </h3>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    New Master Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                  />
                  <p className="text-[11px] text-ivory/40">Minimum 8 characters including mixed casing.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="w-full py-3 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal font-semibold text-xs uppercase tracking-wider transition-colors shadow-luxury disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {passwordUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Securing Credentials...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STICKY BOTTOM ACTION BAR (When current tab is dirty) */}
      {/* ========================================================================= */}
      {activeTab !== 'security' && isCurrentTabDirty && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-6 max-w-4xl mx-auto animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-[#181B1F]/95 border border-soft-gold/40 rounded-2xl shadow-2xl backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <div>
                <p className="font-sans text-xs font-semibold text-white">
                  Unsaved Changes in {TABS.find((t) => t.id === activeTab)?.label}
                </p>
                <p className="text-[11px] text-ivory/50">
                  Deploy modifications to persist across the Atelier storefront.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDiscardCurrentTab}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/70 hover:text-white text-xs font-semibold tracking-wider border border-white/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCurrentSection}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal text-xs font-bold uppercase tracking-wider transition-all shadow-luxury disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB SWITCH CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {pendingTabSwitch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181B1F] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-white">Unsaved Changes</h3>
                <p className="text-xs text-ivory/50">You have unsaved edits in {TABS.find((t) => t.id === activeTab)?.label}.</p>
              </div>
            </div>

            <p className="text-xs text-ivory/70 leading-relaxed">
              Navigating to another section will discard your modifications unless saved. Would you like to save before switching or discard?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingTabSwitch(null)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/70 text-xs font-semibold tracking-wide transition-colors"
              >
                Stay Here
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscardAndSwitch}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold tracking-wide border border-rose-500/20 transition-colors"
              >
                Discard & Switch
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentSection}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal text-xs font-bold uppercase tracking-wider transition-colors shadow-luxury flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>Save & Switch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
