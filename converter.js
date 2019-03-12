const fs = require('fs')
const xpath = require('xpath.js')
const dom = require('xmldom').DOMParser
const csvWriter = require('csv-write-stream')
const writer = csvWriter()

fs.readFile('export.xml', 'utf8', function (err, contents) {
    if (err) {
        console.log(err)
    }
    const doc = new dom().parseFromString(contents)
    const categories = xpath(doc, "//categoryList/category").map(element => {
        const parentId = element.childNodes['2'].firstChild;
        return {
            name: element.childNodes['0'].firstChild.data,
            id: element.childNodes['1'].firstChild.data,
            parentId: parentId ? parentId.data : null
        }
    })
    const leafNodes = categories.filter(c => !categories.find(f => c.id === f.parentId))

    const flatCategories = leafNodes.map(ln => {
        let parent = categories.find(c => c.id === ln.parentId)
        let name = ln.name
        while (parent) {
            name = `${name} | ${parent.name}`
            parent = categories.find(c => c.id === parent.parentId)
        }
        ln.name = name
        return ln
    })
    const articles = xpath(doc, "//article").map(element => {
        const na = ''
        const shortDescription = element.childNodes['2'].firstChild
        const manufacturer = element.childNodes['5'].firstChild
        const nettoprice = element.childNodes['6'].firstChild
        const bruttoprice = element.childNodes['7'].firstChild
        const images = element.childNodes['12'].firstChild
        const cat = element.childNodes['14'].firstChild
        const shortTitle = element.childNodes['0'].firstChild
        return {
            manufacturer: manufacturer ? manufacturer.data : na,
            shortTitle: shortTitle ? shortTitle.data : na,
            shortDescription: shortDescription ? shortDescription.data : na,
            nettoprice: nettoprice ? nettoprice.data : na,
            bruttoprice: bruttoprice ? bruttoprice.data : na,
            images: images && images.firstChild ? images.firstChild.data : na,
            category: cat ? flatCategories.find(category => category.id === cat.data).name : na
        }
    })

    const writer = csvWriter()
    writer.pipe(fs.createWriteStream('articles.csv'))
    articles.forEach(article => writer.write(article))
    writer.end()
})