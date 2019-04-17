import { BN } from 'bn.js';

const MARKET_URL = 'https://market.adex.network';
const STATUS_OK = ['Active', 'Ready'];

interface TargetTag {
	tag: string,
	score: number
}
// opts: minPerImpression, marketURL
// future: doubleCheck, refreshDebounce, useIdentity, channelWhitelist
type BigNumStr = string;
interface AdViewManagerOptions {
	whitelistedToken: string,
	topByPrice: number,
	minPerImpression?: BigNumStr,
	targeting: Array<TargetTag>
	// @TODO debounce
}

function calculateTargetScore(a: Array<TargetTag>, b: Array<TargetTag>): number {
	return a.map(x => {
		const match = b.find(y => y.tag === x.tag)
		if (match) {
			return x.score * match.score
		}
		return 0
	}).reduce((a, b) => a + b, 0)
}

export class AdViewManager {
	private fetch: any;
	private options: AdViewManagerOptions;
	constructor(fetch, opts: AdViewManagerOptions) {
		this.fetch = fetch;
		this.options = opts;
	}
	async getAdUnits(): Promise<any> {
		const campaigns = await this.fetch(`${MARKET_URL}/campaigns`).then(r => r.json());

		// Eligible campaigns
		const eligible = campaigns
			.filter(x =>
				STATUS_OK.includes(x.status.name)
				&& Array.isArray(x.spec.adUnits) && x.spec.adUnits.length
				&& x.depositAsset === this.options.whitelistedToken
				&& new BN(x.spec.minPerImpression).gte(new BN(this.options.minPerImpression || 0))
			)

		// Map them to units, flatten and sort by price
		const units = eligible
			.map(campaign =>
				campaign.spec.adUnits.map(unit => ({
					unit,
					channelId: campaign.id,
					minPerImpression: campaign.spec.minPerImpression
				}))
			)
			.reduce((a, b) => a.concat(b), [])
			.sort((b, a) => new BN(a.minPerImpression).cmp(new BN(b.minPerImpression)));

		const unitsTop = this.options.topByPrice
			? units.slice(0, this.options.topByPrice)
			: units;

		const unitsWithScore = unitsTop.map(x => ({
			...x,
			targetingScore: calculateTargetScore(x.unit.targeting, this.options.targeting || []),
		}))
		return unitsWithScore;
	}
}
