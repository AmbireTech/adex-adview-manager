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
				validators: campaign.spec.validators,
				minPerImpression: campaign.spec.minPerImpression,
				html: getHTML('', campaign, unit),
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
		.sort((a, b) => b.targetingScore - a.targetingScore);

	return unitsByScore;
}

function normalizeUrl(url: string): string {
	if (url.startsWith('ipfs://')) return `https://gateway.ipfs.io/ipfs/${url.slice(7)}`
	return url;
}

function getHTML(publisher, campaign, unit): string {
	const imgUrl = normalizeUrl(unit.mediaUrl);
	const onLoadCode = campaign.spec.validators
		.map(({ url }) => {
			const evBody = JSON.stringify({ events: [{ type: 'IMPRESSION', publisher }] });
			// Double-stringify the body to escape the JSON string
			return `fetch('${url}/channel/${campaign.id}/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: ${JSON.stringify(evBody)} })`;
		})
		.join(';')
	return `<img src="${imgUrl}" alt="AdEx ad" rel="nofollow" onload="${onLoadCode}"></img>`;
}

export class AdViewManager {
	private fetch: any;
	private options: AdViewManagerOptions;
	private timesShown: { [key: string]: number };
	private getTimesShown(channelId: string): number {
		return this.timesShown[channelId] || 0;	
	}
	constructor(fetch, opts: AdViewManagerOptions) {
		this.fetch = fetch;
		this.options = opts;
		this.timesShown = {};
	}
	async getAdUnits(): Promise<any> {
		const url = `${MARKET_URL}/campaigns?status=${STATUS_OK.join(',')}`;
		const campaigns = await this.fetch(url).then(r => r.json());

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
	async getNextAdUnit(): Promise<any> {
		const units = await this.getAdUnits();
		if (units.length === 0) return null;
		const min = units
			.map(({ channelId }) => this.getTimesShown(channelId))
			.reduce((a, b) => Math.min(a, b));
		const leastShownUnits = units
			.filter(({ channelId }) => this.getTimesShown(channelId) === min);
		const next = leastShownUnits[0];
		this.timesShown[next.channelId] = this.getTimesShown(next.channelId) + 1;
		return next;
	}
}
