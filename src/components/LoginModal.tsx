import React from 'react';
import { useConnect } from 'wagmi';
import { X, Wallet, ShieldCheck, Zap } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { connectors, connect, isPending } = useConnect();

  if (!isOpen) return null;

  const handleConnect = (connector: any) => {
    connect({ connector });
    onClose();
  };

  // Helper to get icon/color based on connector name
  const getConnectorStyle = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('metamask')) return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    if (n.includes('walletconnect')) return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    if (n.includes('coinbase')) return { color: 'text-blue-600', bg: 'bg-blue-600/10', border: 'border-blue-600/20' };
    return { color: 'text-white', bg: 'bg-white/5', border: 'border-white/10' };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-blue-500" />
        
        {/* Header */}
        <div className="p-6 pb-2 relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            <X size={20} />
          </button>
          
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mb-4">
            <Zap className="text-cyan-400" size={24} />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">Connect Verse8</h2>
          <p className="text-sm text-gray-400">Securely connect your wallet to start playing.</p>
        </div>

        {/* Connector List */}
        <div className="p-6 space-y-3">
          {connectors.length > 0 ? (
            connectors.map((connector) => {
              const style = getConnectorStyle(connector.name);
              const isMetaMask = connector.name.toLowerCase().includes('metamask');
              
              return (
                <button
                  key={connector.uid}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  className={`w-full group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                    ${style.bg} ${style.border} hover:border-opacity-50 hover:bg-opacity-20`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/5 ${style.color}`}>
                    <Wallet size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white flex items-center gap-2">
                      {connector.name}
                      {isMetaMask && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/20">POPULAR</span>}
                    </div>
                    <div className="text-xs text-gray-500">Connect using browser wallet</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                  </div>
                </button>
              );
            })
          ) : (
             <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center">
                No wallets detected. Please install MetaMask.
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
            <ShieldCheck size={12} />
            <span>Secure Connection • Verse8 Protocol</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginModal;
