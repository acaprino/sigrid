// The `./graph` entry of the package: a canvas for a graph, to move over, open, close and draw, and the key of its
// lines. It is apart from the main entry so an app without a graph does not load React Flow or dagre. Its stylesheet
// is `./graph.css`.
export { GraphCanvas, layoutGraph, visibleGraph, type Graph, type GraphCanvasHandle, type GraphCanvasProps, type GraphChange, type GraphEdge, type GraphNode } from './assemblies/GraphCanvas'
export { GraphLegend, type GraphLegendEntry, type GraphLegendProps } from './assemblies/GraphLegend'
