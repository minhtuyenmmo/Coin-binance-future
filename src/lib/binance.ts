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
  contrarianScore?: number;
}

export const TOP_50_COINS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'TON', 'ADA', 'SHIB', 'AVAX', 
  'DOT', 'BCH', 'TRX', 'LINK', 'POL', 'NEAR', 'LTC', 'ICP', 'FET', 'KAS', 
  'UNI', 'APT', 'RENDER', 'PEPE', 'XLM', 'INJ', 'XMR', 'ARB', 'STX', 'OP', 
  'FIL', 'ATOM', 'MNT', 'CRO', 'IMX', 'OKB', 'SUI', 'VET', 'GRT', 'TAO', 
  'WIF', 'RUNE', 'THETA', 'MKR', 'ALGO', 'FLOKI', 'BONK', 'AAVE', 'FTM', 'CORE'
];

export async function fetchTopFutures(timeframe: Timeframe = '1h'): Promise<SignalData[]> {
  const endpoints = [
    'https://fapi.binance.com/fapi/v1/ticker/24hr',
    'https://fapi1.binance.com/fapi/v1/ticker/24hr',
    'https://fapi2.binance.com/fapi/v1/ticker/24hr',
    'https://api.binance.com/api/v3/ticker/24hr' // Fallback to Spot API which has better CORS
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const now = Date.now();
      
      const isSpot = url.includes('/api/v3/');
      
      // Filter USDT pairs
      const topPairs = data
        .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, 200);

      // If no data found on this endpoint, try next
      if (topPairs.length === 0) continue;

      return topPairs.map((ticker: BinanceTicker) => generateSignalData(ticker, timeframe, now));
    } catch (error) {
      console.warn(`Lỗi khi tải từ ${url}:`, error);
      lastError = error;
    }
  }

  console.error('Tất cả các endpoint Binance đều thất bại:', lastError);
  return [];
}

function generateSignalData(ticker: BinanceTicker, timeframe: Timeframe, now: number): SignalData {
  const price = parseFloat(ticker.lastPrice);
  const change = parseFloat(ticker.priceChangePercent);
  const volume = parseFloat(ticker.volume);
  const quoteVolume = parseFloat(ticker.quoteVolume);

  // Timeframe modifiers
  let tfMultiplier = 1;
  let hashSeed = 1 + Math.floor(now / 3600000); // Stable for 1 hour to prevent chaotic signal changes
  switch (timeframe) {
    case '5m': tfMultiplier = 0.1; hashSeed += 5; break;
    case '15m': tfMultiplier = 0.2; hashSeed += 15; break;
    case '30m': tfMultiplier = 0.3; hashSeed += 30; break;
    case '1h': tfMultiplier = 0.5; hashSeed += 60; break;
    case '2h': tfMultiplier = 0.8; hashSeed += 120; break;
    case '4h': tfMultiplier = 1.2; hashSeed += 240; break;
    case '1d': tfMultiplier = 3.0; hashSeed += 1440; break;
    case '2d': tfMultiplier = 4.5; hashSeed += 2880; break;
    case '1w': tfMultiplier = 8.0; hashSeed += 10080; break;
    case '2w': tfMultiplier = 12.0; hashSeed += 20160; break;
    case '1M': tfMultiplier = 18.0; hashSeed += 43200; break;
    case '3M': tfMultiplier = 35.0; hashSeed += 129600; break;
    case '6M': tfMultiplier = 60.0; hashSeed += 259200; break;
    case '1y': tfMultiplier = 100.0; hashSeed += 518400; break;
  }

  // Tạo hash từ symbol để giữ tín hiệu nhất quán trên giao diện demo
  let hash = 0;
  for (let i = 0; i < ticker.symbol.length; i++) {
    hash = ticker.symbol.charCodeAt(i) + ((hash << 5) - hash) + hashSeed;
  }

  // Thuật toán phân tích (kết hợp Price Action + Volume):
  // Nếu giá tăng + volume tăng -> Ưu tiên LONG. Nếu giá giảm + volume tăng -> Ưu tiên SHORT.
  const priceTrend = change > 0;
  const volumeTrend = quoteVolume > 50000000; // Ngưỡng volume lớn
  
  // Mix giữa xu hướng thực tế và hash để tạo sự ổn định nhưng vẫn có biến thiên
  let isLong = (hash % 100) > 40; 
  if (change > 2 && volumeTrend) isLong = (hash % 100) > 20; // Ưu tiên LONG hơn khi đang bay
  if (change < -2 && volumeTrend) isLong = (hash % 100) > 80; // Ưu tiên SHORT hơn khi đang sập
  
  const type = isLong ? 'LONG' : 'SHORT';

  // Format số đẹp (khắc phục lỗi TP/SL bằng nhau với các coin giá quá nhỏ)
  let decimals = 2;
  if (price < 0.00001) decimals = 8;
  else if (price < 0.0001) decimals = 7;
  else if (price < 0.001) decimals = 6;
  else if (price < 0.01) decimals = 5;
  else if (price < 0.1) decimals = 5;
  else if (price < 1) decimals = 4;
  else if (price < 10) decimals = 3;

  // Tính toán điểm vào lệnh (Grid-based Entry Anchoring) ổn định áp dụng cho tất cả
  // Giúp entry không thay đổi chớp nhoáng mà neo theo các mốc hỗ trợ/kháng cự quan trọng.
  const approxStep = price * 0.005; // Khoảng 0.5% giá trị thị giá
  const p = Math.floor(Math.log10(approxStep > 0 ? approxStep : 1));
  const f = approxStep / Math.pow(10, p);
  let niceStep;
  if (f < 1.5) niceStep = 1 * Math.pow(10, p);
  else if (f < 3) niceStep = 2 * Math.pow(10, p);
  else if (f < 7) niceStep = 5 * Math.pow(10, p);
  else niceStep = 10 * Math.pow(10, p);

  // Gắn giá về mốc tròn gần nhất dựa trên niceStep
  const anchoredPrice = Math.round(price / niceStep) * niceStep;
  const gridOffset = (Math.abs(hash) % 3) + 1; // 1 đến 3 step

  let optimalEntryNum = isLong 
    ? anchoredPrice - (niceStep * gridOffset)
    : anchoredPrice + (niceStep * gridOffset);
    
  if (optimalEntryNum <= 0) optimalEntryNum = price * 0.99;

  const entry = optimalEntryNum;

  // Điều chỉnh TP/SL theo độ biến động (volatility) dựa trên khung thời gian
  const baseVolatility = Math.max(Math.abs(change) / 100, 0.01) * tfMultiplier; 
  const volatility = Math.min(baseVolatility, 0.1); 

  // R/R Ratio (Risk/Reward) ~ 1:2
  const profitMargin = volatility * 1.5;
  const lossMargin = volatility * 0.75;

  const tp = isLong ? entry * (1 + profitMargin) : entry * (1 - profitMargin);
  const sl = isLong ? entry * (1 - lossMargin) : entry * (1 + lossMargin);
  
  // Đòn bẩy phụ thuộc vào biến động (biến động thấp -> đòn bẩy cao hơn)
  // Khung lớn hơn -> biến động lớn -> đòn bẩy nhỏ hơn
  let leverage = 20;
  const currentVol = Math.abs(change) * tfMultiplier;
  if (currentVol > 8) leverage = 10;
  if (currentVol > 15) leverage = 5;
  if (currentVol > 25) leverage = 3;
  if (currentVol > 40) leverage = 2;

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
  let winRate = 55 + (pseudoRandom % 35); 
  
  if (!hasFakeVolume) {
     const momentum = actualVolatility > 0 ? Math.abs(change/100) / actualVolatility : 0; 
     // Nếu change gần bằng actualVolatility -> Nến thân dài (Trend rõ) -> Rate cao hơn
     if (momentum > 0.7) {
       winRate += 9;
     } else if (momentum > 0.5) {
       winRate += 5;
     }
  } else {
     // Phạt rate nếu có nghi ngờ thao túng
     winRate -= 15;
  }

  // Nếu coin có volume thật và số lệnh chia đều, tăng sự tự tin
  if (!hasFakeVolume && count > 100000 && avgTradeSize < 10000) {
    winRate += 3;
  }
  
  // Đảm bảo có thể sinh ra max rate nhưng không qua 98.5
  if (winRate > 98.5) winRate = 98.5;

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
    'Pullback về Demand Zone (PA) + Lấp FVG (SMC) khung M30',
    'Test lại Hỗ trợ cứng + Nến Pin Bar (PA) + Phân kỳ RSI khung 1H',
    'Hồi quy Fibo 0.618 + Chạm đường EMA 50 khung 1H',
    'Chạm dải dưới Bollinger Bands + Order Block (SMC) khung M30',
    'BOS -> Chờ test Breaker Block + Hợp lưu khung 1H & M30'
  ];
  const entryReasonsShort = [
    'Pullback về Supply Zone (PA) + Lấp FVG (SMC) khung M30',
    'Test lại Kháng cự cứng + Nến Engulfing (PA) + Phân kỳ RSI khung 1H',
    'Hồi quy Fibo 0.618 + Chạm đường EMA 50 khung 1H',
    'Chạm dải trên Bollinger Bands + Order Block (SMC) khung M30',
    'BOS giảm -> Chờ test Breaker Block + Hợp lưu khung 1H & M30'
  ];
  const entryStrategy = isLong 
    ? entryReasonsLong[pseudoIndex % entryReasonsLong.length]
    : entryReasonsShort[pseudoIndex % entryReasonsShort.length];

  const optimalEntry = entry.toFixed(decimals);

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

export async function analyzeContrarianKlines(candidates: SignalData[]): Promise<SignalData[]> {
  try {
    const intervals = ['5m', '15m', '30m', '1h'];
    const limit = 5; // Look at last 5 candles to determine recent trend
    const endpointsWithCORSReady = [
      'https://api.binance.com/api/v3/klines', // Spot has fewer CORS issues
      'https://fapi.binance.com/fapi/v1/klines'
    ];

    // Create tasks for each candidate
    const enhancedCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        let totalContrarianScore = 0;

        for (const interval of intervals) {
          try {
            // Try fetching from spot API first to avoid CORS issues
            let data = null;
            let success = false;
            for (const ep of endpointsWithCORSReady) {
              try {
                const res = await fetch(`${ep}?symbol=${candidate.symbol}&interval=${interval}&limit=${limit}`);
                if (res.ok) {
                  data = await res.json();
                  success = true;
                  break;
                }
              } catch (e) {
                // try next
              }
            }

            if (!success || !data) continue;

            // Calculate price change across the fetched candles
            const firstCandleOpen = parseFloat(data[0][1]);
            const lastCandleClose = parseFloat(data[data.length - 1][4]);
            
            const pctChange = (lastCandleClose - firstCandleOpen) / firstCandleOpen * 100;
            
            // Score logically: 
            // If Signal is LONG (meaning algorithm wants it to go UP), 
            // but price action is heavily DOWN (pctChange < 0), it's highly contrarian.
            if (candidate.type === 'LONG') {
              totalContrarianScore += -pctChange; 
            } else {
              // Signal is SHORT (wants it to go DOWN), 
              // but price action is heavily UP (pctChange > 0)
              totalContrarianScore += pctChange;
            }
          } catch (err) {
            console.error(`Failed to fetch kline for ${candidate.symbol} at ${interval}`, err);
          }
        }

        return {
          ...candidate,
          contrarianScore: totalContrarianScore
        };
      })
    );

    // Sort by descending contrarian score
    return enhancedCandidates
      .sort((a, b) => (b.contrarianScore || 0) - (a.contrarianScore || 0));

  } catch (err) {
    console.error('Error analyzing contrarian klines', err);
    return candidates;
  }
}
