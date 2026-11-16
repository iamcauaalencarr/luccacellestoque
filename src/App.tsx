import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  History,
  LogOut,
  Settings,
  Smartphone,
  Users,
} from 'lucide-react';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  DEFAULT_STORE_SETTINGS,
  type AppTab,
  type AuditLogRecord,
  type DeviceItem,
  type SaleRecord,
  type StaffDirectoryMember,
  type StoreSettings,
  type ToastMessage,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './components/LoginView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { TeamView } from './components/TeamView';
import { AuditView } from './components/AuditView';
import { SettingsView } from './components/SettingsView';
import { DeviceFormSheet } from './components/DeviceFormSheet';
import { SaleSheet } from './components/SaleSheet';
import { NiimbotLabelSheet } from './components/NiimbotLabelSheet';
import { ReservationSheet } from './components/ReservationSheet';
import { WarrantyReceiptSheet } from './components/WarrantyReceiptSheet';

function StoreBrand({ name, className = '' }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return (
      <span className={`font-display font-bold tracking-tight text-white whitespace-nowrap ${className}`}>
        <span className="text-[#D4AF37]">{parts[0] || 'Lucca Cell'}</span>
      </span>
    );
  }
  const last = parts.pop();
  return (
    <span className={`font-display font-bold tracking-tight text-white whitespace-nowrap ${className}`}>
      {parts.join(' ')} <span className="text-[#D4AF37]">{last}</span>
    </span>
  );
}

function MainShell() {
  const { firebaseUser, profile, authReady, accessDeniedReason, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('estoque');
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [staff, setStaff] = useState<StaffDirectoryMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loadingData, setLoadingData] = useState(true);

  const [deviceSheetOpen, setDeviceSheetOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
  const [duplicateDevice, setDuplicateDevice] = useState<DeviceItem | null>(null);
  const [sellingDevice, setSellingDevice] = useState<DeviceItem | null>(null);
  const [reservingDevice, setReservingDevice] = useState<DeviceItem | null>(null);
  const [labelDevice, setLabelDevice] = useState<DeviceItem | null>(null);
  const [warrantyTarget, setWarrantyTarget] = useState<{
    sale: SaleRecord;
    justCompleted?: boolean;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const isStaffReady = Boolean(authReady && firebaseUser && profile?.active && !accessDeniedReason);
  const isAdmin = profile?.role === 'admin';

  // Ensure sellers don't stay on admin-only tabs if role changed
  useEffect(() => {
    if (profile && profile.role !== 'admin' && (activeTab === 'equipe' || activeTab === 'auditoria')) {
      setActiveTab('estoque');
    }
  }, [profile, activeTab]);

  // Real-time Firestore listeners
  useEffect(() => {
    if (!isStaffReady || !profile) {
      setDevices([]);
      setSales([]);
      setStaff([]);
      setAuditLogs([]);
      setSettings(DEFAULT_STORE_SETTINGS);
      return;
    }

    setLoadingData(true);

    const devicesQuery = query(collection(db, 'devices'), orderBy('createdAt', 'desc'));
    const unsubDevices = onSnapshot(
      devicesQuery,
      (snap) => {
        setDevices(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeviceItem, 'id'>) }))
        );
        setLoadingData(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'devices');
      }
    );

    const salesQuery = isAdmin
      ? query(collection(db, 'sales'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'sales'),
          where('sellerId', '==', profile.uid),
          orderBy('createdAt', 'desc')
        );

    const unsubSales = onSnapshot(
      salesQuery,
      (snap) => {
        setSales(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SaleRecord, 'id'>) }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'sales');
      }
    );

    const staffQuery = query(collection(db, 'staffDirectory'), orderBy('displayName', 'asc'));
    const unsubStaff = onSnapshot(
      staffQuery,
      (snap) => {
        setStaff(snap.docs.map((d) => d.data() as StaffDirectoryMember));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'staffDirectory');
      }
    );

    let unsubAudit: (() => void) | null = null;
    if (isAdmin) {
      const auditQuery = query(
        collection(db, 'auditLogs'),
        orderBy('createdAt', 'desc'),
        limit(120)
      );
      unsubAudit = onSnapshot(
        auditQuery,
        (snap) => {
          setAuditLogs(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLogRecord, 'id'>) }))
          );
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'auditLogs');
        }
      );
    }

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'store'),
      (snap) => {
        if (snap.exists()) {
          setSettings({
            ...DEFAULT_STORE_SETTINGS,
            ...(snap.data() as Partial<StoreSettings>),
          });
        } else {
          setSettings(DEFAULT_STORE_SETTINGS);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/store');
      }
    );

    return () => {
      unsubDevices();
      unsubSales();
      unsubStaff();
      unsubSettings();
      if (unsubAudit) unsubAudit();
    };
  }, [isStaffReady, profile, isAdmin]);

  if (!authReady) {
    return (
      <div className="min-h-dvh bg-[#09090B] text-white flex flex-col items-center justify-center gap-3 px-4">
        <span className="font-display text-2xl font-bold tracking-tight">
          Lucca <span className="text-[#D4AF37]">Cell</span>
        </span>
        <span className="text-xs text-zinc-400">Carregando sistema...</span>
      </div>
    );
  }

  if (!firebaseUser || !profile || !profile.active || accessDeniedReason) {
    return <LoginView />;
  }

  const desktopNavItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    isAdmin
      ? [
          { id: 'estoque', label: 'Estoque', icon: Smartphone },
          { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
          { id: 'equipe', label: 'Equipe', icon: Users },
          { id: 'auditoria', label: 'Auditoria', icon: History },
          { id: 'config', label: 'Configurações', icon: Settings },
        ]
      : [
          { id: 'estoque', label: 'Estoque', icon: Smartphone },
          { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
          { id: 'config', label: 'Configurações', icon: Settings },
        ];

  const mobileNavItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    isAdmin
      ? [
          { id: 'estoque', label: 'Estoque', icon: Smartphone },
          { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
          { id: 'equipe', label: 'Equipe', icon: Users },
          { id: 'auditoria', label: 'Auditoria', icon: History },
        ]
      : [
          { id: 'estoque', label: 'Estoque', icon: Smartphone },
          { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
          { id: 'config', label: 'Config.', icon: Settings },
        ];

  return (
    <>
      <div className="print:hidden min-h-dvh bg-[#09090B] text-white flex flex-col lg:flex-row overflow-x-hidden">
        {/* Desktop Left Sidebar (256px) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-[#0D0D11] border-r border-[#26262E] p-5 justify-between z-30">
          <div className="space-y-7">
            <div className="px-2 space-y-0.5 overflow-hidden">
              <StoreBrand name={settings.storeName} className="text-xl block truncate" />
              {settings.storeTagline && (
                <p className="text-xs text-zinc-500 truncate">{settings.storeTagline}</p>
              )}
            </div>

            <nav className="space-y-1" aria-label="Navegação principal">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full min-h-[44px] px-3.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#D4AF37] text-black font-semibold'
                        : 'text-zinc-400 hover:text-white hover:bg-[#16161C]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-[#26262E] space-y-3">
            <div className="px-2">
              <p className="text-sm font-medium text-white truncate">{profile.displayName}</p>
              <p className="text-xs text-zinc-400 font-mono-tabular truncate">
                @{profile.username} · {isAdmin ? 'Admin' : 'Vendedor'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#16161C] hover:bg-[#22222A] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        {/* Mobile Compact Sticky Top Bar (48px + safe area, keeping sticky chrome <= 15%) */}
        <header className="lg:hidden sticky top-0 z-30 pt-safe bg-[#09090B]/92 backdrop-blur-md border-b border-[#26262E]">
          <div className="h-12 px-3.5 flex items-center justify-between gap-3">
            <StoreBrand
              name={settings.storeName}
              className="text-base sm:text-lg shrink-0 truncate max-w-[62vw]"
            />

            <div className="flex items-center shrink-0">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  aria-label="Configurações do app e conta"
                  className={`min-h-[44px] px-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap active:scale-[0.97] ${
                    activeTab === 'config'
                      ? 'bg-[#1A1A20] text-[#D4AF37]'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="font-medium">Config.</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => signOut()}
                  aria-label="Sair da conta"
                  className="min-h-[44px] px-2.5 rounded-xl text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap active:scale-[0.97]"
                >
                  <LogOut className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Sair</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-10">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-7">
          {activeTab === 'estoque' && (
            <InventoryView
              devices={devices}
              settings={settings}
              loading={loadingData}
              onAddDevice={() => {
                setEditingDevice(null);
                setDuplicateDevice(null);
                setDeviceSheetOpen(true);
              }}
              onEditDevice={(device) => {
                setDuplicateDevice(null);
                setEditingDevice(device);
                setDeviceSheetOpen(true);
              }}
              onDuplicateDevice={(device) => {
                setEditingDevice(null);
                setDuplicateDevice(device);
                setDeviceSheetOpen(true);
              }}
              onReserveDevice={(device) => setReservingDevice(device)}
              onSellDevice={(device) => setSellingDevice(device)}
              onPrintLabel={(device) => setLabelDevice(device)}
              onNotify={notify}
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsView
              devices={devices}
              sales={sales}
              staff={staff}
              settings={settings}
              loading={loadingData}
              onOpenWarranty={(sale) => setWarrantyTarget({ sale, justCompleted: false })}
            />
          )}

          {activeTab === 'equipe' && isAdmin && (
            <TeamView staff={staff} loading={loadingData} onNotify={notify} />
          )}

          {activeTab === 'auditoria' && isAdmin && (
            <AuditView logs={auditLogs} loading={loadingData} />
          )}

          {activeTab === 'config' && (
            <SettingsView settings={settings} onNotify={notify} />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb Zone, 56px) */}
      <nav
        aria-label="Navegação inferior"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-t border-[#26262E] pb-safe"
      >
        <div
          className={`grid h-14 items-center ${
            mobileNavItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
          }`}
        >
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                  active ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#D4AF37]"
                  />
                )}
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals / Bottom Sheets */}
      <DeviceFormSheet
        open={deviceSheetOpen}
        editingDevice={editingDevice}
        duplicateFrom={duplicateDevice}
        settings={settings}
        onClose={() => {
          setDeviceSheetOpen(false);
          setEditingDevice(null);
          setDuplicateDevice(null);
        }}
        onSuccess={(msg) => notify('success', msg)}
        onError={(msg) => notify('error', msg)}
      />

      <SaleSheet
        device={sellingDevice}
        settings={settings}
        onClose={() => setSellingDevice(null)}
        onSuccess={(msg) => notify('success', msg)}
        onSaleCompleted={(sale) => setWarrantyTarget({ sale, justCompleted: true })}
        onError={(msg) => notify('error', msg)}
      />

      <ReservationSheet
        device={reservingDevice}
        onClose={() => setReservingDevice(null)}
        onSuccess={(msg) => notify('success', msg)}
        onError={(msg) => notify('error', msg)}
      />

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="print:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 right-3.5 left-3.5 sm:left-auto sm:w-96 z-50 space-y-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium border shadow-lg ${
                toast.type === 'success'
                  ? 'bg-[#121216] border-[#D4AF37] text-white'
                  : toast.type === 'error'
                    ? 'bg-red-950/95 border-red-700 text-red-100'
                    : 'bg-[#121216] border-[#26262E] text-zinc-100'
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}
    </div>

    <NiimbotLabelSheet
      device={labelDevice}
      settings={settings}
      onClose={() => setLabelDevice(null)}
      onNotify={notify}
    />

    <WarrantyReceiptSheet
      sale={warrantyTarget?.sale || null}
      justCompleted={warrantyTarget?.justCompleted}
      settings={settings}
      onClose={() => setWarrantyTarget(null)}
      onNotify={notify}
    />
  </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
