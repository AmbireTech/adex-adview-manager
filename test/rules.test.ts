import { evaluate, evalMultiple } from '../src/rules'
import * as test from 'tape'
import { BN } from 'bn.js'

console.log(evaluate({}, {}, { bn: '100000' }))
console.log(evaluate({}, {}, { ifElse: [{endsWith: ['foo', 'oo']}, 'cool and good', 'not'] }))

/*console.log(evaluate({}, {}, 
{ if: [
   { eq: [{ get: 'publisherId' }, '0xd5860D6196A4900bf46617cEf088ee6E6b61C9d6'] },
   { set: ['price.IMPRESSION', { mul: [1.5, { get: 'price.IMPRESSION' }] }] }
] }))*/
