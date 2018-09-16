const fs = require("fs")
const _ = require("lodash")
const ex = require("./src/extract_slides.js")
const showSlides = require("./src/show_slides.js")

const json = showSlides(ex(fs.readFileSync("./slides.md", {encoding: "UTF-8"})))
const t = _.template(fs.readFileSync("./index.html", {encoding: "UTF-8"}))
console.log(t({slides: json.join("\n")}))
