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

function applyTargeting(campaigns: Array<any>, options: AdViewManagerOptions): Array<any> {
	// Map them to units, flatten
	const units = campaigns
		.map(campaign =>
			campaign.spec.adUnits.map(unit => ({
				unit,
				channelId: campaign.id,
				minPerImpression: campaign.spec.minPerImpression
			}))
		)
		.reduce((a, b) => a.concat(b), []);

	const unitsByPrice = units
		.sort((b, a) => new BN(a.minPerImpression).cmp(new BN(b.minPerImpression)));

	const unitsTop = options.topByPrice
		? unitsByPrice.slice(0, options.topByPrice)
		: unitsByPrice;

	const unitsByScore = unitsTop
		.map(x => ({
			...x,
			targetingScore: calculateTargetScore(x.unit.targeting, options.targeting || []),
		}))
		.sort((a, b) => b - a);

	return unitsByScore;
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
		const eligible = campaigns.filter(campaign => {
			return STATUS_OK.includes(campaign.status.name)
				&& Array.isArray(campaign.spec.adUnits)
				&& campaign.depositAsset === this.options.whitelistedToken
				&& new BN(campaign.spec.minPerImpression)
					.gte(new BN(this.options.minPerImpression || 0))
		});
		return applyTargeting(eligible, this.options);
	}
}
