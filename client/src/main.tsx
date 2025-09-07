import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Инициализируем MSW только если явно включено
async function enableMocking() {
  // MSW запускается только если VITE_USE_MSW=true
  if (import.meta.env.VITE_USE_MSW === 'true') {
    const { worker } = await import('./mocks/browser');
    
    // Запускаем MSW worker
    return worker.start({
      onUnhandledRequest: 'bypass', // Игнорируем необработанные запросы
    });
  }
}

// Инициализируем приложение после настройки MSW
enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
