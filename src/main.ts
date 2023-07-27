export const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.moonicorn.network/ipfs/'

// How much time to wait before sending out an impression event
// Related: https://github.com/AdExNetwork/adex-adview-manager/issues/17, https://github.com/AdExNetwork/adex-adview-manager/issues/35, https://github.com/AdExNetwork/adex-adview-manager/issues/46
const WAIT_FOR_IMPRESSION = 8000

const defaultOpts = {
	backendURL: process.env.BACKEND_URL || 'https://backend.moonicorn.network',
	disableVideo: false,
}

interface AdViewManagerOptions {
	// Defaulted via defaultOpts
	backendURL: string,
	disableVideo?: boolean,

	width?: number,
	height?: number,
	navigatorLanguage?: string,
	// new ones
	provider?: string,
	publisher?: string,
	siteId?: string,
	siteName?: string,
	appId?: string,
	appName?: string,
	reqId: string,
	bidId: string,
	seatId: string,
	impId: string,
	acceptedRefferer?: string

}

export function normalizeUrl(url: string): string {
	if (url.startsWith('ipfs://')) return `${IPFS_GATEWAY}${url.slice(7)}`
	return url
}

function imageHtml({ onLoadCode, size, imgUrl }): string {
	return `<img loading="lazy" src="${imgUrl}" alt="Powered by AdEx DSP" rel="nofollow" onload="${onLoadCode}" ${size}>`
}

function videoHtml({ onLoadCode, size, imgUrl, creativeMime }): string {
	return `<video ${size} loop autoplay onloadeddata="${onLoadCode}" muted>` +
		`<source src="${imgUrl}" type="${creativeMime}">` +
		`</video>`
}

function adexIcon(): string {
	return `<a href="https://www.adex.network" target="_blank" alt="AdEx DSP" rel="noopener noreferrer"
			style="position: absolute; top: 0; right: 0;"
		>`
		+ 	`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
				<g id="fav_icon_color" data-name="fav icon color" transform="translate(-245 -66)">
				<rect id="base" width="18" height="18" transform="translate(245 66)" fill="#fcfcfc"/>
				<g id="symbol" transform="translate(248.471 66)">
					<g id="Group_1111" data-name="Group 1111" transform="translate(0 0)">
					<path id="Path_3069" data-name="Path 3069" d="M3076.23,4996.448l3.469-3.469-3.469-3.47,2.059-2.059,3.472,3.472,3.472-3.472,2.059,2.059-3.469,3.47,3.469,3.469-2.062,2.062-3.469-3.469-3.469,3.469Z" transform="translate(-3076.23 -4983.978)" fill="#7298fe" fill-rule="evenodd"/>
					<g id="Group_1110" data-name="Group 1110" transform="translate(2.293)">
						<path id="Path_3067" data-name="Path 3067" d="M4080.259,3470.408l3.238-3.238,3.238,3.238-1.737,1.738-1.5-1.5-1.5,1.5Z" transform="translate(-4080.259 -3467.17)" fill="#2c5cde" fill-rule="evenodd"/>
						<path id="Path_3068" data-name="Path 3068" d="M4080.259,9172.367l3.238,3.238,3.238-3.238L4085,9170.63l-1.5,1.5-1.5-1.5Z" transform="translate(-4080.259 -9157.605)" fill="#2c5cde" fill-rule="evenodd"/>
					</g>
					</g>
				</g>
				</g>
			</svg>`
		+ `</a>`
}

function isVideo(mime: string): boolean {
	return (mime || '').split('/')[0] === 'video'
}

function getUnitHTML({ width, height }: AdViewManagerOptions, { clickUrl, creativeUrl, creativeMime, onLoadCode = '', onClickCode = '' }): string {
	const imgUrl = normalizeUrl(creativeUrl)
	const size = `width=${width} height=${height} style="width: 100%; height: auto;"`
	// @TODO click protection page
	return `<div
			style="position: relative; overflow: hidden; ${(width && height) ? `max-width: ${width}px; min-width: ${width / 2}px; height: ${height}px;` : ''}"
		>`
		+ `<a href="${clickUrl}" target="_blank" onclick="${onClickCode}" rel="noopener noreferrer">`
		+ (isVideo(creativeMime)
			? videoHtml({ onLoadCode, size, imgUrl, creativeMime })
			: imageHtml({ onLoadCode, size, imgUrl }))
		+ `</a>`
		+ adexIcon()
		+ `</div>`
}

export function getUnitHTMLWithEvents(options: AdViewManagerOptions, { clickUrl, creativeUrl, creativeMime, noImpression = false }): string {
	const fetchUrl = `${options.backendURL}/viewmanager/bid`
	const getBody = (evType) => `JSON.stringify({ events: [{ type: '${evType}', reqid: '${options.reqId}', bidid: '${options.bidId}', impid: '${options.impId}', seatid: '${options.seatId}', ref: document.referrer }] })`
	const getFetchCode = (evType) => `var fetchOpts = { method: 'POST', headers: { 'content-type': 'application/json' }, body: ${getBody(evType)} }; fetch('${fetchUrl}',fetchOpts);`
	const getTimeoutCode = (evType) => `setTimeout(function() {${getFetchCode(evType)}}, ${WAIT_FOR_IMPRESSION})`
	return getUnitHTML(options, { clickUrl, creativeUrl, creativeMime, onLoadCode: noImpression ? '' : getTimeoutCode('IMPRESSION'), onClickCode: getFetchCode('CLICK') })
}

export class AdViewManager {
	private fetch: any
	private options: AdViewManagerOptions

	constructor(fetch, opts: AdViewManagerOptions) {
		this.fetch = fetch
		this.options = { ...defaultOpts, ...opts }
		// There's no check for the other properties, but we can actually function without most of them since there's defaults
		if (!(
			this.options.reqId 
			&& this.options.bidId
			&& this.options.seatId
			&& this.options.impId
			//&& this.options.acceptedRefferer
		)) {
			throw new Error('backend options required {reqId, bidId, seatId, impId,  }')
		}
	}

	async getCreative(): Promise<any> {
		const { backendURL, reqId, bidId, impId, seatId } = this.options
		const queryParams = {
			reqId,
			bidId,
			impId,
			seatId,
			ref: document?.referrer || 'missing referrer'
		}

		const querystr = Object.entries(queryParams).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
		const url = `${backendURL}/viewmanager/bid?${querystr}`
		const r = await this.fetch(url)
		if (r.status !== 200) throw new Error(`AdEx backend returned status code ${r.status} at ${url}`)
		return r.json()
	}

	async getBidData(): Promise<any> {
		const { creativeUrl, clickUrl, creativeMime } = await this.getCreative()

		// Return the results, with a fallback unit if there is one
		if (creativeUrl && clickUrl) {
			return {
				html: getUnitHTMLWithEvents(this.options, { clickUrl, creativeUrl, creativeMime })
			}
		} else {
			return null
		}
	}
}
