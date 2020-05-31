const { AdViewManager } = require('./lib/main')

// limiting to 2 views per last 10 seconds
const MAX_VIEWS_CAP = { timeframe: 10000, limit: 2 }

function initWithOptions(options) {
	function collapse() {
		// Collapse the space
		window.parent.postMessage({ adexHeight: 0 }, "*")
	}

	// basic headless detection
	if (navigator.webdriver || !(Array.isArray(navigator.languages) && navigator.languages.length)) {
		collapse()
		return
	}

	const now = Date.now()
	let views = JSON.parse(localStorage.views || '[]')
	views = views.filter(x => now-x < MAX_VIEWS_CAP.timeframe)
	if (views.length >= MAX_VIEWS_CAP.limit) {
		console.log('AdEx: ads per page limit exceeded')
		collapse()
		return
	}
	views.push(now)
	localStorage.views = JSON.stringify(views)

	/*if (window.innerWidth < options.width / 2 || window.innerHeight < options.height / 2) {
		console.log('AdEx: size too small')
		collapse()
		return
	}*/

	// emergency fix
	if (options.publisher) options.publisherAddr = options.publisher;
	// end of emergency fix

	// construct the AdView manager with existing history, select the next ad unit, display it
	const historyKey = `history_${options.publisherAddr}`
	const history = JSON.parse(localStorage[historyKey] || '[]')
	const mgr = new AdViewManager((url, o) => fetch(url, o), options, history)
	mgr.getNextAdUnit().then(u => {
		if (Array.isArray(u.acceptedReferrers)
			&& document.referrer
			&& !document.referrer.startsWith('https://localhost:8080')
			&& !u.acceptedReferrers.some(ref => document.referrer.startsWith(ref))
		) {
			// @TODO: more correct detection
			if (document.referrer.includes('/localhost')) {
				const size = `${mgr.options.width}x${mgr.options.height}`
				document.body.innerHTML = `<img src="/dev-banners/${size}.jpg" alt="AdEx development banner" width="${mgr.options.width}" height="${mgr.options.height}">`
			} else {
				console.log(`AdEx: ad slot installed on wrong website (referrer)`)
				collapse()
			}
			return
		}
		if (u) {
			document.body.innerHTML = u.html
		} else {
			console.log(`AdEx: no ad demand for slot (${options.whitelistedType})`)
		}
		if (window.parent) {
			const height = u ? options.height : 0
			const m = { adexHeight: height }
			window.parent.postMessage(m, "*")
		}
		// Persist the history, which is needed for proper stickiness across refreshes
		// and to set adView.secondsSinceCampaignImpression
		localStorage[historyKey] = JSON.stringify(mgr.history)
	}).catch(e => {
		console.error(e)
		collapse()
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
} catch (e) {
	// @TODO link to the documentation here
	console.error('Failed parsing input parameters', e)
}
