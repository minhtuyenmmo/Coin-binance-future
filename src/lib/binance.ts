export interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  count: number;
  highPrice: string;
  lowPrice: string;
}

export type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '2d' | '1w' | '2w' | '1M' | '3M' | '6M' | '1y';

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
  entryTime: number;
  closeTime: number;
  hasFakeVolume: boolean;
  subWinRates?: {
    volume: number;
    technical: number;
    ict: number;
    wyckoff: number;
    combined: number;
  };
  indicators: {
    rsi: number;
    macd: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    ichimoku: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    elliottWave: string;
    fibonacci: string;
    optimalEntry: string;
    entryStrategy: string;
    ict: {
      marketStructure: 'BOS' | 'ChoCh' | 'Consolidation';
      liquidity: 'BSL Swept' | 'SSL Swept' | 'Building';
      fvg: 'Bullish FVG' | 'Bearish FVG' | 'Mitigated';
      poi: 'Orderblock' | 'Breaker Block' | 'None';
    };
    wyckoff: {
      phase: 'Phase A' | 'Phase B' | 'Phase C' | 'Phase D' | 'Phase E';
      event: 'PS/PSY' | 'SC/BC' | 'AR' | 'ST' | 'Spring/UTAD' | 'Test' | 'SOS/SOW' | 'LPS/LPSY' | 'BU/Ice';
      schematic: 'Accumulation' | 'Distribution' | 'Reaccumulation' | 'Redistribution';
    };
  };
}

export const TOP_50_COINS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'TON', 'ADA', 'SHIB', 'AVAX', 
  'DOT', 'BCH', 'TRX', 'LINK', 'POL', 'NEAR', 'LTC', 'ICP', 'FET', 'KAS', 
  'UNI', 'APT', 'RENDER', 'PEPE', 'XLM', 'INJ', 'XMR', 'ARB', 'STX', 'OP', 
  'FIL', 'ATOM', 'MNT', 'CRO', 'IMX', 'OKB', 'SUI', 'VET', 'GRT', 'TAO', 
  'WIF', 'RUNE', 'THETA', 'MKR', 'ALGO', 'FLOKI', 'BONK', 'AAVE', 'FTM', 'CORE'
];

export async function fetchTopFutures(timeframe: Timeframe = '1h'): Promise<SignalData[]> {
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    const data = await res.json();
    const now = Date.now();
    
    // Filter top USDT pairs by volume, get 150 to ensure we have enough when filtering
    const topPairs = data
      .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 150);

    return topPairs.map((ticker: BinanceTicker) => generateSignalData(ticker, timeframe, now));
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu từ Binance:', error);
    return [];
  }
}

function generateSignalData(ticker: BinanceTicker, timeframe: Timeframe, now: number): SignalData {
  const price = parseFloat(ticker.lastPrice);
  const change = parseFloat(ticker.priceChangePercent);
  const volume = parseFloat(ticker.volume);

  // Timeframe modifiers
  let tfMultiplier = 1;
  let hashSeed = 1;
  switch (timeframe) {
    case '5m': tfMultiplier = 0.1; hashSeed = 5; break;
    case '15m': tfMultiplier = 0.2; hashSeed = 15; break;
    case '30m': tfMultiplier = 0.3; hashSeed = 30; break;
    case '1h': tfMultiplier = 0.5; hashSeed = 60; break;
    case '2h': tfMultiplier = 0.8; hashSeed = 120; break;
    case '4h': tfMultiplier = 1.2; hashSeed = 240; break;
    case '1d': tfMultiplier = 3.0; hashSeed = 1440; break;
    case '2d': tfMultiplier = 4.5; hashSeed = 2880; break;
    case '1w': tfMultiplier = 8.0; hashSeed = 10080; break;
    case '2w': tfMultiplier = 12.0; hashSeed = 20160; break;
    case '1M': tfMultiplier = 18.0; hashSeed = 43200; break;
    case '3M': tfMultiplier = 35.0; hashSeed = 129600; break;
    case '6M': tfMultiplier = 60.0; hashSeed = 259200; break;
    case '1y': tfMultiplier = 100.0; hashSeed = 518400; break;
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

  // Format số đẹp (khắc phục lỗi TP/SL bằng nhau với các coin giá quá nhỏ)
  let decimals = 2;
  if (price < 0.00001) decimals = 8;
  else if (price < 0.0001) decimals = 7;
  else if (price < 0.001) decimals = 6;
  else if (price < 0.01) decimals = 5;
  else if (price < 0.1) decimals = 5;
  else if (price < 1) decimals = 4;
  else if (price < 10) decimals = 3;

  // Tính toán thời gian (dựa trên hash và now để ổn định khi reload)
  let tfDurationMs = 60 * 60 * 1000;
  switch (timeframe) {
    case '15m': tfDurationMs = 15 * 60 * 1000; break;
    case '30m': tfDurationMs = 30 * 60 * 1000; break;
    case '1h': tfDurationMs = 60 * 60 * 1000; break;
    case '4h': tfDurationMs = 4 * 60 * 60 * 1000; break;
    case '1d': tfDurationMs = 24 * 60 * 60 * 1000; break;
  }
  
  // Make entryTime stable across short reloads by tying it loosely to block intervals
  const pseudoHash = Math.abs(hash) || 1;
  const entryOffsetMs = (pseudoHash % (tfDurationMs / 4));
  const entryTime = now - entryOffsetMs;
  const closeOffsetMs = ((pseudoHash * 13) % tfDurationMs) + (tfDurationMs / 2);
  const closeTime = entryTime + closeOffsetMs;

  const quoteVolume = parseFloat(ticker.quoteVolume);
  const count = ticker.count;
  const high = parseFloat(ticker.highPrice);
  const low = parseFloat(ticker.lowPrice);
  
  // Tính tỷ lệ trung bình mỗi giao dịch (Quote Volume / Count)
  const avgTradeSize = count > 0 ? quoteVolume / count : 0;
  
  // Tính độ biến động giá thực tế (High - Low) / Low
  const actualVolatility = low > 0 ? (high - low) / low : 0;

  // Phát hiện Volume Ảo (Wash Trading / Spoofing) dựa trên phân tích order và biến động
  let hasFakeVolume = false;
  
  // 1. Biến động giá cực thấp (< 1.5%) nhưng volume cực lớn (> 100M USD) -> Giao dịch tự sang tay
  if (actualVolatility < 0.015 && quoteVolume > 100000000) {
    hasFakeVolume = true;
  }
  
  // 2. Trung bình 1 lệnh quá lớn (> 50k USD / lệnh) trên một coin thanh khoản/số lệnh thấp
  if (count > 0 && count < 30000 && quoteVolume > 20000000 && avgTradeSize > 50000) {
    hasFakeVolume = true;
  }
  
  // Tính tỉ lệ thắng giả lập. Các coin có volume lớn thường có model mượt hơn
  const pseudoRandom = Math.abs(Math.sin(hash)) * 100;
  let winRate = 55 + (pseudoRandom % 30); 
  
  if (!hasFakeVolume) {
     const momentum = actualVolatility > 0 ? Math.abs(change/100) / actualVolatility : 0; 
     // Nếu change gần bằng actualVolatility -> Nến thân dài (Trend rõ) -> Rate cao hơn
     if (momentum > 0.7) {
       winRate += 7;
     } else if (momentum > 0.5) {
       winRate += 4;
     }
  } else {
     // Phạt rate nếu có nghi ngờ thao túng
     winRate -= 15;
  }

  // Nếu coin có volume thật và số lệnh chia đều, tăng sự tự tin
  if (!hasFakeVolume && count > 100000 && avgTradeSize < 10000) {
    winRate += 3;
  }

  winRate = Math.min(Math.max(winRate, 25), 96); // Clamp max 96% and min 25%

  // Technical Analysis Simulation
  const rsiSeed = Math.abs(Math.cos(hash)) * 100;
  let rsi = 30 + (rsiSeed % 40); // 30-70 default
  if (isLong && winRate > 70) rsi = 15 + (rsiSeed % 25); // 15-40: Oversold -> Bullish
  if (!isLong && winRate > 70) rsi = 60 + (rsiSeed % 25); // 60-85: Overbought -> Bearish

  const macd = isLong ? (winRate > 60 ? 'BULLISH' : 'NEUTRAL') : (winRate > 60 ? 'BEARISH' : 'NEUTRAL');
  const ichimoku = isLong ? (winRate > 65 ? 'BULLISH' : 'NEUTRAL') : (winRate > 65 ? 'BEARISH' : 'NEUTRAL');
  
  const ewPhases = ['Sóng 1 (Khởi tạo)', 'Sóng 2 (Tích lũy)', 'Sóng 3 (Bùng nổ)', 'Sóng 4 (Điều chỉnh)', 'Sóng 5 (Chạy nước rút)', 'Sóng A (Sụp đổ)', 'Sóng B (Hồi quang phản chiếu)', 'Sóng C (Rũ bỏ)'];
  const pseudoIndex = Math.floor(pseudoRandom % 100);
  const elliottWave = isLong 
    ? ewPhases[pseudoIndex % 5] // 0-4 (Tăng)
    : ewPhases[(pseudoIndex % 3) + 5]; // 5-7 (Giảm)

  const fibLevels = ['0.236', '0.382', '0.5', '0.618', '0.786', '1.618'];
  const fibonacci = `Fibo ${fibLevels[pseudoIndex % fibLevels.length]}`;

  const entryReasonsLong = [
    'Pullback về Demand Zone (PA) + Lấp FVG (SMC) khung 15m',
    'Test lại Hỗ trợ cứng + Nến Pin Bar (PA) + Phân kỳ RSI',
    'Hồi quy Fibo 0.618 + Chạm đường EMA 50 khung 1H',
    'Chạm dải dưới Bollinger Bands + Order Block (SMC) khung 5m',
    'BOS -> Chờ test Breaker Block + Hợp lưu đa khung thời gian'
  ];
  const entryReasonsShort = [
    'Pullback về Supply Zone (PA) + Lấp FVG (SMC) khung 15m',
    'Test lại Kháng cự cứng + Nến Engulfing (PA) + Phân kỳ RSI',
    'Hồi quy Fibo 0.618 + Chạm đường EMA 50 khung 1H',
    'Chạm dải trên Bollinger Bands + Order Block (SMC) khung 5m',
    'BOS giảm -> Chờ test Breaker Block + Hợp lưu đa khung thời gian'
  ];
  const entryStrategy = isLong 
    ? entryReasonsLong[pseudoIndex % entryReasonsLong.length]
    : entryReasonsShort[pseudoIndex % entryReasonsShort.length];

  const entryPriceNum = price;
  const priceStr = price.toString();
  const optimalEntryNum = isLong 
    ? entryPriceNum * (1 - (0.002 + (pseudoIndex % 15) * 0.001))
    : entryPriceNum * (1 + (0.002 + (pseudoIndex % 15) * 0.001));
  const optimalEntry = optimalEntryNum.toFixed(priceStr.split('.')[1]?.length || 2);

  // ICT Simulation
  const ictStructures: ('BOS' | 'ChoCh' | 'Consolidation')[] = ['BOS', 'ChoCh', 'Consolidation'];
  const ictLiquidities: ('BSL Swept' | 'SSL Swept' | 'Building')[] = isLong ? ['SSL Swept', 'Building'] : ['BSL Swept', 'Building'];
  const ictFvgs: ('Bullish FVG' | 'Bearish FVG' | 'Mitigated')[] = isLong ? ['Bullish FVG', 'Mitigated'] : ['Bearish FVG', 'Mitigated'];
  const ictPois: ('Orderblock' | 'Breaker Block' | 'None')[] = ['Orderblock', 'Breaker Block', 'None'];

  // Wyckoff Simulation
  const wyckoffPhases: ('Phase A' | 'Phase B' | 'Phase C' | 'Phase D' | 'Phase E')[] = ['Phase A', 'Phase B', 'Phase C', 'Phase D', 'Phase E'];
  const wyckoffSchematics: ('Accumulation' | 'Distribution' | 'Reaccumulation' | 'Redistribution')[] = isLong ? ['Accumulation', 'Reaccumulation'] : ['Distribution', 'Redistribution'];
  const wyckoffEventsAcc: ('PS/PSY' | 'SC/BC' | 'AR' | 'ST' | 'Spring/UTAD' | 'Test' | 'SOS/SOW' | 'LPS/LPSY' | 'BU/Ice')[] = ['PS/PSY', 'SC/BC', 'AR', 'ST', 'Spring/UTAD', 'Test', 'SOS/SOW', 'LPS/LPSY', 'BU/Ice'];
  const wyckoffEventsDist: ('PS/PSY' | 'SC/BC' | 'AR' | 'ST' | 'Spring/UTAD' | 'Test' | 'SOS/SOW' | 'LPS/LPSY' | 'BU/Ice')[] = ['PS/PSY', 'SC/BC', 'AR', 'ST', 'Spring/UTAD', 'Test', 'SOS/SOW', 'LPS/LPSY', 'BU/Ice'];

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
    timeframe,
    entryTime,
    closeTime,
    hasFakeVolume,
    subWinRates: {
      volume: Number((winRate * (0.95 + Math.random() * 0.1)).toFixed(1)),
      technical: Number((winRate * (0.9 + Math.random() * 0.15)).toFixed(1)),
      ict: Number((winRate * (0.85 + Math.random() * 0.2)).toFixed(1)),
      wyckoff: Number((winRate * (0.88 + Math.random() * 0.18)).toFixed(1)),
      combined: Number((winRate * (1.02 + Math.random() * 0.05)).toFixed(1))
    },
    indicators: {
      rsi: Number(rsi.toFixed(1)),
      macd,
      ichimoku,
      elliottWave,
      fibonacci,
      optimalEntry,
      entryStrategy,
      ict: {
        marketStructure: ictStructures[pseudoIndex % ictStructures.length],
        liquidity: ictLiquidities[pseudoIndex % ictLiquidities.length],
        fvg: ictFvgs[pseudoIndex % ictFvgs.length],
        poi: ictPois[pseudoIndex % ictPois.length],
      },
      wyckoff: {
        phase: wyckoffPhases[pseudoIndex % wyckoffPhases.length],
        schematic: wyckoffSchematics[pseudoIndex % wyckoffSchematics.length],
        event: isLong ? wyckoffEventsAcc[pseudoIndex % wyckoffEventsAcc.length] : wyckoffEventsDist[pseudoIndex % wyckoffEventsDist.length]
      }
    }
  };
}
