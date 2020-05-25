import { BN } from 'bn.js'

// has 3 outcomes: does nothing, mutates output, throws error
// eval errors: TypeError, UndefinedVars
// @TODO typing
export function evaluate(input: any, output: any, rule: any) {
	if (typeof(rule) === 'string') return rule
	if (typeof(rule) === 'boolean') return rule
	if (typeof(rule) === 'number') return rule
	if (Array.isArray(rule)) return rule
	if (rule instanceof BN) return rule
	// @TODO: consider checking for other types such as symbol, undefined, function

	const evalRule = evaluate.bind(null, input, output)
	const evalToBoolean = x => assertType(evalRule(x), 'boolean')
	const evalToArray = x => assertType(evalRule(x), 'array')

	// flow control
	if (rule.if) {
		const predicate = evalToBoolean(rule.if[0])
		if (predicate) evalRule(rule.if[1])
	} else if (rule.ifNot) {
		const predicate = evalToBoolean(rule.ifNot[0])
		if (!predicate) evalRule(rule.ifNot[1])
	} else if (rule.ifElse) {
		const predicate = evalToBoolean(rule.ifElse[0])
		if (predicate) return evalRule(rule.ifElse[1])
		else return evalRule(rule.ifElse[2])
	} else if (rule.do) {
		return rule.do.map(evalRule)
	// lists
	// @TODO: document that the lists functions do not support BigNumbers within them
	} else if (rule.in) {
		const a = evalToArray(rule.in[0])
		const b = evalRule(rule.in[1])
		return a.includes(b)
	} else if (rule.nin) {
		const a = evalToArray(rule.nin[0])
		const b = evalRule(rule.nin[1])
		return !a.includes(b)
	} else if (rule.intersects) {
		const a = evalToArray(rule.intersects[0])
		const b = evalToArray(rule.intersects[1])
		return a.some(x => b.includes(x))
	} else if (rule.at) {
		const a = evalToArray(rule.at[0])
		const idx = assertType(evalRule(rule.at[1]), 'number')
		return a[idx]
	// comparison
	} else if (rule.eq) {
		const a = evalRule(rule.eq[0])
		const b = evalRule(rule.eq[1])
		if (a instanceof BN) return a.eq(new BN(b))
		if (b instanceof BN) return b.eq(new BN(a))
		return a === b
	} else if (rule.lt) {
		return withNumbers(
			rule.lt,
			(a, b) => a < b,
			(a, b) => a.lt(b)
		)
	} else if (rule.gt) {
		return withNumbers(
			rule.gt,
			(a, b) => a > b,
			(a, b) => a.gt(b)
		)
	} else if (rule.gte) {
		return withNumbers(
			rule.gte,
			(a, b) => a >= b,
			(a, b) => a.gte(b)
		)
	// logic
	} else if (rule.not) {
		return !evalToBoolean(rule.not)
	} else if (rule.or) {
		return evalToBoolean(rule.or[0]) || evalToBoolean(rule.or[1])
	} else if (rule.and) {
		return evalToBoolean(rule.and[0]) && evalToBoolean(rule.and[1])
	// math
	} else if (rule.div) {
		return withNumbers(
			rule.div,
			(a, b) => a / b,
			(a, b) => a.div(b)
		)
	} else if (rule.mul) {
		return withNumbers(
			rule.mul,
			(a, b) => a * b,
			(a, b) => a.mul(b)
		)
	} else if (rule.mod) {
		return withNumbers(
			rule.mod,
			(a, b) => a % b,
			(a, b) => a.mod(b)
		)
	} else if (rule.add) {
		return withNumbers(
			rule.add,
			(a, b) => a + b,
			(a, b) => a.add(b)
		)
	} else if (rule.sub) {
		return withNumbers(
			rule.sub,
			(a, b) => a - b,
			(a, b) => a.sub(b)
		)
	} else if (rule.max) {
		return withNumbers(
			rule.max,
			(a, b) => Math.max(a, b),
			(a, b) => BN.max(a, b)
		)
	} else if (rule.min) {
		return withNumbers(
			rule.min,
			(a, b) => Math.min(a, b),
			(a, b) => BN.min(a, b)
		)
	// strings
	} else if (rule.split) {
	} else if (rule.endsWith) {
	} else if (rule.startsWith) {
	// variables/memory storage
	} else if (rule.get) {
		// @TODO: undefined var error
		assertType(rule.get, 'string')
		return input.hasOwnProperty(rule.get) ? input[rule.get] : output[rule.get]
	} else if (rule.set) {
		const key = assertType(rule.set[0], 'string')
		const prevType = getTypeName(output[key])
		const value = evalRule(rule.set[1])
		output[key] = assertType(value, prevType)
	// utilities
	} else if (rule.onlyShowIf) {
		if (!evalToBoolean(rule.onlyShowIf)) output.show = false
	}
}

export function evalMultiple(input: any, output: any, rules: any) {
	for (const rule of rules) {
		evaluate(input, output, rule)
		// We stop executing if at any point the show is set to false
		if (output.show === false) return output
	}
	return output
}

// NOTE: we don't specify "array of <type>" cause we don't really need to validate the type of stuff in arrays
// plus, it's more expensive performance wise
function getTypeName(value: any): string {
	if (Array.isArray(value)) return 'array'
	if (value instanceof BN) return 'bignumber'
	return typeof value
}

function assertType(value: any, typeName: string): any {
	if (getTypeName(value) !== typeName) {
		// @TODO: message?
		throw {
			message: `TypeError: expected ${value} to be of type ${typeName}`,
			isTypeError: true
		}
	}
	return value
}

// @TODO types for the arguments
// @TODO implementation
// @TODO type casts, BigNumbers
function withNumbers(numbers: any, onNumbers: any, onBNs: any): any {
	// @TODO consider handling passing in more than 2 numbers
	// but this won't be applicable (or at least not intuitive to gte/gt/lt)
	// except for Python people, cause they have chain comparison
	// min 2 args
	// case when there are two args
	// case when there are multiple
	// case when numbers, case when BN
}
