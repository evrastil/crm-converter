const fs = require('fs')
const xpath = require('xpath.js')
const dom = require('xmldom').DOMParser
const csvWriter = require('csv-write-stream')
const h2p = require('html2plaintext')
const writer = csvWriter({separator: '$'})
const XlsxPopulate = require('xlsx-populate')

XlsxPopulate.fromFileAsync("cenik.xlsx")
    .then(workbook => {
        const allPrices = []
        workbook.sheets().forEach(sh => sh._rows.forEach(row => {
            const cls = row._cells.filter(c => c && c._value)
            if (cls.length === 3) {
                allPrices.push({name: cls[0]._value, price: cls[2]._value})
            }
        }))
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
                const shortDescriptionKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'shortDescription')
                const longDescriptionKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'longDescription')
                const manufacturerKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'manufacturer')
                const nettoKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'nettoPrice')
                const bruttoKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'bruttoPrice')
                const imageKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'images')
                const categoryKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'categoryId')
                const shortTitleKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'shortTitle')
                const longTitleKeys = Object.keys(element.childNodes).filter(key => element.childNodes[key].tagName === 'longTitle')

                const na = ''
                const shortDescription = element.childNodes[shortDescriptionKeys[0]].firstChild
                const longDescription = element.childNodes[longDescriptionKeys[0]].firstChild
                const manufacturer = element.childNodes[manufacturerKeys[0]].firstChild
                const nettoprice = element.childNodes[nettoKeys[0]].firstChild
                const bruttoprice = element.childNodes[bruttoKeys[0]].firstChild
                const images = element.childNodes[imageKeys[0]].firstChild
                const cat = element.childNodes[categoryKeys[0]].firstChild
                const shortTitle = element.childNodes[shortTitleKeys[0]].firstChild
                const longTitle = element.childNodes[longTitleKeys[0]].firstChild

                const sanitize = (content) => content.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, ' ')


                const shortTitleSanitized = shortTitle ? sanitize(shortTitle.data) : na;
                const priceWithName = allPrices.find(p => p.name === shortTitleSanitized)
                return {
                    articleId: element.attributes['0'].value,
                    manufacturer: manufacturer ? sanitize(manufacturer.data) : na,
                    shortTitle: shortTitleSanitized,
                    longTitle: longTitle ? sanitize(longTitle.data) : na,
                    shortDescription: shortDescription ? sanitize(shortDescription.data) : na,
                    longDescription: longDescription ? sanitize(h2p(longDescription.data)) : na,
                    nettoprice: nettoprice ? nettoprice.data : na,
                    bruttoprice: bruttoprice ? bruttoprice.data : na,
                    price: priceWithName ? priceWithName.price : na,
                    images: images && images.firstChild ? images.firstChild.data : na,
                    category: cat ? flatCategories.find(category => category.id === cat.data).name : na
                }
            })

            const xlsArticles = articles.map(a => [a.articleId, a.manufacturer, a.shortTitle, a.longTitle, a.shortDescription, a.longDescription,
                a.nettoprice, a.bruttoprice, a.price, a.images, a.category])
            xlsArticles.unshift(['articleId', 'manufacturer', 'shortTitle', 'longTitle', 'shortDescription', 'longDescription', 'nettoprice', 'bruttoprice', 'price', 'images', 'category'])

            XlsxPopulate.fromBlankAsync()
                .then(workbook => {
                    workbook.sheet("Sheet1").cell("A1").value(xlsArticles)
                    return workbook.toFileAsync("articles.xlsx");
                })

            // writer.pipe(fs.createWriteStream('articles.csv'))
            // articles.forEach(article => writer.write(article))
            // writer.end()
            console.log('done')
        })
    })
