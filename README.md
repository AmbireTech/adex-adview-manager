# adex-adview-manager

Manager class for AdEx adviews

Usage:

```javascript
const { AdViewManager } = require('adex-adview-manager')
const mgr = new AdViewManager(require('node-fetch'), {
	publisherAddr: '0xd6e371526cdaeE04cd8AF225D42e37Bc14688D9E',
	whitelistedToken: '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D',
	targeting: [{ tag: 'location_BG', score: 1.5 }],
})
async function run() {
	console.log((await mgr.getNextAdUnit()).html)
}
run()
```

### Constructor:

`const mgr = new AdViewManager(fetch, opts)`

#### Options

For the available options, see https://github.com/AdExNetwork/adex-adview-manager/blob/master/src/main.ts#L18

Brief description of each one:

* `marketURL`: URL to the AdEx market; defaults to `"https://market.adex.network"`
* `acceptedStates`: array of accepted campaign states; defaults to `['Active', 'Ready']`
* `minPerImpression`: minimum payment amount per impression; defaults to `'0'`
* `minTargetingScore`: minimum targeting score to show an ad unit; defaults to `0`
* `randomize`: apply random sort as a secondary sort if the targeting score is the same
* `publisherAddr`: the address of the publisher that will receive the earnings
* `whitelistedToken`: the address of the whitelisted payment token
* `whitelistedType`: the allowed type of the ad unit; don't pass that in (or set to `null`) if you want to allow all types
* `topByPrice`: how many ad units to consider after sorting by price
* `targeting`: what targeting tags to apply

For detailed information on how the bidding process works, see: https://github.com/AdExNetwork/adex-protocol/blob/master/components/validator-stack.md#bidding-process

### Methods:

* `mgr.getAdUnits()`: returns a promise that resolves with all ad units from currently active campaigns; applies targeting and filtering
* `mgr.getNextAdUnit()`: returns a promise that returns the least seen unit from `getAdUnits()`; use this in your app to get the next ad unit to show

The object format that those functions return is `{ unit, channelId, html }`



## Build a browser version

```
webpack --mode production
```

### Test it

```
http-server --cors dist.browser/
```

### iframe parameters

```javascript
const options = {
	publisherAddr: '0xd6e371526cdaeE04cd8AF225D42e37Bc14688D9E',
	whitelistedToken: '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D',
	whitelistedType: 'legacy_300x250'
}
const url = `index.html#${encodeURIComponent(JSON.stringify({ options }))}`
```
