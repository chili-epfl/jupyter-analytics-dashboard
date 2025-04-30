import { CommandRegistry } from '@lumino/commands';
import * as d3 from "d3";
import { CommandIDs } from "../../../utils/constants";
import { JSONGraph, JSONGraphEdge, JSONGraphNode, ShowLevel } from "../../../utils/interfaces";

export class NotebookD3Graph {

    private aPartIsSelected: boolean = false; // true when focusing on a part
    private levelShown: ShowLevel = ShowLevel.PART;

    private strength = -20; // nodes base repulsive force
    private nodeRadius = 10;  // cell nodes radius
    private maxTextLength = 30;  // truncate part texts with size > maxTextLength

    private centroids: any = {};  // centroids of each part ex: {"part1": {"x": x, "y": y}, "part2": {...}, ...}

    // activity config
    private cellUsers: Map<string, number> = new Map<string, number>();
    private totalUsers = 0;

    // nxJsonGraph config
    private parts: string[] = [];

    // color scales
    private nodeColorScale: d3.ScaleOrdinal<string, string, never>; // for part singular color
    private blueScale = d3.scaleSequential(d3.interpolateBlues); // for activity

    // svg config
    private width = 250;
    private height = 250;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private mainG: d3.Selection<SVGGElement, unknown, null, undefined>;

    // d3 elements
    private simulation: d3.Simulation<JSONGraphNode, undefined>;
    private partNodes: d3.Selection<SVGEllipseElement, string, SVGGElement, unknown>;
    private cellNodes: d3.Selection<SVGCircleElement, JSONGraphNode, SVGGElement, unknown>;
    private cellsEdges: d3.Selection<d3.BaseType | SVGLineElement, JSONGraphEdge, SVGGElement, unknown>;
    private partsEdges: d3.Selection<d3.BaseType | SVGLineElement, JSONGraphEdge, SVGGElement, unknown>;
    private partTextsG: d3.Selection<SVGGElement, string, SVGGElement, unknown>;
    private cellsEdgesInterParts: d3.Selection<d3.BaseType | SVGLineElement, JSONGraphEdge, SVGGElement, unknown>;
    private zoom: d3.ZoomBehavior<Element, unknown>;

    constructor(
        private commands: CommandRegistry, // notebook commands
        private nxJsonData: JSONGraph,  // serialized networkX graph
        private container: HTMLElement,  // div to bind the graph to
    ) {

        this.container.innerHTML = "";

        this.parts = [...new Set(this.nxJsonData.nodes.map(n => n.part))];

        this.nodeColorScale = d3.scaleOrdinal(this.parts, d3.schemeTableau10);

        // ================================ Definitions ================================

        this.svg = d3.select(container)  // svg element
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewBox", [0, 0, this.width, this.height]);
        this.svg.selectAll("*").remove();

        const defs = this.svg.append("defs");  // defs to store the arrows points
        this.mainG = this.svg.append("g")  // global g element to enable zoom/pan
            .attr("name", "mainG");

        this.mainG.selectAll("*").remove();

        // bind callbacks to this to make sure the this keyword is properly initialized
        this.onCellClick = this.onCellClick.bind(this);
        this.onPartClick = this.onPartClick.bind(this);
        this.onPartHover = this.onPartHover.bind(this);
        this.onPartLeave = this.onPartLeave.bind(this);
        this.onTick = this.onTick.bind(this);
        this.computeEdgeBetween = this.computeEdgeBetween.bind(this);

        // configure the simulation
        this.simulation = d3.forceSimulation(this.nxJsonData.nodes)
            .force("linkCells", d3.forceLink(this.nxJsonData.edges)
                .id(d => (d as JSONGraphNode).id)
                .strength((link) =>
                    // inter-part links repulse more than intra part links
                    (link.source as JSONGraphNode).part == (link.target as JSONGraphNode).part ? 0.1 : 0.001))
            .force("charge", d3.forceManyBody().strength(this.strength))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            // we binded this.ticked to this so we can use this syntax to assign callbacks
            .on("tick", this.onTick);

        // enable zoom/pan in the svg with the mouse
        this.zoom = d3.zoom().on("zoom", (e) => this.mainG.attr("transform", e.transform));
        //@ts-ignore
        this.svg.call(this.zoom);

        // part nodes : each node is a markdown part in the notebook
        const onPartClick = this.onPartClick;
        const onPartHover = this.onPartHover;
        const onPartLeave = this.onPartLeave;
        this.partNodes = this.mainG.append("g")
            .attr("name", "ellipses")
            .selectAll("ellipse")
            .data(this.parts)
            .enter().append("ellipse")
            .attr("fill", "#FFFFFF")
            .attr("stroke-width", 3)
            .attr("stroke", (p) => this.nodeColorScale(p))
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
        const onCellClick = this.onCellClick;
        this.cellNodes = this.mainG.append("g")
            .attr("name", "nodes")
            .selectAll("circle")
            .data(nxJsonData.nodes)
            .enter().append("circle")
            .attr("r", n => n.id > 4000 ? 0 : this.nodeRadius)
            .attr("stroke", "#000000")
            .attr("fill", (n) => this.nodeColorScale(n.part))
            .attr("class", "cursor-pointer")
            .style("visibility", "hidden") // hidden since we initialize the viz in Part level mode
            .on('mousedown', function (event, d) { onCellClick(d) })

        // display the number of the cell on hover
        this.cellNodes.append("title").text(d => `[Click to navigate]\nCell ${d.id} of part ${d.part}`);

        // parts edges : directed, each edge is a dependency between a part
        // and another part
        this.partsEdges = this.mainG.append("g")
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
        this.cellsEdges = this.mainG.append("g")
            .attr("name", "cellsEdges")
            .selectAll("line")
            .data(nxJsonData.edges.filter(e => {
                // only show the intra part edges
                return !e.weight &&
                    this.getPartOfNodeId((e.target as JSONGraphNode).id) ==
                    this.getPartOfNodeId((e.source as JSONGraphNode).id)
            }))
            .join("line")
            .attr("stroke", "#000000")
            .attr("stroke-width", 1)
            .attr("marker-end", "url(#arrow)")
            .style("visibility", "hidden") // only display them on click on the part;

        this.cellsEdgesInterParts = this.mainG.append("g")
            .attr("name", "cellsEdgesInterParts")
            .selectAll("line")
            .data(nxJsonData.edges.filter(e => {
                // only show the intra part edges
                return !e.weight &&
                    this.getPartOfNodeId((e.target as JSONGraphNode).id) !=
                    this.getPartOfNodeId((e.source as JSONGraphNode).id)
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
        this.partTextsG = this.mainG.append("g")
            .attr("name", "partTexts")
            .selectAll("text")
            .data(this.parts)
            .enter().append("g");

        const partRects = this.partTextsG.append("rect")
            .attr("fill", "#ffffff")
            .attr("stroke-width", 1)
            .attr("stroke", p => this.nodeColorScale(p))
            .attr("rx", 5)
            .attr("ry", 5);

        this.partTextsG.append("text")
            .attr("fill", "#636363")
            .attr("class", "part-text")
            .text(p => (p.length > this.maxTextLength) ? p.slice(0, this.maxTextLength) + '...' : p)
            .attr("text-anchor", "middle")
            .attr("font-size", 10);

        partRects.each(function (p) {
            const bbox = (d3.select(this.parentNode as SVGGElement)
                .select("text")
                .node() as SVGGraphicsElement)
                .getBBox();
            const margin = 5;
            d3.select(this)
                .attr("x", bbox.x - margin)
                .attr("y", bbox.y - margin)
                .attr("width", bbox.width + margin * 2)
                .attr("height", bbox.height + margin * 2)
        })

        // switch to toggle between cell and part levels
        const levelSwitch = d3.select("#levelSwitch")
            .on("change", (e) => {
                this.levelShown = e.target.checked ? ShowLevel.PART : ShowLevel.CELL;
                if (e.target.checked) {
                    // part level
                    this.partsEdges.style("visibility", "visible");
                    this.cellsEdges.style("visibility", "hidden");
                    this.cellsEdgesInterParts.style("visibility", "hidden");
                    this.cellNodes.style("visibility", "hidden")
                        .attr("fill", (n) => this.nodeColorScale(n.part));
                    this.partNodes.attr("fill-opacity", "1");
                } else {
                    // cell level
                    this.partsEdges.style("visibility", "hidden");
                    this.cellsEdges.style("visibility", "visible");
                    this.cellsEdgesInterParts.style("visibility", "visible");
                    this.cellNodes.style("visibility", "visible")
                        .attr("fill", (n) => this.blueScale(this.getActivityOfNode(n)));
                    this.partNodes.attr("fill-opacity", "0");
                }
            });

        (levelSwitch.node() as HTMLInputElement).checked = true;
    }

    private computeEdgeBetween(source: { x: number, y: number }, target: { x: number, y: number }): { x1: number, x2: number, y1: number, y2: number } {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const offsetX = (dx / dist) * this.nodeRadius;
        const offsetY = (dy / dist) * this.nodeRadius;

        const x1 = source.x + offsetX;
        const y1 = source.y + offsetY;
        const x2 = target.x - offsetX;
        const y2 = target.y - offsetY;

        return { x1, x2, y1, y2 }
    }

    private onTick() {
        // called at each simulation ticks
        const alpha = this.simulation.alpha();

        d3.select(this.container)
            .style("visibility", alpha < 0.01 ? "visible" : "hidden");
        d3.select("#dagLoader")
            .style("height", alpha > 0.01 ? "auto" : "0px")
            .style("visibility", alpha > 0.01 ? "visible" : "hidden");

        // update the centroids of each part
        this.parts.forEach(p => {
            let tx = 0;
            let ty = 0;
            let N = 0;
            this.cellNodes.filter(n => n.part == p).each(n => {
                tx += n.x || 0;
                ty += n.y || 0;
                N += 1;
            });
            this.centroids[p] = { cx: tx / N, cy: ty / N };
        });

        // don't modify points close the the group centroid:
        let minDistance = 10;
        if (alpha < 0.1) {
            minDistance = 10 + (1000 * (0.1 - alpha))
        }

        // update part nodes position, activity color, text positions
        const cellNodes = this.cellNodes;
        const nodeRadius = this.nodeRadius;
        const partTextsG = this.partTextsG;
        const centroids = this.centroids;
        const filterNodesOfPart = this.filterNodesOfPart;
        this.partNodes
            .attr("cx", (p) => this.centroids[p].cx)
            .attr("cy", (p) => this.centroids[p].cy)
            .each(function (part) {
                const nodesOfPart = cellNodes.filter(n => filterNodesOfPart(n, part))
                const xExtent = d3.extent(nodesOfPart.data(), d => d.x) as [number, number];
                const yExtent = d3.extent(nodesOfPart.data(), d => d.y) as [number, number];
                const { rx, ry } = { rx: (xExtent[1] - xExtent[0]) + nodeRadius, ry: (yExtent[1] - yExtent[0]) + nodeRadius };

                d3.select(this)
                    .attr("rx", rx)
                    .attr("ry", ry)
                const currentBBox = (d3.select(this as SVGEllipseElement).node() as SVGGraphicsElement).getBBox();
                partTextsG.filter(text => text === part)
                    .attr("transform", `translate(${currentBBox.x + currentBBox.width / 2}, ${currentBBox.y - 12})`);
            })

        // update cell nodes position according to their centroids
        this.cellNodes
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
        this.partsEdges
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);

        const computeEdgeBetween = this.computeEdgeBetween;
        this.cellsEdges
            .each(function (d: any) {
                const { x1, x2, y1, y2 } = computeEdgeBetween(d.source, d.target);
                d3.select(this)
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2);
            });
        this.cellsEdgesInterParts
            .each(function (d: any) {
                const { x1, x2, y1, y2 } = computeEdgeBetween(d.source, d.target);
                d3.select(this)
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2);
            });

        // update svg viewBox to avoid drawing nodes outside of the initial svg
        const xExtent = d3.extent(this.cellNodes.data(), d => d.x) as [number, number];
        const yExtent = d3.extent(this.cellNodes.data(), d => d.y) as [number, number];

        if (!!xExtent[0] && !!xExtent[1] && !!yExtent[0] && !!yExtent[1]) {
            const newWidth = Math.abs(xExtent[0]) + xExtent[1];
            const newHeight = Math.abs(yExtent[0]) + yExtent[1];
            const margin = this.nodeRadius * 2
            this.svg.attr("viewBox", [
                Math.min(xExtent[0] - margin, 0),
                Math.min(yExtent[0] - margin, 0),
                Math.max(newWidth + margin, this.width),
                Math.max(newHeight + margin, this.height)
            ]);
        }
    }

    updateGraph(newCellUsers: Map<string, number>) {
        if (!newCellUsers || newCellUsers.size === 0) {
            return;
        }
        let totalUsers = 0;
        newCellUsers.forEach((value) => totalUsers += value);
        this.totalUsers = totalUsers;
        this.cellUsers = newCellUsers;
        if (this.levelShown === ShowLevel.PART) {
            this.partNodes.attr("fill", (p) => this.blueScale(this.getActivityOfPart(p)));
        } else {
            this.cellNodes.attr("fill", (n) => this.blueScale(this.getActivityOfNode(n)));
        }
    }

    private getActivityOfPart(part: string) {
        // return the activity as a float [0-1] of a part
        // The activity is computed as the sum of
        // (code_exec_ok_pct+code_exec_pct)/totalActivity for all nodes of part part.
        let cellIdsOfPart: string[] = [];
        this.cellNodes.filter(n => this.filterNodesOfPart(n, part)).each(n => {
            if (!!n.cell_id) {
                cellIdsOfPart.push(n.cell_id[0]);
            }
        });
        if (!cellIdsOfPart) {
            return 0;
        }
        let activityOfPart = 0;
        this.cellUsers.forEach((value, cellId) => {
            if (cellIdsOfPart.includes(cellId)) {
                activityOfPart += value;
            }
        })
        return activityOfPart / this.totalUsers;
    }

    private getActivityOfNode(n: JSONGraphNode) {
        return (this.cellUsers.get((n.cell_id || [""])[0]) || 0) / this.totalUsers;
    }

    private filterNodesOfPart(node: JSONGraphNode, part: string) {
        /* return only nodes of part part */
        return node.part === part || node.part === part
    }

    private filterEdgesOfPart(edge: any, part: string, onlySource: boolean = false) {
        /* return only outgoing edges of part part if onlySource is true, return all
        edges of part part otherwise */
        return (edge.source as JSONGraphNode).part === part ||
            ((edge.target as JSONGraphNode).part === part && !onlySource)
    }


    private getPartOfNodeId(id: number): string {
        /* return the part of the node from a node id */
        return this.nxJsonData.nodes.find(n => n.id == id)?.part || "undefined"
    }

    private onCellClick(d: JSONGraphNode) {
        if (!!d.cell_id) {
            this.commands.execute(CommandIDs.dashboardScrollToCell, {
                from: 'Visu',
                source: 'DAGComponent',
                cell_id: d.cell_id[0]
            });
        }
    }

    private onPartHover(d: string, ellipse: SVGEllipseElement) {
        /* Hide the activity of each parts when hovering them */
        if (this.aPartIsSelected) {
            return;
        }
        const d3Ellipse = d3.select(ellipse);
        d3Ellipse
            .attr("fill-opacity", "0")
        this.partsEdges.filter(e => this.filterEdgesOfPart(e, d, true))
            .attr("stroke-opacity", 1)
            .attr("stroke-width", 5);
        this.cellNodes.filter(n => this.filterNodesOfPart(n, d))
            .style("visibility", "visible");
        this.cellsEdges.filter(edge => this.filterEdgesOfPart(edge, d))
            .style("visibility", "visible");
    }

    private onPartLeave(d: string, ellipse: SVGEllipseElement) {
        /* Show the activity of each parts when leaving them */
        if (this.aPartIsSelected) {
            return;
        }
        d3.select(ellipse)
            .attr("fill-opacity", (e) => this.levelShown === ShowLevel.CELL ? "0" : "1")
        this.partsEdges.filter(e => this.filterEdgesOfPart(e, d, true))
            .attr("stroke-opacity", 1)
            .attr("stroke-width", 1);
        this.cellNodes.filter(n => this.filterNodesOfPart(n, d))
            .style("visibility", (n) => this.levelShown === ShowLevel.CELL ? "visible" : "hidden")
        this.cellsEdges.filter(edge => this.filterEdgesOfPart(edge, d))
            .style("visibility", (e) => this.levelShown === ShowLevel.CELL ? "visible" : "hidden");
    }

    private onPartClick(d: string, ellipse: SVGEllipseElement) {
        /* Zoom in to a part when clicking them */
        if (!this.aPartIsSelected) {
            this.aPartIsSelected = true;
            const viewBox = this.svg.attr("viewBox").split(",").map(Number);
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
            this.mainG.transition()
                .duration(450)
                .call(
                    // @ts-ignore
                    this.zoom.transform,
                    d3.zoomIdentity
                        .translate(translate[0], translate[1])
                        .scale(scale)
                );
            d3.select(ellipse).attr("class", "");
        } else {
            this.aPartIsSelected = false;
            this.mainG.transition()
                .duration(450)
                .call(
                    // @ts-ignore
                    this.zoom.transform,
                    d3.zoomIdentity
                );
            d3.select(ellipse).attr("class", "cursor-pointer");
        }
    }
}
