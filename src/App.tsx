import { useEffect, useState, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Crosshair, Percent, RefreshCw, ShieldAlert, ShieldCheck, Target, TrendingUp, TrendingDown, Zap, ChevronDown, ChevronUp, Clock, Star, Coins, Github, Loader2, Crown, Activity, Compass, Layers, Sparkles, Search, Bot } from 'lucide-react';
import { Timeframe, fetchTopFutures, SignalData, TOP_50_COINS } from './lib/binance';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import AdvancedTradeModal from './components/AdvancedTradeModal';
import AdminPanel from './components/AdminPanel';

import { db } from './lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

type TradeMode = 'VOLUME' | 'TECHNICAL' | 'ICT' | 'WYCKOFF' | 'COMBINED';

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [winRateSort, setWinRateSort] = useState<'desc' | 'asc'>('desc');
  const [filterWashTrade, setFilterWashTrade] = useState<boolean>(true);
  const [filterTopCoin, setFilterTopCoin] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeMode, setTradeMode] = useState<TradeMode>('VOLUME');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('Update Tool');
  
  const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAIScanning, setIsAIScanning] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!passwordInput.trim()) return;
    setIsLoggingIn(true);
    setErrorMsg('');
    
    try {
      const passRef = doc(db, 'vip_passwords', passwordInput.trim());
      const passSnap = await getDoc(passRef);

      if (!passSnap.exists()) {
        setErrorMsg('Mật khẩu không hợp lệ.');
        setIsLoggingIn(false);
        return;
      }

      const passData = passSnap.data();
      let deviceId = localStorage.getItem('vip_device_id');
      if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem('vip_device_id', deviceId);
      }

      if (!passData.deviceId) {
        // Claim the password for this device
        try {
          await updateDoc(passRef, { deviceId });
          setIsAuthenticated(true);
        } catch (err) {
          setErrorMsg('Lỗi kích hoạt, có thể mật khẩu này vừa bị ai đó đăng nhập trước.');
        }
      } else if (passData.deviceId === deviceId) {
        // Matches current device
        setIsAuthenticated(true);
      } else {
        setErrorMsg('Mật khẩu này đã được đăng nhập và khóa cứng với một thiết bị khác!');
      }
    } catch (err: any) {
      setErrorMsg(`Lỗi kết nối: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

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
    if (searchQuery && !s.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  const adjustedSignals = useMemo(() => {
    return filteredSignals.map(signal => {
      // Tính toán chung cho TẤT CẢ các phương pháp để có subWinRates
      let techBase = 50;
      let ictBase = 50;
      let wyckoffBase = 50;
      
      const rsi = signal.indicators.rsi;
      const { macd, ichimoku, elliottWave, ict, wyckoff } = signal.indicators;
      const isLong = signal.type === 'LONG';
      
      // Tính Technical
      if (isLong) {
        if (macd === 'BULLISH') techBase += 15;
        if (ichimoku === 'BULLISH') techBase += 12;
        if (rsi < 45) techBase += (45 - rsi) * 0.8;
        if (elliottWave.includes('Sóng 3')) techBase += 10;
        if (elliottWave.includes('Sóng 5')) techBase += 5;
      } else {
        if (macd === 'BEARISH') techBase += 15;
        if (ichimoku === 'BEARISH') techBase += 12;
        if (rsi > 55) techBase += (rsi - 55) * 0.8;
        if (elliottWave.includes('Sóng C')) techBase += 10;
        if (elliottWave.includes('Sóng A')) techBase += 5;
      }
      
      // Tính ICT
      if (ict.marketStructure === 'BOS') ictBase += 15;
      if (ict.marketStructure === 'ChoCh') ictBase += 10;
      if (isLong && ict.liquidity === 'SSL Swept') ictBase += 10;
      if (!isLong && ict.liquidity === 'BSL Swept') ictBase += 10;
      if (isLong && ict.fvg === 'Bullish FVG') ictBase += 10;
      if (!isLong && ict.fvg === 'Bearish FVG') ictBase += 10;
      if (ict.poi === 'Orderblock') ictBase += 10;
      if (ict.poi === 'Breaker Block') ictBase += 5;
      
      // Tính Wyckoff
      if (wyckoff.phase === 'Phase A') wyckoffBase += 5;
      if (wyckoff.phase === 'Phase B') wyckoffBase += 5;
      if (wyckoff.phase === 'Phase C') wyckoffBase += 20;
      if (wyckoff.phase === 'Phase D') wyckoffBase += 15;
      if (wyckoff.phase === 'Phase E') wyckoffBase += 10;
      if (wyckoff.schematic === 'Accumulation' && isLong) wyckoffBase += 15;
      if (wyckoff.schematic === 'Distribution' && !isLong) wyckoffBase += 15;
      if (wyckoff.event === 'Spring/UTAD') wyckoffBase += 10;
      
      const finalTechBase = Math.min(99, techBase);
      const finalIctBase = Math.min(99, ictBase);
      const finalWyckoffBase = Math.min(99, wyckoffBase);
      const combinedWinRate = (finalTechBase + finalIctBase + finalWyckoffBase) / 3 + 10;

      const subWinRates = {
        volume: signal.winRate,
        technical: finalTechBase,
        ict: finalIctBase,
        wyckoff: finalWyckoffBase,
        combined: Math.min(98.5, Number(combinedWinRate.toFixed(1)))
      };

      let finalWinRate = signal.winRate; // Default to VOLUME
      if (tradeMode === 'TECHNICAL') finalWinRate = finalTechBase;
      if (tradeMode === 'ICT') finalWinRate = finalIctBase;
      if (tradeMode === 'WYCKOFF') finalWinRate = finalWyckoffBase;
      if (tradeMode === 'COMBINED') finalWinRate = subWinRates.combined;

      return {
        ...signal,
        winRate: Math.min(98.5, Number(finalWinRate.toFixed(1))),
        subWinRates
      };
    });
  }, [filteredSignals, tradeMode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAIScanning && !loading) {
      if (adjustedSignals.length > 0 && adjustedSignals.some(s => s.winRate >= 95)) {
        setIsAIScanning(false);
        // Play a sound or show a simple alert/notification
        // alert('Đã tìm thấy coin tiềm năng có Win Rate >= 95%!');
      } else {
        timer = setTimeout(() => {
          loadData(timeframe);
        }, 1500);
      }
    }
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIScanning, adjustedSignals, loading, timeframe]);

  const appContrarianSignals = useMemo(() => {
    if (adjustedSignals.length === 0) return [];
    return [...adjustedSignals]
      .filter(s => !s.hasFakeVolume)
      .sort((a, b) => {
        const rsiA = a.indicators?.rsi || 50;
        const rsiB = b.indicators?.rsi || 50;
        const devA = (a.type === 'LONG' ? (50 - rsiA) : (rsiA - 50)) / 50 * 100;
        const devB = (b.type === 'LONG' ? (50 - rsiB) : (rsiB - 50)) / 50 * 100;
        return devB - devA;
      })
      .slice(0, 3);
  }, [adjustedSignals]);

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
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                  onClick={() => setShowAdvancedAuth(true)}
                  className="flex items-center gap-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30 transition-colors cursor-pointer font-bold"
                >
                  <Crown className="w-3.5 h-3.5" /> Trade nâng cao
                </button>
              </div>
              <div className="relative group">
                <button 
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className={cn(
                    "flex items-center gap-1 mt-1 text-[11px] font-medium transition-colors w-max",
                    isUpdating ? "text-emerald-400" : "text-slate-500 hover:text-emerald-400"
                  )}
                >
                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Github className="w-3 h-3" />}
                  <span>{updateStatus}</span>
                </button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-max bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded shadow-lg z-50 border border-slate-700 pointer-events-none">
                  Nguồn: https://github.com/minhtuyenmmo/Coin-binance-future
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden sm:flex bg-slate-900 rounded-lg p-1 border border-slate-800 max-w-[60vw] overflow-x-auto no-scrollbar">
              {(['5m', '15m', '30m', '1h', '2h', '4h', '1d', '2d', '1w', '2w', '1M', '3M', '6M', '1y'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-2 sm:px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap",
                    timeframe === tf ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {tf.toLowerCase() === '1m' ? '1M' : tf.toLowerCase() === '3m' ? '3M' : tf.toLowerCase() === '6m' ? '6M' : tf}
                </button>
              ))}
            </div>
            
            {lastUpdated && (
              <span className="text-slate-400 hidden lg:inline-block">
                Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
              </span>
            )}
            {tradeMode !== 'VOLUME' && (
              <button
                 onClick={() => setIsAIScanning(!isAIScanning)}
                 className={cn(
                   "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap",
                   isAIScanning 
                     ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse" 
                     : "bg-slate-900 border-slate-700 text-amber-500 hover:bg-slate-800"
                 )}
              >
                <Bot className={cn("w-4 h-4", isAIScanning && "animate-bounce")} />
                <span className="hidden sm:inline-block">{isAIScanning ? "Đang quét AI..." : "Kích hoạt AI agent"}</span>
              </button>
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
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 w-max">
          {(['5m', '15m', '30m', '1h', '2h', '4h', '1d', '2d', '1w', '2w', '1M', '3M', '6M', '1y'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                timeframe === tf ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {tf.toLowerCase() === '1m' ? '1M' : tf.toLowerCase() === '3m' ? '3M' : tf.toLowerCase() === '6m' ? '6M' : tf}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-8">


        {/* Intro */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">Top 3 Tín Hiệu Nổi Bật</h2>
            <p className="text-red-500 font-bold animate-pulse mt-1">
              Mặc định hệ thống phân tích theo dòng tiền và động lượng "Volume"
            </p>
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
                <div key={`opt-${signal.symbol}`} className="w-full max-w-md">
                  <OptimalCard signal={signal} tradeMode={tradeMode} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kèo Ngược Chỉ Báo (Volume Mode Only) */}
        {!loading && tradeMode === 'VOLUME' && appContrarianSignals.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-sky-500/10 p-1.5 rounded-lg">
                <TrendingDown className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Top 3 Kèo Ngược Chỉ Báo</h2>
                <p className="text-sm text-slate-400">Các đồng coin có giá đi ngược % xa nhất so với tín hiệu gốc.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnimatePresence>
                {appContrarianSignals.map((signal, index) => (
                  <TopCard key={`con-${signal.symbol}`} signal={signal} rank={index + 1} tradeMode={tradeMode} isContrarian={true} />
                ))}
              </AnimatePresence>
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
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm coin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:w-48 pl-10 px-3 py-1.5 hover:border-slate-600 transition-colors placeholder-slate-500"
                />
              </div>
              
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

      <AnimatePresence>
        {showAdvancedAuth && !isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAdvancedAuth(false)} 
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                title="Đóng"
              >
                <Search className="w-5 h-5 rotate-45 transform pointer-events-none opacity-0" />
                <span className="absolute inset-0 flex items-center justify-center text-xl leading-none">×</span>
              </button>
              
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500"/> Trade Nâng Cao
              </h3>
              
              <p className="text-sm text-slate-400 mb-6 font-medium">
                Nhập mật khẩu để truy cập tính năng tìm điểm vào lệnh, đòn bẩy dự kiến với tỉ lệ thắng cao. <a href="https://www.facebook.com/minhtuyenmmo/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">Liên hệ Admin</a>
              </p>
              
              <div className="space-y-4">
                <div>
                  <input 
                    type="password"
                    placeholder="Nhập mật khẩu..."
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                  />
                  {errorMsg && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm mt-2 font-medium flex items-center gap-1"
                    >
                      <ShieldAlert className="w-4 h-4" /> {errorMsg}
                    </motion.p>
                  )}
                </div>
                
                <button 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex justify-center items-center gap-2"
                >
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Mở Khóa Tính Năng VIP'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdvancedAuth && isAuthenticated && (
          <AdvancedTradeModal 
            onClose={() => setShowAdvancedAuth(false)}
            signals={adjustedSignals}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel onClose={() => setShowAdminPanel(false)} />
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowAdminPanel(true)}
        className="fixed bottom-4 right-4 p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-all z-40 opacity-50 hover:opacity-100"
        title="Admin Panel"
      >
        <Crown className="w-5 h-5" />
      </button>
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

function TopCard({ signal, rank, tradeMode, isContrarian }: { signal: SignalData; rank: number; tradeMode: TradeMode; isContrarian?: boolean }) {
  const isLong = signal.type === 'LONG';
  const dev = signal.indicators?.rsi ? (isLong ? (50 - signal.indicators.rsi) : (signal.indicators.rsi - 50)) / 50 * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: rank * 0.1 }}
      className={cn("relative overflow-hidden rounded-2xl border bg-slate-900/40 p-6 flex flex-col transition-colors group", 
        isContrarian ? "border-sky-500/30 hover:border-sky-500/60" : "border-slate-800 hover:border-slate-700")}
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity",
        isContrarian ? "bg-sky-500" : (isLong ? "bg-emerald-500" : "bg-rose-500")
      )} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded", 
              isContrarian ? "bg-sky-500/20 text-sky-400" : "bg-slate-800 text-slate-300"
            )}>
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
        
        <div className="flex flex-col items-end gap-1">
          <div className={cn(
            "px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold shadow-sm",
            isLong ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
          )}>
            {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {signal.type} {signal.leverage}x
          </div>
          {isContrarian && (
            <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold bg-sky-500/20 text-sky-400" title="Độ lệch so với xu hướng chính">
              Ngược {Math.max(10, dev).toFixed(0)}%
            </span>
          )}
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
  const isInteractive = true;
  
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
  if (!signal.indicators) return null;
  
  return (
        <div className="mb-4 pt-4 border-t border-slate-800/50">
          <div className="text-xs font-semibold text-sky-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            {tradeMode === 'VOLUME' && <><Activity className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Tỉ Lệ Thắng Tổng Hợp</span></>}
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

            {(tradeMode === 'COMBINED' || tradeMode === 'VOLUME') && signal.subWinRates && (
              <div className="col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
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
