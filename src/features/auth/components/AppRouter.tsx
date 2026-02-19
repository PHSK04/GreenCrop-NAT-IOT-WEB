import { useState } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { MachineProvider } from "@/contexts/MachineContext";
import { Dashboard } from "@/components/Dashboard";
  import { AdminDashboard } from "@/layouts/AdminLayout"; 
import { Login } from "@/features/auth/components/Login";
import { Register } from "@/features/auth/components/Register";

export function AppRouter() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');

  if (user) {
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
