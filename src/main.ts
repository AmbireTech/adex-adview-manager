import { BN } from 'bn.js'

export const IPFS_GATEWAY = 'https://ipfs.moonicorn.network/ipfs/'

const defaultOpts = {
	marketURL: 'https://market.moonicorn.network',
	acceptedStates: ['Active', 'Ready'],
	minPerImpression: '1',
	minTargetingScore: 0,
	topByPrice: 10,
	topByScore: 5,
	randomize: true,
	disableVideo: false,
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
	// Must be passed (except the ones with ?)
	publisherAddr: string,
	whitelistedToken: string,
	whitelistedType?: string,
	topByPrice?: number,
	topByScore?: number,
	targeting?: Array<TargetTag>,
	width?: number,
	height?: number,
	fallbackUnit?: string,
	disableVideo?: boolean,
	marketSlot?: string
}

export function calculateTargetScore(a: Array<TargetTag>, b: Array<TargetTag>): number {
	return a.map(x => {
		const match = b.find(y => y.tag === x.tag)
		if (match) {
			return x.score * match.score
		}
		return 0
	}).reduce((a, b) => a + b, 0)
}

export function applySelection(campaigns: Array<any>, options: AdViewManagerOptions): Array<any> {
	const eligible = campaigns.filter(campaign => {
		return options.acceptedStates.includes(campaign.status.name)
			&& (campaign.spec.activeFrom || 0) < Date.now()
			&& Array.isArray(campaign.spec.adUnits)
			&& campaign.depositAsset === options.whitelistedToken
			&& new BN(campaign.spec.minPerImpression)
				.gte(new BN(options.minPerImpression))
	})

	// Map them to units, flatten
	const units = eligible
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

	const unitsFiltered = options.whitelistedType
		? units.filter(x =>
			x.unit.type === options.whitelistedType
			&& !(options.disableVideo && isVideo(x.unit))
		)
		: units

	const unitsByPrice = unitsFiltered
		.sort((b, a) => new BN(a.minPerImpression).cmp(new BN(b.minPerImpression)))

	const unitsTop = options.topByPrice
		? unitsByPrice.slice(0, options.topByPrice)
		: unitsByPrice

	const unitsByScore = unitsTop
		.map(x => ({
			...x,
			targetingScore: calculateTargetScore(x.unit.targeting, options.targeting || []),
		}))
		.filter(x =>
			x.targetingScore >= options.minTargetingScore
			&& x.targetingScore >= x.minTargetingScore
		)
		.sort((a, b) => b.targetingScore - a.targetingScore)

	const unitsTopByScore = options.topByScore
		? unitsByScore.slice(0, options.topByScore)
		: unitsByScore

	return unitsTopByScore
}

export function normalizeUrl(url: string): string {
	if (url.startsWith('ipfs://')) return `${IPFS_GATEWAY}${url.slice(7)}`
	return url
}

function imageHtml({ onLoadCode, size, imgUrl }): string {
	return `<img src="${imgUrl}" alt="AdEx ad" rel="nofollow" onload="${onLoadCode}" ${size}>`
}

function videoHtml({ onLoadCode, size, imgUrl, mediaMime }): string {
	return `<video ${size} loop autoplay onloadeddata="${onLoadCode}" muted>` +
		`<source src="${imgUrl}" type="${mediaMime}">` +
		`</video>`
}

function adexIcon(): string {
	return `<a href="https://www.adex.network" target="_blank" rel="noopener noreferrer"
			style="position: absolute; top: 0; right: 0;"
		>`
		+ `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="18px"
			height="18px" viewBox="0 0 18 18" style="enable-background:new 0 0 18 18;" xml:space="preserve">
			<style type="text/css">
				.st0{fill:#FFFFFF;}
				.st1{fill:#1B75BC;}
			</style>
			<defs>
			</defs>
			<rect class="st0" width="18" height="18"/>
			<path class="st1" d="M14,12.1L10.9,9L14,5.9L12.1,4L9,7.1L5.9,4L4,5.9L7.1,9L4,12.1L5.9,14L9,10.9l3.1,3.1L14,12.1z M7.9,2L6.4,3.5
				L7.9,5L9,3.9L10.1,5l1.5-1.5L10,1.9l-1-1L7.9,2 M7.9,16l-1.5-1.5L7.9,13L9,14.1l1.1-1.1l1.5,1.5L10,16.1l-1,1L7.9,16"/>
   			</svg>`
		+ `</a>`
}

function isVideo(unit: any): boolean {
	return (unit.mediaMime || '').split('/')[0] === 'video'
}

function getUnitHTML({ width, height }: AdViewManagerOptions, { unit, onLoadCode = '' }): string {
	const imgUrl = normalizeUrl(unit.mediaUrl)
	const size = width && height ? `width="${width}" height="${height}" ` : ''
	return `<div
			style="position: relative; overflow: hidden; ${size ? `width: ${width}px; height: ${height}px;` : ''}"
		>`
		+ `<a href="${unit.targetUrl}" target="_blank" rel="noopener noreferrer">`
		+ (isVideo(unit)
			? videoHtml({ onLoadCode, size, imgUrl, mediaMime: unit.mediaMime })
			: imageHtml({ onLoadCode, size, imgUrl }))
		+ `</a>`
		+ adexIcon()
		+ `</div>`
}

export function getHTML(options: AdViewManagerOptions, { unit, channelId, validators }): string {
	const getBody = (evType) => `JSON.stringify({ events: [{ type: '${evType}', publisher: '${options.publisherAddr}', adUnit: '${unit.ipfs}' }] })`
	const getCode = (evType) => `var fetchOpts = { method: 'POST', headers: { 'content-type': 'application/json' }, body: ${getBody(evType)} };` + validators
		.map(({ url }) => {
			const fetchUrl = `${url}/channel/${channelId}/events`
			return `fetch('${fetchUrl}',fetchOpts)`
		})
		.join(';')

	return getUnitHTML(options, { unit, onLoadCode: getCode('IMPRESSION') })
}

export class AdViewManager {
	private fetch: any
	private options: AdViewManagerOptions
	private timesShown: { [key: string]: number }
	private optsLoaded: boolean
	private getTimesShown(channelId: string): number {
		return this.timesShown[channelId] || 0
	}
	constructor(fetch, opts: AdViewManagerOptions) {
		this.fetch = fetch
		this.options = { ...defaultOpts, ...opts }
		this.timesShown = {}
		this.optsLoaded = false
	}
	async loadOptionsFromMarket() {
		const opts = this.options

		if (!this.optsLoaded && opts.marketSlot) {
				const url = `${opts.marketURL}/slots/${opts.marketSlot}`
				const resSlot = await this.fetch(url)
					.then(r => {
						if(r.status >= 200 && r.status < 400){
							return r.json().then(res => res.slot)
						} else {
							return {}
						}
					})
				const resMinPerImpression = (resSlot.minPerImpression || {})[opts.whitelistedToken]
				const optsOverride = {
					fallbackUnit: resSlot.fallbackUnit || opts.fallbackUnit,
					minPerImpression: resMinPerImpression || opts.minPerImpression,
					minTargetingScore: resSlot.minTargetingScore || opts.minTargetingScore,
					targeting: resSlot.tags || opts.targeting
				}

				this.options = { ...opts, ...optsOverride }
				this.optsLoaded = true
		}
	}

	async getAdUnits(): Promise<any> {
		const states = `status=${this.options.acceptedStates.join(',')}`
		const publisherLimit = `limitForPublisher=${this.options.publisherAddr}`
		const url = `${this.options.marketURL}/campaigns?${states}&${publisherLimit}`
		const campaigns = await this.fetch(url).then(r => r.json())
		return applySelection(campaigns, this.options)
	}
	async getFallbackUnit(): Promise<any> {
		const { fallbackUnit } = this.options
		if (!fallbackUnit) return null
		const url = `${this.options.marketURL}/units/${this.options.fallbackUnit}`
		const result = await this.fetch(url).then(r => r.json())
		return result.unit
	}
	async getNextAdUnit(): Promise<any> {
		await this.loadOptionsFromMarket()
		const units = await this.getAdUnits()
		if (units.length === 0) {
			const fallbackUnit = await this.getFallbackUnit()
			if (fallbackUnit) {
				return { ...fallbackUnit, html: getUnitHTML(this.options, { unit: fallbackUnit }) }
			} else {
				return null
			}
		}

		const min = units
			.map(({ channelId }) => this.getTimesShown(channelId))
			.reduce((a, b) => Math.min(a, b))
		const leastShownUnits = units
			.filter(({ channelId }) => this.getTimesShown(channelId) === min)
		const next = this.options.randomize ?
			leastShownUnits[Math.floor(Math.random() * leastShownUnits.length)]
			: leastShownUnits[0]
		this.timesShown[next.channelId] = this.getTimesShown(next.channelId) + 1
		return { ...next, html: getHTML(this.options, next) }
	}
}
