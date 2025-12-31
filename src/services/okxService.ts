export class OKXService {
  private ws: WebSocket | null = null;
  private onPriceUpdate: (price: number) => void;
  private isConnected = false;

  constructor(onPriceUpdate: (price: number) => void) {
    this.onPriceUpdate = onPriceUpdate;
  }

  connect() {
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
            this.onPriceUpdate(price);
          }
        }
      } catch (e) {
        console.error('Error parsing OKX message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('OKX WebSocket Closed');
      this.isConnected = false;
      // Simple reconnect logic
      setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('OKX WebSocket Error:', error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
