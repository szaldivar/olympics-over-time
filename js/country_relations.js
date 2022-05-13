const NODE_RADIUS = 10;

const MARKER_SIZE = 10;

const height = 1500;
const width = 1500;

const BASE_WAIT = 1000;

const STEPS = 200;

const DISTANCE_LIMIT = 220;

let showText = false;

const disableButtons = (b1, b2, b3, b4) => {
  b1.setAttribute("disabled", null);
  b2.setAttribute("disabled", null);
  b3.setAttribute("disabled", null);
  b4.setAttribute("disabled", null);
};
const enableButtons = (b1, b2, b3, b4) => {
  b1.removeAttribute("disabled");
  b2.removeAttribute("disabled");
  b3.removeAttribute("disabled");
  b4.removeAttribute("disabled");
};
const removePressed = (b1, b2, b3, b4) => {
  b1.classList.remove("pressed");
  b2.classList.remove("pressed");
  b3.classList.remove("pressed");
  b4.classList.remove("pressed");
};

const getDistance = (x1, y1, x2, y2) => {
  let x = x1 - x2;
  let y = y1 - y2;
  return Math.sqrt(x * x + y * y);
};

const createSVG = (nodes, countryCodes, initPositions) => {
  let nodeMap = new Map();
  for (let node of nodes) {
    let initNode = initPositions.get(node.id);
    let x = initNode.x;
    let y = initNode.y;
    let scale = initNode.scale;
    if (node.id === "Individual Olympic Athletes") {
      nodeMap.set(node.id, {
        ...node,
        x,
        y,
        scale,
        renderFlag: false,
      });
    } else {
      nodeMap.set(node.id, {
        ...node,
        x,
        y,
        scale,
        renderFlag: true,
      });
    }
  }
  let newNodes = nodes.map((n) => {
    let nodePastPos = nodeMap.get(n.id);
    return { ...nodePastPos };
  });

  const svg = d3
    .create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .style("font", "12px sans-serif")
    .style("height", "100vh");
  let arrowMarkers = svg
    .append("defs")
    .selectAll("marker")
    .data(nodes)
    .join("marker")
    .attr("id", (d) => `arrow-${d.id}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", (d) => -NODE_RADIUS * nodeMap.get(d.id).scale)
    .attr("refY", 0)
    .attr("markerWidth", MARKER_SIZE)
    .attr("markerHeight", MARKER_SIZE)
    .attr("orient", "auto");
  arrowMarkers.append("path").attr("fill", "gray").attr("d", "M10,-5L0,0L10,5");
  svg
    .append("defs")
    .selectAll("pattern")
    .data(
      nodes.map((node) => {
        let r = NODE_RADIUS * 1.4;
        let baseH = r * 2;
        let w = (baseH * 4) / 3;
        if (countryCodes[node.id] === undefined)
          return {
            id: node.id,
            url: null,
            h: baseH,
            w: w,
            x: -w / 2,
            y: -r,
          };
        return {
          id: node.id,
          url: `https://flagcdn.com/w40/${countryCodes[node.id]}.jpg`,
          h: baseH,
          w: w,
          x: -w / 2,
          y: -r,
        };
      })
    )
    .join("pattern")
    .attr("id", (d) => d.id)
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("height", (d) => d.h)
    .attr("width", (d) => d.w)
    .attr("patternUnits", "userSpaceOnUse")
    .append("image")
    .attr("href", (d) => (d.url ? d.url : null))
    .attr("height", (d) => d.h)
    .attr("width", (d) => d.w)
    .attr("cx", 0)
    .attr("cy", 0);
  let link = svg
    .append("g")
    .attr("stroke", "gray")
    .selectAll("line")
    .data([])
    .join("line");

  let node = svg
    .append("g")
    .attr("fill", "currentColor")
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .selectAll("g")
    .data(newNodes)
    .join("g")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);
  node
    .append("circle")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("r", NODE_RADIUS)
    .attr("transform", (d) => `scale(${nodeMap.get(d.id).scale})`)
    .attr("fill", (d) => (d.renderFlag ? `url("#${d.id}")` : "black"));
  node
    .append("text")
    .attr("x", (d) => nodeMap.get(d.id).scale * NODE_RADIUS + 1)
    .attr("y", "0.31em")
    .text((d) => d.id)
    .attr("style", showText ? null : "display: none")
    .clone(true)
    .lower()
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 3);

  return [svg, link, node, nodeMap, arrowMarkers];
};

(async () => {
  let graph = await d3.json("../data/output.json");
  let countryCodes = await d3.json("../data/to_code.json");
  let positionsMaps = [];
  for (let timeserie of graph.timeseries) {
    let map = new Map();
    for (let country of timeserie.positions) {
      country.scale = Math.log10(country.outdegree + 1) + 1;
      map.set(country.id, country);
    }
    positionsMaps.push(map);
  }
  let [svg, links, nodes, nodesMap, arrowMarkers] = createSVG(
    graph.nodes,
    countryCodes,
    positionsMaps[0]
  );
  const draw = () => {
    links
      .attr("x1", (d) => nodesMap.get(d.source).x)
      .attr("y1", (d) => nodesMap.get(d.source).y)
      .attr("x2", (d) => nodesMap.get(d.target).x)
      .attr("y2", (d) => nodesMap.get(d.target).y)
      .attr("style", (d) => {
        let source = nodesMap.get(d.source);
        let target = nodesMap.get(d.target);
        let distance = getDistance(source.x, source.y, target.x, target.y);
        if (distance > DISTANCE_LIMIT) return "display:none;";
        return null;
      });
    nodes.attr(
      "transform",
      (d) => `translate(${nodesMap.get(d.id).x},${nodesMap.get(d.id).y})`
    );
    nodes
      .selectAll("circle")
      .attr("transform", (d) => `scale(${nodesMap.get(d.id).scale})`);
    nodes
      .selectAll("text")
      .attr("x", (d) => NODE_RADIUS * nodesMap.get(d.id).scale + 1);
    arrowMarkers.attr("refX", (d) => -NODE_RADIUS * nodesMap.get(d.id).scale);
  };
  let from = 0;
  const interpolate = (from, to) => {
    let newLinks = graph.timeseries[to].links;
    links = links
      .data(newLinks)
      .join("line")
      .attr(
        "marker-start",
        (d) => `url(${new URL(`#arrow-${d.source}`, location)})`
      );
    iter(from, to);
  };
  const iter = (from, to, index = 0) => {
    if (index === STEPS) {
      moveTo(to);
      enableButtons(button1, button2, button3, button4);
      return;
    }
    setTimeout(() => iter(from, to, index + 1), 25);
    for (let node of graph.nodes) {
      let country = node.id;
      let posFrom = positionsMaps[from].get(country);
      let posTo = positionsMaps[to].get(country);
      let x = posFrom.x + ((posTo.x - posFrom.x) / STEPS) * index;
      let y = posFrom.y + ((posTo.y - posFrom.y) / STEPS) * index;
      let scale =
        posFrom.scale + ((posTo.scale - posFrom.scale) / STEPS) * index;
      nodesMap.set(country, { id: country, x, y, r: posFrom.r, scale });
    }
    draw();
  };
  const moveTo = (to) => {
    let newLinks = graph.timeseries[to].links;
    links = links
      .data(newLinks)
      .join("line")
      .attr(
        "marker-start",
        (d) => `url(${new URL(`#arrow-${d.source}`, location)})`
      );
    for (let country of nodesMap.keys()) {
      nodesMap.set(country, positionsMaps[to].get(country));
    }
    draw();
  };
  let graphDiv = document.getElementById("graph");
  let svgNode = svg.node();
  graphDiv.appendChild(svgNode);
  var button1 = document.getElementById("step-1");
  var button2 = document.getElementById("step-2");
  var button3 = document.getElementById("step-3");
  var button4 = document.getElementById("step-4");
  button1.onclick = () => {
    let to = 0;
    if (to !== from) {
      disableButtons(button1, button2, button3, button4);
      removePressed(button1, button2, button3, button4);
      button1.classList.add("pressed");
      interpolate(from, to);
      from = to;
    }
  };
  button2.onclick = () => {
    let to = 1;
    if (to !== from) {
      disableButtons(button1, button2, button3, button4);
      removePressed(button1, button2, button3, button4);
      button2.classList.add("pressed");
      interpolate(from, to);
      from = to;
    }
  };
  button3.onclick = () => {
    let to = 2;
    if (to !== from) {
      disableButtons(button1, button2, button3, button4);
      removePressed(button1, button2, button3, button4);
      button3.classList.add("pressed");
      interpolate(from, to);
      from = to;
    }
  };
  button4.onclick = () => {
    let to = 3;
    if (to !== from) {
      disableButtons(button1, button2, button3, button4);
      removePressed(button1, button2, button3, button4);
      button4.classList.add("pressed");
      interpolate(from, to);
      from = to;
    }
  };
  const show_text = document.getElementById("show_text");
  show_text.addEventListener("input", () => {
    showText = show_text.checked;
    nodes.selectAll("text").attr("style", showText ? null : "display: none");
  });
  moveTo(0);
})();
