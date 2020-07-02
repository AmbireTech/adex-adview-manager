import { BN } from 'bn.js'

export function targetingInputGetter(base: any, campaign: any, unit: any, propName: string): any {
	if (propName === 'adUnitId' && unit) return unit.id || unit.ipfs
	if (propName === 'adUnitCategories' && unit) return unit.categories || (unit.targeting
		? unit.targeting.map(x => x.tag.includes('adult') ? 'IAB25-3' : null).filter(x => x)
		: undefined)
	if (propName === 'campaignId') return campaign.id
	if (propName === 'advertiserId') return campaign.creator
	if (propName === 'campaignBudget') return new BN(campaign.depositAmount)
	if (propName === 'campaignSecondsActive')
		return Math.max(0, Math.floor((Date.now() - (campaign.spec.activeFrom || campaign.spec.created))/1000))
	if (propName === 'campaignSecondsDuration')
		return Math.floor((campaign.spec.withdrawPeriodStart-(campaign.spec.activeFrom || campaign.spec.created))/1000)
	// skipping for now cause of performance (not obtaining status): campaignTotalSpent, publisherEarnedFromCampaign
	if (propName === 'campaignTotalSpent' && campaign.status) return Object.values(campaign.status.lastApprovedBalances)
		.map(x => new BN(x))
		.reduce((a, b) => a.add(b), new BN(0))
	if (propName === 'publisherEarnedFromCampaign' && campaign.status)
		return new BN(campaign.status.lastApprovedBalances[base.publisherId] || 0)
	if (propName === 'eventMinPrice') return getPricingBounds(campaign, base.eventType)[0]
	if (propName === 'eventMaxPrice') return getPricingBounds(campaign, base.eventType)[1]
	return base[propName]
}

export function getPricingBounds(campaign: any, eventType: string = 'IMPRESSION'): [BN, BN] {
	const { pricingBounds, minPerImpression, maxPerImpression } = campaign.spec
	if (pricingBounds && pricingBounds[eventType])
		return [new BN(pricingBounds[eventType].min), new BN(pricingBounds[eventType].max)]
	else if (eventType === 'IMPRESSION')
		return [new BN(minPerImpression || 1), new BN(maxPerImpression || 1)]
	else
		return [new BN(0), new BN(0)]
}
