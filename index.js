const fs = require("fs")
const _ = require("lodash")
const extractSlides = require("./scripts/extract_slides.js")
const showSlides = require("./scripts/show_slides.js")

function readMarkdowns(path) {
    return fs.readdirSync(path)
}

function renderHTML(markdown) {
    const src = fs.readFileSync(`./src/${markdown}`, {encoding: "UTF-8"})
    const slides = showSlides(extractSlides(src))
    
    const template = fs.readFileSync("./index.tpl", {encoding: "UTF-8"})
    const t = _.template(template)

    let name = markdown.split('.')[0]
    return {name: name, html: t({slides: slides.join('\n')})}
}

function writeHTML({name, html}) {
    fs.writeFileSync(`dest/${name}.html`, html)
}

function main() {
    readMarkdowns('src')
    .map(renderHTML)
    .forEach(writeHTML)
}

main()