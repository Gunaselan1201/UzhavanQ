import onionImg from './assets/Onion.jpg'
import tomatoImg from './assets/Tomato.webp'
import sugarcaneImg from './assets/sugarcane.jpg'
import wheatImg from './assets/wheat.jpg'
import paddyImg from './assets/paddy.webp'
import potatoImg from './assets/potato.jpg'
import maizeImg from './assets/maize.webp'
import groundnutImg from './assets/groundnut.webp'
import chanaImg from './assets/chana.webp'
import turmericImg from './assets/Turmeric.webp'
import uradImg from './assets/urad.webp'
import cottonImg from './assets/cotton.jpg'

// variant:
//   'photo'  - full-bleed photograph, needs the dark scrim for label legibility
//   'cutout' - transparent PNG positioned to the right of a solid colour block
//   'plain'  - solid colour only, until a photograph is added
export const PRODUCE = [
    { slug: 'onion', name: 'Onion', color: '#9B5366', image: onionImg, variant: 'photo' },
    { slug: 'tomato', name: 'Tomato', color: '#F6795B', image: tomatoImg, variant: 'photo' },
    { slug: 'sugarcane', name: 'Sugarcane', color: '#C8D96B', image: sugarcaneImg, variant: 'photo' },
    { slug: 'wheat', name: 'Wheat', color: '#F1CF65', image: wheatImg, variant: 'photo' },
    { slug: 'paddy', name: 'Paddy', color: '#7FA650', image: paddyImg, variant: 'photo' },
    { slug: 'potato', name: 'Potato', color: '#C08552', image: potatoImg, variant: 'photo' },
    { slug: 'maize', name: 'Maize', color: '#E8B33D', image: maizeImg, variant: 'photo' },
    { slug: 'groundnut', name: 'Groundnut', color: '#B98B54', image: groundnutImg, variant: 'photo' },
    { slug: 'soybean', name: 'Soybean', color: '#9FAD5A', image: null, variant: 'plain' },
    { slug: 'mustard', name: 'Mustard', color: '#E0B02A', image: null, variant: 'plain' },
    { slug: 'chana', name: 'Chana', color: '#C2874E', image: chanaImg, variant: 'photo' },
    { slug: 'turmeric', name: 'Turmeric', color: '#D39A4E', image: turmericImg, variant: 'photo' },
    { slug: 'moong', name: 'Moong', color: '#7BA85B', image: null, variant: 'plain' },
    { slug: 'urad', name: 'Urad', color: '#7A7060', image: uradImg, variant: 'photo' },
    { slug: 'cotton', name: 'Cotton', color: '#8FA3AD', image: cottonImg, variant: 'photo' },
]

const BY_SLUG = Object.fromEntries(PRODUCE.map((item) => [item.slug, item]))
const BY_NAME = Object.fromEntries(PRODUCE.map((item) => [item.name.toLowerCase(), item]))

export function getProduce(slug) {
    return BY_SLUG[slug] || null
}

// The backend stores the English display name (e.g. "Onion"), not the slug —
// this recovers the slug so a saved booking's produce can still be re-translated.
export function getProduceByName(name) {
    return BY_NAME[(name || '').toLowerCase()] || null
}
