import { getPricingBounds, targetingInputGetter } from '../src/helpers'
import * as test from 'tape'
import { BN } from 'bn.js'

const pricingBounds = { "CLICK": { min: 20, max: 900 } }
const campaign = {
    spec: {
        minPerImpression: 300,
        maxPerImpression: 700,
        pricingBounds,
    }
};

test('targetingInputGetter: gets base property', t => {
    t.equal(targetingInputGetter({ baseProp: 10 }, {}, {}, "baseProp"), 10)

    t.end()
})

test('targetingInputGetter: adUnitId', t => {
    t.equal(targetingInputGetter({}, {}, undefined, "adUnitId"), undefined)
    t.equal(targetingInputGetter({}, {}, {}, "adUnitId"), undefined)
    t.equal(targetingInputGetter({}, {}, { id: "ID" }, "adUnitId"), "ID")
    t.equal(targetingInputGetter({}, {}, { ipfs: "IPFS" }, "adUnitId"), "IPFS")
    t.equal(targetingInputGetter({}, {}, { id: "ID", ipfs: "IPFS" }, "adUnitId"), "ID")

    t.end()
})


test('targetingInputGetter: adUnitCategories', t => {
    // no unit.categories or unit.targeting
    t.deepEqual(targetingInputGetter({}, {}, {}, "adUnitCategories"), undefined)
    // unit.categories
    t.deepEqual(targetingInputGetter({}, {}, { categories: ["one", "two"] }, "adUnitCategories"), ["one", "two"])

    // unit.targeting
    t.deepEqual(targetingInputGetter({}, {}, { targeting: [{ tag: ["adult", "Category 1"] }, {tag: ["Category 2"]}] }, "adUnitCategories"), ["IAB25-3"])

    t.end()
})

test('targetingInputGetter: campaignSecondsActive', t => {
    // In the future
    let futureActiveFrom = { ...campaign, spec: { activeFrom: (Date.now() + 10 * 1000) } }
    t.equal(targetingInputGetter({}, futureActiveFrom, {}, "campaignSecondsActive"), 0)

    // now - 10 secs
    let activeFrom = { ...campaign, spec: { activeFrom: (Date.now() - 10 * 1000) } }
    t.equal(targetingInputGetter({}, activeFrom, {}, "campaignSecondsActive"), 10)

    // now - 20 sec
    let created = { ...campaign, spec: { created: (Date.now() - 20 * 1000) } }
    t.equal(targetingInputGetter({}, created, {}, "campaignSecondsActive"), 20)

    t.end()
})

test('targetingInputGetter: campaignSecondsDuration', t => {
    // 30 secs in the future
    let now = Date.now();
    let withdrawPeriodStart = now + 30 * 1000

    // now - 10 secs
    let activeFrom = { ...campaign, spec: { withdrawPeriodStart, activeFrom: (now - 10 * 1000) } }
    // 10 sec + 30 sec = 40 sec in total
    t.equal(targetingInputGetter({}, activeFrom, {}, "campaignSecondsDuration"), 40)

    // now - 20 sec
    let created = { ...campaign, spec: { withdrawPeriodStart, created: (now - 20 * 1000) } }
    // 20 sec + 30 sec = 50 sec in total
    t.equal(targetingInputGetter({}, created, {}, "campaignSecondsDuration"), 50)

    t.end()
})

test('targetingInputGetter: campaignTotalSpent', t => {

    t.deepEqual(targetingInputGetter({}, {}, {}, "campaignTotalSpent"), undefined)
    t.deepEqual(targetingInputGetter({}, { status: {} }, {}, "campaignTotalSpent"), new BN(0))
    t.deepEqual(targetingInputGetter({}, { status: { lastApprovedBalances: {} } }, {}, "campaignTotalSpent"), new BN(0))
    t.deepEqual(targetingInputGetter({}, { status: { lastApprovedBalances: { "one": 10, "two": 500 } } }, {}, "campaignTotalSpent"), new BN(510))

    t.end()
})

test('targetingInputGetter: publisherEarnedFromCampaign', t => {

    t.deepEqual(targetingInputGetter({}, {}, {}, "publisherEarnedFromCampaign"), undefined)
    t.deepEqual(targetingInputGetter({}, { status: {} }, {}, "publisherEarnedFromCampaign"), new BN(0))
    t.deepEqual(targetingInputGetter({}, { status: { lastApprovedBalances: {} } }, {}, "publisherEarnedFromCampaign"), new BN(0))
    t.deepEqual(targetingInputGetter({ publisherId: "two" }, { status: { lastApprovedBalances: { "one": 10, "two": 500 } } }, {}, "publisherEarnedFromCampaign"), new BN(500))

    t.end()
})

test('targetingInputGetter: eventMinPrice / eventMaxPrice', t => {
    t.deepEqual(targetingInputGetter({}, campaign, {}, "eventMinPrice"), new BN(300))
    t.deepEqual(targetingInputGetter({}, campaign, {}, "eventMaxPrice"), new BN(700))

    t.end()
})


test('getPricingBounds: Has a Pricing bound', t => {
    // uses the PricingBounds in the Campaign Spec
    t.deepEqual(getPricingBounds(campaign, "CLICK"), [new BN(20), new BN(900)])

    // uses the minPerImpression/maxPerImpression for IMPRESSION eventType
    t.deepEqual(getPricingBounds(campaign, "IMPRESSION"), [new BN(300), new BN(700)])

    // if IMPRESSION eventType is listed in the Campaign Spec PricingBounds,
    // then use those values, instead of the minPerImpression/maxPerImpression
    let impression_bound = {
        ...campaign,
        spec: {
            pricingBounds: { "IMPRESSION": { min: 100, max: 200 } },
        }
    }
    t.deepEqual(getPricingBounds(impression_bound, "IMPRESSION"), [new BN(100), new BN(200)])

    t.end()
})

test('getPricingBounds: Does not have a Pricing bound', t => {
    t.deepEqual(getPricingBounds(campaign, "OTHER"), [new BN(0), new BN(0)])

    t.end()
})

