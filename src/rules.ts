import { BN } from 'bn.js'

// has 3 outcomes: does nothing, mutates output, throws error
// eval errors: TypeError, UndefinedVar
export function evaluate(input: any, output: any, rule: any) {
	if (typeof rule === 'string') return rule
	if (typeof rule === 'boolean') return rule
	if (typeof rule === 'number') return rule
	if (Array.isArray(rule)) return rule
	if (rule instanceof BN) return rule
	// @TODO: consider checking for other types such as symbol, undefined, function, bigint - and throw an error

	const evalRule = evaluate.bind(null, input, output)
	const evalToBoolean = x => assertType(evalRule(x), 'boolean')
	const evalToString = x => assertType(evalRule(x), 'string')
	const evalToArray = x => assertType(evalRule(x), 'array')

	// While this might look broadly similar to the eq implementation, it may change if we add support for more than 2 numbers
	// @TODO types for the arguments
	const evalWithNumbers = (numbers: Array<any>, onNumbers: any, onBNs: any) => {
		// @TODO consider handling passing in more than 2 numbers
		// but this won't be applicable (or at least not intuitive to gte/gt/lt)
		// except for Python people, cause they have chain comparison
		if (!(Array.isArray(numbers) && numbers.length === 2))
			throw { message: 'TypeError: expected array of two numbers' }
		const a = evalRule(numbers[0])
		const b = evalRule(numbers[1])
		if (a instanceof BN) return onBNs(a, new BN(assertType(b, 'number')))
		if (b instanceof BN) return onBNs(new BN(assertType(a, 'number')), b)
		return onNumbers(assertType(a, 'number'), assertType(b, 'number'))
	}

	// flow control
	if (rule.if) {
		assertArrayArgs(rule.if, 2)
		const predicate = evalToBoolean(rule.if[0])
		if (predicate) evalRule(rule.if[1])
	} else if (rule.ifNot) {
		assertArrayArgs(rule.ifNot, 2)
		const predicate = evalToBoolean(rule.ifNot[0])
		if (!predicate) evalRule(rule.ifNot[1])
	} else if (rule.ifElse) {
		assertArrayArgs(rule.ifElse, 3)
		const predicate = evalToBoolean(rule.ifElse[0])
		if (predicate) return evalRule(rule.ifElse[1])
		else return evalRule(rule.ifElse[2])
	} else if (rule.do) {
		return rule.do.map(evalRule)
	// lists
	// @TODO: document that the lists functions do not support BigNumbers within them
	} else if (rule.in) {
		assertArrayArgs(rule.in, 2)
		const a = evalToArray(rule.in[0])
		const b = evalRule(rule.in[1])
		return a.includes(b)
	} else if (rule.nin) {
		assertArrayArgs(rule.nin, 2)
		const a = evalToArray(rule.nin[0])
		const b = evalRule(rule.nin[1])
		return !a.includes(b)
	} else if (rule.intersects) {
		assertArrayArgs(rule.intersects, 2)
		const a = evalToArray(rule.intersects[0])
		const b = evalToArray(rule.intersects[1])
		return a.some(x => b.includes(x))
	} else if (rule.at) {
		assertArrayArgs(rule.at, 2)
		const a = evalToArray(rule.at[0])
		const idx = assertType(evalRule(rule.at[1]), 'number')
		return a[idx]
	// comparison
	} else if (rule.eq) {
		assertArrayArgs(rule.eq, 2)
		const a = evalRule(rule.eq[0])
		const b = evalRule(rule.eq[1])
		if (a instanceof BN) return a.eq(new BN(b))
		if (b instanceof BN) return b.eq(new BN(a))
		return a === b
	} else if (rule.lt) {
		return evalWithNumbers(
			rule.lt,
			(a, b) => a < b,
			(a, b) => a.lt(b)
		)
	} else if (rule.gt) {
		return evalWithNumbers(
			rule.gt,
			(a, b) => a > b,
			(a, b) => a.gt(b)
		)
	} else if (rule.gte) {
		return evalWithNumbers(
			rule.gte,
			(a, b) => a >= b,
			(a, b) => a.gte(b)
		)
	// logic
	} else if (rule.not) {
		return !evalToBoolean(rule.not)
	} else if (rule.or) {
		assertArrayArgs(rule.or, 2)
		return evalToBoolean(rule.or[0]) || evalToBoolean(rule.or[1])
	} else if (rule.and) {
		assertArrayArgs(rule.and, 2)
		return evalToBoolean(rule.and[0]) && evalToBoolean(rule.and[1])
	// math
	} else if (rule.div) {
		return evalWithNumbers(
			rule.div,
			(a, b) => a / b,
			(a, b) => a.div(b)
		)
	} else if (rule.mul) {
		return evalWithNumbers(
			rule.mul,
			(a, b) => a * b,
			(a, b) => a.mul(b)
		)
	} else if (rule.mod) {
		return evalWithNumbers(
			rule.mod,
			(a, b) => a % b,
			(a, b) => a.mod(b)
		)
	} else if (rule.add) {
		return evalWithNumbers(
			rule.add,
			(a, b) => a + b,
			(a, b) => a.add(b)
		)
	} else if (rule.sub) {
		return evalWithNumbers(
			rule.sub,
			(a, b) => a - b,
			(a, b) => a.sub(b)
		)
	} else if (rule.max) {
		return evalWithNumbers(
			rule.max,
			(a, b) => Math.max(a, b),
			(a, b) => BN.max(a, b)
		)
	} else if (rule.min) {
		return evalWithNumbers(
			rule.min,
			(a, b) => Math.min(a, b),
			(a, b) => BN.min(a, b)
		)
	// construct a bn
	} else if (rule.bn) {
		// @TODO: should we allow evalRule here?
		return new BN(assertType(evalRule(rule.bn), 'string'))
	// strings
	} else if (rule.split) {
		assertArrayArgs(rule.split, 2)
		const a = evalToString(rule.split[0])
		const b = evalToString(rule.split[1])
		return a.split(b)
	} else if (rule.endsWith) {
		assertArrayArgs(rule.endsWith, 2)
		const a = evalToString(rule.endsWith[0])
		const b = evalToString(rule.endsWith[1])
		return a.endsWith(b)
	} else if (rule.startsWith) {
		assertArrayArgs(rule.startsWith, 2)
		const a = evalToString(rule.startsWith[0])
		const b = evalToString(rule.startsWith[1])
		return a.startsWith(b)
	// variables/memory storage
	} else if (rule.get) {
		assertType(rule.get, 'string')
		if (input.hasOwnProperty(rule.get)) return input[rule.get]
		if (output.hasOwnProperty(rule.get)) return output[rule.get]
		throw { message: `UndefinedVar: ${rule.get}`, isUndefinedVar: true, undefinedVar: rule.get }
	} else if (rule.set) {
		assertArrayArgs(rule.set, 2)
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
	// @TODO: ignore UndefinedVar errors; or just take onError callback
	for (const rule of rules) {
		evaluate(input, output, rule)
		// We stop executing if at any point the show is set to false
		if (output.show === false) return output
	}
	return output
}

// NOTE: we don't specify "array of <type>" cause we don't really need to validate the type of stuff in arrays
// plus, that would be more expensive performance wise
function getTypeName(value: any): string {
	if (Array.isArray(value)) return 'array'
	if (value instanceof BN) return 'bignumber'
	return typeof value
}

function assertType(value: any, typeName: string): any {
	if (getTypeName(value) !== typeName) {
		throw {
			message: `TypeError: expected ${value} to be of type ${typeName}`,
			isTypeError: true
		}
	}
	return value
}

function assertArrayArgs(args: any, len?: number) {
	if (!Array.isArray(args)) throw {
		message: `TypeError: expected array arguments, got ${typeof args}`,
		isTypeError: true
	}
	if (len !== undefined && args.length !== len) throw {
		message: `TypeError: wrong number of arguments, ${len} expected`,
		isTypeError: true
	}
}
