const { initWithOptions } = require('./common')

window.addEventListener('load', function () {
	const containers = document.getElementsByClassName('adex-container')
	Array.from(containers).forEach((element, idx) => {
		const paramsStr = element.getAttribute('params')
		if (!paramsStr) {
			throw new Error(
				`no params supplied for container ${
					idx + 1
				}; the div should have params attribute`
			)
		} else {
			const params = JSON.parse(decodeURIComponent(paramsStr))
			const { options } = params
			initWithOptions(options, element, false)
		}
	})
})
