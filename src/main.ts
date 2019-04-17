const MARKET_URL = 'https://market.adex.network';

export class AdViewManager {
	private fetch: any;
	private options: object;
	// opts: target, whitelistedToken, minPerImpression, target, marketURL
	// future: doubleCheck, refreshDebounce, useIdentity, channelWhitelist
	constructor(fetch, opts = {}) {
		this.fetch = fetch;
		this.options = opts;
	}
	// @TODO type info for opts
	async getAdView(): Promise<string> {
		const campaigns = (await this.fetch(`${MARKET_URL}/campaigns`).then(r => r.json()))
			.filter(x => x.status.name === 'Active' || x.status.name === 'Ready')
			.filter(x => Array.isArray(x.spec.adUnits) && x.spec.adUnits.length)
			.filter(x => x.depositAsset === opts.whitelistedToken)
			//.sort((a, b) => )
		
		return "";
	}
}
