import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameServer, useAsset } from '@agent8/gameserver';
import { Wallet, TrendingUp, TrendingDown, Target, CheckCircle2, ShoppingBag, ExternalLink, Copy } from 'lucide-react';

const EUP_TOKEN_ADDRESS = "0xCc887612C738c88785e71388F1B49A4145949D32";
const FORGE_URL = "https://faucet.crossramp.io"; // Default Forge/Faucet URL

const UIOverlay: React.FC = () => {
  const { currentPrice, balance, betAmount, setBetAmount, lastWinAmount, setLastWinAmount, setBalance } = useGameStore();
  const { connected, server, loading } = useGameServer();
  const { assets } = useAsset();
  const [showWin, setShowWin] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);
  const [copied, setCopied] = useState(false);

  // Copy Address logic
  const copyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(EUP_TOKEN_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sync Server Asset to Game Store
  useEffect(() => {
    if (assets && typeof assets['credit'] === 'number') {
      setBalance(assets['credit']);
    }
  }, [assets, setBalance]);

  // Crossramp Shop
  const openShop = async () => {
    if (!connected || !server || loading) return;
    
    try {
      // Ensure we have a token before trying to get the URL
      // Some versions of the SDK might not expose getAccessToken directly, 
      // but checking connected is usually enough.
      // We wrap in try-catch to handle "Missing auth token" gracefully.
      
      const url = await server.getCrossRampShopUrl("en");
      if (url) {
        window.open(url, "CrossRampShop", "width=1024,height=768");
      }
    } catch (error) {
      console.error("Failed to open Shop:", error);
      // Optional: Try to force login if method exists, or just alert user
      // if (server.login) server.login();
    }
  };

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

  // Formatting: $0,000.00
  const fmtPrice = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Formatting: $00.00
  const fmtBalance = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
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
      {/* "Minimal, small 'You won $XX.XX' bar" */}
      <div className={`win-bar ${showWin ? 'active' : ''} glass-panel flex items-center justify-center gap-3`}>
        <CheckCircle2 size={16} className="text-emerald-400" />
        <span className="text-gray-300 font-bold text-xs uppercase tracking-wide">You won</span>
        <span className="text-yellow-400 font-mono font-bold text-sm">
          {fmtBalance(lastWinAmount)}
        </span>
      </div>

      {/* --- Bottom Left: Balance & Forge --- */}
      <div className="fixed bottom-4 left-4 flex flex-col gap-3 pointer-events-auto">
        
        {/* Forge / Get Tokens Link */}
        <div className="glass-panel flex flex-col gap-2 p-3 transition-colors hover:bg-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <ExternalLink size={12} className="text-purple-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-purple-300 font-bold tracking-wider">NEED TOKENS?</span>
                <span className="text-[10px] text-white font-mono">Get EUP at Forge</span>
              </div>
            </div>
            <a 
              href={FORGE_URL}
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white rounded transition-colors"
            >
              OPEN
            </a>
          </div>
          
          {/* Token Address Copy */}
          <div 
            className="flex items-center justify-between gap-2 bg-black/40 px-2 py-1.5 rounded border border-white/5 cursor-pointer hover:border-white/20 group"
            onClick={copyAddress}
            title="Copy EUP Token Address"
          >
            <span className="text-[9px] font-mono text-gray-400 group-hover:text-gray-300 truncate max-w-[120px]">
              {EUP_TOKEN_ADDRESS}
            </span>
            {copied ? (
              <CheckCircle2 size={10} className="text-emerald-400" />
            ) : (
              <Copy size={10} className="text-gray-500 group-hover:text-white" />
            )}
          </div>
        </div>

        {/* Balance / Shop Button */}
        <div 
          className={`widget-panel glass-panel cursor-pointer transition-colors ${connected && !loading ? 'hover:bg-white/5' : 'opacity-50 cursor-not-allowed'}`} 
          onClick={connected && !loading ? openShop : undefined}
        >
          <div className="panel-row flex items-center gap-3">
            <div className={`icon-box wallet neon-border flex items-center justify-center w-8 h-8 rounded ${connected ? 'bg-emerald-900/30 border-emerald-500/30' : 'bg-gray-800 border-gray-600'}`}>
              <Wallet size={16} color={connected ? "#00ff9d" : "#888"} />
            </div>
            <div className="col flex flex-col">
              <div className="flex items-center gap-1">
                <span className={`label text-[9px] tracking-widest font-bold mb-0.5 ${connected ? 'text-emerald-400' : 'text-gray-500'}`}>BALANCE</span>
                {connected && <div className="bg-emerald-500/20 px-1 rounded text-[8px] text-emerald-300">Wallet</div>}
              </div>
              <span className="value-md text-lg font-bold text-white font-mono tracking-wide">
                {loading ? '...' : fmtBalance(balance)}
              </span>
            </div>
            {connected && !loading && <ShoppingBag size={14} className="text-emerald-400/50 ml-1" />}
          </div>
        </div>
      </div>

      {/* --- Bottom Right: Bet Controls --- */}
      <div className="widget-panel bottom-right glass-panel pointer-events-auto">
        <div className="flex flex-col items-end gap-1">
          <span className="label-center text-[9px] tracking-[0.2em] text-gray-400 mb-2 font-bold uppercase">BET SIZE</span>
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
  );
};

export default UIOverlay;
