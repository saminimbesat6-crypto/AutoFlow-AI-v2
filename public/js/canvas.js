class WorkflowCanvas {
  constructor(containerEl, svgEl) {
    this.container = containerEl;
    this.svg = svgEl;
    this.plane = containerEl.querySelector('.canvas-plane');

    this.panX = 100;
    this.panY = 80;
    this.scale = 1.0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;

    this.workflow = null;
    this.nodeTypes = new Map();
    this.selectedNodeId = null;
    this.selectedNodeIds = new Set();
    this.selectedConnectionIndex = null;

    // Undo / Redo History
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;

    // Dragging state
    this.draggingNode = null;
    this.dragStartPositions = new Map();
    this.dragStartMouse = { x: 0, y: 0 };
    this.hasActuallyDragged = false;
    this.dragSnapshotTaken = false;

    // Marquee Multi-Select State
    this.isMarqueeSelecting = false;
    this.marqueeStartScreen = { x: 0, y: 0 };
    this.marqueeBoxEl = null;

    // Connecting state
    this.isConnecting = false;
    this.connectSourceNode = null;
    this.connectSourceOutput = 0;
    this.tempConnectionPath = null;

    // Pinch to Zoom state
    this.isPinching = false;
    this.pinchStartDist = 0;
    this.pinchStartScale = 1.0;
    this.pinchCenter = { x: 0, y: 0 };

    // Callbacks
    this.onNodeSelect = null;
    this.onNodeChange = null;
    this.onConnectionCreate = null;
    this.onConnectionDelete = null;

    this.initEvents();
    this.updateTransform();
  }

  setNodeTypes(types) {
    this.nodeTypes.clear();
    for (const t of types) {
      this.nodeTypes.set(t.type, t);
    }
  }

  loadWorkflow(workflow) {
    this.workflow = workflow;
    this.selectedNodeId = null;
    this.selectedNodeIds.clear();
    this.selectedConnectionIndex = null;
    this.undoStack = [];
    this.redoStack = [];
    this.updateUndoRedoUI();
    this.render();
  }

  pushSnapshot() {
    if (!this.workflow || !this.workflow.nodes) return;
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(this.workflow.nodes)),
      connections: JSON.parse(JSON.stringify(this.workflow.connections || []))
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUndoRedoUI();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const current = {
      nodes: JSON.parse(JSON.stringify(this.workflow.nodes)),
      connections: JSON.parse(JSON.stringify(this.workflow.connections || []))
    };
    this.redoStack.push(current);
    const prev = this.undoStack.pop();
    this.workflow.nodes = prev.nodes;
    this.workflow.connections = prev.connections;
    this.selectedNodeIds.clear();
    this.selectedNodeId = null;
    this.render();
    this.updateUndoRedoUI();
    if (this.onNodeChange) this.onNodeChange();
    if (this.onNodeSelect) this.onNodeSelect(null);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const current = {
      nodes: JSON.parse(JSON.stringify(this.workflow.nodes)),
      connections: JSON.parse(JSON.stringify(this.workflow.connections || []))
    };
    this.undoStack.push(current);
    const next = this.redoStack.pop();
    this.workflow.nodes = next.nodes;
    this.workflow.connections = next.connections;
    this.selectedNodeIds.clear();
    this.selectedNodeId = null;
    this.render();
    this.updateUndoRedoUI();
    if (this.onNodeChange) this.onNodeChange();
    if (this.onNodeSelect) this.onNodeSelect(null);
  }

  updateUndoRedoUI() {
    const undoBtn = document.getElementById('canvas-undo-btn');
    const redoBtn = document.getElementById('canvas-redo-btn');
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  initEvents() {
    // Canvas Panning via Middle click or Space+Drag or background Drag, or Shift+Drag for Marquee
    this.container.addEventListener('mousedown', (e) => {
      if (e.target === this.container || e.target === this.svg || e.target.classList.contains('canvas-plane')) {
        if (e.shiftKey) {
          // Marquee multi-select
          this.isMarqueeSelecting = true;
          this.marqueeStartScreen = { x: e.clientX, y: e.clientY };
          if (!e.ctrlKey && !e.metaKey) {
            this.selectedNodeIds.clear();
            this.updateSelectionUI();
          }
          this.marqueeBoxEl = document.createElement('div');
          this.marqueeBoxEl.className = 'canvas-marquee-box';
          this.container.appendChild(this.marqueeBoxEl);
        } else {
          this.isPanning = true;
          this.startX = e.clientX - this.panX;
          this.startY = e.clientY - this.panY;
          this.container.classList.add('panning');
          this.deselectAll();
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isMarqueeSelecting && this.marqueeBoxEl) {
        const containerRect = this.container.getBoundingClientRect();
        const screenX1 = Math.min(e.clientX, this.marqueeStartScreen.x);
        const screenY1 = Math.min(e.clientY, this.marqueeStartScreen.y);
        const screenX2 = Math.max(e.clientX, this.marqueeStartScreen.x);
        const screenY2 = Math.max(e.clientY, this.marqueeStartScreen.y);

        this.marqueeBoxEl.style.left = `${screenX1 - containerRect.left}px`;
        this.marqueeBoxEl.style.top = `${screenY1 - containerRect.top}px`;
        this.marqueeBoxEl.style.width = `${screenX2 - screenX1}px`;
        this.marqueeBoxEl.style.height = `${screenY2 - screenY1}px`;

        const p1 = this.screenToCanvas(screenX1, screenY1);
        const p2 = this.screenToCanvas(screenX2, screenY2);
        const minX = p1.x;
        const minY = p1.y;
        const maxX = p2.x;
        const maxY = p2.y;

        if (this.workflow && this.workflow.nodes) {
          for (const node of this.workflow.nodes) {
            const w = node.type === 'sticky-note' ? (node.parameters?.width || 300) : 220;
            const h = node.type === 'sticky-note' ? (node.parameters?.height || 180) : 80;
            const nx = node.position.x;
            const ny = node.position.y;
            const overlaps = !(nx > maxX || nx + w < minX || ny > maxY || ny + h < minY);

            if (overlaps) {
              this.selectedNodeIds.add(node.id);
            } else if (!e.ctrlKey && !e.metaKey) {
              this.selectedNodeIds.delete(node.id);
            }
          }
          this.updateSelectionUI();
        }
      } else if (this.isPanning) {
        this.panX = e.clientX - this.startX;
        this.panY = e.clientY - this.startY;
        this.updateTransform();
      } else if (this.draggingNode) {
        const mouseCanvas = this.screenToCanvas(e.clientX, e.clientY);
        const dx = Math.round(mouseCanvas.x - this.dragStartMouse.x);
        const dy = Math.round(mouseCanvas.y - this.dragStartMouse.y);

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          if (!this.dragSnapshotTaken) {
            this.pushSnapshot();
            this.dragSnapshotTaken = true;
          }
          this.hasActuallyDragged = true;
        }

        for (const [id, startPos] of this.dragStartPositions.entries()) {
          const node = this.workflow.nodes.find((n) => n.id === id);
          if (node && node.position) {
            node.position.x = startPos.x + dx;
            node.position.y = startPos.y + dy;
            this.updateNodePosition(node);
          }
        }
        this.renderConnections();
      } else if (this.isConnecting && this.tempConnectionPath) {
        const mouseCanvas = this.screenToCanvas(e.clientX, e.clientY);
        const sourcePos = this.getSourcePortPosition(this.connectSourceNode, this.connectSourceOutput);
        this.updateTempConnection(sourcePos.x, sourcePos.y, mouseCanvas.x, mouseCanvas.y);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isMarqueeSelecting) {
        this.isMarqueeSelecting = false;
        if (this.marqueeBoxEl) {
          this.marqueeBoxEl.remove();
          this.marqueeBoxEl = null;
        }
        this.selectedNodeId = this.selectedNodeIds.size > 0 ? Array.from(this.selectedNodeIds)[0] : null;
        if (this.onNodeSelect) {
          this.onNodeSelect(this.selectedNodeId ? this.workflow.nodes.find(n => n.id === this.selectedNodeId) : null);
        }
      }
      if (this.isPanning) {
        this.isPanning = false;
        this.container.classList.remove('panning');
      }
      if (this.draggingNode) {
        if (this.hasActuallyDragged && this.onNodeChange) {
          this.onNodeChange();
        }
        this.draggingNode = null;
        this.dragStartPositions.clear();
        this.hasActuallyDragged = false;
        this.dragSnapshotTaken = false;
      }
      if (this.isConnecting) {
        this.cancelConnecting();
      }
    });

    // Touch Support for Mobile Canvas: Single-Finger Panning & Two-Finger Pinch-to-Zoom
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (e.target === this.container || e.target === this.svg || e.target.classList.contains('canvas-plane')) {
          this.isPanning = true;
          this.startX = touch.clientX - this.panX;
          this.startY = touch.clientY - this.panY;
          this.container.classList.add('panning');
          this.deselectAll();
        }
      } else if (e.touches.length === 2) {
        this.isPinching = true;
        this.isPanning = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.pinchStartScale = this.scale;
        this.pinchCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isPinching && e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (this.pinchStartDist > 0) {
          const factor = currentDist / this.pinchStartDist;
          const newScale = Math.min(Math.max(this.pinchStartScale * factor, 0.25), 2.5);

          const rect = this.container.getBoundingClientRect();
          const midX = this.pinchCenter.x - rect.left;
          const midY = this.pinchCenter.y - rect.top;

          this.panX = midX - (midX - this.panX) * (newScale / this.scale);
          this.panY = midY - (midY - this.panY) * (newScale / this.scale);
          this.scale = newScale;
          this.updateTransform();
        }
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (this.isPanning) {
          this.panX = touch.clientX - this.startX;
          this.panY = touch.clientY - this.startY;
          this.updateTransform();
        } else if (this.draggingNode) {
          const mouseCanvas = this.screenToCanvas(touch.clientX, touch.clientY);
          const dx = Math.round(mouseCanvas.x - this.dragStartMouse.x);
          const dy = Math.round(mouseCanvas.y - this.dragStartMouse.y);

          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            if (!this.dragSnapshotTaken) {
              this.pushSnapshot();
              this.dragSnapshotTaken = true;
            }
            this.hasActuallyDragged = true;
          }

          for (const [id, startPos] of this.dragStartPositions.entries()) {
            const node = this.workflow.nodes.find((n) => n.id === id);
            if (node && node.position) {
              node.position.x = startPos.x + dx;
              node.position.y = startPos.y + dy;
              this.updateNodePosition(node);
            }
          }
          this.renderConnections();
        } else if (this.isConnecting && this.tempConnectionPath) {
          const mouseCanvas = this.screenToCanvas(touch.clientX, touch.clientY);
          const sourcePos = this.getSourcePortPosition(this.connectSourceNode, this.connectSourceOutput);
          this.updateTempConnection(sourcePos.x, sourcePos.y, mouseCanvas.x, mouseCanvas.y);
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        this.isPinching = false;
      }
      if (e.touches.length === 0) {
        if (this.isPanning) {
          this.isPanning = false;
          this.container.classList.remove('panning');
        }
        if (this.draggingNode) {
          if (this.hasActuallyDragged && this.onNodeChange) {
            this.onNodeChange();
          }
          this.draggingNode = null;
          this.dragStartPositions.clear();
          this.hasActuallyDragged = false;
          this.dragSnapshotTaken = false;
        }
        if (this.isConnecting) {
          this.cancelConnecting();
        }
      }
    });

    // Zooming via Wheel
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.3), 2.5);

      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateTransform();
    }, { passive: false });

    // Keyboard shortcuts: Undo (Ctrl+Z), Redo (Ctrl+Y / Ctrl+Shift+Z), Duplicate (Ctrl+D), Delete
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z or Cmd+Z (without Shift)
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        this.undo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z or Ctrl+Shift+Z
      if ((isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) || (isCtrlOrCmd && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        this.redo();
        return;
      }

      // Duplicate: Ctrl+D or Cmd+D
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        this.duplicateSelected();
        return;
      }

      // Delete / Backspace: delete selected nodes or connection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedNodeIds && this.selectedNodeIds.size > 0) {
          e.preventDefault();
          this.deleteSelectedNodes();
        } else if (this.selectedConnectionIndex !== null) {
          e.preventDefault();
          this.deleteConnection(this.selectedConnectionIndex);
        }
      }
    });
  }

  screenToCanvas(screenX, screenY) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.panX) / this.scale,
      y: (screenY - rect.top - this.panY) / this.scale
    };
  }

  updateTransform() {
    const transformStr = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    this.plane.style.transform = transformStr;
    if (this.svg) {
      this.svg.style.transform = transformStr;
      this.svg.style.transformOrigin = '0 0';
    }
  }

  zoomToFit() {
    if (!this.workflow || !this.workflow.nodes || this.workflow.nodes.length === 0) {
      this.panX = 40;
      this.panY = 40;
      this.scale = 1.0;
      this.updateTransform();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of this.workflow.nodes) {
      const nx = node.position.x;
      const ny = node.position.y;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx + 220 > maxX) maxX = nx + 220;
      if (ny + 90 > maxY) maxY = ny + 90;
    }

    const rect = this.container.getBoundingClientRect();
    const padding = 50;
    const availWidth = Math.max(rect.width - padding * 2, 100);
    const availHeight = Math.max(rect.height - padding * 2, 100);

    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);

    const scaleX = availWidth / graphWidth;
    const scaleY = availHeight / graphHeight;
    const fitScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.15);

    this.scale = fitScale;
    this.panX = Math.round((rect.width - graphWidth * fitScale) / 2 - minX * fitScale);
    this.panY = Math.round((rect.height - graphHeight * fitScale) / 2 - minY * fitScale);

    this.updateTransform();
  }

  render() {
    if (!this.workflow) return;

    // Clear existing nodes in DOM plane
    const existingNodes = this.plane.querySelectorAll('.canvas-node');
    existingNodes.forEach((n) => n.remove());

    // Render Nodes
    for (const node of this.workflow.nodes) {
      this.renderNode(node);
    }

    // Render Connections
    this.renderConnections();
  }

  renderNode(node) {
    if (node.type === 'sticky-note') {
      this.renderStickyNote(node);
      return;
    }

    const nodeDef = this.nodeTypes.get(node.type) || {
      name: node.name,
      category: 'core',
      color: '#3b82f6',
      icon: 'box',
      inputs: [{ name: 'main', type: 'main' }],
      outputs: [{ name: 'main', type: 'main' }]
    };

    const nodeEl = document.createElement('div');
    nodeEl.className = 'canvas-node' + (node.disabled ? ' node-disabled' : '');
    nodeEl.id = `node-${node.id}`;
    if (this.selectedNodeId === node.id) nodeEl.classList.add('selected');

    nodeEl.style.left = `${node.position.x}px`;
    nodeEl.style.top = `${node.position.y}px`;

    const categoryColor = nodeDef.color || '#3b82f6';
    const disabledBadge = node.disabled ? `<span class="disabled-pill">Disabled</span>` : '';
    const pinBadge = (node.pinnedData && node.pinnedData.length > 0) ? `<span class="pinned-pill" title="Data is pinned on this node">📌 Pinned</span>` : '';

    nodeEl.innerHTML = `
      <div class="node-header" style="border-top: 3px solid ${categoryColor}">
        <div class="node-title-group">
          <div class="node-icon" style="background: ${categoryColor}">⚡</div>
          <div class="node-name" title="${node.name}">${node.name}</div>
        </div>
        ${pinBadge}
        ${disabledBadge}
      </div>
      <div class="node-type-label">${nodeDef.name}</div>
      <div class="node-status-badge"></div>
      <div class="node-ports-container"></div>
    `;

    // Input and Output Ports
    const portsContainer = nodeEl.querySelector('.node-ports-container');
    const inputs = nodeDef.inputs || [];
    let outputs = [...(nodeDef.outputs || [])];

    // Dynamically show error output port if onError is continueErrorOutput
    if (node.onError === 'continueErrorOutput') {
      const hasErrorPort = outputs.some((o) => o.name === 'error' || o.type === 'error');
      if (!hasErrorPort) {
        outputs.push({ name: 'error', label: 'Error Output (Port 1)', isError: true });
      }
    }

    // Render input ports (left)
    inputs.forEach((inp, idx) => {
      const port = document.createElement('div');
      port.className = 'node-port input';
      port.title = inp.name || 'Input';
      port.dataset.nodeId = node.id;
      port.dataset.portIndex = idx;
      port.dataset.portType = 'input';
      port.style.top = `${idx * 24 - 40}px`;

      port.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        if (this.isConnecting && this.connectSourceNode) {
          this.completeConnection(this.connectSourceNode, this.connectSourceOutput, node, idx);
        }
      });

      port.addEventListener('touchend', (e) => {
        e.stopPropagation();
        if (this.isConnecting && this.connectSourceNode) {
          this.completeConnection(this.connectSourceNode, this.connectSourceOutput, node, idx);
        }
      });

      portsContainer.appendChild(port);
    });

    // Render output ports (right)
    outputs.forEach((out, idx) => {
      const isErrorPort = out.isError || out.name === 'error' || (node.onError === 'continueErrorOutput' && idx === 1);
      const port = document.createElement('div');
      port.className = 'node-port output' + (isErrorPort ? ' error-port' : '');
      port.title = out.label || out.name || (isErrorPort ? 'Error Output (Port 1)' : 'Output');
      port.dataset.nodeId = node.id;
      port.dataset.portIndex = idx;
      port.dataset.portType = 'output';
      port.style.top = `${idx * 24 - 40}px`;

      port.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startConnecting(node, idx);
      });

      port.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.startConnecting(node, idx);
      }, { passive: true });

      portsContainer.appendChild(port);
    });

    // Node drag and select events
    nodeEl.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('node-port')) return;
      e.stopPropagation();
      this.handleNodeMouseDown(node, e);
    });

    nodeEl.addEventListener('touchstart', (e) => {
      if (e.target.classList.contains('node-port')) return;
      if (e.touches && e.touches.length === 1) {
        this.handleNodeTouchStart(node, e);
      }
    }, { passive: true });

    this.plane.appendChild(nodeEl);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderStickyNote(node) {
    const noteEl = document.createElement('div');
    const color = (node.parameters && node.parameters.color) || 'yellow';
    const width = (node.parameters && node.parameters.width) || 300;
    const height = (node.parameters && node.parameters.height) || 180;
    const content = (node.parameters && node.parameters.content) || '## Workflow Section\nDouble click to edit instructions or notes...';

    noteEl.className = `canvas-sticky-note sticky-${color}`;
    noteEl.id = `node-${node.id}`;
    if (this.selectedNodeId === node.id) noteEl.classList.add('selected');

    noteEl.style.left = `${node.position.x}px`;
    noteEl.style.top = `${node.position.y}px`;
    noteEl.style.width = `${width}px`;
    noteEl.style.height = `${height}px`;

    const colors = ['yellow', 'blue', 'green', 'red', 'purple', 'orange', 'gray'];
    const colorDots = colors.map((c) =>
      `<div class="sticky-color-dot sticky-${c}" data-color="${c}" title="${c}"></div>`
    ).join('');

    noteEl.innerHTML = `
      <div class="sticky-note-header">
        <div class="sticky-title">📝 ${this.escapeHtml(node.name || 'Sticky Note')}</div>
        <div class="sticky-controls">
          <div class="sticky-colors-bar">${colorDots}</div>
          <button class="sticky-delete-btn" title="Delete Note">✕</button>
        </div>
      </div>
      <div class="sticky-note-body">
        <textarea class="sticky-note-textarea" placeholder="Add note content...">${this.escapeHtml(content)}</textarea>
      </div>
    `;

    // Handle color change
    noteEl.querySelectorAll('.sticky-color-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const newColor = dot.dataset.color;
        colors.forEach((c) => noteEl.classList.remove(`sticky-${c}`));
        noteEl.classList.add(`sticky-${newColor}`);
        if (!node.parameters) node.parameters = {};
        node.parameters.color = newColor;
        if (this.onNodeChange) this.onNodeChange();
      });
    });

    // Handle delete
    const deleteBtn = noteEl.querySelector('.sticky-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteNode(node.id);
      });
    }

    // Textarea input
    const textarea = noteEl.querySelector('.sticky-note-textarea');
    if (textarea) {
      textarea.addEventListener('input', (e) => {
        if (!node.parameters) node.parameters = {};
        node.parameters.content = e.target.value;
        if (this.onNodeChange) this.onNodeChange();
      });
      textarea.addEventListener('mousedown', (e) => e.stopPropagation());
      textarea.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    // Resize observer to persist width & height
    if (window.ResizeObserver) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (!node.parameters) node.parameters = {};
          node.parameters.width = Math.round(entry.contentRect.width);
          node.parameters.height = Math.round(entry.contentRect.height);
        }
      });
      ro.observe(noteEl);
    }

    // Dragging from header
    const header = noteEl.querySelector('.sticky-note-header');
    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('sticky-color-dot') || e.target.classList.contains('sticky-delete-btn')) return;
      e.stopPropagation();
      this.handleNodeMouseDown(node, e);
    });

    header.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        e.stopPropagation();
        this.handleNodeTouchStart(node, e);
      }
    }, { passive: true });

    noteEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
      this.selectNode(node.id, isMulti);
    });

    this.plane.appendChild(noteEl);
  }

  updateNodePosition(node) {
    const el = document.getElementById(`node-${node.id}`);
    if (el) {
      el.style.left = `${node.position.x}px`;
      el.style.top = `${node.position.y}px`;
    }
  }

  renderConnections() {
    this.svg.innerHTML = '';

    if (!this.workflow || !this.workflow.connections) return;

    this.workflow.connections.forEach((conn, index) => {
      const sourceNode = this.workflow.nodes.find((n) => n.name === conn.source || n.id === conn.source);
      const targetNode = this.workflow.nodes.find((n) => n.name === conn.target || n.id === conn.target);

      if (sourceNode && targetNode) {
        const sourcePos = this.getSourcePortPosition(sourceNode, conn.sourceOutput || 0);
        const targetPos = this.getTargetPortPosition(targetNode, conn.targetInput || 0);

        const isErrorConn = (conn.sourceOutput === 1 && sourceNode.onError === 'continueErrorOutput');
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', this.calculateBezierPath(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y));
        pathEl.setAttribute('class', 'connection-path' + (isErrorConn ? ' error-flow' : ''));
        pathEl.dataset.source = sourceNode.name;
        pathEl.dataset.sourceId = sourceNode.id;
        pathEl.dataset.target = targetNode.name;
        pathEl.dataset.targetId = targetNode.id;
        if (this.selectedConnectionIndex === index) {
          pathEl.style.stroke = '#ef4444';
          pathEl.style.strokeWidth = '4px';
        }

        pathEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectConnection(index);
        });

        this.svg.appendChild(pathEl);
      }
    });
  }

  getSourcePortPosition(node, outputIndex) {
    const x = node.position.x + 220; // right edge of node
    const y = node.position.y + 35 + (outputIndex * 24);
    return { x, y };
  }

  getTargetPortPosition(node, inputIndex) {
    const x = node.position.x; // left edge of node
    const y = node.position.y + 35 + (inputIndex * 24);
    return { x, y };
  }

  calculateBezierPath(x1, y1, x2, y2) {
    const dx = Math.max(Math.abs(x2 - x1) * 0.5, 40);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  startConnecting(node, outputIndex) {
    this.isConnecting = true;
    this.connectSourceNode = node;
    this.connectSourceOutput = outputIndex;

    const isErrorOutput = (outputIndex === 1 && node.onError === 'continueErrorOutput');
    const sourcePos = this.getSourcePortPosition(node, outputIndex);
    this.tempConnectionPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempConnectionPath.setAttribute('class', 'connection-path active-flow' + (isErrorOutput ? ' error-flow' : ''));
    this.tempConnectionPath.setAttribute('d', this.calculateBezierPath(sourcePos.x, sourcePos.y, sourcePos.x, sourcePos.y));
    this.svg.appendChild(this.tempConnectionPath);
  }

  updateTempConnection(x1, y1, x2, y2) {
    if (this.tempConnectionPath) {
      this.tempConnectionPath.setAttribute('d', this.calculateBezierPath(x1, y1, x2, y2));
    }
  }

  cancelConnecting() {
    this.isConnecting = false;
    this.connectSourceNode = null;
    if (this.tempConnectionPath) {
      this.tempConnectionPath.remove();
      this.tempConnectionPath = null;
    }
  }

  completeConnection(sourceNode, sourceOutput, targetNode, targetInput) {
    this.cancelConnecting();

    if (sourceNode.id === targetNode.id) return; // Prevent self-loop

    // Check if connection already exists
    const exists = this.workflow.connections.some(
      (c) =>
        (c.source === sourceNode.name || c.source === sourceNode.id) &&
        (c.target === targetNode.name || c.target === targetNode.id) &&
        c.sourceOutput === sourceOutput &&
        c.targetInput === targetInput
    );

    if (!exists) {
      this.pushSnapshot();
      this.workflow.connections.push({
        source: sourceNode.name,
        sourceOutput,
        target: targetNode.name,
        targetInput
      });

      this.renderConnections();
      if (this.onConnectionCreate) this.onConnectionCreate();
    }
  }

  handleNodeMouseDown(node, e) {
    const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
    if (isMultiSelect) {
      this.selectNode(node.id, true);
    } else {
      if (!this.selectedNodeIds.has(node.id)) {
        this.selectNode(node.id, false);
      } else {
        this.selectedNodeId = node.id;
        if (this.onNodeSelect) this.onNodeSelect(node);
      }
    }

    this.draggingNode = node;
    this.dragStartPositions.clear();
    this.dragStartMouse = this.screenToCanvas(e.clientX, e.clientY);
    for (const id of this.selectedNodeIds) {
      const n = this.workflow.nodes.find((item) => item.id === id);
      if (n && n.position) {
        this.dragStartPositions.set(id, { x: n.position.x, y: n.position.y });
      }
    }
    this.hasActuallyDragged = false;
    this.dragSnapshotTaken = false;
  }

  handleNodeTouchStart(node, e) {
    if (!e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!this.selectedNodeIds.has(node.id)) {
      this.selectNode(node.id, false);
    } else {
      this.selectedNodeId = node.id;
      if (this.onNodeSelect) this.onNodeSelect(node);
    }

    this.draggingNode = node;
    this.dragStartPositions.clear();
    this.dragStartMouse = this.screenToCanvas(touch.clientX, touch.clientY);
    for (const id of this.selectedNodeIds) {
      const n = this.workflow.nodes.find((item) => item.id === id);
      if (n && n.position) {
        this.dragStartPositions.set(id, { x: n.position.x, y: n.position.y });
      }
    }
    this.hasActuallyDragged = false;
    this.dragSnapshotTaken = false;
  }

  updateSelectionUI() {
    document.querySelectorAll('.canvas-node, .canvas-sticky-note').forEach((el) => {
      const id = el.id.replace('node-', '');
      el.classList.toggle('selected', this.selectedNodeIds.has(id));
    });
  }

  selectNode(nodeId, multiSelect = false) {
    if (multiSelect) {
      if (this.selectedNodeIds.has(nodeId)) {
        this.selectedNodeIds.delete(nodeId);
      } else {
        this.selectedNodeIds.add(nodeId);
      }
    } else {
      this.selectedNodeIds.clear();
      if (nodeId) this.selectedNodeIds.add(nodeId);
    }

    this.selectedNodeId = this.selectedNodeIds.size > 0 ? (nodeId || Array.from(this.selectedNodeIds)[0]) : null;
    this.selectedConnectionIndex = null;

    this.updateSelectionUI();
    this.renderConnections();

    if (this.onNodeSelect) {
      const node = this.selectedNodeId ? this.workflow.nodes.find((n) => n.id === this.selectedNodeId) : null;
      this.onNodeSelect(node || null);
    }
  }

  selectConnection(index) {
    this.selectedConnectionIndex = index;
    this.selectedNodeId = null;
    this.selectedNodeIds.clear();
    this.updateSelectionUI();
    this.renderConnections();

    if (this.onNodeSelect) this.onNodeSelect(null);
  }

  deselectAll() {
    this.selectedNodeId = null;
    this.selectedNodeIds.clear();
    this.selectedConnectionIndex = null;
    this.updateSelectionUI();
    this.renderConnections();
    if (this.onNodeSelect) this.onNodeSelect(null);
  }

  deleteNode(nodeId) {
    this.pushSnapshot();
    const nodeIndex = this.workflow.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) return;

    const node = this.workflow.nodes[nodeIndex];
    this.workflow.nodes.splice(nodeIndex, 1);

    this.workflow.connections = this.workflow.connections.filter(
      (c) => c.source !== node.name && c.source !== node.id && c.target !== node.name && c.target !== node.id
    );

    this.selectedNodeIds.delete(nodeId);
    this.selectedNodeId = this.selectedNodeIds.size > 0 ? Array.from(this.selectedNodeIds)[0] : null;
    this.render();
    if (this.onNodeChange) this.onNodeChange();
    if (this.onNodeSelect) this.onNodeSelect(this.selectedNodeId ? this.workflow.nodes.find(n => n.id === this.selectedNodeId) : null);
  }

  deleteSelectedNodes() {
    if (!this.selectedNodeIds || this.selectedNodeIds.size === 0) return;
    this.pushSnapshot();

    const toDelete = new Set(this.selectedNodeIds);
    const deletedNames = new Set(
      this.workflow.nodes.filter((n) => toDelete.has(n.id)).map((n) => n.name)
    );

    this.workflow.nodes = this.workflow.nodes.filter((n) => !toDelete.has(n.id));
    this.workflow.connections = this.workflow.connections.filter(
      (c) => !toDelete.has(c.source) && !deletedNames.has(c.source) && !toDelete.has(c.target) && !deletedNames.has(c.target)
    );

    this.selectedNodeIds.clear();
    this.selectedNodeId = null;
    this.render();
    if (this.onNodeChange) this.onNodeChange();
    if (this.onNodeSelect) this.onNodeSelect(null);
  }

  duplicateSelected() {
    if (!this.selectedNodeIds || this.selectedNodeIds.size === 0) return;
    this.pushSnapshot();

    const idMap = new Map();
    const nameMap = new Map();
    const newNodes = [];

    for (const id of this.selectedNodeIds) {
      const original = this.workflow.nodes.find((n) => n.id === id);
      if (!original) continue;
      const cloned = JSON.parse(JSON.stringify(original));
      const newId = 'node_' + Math.random().toString(36).substring(2, 10);
      const newName = `${original.name} (Copy)`;
      idMap.set(original.id, newId);
      nameMap.set(original.name, newName);
      cloned.id = newId;
      cloned.name = newName;
      cloned.position.x += 40;
      cloned.position.y += 40;
      newNodes.push(cloned);
    }

    // Duplicate internal connections among selected nodes
    const newConnections = [];
    for (const conn of this.workflow.connections) {
      const sMatch = idMap.has(conn.source) || nameMap.has(conn.source);
      const tMatch = idMap.has(conn.target) || nameMap.has(conn.target);
      if (sMatch && tMatch) {
        newConnections.push({
          source: nameMap.get(conn.source) || idMap.get(conn.source) || conn.source,
          sourceOutput: conn.sourceOutput || 0,
          target: nameMap.get(conn.target) || idMap.get(conn.target) || conn.target,
          targetInput: conn.targetInput || 0
        });
      }
    }

    this.workflow.nodes.push(...newNodes);
    this.workflow.connections.push(...newConnections);

    this.selectedNodeIds.clear();
    for (const n of newNodes) {
      this.selectedNodeIds.add(n.id);
    }
    this.selectedNodeId = newNodes.length > 0 ? newNodes[0].id : null;
    this.render();
    if (this.onNodeChange) this.onNodeChange();
  }

  deleteConnection(index) {
    if (index >= 0 && index < this.workflow.connections.length) {
      this.pushSnapshot();
      this.workflow.connections.splice(index, 1);
      this.selectedConnectionIndex = null;
      this.renderConnections();
      if (this.onConnectionDelete) this.onConnectionDelete();
    }
  }

  setNodeExecutionStatus(nodeId, status, duration = null) {
    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (!nodeEl) return;

    const badge = nodeEl.querySelector('.node-status-badge');
    if (!badge) return;

    badge.className = `node-status-badge ${status}`;
    if (status === 'running') {
      badge.textContent = 'Running...';
    } else if (status === 'success') {
      badge.textContent = duration ? `✓ Done (${duration}ms)` : '✓ Success';
    } else if (status === 'error') {
      badge.textContent = '✗ Error';
    } else {
      badge.className = 'node-status-badge';
      badge.textContent = '';
    }
  }

  clearExecutionStatuses() {
    document.querySelectorAll('.node-status-badge').forEach((badge) => {
      badge.className = 'node-status-badge';
      badge.textContent = '';
    });
    this.clearConnectionHighlights();
  }

  highlightConnection(sourceNameOrId, targetNameOrId = null, status = 'success') {
    const paths = this.svg.querySelectorAll('.connection-path');
    paths.forEach((p) => {
      const matchSource = p.dataset.source === sourceNameOrId || p.dataset.sourceId === sourceNameOrId;
      const matchTarget = !targetNameOrId || p.dataset.target === targetNameOrId || p.dataset.targetId === targetNameOrId;

      if (matchSource && matchTarget) {
        p.classList.remove('running-flow', 'success-flow');
        if (status === 'success') {
          p.classList.add('success-flow');
        } else if (status === 'running') {
          p.classList.add('running-flow');
        }
      }
    });
  }

  clearConnectionHighlights() {
    const paths = this.svg.querySelectorAll('.connection-path');
    paths.forEach((p) => {
      p.classList.remove('running-flow', 'success-flow');
    });
  }

  panToNode(nodeId) {
    if (!this.workflow || !this.workflow.nodes) return;
    const node = this.workflow.nodes.find((n) => n.id === nodeId || n.name === nodeId);
    if (!node || !node.position) return;

    const rect = this.container.getBoundingClientRect();
    const targetPanX = (rect.width / 2) - ((node.position.x + 110) * this.scale);
    const targetPanY = (rect.height / 2) - ((node.position.y + 45) * this.scale);

    this.panX = Math.round(targetPanX);
    this.panY = Math.round(targetPanY);
    this.updateTransform();
  }
}
