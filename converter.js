const fs = require('fs')
const xpath = require('xpath.js')
const dom = require('xmldom').DOMParser
const csvWriter = require('csv-write-stream')
const h2p = require('html2plaintext')
const writer = csvWriter({separator: '$'})

fs.readFile('export.xml', 'utf8', (err, contents) => {
    if (err) {
        console.log(err)
    }
    const doc = new dom().parseFromString(contents)
    const categories = xpath(doc, '//categoryList/category').map(element => {
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
        const names = [ln.name]
        while (parent) {
            names.push(parent.name)
            parent = categories.find(c => c.id === parent.parentId)
        }
        ln.name = names.reverse().join(' | ')
        return ln
    })
    const articles = xpath(doc, '//article').map(element => {
        const shortDescriptionKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='shortDescription')
        const longDescriptionKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='longDescription')
        const manufacturerKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='manufacturer')
        const nettoKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='nettoPrice')
        const bruttoKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='bruttoPrice')
        const imageKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='images')
        const categoryKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='categoryId')
        const shortTitleKeys = Object.keys(element.childNodes).filter(key=> element.childNodes[key].tagName ==='shortTitle')

        const na = ''
        const shortDescription = element.childNodes[shortDescriptionKeys[0]].firstChild
        const longDescription = element.childNodes[longDescriptionKeys[0]].firstChild
        const manufacturer = element.childNodes[manufacturerKeys[0]].firstChild
        const nettoprice = element.childNodes[nettoKeys[0]].firstChild
        const bruttoprice = element.childNodes[bruttoKeys[0]].firstChild
        const images = element.childNodes[imageKeys[0]].firstChild
        const cat = element.childNodes[categoryKeys[0]].firstChild
        const shortTitle = element.childNodes[shortTitleKeys[0]].firstChild

        const sanitize = (content) => content.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g,' ')

        return {
            manufacturer: manufacturer ? sanitize(manufacturer.data) : na,
            shortTitle: shortTitle ? sanitize(shortTitle.data) : na,
            shortDescription: shortDescription ? sanitize(shortDescription.data) : na,
            longDescription: longDescription? sanitize(h2p(longDescription.data)): na,
            nettoprice: nettoprice ? nettoprice.data : na,
            bruttoprice: bruttoprice ? bruttoprice.data : na,
            images: images && images.firstChild ? images.firstChild.data : na,
            category: cat ? flatCategories.find(category => category.id === cat.data).name : na
        }
    })

    writer.pipe(fs.createWriteStream('articles.csv'))
    articles.forEach(article => writer.write(article))
    writer.end()
    console.log('done')
})