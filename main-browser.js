const { AdViewManager } = require('./lib/main')
const mgr = new AdViewManager((url, opts) => fetch(url, opts), {
	publisherAddr: '0xd6e371526cdaeE04cd8AF225D42e37Bc14688D9E',
	whitelistedToken: '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D'
})
mgr.getNextAdUnit().then(u => document.body.innerHTML = u.html)
