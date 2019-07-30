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

})

test('Apply Selection tests', (t) => {

})