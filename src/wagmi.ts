import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

const crossTestnet = defineChain({
  id: 4157, // Placeholder ID for Crosschain Testnet (CrossFi)
  name: 'Crosschain Testnet',
  nativeCurrency: { name: 'tCross', symbol: 'tCROSS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.crosstoken.io:22001'] },
  },
})

export const config = createConfig({
  chains: [crossTestnet, mainnet, sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [crossTestnet.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
