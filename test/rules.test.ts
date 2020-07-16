import { evaluate, RuleEvalError } from '../src/rules'
import * as test from 'tape'
import { BN } from 'bn.js'

const evalPure = x => evaluate({}, {}, x)
const evalToOutput = x => {
	let output = { foo: 1, bar: 2 }
	evaluate({}, output, x)
	return output
}

/*console.log(evaluate({}, {}, 
{ if: [
   { eq: [{ get: 'publisherId' }, '0xd5860D6196A4900bf46617cEf088ee6E6b61C9d6'] },
   { set: ['price.IMPRESSION', { mul: [1.5, { get: 'price.IMPRESSION' }] }] }
] }))*/

// flow control
test('flow control', t => {
	t.deepEqual(evalToOutput({ if: [true, { set: ['bar', 3] }] }), { foo: 1, bar: 3 })
	t.deepEqual(evalToOutput({ ifNot: [false, { set: ['bar', 3] }] }), { foo: 1, bar: 3 })
	t.deepEqual(evalToOutput({ ifElse: [false, { set: ['bar', 3] }, { set: ['bar', 4] }] }), { foo: 1, bar: 4 })
	t.deepEqual(evalToOutput({ do: [{ set: ['foo', 3] }, { set: ['bar', 4] }] }), { foo: 3, bar: 4 })
	t.end()
})

test('flow control: errors', t => {
	t.throws(() => evalPure({ ifElse: [false, { set: ['bar', 3] }] }), RuleEvalError)
	t.throws(() => evalPure({ if: [false] }), RuleEvalError)
	t.throws(() => evalPure({ if: 1 }), RuleEvalError)
	t.throws(() => evalPure({ ifNot: [false] }), RuleEvalError)
	t.end()
})

// lists (arrays)
test('lists', t => {
	t.equal(evalPure({ in: [[3, 4, 2], 2] }), true)
	t.equal(evalPure({ in: [[3, 4, 2], 15] }), false)
	t.equal(evalPure({ nin: [[3, 4, 2], 2] }), false)
	t.equal(evalPure({ nin: [[3, 4, 2], 15] }), true)

	t.equal(evalPure({ intersects: [[2, 15], [3, 4, 2]] }), true)
	t.equal(evalPure({ intersects: [[15, 18], [3, 4, 2]] }), false)

	t.equal(evalPure({ at: [[15, 17, 5, 1], 2] }), 5)

	t.end()
})

// comparison
test('comparison: equality', t => {
	t.equal(evalPure({ eq: [true, false] }), false)
	t.equal(evalPure({ eq: [true, true] }), true)
	t.equal(evalPure({ eq: [55, 55] }), true)
	t.equal(evalPure({ eq: [55, new BN(55)] }), true)
	t.equal(evalPure({ eq: [55, new BN(56)] }), false)
	t.equal(evalPure({ eq: [new BN(55), 55] }), true)
	t.equal(evalPure({ eq: [new BN(55), 56] }), false)
	t.equal(evalPure({ eq: [new BN(55), new BN(55)] }), true)
	t.equal(evalPure({ eq: [new BN(55), new BN(56)] }), false)
	t.equal(evalPure({ eq: ['one', 'one'] }), true)
	t.equal(evalPure({ eq: ['one', 'two'] }), false)
	t.end()
})

test('comparison: numbers', t => {
	t.equal(evalPure({ lt: [55, 100] }), true)
	t.equal(evalPure({ lt: [new BN(55), 100] }), true)
	t.equal(evalPure({ lt: [55, new BN(100)] }), true)
	t.equal(evalPure({ gt: [55, 100] }), false)
	t.equal(evalPure({ gt: [new BN(55), 100] }), false)
	t.equal(evalPure({ lt: [new BN(55), new BN(100)] }), true)
	t.equal(evalPure({ lt: [new BN(101), new BN(100)] }), false)
	t.end()
})

test('comparison: type errors', t => {
	t.throws(() => evalPure({ gt: [5, 'foobar'] }), RuleEvalError)
	t.throws(() => evalPure({ gt: [new BN(12313), 'foobar'] }), RuleEvalError)
	t.end()
})

// logic
test('logic functions', t => {
	t.equal(evalPure({ and: [true, true] }), true)
	t.equal(evalPure({ and: [true, false] }), false)
	t.equal(evalPure({ and: [false, false] }), false)
	t.equal(evalPure({ or: [true, true] }), true)
	t.equal(evalPure({ or: [true, false] }), true)
	t.equal(evalPure({ or: [false, false] }), false)
	t.equal(evalPure({ not: true }), false)
	t.equal(evalPure({ not: false }), true)
	t.end()
})

test('logic functions: errors', t => {
	t.throws(() => evalPure({ not: 5 }), RuleEvalError)
	t.throws(() => evalPure({ and: false }), RuleEvalError)
	t.throws(() => evalPure({ or: true }), RuleEvalError)
	t.end()
})

// math
test('math: BigNumber coercion', t => {
	t.equal(evalPure({ add: [5, 6] }), 11)
	t.deepEqual(evalPure({ add: [new BN(5), 6] }), new BN(11))
	t.deepEqual(evalPure({ add: [5, new BN(6)] }), new BN(11))
	t.end()
})

test('can construct a BigNumber', t => {
	const numStr = '165987120956145983587125'
	t.deepEqual(evalPure({ bn: numStr }), new BN(numStr))
	t.end()
})

test('math: basic operations', t => {
	t.equal(evalPure({ div: [10, 3] }), 10 / 3)
	t.deepEqual(evalPure({ div: [new BN(100), 3] }), new BN(33))
	t.deepEqual(evalPure({ div: [new BN(100), new BN(3)] }), new BN(33))
	t.equal(evalPure({ mul: [10, 3] }), 30)
	t.deepEqual(evalPure({ mul: [100, new BN(3)] }), new BN(300))
	t.equal(evalPure({ mod: [100, 3] }), 1)
	t.deepEqual(evalPure({ mod: [new BN(100), 3] }), new BN(1))
	t.equal(evalPure({ add: [100, 3] }), 103)
	t.deepEqual(evalPure({ add: [new BN(100), 3] }), new BN(103))
	t.equal(evalPure({ sub: [100, 3] }), 97)
	t.deepEqual(evalPure({ sub: [new BN(100), 3] }), new BN(97))
	t.deepEqual(evalPure({ sub: [100, new BN(3)] }), new BN(97))
	t.deepEqual(evalPure({ sub: [new BN(100), new BN(3)] }), new BN(97))
	t.deepEqual(evalPure({ max: [100, new BN(3)] }), new BN(100))
	t.equal(evalPure({ max: [100, 3] }), 100)
	t.equal(evalPure({ min: [100, 3] }), 3)
	t.deepEqual(evalPure({ min: [new BN(100), 3] }), new BN(3))
	t.deepEqual(evalPure({ min: [new BN(100), new BN(3)] }), new BN(3))
	t.end()
})

test('math: syntax sugar', t => {
	t.equal(evalPure({ mulDiv: [300, 2, 3] }), 200)
	t.deepEqual(evalPure({ mulDiv: [new BN(300), 2, 3] }), new BN(200))
	t.deepEqual(evalPure({ mulDiv: [new BN(500), 2, 3] }), new BN(333))
	t.end()
})

// strings

test('strings', t => {
	t.equal(evalPure({ endsWith: ['foobar', 'ar'] }), true)
	t.equal(evalPure({ endsWith: ['foobar', 'fo'] }), false)

	t.equal(evalPure({ startsWith: ['foobar', 'ar'] }), false)
	t.equal(evalPure({ startsWith: ['foobar', 'fo'] }), true)

	t.equal(evalPure({ at: [{ split: ['one-two-three-four', '-'] }, 2] }), 'three')

	t.end()
})

// set/get
test('set/get: errors', t => {
	t.throws(() => evaluate({}, {}, { get: 'somevar' }), RuleEvalError, 'undefined variable error')
	t.throws(() => evaluate({}, {}, { set: ['somevar', 0] }), RuleEvalError, 'undefined variable error')
	t.throws(() => evalToOutput({ set: ['foo', 'string'] }), RuleEvalError, 'cannot change type of an output variable')
	t.end()
})

// more complex impressions
test('complex rules from examples: publisher match', t => {
	const rule = { if: [
	   { eq: [{ get: 'publisherId' }, '0xd5860D6196A4900bf46617cEf088ee6E6b61C9d6'] },
	   { set: ['price.IMPRESSION', { mul: [2, { get: 'price.IMPRESSION' }] }] }
	] }

	const evalWithInput = input => {
		let output = { 'price.IMPRESSION': new BN(120) }
		evaluate(input, output, rule)
		return output
	}

	t.deepEqual(evalWithInput({ publisherId: 'rando pub' }), { 'price.IMPRESSION': new BN(120) }, 'do not multiply price on publisher')
	t.deepEqual(evalWithInput({ publisherId: '0xd5860D6196A4900bf46617cEf088ee6E6b61C9d6' }), { 'price.IMPRESSION': new BN(240) }, 'multiply price on publisher')
	t.end()
})

test('complex rules from examples: categories match', t => {
	const rule = { if: [
	   { and: [
		{ nin: [{ get: 'adSlot.categories' }, 'Incentivized'] },
		{ in: [{ get: 'adSlot.categories' }, 'Bitcoin'] }
	   ] },
	   { do: [
	      { set: [ 'boost', 2 ] },
	      { set: [ 'price.IMPRESSION', { mul: [{ get: 'price.IMPRESSION' }, 3] }] }
	    ] }
	] }

	const evalWithInput = input => {
		let output = { boost: 1, 'price.IMPRESSION': new BN(1005) }
		evaluate(input, output, rule)
		return output
	}

	t.deepEqual(evalWithInput({ 'adSlot.categories': ['Incentivized'] }), { boost: 1, 'price.IMPRESSION': new BN(1005) })
	t.deepEqual(evalWithInput({ 'adSlot.categories': ['Incentivized', 'Bitcoin'] }), { boost: 1, 'price.IMPRESSION': new BN(1005) })
	t.deepEqual(evalWithInput({ 'adSlot.categories': ['Bitcoin'] }), { boost: 2, 'price.IMPRESSION': new BN(3015) })
	t.end()
})
