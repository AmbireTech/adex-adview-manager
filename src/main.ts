import { BN } from '../vendor/bn.js';

const MARKET_URL = 'https://market.adex.network';

// opts: target, whitelistedToken, minPerImpression, target, marketURL
// future: doubleCheck, refreshDebounce, useIdentity, channelWhitelist
interface AdViewManagerOptions {
	whitelistedToken: string
}

export class AdViewManager {
	private fetch: any;
	private options: AdViewManagerOptions;
	constructor(fetch, opts: AdViewManagerOptions) {
		this.fetch = fetch;
		this.options = opts;
	}
	// @TODO type info for opts
	async getAdView(): Promise<string> {
		const campaigns = (await this.fetch(`${MARKET_URL}/campaigns`).then(r => r.json()))
			.filter(x => x.status.name === 'Active' || x.status.name === 'Ready')
			.filter(x => Array.isArray(x.spec.adUnits) && x.spec.adUnits.length)
			.filter(x => x.depositAsset === this.options.whitelistedToken)
			.sort((a, b) => new BN(a.spec.minPerImpression).cmp(new BN(b.spec.minPerImpression)))
		
		return "";
	}
}
