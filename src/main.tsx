import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import "./index.css";
import App from "./App";
import { config, crossTestnet } from './wagmi';

const queryClient = new QueryClient();

// Use environment variable for App ID, or a placeholder if missing
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "clp2j5x6e00cfmc0fp7x7j7x7"; // Example placeholder

// Debug: Log the App ID (first few chars) to confirm it's loaded
console.log("Privy App ID loaded:", PRIVY_APP_ID ? `${PRIVY_APP_ID.substring(0, 5)}...` : "undefined");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord'],
        defaultChain: crossTestnet,
        supportedChains: [crossTestnet],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: 'https://agent8-games.verse8.io/assets/logos/logo_v8.png', // Optional branding
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <App />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  </StrictMode>
);
