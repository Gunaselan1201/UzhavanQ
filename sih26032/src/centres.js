// Placeholder centre records — replace with real DoCA/NAFED procurement centre data.
// `key` maps to the centres.<key> block in src/locales/*.json for translated name/address.
export const CENTRES = [
    { id: 'namakkal-coop', key: 'namakkalCoop', name: 'Namakkal - Co operative', address: 'Tiruchengode road, Namakkal' },
    { id: 'salem-regulated', key: 'salemRegulated', name: 'Salem - Regulated Market', address: 'Ammapet, Salem' },
    { id: 'erode-coop', key: 'erodeCoop', name: 'Erode - Co operative', address: 'Perundurai road, Erode' },
    { id: 'thanjavur-regulated', key: 'thanjavurRegulated', name: 'Thanjavur - Regulated Market', address: 'Nanjikottai road, Thanjavur' },
]

const BY_ID = Object.fromEntries(CENTRES.map((c) => [c.id, c]))

export function getCentre(id) {
    return BY_ID[id] || null
}
