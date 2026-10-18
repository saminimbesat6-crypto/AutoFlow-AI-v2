class WorkflowEditor {
  constructor(canvas, apiClient) {
    this.canvas = canvas;
    this.api = apiClient;

    this.paletteEl = document.getElementById('palette-categories');
    this.paletteSearchInput = document.getElementById('palette-search');
    this.nodeDrawer = document.getElementById('node-drawer');
    this.drawerTitle = document.getElementById('drawer-node-title');
    this.drawerForm = document.getElementById('drawer-form');
    this.closeDrawerBtn = document.getElementById('close-drawer-btn');
    this.deleteNodeBtn = document.getElementById('drawer-delete-node-btn');

    this.debugPanel = document.getElementById('debug-panel');
    this.debugNodeTitle = document.getElementById('debug-node-title');
    this.debugInputData = document.getElementById('debug-input-data');
    this.debugOutputData = document.getElementById('debug-output-data');
    this.closeDebugBtn = document.getElementById('close-debug-btn');
    this.pinDataBtn = document.getElementById('pin-data-btn');
    this.testStepBtn = document.getElementById('test-step-btn');

    this.sidebarEl = document.getElementById('editor-sidebar');
    this.closePaletteBtn = document.getElementById('close-palette-btn');
    this.mobilePaletteBtn = document.getElementById('mobile-palette-btn');
    this.sidebarBackdrop = document.getElementById('sidebar-backdrop');

    this.currentNode = null;
    this.nodeTypes = [];
    this.credentials = [];
    this.lastExecutionDetails = null;

    this.initEvents();
  }

  async init(nodeTypes, credentials) {
    this.nodeTypes = nodeTypes;
    this.credentials = credentials;
    this.renderPalette(nodeTypes);
  }

  initEvents() {
    this.closeDrawerBtn.addEventListener('click', () => this.closeDrawer());
    this.closeDebugBtn.addEventListener('click', () => this.closeDebug());

    if (this.pinDataBtn) {
      this.pinDataBtn.addEventListener('click', () => this.togglePinData());
    }
    if (this.testStepBtn) {
      this.testStepBtn.addEventListener('click', () => this.executeCurrentNodeStep());
    }

    if (this.mobilePaletteBtn) {
      this.mobilePaletteBtn.addEventListener('click', () => this.openMobilePalette());
    }
    if (this.closePaletteBtn) {
      this.closePaletteBtn.addEventListener('click', () => this.closeMobilePalette());
    }
    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.addEventListener('click', () => this.closeMobilePalette());
    }

    this.deleteNodeBtn.addEventListener('click', () => {
      if (this.currentNode) {
        this.canvas.deleteNode(this.currentNode.id);
        this.closeDrawer();
      }
    });

    this.paletteSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = this.nodeTypes.filter(
        (nt) => nt.name.toLowerCase().includes(q) || nt.description.toLowerCase().includes(q)
      );
      this.renderPalette(filtered);
    });

    // Wire up canvas selection callback
    this.canvas.onNodeSelect = (node) => {
      if (node) {
        this.openDrawer(node);
        this.showNodeDebug(node);
      } else {
        this.closeDrawer();
      }
    };
  }

  renderPalette(nodeTypes) {
    this.paletteEl.innerHTML = '';

    const categories = {
      trigger: { title: 'Triggers', items: [] },
      app: { title: 'Enterprise Apps & SaaS', items: [] },
      database: { title: 'Databases & Storage', items: [] },
      cloud: { title: 'DevOps & Cloud Infrastructure', items: [] },
      communication: { title: 'Communication & Messaging', items: [] },
      social: { title: 'Social & Media Platforms', items: [] },
      ai: { title: 'AI & Multi-Model', items: [] },
      core: { title: 'Core Logic & Control Flow', items: [] },
      action: { title: 'Actions & Network', items: [] },
      transform: { title: 'Data Transformation', items: [] }
    };

    for (const nt of nodeTypes) {
      const cat = categories[nt.category] || categories.core;
      cat.items.push(nt);
    }

    for (const [catKey, cat] of Object.entries(categories)) {
      if (cat.items.length === 0) continue;

      const titleEl = document.createElement('div');
      titleEl.className = 'palette-category-title';
      titleEl.textContent = cat.title;
      this.paletteEl.appendChild(titleEl);

      for (const item of cat.items) {
        const itemEl = document.createElement('div');
        itemEl.className = 'palette-item';
        itemEl.innerHTML = `
          <div class="node-icon" style="background: ${item.color || '#3b82f6'}; width: 22px; height: 22px; font-size: 11px;">⚡</div>
          <div style="overflow: hidden;">
            <div class="palette-item-name">${item.name}</div>
            <div class="palette-item-desc">${item.description}</div>
          </div>
        `;

        itemEl.addEventListener('click', () => {
          this.addNodeToCanvas(item.type);
        });

        this.paletteEl.appendChild(itemEl);
      }
    }
  }

  openMobilePalette() {
    if (this.sidebarEl) this.sidebarEl.classList.add('open');
    if (this.sidebarBackdrop) this.sidebarBackdrop.classList.add('open');
  }

  closeMobilePalette() {
    if (this.sidebarEl) this.sidebarEl.classList.remove('open');
    if (this.sidebarBackdrop) this.sidebarBackdrop.classList.remove('open');
  }

  addNodeToCanvas(nodeType) {
    this.closeMobilePalette();
    const nodeDef = this.nodeTypes.find((nt) => nt.type === nodeType);
    if (!nodeDef) return;

    // Generate unique name
    const count = this.canvas.workflow.nodes.filter((n) => n.type === nodeType).length + 1;
    const name = count === 1 ? nodeDef.name : `${nodeDef.name} ${count}`;

    // Compute center coordinates on canvas
    const containerRect = this.canvas.container.getBoundingClientRect();
    const centerScreen = {
      x: containerRect.left + containerRect.width / 2 + (Math.random() * 60 - 30),
      y: containerRect.top + containerRect.height / 2 + (Math.random() * 60 - 30)
    };
    const canvasPos = this.canvas.screenToCanvas(centerScreen.x, centerScreen.y);

    const defaultParams = {};
    for (const prop of nodeDef.properties || []) {
      if (prop.default !== undefined) {
        defaultParams[prop.name] = prop.default;
      }
    }

    const newNode = {
      id: 'node_' + Math.random().toString(36).substring(2, 10),
      name,
      type: nodeType,
      position: { x: Math.round(canvasPos.x), y: Math.round(canvasPos.y) },
      parameters: defaultParams,
      credentials: {},
      disabled: false,
      onError: 'stopWorkflow',
      retryOnFail: false,
      maxTries: 3,
      waitBetweenTries: 1000,
      notes: ''
    };

    this.canvas.workflow.nodes.push(newNode);
    this.canvas.render();
    this.canvas.selectNode(newNode.id);
  }

  openDrawer(node) {
    this.currentNode = node;
    const nodeDef = this.nodeTypes.find((nt) => nt.type === node.type);
    this.drawerTitle.textContent = `${nodeDef?.name || node.type} Settings`;

    this.drawerForm.innerHTML = `
      <div class="drawer-tabs">
        <button type="button" class="drawer-tab active" data-tab="params">⚙️ Parameters</button>
        <button type="button" class="drawer-tab" data-tab="settings">🛡️ Settings & Error</button>
      </div>
      <div class="drawer-tab-content active" id="tab-content-params"></div>
      <div class="drawer-tab-content" id="tab-content-settings"></div>
    `;

    // Tab switching logic
    const tabs = this.drawerForm.querySelectorAll('.drawer-tab');
    const tabParams = this.drawerForm.querySelector('#tab-content-params');
    const tabSettings = this.drawerForm.querySelector('#tab-content-settings');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'params') {
          tabParams.classList.add('active');
          tabSettings.classList.remove('active');
        } else {
          tabParams.classList.remove('active');
          tabSettings.classList.add('active');
        }
      });
    });

    // Populate Tab 1: Parameters
    this.renderParametersTab(tabParams, node, nodeDef);

    // Populate Tab 2: Settings & Error Handling
    this.renderSettingsTab(tabSettings, node);

    this.nodeDrawer.classList.add('open');
  }

  renderParametersTab(container, node, nodeDef) {
    // Node Display Name Field
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    nameGroup.innerHTML = `
      <label class="form-label">Node Name</label>
      <input type="text" class="form-control" id="prop-node-name" value="${node.name}" />
    `;
    const nameInput = nameGroup.querySelector('#prop-node-name');
    nameInput.addEventListener('change', (e) => {
      const oldName = node.name;
      const newName = e.target.value.trim() || oldName;
      node.name = newName;

      // Update connections that reference old name
      for (const conn of this.canvas.workflow.connections) {
        if (conn.source === oldName) conn.source = newName;
        if (conn.target === oldName) conn.target = newName;
      }

      this.canvas.render();
    });
    container.appendChild(nameGroup);

    // Expression Assistant Box
    const helperBox = document.createElement('div');
    helperBox.className = 'expression-helper-box';
    helperBox.innerHTML = `
      <div style="font-weight: 600; color: #a78bfa; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
        <span>⚡ Expressions Helper</span>
        <span style="font-size: 0.7rem; color: #64748b;">Click chip to copy</span>
      </div>
      <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px;">
        Use <code>{{ ... }}</code> in any field to inject live data:
      </div>
      <div class="expression-chips">
        <span class="expression-chip" data-expr="{{ $json.data }}">{{ $json.data }}</span>
        <span class="expression-chip" data-expr="{{ $('Node').item.json }}">{{ $('Node').item.json }}</span>
        <span class="expression-chip" data-expr="{{ $itemIndex }}">{{ $itemIndex }}</span>
        <span class="expression-chip" data-expr="{{ $now }}">{{ $now }}</span>
        <span class="expression-chip" data-expr="{{ $execution.id }}">{{ $execution.id }}</span>
      </div>
    `;
    helperBox.querySelectorAll('.expression-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const expr = chip.dataset.expr;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(expr);
        }
        const originalText = chip.textContent;
        chip.textContent = '✓ Copied!';
        chip.style.borderColor = '#22c55e';
        chip.style.color = '#86efac';
        setTimeout(() => {
          chip.textContent = originalText;
          chip.style.borderColor = '';
          chip.style.color = '';
        }, 1200);
      });
    });
    container.appendChild(helperBox);

    // Render properties defined in node schema
    if (nodeDef && nodeDef.properties) {
      for (const prop of nodeDef.properties) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const currentValue = node.parameters?.[prop.name] !== undefined
          ? node.parameters[prop.name]
          : (prop.default !== undefined ? prop.default : '');

        let inputHtml = '';
        if (prop.type === 'options') {
          const opts = (prop.options || []).map(
            (o) => `<option value="${o.value}" ${String(o.value) === String(currentValue) ? 'selected' : ''}>${o.name}</option>`
          ).join('');
          inputHtml = `<select class="form-control" data-prop="${prop.name}">${opts}</select>`;
        } else if (prop.type === 'boolean') {
          inputHtml = `
            <select class="form-control" data-prop="${prop.name}">
              <option value="true" ${Boolean(currentValue) ? 'selected' : ''}>True (Yes)</option>
              <option value="false" ${!Boolean(currentValue) ? 'selected' : ''}>False (No)</option>
            </select>
          `;
        } else if (prop.type === 'json' || prop.type === 'code') {
          const formatted = typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue);
          inputHtml = `<textarea class="form-control" rows="5" data-prop="${prop.name}">${formatted}</textarea>`;
        } else if (prop.type === 'credential') {
          const credOpts = this.credentials.map(
            (c) => `<option value="${c.id}" ${node.credentials?.[prop.credentialType || c.type] === c.id ? 'selected' : ''}>${c.name} (${c.type})</option>`
          );
          inputHtml = `
            <select class="form-control" data-cred="true">
              <option value="">-- Select Credential --</option>
              ${credOpts.join('')}
            </select>
          `;
        } else {
          inputHtml = `<input type="${prop.type === 'number' ? 'number' : 'text'}" class="form-control" data-prop="${prop.name}" value="${currentValue}" />`;
        }

        group.innerHTML = `
          <label class="form-label">${prop.displayName}</label>
          ${inputHtml}
          ${prop.description ? `<div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">${prop.description}</div>` : ''}
        `;

        // Bind update listener
        const inputEl = group.querySelector('[data-prop]');
        if (inputEl) {
          inputEl.addEventListener('change', (e) => {
            let val = e.target.value;
            if (prop.type === 'boolean') val = val === 'true';
            if (prop.type === 'number') val = Number(val);
            if (!node.parameters) node.parameters = {};
            node.parameters[prop.name] = val;
          });
        }

        const credEl = group.querySelector('[data-cred]');
        if (credEl) {
          credEl.addEventListener('change', (e) => {
            const credId = e.target.value;
            if (!node.credentials) node.credentials = {};
            const credObj = this.credentials.find((c) => c.id === credId);
            if (credObj) {
              node.credentials[credObj.type] = credId;
            } else {
              node.credentials = {};
            }
          });
        }

        container.appendChild(group);
      }
    }

    // Polling Trigger Stateful Controls
    if (node.type === 'polling-trigger') {
      const pollBox = document.createElement('div');
      pollBox.style.cssText = 'background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 12px; margin-top: 14px;';
      pollBox.innerHTML = `
        <div style="font-weight: 600; color: #10b981; margin-bottom: 6px; font-size: 0.85rem;">🔄 Deduplication State</div>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 10px;">Tracks seen item IDs and timestamps across runs. Clear state to re-test initial run detection.</div>
        <button type="button" class="btn btn-secondary" id="btn-reset-poll-state" style="width: 100%; font-size: 0.8rem; padding: 6px 12px;">
          Clear State & Reset
        </button>
      `;
      const btnReset = pollBox.querySelector('#btn-reset-poll-state');
      if (btnReset) {
        btnReset.addEventListener('click', async () => {
          try {
            btnReset.disabled = true;
            btnReset.textContent = 'Resetting...';
            const wfId = this.canvas.workflow?.id || 'dev';
            await fetch(`/api/workflows/${wfId}/nodes/${node.id}/reset-static-data`, { method: 'POST' });
            btnReset.textContent = '✓ State Cleared!';
            setTimeout(() => {
              btnReset.disabled = false;
              btnReset.textContent = 'Clear State & Reset';
            }, 2000);
          } catch (err) {
            btnReset.disabled = false;
            btnReset.textContent = 'Error Resetting';
          }
        });
      }
      container.appendChild(pollBox);
    }
  }

  renderSettingsTab(container, node) {
    const currentOnError = node.onError || (node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
    const isRetry = Boolean(node.retryOnFail);
    const maxTries = node.maxTries || 3;
    const waitMs = node.waitBetweenTries || 1000;
    const isDisabled = Boolean(node.disabled);
    const notes = node.notes || '';

    container.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>On Error Action</span>
          <span style="font-size: 0.72rem; color: #a855f7;">Error Routing</span>
        </label>
        <select class="form-control" id="setting-on-error">
          <option value="stopWorkflow" ${currentOnError === 'stopWorkflow' ? 'selected' : ''}>Stop Workflow (Default)</option>
          <option value="continueRegularOutput" ${currentOnError === 'continueRegularOutput' ? 'selected' : ''}>Continue Regular Output</option>
          <option value="continueErrorOutput" ${currentOnError === 'continueErrorOutput' ? 'selected' : ''}>Continue Error Output (Port 1 🔴)</option>
        </select>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 5px; line-height: 1.4;">
          • <b>Stop Workflow</b>: Halts execution immediately upon error.<br/>
          • <b>Continue Regular Output</b>: Bypasses error and flows items along output 0.<br/>
          • <b>Continue Error Output</b>: Emits error object onto dedicated red Port 1.
        </div>
      </div>

      <div class="form-group" style="margin-top: 16px;">
        <label class="form-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="setting-retry-on-fail" ${isRetry ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-purple);" />
          <span>Retry on Failure</span>
        </label>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">
          Automatically retry node execution before throwing an error.
        </div>
      </div>

      <div id="retry-options-panel" style="${isRetry ? 'display: block;' : 'display: none;'} margin-left: 8px; padding-left: 12px; border-left: 2px solid var(--accent-purple); margin-bottom: 16px;">
        <div class="form-group" style="margin-bottom: 10px;">
          <label class="form-label" style="font-size: 0.78rem;">Max Tries</label>
          <input type="number" class="form-control" id="setting-max-tries" min="1" max="10" value="${maxTries}" />
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label class="form-label" style="font-size: 0.78rem;">Wait Between Tries (ms)</label>
          <input type="number" class="form-control" id="setting-wait-between-tries" min="0" step="500" value="${waitMs}" />
        </div>
      </div>

      <div class="form-group" style="margin-top: 16px;">
        <label class="form-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="setting-disabled" ${isDisabled ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-purple);" />
          <span>Disable Node</span>
        </label>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">
          When disabled, this node is bypassed during workflow execution.
        </div>
      </div>

      <div class="form-group" style="margin-top: 16px;">
        <label class="form-label">Notes & Documentation</label>
        <textarea class="form-control" id="setting-notes" rows="4" placeholder="Document purpose, inputs, or edge cases for this node...">${notes}</textarea>
      </div>
    `;

    // Event listeners for Settings
    const onErrorSelect = container.querySelector('#setting-on-error');
    onErrorSelect.addEventListener('change', (e) => {
      node.onError = e.target.value;
      if (node.onError === 'continueRegularOutput') {
        node.continueOnFail = true;
      } else {
        node.continueOnFail = false;
      }
      this.canvas.render();
    });

    const retryCheck = container.querySelector('#setting-retry-on-fail');
    const retryPanel = container.querySelector('#retry-options-panel');
    retryCheck.addEventListener('change', (e) => {
      node.retryOnFail = e.target.checked;
      retryPanel.style.display = e.target.checked ? 'block' : 'none';
    });

    const maxTriesInput = container.querySelector('#setting-max-tries');
    maxTriesInput.addEventListener('change', (e) => {
      node.maxTries = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 3));
    });

    const waitTriesInput = container.querySelector('#setting-wait-between-tries');
    waitTriesInput.addEventListener('change', (e) => {
      node.waitBetweenTries = Math.max(0, parseInt(e.target.value, 10) || 1000);
    });

    const disabledCheck = container.querySelector('#setting-disabled');
    disabledCheck.addEventListener('change', (e) => {
      node.disabled = e.target.checked;
      this.canvas.render();
    });

    const notesText = container.querySelector('#setting-notes');
    notesText.addEventListener('input', (e) => {
      node.notes = e.target.value;
    });
  }

  closeDrawer() {
    this.nodeDrawer.classList.remove('open');
    this.currentNode = null;
  }

  showNodeDebug(node) {
    if (!this.lastExecutionDetails) return;

    const nodeRecord = this.lastExecutionDetails.nodes?.find(
      (nr) => nr.nodeId === node.id || nr.nodeName === node.name
    );

    this.debugNodeTitle.textContent = `Execution Data: ${node.name}`;

    if (nodeRecord) {
      this.debugInputData.textContent = nodeRecord.inputData
        ? JSON.stringify(nodeRecord.inputData, null, 2)
        : '(No input data recorded)';

      if (nodeRecord.status === 'error') {
        this.debugOutputData.textContent = `ERROR:\n${nodeRecord.error || 'Unknown error'}`;
        this.debugOutputData.style.color = '#ef4444';
      } else {
        this.debugOutputData.textContent = nodeRecord.outputData
          ? JSON.stringify(nodeRecord.outputData, null, 2)
          : '(No output data)';
        this.debugOutputData.style.color = '#cbd5e1';
      }
      this.debugPanel.classList.add('open');
    } else {
      this.debugInputData.textContent = '(This node was not reached during the last execution)';
      this.debugOutputData.textContent = '(No output)';
    }
    this.updatePinButtonUI();
  }

  updatePinButtonUI() {
    if (!this.pinDataBtn || !this.currentNode) return;
    const isPinned = this.currentNode.pinnedData && this.currentNode.pinnedData.length > 0;
    this.pinDataBtn.textContent = isPinned ? '📌 Unpin Data' : '📌 Pin Data';
    this.pinDataBtn.className = isPinned ? 'btn btn-warning btn-sm' : 'btn btn-secondary btn-sm';
  }

  async togglePinData() {
    if (!this.currentNode) return;
    const isPinned = this.currentNode.pinnedData && this.currentNode.pinnedData.length > 0;

    if (isPinned) {
      delete this.currentNode.pinnedData;
      if (window.app?.currentWorkflow?.id) {
        try {
          await this.api(`/api/workflows/${window.app.currentWorkflow.id}/nodes/${this.currentNode.id}/unpin`, { method: 'POST' });
        } catch {}
      }
      this.updatePinButtonUI();
      this.canvas.render();
      window.app?.toast(`Data unpinned from ${this.currentNode.name}`, 'info');
    } else {
      const nodeRecord = this.lastExecutionDetails?.nodes?.find(
        (nr) => nr.nodeId === this.currentNode.id || nr.nodeName === this.currentNode.name
      );
      const dataToPin = (nodeRecord?.outputData && nodeRecord.outputData[0]) ? nodeRecord.outputData[0] : [{ json: { sample: true, timestamp: new Date().toISOString() } }];
      this.currentNode.pinnedData = dataToPin;
      if (window.app?.currentWorkflow?.id) {
        try {
          await this.api(`/api/workflows/${window.app.currentWorkflow.id}/nodes/${this.currentNode.id}/pin`, {
            method: 'POST',
            body: JSON.stringify({ pinnedData: dataToPin })
          });
        } catch {}
      }
      this.updatePinButtonUI();
      this.canvas.render();
      window.app?.toast(`Data pinned to ${this.currentNode.name} (📌)`, 'info');
    }
  }

  async executeCurrentNodeStep() {
    if (!this.currentNode || !window.app?.currentWorkflow?.id) return;
    this.testStepBtn.disabled = true;
    this.testStepBtn.textContent = '⏳ Testing...';

    try {
      const res = await this.api(`/api/workflows/${window.app.currentWorkflow.id}/nodes/${this.currentNode.id}/execute-step`, {
        method: 'POST',
        body: JSON.stringify({ inputData: this.currentNode.pinnedData || undefined })
      });

      if (res.success) {
        this.debugOutputData.textContent = JSON.stringify(res.outputData, null, 2);
        this.debugOutputData.style.color = '#cbd5e1';
        this.debugPanel.classList.add('open');
        window.app?.toast(`Step "${this.currentNode.name}" executed in ${res.duration}ms`, 'info');
      }
    } catch (err) {
      this.debugOutputData.textContent = `Execution Error:\n${err.message}`;
      this.debugOutputData.style.color = '#ef4444';
      this.debugPanel.classList.add('open');
    } finally {
      this.testStepBtn.disabled = false;
      this.testStepBtn.textContent = '▶ Test Step';
    }
  }

  closeDebug() {
    this.debugPanel.classList.remove('open');
  }

  setExecutionResults(details) {
    this.lastExecutionDetails = details;
    if (this.currentNode) {
      this.showNodeDebug(this.currentNode);
    }
  }
}
