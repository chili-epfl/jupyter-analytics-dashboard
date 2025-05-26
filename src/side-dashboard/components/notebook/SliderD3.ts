import * as d3 from "d3";
import { CollabScoreForGroup } from "../../../utils/interfaces";

export class SliderD3 {
    // svg config
    private width = 300;
    private height = 125;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private margin = { left: 10, right: 10, top: 20, bottom: 20 };
    private xScale: any;
    private legendItemWidth = 35;
    private colorScale: any;

    constructor(
        private container: HTMLElement,  // div to bind the graph to
    ) {

        this.container.innerHTML = "";

        this.svg = d3.select(container)  // svg element
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, this.width, this.height]);
        this.svg.selectAll("*").remove();
        const groupLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I"].flatMap(letter => d3.range(1, 7).map(i => `${letter}${i}`));
        const step = 47;
        const n_colors = groupLabels.length;

        // Update if needed
        this.colorScale = d3.scaleOrdinal()
            .domain(groupLabels)
            .range(d3.range(n_colors).map(i => {
                const hue = (i * step) % n_colors * (360 / n_colors);
                return d3.hcl(hue, 60, 70).formatHex();
            }));

        // Create x-scale
        this.xScale = d3.scaleLinear()
            .domain([0, 1])
            .range([this.margin.left, this.width - this.margin.right]);

        // Draw axis
        const xAxis = d3.axisBottom(this.xScale)
            .ticks(4)
            //@ts-ignore
            .tickFormat(d3.format(".1f"));

        this.svg.append("g")
            .attr("transform", `translate(0, ${this.height / 2})`)
            //@ts-ignore
            .call(xAxis);

        const linesHeight = 12;

        // Draw end markers
        this.svg.append("line")
            .attr("x1", this.xScale(0))
            .attr("y1", (this.height - linesHeight) / 2)
            .attr("x2", this.xScale(0))
            .attr("y2", (this.height + linesHeight) / 2)
            .attr("stroke-width", 2)
            .attr("stroke", "black");

        this.svg.append("line")
            .attr("x1", this.xScale(1))
            .attr("y1", (this.height - linesHeight) / 2)
            .attr("x2", this.xScale(1))
            .attr("y2", (this.height + linesHeight) / 2)
            .attr("stroke-width", 2)
            .attr("stroke", "black");
    }

    updateSlider(new_collabs_scores: CollabScoreForGroup[]) {
        const labels = Array.from(new Set(new_collabs_scores.map(d => d.group_id)));
        const dots = this.svg.selectAll("circle.dot")
            .data(new_collabs_scores, (d: any) => d.group_id);
        
        const threshold = 0.01;
        const findClosePoints = (ele: CollabScoreForGroup): CollabScoreForGroup[] => {
            return new_collabs_scores.filter(element => Math.abs(element.collaboration_score - ele.collaboration_score) <= threshold).sort((a, b) => a.collaboration_score - b.collaboration_score)
        }
        dots.exit().remove();

        // draw the new dots
        const dotsEnter = dots.enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => this.xScale(d.collaboration_score))
            .attr("cy", this.height / 2)
            .attr("r", 5)
            .attr("title", d => d.group_id)
            .attr("fill", d => this.colorScale(d.group_id))
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        //@ts-ignore
        dotsEnter.merge(dots)
            .transition()
            .duration(800)
            .attr("cx", d => this.xScale(d.collaboration_score))
            .attr("cy", d => {
                const closePoints = findClosePoints(d);
                if (closePoints.length) {
                    return this.height / 2 - 8*closePoints.indexOf(d);
                } else {
                    return this.height / 2;
                }
            })
        this.svg.selectAll("g.legend").remove();

        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.margin.left}, ${this.height - this.margin.bottom + 10})`);

        const legendItems = legend.selectAll("g.legend-item")
            .data(d3.sort(labels))
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(${i * this.legendItemWidth}, 0)`);

        legendItems.append("circle")
            .attr("r", 6)
            .attr("cx", 6)
            .attr("cy", 6)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", d => this.colorScale(d));

        legendItems.append("text")
            .attr("x", 16)
            .attr("y", 10)
            .attr("font-size", "12px")
            .text(d => d.split("-")[0]);
    }
}
