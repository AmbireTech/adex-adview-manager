const { AdViewManager } = require('./lib/main')

// limiting to 2 ad auctions per last 10 seconds
const MAX_AUCTIONS_CAP = { timeframe: 10000, limit: 2 }

// Usually this is not a good tradeoff ("fail-fast") but when it comes to ad impressions,
// we'd rather not lose the impression in case of a corrupted JSON
function safeJSONParse(json, defaultVal) {
	if (!json) return defaultVal;
	try {
		return JSON.parse(json);
	} catch (e) {
		console.error(e);
		return defaultVal;
	}
}

function collapse(shouldCollapse) {
	// Collapse the space
	if (shouldCollapse) window.parent.postMessage({ adexHeight: 0 }, "*");
}

function initWithOptions(options, element, shouldCollapse = true) {
	// basic headless detection
	if (
		navigator.webdriver ||
		!(Array.isArray(navigator.languages) && navigator.languages.length)
	) {
		collapse(shouldCollapse);
		return;
	}

	// Apply auctions limit
	// This is done to stop abuse from publishers with multiple ads on the page
	const historyKey = `history_${options.publisherAddr}`;
	const history = safeJSONParse(localStorage[historyKey], []);
	const now = Date.now();
	if (
		history.filter(({ time }) => now - time < MAX_AUCTIONS_CAP.timeframe)
			.length >= MAX_AUCTIONS_CAP.limit
	) {
		console.log("AdEx: ad auctions limit exceeded");
		collapse(shouldCollapse);
		return;
	}

	/*if (window.innerWidth < options.width / 2 || window.innerHeight < options.height / 2) {
		console.log('AdEx: size too small')
		collapse(shouldCollapse)
		return
	}*/

	// Needed to sat targeting var adView.navigatorLanguage
	options.navigatorLanguage = navigator.language;

	// construct the AdView manager with existing history, select the next ad unit, display it
	const mgr = new AdViewManager((url, o) => fetch(url, o), options, history);
	mgr
		.getNextAdUnit()
		.then((u) => {
			const referrerNeeded = window.location !== window.parent.location;
			if (
				u &&
				Array.isArray(u.acceptedReferrers) &&
				referrerNeeded &&
				!document.referrer.startsWith("https://localhost:8080") &&
				!u.acceptedReferrers.some((ref) => document.referrer.startsWith(ref))
			) {
				// @TODO: more correct detection
				if (document.referrer.includes("//localhost")) {
					const size = `${mgr.options.width}x${mgr.options.height}`;
					element.innerHTML = `<img src="/dev-banners/${size}.jpg" alt="AdEx development banner" width="${mgr.options.width}" height="${mgr.options.height}">`;
				} else {
					console.log(
						`AdEx: domain verification error; possible reasons: ad slot installed on wrong website (referrer), no-referrer policy is being used, or the verification DNS TXT record is no longer found`
					);
					collapse(shouldCollapse);
				}
				return;
			}
			if (u) {
				element.innerHTML = u.html;
			} else {
				console.log(`AdEx: no ad demand for slot (${options.marketSlot})`);
			}
			if (window.parent) {
				const height = u ? options.height : 0;
				const m = { adexHeight: height };
				window.parent.postMessage(m, "*");
			}
			// Persist the history, which is needed for proper stickiness across refreshes
			// and to set adView.secondsSinceCampaignImpression
			localStorage[historyKey] = JSON.stringify(mgr.history);
		})
		.catch((e) => {
			console.error(e);
			collapse(shouldCollapse);
		});
	element.style = "margin: 0px;";
}

module.exports = {
	initWithOptions,
};
