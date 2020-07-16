import { BN } from 'bn.js'

// has 3 outcomes: does nothing, mutates output, throws error
// eval errors: TypeError, UndefinedVar
export function evaluate(input: any, output: any, rule: any) {
	if (typeof rule === 'string') return rule
	if (typeof rule === 'boolean') return rule
	if (typeof rule === 'number') return rule
	if (Array.isArray(rule)) return rule
	if (BN.isBN(rule)) return rule
	// @TODO: consider checking for other types such as symbol, undefined, function, bigint - and throw an error

	const evalRule = evaluate.bind(null, input, output)
	const evalToBoolean = x => assertType(evalRule(x), 'boolean')
	const evalToString = x => assertType(evalRule(x), 'string')
	const evalToArray = x => assertType(evalRule(x), 'array')

	// While this might look broadly similar to the eq implementation, it may change if we add support for more than 2 numbers
	const evalWithNumbers = (numbers: Array<any>, onNumbers: (a: number, b: number) => any, onBNs: (a: any, b: any) => any) => {
		// @TODO consider handling passing in more than 2 numbers
		// but this won't be applicable (or at least not intuitive to gte/gt/lt)
		// except for Python people, cause they have chain comparison
		if (!(Array.isArray(numbers) && numbers.length === 2))
			throw new RuleEvalError({ message: 'TypeError: expected array of two numbers', isTypeError: true })
		const a = evalRule(numbers[0])
		const b = evalRule(numbers[1])
		if (BN.isBN(a) && BN.isBN(b)) return onBNs(a, b)
		if (BN.isBN(a)) return onBNs(a, new BN(assertType(b, 'number')))
		if (BN.isBN(b)) return onBNs(new BN(assertType(a, 'number')), b)
		return onNumbers(assertType(a, 'number'), assertType(b, 'number'))
	}

	// flow control
	if (rule.hasOwnProperty('if')) {
		assertArrayArgs(rule.if, 2)
		const predicate = evalToBoolean(rule.if[0])
		if (predicate) evalRule(rule.if[1])
	} else if (rule.hasOwnProperty('ifNot')) {
		// an alternative way to do this would be to return { not: { if:  } }
		assertArrayArgs(rule.ifNot, 2)
		const predicate = evalToBoolean(rule.ifNot[0])
		if (!predicate) evalRule(rule.ifNot[1])
	} else if (rule.hasOwnProperty('ifElse')) {
		assertArrayArgs(rule.ifElse, 3)
		const predicate = evalToBoolean(rule.ifElse[0])
		if (predicate) return evalRule(rule.ifElse[1])
		else return evalRule(rule.ifElse[2])
	} else if (rule.hasOwnProperty('do')) {
		return rule.do.map(evalRule)
	// lists
	// @TODO: document that the lists functions do not support BigNumbers within them
	} else if (rule.hasOwnProperty('in')) {
		assertArrayArgs(rule.in, 2)
		const a = evalToArray(rule.in[0])
		const b = evalRule(rule.in[1])
		return a.includes(b)
	} else if (rule.hasOwnProperty('nin')) {
		assertArrayArgs(rule.nin, 2)
		const a = evalToArray(rule.nin[0])
		const b = evalRule(rule.nin[1])
		return !a.includes(b)
	} else if (rule.hasOwnProperty('intersects')) {
		assertArrayArgs(rule.intersects, 2)
		const a = evalToArray(rule.intersects[0])
		const b = evalToArray(rule.intersects[1])
		return a.some(x => b.includes(x))
	} else if (rule.hasOwnProperty('at')) {
		assertArrayArgs(rule.at, 2)
		const a = evalToArray(rule.at[0])
		const idx = assertType(evalRule(rule.at[1]), 'number')
		return a[idx]
	// comparison
	} else if (rule.hasOwnProperty('eq')) {
		assertArrayArgs(rule.eq, 2)
		const a = evalRule(rule.eq[0])
		const b = evalRule(rule.eq[1])
		if (BN.isBN(a)) return a.eq(new BN(b))
		if (BN.isBN(b)) return b.eq(new BN(a))
		return a === b
	} else if (rule.hasOwnProperty('lt')) {
		return evalWithNumbers(
			rule.lt,
			(a, b) => a < b,
			(a, b) => a.lt(b)
		)
	} else if (rule.hasOwnProperty('gt')) {
		return evalWithNumbers(
			rule.gt,
			(a, b) => a > b,
			(a, b) => a.gt(b)
		)
	} else if (rule.hasOwnProperty('gte')) {
		return evalWithNumbers(
			rule.gte,
			(a, b) => a >= b,
			(a, b) => a.gte(b)
		)
		
	// logic
	} else if (rule.hasOwnProperty('not')) {
		return !evalToBoolean(rule.not)
	} else if (rule.hasOwnProperty('or')) {
		assertArrayArgs(rule.or, 2)
		return evalToBoolean(rule.or[0]) || evalToBoolean(rule.or[1])
	} else if (rule.hasOwnProperty('and')) {
		assertArrayArgs(rule.and, 2)
		return evalToBoolean(rule.and[0]) && evalToBoolean(rule.and[1])
	// math
	} else if (rule.hasOwnProperty('div')) {
		return evalWithNumbers(
			rule.div,
			(a, b) => a / b,
			(a, b) => a.div(b)
		)
	} else if (rule.hasOwnProperty('mul')) {
		return evalWithNumbers(
			rule.mul,
			(a, b) => a * b,
			(a, b) => a.mul(b)
		)
	} else if (rule.hasOwnProperty('mod')) {
		return evalWithNumbers(
			rule.mod,
			(a, b) => a % b,
			(a, b) => a.mod(b)
		)
	} else if (rule.hasOwnProperty('add')) {
		return evalWithNumbers(
			rule.add,
			(a, b) => a + b,
			(a, b) => a.add(b)
		)
	} else if (rule.hasOwnProperty('sub')) {
		return evalWithNumbers(
			rule.sub,
			(a, b) => a - b,
			(a, b) => a.sub(b)
		)
	} else if (rule.hasOwnProperty('max')) {
		return evalWithNumbers(
			rule.max,
			(a, b) => Math.max(a, b),
			(a, b) => BN.max(a, b)
		)
	} else if (rule.hasOwnProperty('min')) {
		return evalWithNumbers(
			rule.min,
			(a, b) => Math.min(a, b),
			(a, b) => BN.min(a, b)
		)
	// math syntax sugar
	} else if (rule.hasOwnProperty('mulDiv')) {
		assertArrayArgs(rule.mulDiv, 3)
		return evalRule({ div: [
			{ mul: [rule.mulDiv[0], rule.mulDiv[1]] },
			rule.mulDiv[2]
		]})
	// construct a bn
	} else if (rule.hasOwnProperty('bn')) {
		return new BN(assertType(evalRule(rule.bn), 'string'))
	// strings
	} else if (rule.hasOwnProperty('split')) {
		assertArrayArgs(rule.split, 2)
		const a = evalToString(rule.split[0])
		const b = evalToString(rule.split[1])
		return a.split(b)
	} else if (rule.hasOwnProperty('endsWith')) {
		assertArrayArgs(rule.endsWith, 2)
		const a = evalToString(rule.endsWith[0])
		const b = evalToString(rule.endsWith[1])
		return a.endsWith(b)
	} else if (rule.hasOwnProperty('startsWith')) {
		assertArrayArgs(rule.startsWith, 2)
		const a = evalToString(rule.startsWith[0])
		const b = evalToString(rule.startsWith[1])
		return a.startsWith(b)
	// variables/memory storage
	} else if (rule.hasOwnProperty('get')) {
		assertType(rule.get, 'string')
		if (typeof(input) === 'function') {
			const value = input(rule.get)
			if (value !== undefined) return value
		} else {
			if (input.hasOwnProperty(rule.get)) return input[rule.get]
		}
		if (output.hasOwnProperty(rule.get)) return output[rule.get]
		throw new RuleEvalError({ message: `UndefinedVar: ${rule.get}`, undefinedVar: rule.get })
	} else if (rule.hasOwnProperty('set')) {
		assertArrayArgs(rule.set, 2)
		const key = assertType(rule.set[0], 'string')
		const prevType = getTypeName(output[key])
		if (prevType === 'undefined')
			throw new RuleEvalError({ message: `UndefinedVar: ${key}`, undefinedVar: key })
		const value = evalRule(rule.set[1])
		output[key] = assertType(value, prevType)
	// utilities
	} else if (rule.hasOwnProperty('onlyShowIf')) {
		if (!evalToBoolean(rule.onlyShowIf)) output.show = false
	}
}

export function evaluateMultiple(input: any, output: any, rules: any, onTypeErr: any) {
	for (const rule of rules) {
		try {
			evaluate(input, output, rule)
		} catch(e) {
			if (e.isUndefinedVar) continue
			else if (e.isTypeError && onTypeErr) onTypeErr(e, rule)
			else throw e
		}
		// We stop executing if at any point the show is set to false
		if (output.show === false) return output
	}
	return output
}

export function RuleEvalError(params: any) {
	this.message = params.message
	if (params.isTypeError) this.isTypeError = true
	if (params.undefinedVar) {
		this.undefinedVar = params.undefinedVar
		this.isUndefinedVar = true
	}
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
		throw new RuleEvalError({
			message: `TypeError: expected ${value} to be of type ${typeName}`,
			isTypeError: true
		})
	}
	return value
}

function assertArrayArgs(args: any, len?: number) {
	if (!Array.isArray(args)) throw new RuleEvalError({
		message: `TypeError: expected array arguments, got ${typeof args}`,
		isTypeError: true
	})
	if (len !== undefined && args.length !== len) throw new RuleEvalError({
		message: `TypeError: wrong number of arguments, ${len} expected`,
		isTypeError: true
	})
}
