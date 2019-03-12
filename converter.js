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

    const flatCategories = categories.map(category => {
        if (category.parentId) {
            const cat1 = categories.find(c => c.id === category.parentId)
            if(cat1) {
                category.name = `${cat1.name} | ${category.name}`
                if (cat1.parentId) {
                    const cat2 = categories.find(c => c.id === cat1.parentId)
                    if(cat2) {
                        category.name = `${cat2.name} | ${category.name}`
                    }
                }
            }
        }
        return category
    })
    const articles = xpath(doc, "//article").map(element => {
        const longDescription = element.childNodes['3'].firstChild
        const na = 'N/A'

        return {
            manufacturer: element.childNodes['5'].firstChild ? element.childNodes['5'].firstChild.data : na,
            shortTitle: element.childNodes['0'].firstChild ? element.childNodes['0'].firstChild.data : na,
            shortDescription: element.childNodes['2'].firstChild ? element.childNodes['2'].firstChild.data : na,
            nettoprice: element.childNodes['6'].firstChild ? element.childNodes['6'].firstChild.data : na,
            bruttoprice: element.childNodes['7'].firstChild ? element.childNodes['7'].firstChild.data : na,
            images: element.childNodes['9'].firstChild ? element.childNodes['9'].firstChild.data : na,
            category: element.childNodes['14'].firstChild ? flatCategories.find(category => category.id === element.childNodes['14'].firstChild.data).name : na
        }
    })

    const writer = csvWriter()
    writer.pipe(fs.createWriteStream('articles.csv'))
    articles.forEach(article => writer.write(article))
    writer.end()
})