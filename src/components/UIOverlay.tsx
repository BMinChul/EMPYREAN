import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect, useBalance, useSendTransaction, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { Wallet, TrendingUp, TrendingDown, Target, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Zap, LogOut } from 'lucide-react';
import Assets from '../assets.json';
import { crossTestnet } from '../wagmi';

const HOUSE_WALLET = '0x00837a0d1d51655ac5501e96bb53b898ae03c9c1';

const UIOverlay: React.FC = () => {
  const { 
    currentPrice, balance: storeBalance, betAmount, setBetAmount, 
    lastWinAmount, setLastWinAmount,
    pendingBet, confirmBet, cancelBet, setBalance,
    autoBet, setUserAddress
  } = useGameStore();
  
  // WalletConnect / Reown Hooks
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  // Native Token Balance (CROSS)
  const { data: balanceData } = useBalance({ address });
  const { sendTransactionAsync } = useSendTransaction();

  // Safe Balance Calculation
  const displayBalance = React.useMemo(() => {
    return isNaN(storeBalance) ? 0 : storeBalance;
  }, [storeBalance]);

  const [showWin, setShowWin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevPrice, setPrevPrice] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Bet Selector State
  const [isBetDropdownOpen, setIsBetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Sync Address to Store ---
  useEffect(() => {
      setUserAddress(address || null);
  }, [address, setUserAddress]);

  // --- Asset Synchronization ---
  useEffect(() => {
    // Sync CROSS balance (Native Token)
    if (balanceData) {
      const nativeBal = Number(balanceData.formatted);
      // Only update store if significant difference (avoid loops)
      if (Math.abs(storeBalance - nativeBal) > 0.0001) {
          setBalance(nativeBal);
      }
    }
  }, [balanceData, setBalance, storeBalance]);

  // --- Process Bets (Native Transfer) ---
  const processBet = React.useCallback(() => {
    if (!pendingBet || isProcessing) return;
    
    setIsProcessing(true);
    const amountStr = pendingBet.amount.toString();
    
    // Send to House Wallet
    sendTransactionAsync({
      to: HOUSE_WALLET,
      value: parseEther(amountStr) 
    })
        .then(async (hash) => {
            if (publicClient) {
                // Wait for Block Confirmation (Receipt)
                await publicClient.waitForTransactionReceipt({ hash });
            }
            confirmBet(hash); // Confirms transaction ONLY after mining
        })
        .catch(err => {
            console.error("Bet failed:", err);
            cancelBet(); // Refund and stop loop
            
            // Friendly error message
            let msg = "Transaction Failed";
            if (err.message?.includes("User rejected")) msg = "Bet Cancelled by User";
            else if (err.message?.includes("insufficient funds")) msg = "Insufficient Funds";
            
            setErrorMessage(msg);
            setTimeout(() => setErrorMessage(null), 3000);
        })
        .finally(() => setIsProcessing(false));
  }, [pendingBet, isProcessing, sendTransactionAsync, confirmBet, cancelBet]);

  useEffect(() => {
    // Always auto-process since autoBet is true
    if (pendingBet && autoBet && !isProcessing) {
        processBet();
    }
  }, [pendingBet, autoBet, isProcessing, processBet]);


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

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trend = currentPrice >= prevPrice ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#00ff9d' : '#ff3b30';

  const handleConnect = () => {
    open({ view: 'Connect' });
  };

  const handleDisconnect = () => {
    disconnect();
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

  // Formatting: 0.00 CROSS
  const fmtTokens = (val: number) => {
    if (isNaN(val)) return '0.00';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const betOptions = [0.1, 0.5, 1, 5, 10];

  return (
    <div className="ui-overlay pointer-events-none font-sans">
      
      {/* --- Top Container: Price & Bet Selector --- */}
      <div className="fixed top-6 left-6 flex items-start gap-3 z-30">
        
        {/* Price Widget */}
        <div className="glass-panel pointer-events-auto flex items-center gap-3 px-4 py-2 min-h-[52px] shadow-lg shadow-black/40">
          <div className="icon-box neon-border flex items-center justify-center w-8 h-8 rounded bg-black/40 border border-white/10 shrink-0">
            <Target size={16} color="#fff" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] tracking-widest text-cyan-400 font-bold mb-0.5 whitespace-nowrap">ETH-USDT SWAP</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono tracking-wider text-white leading-none">
                {fmtUSD(currentPrice)}
              </span>
              {trend === 'up' ? 
                <TrendingUp size={14} color={trendColor} /> : 
                <TrendingDown size={14} color={trendColor} />
              }
            </div>
          </div>
        </div>

        {/* Bet Selector Widget (Matching Style) */}
        <div className="relative pointer-events-auto" ref={dropdownRef}>
            <button 
                onClick={() => setIsBetDropdownOpen(!isBetDropdownOpen)}
                className="glass-panel flex items-center justify-between gap-4 px-4 py-2 min-h-[52px] min-w-[150px] hover:border-white/20 transition-all active:scale-95 shadow-lg shadow-black/40 group"
            >
                <div className="flex flex-col items-start">
                    <span className="text-[9px] tracking-widest text-gray-400 font-bold mb-0.5 uppercase group-hover:text-yellow-400 transition-colors">BET AMOUNT</span>
                    <span className="text-lg font-bold font-mono text-yellow-400 tracking-wide leading-none">
                        {betAmount} CR
                    </span>
                </div>
                {isBetDropdownOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {/* Dropdown Menu */}
            {isBetDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-full bg-[#1a1b26]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-top-2">
                    {betOptions.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => {
                                setBetAmount(opt);
                                setIsBetDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left font-mono font-bold transition-all flex items-center justify-between border-b border-white/5 last:border-0
                                ${betAmount === opt ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/10 hover:text-white hover:pl-5'}
                            `}
                        >
                            <span>{opt} CR</span>
                            {betAmount === opt && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(255,215,0,0.8)]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>

      </div>

      {/* --- Top Center: Win Notification Bar --- */}
      <div className={`win-bar ${showWin ? 'active' : ''} glass-panel flex items-center justify-center gap-3`}>
        <CheckCircle2 size={16} className="text-emerald-400" />
        <span className="text-gray-300 font-bold text-xs uppercase tracking-wide">Payout Pending</span>
        <span className="text-yellow-400 font-mono font-bold text-sm">
          {fmtTokens(lastWinAmount)} CROSS
        </span>
      </div>

      {/* --- Error Toast --- */}
      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="glass-panel px-4 py-2 flex items-center gap-2 border-red-500/30 bg-red-900/40">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-red-200 font-bold text-xs tracking-wide">{errorMessage}</span>
            </div>
        </div>
      )}

      {/* --- Manual Confirm Button (Fallback) --- */}
      {pendingBet && !autoBet && !isProcessing && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in duration-200 pointer-events-auto">
             <button 
                onClick={processBet}
                className="bg-yellow-400 text-black font-bold px-8 py-4 rounded-lg shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
                <Zap size={20} className="fill-black" />
                CONFIRM {pendingBet.amount} CROSS
            </button>
            <div className="text-center mt-2">
                <button 
                    onClick={cancelBet}
                    className="text-white/60 text-xs hover:text-white underline"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* --- Bottom Left: Balance & Wallet --- */}
      <div className="widget-panel bottom-left glass-panel pointer-events-auto flex items-center gap-4">
        {!isConnected ? (
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
              <div 
                className="relative group transition-transform hover:scale-105"
                title="CROSS Token"
              >
                <img 
                    src={Assets.ui.icons.tcross.url} 
                    alt="CROSS Token" 
                    className="w-10 h-10 rounded-full border border-yellow-500/30 shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                />
              </div>
              <div className="col flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    <span className="label text-[10px] tracking-widest text-yellow-400 font-bold mb-0.5 uppercase">
                        CROSS
                    </span>
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="value-md text-lg font-bold text-white font-mono tracking-wide">
                    {fmtTokens(displayBalance)}
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

    </div>
  );
};

export default UIOverlay;
