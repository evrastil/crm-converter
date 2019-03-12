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
    const leafNodes = categories.filter(c => {
        const found = categories.find(f => c.id === f.parentId)
        if(found){
            return false
        }
        return true
    })

    const flatCategories = leafNodes.map(ln => {
        let parent = categories.find(c=>c.id ===ln.parentId)
        let name = ln.name
        while(parent){
            name = name +' | '+parent.name
            parent = categories.find(c=>c.id ===parent.parentId)
        }
        ln.name = name
        return ln
    })

    const articles = xpath(doc, "//article").map(element => {
        const longDescription = element.childNodes['3'].firstChild
        const na = ''

        return {
            manufacturer: element.childNodes['5'].firstChild ? element.childNodes['5'].firstChild.data : na,
            shortTitle: element.childNodes['0'].firstChild ? element.childNodes['0'].firstChild.data : na,
            shortDescription: element.childNodes['2'].firstChild ? element.childNodes['2'].firstChild.data : na,
            nettoprice: element.childNodes['6'].firstChild ? element.childNodes['6'].firstChild.data : na,
            bruttoprice: element.childNodes['7'].firstChild ? element.childNodes['7'].firstChild.data : na,
            images: element.childNodes['12'].firstChild && element.childNodes['12'].firstChild.firstChild ? element.childNodes['12'].firstChild.firstChild.data : na,
            category: element.childNodes['14'].firstChild ? flatCategories.find(category => category.id === element.childNodes['14'].firstChild.data).name : na
        }
    })

    const writer = csvWriter()
    writer.pipe(fs.createWriteStream('articles.csv'))
    articles.forEach(article => writer.write(article))
    writer.end()
})