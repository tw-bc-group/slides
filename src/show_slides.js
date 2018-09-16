const _ = require('lodash');

function showSlides(slides) {
    sections = []

    _.forEach(slides, function(slide) {
        let {title, subtitle, backgroundImage, bodies, tables, videos, images, notes} = slide
        var sectionArray = [];

        sectionArray.push("<section class='slide'>")
        sectionArray.push(titlize(title))
        sectionArray.push(subtitlize(subtitle))
        sectionArray.push(_.map(bodies, function(body) { return bodize(body) }).join("\n"))
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
    let head = 0, last = rawText.length - 1, listOfHTML = []

    if(!_.isEmpty(listMarkers)) {
        head = _.head(listMarkers).start
        last = _.last(listMarkers).end
        listOfHTML = _.map(listMarkers, function(listMaker) {
           let {start, end, type} = listMaker

           let textList = rawText.substring(start, end).trim().split("\n")

           let listOfHTML = _.map(textList, function(text) {
               return "<li>" + text + "</li>"
           })

           if(type === "ordered") {
               return ("<ol>" + listOfHTML.join("\n") +"</ol>")
           } else {
               return ("<ul>" + listOfHTML.join("\n") +"</ul>")
           }
       })
    }

    let result = ""
    if(head > 0) {
        result += "<p>" + rawText.substring(0, head).trim() + "</p>\n"
    }

    result += listOfHTML.join('\n')

    if(last < rawText.length - 1) {
        result += "<p>" + rawText.substring(last).trim() + "</p>"
    }

    if(head == 0 && last == rawText.length - 1) {
        result = "<p>"+rawText.trim()+"</p>"
    }

    return result
}


function html(c, value) {
    if(value) {
        return c({'value': value.rawText}) 
    }
    return ""
}

module.exports = showSlides;
