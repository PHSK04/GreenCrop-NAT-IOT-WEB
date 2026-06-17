import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { MachineProvider } from "@/contexts/MachineContext";
import { Dashboard } from "@/components/Dashboard";
import { AdminDashboard } from "@/layouts/AdminLayout";
import { Login } from "@/features/auth/components/Login";
import { Register } from "@/features/auth/components/Register";
import { DevicePairingPage } from "@/components/pages/DevicePairingPage";
import { authService } from "@/features/auth/services/authService";
import { getActiveDeviceIdValue, scopedStorageKey, setActiveDeviceIdValue } from "@/hooks/useActiveDeviceId";

const PAIRING_COMPLETED_KEY = "device_pairing_completed";
const PAIRING_DEVICE_ID_KEY = "device_pairing_device_id";
const pairingCompletedKey = () => scopedStorageKey(PAIRING_COMPLETED_KEY);
const pairingDeviceIdKey = () => scopedStorageKey(PAIRING_DEVICE_ID_KEY);

export function AppRouter() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');
  const [pairingStatus, setPairingStatus] = useState<'unknown' | 'required' | 'paired' | 'skipped'>('unknown');

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setPairingStatus('unknown');
      return;
    }

    const isAdmin = String(user?.role || "").toLowerCase() === "admin";
    if (isAdmin) {
      setPairingStatus('paired');
      return;
    }

    const hasCachedPairing = typeof window !== 'undefined' && (
      localStorage.getItem(pairingCompletedKey()) === 'true' ||
      Boolean(localStorage.getItem(pairingDeviceIdKey())) ||
      Boolean(getActiveDeviceIdValue())
    );

    if (hasCachedPairing) {
      setPairingStatus('paired');
    } else {
      setPairingStatus('unknown');
    }

    authService.getMyDevices()
      .then((rows) => {
        if (!isMounted) return;
        if (rows.length > 0) {
          setPairingStatus('paired');
          localStorage.setItem(pairingCompletedKey(), 'true');
          if (rows[0]?.device_id) {
            localStorage.setItem(pairingDeviceIdKey(), String(rows[0].device_id));
            setActiveDeviceIdValue(String(rows[0].device_id));
          }
          return;
        }
        const cachedDeviceId = getActiveDeviceIdValue() || localStorage.getItem(pairingDeviceIdKey()) || '';
        if (cachedDeviceId) {
          localStorage.setItem(pairingCompletedKey(), 'true');
          localStorage.setItem(pairingDeviceIdKey(), cachedDeviceId);
          setActiveDeviceIdValue(cachedDeviceId);
          setPairingStatus('paired');
          return;
        }
        localStorage.removeItem(pairingCompletedKey());
        localStorage.removeItem(pairingDeviceIdKey());
        setPairingStatus('required');
      })
      .catch(() => {
        if (!isMounted) return;
        setPairingStatus(hasCachedPairing ? 'paired' : 'required');
      });

    return () => { isMounted = false; };
  }, [user?.id, user?.role]);

  if (user) {
    const isAdmin = String(user?.role || "").toLowerCase() === "admin";
    if (isAdmin) {
      return (
        <AdminDashboard />
      );
    }

    if (pairingStatus === 'unknown') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          Checking device pairing...
        </div>
      );
    }

    if (pairingStatus === 'required') {
      return (
        <DevicePairingPage
          user={user}
          onPaired={({ deviceId }) => {
            localStorage.setItem(pairingCompletedKey(), 'true');
            localStorage.setItem(pairingDeviceIdKey(), deviceId);
            setActiveDeviceIdValue(deviceId);
            setPairingStatus('paired');
          }}
          onSkip={() => {
            setPairingStatus('skipped');
          }}
        />
      );
    }

    return (
      <MachineProvider>
        <Dashboard onLogout={logout} user={user} />
      </MachineProvider>
    );
  }

  return currentView === 'login' ? (
    <Login 
      onSwitchToRegister={() => setCurrentView('register')} 
    />
  ) : (
    <Register 
      onSwitchToLogin={() => setCurrentView('login')} 
    />
  );
}
