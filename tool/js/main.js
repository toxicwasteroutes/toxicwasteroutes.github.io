var width = document.documentElement.clientWidth - 5,
    height = document.documentElement.clientHeight - 5,
    padding = 6,
    proportion = height / 15,
    
    projection = d3.geo.mercator()
    .scale((width + 1) / 2 / Math.PI)
    .translate([width / 2, height / 2 + 160])
    .precision(0.1),
    
    path = d3.geo.path()
    .projection(projection),
    
    force = d3.layout.force()
    .charge(0)
    .gravity(0)
    .friction(0.1)
    .size([width, height]),
    
    div = d3.select("body").append("div")
    .attr("class", "treemaps")
    .style({
        height: height + "px",
        width: width + "px"
    }),
    
    svg = d3.select("body").append("svg")
    .attr({
        class: "vizualization",
        height: height,
        "shape-rendering": "geometricPrecision",
        width: width
    }),
    
    g = svg.append("g").attr("class", "map"),
    
    baselCategories = [{code: "Y_", label: "Unspecified"}, {code: "Unknown", label: "Unspecified"}, {code: "AN8", label: "Unspecified"}, {code: "11b", label: "Unspecified"}, {code: "Y1", label: "Clinical wastes from medical care in hospitals, medical centers and clinics"}, {code: "Y2", label: "Wastes from the production and preparation of pharmaceutical products"}, {code: "Y3", label: "Waste pharmaceuticals, drugs and medicines"}, {code: "Y4", label: "Wastes from the production, formulation and use of biocides and phytopharmaceuticals"}, {code: "Y5", label: "Wastes from the manufacture, formulation and use of wood preserving chemicals"}, {code: "Y6", label: "Wastes from the production, formulation and use of organic solvents"}, {code: "Y7", label: "Wastes from heat treatment and tempering operations containing cyanides"}, {code: "Y8", label: "Waste mineral oils unfit for their originally intended use"}, {code: "Y9", label: "Waste oils/water, hydrocarbons/water mixtures, emulsions"}, {code: "Y10", label: "Waste substances and articles containing or contaminated with polychlorinated biphenyls (PCBs) and/or polychlorinated terphenyls (PCTs) and/or polybrominated biphenyls (PBBs)"}, {code: "Y11", label: "Waste tarry residues arising from refining, distillation and any pyrolytic treatment"}, {code: "Y12", label: "Wastes from production, formulation and use of inks, dyes, pigments, paints, lacquers, varnish"}, {code: "Y13", label: "Wastes from production, formulation and use of resins, latex, plasticizers, glues/adhesives"}, {code: "Y14", label: "Waste chemical substances arising from research and development or teaching activities which are not identified  and/or are new and whose effects on man and/or the environment are not known"}, {code: "Y15", label: "Wastes of an explosive nature not subject to other legislation"}, {code: "Y16", label: "Wastes from production, formulation and use of photographic chemicals and processing materials"}, {code: "Y17", label: "Wastes resulting from surface treatment of metals and plastics"}, {code: "Y18", label: "Residues arising from industrial waste disposal operations"}, {code: "Y19", label: "Metal carbonyls"}, {code: "Y20", label: "Beryllium or beryllium compounds"}, {code: "Y21", label: "Hexavalent chromium compounds"}, {code: "Y22", label: "Copper compounds"}, {code: "Y23", label: "Zinc compounds"}, {code: "Y24", label: "Arsenic or arsenic compounds"}, {code: "Y25", label: "Selenium or selenium compounds"}, {code: "Y26", label: "Cadmium or cadmium compounds"}, {code: "Y27", label: "Antimony or antimony compounds"}, {code: "Y28", label: "Tellurium or tellurium compounds"}, {code: "Y29", label: "Mercury or mercury compounds"}, {code: "Y30", label: "Thallium or thallium compounds"}, {code: "Y31", label: "Lead or lead compounds"}, {code: "Y32", label: "Inorganic fluorine compounds excluding calcium fluoride"}, {code: "Y33", label: "Inorganic cyanides"}, {code: "Y34", label: "Acidic solutions or acids in solid form"}, {code: "Y35", label: "Basic solutions or bases in solid form"}, {code: "Y36", label: "Asbestos (dust and fibres)"}, {code: "Y37", label: "Organic phosphorus compounds"}, {code: "Y38", label: "Organic cyanides"}, {code: "Y39", label: "Phenols; phenol compounds including chlorophenols"}, {code: "Y40", label: "Ethers"}, {code: "Y41", label: "Halogenated organic solvents"}, {code: "Y42", label: "Organic solvents excluding halogenated solvents"}, {code: "Y43", label: "Any congenor of polychlorinated dibenzo-furan"}, {code: "Y44", label: "Any congenor of polychlorinated dibenzo-p-dioxin"}, {code: "Y45", label: "Organohalogen compounds other than substances referred to in the other categories"}, {code: "Y46", label: "Wastes collected from households"}, {code: "Y47", label: "Residues arising from the incineration of household wastes"}],
    years = [2007, 2008, 2009, 2010, 2011, 2012, 2013],
    filter = null,
    reportColor = "#3AAED6",
    importColor = "#FF9F00",
    exportColor = "#AA2727";

queue()
    .defer(d3.json, "data/world-50m.json")
    .defer(d3.json, "data/coordinates.json")
    .defer(d3.json, "data/movements.json")
    .await(loaded);

function loaded(error, world, points, movements) {
    if (error) throw error;

    //create the world map
    g.append("path")
        .datum(topojson.feature(world, world.objects.land))
        .attr("d", path)
        .attr("class", "boundary")
        .transition()
        .duration(1000)
        .style("opacity", 1);
    g.append("path")
        .datum(topojson.mesh(world, world.objects.countries, function (a, b) {
            return a !== b;
        }))
        .attr("class", "boundary")
        .attr("d", path)
        .transition()
        .duration(1000)
        .style("opacity", 1);

    //transform object into an array
    var countriesCoords = d3.entries(points.coords),
        dimensions = 2.5,
        year = 6,
        fullShown = false,
        interaction = false,
        overlay = false,
        firstTime = true;

    //attach data to country elements
    var nodes = countriesCoords.map(function (d) {
        var point = projection([d.value.long, d.value.lat]),
            party = d.value.party,
            report = d.value.report,
            tag = d.value.countryCode,
            fullName = d.value.name,
            oecd = d.value.oecd,
            country = d.key;
        return {
            x: point[0],
            y: point[1],
            x0: point[0],
            y0: point[1],
            r: dimensions,
            label: tag,
            party: party,
            report: report,
            fullName: fullName,
            oecd: oecd,
            country: country
        };
    });

    function country(d) {
        return d.country;
    }

    //plot svg group
    var countryData = svg.append("g").attr("class", "countries")
        .selectAll("g")
        .data(nodes, country);

    var countryDataDiv = div.selectAll("div")
        .data(nodes, country)
        .enter()
        .append("div")
        .attr("class", function (d) {
            return "treemap " + d.country;
        });

    var countryDataDivText = div.selectAll("div.name")
        .data(nodes, country)
        .enter()
        .append("div")
        .attr("class", function (d) {
            return "name " + d.country;
        });

    var countries = countryData.enter()
        .append("g")
        .attr("class", function (d) {
            return "country " + d.country;
        });

    var node = countries.append("rect")
        .attr({
            class: "country-square",
            height: function (d) {
                return d.r * 2;
            },
            width: function (d) {
                return d.r * 2;
            }
        });

    var label = countryDataDivText.append("p")
        .attr("class", "country-text map-text")
        .text(function (d) {
            return d.label;
        })
        .on("mouseenter", function (d) {
            showName(d)
        })
        .on("mouseleave", function (d) {
            showName(d)
        })
        .on("click", function (d) {
            isolateCountry(d)
        });

    var treemapContainer = countryDataDiv.style({
            height: function (d) {
                return d.r * 2 + "px";
            },
            width: function (d) {
                return d.r * 2 + "px";
            }
        })
        .on("mouseenter", function (d) {
            showName(d)
        })
        .on("mouseleave", function (d) {
            showName(d)
        })
        .on("click", function (d) {
            isolateCountry(d)
        });


    //force managers
    force
        .nodes(nodes)
        .on("tick", tick)
        .start();

    function tick(e) {
        //count++;
        /*if(count % 50 == 0) {
            console.log("ticking",count);
        }*/
        node.each(gravity(e.alpha * 0.1))
            .each(collide(0.15))
            .attr({
                x: function (d) {
                    return d.x - d.r;
                },
                y: function (d) {
                    return d.y - d.r;
                }
            });
        label.each(gravity(e.alpha * 0.1))
            .each(collide(0.15))
            .style({
                left: function (d) {
                    return (d.x - d.r - 1) + "px";
                },
                top: function (d) {
                    return (d.y - d.r - 12) + "px";
                }
            });
        treemapContainer.each(gravity(e.alpha * 0.1))
            .each(collide(0.15))
            .style({
                left: function (d) {
                    return (d.x - d.r) + "px";
                },
                top: function (d) {
                    return (d.y - d.r) + "px";
                }
            });
    }

    function gravity(k) {
        return function (d) {
            d.x += (d.x0 - d.x) * k;
            d.y += (d.y0 - d.y) * k;
        };
    }

    function collide(k) {
        var q = d3.geom.quadtree(nodes);
        return function (node) {
            var nr = node.r + padding,
                nx1 = node.x - nr,
                nx2 = node.x + nr,
                ny1 = node.y - nr,
                ny2 = node.y + nr;
            q.visit(function (quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== node)) {
                    var x = node.x - quad.point.x,
                        y = node.y - quad.point.y,
                        lx = Math.abs(x),
                        ly = Math.abs(y),
                        r = nr + quad.point.r;
                    if (lx < r && ly < r) {
                        if (lx > ly) {
                            lx = (lx - r) * (x < 0 ? -k : k);
                            node.x -= lx;
                            quad.point.x += lx;
                        } else {
                            ly = (ly - r) * (y < 0 ? -k : k);
                            node.y -= ly;
                            quad.point.y += ly;
                        }
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    //plotting countries
    node.transition()
        .delay(function (d, i) {
            return 2000 + i * 20;
        })
        .attr("class", "country-square visible")
        .call(endall, function () {
            //create first info box
            var box = d3.select("body").append("div")
                .attr("class", "box")
                .style({
                    top: height / 3 + "px",
                    left: width * (3 / 12) + "px",
                    width: 348 + "px"
                });

            box.append("p")
                .text("The exact size of the global waste trade is unknown. The most comprehensive mechanism monitoring the cross-border movements of hazardous waste is a UN treaty known as the Basel Convention. ")
                .attr("class", "legend-text");

            var next = box.append("i")
                .attr("class", "fa fa-angle-right next");

            box.transition()
                .delay(500)
                .attr("class", "box visible");

            next.on("click", getParties);
        });

    label.transition()
        .delay(function (d, i) {
            return 2000 + i * 20;
        })
        .attr("class", "country-text map-text visible");

    //listening for the end of transitions
    function endall(transition, callback) {
        var n = 0;
        transition
            .each(function () {
                ++n;
            })
            .each("end", function () {
                if (!--n) callback.apply(this, arguments);
            });
    }

    //create second info box
    function getParties() {
        d3.select(".box")
            .transition()
            .duration(500)
            .attr("class", "box")
            .remove();

        //color the needed nodes and labels
        node.transition()
            .delay(500)
            .style("fill", function (d) {
                if (!d.party[year]) {
                    return "#95A0A0";
                }
            });

        label.attr("class", function(d){
                if(!d.party[year]){
                    return "country-text map-text visible non-party";
                } else {
                    return "country-text map-text visible";
                }
            })
            .transition()
            .delay(500)
            .style("color", function (d) {
                if (!d.party[year]) {
                    return "#95A0A0";
                }
            });

        //generate second info box
        var box = d3.select("body").append("div")
            .attr("class", "box")
            .style({
                top: height / 3 + "px",
                left: width * (3 / 12) + "px",
                width: 364 + "px"
            });

        box.append("p")
            .html("Not all countries take part in the Convention. <br/>The U.S. - among the world’s largest generators of hazardous waste - has never ratified it. Currently, <br/>the treaty is in force in 182 of the 195 sovereign states recognized worldwide.")
            .attr("class", "legend-text");

        var boxItem = box.selectAll("div")
            .data([{
                "key": "MT",
                "label": "was Party",
                "party": true,
                "year": ["2007", "2008", "2009", "2010", "2011", "2012", "2013"]
                    }, {
                "key": "US",
                "label": "was Non-Party",
                "party": false,
                "year": ["2007", "2008", "2009", "2010", "2011", "2012", "2013"]
                    }])
            .enter()
            .append("div");

        var boxSvg = boxItem.append("svg")
            .attr({
                height: 20,
                "shape-rendering": "geometricPrecision",
                width: 17
            });

        boxSvg.append("rect")
            .attr({
                x: 1,
                y: 14,
                height: 6,
                width: 6
            })
            .style("fill", function (d) {
                if (!d.party) {
                    return "#95A0A0";
                } else {
                    return "#212121";
                }
            });
        boxSvg.append("text")
            .attr({
                class: "map-text",
                x: 0,
                y: 12
            })
            .text(function (d) {
                return d.key;
            })
            .style("fill", function (d) {
                if (!d.party) {
                    return "#95A0A0";
                } else {
                    return "#212121";
                }
            });

        boxItem.append("span")
            .attr("class", "legend-text")
            .text(function (d) {
                return d.label;
            });

        var next = box.append("i")
            .attr("class", "fa fa-angle-right next");

        box.transition()
            .delay(1000)
            .attr("class", "box visible");

        next.on("click", getReports);

        //generate legend
        var legend = d3.select("body").append("div")
            .attr("class", "legend")
            .style({
                height: 26 + "px",
                width: 309 + "px"
            });

        var legendItem = legend.selectAll("div")
            .data([{
                "key": "MT",
                "label": "was Party in ",
                "party": true,
                "year": ["2007", "2008", "2009", "2010", "2011", "2012", "2013"]
                    }, {
                "key": "US",
                "label": "was Non-Party in ",
                "party": false,
                "year": ["2007", "2008", "2009", "2010", "2011", "2012", "2013"]
                    }])
            .enter()
            .append("div");

        var legendSvg = legendItem.append("svg")
            .attr({
                height: 20,
                "shape-rendering": "geometricPrecision",
                width: 17
            });

        legendSvg.append("rect")
            .attr({
                x: 1,
                y: 14,
                height: 6,
                width: 6
            })
            .style("fill", function (d) {
                if (!d.party) {
                    return "#95A0A0";
                } else {
                    return "#212121";
                }
            });
        legendSvg.append("text")
            .attr({
                class: "map-text",
                x: 0,
                y: 12
            })
            .text(function (d) {
                return d.key;
            })
            .style("fill", function (d) {
                if (!d.party) {
                    return "#95A0A0";
                } else {
                    return "#212121";
                }
            });

        legendItem.append("span")
            .attr("class", "legend-text legend-copy")
            .text(function (d) {
                return d.label + d.year[year];
            });

        legend.transition()
            .delay(1000)
            .attr("class", "legend visible");
    }

    //create third info box
    function getReports() {
        d3.select(".box")
            .transition()
            .duration(500)
            .attr("class", "box")
            .remove();

        //color the needed nodes
        node.transition()
            .delay(500)
            .style({
                stroke: function (d) {
                    if (d.party[year]) {
                        if (!d.report[year]) {
                            return "#3AAED6";
                        }
                    }
                },
                "stroke-width": function (d) {
                    if (d.party[year]) {
                        if (!d.report[year]) {
                            return "2px";
                        }
                    }
                }
            });

        //generate third info box
        var box = d3.select("body").append("div")
            .attr("class", "box")
            .style({
                top: height / 3 + "px",
                left: width * (3 / 12) + "px",
                width: 398 + "px"
            });

        box.append("p")
            .html("Of these, fewer than 50% reports every year on the type and amount of hazardous wastes and other wastes they have exported and imported as recommended by the Convention.")
            .attr("class", "legend-text");

        var boxItem = box.append("div");

        boxItem.append("svg")
            .attr({
                height: 20,
                "shape-rendering": "geometricPrecision",
                width: 17
            })
            .append("rect")
            .attr({
                x: 1,
                y: 13,
                height: 6,
                width: 6
            })
            .style({
                fill: "none",
                stroke: "#3AAED6",
                "stroke-width": "1.5px"
            });

        boxItem.append("span")
            .attr("class", "legend-text")
            .text("did not report in 2013");

        var next = box.append("i")
            .attr("class", "fa fa-angle-right next");

        box.transition()
            .delay(1000)
            .attr("class", "box visible");

        next.on("click", getMovements);

        //update legend
        d3.select(".legend")
            .transition()
            .duration(500)
            .style({
                width: 472 + "px"
            });
        
        d3.select(".legend")
            .insert("div", ":first-child")
            .style({
                opacity: 0,
                width: 0 + "px"
            })
            .transition()
            .duration(499)
            .style({
                width: 163 + "px"
            })
            .call(endall, function() {
            
                var legend = d3.select(this);
            
                legend.append("svg")
                    .attr({
                        height: 20,
                        "shape-rendering": "geometricPrecision",
                        width: 17
                    })
                    .append("rect")
                    .attr({
                        x: 1,
                        y: 13,
                        height: 6,
                        width: 6
                    })
                    .style({
                        fill: "#eff4f5",
                        stroke: "#3AAED6",
                        "stroke-width": "1.5px"
                    });

                legend.append("span")
                    .attr("class", "legend-text legend-copy")
                    .text(function (d) {
                        return "did not report in 2013";
                    });

                legend.transition()
                    .delay(500)
                    .style("opacity", 1);
            });
    }

    //create last info box
    function getMovements() {
        d3.select(".box")
            .transition()
            .duration(500)
            .attr("class", "box")
            .remove();

        //generate fourth info box
        var box = d3.select("body").append("div")
            .attr("class", "box")
            .style({
                top: height / 3 + "px",
                left: width * (3 / 12) + "px",
                width: 406 + "px"
            });

        box.append("p")
            .html("In 1995 an amendment - known as the Ban Amendment - was adopted to stop exports of hazardous waste from member nations of the Organization for Economic Co-operation and Development (OECD), European Union, Liechtenstein and all other states. <br/>The amendment is not yet in force because it must be ratified by 10 more parties. Hazardous waste exports from more to less developed countries are still taking place.")
            .attr("class", "legend-text");

        var boxItem = box.selectAll("div")
            .data([{
                "key": "Export",
                "color": "#AA2727"
                    }, {
                "key": "Import",
                "color": "#FF9F00"
                    }])
            .enter()
            .append("div");

        boxItem.append("svg")
            .attr({
                height: 20,
                "shape-rendering": "geometricPrecision",
                width: 17
            }).append("rect")
            .attr({
                //x: 1,
                //y: 14,
                //height: 6,
                //width: 6
                x: 3,
                y: 12,
                rx: 4,
                ry: 4,
                height: 8,
                width: 8
            })
            .style("fill", function (d) {
                return d.color;
            });

        boxItem.append("span")
            .attr("class", "legend-text")
            .text(function (d) {
                return d.key;
            });

        var next = box.append("i")
            .attr("class", "next")
            .text("explore")
            .style({
                "font-size": 1.1 + "em",
                "font-weight": 700,
                "letter-spacing": 0.4 + "px",
                "margin-top": 10 + "px"
            });

        box.transition()
            .delay(1000)
            .attr("class", "box visible");

        next.on("click", startAnimation);

        //update legend
        d3.select(".legend")
            .transition()
            .duration(500)
            .style({
                width: 639 + "px"
            });
        
        var legend = d3.select(".legend");

        legend.selectAll("div.movements")
            .data([{
                "key": "Import",
                "color": "#FF9F00"
                    }, {
                "key": "Export",
                "color": "#AA2727"
                    }])
            .enter()
            .insert("div", ":first-child")
            .attr("class", "movements")
            .style({
                opacity: 0,
                width: 0 + "px"
            })
            .transition()
            .duration(499)
            .style({
                width: function(d,i){
                    return i == 0 ? 84 + "px" : 83 + "px";
                }
            })
            .call(endall, function(){
                var legendItem = d3.selectAll(".movements")
                    .each(function(d){
                        var item = d3.select(this);
                        
                        item.append("svg")
                            .attr({
                                height: 20,
                                "shape-rendering": "geometricPrecision",
                                width: 17
                            })
                            .append("rect")
                            .attr({
                                //x: 1,
                                //y: 13,
                                //height: 6,
                                //width: 6
                                x: 3,
                                y: 12,
                                rx: 4,
                                ry: 4,
                                height: 8,
                                width: 8
                            })
                            .style("fill", function (d) {
                                return d.color;
                            });

                        item.append("span")
                            .attr("class", "legend-text")
                            .text(function (d) {
                                return d.key;
                            });
                    });

                legendItem.transition()
                    .delay(500)
                    .style("opacity", 1);
            });
    }
    
    //remove map and last info box, start animation sequence
    function startAnimation() {
        //remove last info box and map
        d3.select(".box")
            .transition()
            .duration(500)
            .attr("class", "box")
            .remove();
        d3.select(".map")
            .transition()
            .duration(1000)
            .style("opacity", 0)
            .remove();

        //animation
        updateCountries();
        if(firstTime){
            firstTime != firstTime;
            setTimeout(showFilters(), 5000);
        }
    }

    //update countries' position and dimensions
    function updateCountries() {
        var countryList = movements.dataset[year].movements,
            amountRange = [],
            max,
            min,
            counter = 0;

        padding = 10;
        force.start();

        countryList.forEach(function (d) {
            if(filter != null) {
                d.filterTotal = updateTotal(d);
            }
            else {
                d.filterTotal = d.total;
            }
            amountRange.push(d.filterTotal);
        })
        
        //update total according to filter
        function updateTotal(d){
            var tot = 0;
            d.connections.forEach(function(e){
                e.partners.forEach(function(f){
                    f.subdivisions.forEach(function(g){
                        if(g.category.indexOf(filter) > -1){
                            tot +=g.amount;
                        }
                    })
                })
            });
            return tot;
        }

        var side = d3.scale.sqrt()
            .domain([0, d3.max(amountRange)])
            .range([4, proportion]),
            rexp = /(.*)\d{4}/;
        
        d3.selectAll(".cell")
            .remove();
        
        d3.selectAll(".legend-copy")
            .each(function(d) {
                var legendText = d3.select(this)
                    .text(),
                    newYear = legendText.replace(rexp, "$1 " + years[year]);
            
                d3.select(this)
                    .text(newYear);
            });

        node.each(function (d, i) {
            var country = d.country,
                report = d.report[year],
                party = d.party[year]
                match = countryList.find(function (d) {
                    return country == d.country;
                });

            if (typeof match != "undefined") {
                nodes[i].r = side(match.filterTotal);
                var newSize = nodes[i].r * 2,
                    treemap = d3.layout.treemap()
                    .size([newSize, newSize])
                    .children(function (d, depth) {
                        if (depth == 0) {
                            return d.connections;
                        } else if (depth == 1) {
                            return d.partners;
                        } else {
                            return d.subdivisions;
                        }
                    })
                    .value(function (d, depth) {
                        if (depth == 0) {
                            return d.total;
                        } else if (depth == 1) {
                            return d.subtotal;
                        } else if (depth == 2) {
                            return d.size;
                        } else {
                            var category = d.category;
                            if (filter == null){
                                return d.amount;
                            } else {
                                return category.indexOf(filter) > -1 ? d.amount : null;
                            }
                        }
                    })
                    .nodes(match);
            } else {
                nodes[i].r = 2.5;
            }
            
            d3.select(this)
                .attr({
                    height: 5,
                    width: 5
                });

            d3.select("div.treemap." + country)
                .style({
                    height: function (d) {
                        if (typeof match != "undefined") {
                            return newSize + "px";
                        } else {
                            return 5 + "px";
                        }
                    },
                    width: function (d) {
                        if (typeof match != "undefined") {
                            return newSize + "px";
                        } else {
                            return 5 + "px";
                        }
                    }
                });
            
            d3.select("div.name." + country + " p")
                .transition()
                .style({
                    color: function (d) {
                        if(party) {
                            return "#212121";
                        } else {
                            return "#95A0A0";
                        }
                    }
                });

            if (treemap) {
                var movementTreemp = d3.select("div.treemap." + country)
                    .selectAll("div")
                    .data(treemap)
                    .enter()
                    .append("div")
                    .attr("class", "cell")
                    .call(position)
                    .style({
                        "background-color": function (d) {
                            return !d.type ? "none" : d.type == "Export" ? "#aa2727" : "#ff9f00";
                        },
                        border: function(d) {
                            return d.area == 0 ? null : d.depth == 0 || d.depth == 1 ? "1px solid #212121" : !d.name ? null : "1px solid #212121";
                        }
                    });

                d3.select("div.treemap." + country)
                    .style({
                        transform: function () {
                            return "scale(" + 5 / newSize + ")"
                        },
                        "transform-origin": "0 0"
                    })
                    .transition()
                    /*.duration(function (d) {
                        if (typeof match != "undefined") {
                            return nodes[i].r * 240;
                        } else {
                            return 2000;
                        }
                    })*/
                    .duration(3000)
                    .style({
                        transform: "scale(1)"
                    })
            }
            
            d3.select(this)
                .transition()
                /*.duration(function (d) {
                    if (typeof match != "undefined") {
                        return nodes[i].r * 240;
                    } else {
                        return 2000;
                    }
                })*/
                .duration(3000)
                .attr({
                    height: function (d) {
                        if (typeof match != "undefined") {
                            var box = document.getElementsByClassName("treemap " + country)[0].firstChild.getBoundingClientRect();
                            return box.width <= 2 ? 5 : newSize;
                            //return newSize;
                        } else {
                            return 5;
                        }
                    },
                    width: function (d) {
                        if (typeof match != "undefined") {
                            var box = document.getElementsByClassName("treemap " + country)[0].firstChild.getBoundingClientRect();
                            return box.width <= 2 ? 5 : newSize;
                            //return newSize;
                        } else {
                            return 5;
                        }
                    }
                })
                .style({
                    fill: function(d){
                        if (typeof match != "undefined") {
                            var box = document.getElementsByClassName("treemap " + country)[0].firstChild.getBoundingClientRect();
                            return box.width <= 2 ? "#212121" : "transparent";
                            //return "transparent";
                        } else if(party) {
                            return "#212121";
                        } else {
                            return "#95A0A0";
                        }
                    },
                    stroke: function(d){
                        if(party){
                            if(!report) {
                                return "#3AAED6";
                            } else {
                                return null;
                            }
                        }
                    },
                    "stroke-width": function (d) {
                        if (party) {
                            if (!report) {
                                if (typeof match != "undefined") {
                                    var box = document.getElementsByClassName("treemap " + country)[0].firstChild.getBoundingClientRect();
                                    return box.width <= 2 ? "2px" : "6px";
                                    //return "6px";
                                } else {
                                    return "2px";
                                }
                            }
                        }
                    }
                });

            counter++;
            if (counter == countryList.length) {
                //setTimeout(moveDots, 1500);
                interaction = true;
            }
        });
    }
    
    //determine relative position for treemaps cells
    function position() {
        this.style("left", function (d) {
                return d.x + "px";
            })
            .style("top", function (d) {
                return d.y + "px";
            })
            .style("width", function (d) {
                return Math.max(0, d.dx - 1) + "px";
            })
            .style("height", function (d) {
                return Math.max(0, d.dy - 1) + "px";
            });
    }

    //move cargos between nations
    function moveDots() {
        //create groups to contain cargos
        var gAnimation = svg.insert("g", [".countries"]).attr("class", "animation");

        var sourceNode = gAnimation.selectAll("g")
            .data(movements.dataset[year].movements)
            .enter()
            .append("g")
            .attr("class", function (d) {
                return d.country;
            })
            .each(function (d) {
                //subdivide groups based on the target country
                var source = d.country,
                    filtered = d.connections.filter(function (d) {
                        if (d.type == "Export") {
                            return true;
                        } else {
                            return false;
                        }
                    });

                if (filtered.length !== 0) {
                    d3.select(this).selectAll("g")
                        .data(filtered[0].partners)
                        .enter()
                        .append("g")
                        .attr("class", function (d) {
                            return d.name;
                        })
                        .each(function (d) {
                            //create individual cargos and move them to their final position
                            var target = d.name,
                                sourceCoordX = d3.select("g.country." + source + " rect").attr("x"),
                                sourceCoordY = d3.select("g.country." + source + " rect").attr("y"),
                                targetCoordX = d3.select("g.country." + target + " rect").attr("x"),
                                targetCoordY = d3.select("g.country." + target + " rect").attr("y"),
                                cargos = Math.floor(d.size / 5000) < 1 ? 1 : Math.floor(d.size / 5000),
                                cargoArray = [];

                            for (i = 0; i < cargos; i++) {
                                cargoArray.push({
                                    "x0": sourceCoordX,
                                    "y0": sourceCoordY,
                                    "x": targetCoordX,
                                    "y": targetCoordY,
                                    "source": source,
                                    "target": target
                                });
                            }

                            d3.select(this).selectAll("rect")
                                .data(cargoArray)
                                .enter()
                                .append("rect")
                                .attr({
                                    class: "cargo",
                                    height: 4,
                                    width: 4,
                                    x: function (d) {
                                        return d.x0;
                                    },
                                    y: function (d) {
                                        return d.y0;
                                    }
                                })
                                .transition()
                                .delay(function (d, i) {
                                    return i * 50;
                                })
                                .duration(2000)
                                .attr({
                                    x: function (d) {
                                        return d.x;
                                    },
                                    y: function (d) {
                                        return d.y;
                                    }
                                })
                                .remove();
                        });
                }
            });
    }

    //show full country name instead of Country Code
    function showName(d) {
        var text = d3.select("div.name." + d.country + " p"),
            newText = fullShown ? d.label : d.fullName;

        text.text(function (d) {
                return newText;
            })
            .style({
                "background-color": function (d) {
                    return !fullShown ? "#eff4f5" : "transparent";
                },
                "z-index": function (d) {
                    return !fullShown ? 999 : null;
                }
            });

        fullShown = !fullShown;
    }
    
    //show tooltip of category
    function showTooltip(d) {
        var categoriesCode = d.category.split(", "),
            categoriesArray = [],
            category = "",
            amount = d.amount,
            partner = d.parent.name,
            type = d.parent.parent.type,
            tooltip = d3.select("div.modal-label")
            .append("div")
            .attr("class", "tooltip");
        
        //match category code with description
        categoriesCode.forEach(function(code){
            var match = baselCategories.find(function(d){
                return code == d.code;
            })
            categoriesArray.push(match.label);
        })
        
        //get full name for partner
        var findName = countriesCoords.find(function(d){
                return partner == d.key;
            });
        if(findName){
            var fullName = findName.value.name;
        }    
        
        //console.log(fullName);
        
        tooltip.append("p")
            .attr("class", "tooltip-title tooltip-copy legend-text")
            .text("Category");
        tooltip.append("p")
            .attr("class", "tooltip-text tooltip-copy map-text")
            .text(function(d){
                categoriesArray.forEach(function(label, j){
                    if(j < categoriesArray.length -1) {
                        category += label + ", ";
                    } else {
                        category += label;
                    }   
                })
                return category;
            });
        
        tooltip.append("p")
            .attr("class", "tooltip-title tooltip-copy legend-text")
            .text(function(d){
                if(type == "Import") {
                    return "Imported from";
                } else {
                    return "Exported to";
                }
            });
        tooltip.append("p")
            .attr("class", "tooltip-text tooltip-copy map-text")
            .text(function(d){
                return fullName? fullName: "Unknown";
            });
        
        tooltip.append("p")
            .attr("class", "tooltip-title tooltip-copy legend-text")
            .text("Amount");
        tooltip.append("p")
            .attr("class", "tooltip-text tooltip-copy map-text")
            .text(function(d){
                var re = /(\d)(?=(\d{3})+$)/g;
                    
                function formatNumbers(amount) {
                    var splitDecimal = amount.toString().split(".");
                    if(splitDecimal.length == 2){
                        return splitDecimal[0].replace(re, "$1,") + "." + splitDecimal[1];
                    } else {
                        return splitDecimal[0].replace(re, "$1,")
                    }   
                }
            
                return formatNumbers(amount) + " t";
            });
    }
    
    //show filter box
    function showFilters() {
        var filterBox = d3.select("body").append("div")
            .attr("class", "box filter-box");

        filterBox.append("p")
            .text("Timeline")
            .attr("class", "legend-text filter-title");
        
        var filterFlex = filterBox.append("div")
            .attr("class", "filter-flex");
        
        for(var j = 0; j < 7; j++){
            if(j==6){
                var timelineDiv = filterFlex.append("div")
                    .attr("class", "filter-time text-active");
                timelineDiv.append("div")
                    .attr("class", "filter-line");
                timelineDiv.append("p")
                    .attr("class", "filter-year map-text")
                    .text(function(d){
                        return years[j];
                    });
                filterFlex.append("div")
                    .attr("class", "filter-circle flex-active")
                    .attr("id", function(d){return j});
            } else {
                var timelineDiv = filterFlex.append("div")
                    .attr("class", "filter-time");
                timelineDiv.append("div")
                    .attr("class", "filter-line");
                timelineDiv.append("p")
                    .attr("class", "filter-year map-text")
                    .text(function(d){
                        return years[j];
                    });
                filterFlex.append("div")
                    .attr("class", "filter-circle")
                    .attr("id", function(d){return j});
            }   
        }
        
        var timelineDiv = filterFlex.append("div")
                .attr("class", "filter-time");
            timelineDiv.append("div")
                .attr("class", "filter-line");
            timelineDiv.append("p")

        filterBox.transition()
            .delay(500)
            .attr("class", "box filter-box visible");
        
        d3.selectAll(".filter-circle")
            .on("click", function(){
                d3.selectAll(".filter-circle")
                    .attr("class", "filter-circle");
                d3.selectAll(".filter-time")
                    .attr("class", "filter-time");
                d3.select(this)
                    .attr("class", "filter-circle flex-active");
                d3.select(this.previousSibling)
                    .attr("class", "filter-time text-active");
            });
        
        filterBox.append("p")
            .text("Category")
            .attr("class", "legend-text filter-title");
        
        var filterSelect = filterBox.append("select")
            .attr("class", "filter-select map-text");
        
        filterSelect.append("option")
            .attr({
                label: "All",
                selected: true,
                value: "All"
            })
            .text("All");
        
        filterSelect.selectAll("option.categories")
            .data(baselCategories.filter(function(d){
                if (d.code == "Unknown" || d.code == "AN8" || d.code == "11b") {
                    return false;
                } else {
                    return true;
                }
            }))
            .enter()
            .append("option")
            .attr({
                class: "categories",
                label: function(d){
                    return d.label;
                },
                value: function(d) {
                    return d.code;
                }
            })
            .text(function(d){
                return d.label;
            })
            /*.append("span")
            .attr({
                class: "filter-tooltip"
            })
            .text(function(d){
                return d.label;
            })*/;
        
        filterBox.append("a")
            .attr({
                class: "map-text filter-button"
            })
            .text("Apply filters")
            .on("click", function(){
                year = parseInt(d3.select(".flex-active").attr("id"));
                filter = d3.select(".filter-select :checked").attr("value") == "All" ? null : d3.select(".filter-select :checked").attr("value");
                updateCountries();
            });
    }

    //isolate country on click
    function isolateCountry(d) {
        if (interaction) {
            if(!overlay){
                console.log(d);
                var country = d.country,
                    fullName = d.fullName,
                    label = d.label,
                    report = d.report[year],
                    party = d.party[year],
                    oecd = d.oecd,
                    //get data from movements
                    countryList = movements.dataset[year].movements,
                    //check if the treemap is empty
                    children = d3.select(".treemap." + country + " .cell").empty(),
                    //store data into variable
                    match = countryList.find(function (d) {
                        return country == d.country;
                    }),
                    exportArray = [],
                    importArray = [],
                    totalExport = 0,
                    totalImport = 0;

                //console.log(match);
                overlay = !overlay;

                //create overlay to isolate selection
                d3.select("body").append("div")
                    .attr("class", "overlay")
                    //remove everything when user clicks away
                    .on("click", function(){
                        d3.select(this).remove();
                        d3.select(".modal").remove();
                        overlay = !overlay;
                    });
                
                //create info modal
                var modalContainer = d3.select("body")
                    .append("div")
                    .datum(match)
                    .attr("class", "modal")
                    .style({
                        left: ((width - 800) / 2) + "px",
                        top: (Math.abs(height - 480) / 2) + "px"
                    }),
                    //append div with general infos    
                    modal = modalContainer.append("div")
                    .attr("class", "modal-label");
                
                modalContainer.append("div")
                    .attr("class", "modal-close")
                    .append("i")
                    .attr("class", "fa fa-times")
                    .on("click", function(){
                        d3.select(".overlay").remove();
                        d3.select(".modal").remove();
                        overlay = !overlay;
                    });
                
                modal.append("span")
                    .attr("class", "flag-icon flag-icon-" + label.toLowerCase());
                
                modal.append("p")
                    .text(fullName)
                    .attr("class", "modal-title legend-text");
                
                modal.append("p")
                    .text(function(d){
                        return oecd ? "OECD member" : "non-OECD";
                    })
                    .attr("class", "modal-subtitle legend-text");
                
                if(party) {
                    if (!report) {
                        modal.append("p")
                            .text("did not report in " + movements.dataset[year].year)
                            .attr("class", "modal-subtitle legend-text blue");
                    }
                } else {
                    modal.append("p")
                        .text("was not Party in " + movements.dataset[year].year)
                        .attr("class", "modal-subtitle legend-text grey");
                }
                
                //create arrays for line chart
                for(var j = 0; j < 7; j++) {
                    var list = movements.dataset[j].movements,
                        found = list.find(function (d) {
                        return country == d.country;
                        });
                    
                    if(found == undefined) {
                        importArray.push({x: years[j], y: 0});
                        exportArray.push({x: years[j], y: 0});
                    } else if(found.connections.length == 2) {
                        console.log(found.connections);
                        if(found.connections[0].type == "Import") {
                            importArray.push({x: years[j], y: Math.round(updateLineTotal(found.connections[0]))});
                            exportArray.push({x: years[j], y: Math.round(updateLineTotal(found.connections[1]))});
                        } else {
                            importArray.push({x: years[j], y: Math.round(updateLineTotal(found.connections[1]))});
                            exportArray.push({x: years[j], y: Math.round(updateLineTotal(found.connections[0]))});
                        }
                    } else {
                        console.log(found.connections);
                        if(found.connections[0].type == "Import") {
                            importArray.push({x: years[j], y: Math.round(updateLineTotal(found.connections[0]))});
                            exportArray.push({x: years[j], y: 0});
                        } else {
                            importArray.push({x: years[j], y: 0});
                            exportArray.push({x: years[j], y: Math.round(updateLineTotal(found.connections[0]))});
                        }
                    }
                };
                //
                //update total according to filter
                function updateLineTotal(e) {
                    var tot = 0;
                    if(filter != null){
                        e.partners.forEach(function (f) {
                            f.subdivisions.forEach(function (g) {
                                if (g.category.indexOf(filter) > -1) {
                                    tot += g.amount;
                                }
                            })
                        });
                    } else {
                        return e.subtotal;
                    }
                    return tot;
                }

                //draw line chart
                var svgWidth = 130,
                    svgHeight = 60,
                    modalSvg = modal.append("svg")
                    .attr({
                        class: "modal-svg",
                        height: svgHeight,
                        "shape-rendering": "geometricPrecision",
                        width: svgWidth
                    }),
                    x = d3.scale.linear()
                    .range([0, svgWidth])
                    .domain(d3.extent(importArray.concat(exportArray), function(d) { return d.x; })),
                    y = d3.scale.sqrt()
                    .range([svgHeight, 0])
                    .domain(d3.extent(importArray.concat(exportArray), function(d) { return d.y; })),
                    line = d3.svg.line()
                        .x(function(d) { return x(d.x); })
                        .y(function(d) { return y(d.y); }),
                    lineYear = d3.svg.line()
                        .x(function(d) { return x(d.x); })
                        .y(function(d,i) { return i == 0 ? y(d.y) + 6 : y(d.y) - 8; });
                
                modalSvg.append("path")
                    .datum(importArray)
                    .attr("class", "line line-imp")
                    .attr("d", line);
                
                modalSvg.append("path")
                    .datum(exportArray)
                    .attr("class", "line line-exp")
                    .attr("d", line);
                
                modalSvg.append("path")
                    .datum([{x: years[year], y: 0},{x: years[year], y: d3.max(importArray.concat(exportArray), function(d) { return d.y; })}])
                    .attr("class", "line line-year")
                    .attr("d", lineYear);
                
                modalSvg.append("text")
                    .attr({
                        class: "text-year map-text",
                        transform: "translate(" + (x(years[year]) - 2) + ", -12)"
                    })
                    .text(years[year]);
                
                
                //copy divs
                var modalDivLeft = modal.append("div")
                    .attr("class", "modal-left"),
                    modalDivRight = modal.append("div")
                    .attr("class", "modal-right");
                
                //append Import data
                modalDivLeft.append("i")
                    .attr({
                        class: "fa fa-angle-double-down",
                        "aria-hidden": true
                    });
                
                modalDivLeft.append("p")
                    .attr("class", "modal-copy yellow legend-text")
                    .text("Import");
                
                //append Export data
                modalDivRight.append("i")
                    .attr({
                        class: "fa fa-angle-double-up",
                        "aria-hidden": true
                    });
                
                modalDivRight.append("p")
                    .attr("class", "modal-copy red legend-text")
                    .text("Export");
                
                //append treemap div
                if(match != undefined) {
                    var modalTreemapContainer = modalContainer.append("div")
                        .attr("class", "modal-treemap"),
                        treemapDimensions = 450,
                        treemapPadding = 40,
                        modalTreemap = modalTreemapContainer.append("div")
                        .attr("class", "treemap-container")
                        .style({
                            height: treemapDimensions + "px",
                            margin: treemapPadding + "px", 
                            width: treemapDimensions + "px"
                        }),
                        treemap = d3.layout.treemap()
                        .size([treemapDimensions, treemapDimensions])
                        .children(function (d, depth) {
                            if (depth == 0) {
                                return d.connections;
                            } else if (depth == 1) {
                                return d.partners;
                            } else {
                                return d.subdivisions;
                            }
                        })
                        .value(function (d, depth) {
                            if (depth == 0) {
                                return d.total;
                            } else if (depth == 1) {
                                return d.subtotal;
                            } else if (depth == 2) {
                                return d.size;
                            } else {
                                var category = d.category;
                                if (filter == null){
                                    if(d.parent.parent.type == "Export") {
                                        totalExport += d.amount;
                                    } else if (d.parent.parent.type == "Import") {
                                        totalImport += d.amount;
                                    }
                                    return d.amount;
                                } else {
                                    if(category.indexOf(filter) > -1) {
                                        if(d.parent.parent.type == "Export") {
                                            totalExport += d.amount;
                                        } else if (d.parent.parent.type == "Import") {
                                            totalImport += d.amount;
                                        }
                                        return d.amount;
                                    } else {
                                        return null;
                                    }
                                }
                            }
                        })
                        .nodes(match);
                    
                    d3.select("div.treemap-container")
                        .selectAll("div")
                        .data(treemap)
                        .enter()
                        .append("div")
                        .attr("class", "cell")
                        .call(position)
                        .style({
                            "background-color": function (d) {
                                return !d.type ? null : d.type == "Export" ? "#aa2727" : "#ff9f00";
                            },
                            border: function(d) {
                                return d.depth == 0 || d.depth == 1 || d.depth == 2 ? "2px solid #212121" : "0.5px dashed #212121";
                            }
                        })
                        .on("mouseenter", function (d) {
                            if(d.depth == 3){
                                d3.select(this)
                                    .attr("class", "cell cell-hover");
                                
                                showTooltip(d);
                            }
                        })
                        .on("mouseleave", function (d) {
                            d3.select(this)
                                .attr("class", "cell");
                        
                            d3.select("div.tooltip")
                                .remove();
                        });
                } else {
                    var modalTreemapContainer = modalContainer.append("div")
                        .attr("class", "modal-treemap");
                    
                    d3.select("div.modal-treemap")
                        .append("p")
                        .attr("class", "text-noMatch legend-text")
                        .text(function(d){
                            if(!party) {
                                return fullName + " was not part of the Basel Convention in " + years[year];
                            } else if (!report) {
                                return "Data missing - " + fullName + " did not provide the due report in " + years[year];
                            } else {
                                return fullName + " declared no movements in " + years[year];
                            }
                        });
                }
                
                modalDivLeft.append("p")
                    .attr("class", "modal-amount map-text")
                    .text(function(d){
                        var re = /(\d)(?=(\d{3})+$)/g;
                    
                        function amountImp(imp) {
                            return imp.toString().replace(re, "$1,");
                        } 
                                
                        if(match == undefined) {
                            return "-";
                        } else if(match.connections.length == 2) {
                            if(match.connections[0].type == "Import") {
                                var imp = Math.round(totalImport),
                                    result = amountImp(imp);  
                                return result + " t";
                            } else {
                                imp = Math.round(totalImport);
                                result = amountImp(imp); 
                                return result + " t";
                            }
                        } else {
                            if(match.connections[0].type == "Import") {
                                imp = Math.round(totalImport);
                                result = amountImp(imp); 
                                return result + " t";
                            } else {
                                return "-";
                            }
                        }
                    });
                
                modalDivRight.append("p")
                    .attr("class", "modal-amount map-text")
                    .text(function(d){
                        var re = /(\d)(?=(\d{3})+$)/g;
                    
                        function amountImp(exp) {
                            return exp.toString().replace(re, "$1,");
                        } 
                                
                        if(match == undefined) {
                            return "-";
                        } else if(match.connections.length == 2) {
                            if(match.connections[0].type == "Export"){
                                var exp = Math.round(totalExport),
                                    result = amountImp(exp);  
                                return result + " t";
                            } else {
                                exp = Math.round(totalExport);
                                result = amountImp(exp); 
                                return result + " t";
                            }
                        } else {
                            if(match.connections[0].type == "Export") {
                                exp = Math.round(totalExport);
                                result = amountImp(exp); 
                                return result + " t";
                            } else {
                                return "-";
                            }
                        }
                    });
            }
        }
    }

}