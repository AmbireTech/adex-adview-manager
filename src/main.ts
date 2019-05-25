import { BN } from 'bn.js'

const IPFS_GATEWAY = 'https://ipfs.adex.network/ipfs/'

const defaultOpts = {
	marketURL: 'https://market.adex.network',
	acceptedStates: ['Active', 'Ready'],
	minPerImpression: '1',
	minTargetingScore: 0,
	randomize: false,
}

interface TargetTag {
	tag: string,
	score: number
}

type BigNumStr = string
interface AdViewManagerOptions {
	// Defaulted via defaultOpts
	marketURL: string,
	acceptedStates: Array<string>,
	minPerImpression: BigNumStr,
	minTargetingScore: number,
	randomize: boolean,
	// Must be passed (eexcept the ones with ?)
	publisherAddr: string,
	whitelistedToken: string,
	whitelistedType?: string,
	topByPrice?: number,
	targeting?: Array<TargetTag>,
	width?: number,
	height?: number
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
				minTargetingScore: unit.minTargetingScore || campaign.spec.minTargetingScore || 0,
				minPerImpression: campaign.spec.minPerImpression,
			}))
		)
		.reduce((a, b) => a.concat(b), [])

	const unitsByPrice = units
		.sort((b, a) => new BN(a.minPerImpression).cmp(new BN(b.minPerImpression)))

	const unitsTop = options.topByPrice
		? unitsByPrice.slice(0, options.topByPrice)
		: unitsByPrice

	const unitsTopFiltered = options.whitelistedType
		? unitsTop.filter(x => x.unit.type === options.whitelistedType)
		: unitsTop

	const unitsByScore = unitsTopFiltered
		.map(x => ({
			...x,
			targetingScore: calculateTargetScore(x.unit.targeting, options.targeting || []),
			rand: Math.random()
		}))
		.filter(x =>
			x.targetingScore >= options.minTargetingScore
			&& x.targetingScore >= x.minTargetingScore
		)
		.sort((a, b) =>
			(b.targetingScore - a.targetingScore)
				|| (options.randomize ? (b.rand - a.rand) : 0)
		)

	return unitsByScore
}

function normalizeUrl(url: string): string {
	if (url.startsWith('ipfs://')) return `${IPFS_GATEWAY}${url.slice(7)}`
	return url
}

function getHTML({publisherAddr, width, height}: AdViewManagerOptions, { unit, channelId, validators }): string {
	const imgUrl = normalizeUrl(unit.mediaUrl)
	const evBody = JSON.stringify({ events: [{ type: 'IMPRESSION', publisherAddr }] })
	const onLoadCode = validators
		.map(({ url }) => {
			const fetchOpts = `{ method: 'POST', headers: { 'content-type': 'application/json' }, body: this.dataset.eventBody }`
			const fetchUrl = `${url}/channel/${channelId}/events`
			return `fetch('${fetchUrl}', ${fetchOpts})`
		})
		.join(';')
	const size = width && height ? `width="${width}" height="${height}" ` : ''
	return `<a href="${unit.targetUrl}" target="_blank" rel="noopener noreferrer">`
		+`<img src="${imgUrl}" data-event-body='${evBody}' alt="AdEx ad" rel="nofollow" onload="${onLoadCode}" ${size}>`
		+`</a>`
}

export class AdViewManager {
	private fetch: any
	private options: AdViewManagerOptions
	private timesShown: { [key: string]: number }
	private getTimesShown(channelId: string): number {
		return this.timesShown[channelId] || 0
	}
	constructor(fetch, opts: AdViewManagerOptions) {
		this.fetch = fetch
		this.options = { ...defaultOpts, ...opts }
		this.timesShown = {}
	}
	async getAdUnits(): Promise<any> {
		const url = `${this.options.marketURL}/campaigns?status=${this.options.acceptedStates.join(',')}`
		const campaigns = await this.fetch(url).then(r => r.json())

		// Eligible campaigns
		const eligible = campaigns.filter(campaign => {
			return this.options.acceptedStates.includes(campaign.status.name)
				&& (campaign.spec.activeFrom || 0) < Date.now()
				&& Array.isArray(campaign.spec.adUnits)
				&& campaign.depositAsset === this.options.whitelistedToken
				&& new BN(campaign.spec.minPerImpression)
					.gte(new BN(this.options.minPerImpression))
		})
		return applyTargeting(eligible, this.options)
	}
	async getNextAdUnit(): Promise<any> {
		const units = await this.getAdUnits()
		if (units.length === 0) return null
		const min = units
			.map(({ channelId }) => this.getTimesShown(channelId))
			.reduce((a, b) => Math.min(a, b))
		const leastShownUnits = units
			.filter(({ channelId }) => this.getTimesShown(channelId) === min)
		const next = leastShownUnits[0]
		this.timesShown[next.channelId] = this.getTimesShown(next.channelId) + 1
		return { ...next, html: getHTML(this.options, next) }
	}
}
