import React from 'react';
import { useGameStore } from '../store/gameStore';

const UIOverlay: React.FC = () => {
  const { currentPrice, balance } = useGameStore();

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      pointerEvents: 'none', // Allow clicks to pass through to canvas
      fontFamily: 'monospace',
      color: 'white',
      zIndex: 10
    }}>
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#aaaaaa' }}>ETH / USDT</h2>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          ${currentPrice.toFixed(2)}
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#aaaaaa' }}>BALANCE</h2>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffff00' }}>
          ${balance.toFixed(2)}
        </div>
      </div>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        textAlign: 'center',
        opacity: 0.7 
      }}>
        <p style={{ margin: 0, fontSize: '12px' }}>Click on grid to place $1 bet</p>
      </div>
    </div>
  );
};

export default UIOverlay;
