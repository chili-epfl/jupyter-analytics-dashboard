import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { JSONGraph, JSONGraphNode } from "../../../utils/interfaces";


const GraphComponent = (props: ({ nxJsonData: JSONGraph })) => {

    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const width = 250, height = 250;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const simulation = d3.forceSimulation(props.nxJsonData.nodes)
            .force("link", d3.forceLink(props.nxJsonData.edges)
                .id(d => (d as JSONGraphNode).id)
                .distance(40))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .on("tick", ticked);

        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(props.nxJsonData.edges)
            .join("line")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrow)");

        const node_radius = 10;
        const node = svg.append("g")
            .selectAll("circle")
            .data(props.nxJsonData.nodes)
            .enter().append("circle")
            .attr("r", node_radius)
            .attr("fill", "steelblue")

        // Add arrow markers for directed edges
        svg.append("defs").append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#999");

        node.append("title")
            .text(d => `Cell ${d.id}`);

        let draggedOnce = false;
        // Add a drag behavior.
        node.call(d3.drag<any, any, any>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

        function ticked() {
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            node
                .attr("cx", (d: any) => d.x)
                .attr("cy", (d: any) => d.y);
            const xExtent = d3.extent(node.data(), d => d.x) as [number, number];
            const yExtent = d3.extent(node.data(), d => d.y) as [number, number];
            
            if (!!xExtent[0] || !!xExtent[1] || !!yExtent[0] || !!yExtent[1]) {
                return;
            }
            const newWidth = Math.abs(xExtent[0]) + xExtent[1];
            const newHeight = Math.abs(yExtent[0]) + yExtent[1];
            const margin = node_radius*2
            svg.attr("viewBox", [
                xExtent[0] - margin,
                yExtent[0] - margin,
                newWidth + margin,
                newHeight + margin
            ]);
        }

        function dragstarted(event: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
            draggedOnce = true;
        }

        function dragged(event: any) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event: any) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }


    }, [props.nxJsonData]);

    return <svg ref={svgRef} width={250} height={250}></svg>;
};

export default GraphComponent;
