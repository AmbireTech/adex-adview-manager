import { evaluate, evalMultiple, RuleEvalError } from '../src/rules'
import * as test from 'tape'
import { BN } from 'bn.js'

const evalPure = x => evaluate({}, {}, x)
const evalToOutput = x => {
	let output = { foo: 1, bar: 2 }
	evaluate({}, output, x)
	return output
}

console.log(evaluate({}, {}, { ifElse: [{endsWith: ['foo', 'oo']}, 'cool and good', 'not'] }))

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

// @TODO: test mod, div, mul, sub, min, max

// set/get
test('set/get: errors', t => {
	t.throws(() => evaluate({}, {}, { get: 'somevar' }), RuleEvalError, 'undefined variable error')
	t.throws(() => evalToOutput({ set: ['foo', 'string'] }), RuleEvalError, 'cannot change type of an output variable')
	t.end()
})


