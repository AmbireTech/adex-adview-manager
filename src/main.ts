const MARKET_URL = 'https://market.adex.network';

export class AdViewManager {
	private options: object;
	constructor(opts = {}) {
		this.options = opts;
	}
	// @TODO type info for opts
	async getAdView(): Promise<string> {
		const campaigns = (await fetch(`${MARKET_URL}/campaigns`).then(r => r.json()))
			.filter(x => x.status.name === 'Active' || x.status.name === 'Ready')
			.filter(x => Array.isArray(x.spec.adUnits) && x.spec.adUnits.length);

		return "";
	}
}
