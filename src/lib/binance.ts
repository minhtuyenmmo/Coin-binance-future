export interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
}

export interface SignalData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  type: 'LONG' | 'SHORT';
  entry: string;
  tp: string;
  sl: string;
  leverage: number;
  winRate: number;
}

export async function fetchTopFutures(): Promise<SignalData[]> {
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    const data = await res.json();
    
    // Filter top USDT pairs by volume
    const topPairs = data
      .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
      .sort((a: any, b: any) => parseFloat(b.volume) - parseFloat(a.volume))
      .slice(0, 50);

    return topPairs.map((ticker: BinanceTicker) => generateSignalData(ticker));
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu từ Binance:', error);
    return [];
  }
}

function generateSignalData(ticker: BinanceTicker): SignalData {
  const price = parseFloat(ticker.lastPrice);
  const change = parseFloat(ticker.priceChangePercent);
  const volume = parseFloat(ticker.volume);

  // Tạo hash từ symbol để giữ tín hiệu nhất quán trên giao diện demo
  let hash = 0;
  for (let i = 0; i < ticker.symbol.length; i++) {
    hash = ticker.symbol.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Thuật toán giả lập phân tích (cho mục đích Demo):
  // Mix giữa biến động giá và hash để tạo ra các tín hiệu ngẫu nhiên nhưng ổn định
  const isLong = (hash % 100) > 40; 
  const type = isLong ? 'LONG' : 'SHORT';

  // Điều chỉnh TP/SL theo độ biến động (volatility)
  const baseVolatility = Math.max(Math.abs(change) / 100, 0.015); 
  const volatility = Math.min(baseVolatility, 0.05); // Cap at 5%

  const entry = price;
  
  // R/R Ratio (Risk/Reward) ~ 1:2
  const profitMargin = volatility * 1.5;
  const lossMargin = volatility * 0.75;

  const tp = isLong ? price * (1 + profitMargin) : price * (1 - profitMargin);
  const sl = isLong ? price * (1 - lossMargin) : price * (1 + lossMargin);
  
  // Đòn bẩy phụ thuộc vào biến động (biến động thấp -> đòn bẩy cao hơn)
  let leverage = 20;
  if (Math.abs(change) > 8) leverage = 10;
  if (Math.abs(change) > 15) leverage = 5;

  // Tính tỉ lệ thắng giả lập (55% - 87%), các coin có volume lớn thường có model mượt hơn
  // Random nhưng ổn định dựa trên symbol
  const pseudoRandom = Math.abs(Math.sin(hash)) * 100;
  const winRate = 55 + (pseudoRandom % 32); 

  // Format số đẹp
  const decimals = price < 1 ? 4 : price < 10 ? 3 : 2;

  return {
    symbol: ticker.symbol,
    price,
    change24h: change,
    volume,
    type,
    entry: entry.toFixed(decimals),
    tp: tp.toFixed(decimals),
    sl: sl.toFixed(decimals),
    leverage,
    winRate: Number(winRate.toFixed(1))
  };
}
