const _ = require('lodash');

function showSlides(slides) {
    sections = []

    _.forEach(slides, function(slide) {
        let {title, subtitle, backgroundImage, bodies, tables, videos, images, notes} = slide
        var sectionArray = [];

        sectionArray.push("<section class='slide'>")
        sectionArray.push(titlize(title))
        sectionArray.push(subtitlize(subtitle))
        sectionArray.push(_.map(bodies, (body) => bodize(body)).join("\n"))
        sectionArray.push("</section>")

        sections.push(sectionArray.join("\n"))
    })

    return sections;
}

function titlize(title) {
    const c = _.template("<h2><%- value %></h2>")
    return html(c, title)
}

function subtitlize(subtitle) {
    const c = _.template("<h3><%- value %></h3>")
    return html(c, subtitle)
}

function bodize(body) {
    let {rawText, listMarkers} = body
    let head = 0, last = rawText.length - 1, listOfHTML = [], bodyStr = ""

    if(!_.isEmpty(listMarkers)) {
        head = _.head(listMarkers).start
        last = _.last(listMarkers).end
        listOfHTML = _.map(listMarkers, function(listMaker) {
            let {start, end, type} = listMaker

            let textList = rawText.substring(start, end).trim().split("\n")

            let list = _.map(textList, (text) => `<li>${text}</li>`).join('\n')

            if(type === "ordered") {
                return `<ol>${list}</ol>`
            } else {
                return `<ul>${list}</ul>`
            }
        }).join('\n');
       
        bodyStr += beforeList(head, rawText)

        bodyStr += listOfHTML

        bodyStr += afterList(last, rawText)

    } else { // only paragraph
        let p = rawText.trim()
        bodyStr = `<p>${p}</p>`
    }

return bodyStr
}

function beforeList(head, text) {
    let body = ""
    if(head > 0) {
        let p = text.substring(0, head).trim() 
        body = `<p>${p}</p>`
    }
    return body
}

function afterList(last, text) {
    let body = ""
    if(last < text.length - 1) {
        let p = text.substring(last).trim() 
        body = `<p>${p}</p>`
    }

    return body
}


function html(c, value) {
    if(value) {
        return c({'value': value.rawText}) 
    }
    return ""
}

module.exports = showSlides;
