import * as test from 'tape'
import { applySelection, normalizeUrl, calculateTargetScore, getHTML } from '../src/main'

test('Normalize URL tests', (t) => {
	const ipfsUrl = 'ipfs://QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR'
	const normalUrl = 'https://www.xxxtentacion.rip/'

	t.equals(normalizeUrl(ipfsUrl), 'QmcUVX7fvoLMM93uN2bD3wGTH8MXSxeL8hojYfL2Lhp7mR', 'Slices the ipfs:// part successfully')
	t.equals(normalizeUrl(normalUrl), normalUrl, 'Doesn\'t change normal URL')
	t.end()
})

test('Calculate Target Score tests', (t) => {
	
})

test('Get HTML tests', (t) => {

})

test('Apply Selection tests', (t) => {

})