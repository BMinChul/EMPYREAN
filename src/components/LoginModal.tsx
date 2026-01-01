import React from 'react';
import { X, ChevronRight, Zap } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = usePrivy();

  if (!isOpen) return null;

  const handleCrossxLogin = () => {
    // Standard login flow (creates/uses embedded wallet)
    login(); 
    onClose();
  };

  const handleMetaMaskLogin = () => {
    // Wallet-specific login flow
    login({ loginMethods: ['wallet'] });
    onClose();
  };

  const handleSocialLogin = () => {
    // Email/Social login flow
    login({ loginMethods: ['email', 'google', 'twitter', 'discord'] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
