const fs = require("fs")
const debug = require("debug")("slides")
const fsEx = require('fs-extra');
const path = require("path")
const _ = require("lodash")
const extractSlides = require("./scripts/extract_slides.js")
const showSlides = require("./scripts/show_slides.js")

const compiledIndex = _.template(fs.readFileSync("./index.tpl", {encoding: "UTF-8"}))
const compiled = _.template(fs.readFileSync("./slides.tpl", {encoding: "UTF-8"}))

async function main(src) {
    await link('lib', 'build/lib')
    let list = readMarkdowns(src)
        .map(toSlides)
        .map(renderHTML)
        .map(writeHTML)
        .map(toIndex)

    writeIndexPage(list)
}

function writeIndexPage(list) {
    let indexes = compiledIndex({list: list.join('\n')})
    writeHTML({fileName: 'index.html', html: indexes})
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
    fs.writeFileSync(`build/${fileName}`, html)
    return fileName
}

function toIndex(fileName) {
    return `<li><a href='./${fileName}'>${fileName}</a></li>`
}


async function link(lib, dest) {
    await fsEx.ensureDir(dest)
    console.log(`ensure dir: ${dest}`)
    await fsEx.copy(lib, dest)
    console.log(`copy from ${lib} to ${dest}`)
}

main('src')
