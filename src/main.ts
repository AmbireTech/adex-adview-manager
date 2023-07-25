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
			ref: document?.referrer
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
