import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppRoutes } from "./routes";
import { useUIStore } from "@/store";
import { settingsApi } from "@/services/posts";
import { ToastContainer } from "@/components/ui/Toast";

export function App() {
  const { darkMode, toasts, removeToast, setAppLanguage } = useUIStore();

  // Sincroniza o idioma salvo no servidor com a interface em qualquer tela
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settings?.language) {
      setAppLanguage(settings.language);
    }
  }, [settings, setAppLanguage]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <>
      <AppRoutes />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default App;
