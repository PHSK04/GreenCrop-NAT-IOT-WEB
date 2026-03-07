import { AuthProvider } from "@/features/auth/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppRouter } from "@/features/auth/components/AppRouter";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme" attribute="class">
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}