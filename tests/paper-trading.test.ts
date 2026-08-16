import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateExecution,
  validateOrderInput,
  type OrderInput,
} from '../lib/paper-trading'

const base = (overrides: Partial<OrderInput> = {}): OrderInput => ({
  userId: 'test-user',
  symbol: 'AAPL',
  side: 'buy',
  qty: 1,
  orderType: 'market',
  timeInForce: 'day',
  ...overrides,
})

test('market order fills at the market price when slippage is disabled', () => {
  const result = evaluateExecution(base(), 100, false, 0)
  assert.equal(result.action, 'fill')
  assert.equal(result.price, 100)
})

test('buy limit order holds above the limit and fills at or below it', () => {
  assert.equal(evaluateExecution(base({ orderType: 'limit', limitPrice: 99 }), 100, false, 0).action, 'hold')
  const filled = evaluateExecution(base({ orderType: 'limit', limitPrice: 99 }), 98, false, 0)
  assert.equal(filled.action, 'fill')
  assert.equal(filled.price, 98)
})

test('sell limit order fills at or above the limit', () => {
  const input = base({ side: 'sell', orderType: 'limit', limitPrice: 101 })
  assert.equal(evaluateExecution(input, 100, false, 0).action, 'hold')
  const filled = evaluateExecution(input, 102, false, 0)
  assert.equal(filled.action, 'fill')
  assert.equal(filled.price, 102)
})

test('buy stop order triggers when price reaches the stop', () => {
  const input = base({ orderType: 'stop', stopPrice: 105 })
  assert.equal(evaluateExecution(input, 104, false, 0).action, 'hold')
  assert.equal(evaluateExecution(input, 105, false, 0).action, 'fill')
})

test('sell stop order triggers when price falls to the stop', () => {
  const input = base({ side: 'sell', orderType: 'stop', stopPrice: 95 })
  assert.equal(evaluateExecution(input, 96, false, 0).action, 'hold')
  assert.equal(evaluateExecution(input, 95, false, 0).action, 'fill')
})

test('stop-limit can trigger first and remain open until its limit is executable', () => {
  const input = base({ orderType: 'stop_limit', stopPrice: 105, limitPrice: 104 })
  assert.equal(evaluateExecution(input, 106, false, 0).action, 'hold')
  assert.equal(evaluateExecution(input, 106, true, 0).action, 'hold')
  assert.equal(evaluateExecution(input, 104, true, 0).action, 'fill')
})

test('execution is capped by a buy limit and floored by a sell limit', () => {
  const buy = evaluateExecution(base({ orderType: 'limit', limitPrice: 100 }), 95, false, 1000)
  assert.equal(buy.price, 100)

  const sell = evaluateExecution(base({ side: 'sell', orderType: 'limit', limitPrice: 100 }), 105, false, 1000)
  assert.equal(sell.price, 100)
})

test('invalid order inputs are rejected', () => {
  assert.throws(() => validateOrderInput(base({ qty: 0 })), /Quantity must be greater than zero/)
  assert.throws(() => validateOrderInput(base({ symbol: 'INVALID' })), /Unsupported paper symbol/)
  assert.throws(() => validateOrderInput(base({ orderType: 'limit' })), /Limit price must be greater than zero/)
  assert.throws(() => validateOrderInput(base({ orderType: 'stop' })), /Stop price must be greater than zero/)
  assert.throws(() => validateOrderInput(base({ timeInForce: 'bad' as 'day' })), /Unsupported time-in-force/)
})
