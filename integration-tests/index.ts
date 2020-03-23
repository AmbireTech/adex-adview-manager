import { AdViewManager } from '../src/main'
import { BN } from 'bn.js'

const tape = require('tape')
const puppeteer = require('puppeteer')
const fetch = require('node-fetch')
const marketURL = 'https://market.adex.network'
const publisherAddr = '0x0000000000000000626f62627973686d75726461'
const DELAY_BEFORE_FIRST_IMPRESSION = 10000 // 10 sec
const ZERO =  new BN(0)

const mgr = new AdViewManager(fetch, {
	publisherAddr,
	acceptedStates: ['Active', 'Ready'],
	whitelistedType:'legacy_160x600',
	randomize:true,
	targeting:[{'tag':'advertising  & marketing','score':27}],
	marketURL,
	width:160,
	height:600,
	minPerImpression:'0',
	minTargetingScore:0
})

const LOAD_TIME_LIMIT = 1000

let browser;
let page;
let adUnit;
let oldBalance;

async function beforeAll() {
	browser = await puppeteer.launch({
		headless: false,
	})
	page = await browser.newPage()
	adUnit = await mgr.getNextAdUnit()
	oldBalance = await getPublisherBalance(adUnit.channelId)
}

async function getPublisherBalance(campaignId) {
	const urlToCall = `${marketURL}/campaigns/${campaignId}`
	const { balanceTree } = await fetch(urlToCall).then(res => res.json())
	return balanceTree[publisherAddr] ? new BN(balanceTree[publisherAddr]) : ZERO
}

async function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

tape('Testing Adview Manager', async (t) => {
	await beforeAll()
	const tick = Date.now()
	await page.goto(`data:text/html,${adUnit.html}`, { waitUntil: 'networkidle2' });

	t.pass('Page has loaded')
	const loadTime = Date.now() - tick
	t.ok(loadTime < LOAD_TIME_LIMIT, `Page loads in ${loadTime}, which is less than the ${LOAD_TIME_LIMIT}ms limit`)
	await timeout(DELAY_BEFORE_FIRST_IMPRESSION + 60000)
	const newBalance = await getPublisherBalance(adUnit.channelId)
	t.ok(newBalance.gt(oldBalance), `Publisher is paid in 60 seconds after impression`)
	await browser.close()
	t.end()
})