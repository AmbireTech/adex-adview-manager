import * as test from 'tape'
import { normalizeUrl, getUnitHTMLWithEvents, IPFS_GATEWAY } from '../src/main'
import { JSDOM } from 'jsdom'

const options = {
	width: 300,
	height: 100,
	backendURL: 'https://backend.adex.network',
	reqId: 'reqId-1',
	bidId: 'bidId-1',
	seatId: 'seatId-1',
	impId: 'impId-1'
}

test('Normalize URL tests', (t) => {
	const ipfsUrl = 'ipfs://QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR'
	const normalUrl = 'https://www.xxxtentacion.rip/'

	t.equals(normalizeUrl(ipfsUrl), IPFS_GATEWAY + 'QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR', 'Slices the ipfs:// part successfully')
	t.equals(normalizeUrl(normalUrl), normalUrl, 'Doesn\'t change normal URL')
	t.end()
})

test('Get HTML tests', (t) => {
	const otherInfo = {
		clickUrl: 'https://xxxtentacion.com/?utm_source=adex_PUBHOSTNAME',
		creativeUrl: 'ipfs://QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR',
		creativeMime: ''
	}

	const resultHTML = getUnitHTMLWithEvents(options, otherInfo)
	const document = new JSDOM('html').window.document;
	const el = document.createElement('body')
	el.innerHTML = resultHTML
	const targetEl = el.firstChild.firstChild

	t.ok(el.firstChild.hasAttribute('style'), 'Has style')
	const { width, height } = options
	t.equal(el.firstChild.getAttribute('style'), `position: relative; overflow: hidden; max-width: ${width}px; min-width: ${width/2}px; height: ${height}px;`, 'style is correct')

	t.equals(targetEl.nodeName, 'A', 'Link is link')
	t.ok(targetEl.hasAttribute('href'), 'Link leads to somewhere')
	t.ok(targetEl.hasAttribute('onclick'), 'Link has onclick')
	t.equals(targetEl.href, otherInfo.clickUrl.replace('adex_PUBHOSTNAME', 'AdEx+(pub.com)'), 'Link leads to the right URL')

	const image = targetEl.firstChild
	t.equals(image.nodeName, 'IMG', 'Link contains an image')

	t.ok(image.hasAttribute('src'), 'Image has attribute src')
	// t.equals(image.getAttribute('src'), `https://ipfs.moonicorn.network/ipfs/${otherInfo.unit.ipfs.substr(7)}`, 'Image has correct source')

	t.ok(image.hasAttribute('alt'), 'Image has attribute alt')
	t.equals(image.getAttribute('alt'), 'Powered by AdEx DSP', 'Alt is correct')
	t.ok(image.hasAttribute('rel'), 'Image has attribute rel')
	t.ok(image.hasAttribute('onload'), 'Image has attribute onload')

	t.ok(image.hasAttribute('width'), 'Image has attribute width')
	t.equals(image.getAttribute('width'), '300', 'Image has correct width')
	t.ok(image.getAttribute('style').includes('width: 100%'), 'Image has style width set to 100%')

	test('Video HTML tests', (t) => {
		const videoInfo = {
			...otherInfo
		}
		videoInfo.creativeMime = 'video/mp4'

		const videoResult = getUnitHTMLWithEvents(options, videoInfo)
		const videoEl = document.createElement('body')
		videoEl.innerHTML = videoResult
		const video = videoEl.firstChild.firstChild.firstChild

		t.equals(video.nodeName, 'VIDEO', 'Video is a video element')
		t.ok(video.hasAttribute('width'), 'Video has attribute width')
		t.equals(video.getAttribute('width'), '300', 'Video has corect width')
		t.ok(video.getAttribute('style').includes('width: 100%'), 'Video has style width set to 100%')
		t.ok(video.hasAttribute('loop'), 'Video has attribute loop')
		t.ok(video.hasAttribute('autoplay'), 'Video has attribute autoplay')
		t.ok(video.hasAttribute('onloadeddata'), 'Video has attribute onloadeddata')
		t.ok(video.hasAttribute('muted'), 'Video has attribute muted')

		const source = video.firstChild
		t.equals(source.nodeName, 'SOURCE', 'Source is a source element')
		t.ok(source.hasAttribute('src'), 'Source has attribute src')
		// t.equals(source.getAttribute('src'), `https://ipfs.moonicorn.network/ipfs/${otherInfo.unit.ipfs.substr(7)}`, 'Video has correct source')
		t.ok(source.hasAttribute('type'), 'Source has attribute type')
		t.equals(source.getAttribute('type'), videoInfo.creativeMime, 'Video has correct mime')
		t.end()
	})
	t.end()
})

