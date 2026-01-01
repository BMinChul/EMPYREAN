import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { defineChain } from 'viem'
import { mainnet, arbitrum } from '@reown/appkit/networks'

// 1. Get projectId from Reown Cloud
export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694' // Fallback for dev

// 2. Define Custom Chain (Cross Testnet)
export const crossTestnet = defineChain({
  id: 612044,
  name: 'Cross Testnet',
  nativeCurrency: { name: 'tCROSS', symbol: 'tCROSS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.crosstoken.io:22001/'] },
  },
  blockExplorers: {
    default: { name: 'Cross Scan', url: 'https://testnet.crossscan.io' },
  },
  testnet: true
})

// 3. Create Wagmi Adapter
export const networks = [crossTestnet, mainnet, arbitrum]

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

// 4. Create AppKit Modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [crossTestnet, mainnet, arbitrum],
  projectId,
  features: {
    analytics: true
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00ff9d', // Euphoria Green
    '--w3m-border-radius-master': '1px'
  }
})

export const config = wagmiAdapter.wagmiConfig
