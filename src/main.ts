const MARKET_URL = 'https://market.adex.network';

function compareBigNumStrings(a:string, b:string): number {
	if (a.length > b.length) return 1;
	if (a.length < b.length) return -1;
	for (let i=0; i < a.length; i++) {
		if (parseInt(a[i], 10) > parseInt(b[i], 10)) return 1;
		if (parseInt(b[i], 10) > parseInt(a[i], 10)) return -1;
	}
	return 0;
}

export class AdViewManager {
	private fetch: any;
	private options: object;
	// opts: target, whitelistedToken, minPerImpression 
	constructor(fetch, opts = {}) {
		this.fetch = fetch;
		this.options = opts;
	}
	// @TODO type info for opts
	async getAdView(): Promise<string> {
		const campaigns = (await this.fetch(`${MARKET_URL}/campaigns`).then(r => r.json()))
			.filter(x => x.status.name === 'Active' || x.status.name === 'Ready')
			.filter(x => Array.isArray(x.spec.adUnits) && x.spec.adUnits.length);
		
		return "";
	}
}
