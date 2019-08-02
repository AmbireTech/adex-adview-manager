import * as test from 'tape'
import { applySelection, normalizeUrl, calculateTargetScore, getHTML, AdViewManagerOptions, IPFS_GATEWAY } from '../src/main'
import { BN } from 'bn.js'

const whitelistedToken = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'

const ineligibleCampaign1 = {
	depositAsset: whitelistedToken,
	status: {
		name: 'Expired'
	},
	spec: {
		activeFrom: 0,
		adUnits: [],
		minPerImpression: new BN(2)
	}
}

const ineligibleCampaign2 = {
	depositAsset: '0x0',
	status: {
		name: 'Active'
	},
	spec: {
		activeFrom: 0,
		adUnits: [],
		minPerImpression: new BN(2)
	}
}

const ineligibleCampaign3 = {
	depositAsset: whitelistedToken,
	status: {
		name: 'Active'
	},
	spec: {
		activeFrom: Date.now() + 100000,
		adUnits: [],
		minPerImpression: new BN(2)
	}
}

const ineligibleCampaign4 = {
	depositAsset: whitelistedToken,
	status: {
		name: 'Active'
	},
	spec: {
		activeFrom: 0,
		minPerImpression: new BN(2)
	}
}

const ineligibleCampaign5 = {
	depositAsset: whitelistedToken,
	status: {
		name: 'Active'
	},
	spec: {
		activeFrom: 0,
		adUnits: [],
		minPerImpression: new BN(0)
	}
}

const options = {
	publisherAddr: '0x13e72959d8055dafa6525050a8cc7c479d4c09a3',
	width: 300,
	height: 100,
	marketURL: 'https://market.adex.network',
	acceptedStates: ['Active', 'Ready'],
	minPerImpression: new BN(1),
	minTargetingScore: 0,
	randomize: true,
	whitelistedToken
}

const optionsWithTopByPrice = {
	...options,
	topByPrice: 1
}

const optionsWithTypeLimit = {
	...options,
	whitelistedType: 'legacy_300x100'
}

const optionsWithTargeting = {
	...options,
	targeting: [{tag: 'movies', score: 50}, {tag: 'music', score: 100}]
}

const optionsTargetingAndMinScore = {
	...optionsWithTargeting
}
optionsTargetingAndMinScore.minTargetingScore = 1000

const unit1 = {
	ipfs : 'QmTgLkd4vvKiBWozfKxc4bDf4U6VAdAwoADvbewfzUrZ34',
	type : 'legacy_300x100',
	mediaUrl : 'ipfs://QmUUecheVnWcj8CweBBzrkaWkEwM3yC4spsAamXtMRnQ9G',
	mediaMime : 'image/jpeg',
	targetUrl : 'https://kuramiqnko.com',
	targeting : [{tag: 'music', score: 100}, {tag: 'movies', score: 10}],
	owner : '0x542810521853f5da0c771473ff2ed3558ff32f44',
	created : 1562859974189
}

const unit2 = {
	ipfs : 'QmTgLkd4vvKiBWozfKxc4bDf4U6VAdAwoADvbewfzUrZ34',
	type : 'legacy_300x100',
	mediaUrl : 'ipfs://QmUUecheVnWcj8CweBBzrkaWkEwM3yC4spsAamXtMRnQ9G',
	mediaMime : 'image/jpeg',
	targetUrl : 'https://kuramiqnko.com',
	targeting : [ ],
	owner : '0x542810521853f5da0c771473ff2ed3558ff32f44',
	created : 1562859974189
}

const unit3 = {
	ipfs : 'QmTgLkd4vvKiBWozfKxc4bDf4U6VAdAwoADvbewfzUrZ34',
	type : 'legacy_300x600',
	mediaUrl : 'ipfs://QmUUecheVnWcj8CweBBzrkaWkEwM3yC4spsAamXtMRnQ9G',
	mediaMime : 'image/jpeg',
	targetUrl : 'https://kuramiqnko.com',
	targeting : [{tag: 'movies', score: 60}],
	owner : '0x542810521853f5da0c771473ff2ed3558ff32f44',
	created : 1562859974189
}

function getCampaignWithUnits(adUnits: Array<any>) {
	return {
		id: '0x0',
		depositAsset: whitelistedToken,
		status: {
			name: 'Active'
		},
		spec: {
			activeFrom: 0,
			adUnits,
			minPerImpression: new BN(2),
			validators: [
				{
					id : '0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
					url : 'https://itchy.adex.network',
					fee : '0'
				},
				{
					id : '0xce07CbB7e054514D590a0262C93070D838bFBA2e',
					url : 'https://scratchy.adex.network',
					fee : '0'
				}
			],
			minTargetingScore: 0
		}
	}
}

test('Normalize URL tests', (t) => {
	const ipfsUrl = 'ipfs://QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR'
	const normalUrl = 'https://www.xxxtentacion.rip/'

	t.equals(normalizeUrl(ipfsUrl), IPFS_GATEWAY + 'QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR', 'Slices the ipfs:// part successfully')
	t.equals(normalizeUrl(normalUrl), normalUrl, 'Doesn\'t change normal URL')
	t.end()
})

test('Calculate Target Score tests', (t) => {
	const targetTags1 = [{tag: 'test', score: 10}]
	const targetTags2 = [{tag: 'test', score: 30}]
	const targetTags3 = [{tag: 'test2', score: 30}]
	const targetTags4 = [{tag: 'test', score: 20}, { tag: 'test2', score: 100 }]
	const targetTags5 = [{tag: 'test', score: 50}, { tag: 'test3', score: 50 }]

	t.equals(calculateTargetScore(targetTags1, targetTags2), 300, 'Calculates correct target score for 2 matches')
	t.equals(calculateTargetScore(targetTags1, targetTags3), 0, 'Calculates correct target score for no matches')
	t.equals(calculateTargetScore(targetTags3, targetTags5), 0, 'Calculate correct target score for no matches on tag array with more than one element')
	t.equals(calculateTargetScore(targetTags1, targetTags4), 200, 'Calculates correct target score with one match')
	t.equals(calculateTargetScore(targetTags4, targetTags5), 1000, 'Calculates correct target score with 1 match in arrays with more than one element')
	t.equals(calculateTargetScore(targetTags4, targetTags4), 10400, 'Calculates correct target score for more than one tag match')
	t.equals(calculateTargetScore([], []), 0, 'Shows 0 if no tags at all')
	t.end()
})

test('Get HTML tests', (t) => {
	const otherInfo = {
		unit: {
			ipfs: 'ipfs://QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR',
			targetUrl: 'https://xxxtentacion.com',
			mediaUrl: 'ipfs://QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR'
		},
		channelId: '0x0',
		validators: [{ url: 'https://tom.adex.network' }, { url: 'https://jerry.adex.network' }]
	}

	const resultHTML = `<a href="${otherInfo.unit.targetUrl}" target="_blank" rel="noopener noreferrer"><img src="https://ipfs.adex.network/ipfs/QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR" data-event-body='{"events":[{"type":"IMPRESSION","publisher":"0x13e72959d8055dafa6525050a8cc7c479d4c09a3","adUnit":"ipfs://QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR"}]}' alt="AdEx ad" rel="nofollow" onload="fetch('${otherInfo.validators[0].url}/channel/${otherInfo.channelId}/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: this.dataset.eventBody });fetch('${otherInfo.validators[1].url}/channel/${otherInfo.channelId}/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: this.dataset.eventBody })" width="300" height="100" ></a>`

	t.equals(getHTML(options, otherInfo), resultHTML, 'Returns correct HTML for current settings')
	t.end()
})

test('Apply Selection tests', (t) => {
	t.deepEquals(applySelection([], options), [], 'No campaigns returns empty array')
	t.deepEquals(applySelection([ineligibleCampaign1, ineligibleCampaign2, ineligibleCampaign3, ineligibleCampaign4, ineligibleCampaign5], options), [], 'None of these campaigns is eligible, so none are returned')

	const campaign1 = getCampaignWithUnits([unit1]) // BN(2)
	const campaign2 = getCampaignWithUnits([unit2])
	campaign2.spec.minPerImpression = new BN(3)
	const campaign3 = getCampaignWithUnits([unit3])
	campaign3.spec.minPerImpression = new BN(1)
	const testCampaigns = [campaign1, campaign2, campaign3]
	const sortedUnits = applySelection(testCampaigns, options)

	t.deepEquals(sortedUnits[0].minPerImpression, new BN(3), 'First campaign is with highest minPerImpression')
	t.deepEquals(sortedUnits[1].minPerImpression, new BN(2), 'First campaign is with second highest minPerImpression')
	t.deepEquals(sortedUnits[2].minPerImpression, new BN(1), 'First campaign is with lowest minPerImpression')
	t.equals(sortedUnits[0].channelId, campaign2.id, 'Unit object has channelId property and it is equal to campaign ID')
	t.deepEquals(sortedUnits[0].validators, campaign2.spec.validators, 'Unit object has property equal to the campaign validators')
	t.equals(sortedUnits[0].minTargetingScore, campaign2.spec.minTargetingScore, 'Unit object has minTargetScore property from campaign')
	t.equals(sortedUnits[0].targetingScore, 0, 'Targeting score is calculated')

	const toppedByPrice = applySelection(testCampaigns, optionsWithTopByPrice)

	t.equals(toppedByPrice.length, optionsWithTopByPrice.topByPrice, 'Successfully limits by topByPrice')
	t.deepEquals(toppedByPrice[0].minPerImpression, new BN(3), 'First element is correct')

	const filteredByType = applySelection(testCampaigns, optionsWithTypeLimit)
	t.equals(filteredByType.length, 2, 'Filtered the right amount of elements')
	t.ok(filteredByType.every((x) => x.unit.type === optionsWithTypeLimit.whitelistedType), 'Filtered out the right types')

	const withTargeting = applySelection(testCampaigns, optionsWithTargeting)
	t.ok(withTargeting[0].targetingScore >= withTargeting[1].targetingScore, 'First campaign has highest targeting score')
	t.ok(withTargeting[1].targetingScore >= withTargeting[2].targetingScore, 'All campaigns are sorted by targetingScore correctly')

	const withTargetingAndMinScore = applySelection(testCampaigns, optionsTargetingAndMinScore)
	t.equals(withTargetingAndMinScore.length, 2, 'minTargetingScore correctly filters out unit with 0 score')

	t.end()
})