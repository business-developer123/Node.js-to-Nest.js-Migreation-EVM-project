const colors = new Set([
    'Black',
    'Blue',
    'Brown',
    'Green',
    'Grey',
    'Orange',
    'Pink',
    'Purple',
    'Red',
    'Yellow',
    'White',
])

function arrayHasValidColors(colorsArray) { return colorsArray.every(isValidColor) }

function isValidColor(color) { return colors.has(color) }

module.exports = {
    arrayHasValidColors,
    isValidColor,
}