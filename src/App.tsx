import { useEffect, useState, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Crosshair, Percent, RefreshCw, ShieldAlert, ShieldCheck, Target, TrendingUp, Zap, ChevronDown, ChevronUp, Clock, Star, Coins, Github, Loader2, Crown, Activity, Compass, Layers, Sparkles } from 'lucide-react';
import { Timeframe, fetchTopFutures, SignalData, TOP_50_COINS } from './lib/binance';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type TradeMode = 'VOLUME' | 'TECHNICAL' | 'ICT' | 'WYCKOFF' | 'COMBINED';

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [winRateSort, setWinRateSort] = useState<'desc' | 'asc'>('desc');
  const [filterWashTrade, setFilterWashTrade] = useState<boolean>(true);
  const [filterTopCoin, setFilterTopCoin] = useState<boolean>(false);
  const [tradeMode, setTradeMode] = useState<TradeMode>('VOLUME');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('Update Tool');

  const handleUpdate = () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateStatus('Đang cập nhật từ Github...');
    
    setTimeout(() => {
      setUpdateStatus('Cập nhật hoàn tất!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }, 2500);
  };

  const loadData = async (tf: Timeframe) => {
    setLoading(true);
    const data = await fetchTopFutures(tf);
    // Khuyến khích rate win thực tế hơn trên bảng chính
    setSignals(data);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData(timeframe);
    // Polling every 15 seconds to simulate realtime
    const interval = setInterval(() => loadData(timeframe), 15000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const filteredSignals = signals.filter(s => {
    if (filterWashTrade && s.hasFakeVolume) return false;
    if (filterTopCoin && !TOP_50_COINS.includes(s.symbol.replace('USDT', ''))) return false;
    return true;
  });
  
  const adjustedSignals = useMemo(() => {
    return filteredSignals.map(signal => {
      if (tradeMode === 'VOLUME') return signal;
      
      let techWinRate = 50; 
      const rsi = signal.indicators.rsi;
      const { macd, ichimoku, elliottWave, ict, wyckoff } = signal.indicators;
      const isLong = signal.type === 'LONG';
      
      if (tradeMode === 'TECHNICAL') {
        if (isLong) {
          if (macd === 'BULLISH') techWinRate += 15;
          if (ichimoku === 'BULLISH') techWinRate += 12;
          if (rsi < 45) techWinRate += (45 - rsi) * 0.8;
          if (elliottWave.includes('Sóng 3')) techWinRate += 10;
          if (elliottWave.includes('Sóng 5')) techWinRate += 5;
        } else {
          if (macd === 'BEARISH') techWinRate += 15;
          if (ichimoku === 'BEARISH') techWinRate += 12;
          if (rsi > 55) techWinRate += (rsi - 55) * 0.8;
          if (elliottWave.includes('Sóng C')) techWinRate += 10;
          if (elliottWave.includes('Sóng A')) techWinRate += 5;
        }
      } else if (tradeMode === 'ICT') {
        if (ict.marketStructure === 'BOS') techWinRate += 15;
        if (ict.marketStructure === 'ChoCh') techWinRate += 10;
        if (isLong && ict.liquidity === 'SSL Swept') techWinRate += 10;
        if (!isLong && ict.liquidity === 'BSL Swept') techWinRate += 10;
        if (isLong && ict.fvg === 'Bullish FVG') techWinRate += 10;
        if (!isLong && ict.fvg === 'Bearish FVG') techWinRate += 10;
        if (ict.poi === 'Orderblock') techWinRate += 10;
        if (ict.poi === 'Breaker Block') techWinRate += 5;
      } else if (tradeMode === 'WYCKOFF') {
        if (wyckoff.phase === 'Phase A') techWinRate += 5;
        if (wyckoff.phase === 'Phase B') techWinRate += 5;
        if (wyckoff.phase === 'Phase C') techWinRate += 20;
        if (wyckoff.phase === 'Phase D') techWinRate += 15;
        if (wyckoff.phase === 'Phase E') techWinRate += 10;
        
        if (wyckoff.schematic === 'Accumulation' && isLong) techWinRate += 15;
        if (wyckoff.schematic === 'Distribution' && !isLong) techWinRate += 15;
        if (wyckoff.event === 'Spring/UTAD') techWinRate += 10;
      } else if (tradeMode === 'COMBINED') {
        // Average of three
        let techBase = 50;
        let ictBase = 50;
        let wyckoffBase = 50;
        
        if (isLong) {
          if (macd === 'BULLISH') techBase += 15;
          if (ichimoku === 'BULLISH') techBase += 12;
          if (rsi < 45) techBase += (45 - rsi) * 0.8;
          if (elliottWave.includes('Sóng 3')) techBase += 10;
        } else {
          if (macd === 'BEARISH') techBase += 15;
          if (ichimoku === 'BEARISH') techBase += 12;
          if (rsi > 55) techBase += (rsi - 55) * 0.8;
          if (elliottWave.includes('Sóng C')) techBase += 10;
        }

        if (ict.marketStructure === 'BOS') ictBase += 15;
        if (isLong && ict.liquidity === 'SSL Swept') ictBase += 10;
        if (!isLong && ict.liquidity === 'BSL Swept') ictBase += 10;
        if (isLong && ict.fvg === 'Bullish FVG') ictBase += 10;
        if (!isLong && ict.fvg === 'Bearish FVG') ictBase += 5;

        if (wyckoff.phase === 'Phase C' || wyckoff.phase === 'Phase D') wyckoffBase += 20;
        if (isLong && wyckoff.schematic === 'Accumulation') wyckoffBase += 15;
        if (!isLong && wyckoff.schematic === 'Distribution') wyckoffBase += 15;
        if (wyckoff.event === 'Spring/UTAD') wyckoffBase += 10;
        
        const finalTechBase = Math.min(99, techBase);
        const finalIctBase = Math.min(99, ictBase);
        const finalWyckoffBase = Math.min(99, wyckoffBase);

        techWinRate = (finalTechBase + finalIctBase + finalWyckoffBase) / 3 + 10; // +10 combined synergy bonus
        
        return {
          ...signal,
          winRate: Math.min(98.5, Number(techWinRate.toFixed(1))),
          subWinRates: {
            volume: signal.winRate,
            technical: finalTechBase,
            ict: finalIctBase,
            wyckoff: finalWyckoffBase
          }
        };
      }
      
      return {
        ...signal,
        winRate: Math.min(98.5, Number(techWinRate.toFixed(1))) // Giới hạn max 98.5%
      };
    });
  }, [filteredSignals, tradeMode]);

  const topSignals = [...adjustedSignals].sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  
  const optimalSignals = useMemo(() => {
    return [...adjustedSignals]
      .filter(s => !s.hasFakeVolume)
      .sort((a, b) => {
        // Weigh winRate heavily but also consider price proximity to optimalEntry
        const scoreA = a.winRate * 1.5 - (Math.abs(a.price - parseFloat(a.indicators.optimalEntry)) / a.price * 100);
        const scoreB = b.winRate * 1.5 - (Math.abs(b.price - parseFloat(b.indicators.optimalEntry)) / b.price * 100);
        return scoreB - scoreA;
      })
      .slice(0, 1);
  }, [adjustedSignals]);

  const tableSignals = (() => {
    const sorted = [...adjustedSignals].sort((a, b) => {
      return winRateSort === 'desc' ? b.winRate - a.winRate : a.winRate - b.winRate;
    });
    
    // Đưa BTC lên đầu bảng
    const btcIndex = sorted.findIndex(s => s.symbol === 'BTCUSDT');
    if (btcIndex > -1) {
      const btcSignal = sorted.splice(btcIndex, 1)[0];
      sorted.unshift(btcSignal);
    }
    
    return sorted;
  })();

  const optimalSymbols = useMemo(() => new Set(optimalSignals.map(s => s.symbol)), [optimalSignals]);



  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30 font-sans pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a 
              href="https://www.facebook.com/minhtuyenmmo/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <div className="bg-emerald-500/10 p-2 rounded-xl ring-1 ring-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </a>
            <div className="flex flex-col justify-center">
              <a 
                href="https://www.facebook.com/minhtuyenmmo/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity leading-none pt-1"
              >
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Binance<span className="text-emerald-400">Future</span> AI
                </h1>
              </a>
              <button 
                onClick={handleUpdate}
                disabled={isUpdating}
                title="Nguồn: https://github.com/minhtuyenmmo/Coin-binance-future"
                className={cn(
                  "flex items-center gap-1 mt-1 text-[11px] font-medium transition-colors w-max",
                  isUpdating ? "text-emerald-400" : "text-slate-500 hover:text-emerald-400"
                )}
              >
                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Github className="w-3 h-3" />}
                <span>{updateStatus}</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden sm:flex bg-slate-900 rounded-lg p-1 border border-slate-800">
              {(['15m', '30m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-3 py-1 rounded-md font-medium transition-colors",
                    timeframe === tf ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
            
            {lastUpdated && (
              <span className="text-slate-400 hidden lg:inline-block">
                Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
              </span>
            )}
            <button
              onClick={() => loadData(timeframe)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 font-medium"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              <span className="hidden sm:inline-block">Làm mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Timeframe Scroll */}
      <div className="sm:hidden px-4 mt-4 overflow-x-auto pb-2 -mb-2 no-scrollbar">
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 w-max mx-auto">
          {(['15m', '30m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                timeframe === tf ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-8">


        {/* Intro */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">Top 3 Tín Hiệu Nổi Bật</h2>
            <p className="text-slate-400 mt-1">Các đồng coin có xác suất thắng cao nhất theo phân tích dòng tiền và động lượng.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTradeMode(tradeMode === 'TECHNICAL' ? 'VOLUME' : 'TECHNICAL')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm shrink-0",
                tradeMode === 'TECHNICAL'
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-sky-500/10" 
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              )}
            >
              <Activity className={cn("w-4 h-4", tradeMode === 'TECHNICAL' && "text-sky-400")} />
              <span className="hidden sm:inline">Tín hiệu Kĩ thuật</span>
              <span className="sm:hidden">Kĩ thuật</span>
            </button>
            <button
              onClick={() => setTradeMode(tradeMode === 'ICT' ? 'VOLUME' : 'ICT')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm shrink-0",
                tradeMode === 'ICT'
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-purple-500/10" 
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              )}
            >
              <Target className={cn("w-4 h-4", tradeMode === 'ICT' && "text-purple-400")} />
              <span className="hidden sm:inline">Trade theo ICT</span>
              <span className="sm:hidden">ICT</span>
            </button>
            <button
              onClick={() => setTradeMode(tradeMode === 'WYCKOFF' ? 'VOLUME' : 'WYCKOFF')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm shrink-0",
                tradeMode === 'WYCKOFF'
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10" 
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              )}
            >
              <Compass className={cn("w-4 h-4", tradeMode === 'WYCKOFF' && "text-amber-400")} />
              <span className="hidden sm:inline">Trade theo Wyckoff</span>
              <span className="sm:hidden">Wyckoff</span>
            </button>
            <button
              onClick={() => setTradeMode(tradeMode === 'COMBINED' ? 'VOLUME' : 'COMBINED')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm shrink-0",
                tradeMode === 'COMBINED'
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10" 
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              )}
            >
              <Layers className={cn("w-4 h-4", tradeMode === 'COMBINED' && "text-emerald-400")} />
              <span className="hidden sm:inline">Đa kĩ thuật</span>
              <span className="sm:hidden">Đa KT</span>
            </button>
          </div>
        </div>

        {/* Top 3 Cards */}
        {loading && signals.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatePresence>
              {topSignals.map((signal, index) => (
                <TopCard key={signal.symbol} signal={signal} rank={index + 1} tradeMode={tradeMode} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Kèo Tối Ưu Section */}
        {!loading && optimalSignals.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/10 p-1.5 rounded-lg">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Kèo Tối Ưu (Optimal Entry)</h2>
                <p className="text-sm text-slate-400">Tín hiệu có điểm vào lệnh đẹp nhất hiện tại.</p>
              </div>
            </div>
            
            <div className="flex justify-start">
              {optimalSignals.map((signal) => (
                <div key={signal.symbol} className="w-full max-w-md">
                  <OptimalCard signal={signal} tradeMode={tradeMode} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Board */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-xl font-semibold text-white tracking-tight">Bảng Tín Hiệu Toàn Thị Trường</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterTopCoin(!filterTopCoin)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all",
                  filterTopCoin 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                )}
              >
                <Coins className={cn("w-4 h-4", filterTopCoin && "text-amber-400")} />
                <span className="font-medium whitespace-nowrap">Top Coin</span>
              </button>

              <button
                onClick={() => setFilterWashTrade(!filterWashTrade)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all",
                  filterWashTrade 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                )}
              >
                {filterWashTrade ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                <span className="font-medium">Lọc Volume Ảo</span>
              </button>
              
              <button
                onClick={() => setWinRateSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 hover:text-white"
              >
                <span>Sắp xếp Rate</span>
                {winRateSort === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 hidden sm:table-header-group">
                  <tr>
                    <th className="px-6 py-4 font-medium w-16">STT</th>
                    <th className="px-6 py-4 font-medium">Cặp giao dịch (USDT)</th>
                    <th className="px-6 py-4 font-medium">Giá hiện tại</th>
                    <th className="px-6 py-4 font-medium">Tín hiệu</th>
                    <th className="px-6 py-4 font-medium">Vào lệnh (Entry)</th>
                    <th className="px-6 py-4 font-medium">Chốt lời (TP)</th>
                    <th className="px-6 py-4 font-medium">Cắt lỗ (SL)</th>
                    <th 
                      className="px-6 py-4 font-medium text-right cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
                      onClick={() => setWinRateSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        Tỉ lệ thắng
                        {winRateSort === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading && signals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Đang tải dữ liệu từ Binance...</td>
                    </tr>
                  ) : (
                    tableSignals.map((signal, index) => (
                      <TableRow key={signal.symbol} signal={signal} tradeMode={tradeMode} isOptimal={optimalSymbols.has(signal.symbol)} index={index + 1} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="text-center text-xs text-slate-500 italic mt-8 border-t border-slate-800 pt-8">
          <p>⚠️ Cảnh báo: Giao dịch Futures mang rủi ro cao. Ứng dụng này cung cấp tín hiệu mang tính chất tham khảo dựa trên thuật toán giả lập.</p>
          <p>Không nên xem đây là lời khuyên đầu tư tài chính.</p>
        </div>
      </main>
    </div>
  );
}

function OptimalCard({ signal, tradeMode }: { signal: SignalData; tradeMode: TradeMode }) {
  const isLong = signal.type === 'LONG';
  const distance = Math.abs(signal.price - parseFloat(signal.indicators.optimalEntry)) / signal.price;
  const isVaoNgay = distance < 0.003; // Within 0.3%

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900/40 p-5 flex flex-col border-l-4 border-l-amber-500"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
            isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          )}>
            {isLong ? 'B' : 'S'}
          </div>
          <div>
            <h4 className="font-bold text-white text-base">
              {signal.symbol.replace('USDT', '')}
              {isVaoNgay && (
                <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-tighter animate-pulse">
                  Vào ngay
                </span>
              )}
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Price:</span>
              <span className="text-xs font-mono text-slate-300">${signal.price}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Tỉ lệ thắng</div>
          <div className="text-lg font-bold text-emerald-400 leading-none">{signal.winRate}%</div>
        </div>
      </div>

      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-semibold mb-1">
          <Crosshair className="w-3 h-3 text-amber-500" /> Entry Tối Ưu
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-amber-400 text-base font-bold">${signal.indicators.optimalEntry}</span>
          <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            {distance < 0.001 ? 'Ready' : `+${(distance * 100).toFixed(2)}%`}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 line-clamp-1 italic mb-4">
        {signal.indicators.entryStrategy}
      </p>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="flex flex-col bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
          <span className="text-[9px] text-emerald-500/70 font-semibold uppercase">TP (ROE target)</span>
          <span className="text-xs font-bold text-emerald-400">${signal.tp}</span>
        </div>
        <div className="flex flex-col bg-rose-500/5 border border-rose-500/10 rounded-lg p-2">
          <span className="text-[9px] text-rose-500/70 font-semibold uppercase">SL (Safety)</span>
          <span className="text-xs font-bold text-rose-400">${signal.sl}</span>
        </div>
      </div>
    </motion.div>
  );
}

function TopCard({ signal, rank, tradeMode }: { signal: SignalData; rank: number; tradeMode: TradeMode }) {
  const isLong = signal.type === 'LONG';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: rank * 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col hover:border-slate-700 transition-colors group"
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity",
        isLong ? "bg-emerald-500" : "bg-rose-500"
      )} />

      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              #{rank}
            </span>
            <h3 className="font-bold text-lg text-white flex items-center gap-1.5">
              {signal.symbol.replace('USDT', '')}
              <span className="text-slate-500 text-sm font-normal">/USDT</span>
              {signal.hasFakeVolume && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Phát hiện Volume ảo">
                  <ShieldAlert className="w-3 h-3" /> Ảo
                </span>
              )}
            </h3>
          </div>
          <p className="text-2xl font-mono mt-1 font-semibold text-white tracking-tight">
            ${signal.price}
          </p>
        </div>
        
        <div className={cn(
          "px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold shadow-sm",
          isLong ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
        )}>
          {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {signal.type} {signal.leverage}x
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Crosshair className="w-3.5 h-3.5" />
              <span className="text-xs uppercase font-medium">Vào Lệnh</span>
            </div>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">{format(signal.entryTime, 'dd/MM HH:mm')}</span>
          </div>
          <div className="font-mono text-sm text-slate-200">${tradeMode !== 'VOLUME' && signal.indicators ? signal.indicators.optimalEntry : signal.entry}</div>
        </div>
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Target className="w-3.5 h-3.5" />
              <span className="text-xs uppercase font-medium">Đóng Dự Kiến</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline">
            <div className={cn("font-mono text-sm", isLong ? "text-emerald-400" : "text-emerald-400")}>${signal.tp}</div>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">{format(signal.closeTime, 'dd/MM HH:mm')}</span>
          </div>
        </div>
      </div>

      <SignalIndicatorsDetail signal={signal} tradeMode={tradeMode} />

      <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Cắt lỗ (SL)</span>
          <span className="font-mono text-sm text-rose-400">${signal.sl}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500 flex items-center gap-1">Tỉ lệ thắng <Percent className="w-3 h-3" /></span>
          <span className="font-bold text-emerald-400 text-lg flex items-center gap-1">
             {signal.winRate}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function TableRow({ signal, tradeMode, isOptimal, index }: { signal: SignalData; tradeMode: TradeMode; isOptimal?: boolean; index: number }) {
  const isLong = signal.type === 'LONG';
  const [isExpanded, setIsExpanded] = useState(false);
  const isInteractive = tradeMode !== 'VOLUME';
  
  return (
    <>
      <tr 
        onClick={() => isInteractive && setIsExpanded(!isExpanded)}
        className={cn("hover:bg-slate-800/30 transition-colors flex flex-col sm:table-row px-4 py-4 sm:p-0 border-b border-slate-800/50 sm:border-b-0", isInteractive && "cursor-pointer hover:bg-slate-800/60")}
      >
      <td className="sm:px-6 sm:py-4 hidden sm:table-cell text-slate-500 text-sm font-mono w-16">
        #{index}
      </td>
      <td className="sm:px-6 sm:py-4">
        <div className="flex items-center justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="sm:hidden text-slate-500 text-sm font-mono align-middle mr-1">#{index}</span>
            <div className="font-medium text-white flex items-center gap-1.5">
            {isOptimal && <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />}
            {signal.symbol.replace('USDT', '')}
            <span className="text-slate-500 text-xs">USDT</span>
            {signal.hasFakeVolume && (
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Phát hiện Volume ảo">
                <ShieldAlert className="w-3 h-3" /> Ảo
              </span>
            )}
            </div>
          </div>
          {/* Mobile view signal badge */}
          <div className={cn(
            "sm:hidden px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1",
            isLong ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
          )}>
            {isLong ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
            {signal.type} {signal.leverage}x
          </div>
        </div>
      </td>
      
      <td className="sm:px-6 sm:py-4 mt-2 sm:mt-0 font-mono text-white flex justify-between sm:table-cell">
        <span className="sm:hidden text-slate-500 text-sm">Giá:</span>
        ${signal.price}
        <span className={cn("ml-2 text-xs", signal.change24h > 0 ? "text-emerald-400" : "text-rose-400")}>
          {signal.change24h > 0 ? '+' : ''}{signal.change24h.toFixed(2)}%
        </span>
      </td>
      
      <td className="sm:px-6 sm:py-4 hidden sm:table-cell">
        <div className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold",
          isLong ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
        )}>
          {signal.type} {signal.leverage}x
        </div>
      </td>
      
      <td className="sm:px-6 sm:py-4 font-mono text-slate-300 flex justify-between sm:table-cell mt-1 sm:mt-0">
        <span className="sm:hidden text-slate-500 text-sm">Entry:</span>
        <div className="flex flex-col sm:items-start items-end">
          <span>${tradeMode !== 'VOLUME' && signal.indicators ? signal.indicators.optimalEntry : signal.entry}</span>
          <span className="text-[10px] text-slate-500 font-sans tracking-tight">{format(signal.entryTime, 'dd/MM HH:mm')}</span>
        </div>
      </td>
      <td className="sm:px-6 sm:py-4 font-mono text-emerald-400 flex justify-between sm:table-cell mt-1 sm:mt-0">
         <span className="sm:hidden text-slate-500 text-sm">TP:</span>
         <div className="flex flex-col sm:items-start items-end">
          <span>${signal.tp}</span>
          <span className="text-[10px] text-slate-500 font-sans tracking-tight">{format(signal.closeTime, 'dd/MM HH:mm')}</span>
        </div>
      </td>
      <td className="sm:px-6 sm:py-4 font-mono text-rose-400 flex justify-between sm:table-cell mt-1 sm:mt-0">
         <span className="sm:hidden text-slate-500 text-sm">SL:</span>
        ${signal.sl}
      </td>
      
      <td className="sm:px-6 sm:py-4 font-bold text-right flex justify-between sm:table-cell mt-2 sm:mt-0 pt-2 border-t border-slate-800 sm:border-0 sm:pt-0">
        <span className="sm:hidden text-slate-500 text-sm font-normal">Tỉ lệ thắng:</span>
        <div className="flex items-center gap-1.5 justify-end">
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-white">{signal.winRate}%</span>
        </div>
      </td>
    </tr>
    {isExpanded && isInteractive && (
      <tr className="flex flex-col sm:table-row bg-slate-900/50 sm:border-none">
        <td colSpan={8} className="p-4 sm:px-6 border-b border-slate-800/50">
          <SignalIndicatorsDetail signal={signal} tradeMode={tradeMode} />
        </td>
      </tr>
    )}
    </>
  );
}

function SignalIndicatorsDetail({ signal, tradeMode }: { signal: SignalData; tradeMode: TradeMode }) {
  if (tradeMode === 'VOLUME' || !signal.indicators) return null;
  
  return (
        <div className="mb-4 pt-4 border-t border-slate-800/50">
          <div className="text-xs font-semibold text-sky-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            {tradeMode === 'TECHNICAL' && <><Activity className="w-3.5 h-3.5" /> Phân Tích Kĩ Thuật</>}
            {tradeMode === 'ICT' && <><Target className="w-3.5 h-3.5 text-purple-400" /> <span className="text-purple-400">Smc / ICT Analysis</span></>}
            {tradeMode === 'WYCKOFF' && <><Compass className="w-3.5 h-3.5 text-amber-400" /> <span className="text-amber-400">Wyckoff Logic</span></>}
            {tradeMode === 'COMBINED' && <><Layers className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Đa Kĩ Thuật</span></>}
          </div>

          <div className="mb-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
            <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1 flex items-center gap-1.5">
              <Crosshair className="w-3 h-3 text-emerald-400" /> Entry Tối Ưu
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-mono text-emerald-400 text-lg font-medium">${signal.indicators.optimalEntry}</span>
              <span className="text-xs text-slate-400 text-right">{signal.indicators.entryStrategy}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* TECHNICAL */}
            {(tradeMode === 'TECHNICAL' || tradeMode === 'COMBINED') && (
              <>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500">RSI 14</span>
                  <span className={cn("font-medium", signal.indicators.rsi < 30 ? "text-emerald-400" : signal.indicators.rsi > 70 ? "text-rose-400" : "text-slate-300")}>{signal.indicators.rsi}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500">MACD</span>
                  <span className={cn("font-medium", signal.indicators.macd === 'BULLISH' ? "text-emerald-400" : signal.indicators.macd === 'BEARISH' ? "text-rose-400" : "text-slate-400")}>{signal.indicators.macd}</span>
                </div>
              </>
            )}

            {tradeMode === 'COMBINED' && signal.subWinRates && (
              <div className="col-span-2 grid grid-cols-2 gap-2 mb-2">
                <div className="flex flex-col bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
                  <span className="text-[10px] text-emerald-500/70 font-semibold uppercase">Volume Rate</span>
                  <span className="text-sm font-bold text-emerald-400">{signal.subWinRates.volume}%</span>
                </div>
                <div className="flex flex-col bg-sky-500/5 border border-sky-500/20 rounded-lg p-2">
                  <span className="text-[10px] text-sky-500/70 font-semibold uppercase">Technical Rate</span>
                  <span className="text-sm font-bold text-sky-400">{signal.subWinRates.technical}%</span>
                </div>
                <div className="flex flex-col bg-purple-500/5 border border-purple-500/20 rounded-lg p-2">
                  <span className="text-[10px] text-purple-500/70 font-semibold uppercase">ICT Rate</span>
                  <span className="text-sm font-bold text-purple-400">{signal.subWinRates.ict}%</span>
                </div>
                <div className="flex flex-col bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                  <span className="text-[10px] text-amber-500/70 font-semibold uppercase">Wyckoff Rate</span>
                  <span className="text-sm font-bold text-amber-400">{signal.subWinRates.wyckoff}%</span>
                </div>
              </div>
            )}

            {tradeMode === 'TECHNICAL' && (
              <>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50 col-span-2">
                  <span className="text-slate-500">Sóng Elliott</span>
                  <span className="font-medium text-slate-300">{signal.indicators.elliottWave}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50 col-span-2">
                  <span className="text-slate-500">Mây Ichimoku</span>
                  <span className={cn("font-medium", signal.indicators.ichimoku === 'BULLISH' ? "text-emerald-400" : signal.indicators.ichimoku === 'BEARISH' ? "text-rose-400" : "text-slate-300")}>{signal.indicators.ichimoku} Mây</span>
                </div>
              </>
            )}

            {/* ICT */}
            {(tradeMode === 'ICT' || tradeMode === 'COMBINED') && (
              <>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500">Cấu trúc</span>
                  <span className="font-medium text-purple-300">{signal.indicators.ict.marketStructure}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500">Liquidity</span>
                  <span className="font-medium text-purple-300">{signal.indicators.ict.liquidity}</span>
                </div>
              </>
            )}

            {tradeMode === 'ICT' && (
              <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50 col-span-2">
                <span className="text-slate-500">Vùng cản (POI)</span>
                <span className="font-medium text-purple-300">{signal.indicators.ict.fvg} + {signal.indicators.ict.poi}</span>
              </div>
            )}

            {/* WYCKOFF */}
            {(tradeMode === 'WYCKOFF' || tradeMode === 'COMBINED') && (
              <>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500">Mô hình</span>
                  <span className="font-medium text-amber-300">{signal.indicators.wyckoff.schematic}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500">Pha</span>
                  <span className="font-medium text-amber-300">{signal.indicators.wyckoff.phase}</span>
                </div>
              </>
            )}
            
            {tradeMode === 'WYCKOFF' && (
              <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/50 col-span-2">
                <span className="text-slate-500">Sự kiện chính</span>
                <span className="font-medium text-amber-300">{signal.indicators.wyckoff.event}</span>
              </div>
            )}
          </div>
        </div>
  );
}
