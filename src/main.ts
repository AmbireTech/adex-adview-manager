import { BN } from 'bn.js';

const MARKET_URL = 'https://market.adex.network';

// opts: target, topByPrice, whitelistedToken, minPerImpression, target, marketURL
// future: doubleCheck, refreshDebounce, useIdentity, channelWhitelist
interface AdViewManagerOptions {
	whitelistedToken: string,
	topByPrice: number,
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

		// Eligible campaigns
		const eligible = campaigns
			.filter(x =>
				(x.status.name === 'Active' || x.status.name === 'Ready')
				&& Array.isArray(x.spec.adUnits) && x.spec.adUnits.length
				&& x.depositAsset === this.options.whitelistedToken
			)

		// Map them to units, flatten and sort by price
		const units = eligible
			.map(x => x.spec.adUnits.map(unit => ({ unit, channelId: x.id, amount: x.depositAmount })))
			.reduce((a, b) => a.concat(b), [])
			.sort((b, a) => new BN(a.amount).cmp(new BN(b.amount)));

		const unitsTop = this.options.topByPrice
			? units.slice(0, this.options.topByPrice)
			: units;

		// @TODO get units, sort by minPerImpression
		// @TODO apply targeting
		// select the first one
		console.log(unitsTop)
		return "";
	}
}
