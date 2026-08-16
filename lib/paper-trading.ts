import { randomUUID } from 'node:crypto'
import { sql, withTransaction } from './db'
import { PAPER_SYMBOLS, getPaperQuote } from './paper-market'

export type PaperOrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type PaperSide = 'buy' | 'sell'
export type PaperTimeInForce = 'day' | 'gtc'

export type OrderInput = {
  userId: string
  symbol: string
  side: PaperSide
  qty: number
  orderType: PaperOrderType
  timeInForce: PaperTimeInForce
  limitPrice?: number
  stopPrice?: number
  clientOrderId?: string
}

export type Execution = { action: 'fill' | 'hold'; price?: number }

const SLIPPAGE_BPS = 10

export async function ensurePaperAccount(userId: string) {
  const startingCash = Number(process.env.PAPER_STARTING_CASH || 100000)
  const rows = await sql`
    insert into paper_accounts(user_id, starting_cash, cash)
    values(${userId}, ${startingCash}, ${startingCash})
    on conflict (user_id) do update set updated_at = now()
    returning user_id, starting_cash, cash, created_at, updated_at
  `
  return rows[0]
}

export async function getPaperAccount(userId: string) {
  await ensurePaperAccount(userId)
  const rows = await sql`
    select user_id, starting_cash, cash, created_at, updated_at
    from paper_accounts
    where user_id = ${userId}
  `
  const account = rows[0]
  if (!account) throw new Error('Paper account could not be loaded')

  const positions = await sql`
    select symbol, quantity, average_cost
    from positions
    where user_id = ${userId} and quantity > 0
  `
  const marketValues = await Promise.all(positions.map(async (position) => {
    const quote = await getPaperQuote(String(position.symbol))
    return quote ? Number(position.quantity) * quote.price : 0
  }))
  const equity = Number(account.cash) + marketValues.reduce((sum, value) => sum + value, 0)
  return {
    cash: Number(account.cash),
    equity,
    buyingPower: Number(account.cash),
    startingCash: Number(account.starting_cash),
  }
}

export async function getPaperPositions(userId: string) {
  const rows = await sql`
    select symbol, quantity, average_cost, updated_at
    from positions
    where user_id = ${userId} and quantity > 0
    order by symbol
  `
  return Promise.all(rows.map(async (position) => {
    const quote = await getPaperQuote(String(position.symbol))
    const qty = Number(position.quantity)
    const avgEntry = Number(position.average_cost)
    const marketValue = quote ? qty * quote.price : 0
    const unrealizedPl = quote ? (quote.price - avgEntry) * qty : 0
    return {
      symbol: String(position.symbol),
      qty,
      market_value: marketValue,
      avg_entry_price: avgEntry,
      unrealized_pl: unrealizedPl,
      current_price: quote?.price ?? null,
      updated_at: new Date(position.updated_at).toISOString(),
    }
  }))
}

export async function submitPaperOrder(input: OrderInput) {
  validateOrderInput(input)
  await ensurePaperAccount(input.userId)

  const quote = await getPaperQuote(input.symbol)
  if (!quote) throw new Error(`Unsupported paper symbol: ${input.symbol}`)

  return withTransaction(async (tx) => {
    if (input.clientOrderId) {
      const existing = await tx.query(
        'select id, broker_order_id, status, symbol, side, qty, order_type, time_in_force from orders where user_id = $1 and client_order_id = $2',
        [input.userId, input.clientOrderId],
      )
      if (existing.rows[0]) return existing.rows[0]
    }

    const orderId = randomUUID()
    const brokerOrderId = `paper_${orderId}`
    const execution = evaluateExecution(input, quote.price, false)
    const initialStatus = execution.action === 'fill' ? 'open' : 'open'

    const order = await tx.query(
      `insert into orders(
        id, user_id, broker_order_id, symbol, side, qty, status, execution_mode,
        order_type, time_in_force, limit_price, stop_price, filled_qty,
        remaining_qty, avg_fill_price, submitted_at, updated_at, client_order_id
      ) values ($1,$2,$3,$4,$5,$6,$7,'paper',$8,$9,$10,$11,0,$12,null,now(),now(),$13)
      returning id, broker_order_id, symbol, side, qty, status, execution_mode,
        order_type, time_in_force, limit_price, stop_price, filled_qty,
        remaining_qty, avg_fill_price, submitted_at, updated_at`,
      [
        orderId,
        input.userId,
        brokerOrderId,
        input.symbol,
        input.side,
        input.qty,
        initialStatus,
        input.orderType,
        input.timeInForce,
        input.limitPrice ?? null,
        input.stopPrice ?? null,
        input.qty,
        input.clientOrderId ?? null,
      ],
    )

    if (execution.action === 'fill' && execution.price !== undefined) {
      try {
        await applyFill(tx, input.userId, orderId, input.symbol, input.side, input.qty, execution.price)
        const updated = await tx.query(
          `update orders set status = 'filled', filled_qty = qty, remaining_qty = 0,
             avg_fill_price = $1, updated_at = now(),
             triggered_at = case when order_type in ('stop','stop_limit') then now() else triggered_at end
           where id = $2
           returning id, broker_order_id, symbol, side, qty, status, execution_mode,
             order_type, time_in_force, limit_price, stop_price, filled_qty,
             remaining_qty, avg_fill_price, submitted_at, updated_at`,
          [execution.price, orderId],
        )
        return updated.rows[0]
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Order rejected'
        const rejected = await tx.query(
          `update orders set status = 'rejected', rejection_reason = $1, updated_at = now()
           where id = $2
           returning id, broker_order_id, symbol, side, qty, status, execution_mode,
             order_type, time_in_force, limit_price, stop_price, filled_qty,
             remaining_qty, avg_fill_price, submitted_at, updated_at, rejection_reason`,
          [reason, orderId],
        )
        return rejected.rows[0]
      }
    }

    return order.rows[0]
  })
}

export async function cancelPaperOrder(userId: string, orderId: string) {
  return withTransaction(async (tx) => {
    const result = await tx.query(
      `update orders
       set status = 'canceled', cancel_reason = 'Canceled by user', updated_at = now()
       where id = $1 and user_id = $2 and execution_mode = 'paper' and status in ('open','triggered')
       returning id, status, cancel_reason`,
      [orderId, userId],
    )
    if (!result.rows[0]) throw new Error('Order cannot be canceled')
    return result.rows[0]
  })
}

export async function getPaperOrders(userId: string) {
  const rows = await sql`
    select id, broker_order_id, symbol, side, qty, status, execution_mode,
      order_type, time_in_force, limit_price, stop_price, filled_qty,
      remaining_qty, avg_fill_price, submitted_at, updated_at,
      rejection_reason, cancel_reason
    from orders
    where user_id = ${userId} and execution_mode = 'paper'
    order by submitted_at desc
    limit 100
  `
  return rows
}

export async function advancePaperOrders(userId?: string) {
  const openOrders = userId
    ? await sql`
        select id, user_id, symbol, side, qty, status, order_type,
          limit_price, stop_price, filled_qty, remaining_qty
        from orders
        where execution_mode = 'paper' and status in ('open','triggered') and user_id = ${userId}
        order by submitted_at asc
      `
    : await sql`
        select id, user_id, symbol, side, qty, status, order_type,
          limit_price, stop_price, filled_qty, remaining_qty
        from orders
        where execution_mode = 'paper' and status in ('open','triggered')
        order by submitted_at asc
      `

  let filled = 0
  let rejected = 0
  let triggered = 0

  for (const order of openOrders) {
    const quote = await getPaperQuote(String(order.symbol))
    if (!quote) continue

    const input = inputOrderFromRow(order)
    const wasTriggered = String(order.status) === 'triggered'
    const execution = evaluateExecution(input, quote.price, wasTriggered)
    const crossed = crossedStop(input, quote.price)

    if (!wasTriggered && input.orderType === 'stop_limit' && crossed && execution.action === 'hold') {
      await sql`
        update orders
        set status = 'triggered', triggered_at = now(), updated_at = now()
        where id = ${order.id} and status = 'open'
      `
      triggered += 1
      continue
    }

    if (execution.action !== 'fill' || execution.price === undefined) continue

    await withTransaction(async (tx) => {
      const locked = await tx.query(
        `select id, user_id, symbol, side, order_type, remaining_qty, status
         from orders where id = $1 for update`,
        [order.id],
      )
      const lockedOrder = locked.rows[0]
      if (!lockedOrder || !['open', 'triggered'].includes(String(lockedOrder.status))) return

      const qty = Number(lockedOrder.remaining_qty)
      try {
        await applyFill(
          tx,
          String(lockedOrder.user_id),
          String(lockedOrder.id),
          String(lockedOrder.symbol),
          String(lockedOrder.side) as PaperSide,
          qty,
          execution.price!,
        )
        await tx.query(
          `update orders set status = 'filled', filled_qty = qty, remaining_qty = 0,
             avg_fill_price = $1, updated_at = now(),
             triggered_at = case when order_type in ('stop','stop_limit') then coalesce(triggered_at, now()) else triggered_at end
           where id = $2`,
          [execution.price, lockedOrder.id],
        )
        filled += 1
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Order rejected'
        await tx.query(
          `update orders set status = 'rejected', rejection_reason = $1, updated_at = now()
           where id = $2`,
          [reason, lockedOrder.id],
        )
        rejected += 1
      }
    })
  }

  return { scanned: openOrders.length, triggered, filled, rejected }
}

function inputOrderFromRow(order: Record<string, any>): OrderInput {
  return {
    userId: String(order.user_id),
    symbol: String(order.symbol),
    side: String(order.side) as PaperSide,
    qty: Number(order.remaining_qty ?? order.qty),
    orderType: String(order.order_type) as PaperOrderType,
    timeInForce: 'gtc',
    limitPrice: order.limit_price == null ? undefined : Number(order.limit_price),
    stopPrice: order.stop_price == null ? undefined : Number(order.stop_price),
  }
}

export function crossedStop(input: OrderInput, price: number) {
  if (input.stopPrice === undefined) return false
  return input.side === 'buy' ? price >= input.stopPrice : price <= input.stopPrice
}

export function evaluateExecution(input: OrderInput, marketPrice: number, alreadyTriggered: boolean, slippageBps = SLIPPAGE_BPS): Execution {
  if (input.orderType === 'market') return { action: 'fill', price: withSlippage(marketPrice, input.side, slippageBps) }

  if (input.orderType === 'limit') {
    const executable = input.side === 'buy' ? marketPrice <= input.limitPrice! : marketPrice >= input.limitPrice!
    return executable ? { action: 'fill', price: clampToLimit(withSlippage(marketPrice, input.side, slippageBps), input.side, input.limitPrice!) } : { action: 'hold' }
  }

  const triggered = alreadyTriggered || crossedStop(input, marketPrice)
  if (!triggered) return { action: 'hold' }

  if (input.orderType === 'stop') return { action: 'fill', price: withSlippage(marketPrice, input.side, slippageBps) }

  const executable = input.side === 'buy' ? marketPrice <= input.limitPrice! : marketPrice >= input.limitPrice!
  return executable ? { action: 'fill', price: clampToLimit(withSlippage(marketPrice, input.side, slippageBps), input.side, input.limitPrice!) } : { action: 'hold' }
}

export function validateOrderInput(input: OrderInput) {
  if (!PAPER_SYMBOLS.includes(input.symbol as (typeof PAPER_SYMBOLS)[number])) throw new Error(`Unsupported paper symbol: ${input.symbol}`)
  if (!Number.isFinite(input.qty) || input.qty <= 0) throw new Error('Quantity must be greater than zero')
  if (input.orderType === 'limit' || input.orderType === 'stop_limit') {
    if (!Number.isFinite(input.limitPrice) || input.limitPrice! <= 0) throw new Error('Limit price must be greater than zero')
  }
  if (input.orderType === 'stop' || input.orderType === 'stop_limit') {
    if (!Number.isFinite(input.stopPrice) || input.stopPrice! <= 0) throw new Error('Stop price must be greater than zero')
  }
  if (!['day', 'gtc'].includes(input.timeInForce)) throw new Error('Unsupported time-in-force')
}

async function applyFill(
  tx: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, any>[]; rowCount: number | null }> },
  userId: string,
  orderId: string,
  symbol: string,
  side: PaperSide,
  qty: number,
  price: number,
) {
  const account = await tx.query('select cash from paper_accounts where user_id = $1 for update', [userId])
  if (!account.rows[0]) throw new Error('Paper account not found')
  const cash = Number(account.rows[0].cash)

  const position = await tx.query(
    'select quantity, average_cost from positions where user_id = $1 and symbol = $2 for update',
    [userId, symbol],
  )
  const currentQty = Number(position.rows[0]?.quantity ?? 0)
  const currentAvg = Number(position.rows[0]?.average_cost ?? 0)

  if (side === 'buy') {
    const cost = qty * price
    if (cash + 1e-9 < cost) throw new Error('Insufficient buying power')
    const newQty = currentQty + qty
    const newAvg = newQty === 0 ? 0 : ((currentQty * currentAvg) + cost) / newQty
    await tx.query(
      `insert into positions(user_id, symbol, quantity, average_cost, updated_at)
       values($1,$2,$3,$4,now())
       on conflict(user_id,symbol) do update set quantity = excluded.quantity,
         average_cost = excluded.average_cost, updated_at = now()`,
      [userId, symbol, newQty, newAvg],
    )
    await tx.query('update paper_accounts set cash = cash - $1, updated_at = now() where user_id = $2', [cost, userId])
  } else {
    if (currentQty + 1e-9 < qty) throw new Error('Insufficient shares to sell')
    const newQty = currentQty - qty
    await tx.query(
      'update positions set quantity = $1, updated_at = now() where user_id = $2 and symbol = $3',
      [newQty, userId, symbol],
    )
    await tx.query('update paper_accounts set cash = cash + $1, updated_at = now() where user_id = $2', [qty * price, userId])
  }

  await tx.query(
    'insert into paper_fills(order_id,user_id,symbol,side,qty,price) values($1,$2,$3,$4,$5,$6)',
    [orderId, userId, symbol, side, qty, price],
  )
}

function withSlippage(price: number, side: PaperSide, slippageBps = SLIPPAGE_BPS) {
  const direction = side === 'buy' ? 1 : -1
  const randomBps = Math.random() * slippageBps
  return price * (1 + direction * randomBps / 10_000)
}

function clampToLimit(price: number, side: PaperSide, limit: number) {
  return side === 'buy' ? Math.min(price, limit) : Math.max(price, limit)
}
