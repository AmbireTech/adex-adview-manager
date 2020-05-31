import { BN } from 'bn.js'
import { evaluateMultiple } from './rules'
import { targetingInputGetter } from './helpers'

export const IPFS_GATEWAY = 'https://ipfs.moonicorn.network/ipfs/'

// How much time to wait before sending out an impression event
// Related: https://github.com/AdExNetwork/adex-adview-manager/issues/17, https://github.com/AdExNetwork/adex-adview-manager/issues/35, https://github.com/AdExNetwork/adex-adview-manager/issues/46
const WAIT_FOR_IMPRESSION = 8000
// The number of impressions (won auctions) kept in history
const HISTORY_LIMIT = 50
// Impression "stickiness" time: see https://github.com/AdExNetwork/adex-adview-manager/issues/65
// 4 minutes allows ~4 campaigns to rotate, considering a default frequency cap of 15 minutes
const IMPRESSION_STICKINESS_TIME = 240000

const defaultOpts = {
	marketURL: 'https://market.moonicorn.network',
	whitelistedTokens: ['0x6B175474E89094C44Da98b954EedeAC495271d0F'],
	disableVideo: false,
}

interface AdViewManagerOptions {
	// Defaulted via defaultOpts
	marketURL: string,
	// Must be passed (except the ones with ?)
	marketSlot: string,
	publisherAddr: string,
	// All passed tokens must be of the same price and decimals, so that the amounts can be accurately compared
	whitelistedTokens?: Array<string>,
	width?: number,
	height?: number,
	navigatorLanguage?: string,
	disableVideo?: boolean,
	disableSticky?: boolean,
}

interface Unit {
	id: string,
	mediaUrl: string,
	mediaMime: string,
	targetUrl: string,
}

interface HistoryEntry {
	time: number,
	unitId: string,
	campaignId: string,
	slotId: string,
}

export function normalizeUrl(url: string): string {
	if (url.startsWith('ipfs://')) return `${IPFS_GATEWAY}${url.slice(7)}`
	return url
}

function imageHtml({ onLoadCode, size, imgUrl }): string {
	return `<img loading="lazy" src="${imgUrl}" alt="AdEx ad" rel="nofollow" onload="${onLoadCode}" ${size}>`
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

function isVideo(unit: Unit): boolean {
	return (unit.mediaMime || '').split('/')[0] === 'video'
}

function randomizedSortPos(unit: Unit, seed: BN): BN {
	// using base32 is technically wrong (IDs are in base 58), but it works well enough for this purpose
	// kind of a LCG PRNG but without the state; using GCC's constraints as seen on stack overflow
	// takes around ~700ms for 100k iterations, yields very decent distribution (e.g. 724ms 50070, 728ms 49936)
	return new BN(unit.id, 32).mul(seed).add(new BN(12345)).mod(new BN(0x80000000))
}

function getUnitHTML({ width, height }: AdViewManagerOptions, { unit, onLoadCode = '', onClickCode = '' }): string {
	const imgUrl = normalizeUrl(unit.mediaUrl)
	const size = 'width=100%'
	return `<div
			style="position: relative; overflow: hidden; ${(width && height) ? `max-width: ${width}px; min-width: ${width/2}px; height: ${height}px;` : ''}"
		>`
		+ `<a href="${unit.targetUrl}" target="_blank" onclick="${onClickCode}" rel="noopener noreferrer">`
		+ (isVideo(unit)
			? videoHtml({ onLoadCode, size, imgUrl, mediaMime: unit.mediaMime })
			: imageHtml({ onLoadCode, size, imgUrl }))
		+ `</a>`
		+ adexIcon()
		+ `</div>`
}

export function getUnitHTMLWithEvents(options: AdViewManagerOptions, { unit, campaignId, validators }): string {
	const getBody = (evType) => `JSON.stringify({ events: [{ type: '${evType}', publisher: '${options.publisherAddr}', adUnit: '${unit.id}', adSlot: '${options.marketSlot}', ref: document.referrer }] })`
	const getFetchCode = (evType) => `var fetchOpts = { method: 'POST', headers: { 'content-type': 'application/json' }, body: ${getBody(evType)} };` + validators
		.map(({ url }) => {
			const fetchUrl = `${url}/channel/${campaignId}/events?pubAddr=${options.publisherAddr}`
			return `fetch('${fetchUrl}',fetchOpts)`
		})
		.join(';')
	const getTimeoutCode = (evType) => `setTimeout(function() {${getFetchCode(evType)}}, ${WAIT_FOR_IMPRESSION})`
	return getUnitHTML(options, { unit, onLoadCode: getTimeoutCode('IMPRESSION'), onClickCode: getFetchCode('CLICK') })
}

export class AdViewManager {
	private fetch: any
	private options: AdViewManagerOptions
	public history: HistoryEntry[]
	constructor(fetch, opts: AdViewManagerOptions, history: HistoryEntry[] = []) {
		this.fetch = fetch
		this.options = { ...defaultOpts, ...opts }
		this.history = history
		// There's no check for the other properties, but we can actually function without most of them since there's defaults
		if (!(this.options.marketSlot && this.options.publisherAddr)) throw new Error('marketSlot and publisherAddr options required')
	}
	private getTargetingInput(targetingInputBase: any, campaign: any): any {
		const lastImpression = this.history.reverse().find(({ campaignId }) => campaignId === campaign.id)
		return  {
			...targetingInputBase,
			'adView.navigatorLanguage': this.options.navigatorLanguage,
			'adView.secondsSinceCampaignImpression': lastImpression
				? Math.floor((Date.now() - lastImpression.time) / 1000)
				: Infinity
		}
	}
	private getStickyAdUnit(campaigns: any, acceptedReferrers: any): any {
		if (this.options.disableSticky) return null

		const time = Date.now()
		const stickinessThreshold = time - IMPRESSION_STICKINESS_TIME
		const stickyEntry = this.history.find(entry =>
			entry.slotId === this.options.marketSlot
				&& entry.time > stickinessThreshold
		)
		if (stickyEntry) {
			const stickyCampaign = campaigns.find(campaign => campaign.id === stickyEntry.campaignId)
			if (stickyCampaign) {
				const { unit } = stickyCampaign.unitsWithPrice.find(x => x.unit.id === stickyEntry.unitId)
				return {
					unit,
					price: '0',
					acceptedReferrers,
					html: getUnitHTML(this.options, { unit }),
					isSticky: true
				}
			}
		}
		return null
	}
	async getMarketDemandResp(): Promise<any> {
		const marketURL = this.options.marketURL
		const depositAsset = this.options.whitelistedTokens.map(tokenAddr => `&depositAsset=${tokenAddr}`).join('')
		const pubPrefix = this.options.publisherAddr.slice(2, 10)
		const url = `${marketURL}/units-for-slot/${this.options.marketSlot}?pubPrefix=${pubPrefix}${depositAsset}`
		const r = await this.fetch(url)
		return r.json()
	}
	async getNextAdUnit(): Promise<any> {
		const { campaigns, targetingInputBase, acceptedReferrers, fallbackUnit } = await this.getMarketDemandResp()

		// Stickiness is when we keep showing an ad unit for a slot for some time in order to achieve fair impression value
		// see https://github.com/AdExNetwork/adex-adview-manager/issues/65
		const stickyResult = this.getStickyAdUnit(campaigns, acceptedReferrers)
		if (stickyResult) return stickyResult

		// If two or more units result in the same price, apply random selection between them: this is why we need the seed
		const seed = new BN(Math.random() * (0x80000000 - 1))

		// Apply targeting, now with adView.* variables, and sort the resulting ad units
		const unitsWithPrice = campaigns
			.map(campaign => {
				const campaignInput = targetingInputGetter.bind(null, this.getTargetingInput(targetingInputBase, campaign), campaign)
				return campaign.unitsWithPrice.filter(({ unit, price }) => {
					const input = campaignInput.bind(null, unit)
					const output = {
						show: true,
						'price.IMPRESSION': new BN(price),
					}
					// NOTE: not using the price from the output on purpose
					// we trust what the server gives us since otherwise we may end up changing the price based on
					// adView-specific variables, which won't be consistent with the validator's price
					const onTypeErr = (e, rule) => console.error(`WARNING: rule for ${campaign.id} failing with:`, rule, e)
					return evaluateMultiple(input, output, campaign.targetingRules, onTypeErr).show
				}).map(x => ({ ...x, campaignId: campaign.id }))
			})
			.reduce((a, b) => a.concat(b), [])
			.filter(x => !(this.options.disableVideo && isVideo(x.unit)))
			.sort((b, a) =>
				new BN(a.price).cmp(new BN(b.price))
				|| randomizedSortPos(a.unit, seed).cmp(randomizedSortPos(b.unit, seed))
			)

		// Update history
		const auctionWinner = unitsWithPrice[0]
		if (auctionWinner) {
			this.history.push({
				time: Date.now(),
				slotId: this.options.marketSlot,
				unitId: auctionWinner.unit.id,
				campaignId: auctionWinner.campaignId,
			})
			this.history = this.history.slice(-HISTORY_LIMIT)
		}

		// Return the results, with a fallback unit if there is such
		if (auctionWinner) {
			const { unit, price, campaignId } = auctionWinner
			const { validators } = campaigns.find(x => x.id === campaignId).spec
			return {
				unit,
				price,
				acceptedReferrers,
				html: getUnitHTMLWithEvents(this.options, { unit, campaignId, validators })
			}
		} else {
			const unit = fallbackUnit
			return {
				unit,
				price: '0',
				acceptedReferrers,
				html: getUnitHTML(this.options, { unit })
			}
		}
	}
}
