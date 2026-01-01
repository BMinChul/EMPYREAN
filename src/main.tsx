import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import "./index.css";
import App from "./App";
import ConfigError from "./components/ConfigError";
import { wagmiAdapter, projectId } from './wagmi';

const queryClient = new QueryClient();

// Check if Project ID is missing
if (!projectId || projectId === 'YOUR_PROJECT_ID') {
  console.error("❌ CRITICAL: VITE_REOWN_PROJECT_ID is missing in .env file!");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ConfigError />
    </StrictMode>
  );
} else {
  console.log("✅ Reown Project ID loaded");
  
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>
  );
}
