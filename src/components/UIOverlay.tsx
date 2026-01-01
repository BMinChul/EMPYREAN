import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameServer, useAsset } from '@agent8/gameserver';
import { Wallet, TrendingUp, TrendingDown, Target, CheckCircle2, ShoppingBag, Info, ArrowLeftRight } from 'lucide-react';
import GuidePopup from './GuidePopup';

const UIOverlay: React.FC = () => {
  const { 
    currentPrice, balance, tokenPrice, setTokenPrice,
    betAmount, setBetAmount, 
    lastWinAmount, setLastWinAmount,
    pendingBet, pendingWin, clearPendingBet, clearPendingWin, setBalance
  } = useGameStore();
  
  const { connected, server } = useGameServer();
  const { assets, burnAsset, mintAsset } = useAsset();
  
  const [showWin, setShowWin] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // --- Simulate Token Price Fluctuation ---
  useEffect(() => {
    const interval = setInterval(() => {
        // Random walk between 0.8 and 1.8
        const change = (Math.random() - 0.5) * 0.05;
        const newPrice = Math.max(0.8, Math.min(1.8, tokenPrice + change));
        setTokenPrice(newPrice);
    }, 2000);
    return () => clearInterval(interval);
  }, [tokenPrice, setTokenPrice]);

  // --- Asset Synchronization ---
  useEffect(() => {
    if (assets && typeof assets['credits'] === 'number') {
      setBalance(assets['credits']);
    }
  }, [assets, setBalance]);

  // --- Process Bets (Burn) ---
  useEffect(() => {
    if (pendingBet !== null && pendingBet > 0 && !isProcessing) {
        setIsProcessing(true);
        // Important: burnAsset expects the raw asset amount
        burnAsset('credits', pendingBet)
            .then(() => {
                clearPendingBet();
            })
            .catch(err => {
                console.error("Bet failed:", err);
            })
            .finally(() => setIsProcessing(false));
    }
  }, [pendingBet, burnAsset, clearPendingBet, isProcessing]);

  // --- Process Wins (Mint) ---
  useEffect(() => {
    if (pendingWin !== null && pendingWin > 0 && !isProcessing) {
        setIsProcessing(true);
        mintAsset('credits', pendingWin)
            .then(() => {
                clearPendingWin();
            })
            .catch(err => {
                console.error("Win claim failed:", err);
            })
            .finally(() => setIsProcessing(false));
    }
  }, [pendingWin, mintAsset, clearPendingWin, isProcessing]);


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

  const openShop = async () => {
    if (!connected || !server) return;
    try {
      const url = await server.getCrossRampShopUrl("en");
      const width = 1024;
      const height = 768;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(url, "CrossRampShop", `width=${width},height=${height},left=${left},top=${top}`);
    } catch (error) {
      console.error("Failed to open Shop:", error);
    }
  };

  const fmtPrice = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fmtTokens = (val: number) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <>
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
                  {fmtPrice(currentPrice)}
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
            {fmtPrice(lastWinAmount)}
          </span>
        </div>

        {/* --- Bottom Left: Balance & Token Info --- */}
        <div className="widget-panel bottom-left glass-panel pointer-events-auto flex items-center gap-4">
          
          {/* Token Balance Clickable Area */}
          <div 
            onClick={openShop}
            className="group cursor-pointer flex items-center gap-3 hover:bg-white/5 p-1 rounded-lg transition-colors"
          >
            <div className="relative">
              <div className="icon-box wallet neon-border flex items-center justify-center w-10 h-10 rounded bg-emerald-900/30 border border-emerald-500/30">
                <Wallet size={18} color="#00ff9d" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center border border-black">
                <ArrowLeftRight size={10} className="text-white" />
              </div>
            </div>
            
            <div className="col flex flex-col">
              <div className="flex items-center gap-2">
                <span className="label text-[9px] tracking-widest text-emerald-400 font-bold">tCROSS BALANCE</span>
                <span className="text-[9px] text-gray-500 bg-black/30 px-1 rounded">{connected ? 'CONNECTED' : 'OFFLINE'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                 <span className="value-md text-lg font-bold text-white font-mono tracking-wide">
                  {fmtTokens(balance)}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  ≈ {fmtPrice(balance * tokenPrice)}
                </span>
              </div>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10 mx-1"></div>

          {/* Token Info & Guide */}
          <div className="flex flex-col items-start gap-1 mr-2">
            <span className="text-[9px] text-gray-500 font-bold tracking-widest">TOKEN PRICE</span>
            <span className="text-xs font-mono text-indigo-300">{fmtPrice(tokenPrice)}</span>
          </div>

          <button 
            onClick={() => setShowGuide(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-200 border border-indigo-500/30 transition-all"
            title="How to get tCROSS?"
          >
            <Info size={16} />
          </button>
        </div>

        {/* --- Bottom Right: Bet Controls --- */}
        <div className="widget-panel bottom-right glass-panel pointer-events-auto">
          <div className="flex flex-col items-end gap-1">
            <div className="flex justify-between w-full mb-1">
               <span className="label-center text-[9px] tracking-[0.2em] text-gray-400 font-bold uppercase">BET SIZE (USD)</span>
               <span className="text-[9px] text-indigo-400 font-mono">Cost: {fmtTokens(betAmount / tokenPrice)} tCROSS</span>
            </div>
            
            <div className="bet-grid grid grid-cols-3 gap-1.5">
              {[1, 5, 10, 25, 50, 100].map(amt => (
                <button 
                  key={amt}
                  className={`bet-btn px-4 py-2 text-xs font-mono font-bold rounded-md border transition-all duration-200 relative overflow-hidden group
                    ${betAmount === amt 
                      ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(255,215,0,0.3)] scale-100 z-10' 
                      : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10'
                    }`}
                  onClick={() => setBetAmount(amt)}
                >
                  <span className="relative z-10">${amt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showGuide && <GuidePopup onClose={() => setShowGuide(false)} />}
    </>
  );
};

export default UIOverlay;
