const creatives = new Set([
    'Builder',
    'Chef',
    'Cinematography',
    'Data Scientist',
    'Designer',
    'Educator',
    'Fitness',
    'Foodie',
    'Hardware Developer',
    'Musician',
    'Painter',
    'Performer',
    'Photographer',
    'Promoter',
    'Software Developer',
    'Stylist',
    'Thinker',
    'Visual Artist',
    'Writer',
])

function arrayHasValidCreatives(creativesArray) { return creativesArray.every(isValidCreative) }

function isValidCreative(creative) { return creatives.has(creative) }

module.exports = {
    arrayHasValidCreatives,
    isValidCreative,
}