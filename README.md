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

For the available options, see https://github.com/AdExNetwork/adex-adview-manager/blob/master/src/main.ts#L18


### Methods:

* `mgr.getAdUnits()`: returns a promise that resolves with all ad units from currently active campaigns; applies targeting and filtering
* `mgr.getNextAdUnit()`: returns a promise that returns the least seen unit from `getAdUnits()`; use this in your app to get the next ad unit to show

The object format that those functions return is `{ unit, channelId, html }`

