# adex-adview-manager

Manager class for AdEx AdViews.

This library is meant to be integrated by publishers on their websites, runs on the client side (user's browser) and facilitates the following functionalities:

1. Pulling ad demand (campaigns) and applying targeting, header bidding and filtering according to the criteria set by the advertisers and the involved publisher
2. Showing the ad creative to the user
3. Counting events and sending them to the validators; for example, impressions (as defined by [IAB guidelines](https://www.iab.com/wp-content/uploads/2015/06/Ad-Impression-Measurment-Guideline-US.pdf)) and clicks

For more information, check the [adex-protocol repo](https://github.com/adexnetwork/adex-protocol).

**NOTE:** If you're a publisher, you do not need to integrate this library directly. All you need to do is copy/paste the HTML snippet from the Platform once you create an ad slot.

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
backendURL
* `backendURL`: URL to the AdEx market; defaults to `"https://backend.moonicorn.network"`
* `acceptedStates`: array of accepted campaign states; defaults to `['Active', 'Ready']`
* `minPerImpression`: minimum payment amount per impression; defaults to `'0'`
* `minTargetingScore`: minimum targeting score to show an ad unit; defaults to `0`
* `publisherAddr`: the address of the publisher that will receive the earnings
* `whitelistedToken`: the address of the whitelisted payment token
* `whitelistedType`: the allowed type of the ad unit; don't pass that in (or set to `null`) if you want to allow all types
* `topByPrice`: how many ad units to consider after sorting by price
* `topByScore`: how many ad units to consider after sorting by targeting
* `randomize`: apply random sort on the final selection (after applying `topByPrice` and `topByScore`)
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
### test js-example
[http://127.0.0.1:8080/js-example.html](http://127.0.0.1:8080/js-example.html)

### iframe parameters

```javascript
const options = {
	publisherAddr: '0xd6e371526cdaeE04cd8AF225D42e37Bc14688D9E',
	whitelistedToken: '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D',
	whitelistedType: 'legacy_300x250'
}
const url = `index.html#${encodeURIComponent(JSON.stringify({ options }))}`
```



### iframes

#### Standard:

```
<iframe width={width} height={height} src="{origin}{parameters}">
```

#### Auto-collapsing, collapsed by default:

Auto-collapsing is achieved by adding an `onload` handler:

```javascript
window.addEventListener('message', function(ev) { if (ev.data.hasOwnProperty('adexHeight') && ev.origin === '{origin}') for (f of document.getElementsByTagName('iframe')) if (f.contentWindow === ev.source) f.height = ev.data.adexHeight }, false)
```

```
`<iframe width={width} src="{origin}{parameters}" onload="window.addEventListener('message', function(ev) { if (ev.data.hasOwnProperty('adexHeight') && ev.origin === '{origin}') for (f of document.getElementsByTagName('iframe')) if (f.contentWindow === ev.source) f.height = ev.data.adexHeight }, false)">
```


#### Auto-collapsing, not collapsed by default:


Essentially the only difference to the previous one is that the `height` is set

```
<iframe width={width} height={height} src="{origin}{parameters}" onload="window.addEventListener('message', function(ev) { if (ev.data.hasOwnProperty('adexHeight') && ev.origin === '{origin}') for (f of document.getElementsByTagName('iframe')) if (f.contentWindow === ev.source) f.height = ev.data.adexHeight }, false)">
```
