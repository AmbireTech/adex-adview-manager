const { initWithOptions } = require('./common')

try {
	const paramsStr = location.hash.slice(1)
	if (!paramsStr) {
		throw new Error('no params supplied; use /#/${JSON.stringify(params)}')
	}
	const params = JSON.parse(decodeURIComponent(paramsStr))
	const { options } = params
	initWithOptions(options, document.body, true)
} catch (e) {
	// @TODO link to the documentation here
	console.error('Failed parsing input parameters', e)
}
