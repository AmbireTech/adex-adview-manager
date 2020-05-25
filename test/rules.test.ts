import { evaluate, evalMultiple, RuleEvalError } from '../src/rules'
import * as test from 'tape'
import { BN } from 'bn.js'

const evalPure = x => evaluate({}, {}, x)

console.log(evaluate({}, {}, { bn: '100000' }))
console.log(evaluate({}, {}, { ifElse: [{endsWith: ['foo', 'oo']}, 'cool and good', 'not'] }))

/*console.log(evaluate({}, {}, 
{ if: [
   { eq: [{ get: 'publisherId' }, '0xd5860D6196A4900bf46617cEf088ee6E6b61C9d6'] },
   { set: ['price.IMPRESSION', { mul: [1.5, { get: 'price.IMPRESSION' }] }] }
] }))*/


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
