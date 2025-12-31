export class OKXService {
  private ws: WebSocket | null = null;
  private onPriceUpdate: (price: number) => void;
  private isConnected = false;
  private shouldReconnect = true;

  constructor(onPriceUpdate: (price: number) => void) {
    this.onPriceUpdate = onPriceUpdate;
  }

  connect() {
    this.shouldReconnect = true;
    this.ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

    this.ws.onopen = () => {
      console.log('OKX WebSocket Connected');
      this.isConnected = true;
      const msg = {
        op: 'subscribe',
        args: [
          {
            channel: 'tickers',
            instId: 'ETH-USDT',
          },
        ],
      };
      this.ws?.send(JSON.stringify(msg));
    };

    this.ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.data && response.data.length > 0) {
          const price = parseFloat(response.data[0].last);
          if (!isNaN(price)) {
            try {
              this.onPriceUpdate(price);
            } catch (err) {
              console.warn('Error in price update handler:', err);
            }
          }
        }
      } catch (e) {
        console.error('Error processing OKX message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('OKX WebSocket Closed');
      this.isConnected = false;
      
      // Only reconnect if we didn't intentionally disconnect
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), 5000);
      }
    };

    this.ws.onerror = (error) => {
      console.error('OKX WebSocket Error:', error);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.onmessage = null; // Prevent handling messages during closing
      this.ws.onclose = null; // Prevent reconnect loop
      this.ws.close();
      this.ws = null;
    }
  }
}
