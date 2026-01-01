import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

export const crossTestnet = defineChain({
  id: 4157,
  name: 'CrossFi Testnet',
  nativeCurrency: { name: 'XFI', symbol: 'XFI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.ms'] },
  },
  blockExplorers: {
    default: { name: 'CrossFi Scan', url: 'https://scan.testnet.ms' },
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
