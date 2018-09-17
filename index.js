const fs = require("fs")
const _ = require("lodash")
const extractSlides = require("./src/extract_slides.js")
const showSlides = require("./src/show_slides.js")

const src = fs.readFileSync("./slides.md", {encoding: "UTF-8"})
const slides = showSlides(extractSlides(src))

const template = fs.readFileSync("./index.tpl", {encoding: "UTF-8"})
const t = _.template(template)

const html = t({slides: slides.join("\n")})

fs.writeFileSync("index.html", html, {encoding: "UTF-8"})
