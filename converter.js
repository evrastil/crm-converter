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
        return {
            name: element.childNodes['0'].firstChild.data,
            id: element.childNodes['1'].firstChild.data
        }
    })

    const articles = xpath(doc, "//article").map(element => {
        const longDescription = element.childNodes['3'].firstChild
        const na = 'N/A'

        return {
            manufacturer: element.childNodes['5'].firstChild ? element.childNodes['5'].firstChild.data : na,
            longDescription: longDescription && longDescription.data && !longDescription.data.includes('<')? longDescription.data.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, " ") : na,
            longTitle: element.childNodes['1'].firstChild ? element.childNodes['1'].firstChild.data : na,
            shortTitle: element.childNodes['0'].firstChild ? element.childNodes['0'].firstChild.data : na,
            shortDescription: element.childNodes['2'].firstChild ? element.childNodes['2'].firstChild.data : na,
            nettoprice: element.childNodes['6'].firstChild ? element.childNodes['6'].firstChild.data : na,
            bruttoprice: element.childNodes['7'].firstChild ? element.childNodes['7'].firstChild.data : na,
            images: element.childNodes['9'].firstChild ? element.childNodes['9'].firstChild.data : na,
            artNumber: element.attributes['0'].value,
            category: element.childNodes['14'].firstChild ? categories.find(category => category.id === element.childNodes['14'].firstChild.data).name : na,
            attachments: element.childNodes['13'].firstChild ? element.childNodes['13'].firstChild.lastChild.firstChild.data : na

        }
    })

    const writer = csvWriter()
    writer.pipe(fs.createWriteStream('articles.csv'))
    articles.forEach(article => writer.write(article))
    writer.end()
})