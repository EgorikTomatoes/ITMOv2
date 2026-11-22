export default function CoinIcon({ coin, size = 'md' }) {
  const classes = size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs';
  return <span className={`grid shrink-0 place-items-center rounded-full font-bold text-black ${classes}`} style={{ backgroundColor: coin.color }}>{coin.symbol.slice(0, 1)}</span>;
}
