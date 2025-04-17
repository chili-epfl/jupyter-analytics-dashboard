import * as d3 from "d3";
import { CodeExecution, JSONGraph, JSONGraphNode, ShowLevel } from "../../../utils/interfaces";

// for part activity
const blueScale = d3.scaleSequential(d3.interpolateBlues);
let totalActivity: number = -1;
let levelShown = ShowLevel.PART;
let codeExecution: CodeExecution[] = [];

function filterNodesOfPart(node: JSONGraphNode, part: string) {
    /* return only nodes of part part */
    return node.part === part || node.part === part
}

function getPartsNodes() {
    return d3.select("#main-s")
             .select("svg")
             .select("g[name=ellipses]")
             .selectAll("ellipse")
}

function getCellNodes() {
    return d3.select("#main-s")
             .select("svg")
             .select("g[name=nodes]")
             .selectAll("circle")
}

function getActivityOfPart(part: string) {
    /* return the activity as a float [0-1] of a part
    The activity is computed as the sum of
    (code_exec_ok_pct+code_exec_pct)/totalActivity for all nodes of part part. */
    let cellIdsOfPart: string[] = [];
        //@ts-ignore
        getCellNodes().filter(n => filterNodesOfPart(n, part)).each(n => {
        //@ts-ignore
        if (!!n.cell_id) {
        //@ts-ignore
            cellIdsOfPart.push(n.cell_id[0]);
        }
    });
    const cellsOfPart = codeExecution.filter((activity) =>
        cellIdsOfPart.includes(activity.cell))
    if (cellsOfPart) {
        return cellsOfPart.reduce((c, a) => c + a.code_exec_ok_pct + a.code_exec_pct, 0)
            / totalActivity;
    }
    return 0.2;  // TODO set 0 or transparent if no activity!
}

function getActivityOfNode(n: JSONGraphNode) {
    const cellNode = codeExecution.find((cell) => cell.cell === (n.cell_id || [""])[0]);
    if (cellNode) {
        return (cellNode.code_exec_ok_pct + cellNode.code_exec_pct) / totalActivity;
    }
    return 0.2;  // TODO set 0 or transparent if no activity!
}

export function updateGraph(newCodeExecution: CodeExecution[]) {
    console.log("newCodeExecution");
    console.log(newCodeExecution);

    if (newCodeExecution.length === 0) {
        return;
    }

    totalActivity = newCodeExecution.reduce((c, a) =>
        c + a.code_exec_ok_pct + a.code_exec_pct, 0);
    codeExecution = newCodeExecution;
    if (levelShown === ShowLevel.PART) {
        //@ts-ignore
        getPartsNodes().attr("fill", (p) => blueScale(getActivityOfPart(p)));
    } else {
        //@ts-ignore
        getCellNodes().attr("fill", (n) => blueScale(getActivityOfNode(n)));
    }
}

export function initGraph(
    container: HTMLElement,
    nxJsonData: JSONGraph,
    codeExecution: CodeExecution[]
) {
    let aPartIsSelected = false;
    // let levelShown: ShowLevel = ShowLevel.PART;

    container.innerHTML = "";

    // ================================ Definitions ================================
    const strength = -20; // nodes base repulsive force
    const nodeRadius = 10;  // cell nodes radius
    const maxTextLength = 30;  // truncate part texts with size > maxTextLength
    // let aPartIsSelected = false;  // true when focusing on a part

    let centroids: any = {};  // (x,y) centroids of each part

    // activity config
    // let codeExecution: CodeExecution[] = [];
    let totalActivity = codeExecution.reduce((c, a) =>
        c + a.code_exec_ok_pct + a.code_exec_pct, 0);

    // nxJsonGraph config
    // const nxJsonData: JSONGraph = props.nxJsonData;
    const parts = [...new Set(nxJsonData.nodes.map(n => n.part))];

    // color scales
    // for part singular color
    const nodeColorScale = d3.scaleOrdinal(parts, d3.schemeTableau10);

    // svg config
    const width = 250, height = 250;
    // const svg = d3.select(mainNode)  // svg element
    const svg = d3.select(container)  // svg element
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");  // defs to store the arrows points
    const mainG = svg.append("g")  // global g element to enable zoom/pan
        .attr("name", "mainG");
    mainG.selectAll("*").remove();
    // ==========================================================================

    // ============================ Utils functions =============================
    function filterEdgesOfPart(edge: any, part: string, onlySource: boolean = false) {
        /* return only outgoing edges of part part if onlySource is true, return all
        edges of part part otherwise */
        return (edge.source as JSONGraphNode).part === part ||
            ((edge.target as JSONGraphNode).part === part && !onlySource)
    }


    function getPartOfNodeId(id: number): string {
        /* return the part of the node from a node id */
        return nxJsonData.nodes.find(n => n.id == id)?.part || "undefined"
    }


    // ==========================================================================


    // ============================== D3 functions ==============================
    // function drawLegend(legendPosX: number, legendPosY: number, legendSize: number): void {
    //     /* Draw the legend with parts colors */
    //     const legendG = mainG.append("g").attr("name", "legend")
    //     legendG.selectAll("legend-dots")
    //         .data(parts)
    //         .enter()
    //         .append("rect")
    //         .attr("x", legendPosX)
    //         .attr("y", function (d, i) { return legendPosY + i * (legendSize + 5) })
    //         .attr("width", legendSize)
    //         .attr("height", legendSize)
    //         .style("fill", function (d) { return nodeColorScale(d) })
    //     legendG.selectAll("legend-labels")
    //         .data(parts)
    //         .enter()
    //         .append("text")
    //         .attr("x", legendPosX + legendSize * 1.2)
    //         .attr("y", function (d, i) { return legendPosY + i * (legendSize + 5) + (legendSize / 2) })
    //         .style("fill", function (d) { return nodeColorScale(d) })
    //         .text(function (d) { return d })
    //         .attr("text-anchor", "left")
    //         .attr("font-size", 11)
    //         .style("alignment-baseline", "middle");
    // }

    function onPartHover(d: string, ellipse: SVGEllipseElement) {
        /* Hide the activity of each parts when hovering them */
        if (aPartIsSelected) {
            return;
        }
        const d3Ellipse = d3.select(ellipse);
        d3Ellipse
            .attr("fill-opacity", "0")
        partsEdges.filter(e => filterEdgesOfPart(e, d, true))
            .attr("stroke-opacity", 1)
            .attr("stroke-width", 5);
        cellNodes.filter(n => filterNodesOfPart(n, d))
            .style("visibility", "visible");
        cellsEdges.filter(edge => filterEdgesOfPart(edge, d))
            .style("visibility", "visible");
    }

    function onPartLeave(d: string, ellipse: SVGEllipseElement) {
        /* Show the activity of each parts when leaving them */
        if (aPartIsSelected) {
            return;
        }
        d3.select(ellipse)
            .attr("fill-opacity", (e) => levelShown === ShowLevel.CELL ? "0" : "1")
        partsEdges.filter(e => filterEdgesOfPart(e, d, true))
            .attr("stroke-opacity", 1)
            .attr("stroke-width", 1);
        cellNodes.filter(n => filterNodesOfPart(n, d))
            .style("visibility", (n) => levelShown === ShowLevel.CELL ? "visible" : "hidden")
        cellsEdges.filter(edge => filterEdgesOfPart(edge, d))
            .style("visibility", (e) => levelShown === ShowLevel.CELL ? "visible" : "hidden");
    }

    function onPartClick(d: string, ellipse: SVGEllipseElement) {
        /* Zoom in to a part when clicking them */
        if (!aPartIsSelected) {
            aPartIsSelected = true;
            const viewBox = svg.attr("viewBox").split(",").map(Number);
            const viewWidth = viewBox[2];
            const viewHeight = viewBox[3];
            const bounds = ellipse.getBBox();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            // Compute the scale so the ellipse fills the screen
            const scale = 0.9 / Math.max(bounds.width / viewWidth, bounds.height / viewHeight);
            const translate = [
                viewWidth / 2 - scale * cx,
                viewHeight / 2 - scale * cy
            ];
            mainG.transition()
                .duration(450)
                .call(
                    // @ts-ignore
                    zoom.transform,
                    d3.zoomIdentity
                        .translate(translate[0], translate[1])
                        .scale(scale)
                );
            d3.select(ellipse).attr("class", "");
        } else {
            aPartIsSelected = false;
            mainG.transition()
                .duration(450)
                .call(
                    // @ts-ignore
                    zoom.transform,
                    d3.zoomIdentity
                );
            d3.select(ellipse).attr("class", "cursor-pointer");
        }
    }

    // configure the simulation
    const simulation = d3.forceSimulation(nxJsonData.nodes)
        .force("linkCells", d3.forceLink(nxJsonData.edges)
            .id(d => (d as JSONGraphNode).id)
            .strength((link) =>
                // inter-part links repulse more than intra part links
                (link.source as JSONGraphNode).part == (link.target as JSONGraphNode).part ? 0.1 : 0.001))
        .force("charge", d3.forceManyBody().strength(strength))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", ticked);
    // enable zoom/pan in the svg with the mouse
    let zoom = d3.zoom().on("zoom", (e) => mainG.attr("transform", e.transform));
    //@ts-ignore
    svg.call(zoom);

    // part nodes : each node is a markdown part in the notebook
    const partNodes = mainG.append("g")
        .attr("name", "ellipses")
        .selectAll("ellipse")
        .data(parts)
        .enter().append("ellipse")
        .attr("fill", "#FFFFFF")
        .attr("stroke-width", 3)
        .attr("stroke", (p) => nodeColorScale(p))
        .attr("class", "cursor-pointer")
        .attr("rx", 0)
        .attr("ry", 0)
        .attr("cx", 0)
        .attr("cy", 0)
        .on('mousedown', function (event, d) { onPartClick(d, this) })
        .on('mouseover', function (event, d) { onPartHover(d, this) })
        .on('mouseleave', function (event, d) {
            if (event.relatedTarget.tagName != "circle") {
                onPartLeave(d, this);
            }
        });

    // cell nodes : each node is a notebook code cell
    const cellNodes = mainG.append("g")
        .attr("name", "nodes")
        .selectAll("circle")
        .data(nxJsonData.nodes)
        .enter().append("circle")
        .attr("r", n => n.id > 4000 ? 0 : nodeRadius)
        .attr("stroke", "#000000")
        .attr("fill", (n) => nodeColorScale(n.part))
        .attr("class", "cursor-pointer")
        .style("visibility", "hidden") // hidden since we initialize the viz in Part level mode
        .on('mousedown', function (event, d) {
            console.log(`Node ${d.id}, ${d?.cell_id} clicked !`);
        })

    // display the number of the cell on hover
    cellNodes.append("title").text(d => `Cell ${d.id} of part ${d.part}`);

    // parts edges : directed, each edge is a dependency between a part
    // and another part
    const partsEdges = mainG.append("g")
        .attr("name", "partsEdges")
        .selectAll("line")
        .data(nxJsonData.edges.filter(n => !!n.weight))
        .join("line")
        .attr("stroke-opacity", 0.5)
        .attr("stroke", "#000000")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrow)");

    // parts edges : directed, each edge is a dependency between a cell
    // and another cell
    const cellsEdges = mainG.append("g")
        .attr("name", "cellsEdges")
        .selectAll("line")
        .data(nxJsonData.edges.filter(e => {
            // only show the intra part edges
            return !e.weight &&
                getPartOfNodeId((e.target as JSONGraphNode).id) ==
                getPartOfNodeId((e.source as JSONGraphNode).id)
        }))
        .join("line")
        .attr("stroke", "#000000")
        .attr("stroke-width", 1)
        .attr("marker-end", "url(#arrow)")
        .style("visibility", "hidden") // only display them on click on the part;

    const cellsEdgesInterParts = mainG.append("g")
        .attr("name", "cellsEdgesInterParts")
        .selectAll("line")
        .data(nxJsonData.edges.filter(e => {
            // only show the intra part edges
            return !e.weight &&
                getPartOfNodeId((e.target as JSONGraphNode).id) !=
                getPartOfNodeId((e.source as JSONGraphNode).id)
        }))
        .join("line")
        .attr("stroke", "#7A7AEE")
        .attr("fill", "#7A7AEE")
        .attr("stroke-width", 1)
        .attr("marker-end", "url(#arrow)")
        .style("visibility", "hidden"); // hidden since we initialize the viz in Part level mode;


    // make the edges directed by drawing an arrow at the end
    defs.append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 10)
        .attr("refY", 5)
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", "context-fill")
        .attr("stroke", "context-stroke");

    // display the part name above the nodes
    const partTexts = mainG.append("g")
        .attr("name", "partTexts")
        .selectAll("text")
        .data(parts)
        .enter().append("text")
        .attr("fill", "#636363")
        .attr("class", "part-text")
        .text(p => (p.length > maxTextLength) ? p.slice(0, maxTextLength) + '...' : p)
        .attr("text-anchor", "middle")
        .attr("font-size", 10);

    // switch to toggle between cell and part levels
    // let levelShown = ShowLevel.PART;
    const levelSwitch = d3.select("#levelSwitch")
        .on("change", (e) => {
            levelShown = e.target.checked ? ShowLevel.PART : ShowLevel.CELL;
            if (e.target.checked) {
                // part level
                partsEdges.style("visibility", "visible");
                cellsEdges.style("visibility", "hidden");
                cellsEdgesInterParts.style("visibility", "hidden");
                cellNodes.style("visibility", "hidden")
                    .attr("fill", (n) => nodeColorScale(n.part));
                partNodes.attr("fill-opacity", "1");
            } else {
                // cell level
                partsEdges.style("visibility", "hidden");
                cellsEdges.style("visibility", "visible");
                cellsEdgesInterParts.style("visibility", "visible");
                cellNodes.style("visibility", "visible")
                    .attr("fill", (n) => blueScale(getActivityOfNode(n)));
                partNodes.attr("fill-opacity", "0");
            }
        });

    (levelSwitch.node() as HTMLInputElement).checked = true;

    // drawLegend(10, 10, 20);

    function ticked() {
        /* Called at each simulation ticks */
        const alpha = simulation.alpha();

        d3.select(container)
            .style("visibility", alpha < 0.01 ? "visible" : "hidden");
        d3.select("#dagLoader")
            .style("height", alpha > 0.01 ? "auto" : "0px")
            .style("visibility", alpha > 0.01 ? "visible" : "hidden");

        // update the centroids of each part
        parts.forEach(p => {
            let tx = 0;
            let ty = 0;
            let N = 0;
            cellNodes.filter(n => n.part == p).each(n => {
                tx += n.x || 0;
                ty += n.y || 0;
                N += 1;
            });
            centroids[p] = { cx: tx / N, cy: ty / N };
        });

        // don't modify points close the the group centroid:
        var minDistance = 10;
        if (alpha < 0.1) {
            minDistance = 10 + (1000 * (0.1 - alpha))
        }

        // update part nodes position, activity color, text positions
        partNodes
            .attr("cx", (p) => centroids[p].cx)
            .attr("cy", (p) => centroids[p].cy)
            // .attr("fill", (p) => blueScale(getActivityOfPart(p)))
            .each(function (part) {
                const nodesOfPart = cellNodes.filter(n => filterNodesOfPart(n, part))
                const xExtent = d3.extent(nodesOfPart.data(), d => d.x) as [number, number];
                const yExtent = d3.extent(nodesOfPart.data(), d => d.y) as [number, number];
                const { rx, ry } = { rx: (xExtent[1] - xExtent[0]) + nodeRadius, ry: (yExtent[1] - yExtent[0]) + nodeRadius };

                d3.select(this)
                    .attr("rx", rx)
                    .attr("ry", ry)

                partTexts.filter(text => text === part)
                    .attr("x", centroids[part].cx)
                    .attr("y", centroids[part].cy)
                    .attr("dx", 0)
                    .attr("dy", -(ry / 2 + 20))
            })

        // update cell nodes position according to their centroids
        cellNodes
            // .attr("fill", (n) => blueScale(getActivityOfNode(n)))
            .each(function (d) {
                const cx = centroids[d.part].cx;
                const cy = centroids[d.part].cy;
                const x = d.x || 0;
                const y = d.y || 0;
                const dx = cx - x;
                const dy = cy - y;

                let r = Math.sqrt(dx * dx + dy * dy);
                if (r > minDistance) {
                    d.x = x * 0.9 + cx * 0.1;
                    d.y = y * 0.9 + cy * 0.1;
                }
            })
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)

        // update edges positions according to nodes positions
        partsEdges
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);
        cellsEdges
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);
        cellsEdgesInterParts
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);

        // update svg viewBox to avoid drawing nodes outside of the initial svg
        const xExtent = d3.extent(cellNodes.data(), d => d.x) as [number, number];
        const yExtent = d3.extent(cellNodes.data(), d => d.y) as [number, number];

        if (!!xExtent[0] && !!xExtent[1] && !!yExtent[0] && !!yExtent[1]) {
            const newWidth = Math.abs(xExtent[0]) + xExtent[1];
            const newHeight = Math.abs(yExtent[0]) + yExtent[1];
            const margin = nodeRadius * 2
            svg.attr("viewBox", [
                Math.min(xExtent[0] - margin, 0),
                Math.min(yExtent[0] - margin, 0),
                Math.max(newWidth + margin, width),
                Math.max(newHeight + margin, height)
            ]);
        }
    }
}
