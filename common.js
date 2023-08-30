const { AdViewManager } = require('./lib/main')

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
	if (shouldCollapse) window.parent.postMessage({ adexViewMangerHeight: 0 }, "*");
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

	/*if (window.innerWidth < options.width / 2 || window.innerHeight < options.height / 2) {
		console.log('AdEx: size too small')
		collapse(shouldCollapse)
		return
	}*/

	// Needed to sat targeting var adView.navigatorLanguage
	options.navigatorLanguage = navigator.language;

	console.log("element", element)

	// construct the AdView manager with existing history, select the next ad unit, display it
	const mgr = new AdViewManager((url, o) => fetch(url, o), options);
	mgr
		.getBidData()
		.then((u) => {
			const referrerNeeded = window.location !== window.parent.location;
			if (
				u
				&& referrerNeeded
				&& !document.referrer.startsWith("https://localhost:8080")
				// && document.referrer.startsWith(mgr.options.acceptedReferrer)
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
				console.log("ineer html", u.html)
				element.innerHTML = u.html;
			} else {
				console.log(`AdEx: error getting creative data`);
			}
			console.log("window.parent", window.parent)
			if (window.parent) {
				console.log("window.parent", window.parent)
				const height = u ? options.height : 0;
				const m = { adexViewMangerHeight: height };
				window.parent.postMessage(m, "*");
			}
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
