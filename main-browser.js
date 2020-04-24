const { AdViewManager, normalizeUrl } = require('./lib/main')

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

	// limiting to 2 per last 10 seconds
	const RECENT_TIME = 10000
	const RECENT_LIMIT = 2
	const now = Date.now()
	let views = JSON.parse(localStorage.views || '[]')
	views = views.filter(x => now-x < RECENT_TIME)
	if (views.length >= RECENT_LIMIT) {
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
	// automatic language targeting
	if (navigator.language) {
		options.targeting = Array.isArray(options.targeting) ? options.targeting : [];
		if (!options.targeting.some(({ tag }) => tag.startsWith('lang_'))) {
			options.targeting.push({ tag: 'lang_'+navigator.language, score: 20 })
		}
	}
	const mgr = new AdViewManager((url, o) => fetch(url, o), options)
	mgr.getNextAdUnit().then(u => {
		if (Array.isArray(mgr.options.acceptedReferrers)
			&& document.referrer
			&& !document.referrer.startsWith('https://localhost:8080')
			&& !mgr.options.acceptedReferrers.some(ref => document.referrer.startsWith(ref))
		) {
			// @TODO: more correct detection
			if (document.referrer.includes('/localhost') && options.whitelistedType.startsWith('legacy_')) {
				const size = options.whitelistedType.split('_')[1]
				const sizeSplit = size.split('x')
				document.body.innerHTML = `<img src="/dev-banners/${size}.jpg" alt="AdEx development banner" width="${sizeSplit[0]}" height="${sizeSplit[1]}">`
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
