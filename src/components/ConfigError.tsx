import React from 'react';
import { AlertTriangle, Terminal, FileCode, ExternalLink } from 'lucide-react';

const ConfigError: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center p-4 font-sans text-gray-300">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 ring-1 ring-red-500/50 mb-4 animate-pulse">
            <AlertTriangle className="text-red-500" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Configuration Missing</h1>
          <p className="text-lg text-gray-400 max-w-lg mx-auto">
            The application cannot start because the <span className="text-white font-mono font-bold">Reown Project ID</span> is missing.
          </p>
        </div>

        {/* Action Card */}
        <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Code Snippet */}
          <div className="p-6 border-b border-white/5 bg-[#111215]">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-3">
              <FileCode size={14} />
              <span>.env</span>
            </div>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm border border-white/5 overflow-x-auto">
              <div className="flex gap-4">
                <span className="text-gray-600 select-none">1</span>
                <span className="text-purple-400">VITE_REOWN_PROJECT_ID</span>
                <span className="text-white">=</span>
                <span className="text-green-400">"your-project-id-here"</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="p-8 space-y-6">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <Terminal size={16} className="text-cyan-400" />
              How to fix this
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-1">Create .env file</h4>
                  <p className="text-sm text-gray-400">Create a file named <code className="bg-white/10 px-1 py-0.5 rounded text-white">.env</code> in the root of your project.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-1">Get Project ID</h4>
                  <p className="text-sm text-gray-400 mb-2">Go to Reown Cloud Dashboard to get your Project ID.</p>
                  <a 
                    href="https://cloud.reown.com/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
                  >
                    Open Dashboard <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-1">Add Variable</h4>
                  <p className="text-sm text-gray-400">
                    Add <code className="text-purple-300">VITE_REOWN_PROJECT_ID</code> to your .env file with your ID.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="text-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-bold text-sm transition-all"
          >
            I've added the file, Reload Page
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfigError;
