const fs = require("fs")
const path = require("path")
const _ = require("lodash")
const extractSlides = require("./scripts/extract_slides.js")
const showSlides = require("./scripts/show_slides.js")

const compiled = _.template(fs.readFileSync("./index.tpl", {encoding: "UTF-8"}))

function main(src) {
    readMarkdowns(src)
    .map(toSlides)
    .map(renderHTML)
    .forEach(writeHTML)
}

function readMarkdowns(path) {
    return fs.readdirSync(path).map(fileName => {return {parentPath: path, markdownFileName: fileName}})
}

function toSlides({parentPath, markdownFileName}) {
    const src = fs.readFileSync(path.join(parentPath, markdownFileName), {encoding: "UTF-8"})
    const slides = showSlides(extractSlides(src))
    return {fileName: markdownFileName, slides: slides}
}

function renderHTML({fileName, slides}) {
    let htmlFileName = `${fileName.substring(0, fileName.lastIndexOf('.'))}.html`

    return {fileName: htmlFileName, html: compiled({slides: slides.join('\n')})}
}

function writeHTML({fileName, html}) {
    fs.writeFileSync(`dest/${fileName}`, html)
}

main('src')