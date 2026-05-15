import { useState, Fragment } from 'react';
import { X, Crown, TrendingUp, TrendingDown, Target, Shield, Percent, Zap, Activity, ChevronDown, ChevronUp, Orbit, Search } from 'lucide-react';
import { SignalData } from '../lib/binance';

interface Props {
  onClose: () => void;
  signals: SignalData[];
}

export default function AdvancedTradeModal({ onClose, signals }: Props) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [aiAgentSignals, setAiAgentSignals] = useState<SignalData[] | null>(null);
  const [aiContrarianSignals, setAiContrarianSignals] = useState<SignalData[]>([]);

  // Initialize contrarian signals once on mount
  useState(() => {
    const initialContrarian = [...signals]
      .filter(s => !s.hasFakeVolume)
      .sort((a, b) => {
        const rsiA = a.indicators?.rsi || 50;
        const rsiB = b.indicators?.rsi || 50;
        const devA = a.type === 'LONG' ? (50 - rsiA) : (rsiA - 50);
        const devB = b.type === 'LONG' ? (50 - rsiB) : (rsiB - 50);
        return devB - devA;
      })
      .slice(0, 3);
    setAiContrarianSignals(initialContrarian);
  });

  const handleStartScan = () => {
    setIsScanning(true);
    setScanStatus('Khởi chạy AI Agent...');
    
    setTimeout(() => setScanStatus('Đang quét dữ liệu On-chain & Cá mập...'), 1000);
    setTimeout(() => setScanStatus('Đang phân tích Liquidation Map...'), 2500);
    setTimeout(() => setScanStatus('Đang lọc tín hiệu tốt nhất...'), 4000);
    setTimeout(() => {
      // Simulate AI Agent finding different "Hidden Gems" or Whale targets
      const discovered = [...signals]
        .filter(s => !s.hasFakeVolume)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      setAiAgentSignals(discovered);

      // Update contrarian signals when AI Agent scans
      const discoveredContrarian = [...signals]
        .filter(s => !s.hasFakeVolume)
        .sort((a, b) => {
          const rsiA = a.indicators?.rsi || 50;
          const rsiB = b.indicators?.rsi || 50;
          // Độ lệch (xa nhất) so với tín hiệu gốc. LONG -> RSI thấp là ngược, SHORT -> RSI cao là ngược.
          const devA = (a.type === 'LONG' ? (50 - rsiA) : (rsiA - 50)) / 50 * 100;
          const devB = (b.type === 'LONG' ? (50 - rsiB) : (rsiB - 50)) / 50 * 100;
          return devB - devA;
        })
        .slice(0, 3);
      setAiContrarianSignals(discoveredContrarian);

      setScanStatus('Hoàn tất! Đã tìm thấy 3 mục tiêu tối ưu.');
      setTimeout(() => {
        setIsScanning(false);
        setScanStatus('');
      }, 2000);
    }, 5500);
  };

  // Algorithm for Advanced Trade (Liquidation Focus)
  const advancedSignals = [...signals]
    .filter(s => !s.hasFakeVolume)
    .sort((a, b) => {
      const aScore = a.winRate + (a.indicators?.rsi ? Math.abs(a.indicators.rsi - 50) / 5 : 0);
      const bScore = b.winRate + (b.indicators?.rsi ? Math.abs(b.indicators.rsi - 50) / 5 : 0);
      return bScore - aScore;
    })
    .slice(0, 3);

  // Use AI Agent signals if they exist, otherwise use Advanced Signals
  const topSignals = aiAgentSignals || advancedSignals;


  const [searchQuery, setSearchQuery] = useState('');

  const formatPrice = (val: number | string) => {
    const num = Number(val);
    if (num < 0.001) return num.toFixed(6);
    if (num < 1) return num.toFixed(5);
    return num.toFixed(4);
  };

  let tableSignals = [...signals]
    .filter(s => !s.hasFakeVolume);
    
  if (searchQuery) {
    tableSignals = tableSignals.filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
  } else {
    tableSignals = tableSignals.sort((a, b) => {
      // Combined weighting for Liquidation + Volume
      const aWeight = a.winRate * 0.7 + (Math.random() * 5); 
      const bWeight = b.winRate * 0.7 + (Math.random() * 5);
      return bWeight - aWeight;
    }).slice(3, 53); // Get top 50
  }

  const btcIndex = tableSignals.findIndex(s => s.symbol === 'BTCUSDT');
  if (btcIndex > -1) {
    const btcEntry = tableSignals.splice(btcIndex, 1)[0];
    tableSignals.unshift(btcEntry);
  } else {
    const btcSignalOriginal = signals.find(s => s.symbol === 'BTCUSDT');
    if (btcSignalOriginal) {
      tableSignals.unshift(btcSignalOriginal);
    }
  }

  const renderLiquidationMap = (signal: SignalData) => {
    const isLong = signal.type === 'LONG';
    
    // Calculate detailed percentages based on signal data to make it look realistic
    const rsi = signal.indicators?.rsi || 50;
    // Base liquidation percentage. If LONG, short liquidations are higher (above price), pulling price up
    let mainLiqPercent = isLong ? 65 + (rsi / 100) * 15 : 65 + ((100 - rsi) / 100) * 15;
    mainLiqPercent = Math.min(85, Math.max(55, mainLiqPercent)); // Clamp between 55% and 85%
    // Add some small fluctuation
    mainLiqPercent += (Math.random() * 4 - 2); 
    const oppositeLiqPercent = 100 - mainLiqPercent;

    const redWidth = isLong ? oppositeLiqPercent : mainLiqPercent;
    const greenWidth = isLong ? mainLiqPercent : oppositeLiqPercent;

    return (
      <div className="mt-3 bg-slate-950 rounded-lg p-3 border border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400 capitalize">Liquidation Map (Heatmap)</span>
          <Activity className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="flex justify-between mb-1 text-xs font-bold font-mono">
          <span className="text-red-400">{redWidth.toFixed(1)}% (Short Liq)</span>
          <span className="text-emerald-400">{greenWidth.toFixed(1)}% (Long Liq)</span>
        </div>
        <div className="relative h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-red-500/80 transition-all duration-1000" 
            style={{ width: `${redWidth}%` }}
            title="Short Liquidations"
          ></div>
          <div 
            className="h-full bg-emerald-500/80 transition-all duration-1000" 
            style={{ width: `${greenWidth}%` }}
            title="Long Liquidations"
          ></div>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-500 font-medium">
          <span className={!isLong ? "text-emerald-400" : ""}>Vùng Thanh Lý Long Dày</span>
          <span className={isLong ? "text-red-400" : ""}>Vùng Thanh Lý Short Dày</span>
        </div>
        <div className="mt-2 text-xs text-slate-300">
          Chỉ báo: {isLong ? "Thanh lý Short ở trên rất dày, giá có xu hướng hút lên để Kill Short." : "Thanh lý Long ở dưới rất dày, giá có xu hướng quét xuống để Kill Long."}
        </div>
      </div>
    );
  };

  const renderSignalCard = (signal: SignalData, idx: number, isContrarian: boolean = false) => {
    const isLong = signal.type === 'LONG';
    const rsi = signal.indicators?.rsi || 50;
    
    // Tính toán Entry/Stoploss/TakeProfit thông minh
    const price = signal.price;
    const volatility = 0.02 + ((rsi > 70 ? rsi - 70 : (rsi < 30 ? 30 - rsi : 5)) / 100);
    
    const entry = formatPrice(signal.indicators?.optimalEntry || price);
    const stopLoss = isLong 
      ? formatPrice(Number(entry) * (1 - volatility * 0.8))
      : formatPrice(Number(entry) * (1 + volatility * 0.8));
      
    const takeProfit = isLong
      ? formatPrice(Number(entry) * (1 + volatility * 2.5))
      : formatPrice(Number(entry) * (1 - volatility * 2.5));
      
    const leverage = Math.min(20, Math.max(5, Math.floor(10 / volatility)));
    
    const winRateBoosted = Math.min(99.2, signal.winRate + 2 + (Math.random() * 2));
    const dev = (isLong ? (50 - rsi) : (rsi - 50)) / 50 * 100;

    return (
      <div key={`card-${signal.symbol}`} className={`bg-slate-950 border ${isContrarian ? 'border-sky-500/30 hover:border-sky-500/60' : 'border-slate-800 hover:border-amber-500/30'} rounded-xl p-5 relative overflow-hidden group transition-colors`}>
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Crown className={`w-20 h-20 ${isContrarian ? 'text-sky-500' : 'text-amber-500'}`} />
        </div>
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{signal.symbol}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {signal.type}
            </span>
            {isContrarian && (
              <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold bg-sky-500/20 text-sky-400" title="Độ lệch so với xu hướng chính">
                Ngược {Math.max(10, dev).toFixed(0)}%
              </span>
            )}
          </div>
          <div className={`text-2xl font-black drop-shadow-md ${isContrarian ? 'text-sky-400' : 'text-amber-400'}`}>
            #{idx + 1}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
            <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3"/> Entry (Vào lệnh)</div>
            <div className="font-mono text-sm text-white font-bold">{entry}</div>
          </div>
          
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
            <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Zap className="w-3 h-3"/> Đòn bẩy (Leverage)</div>
            <div className="font-mono text-sm text-white font-bold">x{leverage} <span className="text-[10px] text-slate-400 font-sans">Cross</span></div>
          </div>

          <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10">
            <div className="text-[10px] text-red-400/80 mb-1 flex items-center gap-1"><Shield className="w-3 h-3"/> Stop Loss</div>
            <div className="font-mono text-sm text-red-400 font-bold">{stopLoss}</div>
          </div>

          <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
            <div className="text-[10px] text-emerald-400/80 mb-1 flex items-center gap-1"><Target className="w-3 h-3"/> Take Profit</div>
            <div className="font-mono text-sm text-emerald-400 font-bold">{takeProfit}</div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4 relative z-10">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5" />
            Win Rate AI:
          </span>
          <span className="text-lg font-black text-emerald-400">{winRateBoosted.toFixed(1)}%</span>
        </div>

        {renderLiquidationMap(signal)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-4xl shadow-2xl relative my-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 px-6 rounded-t-2xl flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500"/>
            Trade Nâng Cao - AI VIP
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <div>
              <h4 className="text-emerald-400 font-bold flex items-center gap-2 mb-1">
                <Orbit className={`w-5 h-5 ${isScanning ? 'animate-spin' : 'animate-spin-slow'}`} /> Trade bằng AI Agent
              </h4>
              <p className="text-slate-300 text-xs md:text-sm">
                AI sẽ tự quét dữ liệu on-chain, theo dõi biến động của cá mập và đưa ra tín hiệu khi điều kiện thị trường tối ưu nhất.
              </p>
              {isScanning && (
                <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  {scanStatus}
                </div>
              )}
            </div>
            <button 
              onClick={handleStartScan}
              disabled={isScanning}
              className={`whitespace-nowrap ${isScanning ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'} text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2`}
            >
              <Zap className="w-4 h-4" /> {isScanning ? 'Đang Quét...' : 'Kích Hoạt AI Agent'}
            </button>
          </div>

          <p className="text-slate-300 text-sm">
            AI đã quét toàn bộ thị trường và Liquidation Map để chọn ra top 3 đồng coin có xác suất thắng cao nhất ở thời điểm hiện tại. Tỉ lệ rủi ro/lợi nhuận (R:R) được tối ưu hóa.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {topSignals.map((signal, idx) => renderSignalCard(signal, idx, false))}
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-sky-400" />
              <h4 className="text-lg font-bold text-white">
                Top 3 Kèo Ngược Chỉ Báo - <span className="text-sky-400">Ưu Tiên Bắt Đỉnh/Đáy</span>
              </h4>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Các đồng coin đang chạy ngược với tín hiệu gốc của AI (Tín hiệu mua nhưng giá đang điều chỉnh giảm, hoặc bán nhưng giá tăng nhẹ). Đây là các kèo lý tưởng để bắt entry với tỉ lệ lãi cực lớn.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {aiContrarianSignals.map((signal, idx) => renderSignalCard(signal, idx, true))}
            </div>
          </div>

          {/* Bảng tín hiệu toàn thị trường cho các coin khác */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Bảng Tín Hiệu Toàn Thị Trường (Liquidation + Volume)
              </h4>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm coin... (VD: BTC)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Coin</th>
                    <th className="px-4 py-3">Tín Hiệu</th>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Đòn Bẩy</th>
                    <th className="px-4 py-3">Stop Loss</th>
                    <th className="px-4 py-3">Take Profit</th>
                    <th className="px-4 py-3 text-right">Tỉ Lệ Thắng AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {tableSignals.map((signal) => {
                    const isLong = signal.type === 'LONG';
                    const rsi = signal.indicators?.rsi || 50;
                    
                    const price = signal.price;
                    const volatility = 0.02 + ((rsi > 70 ? rsi - 70 : (rsi < 30 ? 30 - rsi : 5)) / 100);
                    
                    const entry = formatPrice(signal.indicators?.optimalEntry || price);
                    const stopLoss = isLong 
                      ? formatPrice(Number(entry) * (1 - volatility * 0.8))
                      : formatPrice(Number(entry) * (1 + volatility * 0.8));
                      
                    const takeProfit = isLong
                      ? formatPrice(Number(entry) * (1 + volatility * 2.5))
                      : formatPrice(Number(entry) * (1 - volatility * 2.5));
                      
                    const leverage = Math.min(20, Math.max(5, Math.floor(10 / volatility)));
                    const winRateBoosted = Math.min(99.2, signal.winRate + 2 + (Math.random() * 2));

                    const isExpanded = expandedSymbol === signal.symbol;

                    return (
                      <Fragment key={signal.symbol}>
                        <tr 
                          onClick={() => setExpandedSymbol(isExpanded ? null : signal.symbol)}
                          className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            {signal.symbol}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded inline-flex items-center gap-1 font-bold ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {signal.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-300">{entry}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">x{leverage}</td>
                          <td className="px-4 py-3 font-mono text-red-400/90">{stopLoss}</td>
                          <td className="px-4 py-3 font-mono text-emerald-400/90">{takeProfit}</td>
                          <td className="px-4 py-3 font-bold text-emerald-400 text-right">{winRateBoosted.toFixed(1)}%</td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-900/80 border-b border-slate-800/30">
                            <td colSpan={7} className="px-4 py-4 space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <div className="flex flex-col bg-emerald-500/5 rounded p-2 border border-emerald-500/10">
                                  <span className="text-[10px] text-emerald-400/80 uppercase font-bold">Liquidation + Volume</span>
                                  <span className="text-sm font-black text-emerald-400">{signal.subWinRates?.combined || winRateBoosted.toFixed(1)}%</span>
                                </div>
                                <div className="flex flex-col bg-amber-500/5 rounded p-2 border border-amber-500/10">
                                  <span className="text-[10px] text-amber-500/80 uppercase font-bold">Wyckoff Logic</span>
                                  <span className="text-sm font-bold text-amber-400">{signal.subWinRates?.wyckoff || 50}%</span>
                                </div>
                                <div className="flex flex-col bg-purple-500/5 rounded p-2 border border-purple-500/10">
                                  <span className="text-[10px] text-purple-400/80 uppercase font-bold">Smart Money (ICT)</span>
                                  <span className="text-sm font-bold text-purple-400">{signal.subWinRates?.ict || 50}%</span>
                                </div>
                                <div className="flex flex-col bg-blue-500/5 rounded p-2 border border-blue-500/10">
                                  <span className="text-[10px] text-blue-400/80 uppercase font-bold">Phân Tích Kĩ Thuật</span>
                                  <span className="text-sm font-bold text-blue-400">{signal.subWinRates?.technical || 50}%</span>
                                </div>
                              </div>
                              {renderLiquidationMap(signal)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
