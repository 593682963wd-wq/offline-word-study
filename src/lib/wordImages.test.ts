import {it,expect} from 'vitest'
import {WORD_IMAGES} from '../data/wordImages'
import {WORD_AUDIO} from '../data/wordAudio'
it('不附录音或外部图片',()=>{expect(Object.keys(WORD_IMAGES)).toEqual([]);expect(Object.keys(WORD_AUDIO)).toEqual([])})
