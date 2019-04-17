import { BN } from 'bn.js';

const MARKET_URL = 'https://market.adex.network';

// opts: target, topByPrice, whitelistedToken, minPerImpression, target, marketURL
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
	async getAdView(): Promise<any> {
		const campaigns = await this.fetch(`${MARKET_URL}/campaigns`).then(r => r.json());
		const eligible = campaigns
			.filter(x =>
				x.status.name === 'Active' || x.status.name === 'Ready'
				&& Array.isArray(x.spec.adUnits) && x.spec.adUnits.length
				&& x.depositAsset === this.options.whitelistedToken
			)
			.sort((a, b) => new BN(a.spec.minPerImpression).cmp(new BN(b.spec.minPerImpression)));
		// @TODO get units, sort by minPerImpression
		// @TODO apply targeting
		// select the first one
		return "";
	}
}
