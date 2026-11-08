import {it,expect} from 'vitest'
import {WORDS} from '../hooks/useData'
import {resolveArt,TONES} from './art'
it('每个合成词都有本地图标',()=>{expect(WORDS.length).toBe(12);for(const word of WORDS){const art=resolveArt(word);expect(TONES[art.tone]).toBeTruthy();expect(art.kind==='letter'?art.letter:art.icon).toBeTruthy()}})
