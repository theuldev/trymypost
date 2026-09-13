import { useEffect } from "react";
import { AppRoutes } from "./routes";
import { useUIStore } from "@/store";
import { ToastContainer } from "@/components/ui/Toast";

export function App() {
  const { darkMode, toasts, removeToast } = useUIStore();

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
