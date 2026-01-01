import React from 'react';
import { X, ExternalLink, Coins, ArrowRight } from 'lucide-react';

interface GuidePopupProps {
  onClose: () => void;
}

const GuidePopup: React.FC<GuidePopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1a0b2e] border border-purple-500/30 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Coins className="text-yellow-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-wide">GETTING tCROSS</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            tCROSS is the native testnet token used for betting. Follow these steps to get tokens and start playing:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-none w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">1</div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-sm">Get Testnet ETH</h3>
                <p className="text-xs text-gray-400">You need Sepolia ETH for gas fees.</p>
                <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1">
                  Sepolia Faucet <ExternalLink size={10} />
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-none w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">2</div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-sm">Mint Testnet USDT</h3>
                <p className="text-xs text-gray-400">Use the faucet to get free Testnet USDT.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-none w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30">3</div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-sm">Swap for tCROSS</h3>
                <p className="text-xs text-gray-400">Click the "Deposit / Shop" button in the game to swap your USDT for tCROSS tokens.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            Got it <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidePopup;
