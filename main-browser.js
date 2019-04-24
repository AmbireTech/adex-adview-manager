const { AdViewManager } = require('./lib/main')

function initWithOptions(options) {
	const mgr = new AdViewManager((url, o) => fetch(url, o), options)
	mgr.getNextAdUnit().then(u => {
		if (u) {
			document.body.innerHTML = u.html
		} else if (options.fallbackMediaUrl) {
			document.body.innerHTML = `<a href='${options.fallbackTargetUrl}' target='_blank'><img src='${options.fallbackMediaUrl}'></a>`
		}
	})
	document.body.style = 'margin: 0px;'
}

try {
	const params = JSON.parse(decodeURIComponent(location.hash.slice(1)))
	const { options } = params
	initWithOptions(options)
} catch(e) {
	// @TODO link to the documentation here
	console.error('Failed parsing input parameters', e)
}
