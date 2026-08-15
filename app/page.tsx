'use client'

import { useEffect, useState } from 'react'

type Position = { symbol: string; qty: number; market_value: number; avg_entry_price: number; unrealized_pl: number; current_price: number | null }
type Account = { equity: number; buyingPower: number; cash: number; startingCash: number }
type Quote = { symbol: string; price: number; previousPrice: number; change: number; changePercent: number }
type Order = { id: string; symbol: string; side: string; qty: number; status: string; order_type: string; time_in_force: string; limit_price?: number; stop_price?: number; filled_qty: number; remaining_qty: number; avg_fill_price?: number; rejection_reason?: string }

const symbols = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'SPY', 'QQQ', 'BRK.B']

export default function Home() {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('password123')
  const [logged, setLogged] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [symbol, setSymbol] = useState('AAPL')
  const [qty, setQty] = useState('1')
  const [orderType, setOrderType] = useState('market')
  const [timeInForce, setTimeInForce] = useState('day')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [msg, setMsg] = useState('')

  async function refresh() {
    const [a, p, o] = await Promise.all([fetch('/api/portfolio'), fetch('/api/positions'), fetch('/api/orders')])
    if (a.ok) {
      const j = await a.json()
      setAccount(j.account)
      setLogged(true)
    } else if (a.status === 401) {
      setLogged(false)
    }
    if (p.ok) setPositions((await p.json()).positions || [])
    if (o.ok) setOrders((await o.json()).orders || [])
  }

  useEffect(() => { refresh() }, [])

  async function login() {
    let r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (!r.ok && r.status === 401) {
      r = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    }
    const body = await r.json()
    if (r.ok) { setMsg(''); await refresh() } else setMsg(body.error || 'Authentication failed')
  }

  async function getQuote(nextSymbol = symbol) {
    const r = await fetch('/api/quote?symbol=' + encodeURIComponent(nextSymbol))
    const j = await r.json()
    if (r.ok) { setQuote(j); if (!limitPrice) setLimitPrice(Number(j.price).toFixed(2)); if (!stopPrice) setStopPrice(Number(j.price).toFixed(2)) }
    else setMsg(j.error || 'Quote failed')
  }

  async function advanceMarket() {
    const r = await fetch('/api/paper/market/advance', { method: 'POST' })
    const j = await r.json()
    if (r.ok) { setMsg(`Market advanced; ${j.orders.filled} order(s) filled`); await getQuote(); await refresh() }
    else setMsg(j.error || 'Failed to advance paper market')
  }

  async function order(side: 'buy' | 'sell') {
    const payload: Record<string, unknown> = { symbol, side, qty: Number(qty), orderType, timeInForce }
    if (orderType === 'limit' || orderType === 'stop_limit') payload.limitPrice = Number(limitPrice)
    if (orderType === 'stop' || orderType === 'stop_limit') payload.stopPrice = Number(stopPrice)
    const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await r.json()
    setMsg(r.ok && j.order?.status === 'filled' ? `Filled ${side} ${qty} ${symbol}` : r.ok ? `Order ${j.order.status}: ${symbol}` : (j.error || 'Order failed'))
    if (r.ok) await refresh()
  }

  async function cancel(id: string) {
    const r = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' })
    const j = await r.json()
    setMsg(r.ok ? 'Order canceled' : (j.error || 'Cancel failed'))
    await refresh()
  }

  if (!logged) return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 430, margin: '12vh auto' }}>
        <div className="brand">Robinhood Clone</div>
        <p className="muted">Paper trading with a real backend.</p>
        <div className="stack">
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button className="btn" onClick={login}>Sign in / create account</button>
          {msg && <small>{msg}</small>}
        </div>
      </div>
    </main>
  )

  return (
    <main className="shell">
      <header className="top">
        <div>
          <div className="brand">Robinhood Clone</div>
          <div className="muted">Self-hosted paper trading · $100,000 starting cash</div>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={advanceMarket}>Advance market</button>
          <button className="btn secondary" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.reload() }}>Log out</button>
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <div className="muted">Portfolio value</div>
          <div className="value">${Number(account?.equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="row muted"><span>Cash ${Number(account?.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><span>Buying power ${Number(account?.buyingPower || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <hr />
          <h3>Positions</h3>
          <div className="list">{positions.length ? positions.map(p => <div className="item" key={p.symbol}><b>{p.symbol}</b><span>{p.qty.toFixed(4)} · ${p.market_value.toFixed(2)} · P/L ${p.unrealized_pl.toFixed(2)}</span></div>) : <div className="muted">No positions yet.</div>}</div>
          <hr />
          <h3>Recent orders</h3>
          <div className="list">
            {orders.length ? orders.slice(0, 10).map(o => <div className="item" key={o.id}><span><b>{o.side.toUpperCase()} {o.qty}</b> {o.symbol} · {o.order_type}</span><span>{o.status}{['open', 'triggered'].includes(o.status) && <button className="btn tiny secondary" onClick={() => cancel(o.id)}>Cancel</button>}</span></div>) : <div className="muted">No orders yet.</div>}
          </div>
        </section>

        <aside className="card">
          <h3>Trade</h3>
          <div className="stack">
            <select className="input" value={symbol} onChange={e => { setSymbol(e.target.value); getQuote(e.target.value) }}>{symbols.map(s => <option key={s}>{s}</option>)}</select>
            <button className="btn secondary" onClick={() => getQuote()}>Get quote</button>
            {quote && <div><div className="quote">${quote.price.toFixed(2)}</div><div className="muted">{quote.symbol} · {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)</div></div>}
            <input className="input" value={qty} onChange={e => setQty(e.target.value)} type="number" min="0.0001" step="0.0001" placeholder="Quantity" />
            <select className="input" value={orderType} onChange={e => setOrderType(e.target.value)}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop Limit</option>
            </select>
            <select className="input" value={timeInForce} onChange={e => setTimeInForce(e.target.value)}><option value="day">Day</option><option value="gtc">GTC</option></select>
            {(orderType === 'limit' || orderType === 'stop_limit') && <input className="input" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Limit price" />}
            {(orderType === 'stop' || orderType === 'stop_limit') && <input className="input" value={stopPrice} onChange={e => setStopPrice(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Stop price" />}
            <div className="row"><button className="btn buy" onClick={() => order('buy')}>Buy</button><button className="btn sell" onClick={() => order('sell')}>Sell</button></div>
            {msg && <small>{msg}</small>}
          </div>
        </aside>
      </div>
    </main>
  )
}
