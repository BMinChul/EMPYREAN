import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { defineChain } from 'viem'

export const crossTestnet = defineChain({
  id: 612044,
  name: 'Cross testnet',
  nativeCurrency: { name: 'tCROSS', symbol: 'tCROSS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.crosstoken.io:22001/'] },
  },
  blockExplorers: {
    default: { name: 'Cross Scan', url: 'https://testnet.crossscan.io' },
  },
})

export const config = createConfig({
  chains: [crossTestnet, mainnet, sepolia],
  connectors: [],
  transports: {
    [crossTestnet.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
