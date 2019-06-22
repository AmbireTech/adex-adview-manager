const { AdViewManager, normalizeUrl } = require('./lib/main')

function initWithOptions(options) {
	// emergency fix
	if (options.publisher) options.publisherAddr = options.publisher;
	// end of emergency fix
	const mgr = new AdViewManager((url, o) => fetch(url, o), options)
	mgr.getNextAdUnit().then(u => {
		if (u) {
			document.body.innerHTML = u.html
		} else if (options.fallbackMediaUrl) {
			const size = options.width && options.height ? `width="${options.width}" height="${options.height}" ` : ''
			const img = `<img src='${normalizeUrl(options.fallbackMediaUrl)}' ${size} alt="AdEx ad">`
			document.body.innerHTML = `<a href="${options.fallbackTargetUrl}" target="_blank" rel="noopener noreferrer">${img}</a>`
		}
		if (window.parent) {
			const height = u || options.fallbackMediaUrl ? options.height : 0
			const m = { adexHeight: height }
			window.parent.postMessage(m, "*")
		}
	})
	document.body.style = 'margin: 0px;'
}

try {
	const paramsStr = location.hash.slice(1)
	if (!paramsStr) {
		throw new Error('no params supplied; use /#/${JSON.stringify(params)}')
	}
	const params = JSON.parse(decodeURIComponent(paramsStr))
	const { options } = params
	initWithOptions(options)
} catch(e) {
	// @TODO link to the documentation here
	console.error('Failed parsing input parameters', e)
}
