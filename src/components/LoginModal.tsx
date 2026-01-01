import React, { useEffect, useState } from 'react';
import { X, ChevronRight, Zap, Loader2, AlertTriangle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, ready, authenticated } = usePrivy();
  const [showTimeout, setShowTimeout] = useState(false);

  const [currentDomain, setCurrentDomain] = useState("");

  // Reset timeout when modal opens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.origin);
    }
    
    if (isOpen) {
      setShowTimeout(false);
      const timer = setTimeout(() => {
        if (!ready) setShowTimeout(true);
      }, 5000); // Show warning if not ready after 5s
      return () => clearTimeout(timer);
    }
  }, [isOpen, ready]);

  // Auto-close when authenticated
  useEffect(() => {
    if (authenticated && isOpen) {
      onClose();
    }
  }, [authenticated, isOpen, onClose]);

  if (!isOpen) return null;

  const handleCrossxLogin = () => {
    if (!ready) return;
    // Standard login flow (creates/uses embedded wallet)
    login(); 
  };

  const handleMetaMaskLogin = () => {
    if (!ready) return;
    // Wallet-specific login flow
    // Tapping specifically for external wallets
    login({ loginMethods: ['wallet'] });
  };

  const handleSocialLogin = () => {
    if (!ready) return;
    // Email/Social login flow
    login({ loginMethods: ['email', 'google', 'twitter', 'discord'] });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 pointer-events-auto">
      <div className="relative w-full max-w-[400px] bg-[#0f0f11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-xl font-bold text-white tracking-wide">Connect Wallet</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          
          {!ready ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-gray-400">
              {showTimeout ? (
                <div className="flex flex-col items-center text-center px-4 animate-in fade-in w-full">
                  <div className="p-3 bg-yellow-500/10 rounded-full mb-3 ring-1 ring-yellow-500/50">
                    <AlertTriangle className="text-yellow-500" size={32} />
                  </div>
                  
                  <h3 className="text-white font-bold text-lg mb-2">Configuration Required</h3>
                  
                  <div className="text-left w-full bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                    <p className="text-xs text-gray-300 leading-relaxed">
                      This error usually means the <strong>Privy App ID</strong> is missing or this domain is not whitelisted.
                    </p>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Step 1: Copy Domain</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentDomain);
                          // Visual feedback could be added here
                        }}
                        className="w-full flex items-center justify-between p-2 bg-emerald-900/20 border border-emerald-500/30 rounded hover:bg-emerald-900/40 hover:border-emerald-500/50 transition-all group cursor-pointer"
                      >
                        <code className="text-xs text-emerald-400 font-mono break-all">{currentDomain}</code>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase group-hover:text-emerald-400">Copy</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Step 2: Add to Dashboard</p>
                      <a 
                        href="https://dashboard.privy.io/apps" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
                      >
                        Go to Privy Dashboard &rarr; Settings &rarr; Basics
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-1 w-full">
                    <span className="text-[10px] text-gray-600 font-mono text-center">App ID Status</span>
                    <div className={`text-[10px] font-mono text-center p-1 rounded border ${
                      import.meta.env.VITE_PRIVY_APP_ID 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {import.meta.env.VITE_PRIVY_APP_ID 
                        ? `Loaded: ${import.meta.env.VITE_PRIVY_APP_ID.slice(0,6)}...` 
                        : 'MISSING IN .ENV'}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                  <p className="text-sm font-mono">Initializing Privy...</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* CROSSx Wallet Button */}
              <button 
                onClick={handleCrossxLogin}
                className="w-full group relative flex items-center justify-between p-4 bg-[#111f11] hover:bg-[#162916] border border-emerald-900/30 hover:border-emerald-500/50 rounded-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <Zap className="text-emerald-400 fill-emerald-400/20" size={20} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-emerald-100 font-bold text-sm">CROSSx Wallet</span>
                    <span className="text-emerald-500/60 text-xs">Log in or Sign up</span>
                  </div>
                </div>
                <ChevronRight className="text-emerald-700 group-hover:text-emerald-400 transition-colors" size={20} />
              </button>

              {/* MetaMask Button */}
              <button 
                onClick={handleMetaMaskLogin}
                className="w-full group relative flex items-center justify-between p-4 bg-[#1f1611] hover:bg-[#291d16] border border-orange-900/30 hover:border-orange-500/50 rounded-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                    {/* SVG for Fox/MetaMask placeholder */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-orange-400">
                      <path d="M21 7L12 3L3 7L12 21L21 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 7V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-orange-100 font-bold text-sm">MetaMask</span>
                    <span className="text-orange-500/60 text-xs">Desktop / Mobile</span>
                  </div>
                </div>
                <ChevronRight className="text-orange-700 group-hover:text-orange-400 transition-colors" size={20} />
              </button>

              {/* Email / Social Button */}
              <button 
                onClick={handleSocialLogin}
                className="w-full group relative flex items-center justify-between p-4 bg-[#16111f] hover:bg-[#1d1629] border border-purple-900/30 hover:border-purple-500/50 rounded-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 text-purple-400 font-bold font-mono">
                    V8
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-purple-100 font-bold text-sm">Email / Social</span>
                    <span className="text-purple-500/60 text-xs">Google, X, Discord...</span>
                  </div>
                </div>
                <ChevronRight className="text-purple-700 group-hover:text-purple-400 transition-colors" size={20} />
              </button>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 pt-2 text-center">
          <p className="text-[10px] text-gray-600">
            By connecting a wallet, you agree to CrossChain's <span className="underline hover:text-gray-400 cursor-pointer">Terms of Service</span> and <span className="underline hover:text-gray-400 cursor-pointer">Privacy Policy</span>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginModal;
