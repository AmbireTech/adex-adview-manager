
// has 3 outcomes: does nothing, mutates output, throws error
// eval errors: TypeError, UndefinedVars
// @TODO typing
export function evaluate(input: any, output: any, rule: any) {
	if (typeof(rule) === 'string') return rule
	if (typeof(rule) === 'boolean') return rule
	if (typeof(rule) === 'number') return rule
	if (Array.isArray(rule)) return rule

	const evalRule = evaluate.bind(null, input, output)
	// @TODO: typechecking and type errors
	// @TODO assert that args are arrays (or are not, in case of onlyShowIf, get)
	// basic operators
	if (rule.if) {
		const predicate = rule.if[0]
		assertType(predicate, 'boolean')
		if (evalRule(predicate)) evalRule(rule.if[1])
	} else if (rule.ifElse) {
		const predicate = rule.ifElse[0]
		assertType(predicate, 'boolean')
		if (evalRule(predicate)) return evalRule(rule.ifElse[1])
		else return evalRule(rule.ifElse[2])
	} else if (rule.do) {
		return rule.do.map(evalRule)
	// lists
	} else if (rule.intersects) {
		const a = evalRule(rule.intersects[0])
		const b = evalRule(rule.intersects[1])
		return a.some(x => b.includes(x))
	// variables/memory storage
	} else if (rule.get) {
		// @TODO: undefined var error
		// @TODO assert rule.get is a string
		return input.hasOwnProperty(rule.get) ? input[rule.get] : output[rule.get]
	} else if (rule.set) {
		output[rule.set[0]] = evalRule(rule.set[1])
	// helpers; @TODO move
	} else if (rule.onlyShowIf) {
		if (!evalRule(rule.onlyShowIf)) output.show = false
	// logic
	} else if (rule.not) {
		return !evalRule(rule.not)
	} else if (rule.or) {
		return evalRule(rule.or[0]) || evalRule(rule.or[1])
	} else if (rule.and) {
		return evalRule(rule.and[0]) && evalRule(rule.and[1])
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

function assertType(value: any, typeName: string): any {
	if (typeof value !== typeName) {
		// @TODO: message?
		throw {
			message: 'TypeError',
			isTypeError: true
		}
	}
	return value
}
