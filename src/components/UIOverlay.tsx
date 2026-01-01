import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameServer, useAsset } from '@agent8/gameserver';
import { usePrivy } from '@privy-io/react-auth';
import { useBalance } from 'wagmi';
import { Wallet, TrendingUp, TrendingDown, Target, CheckCircle2, AlertCircle, X, HelpCircle, Coins, LogOut, ShoppingBag, ArrowRightLeft, ExternalLink } from 'lucide-react';
import Assets from '../assets.json';
import LoginModal from './LoginModal';

import { crossTestnet } from '../wagmi';

const UIOverlay: React.FC = () => {
  const { 
    currentPrice, balance: storeBalance, betAmount, setBetAmount, 
    lastWinAmount, setLastWinAmount,
    pendingBet, pendingWin, clearPendingBet, clearPendingWin, setBalance,
    tokenPrice
  } = useGameStore();
  
  const { connected, server, connect: connectServer, disconnect: disconnectServer } = useGameServer();
  const { assets, burnAsset, mintAsset } = useAsset();
  
  // Privy Hooks for Authentication
  const { authenticated, user, logout } = usePrivy();
  const address = user?.wallet?.address;
  
  // Wagmi Hook for real-time Blockchain Balance
  const { data: wagmiBalance, isLoading: isBalanceLoading } = useBalance({
    address: address as `0x${string}`,
    chainId: crossTestnet.id,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Reduced frequency to prevent rate limits
    }
  });

  // Safe Balance Calculation with NaN check
  const displayBalance = React.useMemo(() => {
    if (wagmiBalance) {
        const val = parseFloat(wagmiBalance.formatted);
        return isNaN(val) ? 0 : val;
    }
    return isNaN(storeBalance) ? 0 : storeBalance;
  }, [wagmiBalance, storeBalance]);

  const [showWin, setShowWin] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOpeningShop, setIsOpeningShop] = useState(false);

  // --- Auto-Connect GameServer (Backend) ---
  useEffect(() => {
    // Connect to game server if not connected
    // Note: Server authentication might need to be updated to support Privy explicitly in the future
    if (!connected && connectServer) {
        connectServer();
    }
  }, [connected, connectServer]);

  // --- Asset Synchronization ---
  useEffect(() => {
    // Sync tCROSS balance (using 'tcross' key)
    if (assets && typeof assets['tcross'] === 'number') {
      // Prevent infinite loop: only update if different
      if (storeBalance !== assets['tcross']) {
          setBalance(assets['tcross']);
      }
    }
  }, [assets, setBalance, storeBalance]);

  // --- Process Bets (Burn) ---
  useEffect(() => {
    if (pendingBet !== null && pendingBet > 0 && !isProcessing) {
        setIsProcessing(true);
        // Convert USD Bet to Tokens
        const tokenAmount = pendingBet / tokenPrice;
        
        burnAsset('tcross', tokenAmount)
            .then(() => {
                clearPendingBet();
            })
            .catch(err => {
                console.error("Bet failed:", err);
            })
            .finally(() => setIsProcessing(false));
    }
  }, [pendingBet, burnAsset, clearPendingBet, isProcessing, tokenPrice]);

  // --- Process Wins (Mint) ---
  useEffect(() => {
    if (pendingWin !== null && pendingWin > 0 && !isProcessing) {
        setIsProcessing(true);
        // Convert USD Win to Tokens
        const tokenAmount = pendingWin / tokenPrice;

        mintAsset('tcross', tokenAmount)
            .then(() => {
                clearPendingWin();
            })
            .catch(err => {
                console.error("Win claim failed:", err);
            })
            .finally(() => setIsProcessing(false));
    }
  }, [pendingWin, mintAsset, clearPendingWin, isProcessing, tokenPrice]);


  // Win Notification logic
  useEffect(() => {
    if (lastWinAmount > 0) {
      setShowWin(true);
      const t = setTimeout(() => {
        setShowWin(false);
        setLastWinAmount(0);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [lastWinAmount, setLastWinAmount]);

  // Price Trend logic
  useEffect(() => {
    setPrevPrice(currentPrice);
  }, [currentPrice]);

  const trend = currentPrice >= prevPrice ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#00ff9d' : '#ff3b30';

  const handleConnect = () => {
    setIsLoginModalOpen(true);
  };

  const handleDisconnect = async () => {
    await logout();
    // disconnectServer(); // Optional
  };

  const openShop = async () => {
    if (!server) return;
    setIsOpeningShop(true);
    try {
        const url = await server.getCrossRampShopUrl("en");
        if (url) window.open(url, "CrossRampShop", "width=1200,height=800");
    } catch (e) {
        console.error("Failed to open shop:", e);
    } finally {
        setIsOpeningShop(false);
    }
  };

  // Formatting: $0,000.00
  const fmtUSD = (val: number) => {
    if (isNaN(val)) return '$0.00';
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Formatting: 0.00 Tokens
  const fmtTokens = (val: number) => {
    if (isNaN(val)) return '0.00';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="ui-overlay pointer-events-none font-sans">
      {/* --- Top Left: Main Ticker --- */}
      <div className="widget-panel top-left glass-panel">
        <div className="panel-row flex items-center gap-3">
          <div className="icon-box neon-border flex items-center justify-center w-8 h-8 rounded bg-black/40 border border-white/10">
            <Target size={16} color="#fff" />
          </div>
          <div className="col flex flex-col">
            <span className="label text-[9px] tracking-widest text-cyan-400 font-bold mb-0.5">ETH-USDT SWAP</span>
            <div className="value-row flex items-center gap-2">
              <span className="value-lg text-xl font-bold font-mono tracking-wider text-white">
                {fmtUSD(currentPrice)}
              </span>
              {trend === 'up' ? 
                <TrendingUp size={14} color={trendColor} /> : 
                <TrendingDown size={14} color={trendColor} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* --- Top Center: Minimal Win Notification Bar --- */}
      <div className={`win-bar ${showWin ? 'active' : ''} glass-panel flex items-center justify-center gap-3`}>
        <CheckCircle2 size={16} className="text-emerald-400" />
        <span className="text-gray-300 font-bold text-xs uppercase tracking-wide">You won</span>
        <span className="text-yellow-400 font-mono font-bold text-sm">
          {fmtUSD(lastWinAmount)}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          (+{fmtTokens(lastWinAmount / tokenPrice)} XFI)
        </span>
      </div>

      {/* --- Bottom Left: Balance & Wallet --- */}
      <div className="widget-panel bottom-left glass-panel pointer-events-auto flex items-center gap-4">
        {!authenticated ? (
          <button 
            onClick={handleConnect}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-md transition-all font-bold tracking-wide uppercase text-xs shadow-lg shadow-blue-500/20"
          >
            <Wallet size={16} />
            Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="panel-row flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5">
              <div className="relative group">
                <img 
                    src={Assets.ui.icons.tcross.url} 
                    alt="tCross Token" 
                    className="w-10 h-10 rounded-full border border-yellow-500/30 shadow-[0_0_10px_rgba(255,215,0,0.2)] transition-transform group-hover:scale-105"
                />
                <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border border-white/20 shadow-lg">
                    <ShoppingBag size={8} className="text-white" />
                </div>
              </div>
              <div className="col flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    <span className="label text-[10px] tracking-widest text-yellow-400 font-bold mb-0.5 uppercase">
                        XFI
                    </span>
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="value-md text-lg font-bold text-white font-mono tracking-wide">
                    {fmtTokens(displayBalance)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                    ≈ {fmtUSD(displayBalance * tokenPrice)}
                    </span>
                </div>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* Account Info & Disconnect */}
            <div className="flex flex-col items-end mr-2">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Connected Wallet</span>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
                </span>
                <span className="text-[8px] text-gray-600 font-mono">
                    {crossTestnet.name}
                </span>
            </div>
            
            <button 
                onClick={handleDisconnect}
                className="w-8 h-8 rounded-full bg-red-900/20 hover:bg-red-900/40 flex items-center justify-center border border-red-500/20 transition-colors group"
                title="Disconnect Wallet"
            >
                <LogOut size={14} className="text-red-400 opacity-70 group-hover:opacity-100" />
            </button>
          </div>
        )}
      </div>

      {/* --- Bottom Right: Bet Controls --- */}
      <div className="widget-panel bottom-right glass-panel pointer-events-auto">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gray-500 font-mono">1 XFI = {fmtUSD(tokenPrice)}</span>
            <span className="label-center text-[9px] tracking-[0.2em] text-gray-400 font-bold uppercase">BET SIZE (USD)</span>
          </div>
          <div className="bet-grid grid grid-cols-3 gap-1.5">
            {[1, 5, 10, 25, 50, 100].map(amt => {
              const reqTokens = amt / tokenPrice;
              const canAfford = displayBalance >= reqTokens;
              
              return (
                <button 
                    key={amt}
                    disabled={!canAfford}
                    className={`bet-btn px-4 py-2 text-xs font-mono font-bold rounded-md border transition-all duration-200 relative overflow-hidden group
                    ${betAmount === amt 
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(255,215,0,0.3)] scale-100 z-10' 
                        : canAfford
                            ? 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10'
                            : 'bg-red-900/10 text-red-700/50 border-red-900/10 cursor-not-allowed opacity-50'
                    }`}
                    onClick={() => setBetAmount(amt)}
                >
                    <div className="flex flex-col items-center">
                        <span className="relative z-10">${amt}</span>
                        <span className="text-[8px] opacity-60 font-normal">{reqTokens} XFI</span>
                    </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Help Popup --- */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4">
            <div className="bg-[#1a1b26] border border-white/10 rounded-xl max-w-md w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <HelpCircle size={18} className="text-cyan-400" />
                        <h3 className="text-white font-bold text-sm tracking-wide">HOW TO GET XFI</h3>
                    </div>
                    <button 
                        onClick={() => setShowHelp(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-500/20">
                        <div className="mt-1 min-w-[24px] h-6 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs">1</div>
                        <div>
                            <h4 className="text-gray-200 text-xs font-bold mb-1">Connect Wallet</h4>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Click the "Connect Wallet" button in the bottom left corner to link your CrossChain testnet wallet.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-900/20 border border-purple-500/20">
                        <div className="mt-1 min-w-[24px] h-6 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs">2</div>
                        <div>
                            <h4 className="text-gray-200 text-xs font-bold mb-1">Use the Faucet</h4>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Visit the <span className="text-purple-300 underline cursor-pointer hover:text-purple-200">CrossChain Faucet</span> to claim free XFI testnet tokens.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/20">
                        <div className="mt-1 min-w-[24px] h-6 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">3</div>
                        <div>
                            <h4 className="text-gray-200 text-xs font-bold mb-1">Start Betting</h4>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Once you have tokens, your balance will update automatically. Select a dollar amount to bet!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 text-center">
                    <button 
                        onClick={() => setShowHelp(false)}
                        className="w-full py-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                    >
                        GOT IT
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- Login Modal --- */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
};

export default UIOverlay;
