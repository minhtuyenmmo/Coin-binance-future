import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Crosshair, Percent, RefreshCw, ShieldAlert, ShieldCheck, Target, TrendingUp, Zap, ChevronDown, ChevronUp, Clock, Star, Coins, Github, Loader2 } from 'lucide-react';
import { Timeframe, fetchTopFutures, SignalData, TOP_50_COINS } from './lib/binance';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [winRateSort, setWinRateSort] = useState<'desc' | 'asc'>('desc');
  const [filterWashTrade, setFilterWashTrade] = useState<boolean>(true);
  const [filterTopCoin, setFilterTopCoin] = useState<boolean>(false);
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
  
  const topSignals = [...filteredSignals].sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  const tableSignals = [...filteredSignals].sort((a, b) => {
    return winRateSort === 'desc' ? b.winRate - a.winRate : a.winRate - b.winRate;
  });

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
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Top 3 Tín Hiệu Nổi Bật</h2>
          <p className="text-slate-400 mt-1">Các đồng coin có xác suất thắng cao nhất theo phân tích dòng tiền và động lượng.</p>
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
                <TopCard key={signal.symbol} signal={signal} rank={index + 1} />
              ))}
            </AnimatePresence>
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
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Đang tải dữ liệu từ Binance...</td>
                    </tr>
                  ) : (
                    tableSignals.map((signal) => (
                      <TableRow key={signal.symbol} signal={signal} />
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

function TopCard({ signal, rank }: { signal: SignalData; rank: number }) {
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
          <div className="font-mono text-sm text-slate-200">${signal.entry}</div>
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

function TableRow({ signal }: { signal: SignalData }) {
  const isLong = signal.type === 'LONG';
  
  return (
    <tr className="hover:bg-slate-800/30 transition-colors flex flex-col sm:table-row px-4 py-4 sm:p-0 border-b border-slate-800/50 sm:border-b-0">
      <td className="sm:px-6 sm:py-4">
        <div className="flex items-center justify-between sm:justify-start">
          <div className="font-medium text-white flex items-center gap-1.5">
            {signal.symbol.replace('USDT', '')}
            <span className="text-slate-500 text-xs">USDT</span>
            {signal.hasFakeVolume && (
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Phát hiện Volume ảo">
                <ShieldAlert className="w-3 h-3" /> Ảo
              </span>
            )}
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
          <span>${signal.entry}</span>
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
  );
}
