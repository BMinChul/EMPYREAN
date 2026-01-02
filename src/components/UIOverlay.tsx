import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect, useBalance, useSendTransaction, usePublicClient } from 'wagmi';
import { parseEther, parseGwei } from 'viem';
import { Wallet, TrendingUp, TrendingDown, Target, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Zap, LogOut, Trophy, X, Clock, History, HelpCircle, Loader2 } from 'lucide-react';
import Assets from '../assets.json';
import { crossTestnet } from '../wagmi';

const HOUSE_WALLET = '0x00837a0d1d51655ac5501e96bb53b898ae03c9c1';

const UIOverlay: React.FC = () => {
  const { 
    currentPrice, balance: storeBalance, betAmount, setBetAmount, 
    lastWinAmount, setLastWinAmount,
    pendingBet, confirmBet, cancelBet, setBalance,
    clearPendingBet, // Added for safe local cleanup
    autoBet, setUserAddress,
    connectionError, setConnectionError,
    leaderboard, fetchLeaderboard,
    userStats, fetchUserStats,
    registerServerBet
  } = useGameStore();
  
  // WalletConnect / Reown Hooks
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  // Native Token Balance (CROSS)
  const { data: balanceData, refetch: refetchBalance } = useBalance({ 
    address,
    chainId: crossTestnet.id,
    query: {
        refetchInterval: 5000, // Refresh every 5s
        staleTime: 2000,
        retry: true
    }
  });
  const { sendTransactionAsync } = useSendTransaction();

  // Safe Balance Calculation
  // Prioritize real Wallet Balance as requested by user
  const displayBalance = React.useMemo(() => {
    if (balanceData) {
        return Number(balanceData.formatted);
    }
    return isNaN(storeBalance) ? 0 : storeBalance;
  }, [balanceData, storeBalance]);

  const [showWin, setShowWin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevPrice, setPrevPrice] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'confirming'>('idle');
  
  // Bet Selector State
  const [isBetDropdownOpen, setIsBetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'placed' | 'refunded' | 'won'>('placed');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Poll Leaderboard
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Fetch User Stats when History Modal Opens
  useEffect(() => {
    if (isHistoryOpen && address) {
        fetchUserStats(address);
    }
  }, [isHistoryOpen, address, fetchUserStats]);

  // --- Sync Address to Store ---
  useEffect(() => {
      setUserAddress(address || null);
      if (address) {
          refetchBalance();
      }
  }, [address, setUserAddress, refetchBalance]);

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
    setTxStatus('signing');
    const amountStr = pendingBet.amount.toString();
    
    const betId = pendingBet.id; // Capture ID at start of process
    let txHash: string | null = null; // Capture hash to prevent ghost refunds

    // Send to House Wallet
    sendTransactionAsync({
      to: HOUSE_WALLET,
      value: parseEther(amountStr),
      maxFeePerGas: parseGwei('13'), // Base Fee (8) + Priority Fee (5)
      maxPriorityFeePerGas: parseGwei('5')
    })
        .then(async (hash) => {
            txHash = hash; // Store hash immediately
            setTxStatus('confirming'); // Update status to show spinner
            if (publicClient) {
                // Wait for Block Confirmation (Receipt)
                await publicClient.waitForTransactionReceipt({ 
                    hash,
                    confirmations: 1, 
                    pollingInterval: 2000, // Check every 2s
                    retryCount: 25,        // Try 25 times (Total ~50s)
                    timeout: 45000         // Explicit timeout of 45s (Reduced from 120s)
                });
            }
            
            // Check for Orphaned Transaction (Bet expired while mining)
            const currentStoreState = useGameStore.getState();
            const currentPendingId = currentStoreState.pendingBet?.id;
            
            // Late Arrival Check (New Logic)
            const now = Date.now();
            const expiry = pendingBet.expiryTimestamp || (now + 60000);
            
            // Condition A: On Time -> Proceed
            if (now <= expiry && currentPendingId === betId) {
                // Scenario A: Normal -> Confirm locally
                confirmBet(betId, hash); 
                
                // CRITICAL: Sync Hash to Server immediately
                if (pendingBet) {
                    registerServerBet({ ...pendingBet, txHash: hash });
                }
            } else {
                // Condition B: Too Late (or ID mismatch) -> Refund
                console.warn("⚠️ Transaction Confirmed but Too Late/Orphaned. Requesting refund.", { betId, now, expiry });
                
                // Trigger server refund manually since UI box is gone or invalid
                await currentStoreState.claimServerPayout(betId, true, hash);
                
                // Show specific feedback
                setErrorMessage("Round ended during transaction. Refunding...");
                setTimeout(() => setErrorMessage(null), 5000);
                
                // Clear local state without confirming visual box
                clearPendingBet();
            }
        })
        .catch(err => {
            const errorMessageStr = err?.message || "";
            const isUserRejection = errorMessageStr.includes("User rejected") || errorMessageStr.includes("rejected the request");
            const isTimeout = errorMessageStr.includes("Variables.timeout") || errorMessageStr.includes("timed out");

            // Only log as error if it's NOT a user rejection
            if (isUserRejection) {
                console.warn("Transaction cancelled by user");
            } else if (isTimeout) {
                console.warn("⚠️ Transaction Timeout (Network Slow).");
            } else {
                console.error("Bet failed:", err);
            }

            // Refund Check: If we have a hash, we MUST assume it might confirm later
            if (txHash) {
                console.warn("⚠️ Transaction failed/timed-out but Hash exists. Triggering safety refund.", txHash);
                cancelBet(txHash); 
            } else {
                clearPendingBet(); // No hash = No money moved -> Just clear local state
            }
            
            // Friendly error message
            let msg = "Transaction Failed";
            if (isUserRejection) msg = "Bet Cancelled by User";
            else if (errorMessageStr.includes("insufficient funds")) msg = "Insufficient Funds";
            else if (isTimeout) msg = "Network slow. Refunds processed automatically.";
            
            setErrorMessage(msg);
            setTimeout(() => setErrorMessage(null), 4000);
        })
        .finally(() => {
            setIsProcessing(false);
            setTxStatus('idle');
        });
  }, [pendingBet, isProcessing, sendTransactionAsync, confirmBet, cancelBet]);

  useEffect(() => {
    // Always auto-process since autoBet is true
    if (pendingBet && autoBet && !isProcessing) {
        processBet();
    }
  }, [pendingBet, autoBet, isProcessing, processBet]);


  // Handle Connection Error Signal from Phaser
  useEffect(() => {
    if (connectionError) {
        setErrorMessage("Please Connect Wallet to Bet");
        open({ view: 'Connect' });
        
        // Reset signal immediately
        setConnectionError(false);

        // Clear error message after 3s
        setTimeout(() => setErrorMessage(null), 3000);
    }
  }, [connectionError, setConnectionError, open]);

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
      {/* Mobile: Vertical Stack (flex-col), Desktop: Horizontal (flex-row) */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 z-30 scale-75 origin-top-left md:scale-100">
        
        {/* Price Widget */}
        <div className="glass-panel pointer-events-auto flex items-center gap-3 px-3 py-1.5 md:px-4 md:py-2 min-h-[44px] md:min-h-[52px] shadow-lg shadow-black/40">
          <div className="icon-box neon-border flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded bg-black/40 border border-white/10 shrink-0">
            <Target size={14} className="md:w-[16px] md:h-[16px]" color="#fff" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[9px] tracking-widest text-cyan-400 font-bold mb-0.5 whitespace-nowrap">ETH-USDT SWAP</span>
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-bold font-mono tracking-wider text-white leading-none">
                {fmtUSD(currentPrice)}
              </span>
              {trend === 'up' ? 
                <TrendingUp size={12} className="md:w-[14px] md:h-[14px]" color={trendColor} /> : 
                <TrendingDown size={12} className="md:w-[14px] md:h-[14px]" color={trendColor} />
              }
            </div>
          </div>
        </div>

        {/* Bet Selector Widget (Matching Style) */}
        <div className="relative pointer-events-auto" ref={dropdownRef}>
            <button 
                onClick={() => setIsBetDropdownOpen(!isBetDropdownOpen)}
                className="glass-panel flex items-center justify-between gap-4 px-3 py-1.5 md:px-4 md:py-2 min-h-[44px] md:min-h-[52px] min-w-[120px] md:min-w-[150px] hover:border-white/20 transition-all active:scale-95 shadow-lg shadow-black/40 group"
            >
                <div className="flex flex-col items-start">
                    <span className="text-[8px] md:text-[9px] tracking-widest text-gray-400 font-bold mb-0.5 uppercase group-hover:text-yellow-400 transition-colors">BET AMOUNT</span>
                    <span className="text-base md:text-lg font-bold font-mono text-yellow-400 tracking-wide leading-none">
                        {betAmount} Cross
                    </span>
                </div>
                {isBetDropdownOpen ? <ChevronUp size={14} className="md:w-[16px] md:h-[16px] text-gray-400" /> : <ChevronDown size={14} className="md:w-[16px] md:h-[16px] text-gray-400" />}
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
                            <span>{opt} Cross</span>
                            {betAmount === opt && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(255,215,0,0.8)]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Leaderboard Trigger Button (Hidden on Desktop if prefering Top Right, but stacking here for now) 
            User requested: "Top Right Buttons: Keep the Sound/Guide buttons... Ensure they don't overlap... on mobile" 
            I'll keep Leaderboard here to minimize desktop layout changes.
        */}
        <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="glass-panel pointer-events-auto p-2 flex items-center justify-center hover:bg-yellow-500/20 hover:border-yellow-400/50 transition-all active:scale-95 shadow-lg shadow-black/40 group relative overflow-hidden"
            title="Hall of Fame"
        >
            <div className="absolute inset-0 bg-yellow-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <Trophy size={30} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
        </button>

      </div>

      {/* --- Top Right Container: Help Button --- */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 flex flex-col items-end gap-2 z-30 pointer-events-auto">
        <button
            onClick={() => setIsGuideOpen(true)}
            className="glass-panel p-2 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all active:scale-95 shadow-lg shadow-black/40 group relative overflow-hidden rounded-full"
            title="How to Play"
        >
            <div className="absolute inset-0 bg-cyan-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <HelpCircle size={30} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        </button>
      </div>

      {/* --- Top Center: Win Notification Bar --- */}
      <div className={`win-bar ${showWin ? 'active' : ''} glass-panel flex items-center justify-center gap-3`}>
        <CheckCircle2 size={16} className="text-emerald-400" />
        <span className="text-gray-300 font-bold text-[10px] md:text-sm uppercase tracking-wide">Payout Pending</span>
        <span className="text-yellow-400 font-mono font-bold text-sm md:text-2xl">
          {fmtTokens(lastWinAmount)} CROSS
        </span>
      </div>

      {/* --- Error Toast --- */}
      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 w-[90%] md:w-auto flex justify-center">
            <div className="glass-panel px-4 py-2 flex items-center gap-2 border-red-500/30 bg-red-900/40">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-red-200 font-bold text-xs tracking-wide">{errorMessage}</span>
            </div>
        </div>
      )}

      {/* --- Transaction Status Indicator --- */}
      {(txStatus !== 'idle') && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 w-[90%] md:w-auto flex justify-center">
            <div className="glass-panel px-6 py-3 flex items-center gap-3 border-blue-500/30 bg-blue-900/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Loader2 size={20} className="text-blue-400 animate-spin" />
                <span className="text-blue-200 font-bold text-sm tracking-wide">
                    {txStatus === 'signing' ? 'Please Sign in Wallet...' : 'Confirming on Blockchain...'}
                </span>
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
      {/* Mobile: Full Width or Stacked, Desktop: Original Layout */}
      <div className="widget-panel bottom-left glass-panel pointer-events-auto flex flex-col-reverse md:flex-row items-stretch md:items-center gap-2 md:gap-4 !left-4 !right-4 md:!right-auto md:!left-6 !bottom-4 md:!bottom-6 md:w-auto w-[calc(100%-32px)] scale-75 origin-bottom-left md:scale-100">
        {!isConnected ? (
          <button 
            onClick={handleConnect}
            className="flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-md transition-all font-bold tracking-wide uppercase text-[10px] md:text-xs shadow-lg shadow-blue-500/20 w-full md:w-auto"
          >
            <Wallet size={16} />
            Connect Wallet
          </button>
        ) : (
          <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
            <button 
                onClick={() => setIsHistoryOpen(true)}
                className="panel-row flex items-center gap-2 md:gap-3 bg-black/40 p-1.5 md:p-2 rounded-lg border border-white/5 hover:bg-white/5 transition-colors active:scale-95 group w-full md:w-auto"
            >
              <div 
                className="relative group-hover:scale-105 transition-transform"
                title="CROSS Token"
              >
                <img 
                    src={Assets.ui.icons.tcross.url} 
                    alt="CROSS Token" 
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-yellow-500/30 shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                />
              </div>
              <div className="col flex flex-col justify-center items-start text-left">
                <div className="flex items-center gap-2">
                    <span className="label text-[8px] md:text-[10px] tracking-widest text-yellow-400 font-bold mb-0.5 uppercase">
                        WALLET BALANCE
                    </span>
                    <History size={10} className="text-gray-500 group-hover:text-yellow-400 transition-colors" />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="value-md text-sm md:text-lg font-bold text-white font-mono tracking-wide group-hover:text-yellow-100 transition-colors">
                    {fmtTokens(displayBalance)}
                    </span>
                </div>
              </div>
            </button>

            <div className="hidden md:block w-px h-8 bg-white/10 mx-1" />

            {/* Account Info & Disconnect */}
            <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4 w-full md:w-auto">
                <div className="flex flex-col items-start md:items-end mr-0 md:mr-2">
                    <span className="text-[8px] md:text-[9px] text-gray-500 uppercase font-bold tracking-wider">Connected Wallet</span>
                    <span className="text-[9px] md:text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
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
          </div>
        )}
      </div>

      {/* --- Leaderboard Modal --- */}
      {isLeaderboardOpen && (
          <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsLeaderboardOpen(false)}
          >
              <div 
                  className="glass-panel w-full max-w-md pointer-events-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border-yellow-500/30 shadow-[0_0_50px_rgba(255,215,0,0.15)]"
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40">
                              <Trophy size={16} className="text-yellow-400" />
                          </div>
                          <div>
                              <h3 className="text-yellow-400 font-bold text-sm tracking-wider uppercase">Hall of Fame</h3>
                              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Total Earnings</span>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsLeaderboardOpen(false)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                          <X size={18} className="text-gray-400 hover:text-white" />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-4 bg-black/20 max-h-[60vh] overflow-y-auto">
                      {leaderboard && leaderboard.length > 0 ? (
                          leaderboard.slice(0, 5).map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 mb-2 rounded-lg bg-white/5 border border-white/5 hover:border-yellow-500/30 hover:bg-white/10 transition-all group">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-8 h-8 rounded flex items-center justify-center font-bold font-mono text-sm border 
                                          ${idx === 0 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 
                                            idx === 1 ? 'bg-gray-400/20 border-gray-400/50 text-gray-300' : 
                                            idx === 2 ? 'bg-amber-700/20 border-amber-700/50 text-amber-500' : 
                                            'bg-white/5 border-white/10 text-gray-500'}`}>
                                          #{idx + 1}
                                      </div>
                                      <div className="flex flex-col">
                                          <span className="text-xs text-gray-300 font-mono font-bold group-hover:text-white transition-colors">
                                              {entry.userAddress}
                                          </span>
                                          <span className="text-[10px] text-gray-500">
                                              Rank {idx + 1} Player
                                          </span>
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                      <span className="text-sm font-bold text-emerald-400 font-mono shadow-emerald-500/20 drop-shadow-sm">
                                          +{entry.totalPayout.toLocaleString()}
                                      </span>
                                      <span className="text-[9px] text-gray-500 font-mono uppercase">
                                          Total Won
                                      </span>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="py-8 text-center">
                              <Trophy size={32} className="mx-auto text-gray-700 mb-2 opacity-50" />
                              <span className="text-xs text-gray-500 italic">No champions yet...</span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* --- Guide Modal --- */}
      {isGuideOpen && (
          <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsGuideOpen(false)}
          >
              <div 
                  className="glass-panel w-[90%] max-w-md pointer-events-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.15)]"
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
                              <HelpCircle size={16} className="text-cyan-400" />
                          </div>
                          <h3 className="text-cyan-400 font-bold text-sm tracking-wider uppercase">How to Play</h3>
                      </div>
                      <button 
                          onClick={() => setIsGuideOpen(false)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                          <X size={18} className="text-gray-400 hover:text-white" />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 bg-black/20 max-h-[70vh] overflow-y-auto space-y-6 text-sm">
                      {/* Step 1 */}
                      <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-cyan-400 shrink-0">1</div>
                          <div>
                              <h4 className="text-white font-bold mb-1">Select Bet Amount</h4>
                              <p className="text-gray-400 text-xs leading-relaxed">
                                  Use the dropdown menu to choose your wager in <span className="text-yellow-400 font-bold">CROSS</span> tokens. 
                                  You need to connect your wallet first.
                              </p>
                          </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-cyan-400 shrink-0">2</div>
                          <div>
                              <h4 className="text-white font-bold mb-1">Place Your Bet</h4>
                              <p className="text-gray-400 text-xs leading-relaxed">
                                  Click on any grid cell in the <span className="text-emerald-400 font-bold">FUTURE</span> area. 
                                  Predict where the price line will go!
                              </p>
                          </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-cyan-400 shrink-0">3</div>
                          <div>
                              <h4 className="text-white font-bold mb-1">Win Big</h4>
                              <p className="text-gray-400 text-xs leading-relaxed">
                                  If the price line hits your box, you win! 
                                  Payouts are automated and sent directly to your wallet.
                              </p>
                          </div>
                      </div>

                      {/* Info Box */}
                      <div className="p-3 rounded bg-cyan-900/20 border border-cyan-500/20 flex gap-3 mt-4">
                          <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-cyan-200 leading-relaxed">
                              This game runs on the Cross Testnet. Ensure you have testnet CROSS tokens. 
                              Bets are processed on-chain.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- History Modal --- */}
      {isHistoryOpen && (
          <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsHistoryOpen(false)}
          >
              <div 
                  className="glass-panel w-full max-w-lg pointer-events-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border-white/10 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
                              <History size={16} className="text-cyan-400" />
                          </div>
                          <div>
                              <h3 className="text-cyan-400 font-bold text-sm tracking-wider uppercase">Betting History</h3>
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">7-Day Win Rate:</span>
                                  <span className="text-[10px] font-bold text-emerald-400 font-mono">
                                      {userStats?.winRate ? `${(userStats.winRate * 100).toFixed(1)}%` : '0.0%'}
                                  </span>
                              </div>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsHistoryOpen(false)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                          <X size={18} className="text-gray-400 hover:text-white" />
                      </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex p-2 gap-2 bg-black/40 border-b border-white/5">
                      {(['placed', 'refunded', 'won'] as const).map((tab) => (
                          <button
                              key={tab}
                              onClick={() => setActiveHistoryTab(tab)}
                              className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all
                                  ${activeHistoryTab === tab 
                                      ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                              `}
                          >
                              {tab} ({userStats?.history[tab]?.length || 0})
                          </button>
                      ))}
                  </div>

                  {/* List Body */}
                  <div className="flex-1 p-4 bg-black/20 overflow-y-auto min-h-[300px] max-h-[50vh]">
                      {!userStats ? (
                          <div className="flex justify-center items-center h-full">
                              <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
                          </div>
                      ) : userStats.history[activeHistoryTab].length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full opacity-50">
                              <Clock size={32} className="text-gray-600 mb-2" />
                              <span className="text-xs text-gray-500">No records found</span>
                          </div>
                      ) : (
                          <div className="space-y-2">
                              {userStats.history[activeHistoryTab].map((item: any, idx: number) => {
                                  const isPaid = item.status === 'paid';
                                  const isRefunded = item.status === 'refunded';
                                  
                                  // Date Formatting (YYYY-MM-DD HH:mm:ss)
                                  let dateStr = "Unknown Date";
                                  try {
                                      if (item.createdAt) {
                                          dateStr = new Date(item.createdAt).toISOString().slice(0, 19).replace('T', ' ');
                                      }
                                  } catch (e) {
                                      console.warn("Invalid date:", item.createdAt);
                                  }

                                  return (
                                  <div key={idx} className={`flex items-center justify-between p-3 rounded border transition-colors ${
                                      isPaid 
                                      ? 'bg-yellow-400 border-yellow-400 text-black' 
                                      : 'bg-white/5 border-white/5 hover:border-white/20'
                                  }`}>
                                      <div className="flex flex-col gap-1">
                                          <span className={`text-[10px] font-mono flex items-center gap-1 ${isPaid ? 'text-black/70' : 'text-gray-400'}`}>
                                              {dateStr}
                                              {item.txHash && (
                                                  <a 
                                                      href={`https://testnet.crossscan.io/tx/${item.txHash}`} 
                                                      target="_blank" 
                                                      rel="noreferrer"
                                                      className={`ml-2 text-[9px] underline ${
                                                          isPaid 
                                                          ? 'text-black/70 hover:text-black decoration-black/30 hover:decoration-black' 
                                                          : 'text-blue-400 hover:text-blue-300 decoration-blue-400/30 hover:decoration-blue-300'
                                                      }`}
                                                      onClick={(e) => e.stopPropagation()}
                                                  >
                                                      {item.txHash.slice(0, 6)}...
                                                  </a>
                                              )}
                                          </span>
                                          <span className={`text-xs font-bold font-mono ${isPaid ? 'text-black' : 'text-white'}`}>
                                              {item.betAmount} CROSS
                                          </span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                          {activeHistoryTab === 'won' ? (
                                              <>
                                                  <span className="text-xs font-bold text-emerald-400 font-mono">
                                                      +{item.payoutAmount}
                                                  </span>
                                                  <span className="text-[9px] text-gray-500 font-mono">
                                                      {item.multiplier}x
                                                  </span>
                                              </>
                                          ) : (activeHistoryTab === 'refunded' || isRefunded) ? (
                                              <span className="text-[10px] text-orange-400 font-mono uppercase tracking-wide font-bold">
                                                  REFUNDED
                                              </span>
                                          ) : isPaid ? (
                                              <span className="text-xs font-bold text-black font-mono uppercase tracking-wide">
                                                  WON
                                              </span>
                                          ) : (
                                              <span className="text-[10px] text-gray-400 font-mono">
                                                  PENDING
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default UIOverlay;
