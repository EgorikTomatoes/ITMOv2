import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const money = (value) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 5 : 2 })}`;

export default function PriceChart({ coin, height = 300, compact = false }) {
  if (!coin) return null;
  const positive = coin.change >= 0;
  return <div style={{ height }} className="w-full">
    <ResponsiveContainer width="100%" height="100%"><AreaChart data={coin.history} margin={{ top: 12, right: compact ? 0 : 12, left: compact ? 0 : 4, bottom: 0 }}>
      <defs><linearGradient id={`fill-${coin.symbol}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={positive ? '#b8f43d' : '#fb7185'} stopOpacity=".28"/><stop offset="1" stopColor={positive ? '#b8f43d' : '#fb7185'} stopOpacity="0"/></linearGradient></defs>
      {!compact && <CartesianGrid stroke="#182231" strokeDasharray="3 5" vertical={false}/>} 
      {!compact && <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(v).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })} stroke="#526074" fontSize={11} tickLine={false} axisLine={false}/>} 
      {!compact && <YAxis domain={['auto', 'auto']} orientation="right" tickFormatter={money} stroke="#526074" fontSize={11} tickLine={false} axisLine={false} width={76}/>} 
      {!compact && <Tooltip contentStyle={{ background: '#111925', border: '1px solid #263245', borderRadius: 12 }} labelFormatter={(v) => new Date(v).toLocaleString('ru')} formatter={(v) => [money(v), coin.symbol]}/>} 
      <Area type="monotone" dataKey="price" stroke={positive ? '#b8f43d' : '#fb7185'} strokeWidth={2} fill={`url(#fill-${coin.symbol})`} isAnimationActive={false}/>
    </AreaChart></ResponsiveContainer>
  </div>;
}
