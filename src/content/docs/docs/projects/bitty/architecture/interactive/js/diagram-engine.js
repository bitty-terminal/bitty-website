/**
 * Bitty Interactive Architecture Diagram Engine
 * High-performance dependency-free 2D canvas interactive diagram renderer.
 * Runs completely offline with full interactivity and no external libraries.
 */

(function (global) {
  "use strict";

  class DiagramEngine {
    constructor(options) {
      this.containerId = options.containerId || "canvas-container";
      this.container = document.getElementById(this.containerId);
      if (!this.container) {
        throw new Error(`Container element #${this.containerId} not found.`);
      }

      this.data = options.data || {
        nodes: [],
        edges: [],
        groups: [],
        flows: [],
      };
      this.isFlowDiagram = !!(
        options.isFlow ||
        (this.data.flows && this.data.flows.length > 0)
      );
      this.title = options.title || "Architecture Diagram";
      this.level = options.level || "L1";

      // Viewport state
      this.scale = 1.0;
      this.minScale = 0.2;
      this.maxScale = 3.5;
      this.panX = 0;
      this.panY = 0;
      this.isPanning = false;
      this.startPan = { x: 0, y: 0 };

      // Interaction state
      this.selectedNode = null;
      this.selectedEdge = null;
      this.hoveredNode = null;
      this.hoveredEdge = null;
      this.draggedNode = null;
      this.dragOffset = { x: 0, y: 0 };
      this.activeFilter = "all";
      this.searchQuery = "";

      // Flow state
      this.currentFlowStep = -1;
      this.isPlayingFlow = false;
      this.flowTimer = null;
      this.flowSpeed = 2000;

      // Theme
      this.theme = localStorage.getItem("bitty-diagram-theme") || "dark";
      document.documentElement.setAttribute("data-theme", this.theme);

      // Create Canvas
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.container.appendChild(this.canvas);

      // Create Tooltip
      this.tooltip = document.createElement("div");
      this.tooltip.className = "canvas-tooltip";
      this.container.appendChild(this.tooltip);

      // DOM UI references
      this.inspectorDrawer = document.getElementById("inspector-drawer");
      this.zoomDisplay = document.getElementById("zoom-level");
      this.flowCounter = document.getElementById("flow-counter");
      this.flowDesc = document.getElementById("flow-description");

      this.initEvents();
      this.resize();
      this.fitToScreen();
      this.render();

      // Start animation loop for smooth interaction & flow particles
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    resize() {
      const rect = this.container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    fitToScreen() {
      if (!this.data.nodes || this.data.nodes.length === 0) return;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const allItems = [...(this.data.groups || []), ...this.data.nodes];
      for (const item of allItems) {
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + item.width);
        maxY = Math.max(maxY, item.y + item.height);
      }

      // Balanced margin for controls and legend box
      const padX = 80;
      const padY = 70;
      const graphWidth = maxX - minX + padX * 2;
      const graphHeight = maxY - minY + padY * 2;
      const scaleX = this.width / graphWidth;
      const scaleY = this.height / graphHeight;
      this.scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.15);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      this.panX = this.width / 2 - centerX * this.scale;
      this.panY = this.height / 2 - centerY * this.scale;

      this.updateZoomDisplay();
    }

    centerOnNode(node) {
      if (!node) return;
      const drawerOpen =
        this.inspectorDrawer && this.inspectorDrawer.classList.contains("open");
      const visibleWidth = drawerOpen ? this.width - 360 : this.width;
      const targetPanX =
        visibleWidth / 2 - (node.x + node.width / 2) * this.scale;
      const targetPanY =
        this.height / 2 - (node.y + node.height / 2) * this.scale;
      this.panX = targetPanX;
      this.panY = targetPanY;
      this.render();
    }

    calculateLuminance(color) {
      if (!color) return 0;
      if (color.startsWith("#")) {
        let hex = color.slice(1);
        if (hex.length === 3) {
          hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
        }
        if (hex.length >= 6) {
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
      } else if (color.startsWith("rgb")) {
        const match = color.match(/\d+(\.\d+)?/g);
        if (match && match.length >= 3) {
          const r = parseFloat(match[0]) / 255;
          const g = parseFloat(match[1]) / 255;
          const b = parseFloat(match[2]) / 255;
          const a = match[3] !== undefined ? parseFloat(match[3]) : 1;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          return lum * a + 0.1 * (1 - a);
        }
      }
      return 0;
    }

    updateZoomDisplay() {
      if (this.zoomDisplay) {
        this.zoomDisplay.textContent = `${Math.round(this.scale * 100)}%`;
      }
    }

    screenToWorld(sx, sy) {
      return {
        x: (sx - this.panX) / this.scale,
        y: (sy - this.panY) / this.scale,
      };
    }

    worldToScreen(wx, wy) {
      return {
        x: wx * this.scale + this.panX,
        y: wy * this.scale + this.panY,
      };
    }

    initEvents() {
      window.addEventListener("resize", () => {
        this.resize();
        this.render();
      });

      // Legend collapsible toggle
      const legendTitle = document.querySelector(".legend-title");
      if (legendTitle) {
        legendTitle.addEventListener("click", () => {
          const box = document.querySelector(".legend-box");
          if (box) box.classList.toggle("collapsed");
        });
      }

      // Panning and node dragging
      this.canvas.addEventListener("mousedown", (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const world = this.screenToWorld(mx, my);

        // Check node click for dragging
        const hitNode = this.hitTestNode(world.x, world.y);
        if (hitNode && e.button === 0) {
          this.draggedNode = hitNode;
          this.dragOffset = {
            x: world.x - hitNode.x,
            y: world.y - hitNode.y,
          };
          this.selectNode(hitNode);
          return;
        }

        // Check edge click
        const hitEdge = this.hitTestEdge(world.x, world.y);
        if (hitEdge && e.button === 0) {
          this.selectEdge(hitEdge);
          return;
        }

        // Otherwise background pan
        this.isPanning = true;
        this.startPan = { x: mx - this.panX, y: my - this.panY };
        this.container.classList.add("panning");
      });

      window.addEventListener("mousemove", (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const world = this.screenToWorld(mx, my);

        if (this.draggedNode) {
          this.draggedNode.x = world.x - this.dragOffset.x;
          this.draggedNode.y = world.y - this.dragOffset.y;
          this.render();
          return;
        }

        if (this.isPanning) {
          this.panX = mx - this.startPan.x;
          this.panY = my - this.startPan.y;
          this.render();
          return;
        }

        // Hover test
        const hitNode = this.hitTestNode(world.x, world.y);
        const hitEdge = hitNode ? null : this.hitTestEdge(world.x, world.y);

        if (hitNode !== this.hoveredNode || hitEdge !== this.hoveredEdge) {
          this.hoveredNode = hitNode;
          this.hoveredEdge = hitEdge;
          this.canvas.style.cursor = hitNode || hitEdge ? "pointer" : "grab";
          this.updateTooltip(e.clientX, e.clientY);
          this.render();
        } else if (this.hoveredNode || this.hoveredEdge) {
          this.updateTooltip(e.clientX, e.clientY);
        }
      });

      window.addEventListener("mouseup", () => {
        if (this.isPanning) {
          this.isPanning = false;
          this.container.classList.remove("panning");
        }
        this.draggedNode = null;
      });

      // Mouse wheel zoom to cursor
      this.canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const rect = this.canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;

          const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
          const newScale = Math.min(
            Math.max(this.scale * zoomFactor, this.minScale),
            this.maxScale,
          );

          // Zoom relative to pointer position
          this.panX = mx - (mx - this.panX) * (newScale / this.scale);
          this.panY = my - (my - this.panY) * (newScale / this.scale);
          this.scale = newScale;

          this.updateZoomDisplay();
          this.render();
        },
        { passive: false },
      );

      // Click background to deselect
      this.canvas.addEventListener("click", (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const world = this.screenToWorld(mx, my);

        const hitNode = this.hitTestNode(world.x, world.y);
        const hitEdge = this.hitTestEdge(world.x, world.y);

        if (!hitNode && !hitEdge) {
          this.deselectAll();
        }
      });
    }

    hitTestNode(wx, wy) {
      if (!this.data.nodes) return null;
      for (let i = this.data.nodes.length - 1; i >= 0; i--) {
        const n = this.data.nodes[i];
        if (
          wx >= n.x &&
          wx <= n.x + n.width &&
          wy >= n.y &&
          wy <= n.y + n.height
        ) {
          return n;
        }
      }
      return null;
    }

    hitTestEdge(wx, wy) {
      if (!this.data.edges) return null;
      const threshold = 8;
      for (const edge of this.data.edges) {
        const fromNode = this.getNode(edge.from);
        const toNode = this.getNode(edge.to);
        if (!fromNode || !toNode) continue;

        const p1 = this.getNodeCenter(fromNode);
        const p2 = this.getNodeCenter(toNode);
        const dist = this.pointToSegmentDist(wx, wy, p1.x, p1.y, p2.x, p2.y);
        if (dist <= threshold) {
          return edge;
        }
      }
      return null;
    }

    pointToSegmentDist(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    getNode(id) {
      return this.data.nodes.find((n) => n.id === id);
    }

    getNodeCenter(node) {
      return {
        x: node.x + node.width / 2,
        y: node.y + node.height / 2,
      };
    }

    selectNode(node) {
      this.selectedNode = node;
      this.selectedEdge = null;
      this.openInspector(node, "node");
      this.render();
    }

    selectEdge(edge) {
      this.selectedEdge = edge;
      this.selectedNode = null;
      this.openInspector(edge, "edge");
      this.render();
    }

    deselectAll() {
      this.selectedNode = null;
      this.selectedEdge = null;
      this.closeInspector();
      this.render();
    }

    openInspector(item, kind) {
      if (!this.inspectorDrawer) return;

      const titleEl = document.getElementById("inspector-title");
      const typeEl = document.getElementById("inspector-type");
      const bodyEl = document.getElementById("inspector-body");

      if (kind === "node") {
        titleEl.textContent = item.label || item.id;
        typeEl.textContent = `${item.kind || "Node"} • ${item.layer || "Subsystem"}`;

        const incoming = (this.data.edges || []).filter(
          (e) => e.to === item.id,
        );
        const outgoing = (this.data.edges || []).filter(
          (e) => e.from === item.id,
        );

        bodyEl.innerHTML = `
          <div class="inspector-section-title">Identity & Metadata</div>
          <div class="inspector-prop-card">
            <div class="inspector-prop-row"><span class="inspector-prop-label">ID:</span><span class="inspector-prop-value">${item.id}</span></div>
            ${item.crate ? `<div class="inspector-prop-row"><span class="inspector-prop-label">Crate:</span><span class="inspector-prop-value">${item.crate}</span></div>` : ""}
            ${item.level ? `<div class="inspector-prop-row"><span class="inspector-prop-label">Level:</span><span class="inspector-prop-value">${item.level}</span></div>` : ""}
            ${item.shape ? `<div class="inspector-prop-label" style="display:flex;justify-content:space-between;width:100%"><span class="inspector-prop-label">Contract:</span><span class="inspector-prop-value">${item.shape}</span></div>` : ""}
          </div>

          <div class="inspector-section-title">Architectural Description</div>
          <div class="inspector-text-block">${item.desc || item.meta?.desc || "Core architectural component of the Bitty terminal platform."}</div>

          ${
            item.invariants
              ? `
            <div class="inspector-section-title">Invariants & Boundaries</div>
            <div class="inspector-text-block" style="border-left: 3px solid var(--accent-amber);">${item.invariants}</div>
          `
              : ""
          }

          ${
            item.rfc
              ? `
            <div class="inspector-section-title">Normative Specifications</div>
            <div class="inspector-prop-card">
              <div class="inspector-prop-row"><span class="inspector-prop-label">Spec / ADR:</span><span class="inspector-prop-value">${item.rfc}</span></div>
            </div>
          `
              : ""
          }

          <div class="inspector-section-title">Connections</div>
          <div class="inspector-links-list">
            ${incoming
              .map(
                (e) => `
              <div class="inspector-link-item" onclick="window.engine.selectEdgeById('${e.from}', '${e.to}')">
                <span>← <strong>${e.from}</strong>: ${e.label || "calls"}</span>
              </div>
            `,
              )
              .join("")}
            ${outgoing
              .map(
                (e) => `
              <div class="inspector-link-item" onclick="window.engine.selectEdgeById('${e.from}', '${e.to}')">
                <span>→ <strong>${e.to}</strong>: ${e.label || "calls"}</span>
              </div>
            `,
              )
              .join("")}
            ${incoming.length === 0 && outgoing.length === 0 ? `<div style="color:var(--text-muted);font-size:12px">No direct connections defined.</div>` : ""}
          </div>
        `;
      } else if (kind === "edge") {
        titleEl.textContent = `${item.from} → ${item.to}`;
        typeEl.textContent = item.dashed
          ? "Async Event / Notification"
          : "Direct Call / Dependency";

        bodyEl.innerHTML = `
          <div class="inspector-section-title">Edge Properties</div>
          <div class="inspector-prop-card">
            <div class="inspector-prop-row"><span class="inspector-prop-label">Source:</span><span class="inspector-prop-value">${item.from}</span></div>
            <div class="inspector-prop-row"><span class="inspector-prop-label">Target:</span><span class="inspector-prop-value">${item.to}</span></div>
            <div class="inspector-prop-row"><span class="inspector-prop-label">Payload / Action:</span><span class="inspector-prop-value">${item.label || "Invoke"}</span></div>
            <div class="inspector-prop-row"><span class="inspector-prop-label">Semantics:</span><span class="inspector-prop-value">${item.dashed ? "Dashed (Async/Event)" : "Solid (Strict Call/Dep)"}</span></div>
          </div>

          <div class="inspector-section-title">Contract Description</div>
          <div class="inspector-text-block">${item.desc || `Data and control flow from ${item.from} to ${item.to}. Adheres to Bitty strict DAG and non-inversion rules.`}</div>
        `;
      }

      this.inspectorDrawer.classList.add("open");
    }

    closeInspector() {
      if (this.inspectorDrawer) {
        this.inspectorDrawer.classList.remove("open");
      }
    }

    selectEdgeById(from, to) {
      const edge = (this.data.edges || []).find(
        (e) => e.from === from && e.to === to,
      );
      if (edge) {
        this.selectEdge(edge);
      }
    }

    updateTooltip(clientX, clientY) {
      if (!this.hoveredNode && !this.hoveredEdge) {
        this.tooltip.style.display = "none";
        return;
      }

      const rect = this.container.getBoundingClientRect();
      const x = clientX - rect.left + 15;
      const y = clientY - rect.top + 15;

      if (this.hoveredNode) {
        this.tooltip.innerHTML = `<strong>${this.hoveredNode.label || this.hoveredNode.id}</strong><br><span style="color:#94a3b8;font-size:10px">${this.hoveredNode.kind || "Node"} • ${this.hoveredNode.layer || "Subsystem"}</span>`;
      } else if (this.hoveredEdge) {
        this.tooltip.innerHTML = `<strong>${this.hoveredEdge.from} → ${this.hoveredEdge.to}</strong><br><span style="color:#94a3b8;font-size:10px">${this.hoveredEdge.label || "Connection"}</span>`;
      }

      this.tooltip.style.left = `${x}px`;
      this.tooltip.style.top = `${y}px`;
      this.tooltip.style.display = "block";
    }

    setFilter(filter) {
      this.activeFilter = filter;
      document.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.filter === filter);
      });
      this.render();
    }

    setSearch(query) {
      this.searchQuery = (query || "").trim().toLowerCase();
      this.render();
    }

    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", this.theme);
      localStorage.setItem("bitty-diagram-theme", this.theme);
      this.render();
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }

    // Flow Simulation Stepper Methods
    setFlowStep(stepIndex) {
      if (!this.data.flows || this.data.flows.length === 0) return;
      const count = this.data.flows.length;
      this.currentFlowStep = Math.max(-1, Math.min(stepIndex, count - 1));

      if (this.flowCounter) {
        this.flowCounter.textContent =
          this.currentFlowStep >= 0
            ? `${this.currentFlowStep + 1} / ${count}`
            : `Step 0 / ${count}`;
      }

      if (this.flowDesc) {
        const step = this.data.flows[this.currentFlowStep];
        this.flowDesc.textContent = step
          ? step.text
          : "Press Play or Next to simulate execution flow";
      }

      if (this.currentFlowStep >= 0) {
        const step = this.data.flows[this.currentFlowStep];
        if (step.focusNode) {
          const node = this.getNode(step.focusNode);
          if (node) {
            this.selectedNode = node;
            if (
              this.inspectorDrawer &&
              this.inspectorDrawer.classList.contains("open")
            ) {
              this.updateInspector(node, "node");
            }
          }
        }
      }

      this.render();
    }

    nextFlowStep() {
      if (!this.data.flows || this.data.flows.length === 0) return;
      let next = this.currentFlowStep + 1;
      if (next >= this.data.flows.length) next = 0;
      this.setFlowStep(next);
    }

    prevFlowStep() {
      if (!this.data.flows || this.data.flows.length === 0) return;
      let prev = this.currentFlowStep - 1;
      if (prev < 0) prev = this.data.flows.length - 1;
      this.setFlowStep(prev);
    }

    toggleFlowPlay() {
      this.isPlayingFlow = !this.isPlayingFlow;
      const playBtn = document.getElementById("flow-play-btn");
      if (playBtn) {
        playBtn.innerHTML = this.isPlayingFlow ? "⏸" : "▶";
      }

      if (this.isPlayingFlow) {
        if (
          this.currentFlowStep === -1 ||
          this.currentFlowStep >= this.data.flows.length - 1
        ) {
          this.setFlowStep(0);
        }
        this.flowTimer = setInterval(() => {
          if (this.currentFlowStep < this.data.flows.length - 1) {
            this.nextFlowStep();
          } else {
            this.toggleFlowPlay();
          }
        }, this.flowSpeed);
      } else {
        if (this.flowTimer) {
          clearInterval(this.flowTimer);
          this.flowTimer = null;
        }
      }
    }

    exportPNG() {
      const link = document.createElement("a");
      link.download = `${this.title.replace(/\s+/g, "_").toLowerCase()}.png`;
      link.href = this.canvas.toDataURL("image/png");
      link.click();
    }

    exportSVG() {
      // Generate clean vector SVG from current diagram state
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const allItems = [...(this.data.groups || []), ...this.data.nodes];
      for (const item of allItems) {
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + item.width);
        maxY = Math.max(maxY, item.y + item.height);
      }

      const padding = 40;
      const w = maxX - minX + padding * 2;
      const h = maxY - minY + padding * 2;

      let svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX - padding} ${minY - padding} ${w} ${h}">\n`;
      svg += `  <style>\n    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }\n  </style>\n`;
      svg += `  <rect x="${minX - padding}" y="${minY - padding}" width="${w}" height="${h}" fill="${this.theme === "dark" ? "#0f172a" : "#f8fafc"}" />\n`;

      // Groups
      for (const g of this.data.groups || []) {
        svg += `  <rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" fill="${g.fill || "none"}" stroke="${g.stroke || "#475569"}" stroke-width="1.5" stroke-dasharray="${g.dashed ? "4,4" : "none"}" rx="8" />\n`;
        svg += `  <text x="${g.x + 12}" y="${g.y + 22}" fill="${this.theme === "dark" ? "#94a3b8" : "#475569"}" font-size="12" font-weight="bold">${g.label || ""}</text>\n`;
      }

      // Edges
      for (const edge of this.data.edges || []) {
        const from = this.getNode(edge.from);
        const to = this.getNode(edge.to);
        if (!from || !to) continue;
        const p1 = this.getNodeCenter(from);
        const p2 = this.getNodeCenter(to);
        svg += `  <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${edge.stroke || (this.theme === "dark" ? "#38bdf8" : "#0284c7")}" stroke-width="1.5" stroke-dasharray="${edge.dashed ? "4,4" : "none"}" />\n`;
      }

      // Nodes
      for (const n of this.data.nodes) {
        const rx = n.shape === "rounded" ? 8 : 4;
        const fill = n.fill || (this.theme === "dark" ? "#1e293b" : "#ffffff");
        const lum = this.calculateLuminance(fill);
        const textFill = lum > 0.45 ? "#0f172a" : "#f8fafc";
        svg += `  <rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${n.stroke || "#38bdf8"}" stroke-width="1.5" rx="${rx}" />\n`;
        svg += `  <text x="${n.x + n.width / 2}" y="${n.y + n.height / 2 + 4}" fill="${textFill}" font-size="12" font-weight="600" text-anchor="middle">${n.label || n.id}</text>\n`;
      }

      svg += `</svg>`;

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const link = document.createElement("a");
      link.download = `${this.title.replace(/\s+/g, "_").toLowerCase()}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }

    animate(time) {
      this.time = time;
      // If there are animations (flows or animated pulse), re-render
      if (this.isFlowDiagram || this.selectedNode || this.hoveredNode) {
        this.render();
      }
      requestAnimationFrame(this.animate);
    }

    render() {
      const ctx = this.ctx;
      const isDark = this.theme === "dark";

      ctx.clearRect(0, 0, this.width, this.height);

      ctx.save();
      ctx.translate(this.panX, this.panY);
      ctx.scale(this.scale, this.scale);

      // 1. Draw Groups / Trust Boundaries
      if (this.data.groups) {
        for (const g of this.data.groups) {
          if (
            this.activeFilter !== "all" &&
            g.layer &&
            g.layer !== this.activeFilter
          )
            continue;

          ctx.save();
          ctx.beginPath();
          this.roundRect(ctx, g.x, g.y, g.width, g.height, 10);
          ctx.fillStyle =
            g.fill ||
            (isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(241, 245, 249, 0.6)");
          ctx.fill();

          ctx.strokeStyle = g.stroke || (isDark ? "#475569" : "#94a3b8");
          ctx.lineWidth = 1.5;
          if (g.dashed) {
            ctx.setLineDash([6, 4]);
          }
          ctx.stroke();
          ctx.restore();

          // Group Label
          if (g.label) {
            ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
            ctx.font =
              "bold 12px " + getComputedStyle(document.body).fontFamily;
            ctx.fillText(g.label, g.x + 14, g.y + 24);
          }
        }
      }

      // 2. Draw Edges
      if (this.data.edges) {
        for (const edge of this.data.edges) {
          this.renderEdge(ctx, edge, isDark);
        }
      }

      // 3. Draw Nodes
      if (this.data.nodes) {
        for (const node of this.data.nodes) {
          this.renderNode(ctx, node, isDark);
        }
      }

      ctx.restore();
    }

    renderEdge(ctx, edge, isDark) {
      const fromNode = this.getNode(edge.from);
      const toNode = this.getNode(edge.to);
      if (!fromNode || !toNode) return;

      const isSelected = this.selectedEdge === edge;
      const isHovered = this.hoveredEdge === edge;
      const isConnected =
        this.selectedNode &&
        (edge.from === this.selectedNode.id ||
          edge.to === this.selectedNode.id);

      // Flow highlighting
      let isFlowActive = false;
      if (this.isFlowDiagram && this.currentFlowStep >= 0 && this.data.flows) {
        const step = this.data.flows[this.currentFlowStep];
        if (
          step.activeEdge &&
          step.activeEdge[0] === edge.from &&
          step.activeEdge[1] === edge.to
        ) {
          isFlowActive = true;
        }
      }

      ctx.save();
      const p1 = this.getNodeEdgePoint(fromNode, toNode);
      const p2 = this.getNodeEdgePoint(toNode, fromNode);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      // Draw curved or direct line
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const isCurved = Math.abs(dx) > 35 && Math.abs(dy) > 35;

      let cx1 = p1.x;
      let cy1 = p1.y;
      let cx2 = p2.x;
      let cy2 = p2.y;

      if (isCurved) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          cx1 = p1.x + dx * 0.5;
          cy1 = p1.y;
          cx2 = p1.x + dx * 0.5;
          cy2 = p2.y;
        } else {
          cx1 = p1.x;
          cy1 = p1.y + dy * 0.5;
          cx2 = p2.x;
          cy2 = p1.y + dy * 0.5;
        }
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, p2.x, p2.y);
      } else {
        ctx.lineTo(p2.x, p2.y);
      }

      let strokeColor = edge.stroke || (isDark ? "#38bdf8" : "#0284c7");
      let lineWidth = 1.6;

      if (isFlowActive) {
        strokeColor = "#fbbf24";
        lineWidth = 3.0;
      } else if (isSelected || isConnected) {
        strokeColor = "#38bdf8";
        lineWidth = 2.8;
      } else if (isHovered) {
        strokeColor = "#67e8f9";
        lineWidth = 2.4;
      } else if (this.selectedNode && !isConnected) {
        strokeColor = isDark
          ? "rgba(71, 85, 105, 0.3)"
          : "rgba(203, 213, 225, 0.4)";
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;

      if (edge.dashed) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.stroke();

      // Arrowhead
      this.drawArrowhead(ctx, p1, p2, strokeColor, isCurved, cx2, cy2);

      // Edge Label
      if (edge.label) {
        const dist = Math.hypot(dx, dy);
        if (dist >= 55 || isSelected || isHovered || isFlowActive) {
          let midX, midY;
          if (isCurved) {
            midX = (p1.x + 3 * cx1 + 3 * cx2 + p2.x) / 8;
            midY = (p1.y + 3 * cy1 + 3 * cy2 + p2.y) / 8;
          } else {
            midX = (p1.x + p2.x) / 2;
            midY = (p1.y + p2.y) / 2;
          }

          ctx.font = "500 10.5px " + getComputedStyle(document.body).fontFamily;
          const textWidth = ctx.measureText(edge.label).width;
          const padH = 6;
          const pillW = textWidth + padH * 2;
          const pillH = 18;

          ctx.save();
          ctx.beginPath();
          this.roundRect(
            ctx,
            midX - pillW / 2,
            midY - pillH / 2,
            pillW,
            pillH,
            6,
          );
          ctx.fillStyle = isDark
            ? "rgba(15, 23, 42, 0.92)"
            : "rgba(255, 255, 255, 0.95)";
          ctx.fill();
          ctx.strokeStyle =
            isSelected || isHovered
              ? strokeColor
              : isDark
                ? "rgba(71, 85, 105, 0.6)"
                : "rgba(203, 213, 225, 0.8)";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle =
            isSelected || isHovered
              ? isDark
                ? "#f1f5f9"
                : "#0f172a"
              : isDark
                ? "#94a3b8"
                : "#475569";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(edge.label, midX, midY);
          ctx.restore();
        }
      }

      // Flow particle animation
      if (isFlowActive && this.time) {
        const t = (this.time % 1500) / 1500;
        const px = p1.x + dx * t;
        const py = p1.y + dy * t;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      ctx.restore();
    }

    drawArrowhead(ctx, p1, p2, color, isCurved, cx2, cy2) {
      let angle;
      if (
        isCurved &&
        cx2 !== undefined &&
        cy2 !== undefined &&
        (cx2 !== p2.x || cy2 !== p2.y)
      ) {
        angle = Math.atan2(p2.y - cy2, p2.x - cx2);
      } else {
        angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      }
      const headlen = 8;

      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - headlen * Math.cos(angle - Math.PI / 6),
        p2.y - headlen * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        p2.x - headlen * Math.cos(angle + Math.PI / 6),
        p2.y - headlen * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    getNodeEdgePoint(fromNode, toNode) {
      const c1 = this.getNodeCenter(fromNode);
      const c2 = this.getNodeCenter(toNode);
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;

      // Intersect with box borders
      const hw = fromNode.width / 2;
      const hh = fromNode.height / 2;

      if (Math.abs(dx) * hh > Math.abs(dy) * hw) {
        return {
          x: c1.x + (dx > 0 ? hw : -hw),
          y: c1.y + dy * (hw / Math.abs(dx)),
        };
      } else {
        return {
          x: c1.x + dx * (hh / Math.abs(dy)),
          y: c1.y + (dy > 0 ? hh : -hh),
        };
      }
    }

    renderNode(ctx, node, isDark) {
      // Filtering & Searching
      const matchesFilter =
        this.activeFilter === "all" || node.layer === this.activeFilter;
      const matchesSearch =
        !this.searchQuery ||
        (node.label && node.label.toLowerCase().includes(this.searchQuery)) ||
        (node.id && node.id.toLowerCase().includes(this.searchQuery)) ||
        (node.crate && node.crate.toLowerCase().includes(this.searchQuery));

      const isSelected = this.selectedNode === node;
      const isHovered = this.hoveredNode === node;

      let isFlowActive = false;
      if (this.isFlowDiagram && this.currentFlowStep >= 0 && this.data.flows) {
        const step = this.data.flows[this.currentFlowStep];
        if (step.activeNode === node.id || step.focusNode === node.id) {
          isFlowActive = true;
        }
      }

      ctx.save();

      // Opacity for filtered or dimmed items
      if (!matchesFilter || !matchesSearch) {
        ctx.globalAlpha = 0.2;
      } else if (
        this.selectedNode &&
        !isSelected &&
        !this.isNodeConnected(node, this.selectedNode)
      ) {
        ctx.globalAlpha = 0.35;
      }

      const radius =
        node.shape === "rounded" ? 8 : node.shape === "diamond" ? 0 : 6;

      // Node background
      ctx.beginPath();
      this.roundRect(ctx, node.x, node.y, node.width, node.height, radius);

      let fillColor = node.fill;
      if (!fillColor) {
        fillColor = isDark ? "#1e293b" : "#ffffff";
      }
      ctx.fillStyle = fillColor;

      // Card shadow
      if (isSelected || isHovered || isFlowActive) {
        ctx.shadowColor = isFlowActive
          ? "rgba(251, 191, 36, 0.4)"
          : "rgba(56, 189, 248, 0.35)";
        ctx.shadowBlur = 14;
      }
      ctx.fill();

      // Stroke
      let strokeColor = node.stroke || (isDark ? "#334155" : "#cbd5e1");
      let strokeWidth = 1.5;

      if (isFlowActive) {
        strokeColor = "#fbbf24";
        strokeWidth = 2.5;
      } else if (isSelected) {
        strokeColor = "#38bdf8";
        strokeWidth = 2.5;
      } else if (isHovered) {
        strokeColor = "#0284c7";
        strokeWidth = 2.0;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // Inner text
      ctx.shadowBlur = 0;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lum = this.calculateLuminance(fillColor);
      const isLightBg = lum > 0.45;

      const lines = (node.label || node.id).split("\n");
      const lineHeight = 14;
      const startY =
        node.y + node.height / 2 - ((lines.length - 1) * lineHeight) / 2;

      for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
          ctx.font = "bold 12px " + getComputedStyle(document.body).fontFamily;
          ctx.fillStyle = isLightBg ? "#0f172a" : "#f8fafc";
        } else {
          ctx.font = "10px " + getComputedStyle(document.body).fontFamily;
          ctx.fillStyle = isLightBg ? "#334155" : "#94a3b8";
        }
        ctx.fillText(
          lines[i],
          node.x + node.width / 2,
          startY + i * lineHeight,
        );
      }

      ctx.restore();
    }

    isNodeConnected(n1, n2) {
      if (!this.data.edges) return false;
      return this.data.edges.some(
        (e) =>
          (e.from === n1.id && e.to === n2.id) ||
          (e.from === n2.id && e.to === n1.id),
      );
    }

    roundRect(ctx, x, y, width, height, radius) {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  }

  global.DiagramEngine = DiagramEngine;
})(window);
