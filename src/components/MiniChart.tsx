import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

interface MiniChartProps {
  symbol: string;
  color: string;
}

export function MiniChart({ symbol, color }: MiniChartProps) {
  const [data, setData] = useState<{ value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchChart = async () => {
      setLoading(true);
      try {
        const endpointsWithCORSReady = [
          'https://api.binance.com/api/v3/klines',
          'https://fapi.binance.com/fapi/v1/klines'
        ];

        let klines = null;
        for (const ep of endpointsWithCORSReady) {
          try {
            const res = await fetch(`${ep}?symbol=${symbol}&interval=15m&limit=192`);
            if (res.ok) {
              klines = await res.json();
              break;
            }
          } catch (e) {
            // ignore
          }
        }

        if (klines && isMounted) {
          const chartData = klines.map((k: any) => ({
            value: parseFloat(k[4]) // close price
          }));
          setData(chartData);
        }
      } catch (err) {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchChart();

    return () => { isMounted = false; };
  }, [symbol]);

  if (loading) {
    return <div className="h-full w-full flex items-center justify-center">
      <div className="w-1/2 h-0.5 bg-slate-800 rounded animate-pulse"></div>
    </div>;
  }

  if (data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-600">No data</div>;
  }

  // Calculate min and max for YAxis domain dynamically to make sparkline prominent
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const diff = max - min;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis domain={[min - diff * 0.1, max + diff * 0.1]} hide />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={1.5} 
          dot={false} 
          isAnimationActive={true}
          animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
