export interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
}

export type Timeframe = '15m' | '30m' | '1h' | '4h' | '1d';

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
  timeframe: Timeframe;
}

export async function fetchTopFutures(timeframe: Timeframe = '1h'): Promise<SignalData[]> {
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    const data = await res.json();
    
    // Filter top USDT pairs by volume
    const topPairs = data
      .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
      .sort((a: any, b: any) => parseFloat(b.volume) - parseFloat(a.volume))
      .slice(0, 50);

    return topPairs.map((ticker: BinanceTicker) => generateSignalData(ticker, timeframe));
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu từ Binance:', error);
    return [];
  }
}

function generateSignalData(ticker: BinanceTicker, timeframe: Timeframe): SignalData {
  const price = parseFloat(ticker.lastPrice);
  const change = parseFloat(ticker.priceChangePercent);
  const volume = parseFloat(ticker.volume);

  // Timeframe modifiers
  let tfMultiplier = 1;
  let hashSeed = 1;
  switch (timeframe) {
    case '15m': tfMultiplier = 0.2; hashSeed = 15; break;
    case '30m': tfMultiplier = 0.3; hashSeed = 30; break;
    case '1h': tfMultiplier = 0.5; hashSeed = 60; break;
    case '4h': tfMultiplier = 1.2; hashSeed = 240; break;
    case '1d': tfMultiplier = 3.0; hashSeed = 1440; break;
  }

  // Tạo hash từ symbol để giữ tín hiệu nhất quán trên giao diện demo
  let hash = 0;
  for (let i = 0; i < ticker.symbol.length; i++) {
    hash = ticker.symbol.charCodeAt(i) + ((hash << 5) - hash) + hashSeed;
  }

  // Thuật toán giả lập phân tích (cho mục đích Demo):
  // Mix giữa biến động giá và hash để tạo ra các tín hiệu ngẫu nhiên nhưng ổn định
  const isLong = (hash % 100) > 40; 
  const type = isLong ? 'LONG' : 'SHORT';

  // Điều chỉnh TP/SL theo độ biến động (volatility) dựa trên khung thời gian
  const baseVolatility = Math.max(Math.abs(change) / 100, 0.01) * tfMultiplier; 
  const volatility = Math.min(baseVolatility, 0.1); 

  const entry = price;
  
  // R/R Ratio (Risk/Reward) ~ 1:2
  const profitMargin = volatility * 1.5;
  const lossMargin = volatility * 0.75;

  const tp = isLong ? price * (1 + profitMargin) : price * (1 - profitMargin);
  const sl = isLong ? price * (1 - lossMargin) : price * (1 + lossMargin);
  
  // Đòn bẩy phụ thuộc vào biến động (biến động thấp -> đòn bẩy cao hơn)
  // Khung lớn hơn -> biến động lớn -> đòn bẩy nhỏ hơn
  let leverage = 20;
  const currentVol = Math.abs(change) * tfMultiplier;
  if (currentVol > 8) leverage = 10;
  if (currentVol > 15) leverage = 5;
  if (currentVol > 25) leverage = 3;
  if (currentVol > 40) leverage = 2;

  // Tính tỉ lệ thắng giả lập (55% - 87%), các coin có volume lớn thường có model mượt hơn
  const pseudoRandom = Math.abs(Math.sin(hash)) * 100;
  const winRate = 55 + (pseudoRandom % 32); 

  // Format số đẹp (khắc phục lỗi TP/SL bằng nhau với các coin giá quá nhỏ)
  let decimals = 2;
  if (price < 0.00001) decimals = 8;
  else if (price < 0.0001) decimals = 7;
  else if (price < 0.001) decimals = 6;
  else if (price < 0.01) decimals = 5;
  else if (price < 0.1) decimals = 5;
  else if (price < 1) decimals = 4;
  else if (price < 10) decimals = 3;

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
    winRate: Number(winRate.toFixed(1)),
    timeframe
  };
}
