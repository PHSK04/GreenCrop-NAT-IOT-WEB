import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { MachineProvider } from "@/contexts/MachineContext";
import { Dashboard } from "@/components/Dashboard";
import { AdminDashboard } from "@/layouts/AdminLayout";
import { Login } from "@/features/auth/components/Login";
import { Register } from "@/features/auth/components/Register";
import { DevicePairingPage } from "@/components/pages/DevicePairingPage";
import { authService } from "@/features/auth/services/authService";

const PAIRING_COMPLETED_KEY = "device_pairing_completed";
const PAIRING_DEVICE_ID_KEY = "device_pairing_device_id";

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
      localStorage.getItem(PAIRING_COMPLETED_KEY) === 'true' ||
      Boolean(localStorage.getItem(PAIRING_DEVICE_ID_KEY))
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
          localStorage.setItem(PAIRING_COMPLETED_KEY, 'true');
          if (rows[0]?.device_id) {
            localStorage.setItem(PAIRING_DEVICE_ID_KEY, String(rows[0].device_id));
          }
          return;
        }
        localStorage.removeItem(PAIRING_COMPLETED_KEY);
        localStorage.removeItem(PAIRING_DEVICE_ID_KEY);
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
            localStorage.setItem(PAIRING_COMPLETED_KEY, 'true');
            localStorage.setItem('device_pairing_device_id', deviceId);
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
