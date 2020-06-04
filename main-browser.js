const { AdViewManager } = require('./lib/main')

// limiting to 2 ad auctions per last 10 seconds
const MAX_AUCTIONS_CAP = { timeframe: 10000, limit: 2 }

// Usually this is not a good tradeoff ("fail-fast") but when it comes to ad impressions,
// we'd rather not lose the impression in case of a corrupted JSON
function safeJSONParse(json, defaultVal) {
	if (!json) return defaultVal
	try {
		return JSON.parse(json)
	} catch(e) {
		console.error(e)
		return defaultVal
	}
}

function collapse() {
	// Collapse the space
	window.parent.postMessage({ adexHeight: 0 }, "*")
}

function initWithOptions(options) {
	// basic headless detection
	if (navigator.webdriver || !(Array.isArray(navigator.languages) && navigator.languages.length)) {
		collapse()
		return
	}

	// Apply auctions limit
	// This is done to stop abuse from publishers with multiple ads on the page
	const historyKey = `history_${options.publisherAddr}`
	const history = safeJSONParse(localStorage[historyKey], [])
	const now = Date.now()
	if (history.filter(({ time }) => now-time < MAX_AUCTIONS_CAP.timeframe).length >= MAX_AUCTIONS_CAP.limit) {
		console.log('AdEx: ad auctions limit exceeded')
		collapse()
		return
	}

	/*if (window.innerWidth < options.width / 2 || window.innerHeight < options.height / 2) {
		console.log('AdEx: size too small')
		collapse()
		return
	}*/

	// Needed to sat targeting var adView.navigatorLanguage
	options.navigatorLanguage = navigator.language

	// construct the AdView manager with existing history, select the next ad unit, display it
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
			console.log(`AdEx: no ad demand for slot (${options.marketSlot})`)
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
