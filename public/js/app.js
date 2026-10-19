// AutoFlow AI Main Application Orchestrator

class AutoFlowApp {
  constructor() {
    this.canvasWrapper = document.getElementById('canvas-wrapper');
    this.svgEl = document.getElementById('connections-svg');
    this.canvas = new WorkflowCanvas(this.canvasWrapper, this.svgEl);
    this.editor = new WorkflowEditor(this.canvas, this);

    this.currentWorkflow = null;
    this.nodeTypes = [];
    this.credentials = [];
    this.aiChatHistory = [];
    this.lastExecutionDetails = null;

    this.currentProjectId = localStorage.getItem('autoflow_active_project') || 'default';
    this.currentProjectName = 'Default Project';
    this.projectsList = [];
    this.projectFilter = 'active';
    this.projectSearch = '';
    this.projectSort = 'updated_at:desc';
    this.uploadedBundleBuffer = null;
    this.uploadedBundleName = null;

    this.initUI();
    this.initProjectsUI();
    this.initAiCopilot();
    this.initFullscreenViewer();
    this.initAutoFix();
    this.initTemplatesModal();
    this.initPayloadSimulator();
    this.loadInitialData();
  }

  // --- API Client Helpers ---
  async api(endpoint, options = {}) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      this.toast(`Error: ${err.message}`, 'error');
      throw err;
    }
  }

  // --- Toast Notifications ---
  toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  // --- Initialization ---
  async loadInitialData() {
    try {
      // 1. Fetch available node types
      const typesRes = await this.api('/api/node-types');
      this.nodeTypes = typesRes.data || [];
      this.canvas.setNodeTypes(this.nodeTypes);

      // 2. Fetch credentials
      const credsRes = await this.api('/api/credentials');
      this.credentials = credsRes.data || [];

      await this.editor.init(this.nodeTypes, this.credentials);

      // 3. Load active project info
      await this.loadActiveProject();

      // 4. Load or create initial workflow
      const wfRes = await this.api(`/api/workflows?projectId=${encodeURIComponent(this.currentProjectId || 'default')}`);
      if (wfRes.data && wfRes.data.length > 0) {
        this.openWorkflow(wfRes.data[0]);
      } else {
        this.createNewWorkflow('Sample Gemini AI Workflow');
      }

      this.loadProjectsList();
      this.loadWorkflowsList();
      await this.checkAiStatus();
    } catch (err) {
      console.error('App init error:', err);
      const pal = document.getElementById('palette-categories');
      if (pal) {
        pal.innerHTML = `
          <div style="padding: 24px 12px; text-align: center; color: #ef4444; font-size: 0.8rem;">
            Failed to load node catalog.<br/>
            <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="window.app.loadInitialData()">Retry</button>
          </div>
        `;
      }
    }
  }

  async loadActiveProject() {
    try {
      const res = await this.api(`/api/projects/${encodeURIComponent(this.currentProjectId || 'default')}`);
      if (res.data) {
        this.currentProjectId = res.data.id;
        this.currentProjectName = res.data.name;
        this.updateProjectHeaderUI();
      }
    } catch (err) {
      this.currentProjectId = 'default';
      this.currentProjectName = 'Default Project';
      this.updateProjectHeaderUI();
    }
  }

  updateProjectHeaderUI() {
    const headerProj = document.getElementById('current-project-name');
    if (headerProj) {
      headerProj.textContent = this.currentProjectName;
      headerProj.title = `Current Workspace Project: ${this.currentProjectName} (${this.currentProjectId})`;
    }
    const breadcrumbProj = document.getElementById('editor-breadcrumb-project');
    if (breadcrumbProj) {
      breadcrumbProj.textContent = this.currentProjectName;
      breadcrumbProj.title = `Switch Workspace Project (Current: ${this.currentProjectName})`;
    }
  }

  initUI() {
    // Navigation Tabs (Desktop)
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const viewId = tab.dataset.view;
        this.switchView(viewId);
      });
    });

    // Mobile Bottom Navigation Bar
    document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        this.switchView(viewId);
      });
    });

    // Header More Actions Dropdown (Clean n8n More Menu)
    const moreBtn = document.getElementById('header-more-btn');
    const moreContainer = document.getElementById('header-more-container');
    if (moreBtn && moreContainer) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreContainer.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!moreContainer.contains(e.target)) {
          moreContainer.classList.remove('open');
        }
      });
      moreContainer.querySelectorAll('.dropdown-item').forEach((item) => {
        item.addEventListener('click', () => {
          moreContainer.classList.remove('open');
        });
      });
    }

    // Workflow Title Edit
    const titleInput = document.getElementById('workflow-title-input');
    titleInput.addEventListener('change', (e) => {
      if (this.currentWorkflow) {
        this.currentWorkflow.name = e.target.value.trim() || 'Untitled Workflow';
      }
    });

    // Undo & Redo Canvas Buttons
    document.getElementById('canvas-undo-btn')?.addEventListener('click', () => {
      this.canvas.undo();
    });
    document.getElementById('canvas-redo-btn')?.addEventListener('click', () => {
      this.canvas.redo();
    });

    // Zoom to Fit Button
    document.getElementById('canvas-zoom-fit-btn')?.addEventListener('click', () => {
      this.canvas.zoomToFit();
    });

    // Add Sticky Note Button
    document.getElementById('canvas-add-note-btn')?.addEventListener('click', () => {
      if (!this.currentWorkflow) return;
      this.canvas.pushSnapshot();
      const rect = this.canvas.container.getBoundingClientRect();
      const center = this.canvas.screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const newNote = {
        id: 'note_' + Math.random().toString(36).substring(2, 9),
        name: 'Sticky Note',
        type: 'sticky-note',
        position: { x: Math.round(center.x - 150), y: Math.round(center.y - 90) },
        parameters: {
          content: '## Workflow Section\nDouble click to edit instructions or notes...',
          color: 'yellow',
          width: 300,
          height: 180
        }
      };
      this.currentWorkflow.nodes.push(newNote);
      this.canvas.render();
      this.canvas.selectNode(newNote.id);
      this.toast('Sticky note added to canvas', 'info');
    });

    // Version History Button & Drawer
    document.getElementById('canvas-history-btn')?.addEventListener('click', () => {
      this.openVersionHistory();
    });
    document.getElementById('close-history-btn')?.addEventListener('click', () => {
      document.getElementById('version-history-drawer')?.classList.remove('open');
      if (!document.querySelector('.node-drawer.open, .ai-copilot-drawer.open, .editor-sidebar.open')) {
        document.body.classList.remove('has-open-drawer');
      }
    });

    // Prune Executions Button
    document.getElementById('prune-executions-btn')?.addEventListener('click', async () => {
      if (confirm('Prune execution records older than 14 days?')) {
        try {
          const res = await this.api('/api/executions/prune', {
            method: 'POST',
            body: JSON.stringify({ maxAgeDays: 14 })
          });
          this.toast(res.message || 'Executions pruned', 'success');
          this.loadExecutionsList();
        } catch (err) {
          this.toast(`Pruning failed: ${err.message}`, 'error');
        }
      }
    });

    // Folder Filter in Workflows Dashboard
    document.getElementById('workflows-folder-filter')?.addEventListener('change', (e) => {
      this.selectedFolderId = e.target.value;
      this.loadWorkflowsList();
    });

    // Save Workflow Button
    document.getElementById('save-workflow-btn').addEventListener('click', () => {
      this.saveCurrentWorkflow();
    });

    // Execute Workflow Button
    document.getElementById('execute-workflow-btn').addEventListener('click', () => {
      this.executeCurrentWorkflowStream();
    });

    // Active Toggle Button
    const activeToggle = document.getElementById('workflow-active-toggle');
    activeToggle.addEventListener('click', async () => {
      if (!this.currentWorkflow) return;
      try {
        const res = await this.api(`/api/workflows/${this.currentWorkflow.id}/activate`, { method: 'POST' });
        this.currentWorkflow.active = res.data.active;
        this.updateActiveToggleUI();
        this.toast(`Workflow is now ${this.currentWorkflow.active ? 'ACTIVE' : 'INACTIVE'}`, 'info');
      } catch (err) {}
    });

    // Import / Export Buttons
    document.getElementById('import-workflow-btn').addEventListener('click', () => {
      document.getElementById('import-modal').classList.add('open');
    });

    document.getElementById('export-autoflow-btn').addEventListener('click', () => {
      if (!this.currentWorkflow) return;
      window.open(`/api/workflows/${this.currentWorkflow.id}/export?format=autoflow`, '_blank');
    });

    document.getElementById('export-n8n-btn').addEventListener('click', () => {
      if (!this.currentWorkflow) return;
      window.open(`/api/workflows/${this.currentWorkflow.id}/export?format=n8n`, '_blank');
    });

    // Import Modal Actions
    document.getElementById('cancel-import-btn').addEventListener('click', () => {
      document.getElementById('import-modal').classList.remove('open');
    });

    document.getElementById('confirm-import-btn').addEventListener('click', async () => {
      const jsonText = document.getElementById('import-json-textarea').value.trim();
      if (!jsonText) return;

      try {
        const parsed = JSON.parse(jsonText);
        const res = await this.api('/api/workflows/import', {
          method: 'POST',
          body: JSON.stringify(parsed)
        });
        document.getElementById('import-modal').classList.remove('open');
        this.toast('Workflow imported successfully!', 'success');
        this.openWorkflow(res.data);
      } catch (err) {
        this.toast(`Import failed: ${err.message}`, 'error');
      }
    });

    // New Workflow Button (Dashboard)
    document.getElementById('new-workflow-btn').addEventListener('click', () => {
      this.createNewWorkflow();
    });

    // Type change toggle in Credential modal
    const credTypeSelect = document.getElementById('cred-type');
    const credUserGroup = document.getElementById('cred-user-group');
    const credOAuthGroup = document.getElementById('cred-oauth2-group');
    const credSecretGroup = document.getElementById('cred-secret-group');
    const saveCredBtn = document.getElementById('save-cred-btn');
    const oauthProviderSelect = document.getElementById('cred-oauth-provider');
    const oauthCustomUrls = document.getElementById('cred-oauth-custom-urls');

    if (credTypeSelect) {
      credTypeSelect.addEventListener('change', () => {
        const type = credTypeSelect.value;
        if (credUserGroup) credUserGroup.style.display = type === 'basic_auth' ? 'block' : 'none';
        if (credOAuthGroup) credOAuthGroup.style.display = type === 'oauth2' ? 'block' : 'none';
        if (credSecretGroup) credSecretGroup.style.display = type === 'oauth2' ? 'none' : 'block';
        if (saveCredBtn) saveCredBtn.style.display = type === 'oauth2' ? 'none' : 'inline-block';
      });
    }

    if (oauthProviderSelect) {
      oauthProviderSelect.addEventListener('change', () => {
        if (oauthCustomUrls) {
          oauthCustomUrls.style.display = oauthProviderSelect.value === 'custom' ? 'block' : 'none';
        }
      });
    }

    // Connect with OAuth2 Button
    const oauthConnectBtn = document.getElementById('cred-oauth-connect-btn');
    if (oauthConnectBtn) {
      oauthConnectBtn.addEventListener('click', async () => {
        const name = document.getElementById('cred-name').value.trim();
        const provider = document.getElementById('cred-oauth-provider').value;
        const clientId = document.getElementById('cred-oauth-client-id').value.trim();
        const clientSecret = document.getElementById('cred-oauth-client-secret').value.trim();
        const scope = document.getElementById('cred-oauth-scope')?.value.trim();
        const authUrl = document.getElementById('cred-oauth-auth-url')?.value.trim();
        const tokenUrl = document.getElementById('cred-oauth-token-url')?.value.trim();

        if (!name) {
          this.toast('Please enter a credential name', 'error');
          return;
        }
        if (!clientId || !clientSecret) {
          this.toast('Client ID and Client Secret are required', 'error');
          return;
        }

        try {
          oauthConnectBtn.disabled = true;
          oauthConnectBtn.textContent = 'Opening Login Window...';

          const res = await this.api('/api/credentials/oauth2/start', {
            method: 'POST',
            body: JSON.stringify({
              name,
              provider,
              clientId,
              clientSecret,
              scope: scope || undefined,
              authUrl: authUrl || undefined,
              tokenUrl: tokenUrl || undefined
            })
          });

          if (!res || !res.data?.authUrl) {
            throw new Error('Failed to retrieve authorization URL');
          }

          const popup = window.open(res.data.authUrl, 'autoflow_oauth_popup', 'width=620,height=720,menubar=no,toolbar=no');

          const onOAuthMessage = (event) => {
            if (event.data?.type === 'OAUTH2_AUTH_COMPLETE') {
              window.removeEventListener('message', onOAuthMessage);
              oauthConnectBtn.disabled = false;
              oauthConnectBtn.textContent = '🔗 Connect Account via OAuth2';

              if (event.data.success) {
                this.toast('Account connected successfully via OAuth2!', 'success');
                document.getElementById('credential-modal').classList.remove('open');
                this.loadCredentialsList();
              } else {
                this.toast('OAuth2 failed: ' + (event.data.message || 'Access denied'), 'error');
              }
            }
          };

          window.addEventListener('message', onOAuthMessage);
        } catch (err) {
          oauthConnectBtn.disabled = false;
          oauthConnectBtn.textContent = '🔗 Connect Account via OAuth2';
          this.toast(err.message, 'error');
        }
      });
    }

    // New Credential Button (Credentials View)
    document.getElementById('new-credential-btn').addEventListener('click', () => {
      document.getElementById('credential-modal').classList.add('open');
    });

    document.getElementById('cancel-cred-btn').addEventListener('click', () => {
      document.getElementById('credential-modal').classList.remove('open');
    });

    document.getElementById('save-cred-btn').addEventListener('click', async () => {
      const name = document.getElementById('cred-name').value.trim();
      const type = document.getElementById('cred-type').value;
      const keyOrToken = document.getElementById('cred-secret').value.trim();

      if (!name || !keyOrToken) {
        this.toast('Please fill in credential name and value', 'error');
        return;
      }

      let payloadData = {};
      if (type === 'gemini_api_key') payloadData = { apiKey: keyOrToken };
      else if (type === 'openai_api_key') payloadData = { apiKey: keyOrToken };
      else if (type === 'bearer_token') payloadData = { token: keyOrToken };
      else if (type === 'basic_auth') {
        const user = document.getElementById('cred-user')?.value || 'admin';
        payloadData = { user, password: keyOrToken };
      }

      try {
        await this.api('/api/credentials', {
          method: 'POST',
          body: JSON.stringify({ name, type, data: payloadData })
        });
        document.getElementById('credential-modal').classList.remove('open');
        this.toast('Credential saved securely!', 'success');
        this.loadCredentialsList();
      } catch (err) {}
    });
  }

  // --- Project Workspace Management ---
  initProjectsUI() {
    // Header & Breadcrumb project click
    document.getElementById('project-selector-btn')?.addEventListener('click', () => {
      this.switchView('projects');
    });
    document.getElementById('editor-breadcrumb-project')?.addEventListener('click', () => {
      this.switchView('projects');
    });

    // New Project Button
    document.getElementById('new-project-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('project-modal');
      if (!modal) return;
      document.getElementById('project-modal-title').textContent = 'Create New Project';
      document.getElementById('edit-project-id').value = '';
      document.getElementById('project-name-input').value = '';
      document.getElementById('project-desc-input').value = '';
      document.getElementById('project-labels-input').value = '';
      document.getElementById('project-color-input').value = '#6366f1';
      modal.classList.add('open');
    });

    // Close Project Modal
    document.getElementById('close-project-modal-btn')?.addEventListener('click', () => {
      document.getElementById('project-modal')?.classList.remove('open');
    });
    document.getElementById('cancel-project-btn')?.addEventListener('click', () => {
      document.getElementById('project-modal')?.classList.remove('open');
    });

    // Save Project (Create or Update)
    document.getElementById('save-project-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('project-name-input').value.trim();
      const desc = document.getElementById('project-desc-input').value.trim();
      const rawLabels = document.getElementById('project-labels-input').value.trim();
      const color = document.getElementById('project-color-input').value;
      const editId = document.getElementById('edit-project-id').value.trim();

      if (!name) {
        this.toast('Project name is required', 'error');
        return;
      }

      const labels = rawLabels ? rawLabels.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const payload = {
        name,
        description: desc,
        labels,
        settings: { color }
      };

      try {
        if (editId) {
          await this.api(`/api/projects/${editId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          if (this.currentProjectId === editId) {
            this.currentProjectName = name;
            this.updateProjectHeaderUI();
          }
          this.toast(`Project "${name}" updated`, 'success');
        } else {
          const res = await this.api('/api/projects', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          this.toast(`Project "${name}" created`, 'success');
          if (res.data) {
            this.selectProject(res.data.id, res.data.name);
          }
        }
        document.getElementById('project-modal')?.classList.remove('open');
        this.loadProjectsList();
      } catch (err) {
        this.toast(`Failed to save project: ${err.message}`, 'error');
      }
    });

    // Duplicate Project Modal
    document.getElementById('close-dup-modal-btn')?.addEventListener('click', () => {
      document.getElementById('duplicate-project-modal')?.classList.remove('open');
    });
    document.getElementById('cancel-dup-btn')?.addEventListener('click', () => {
      document.getElementById('duplicate-project-modal')?.classList.remove('open');
    });
    document.getElementById('confirm-dup-btn')?.addEventListener('click', async () => {
      const sourceId = document.getElementById('dup-source-id').value;
      const newName = document.getElementById('dup-name-input').value.trim();
      if (!sourceId) return;
      try {
        const res = await this.api(`/api/projects/${sourceId}/duplicate`, {
          method: 'POST',
          body: JSON.stringify({ name: newName || undefined })
        });
        document.getElementById('duplicate-project-modal')?.classList.remove('open');
        this.toast('Project duplicated successfully!', 'success');
        this.loadProjectsList();
        if (res.data?.project) {
          this.selectProject(res.data.project.id, res.data.project.name);
        }
      } catch (err) {
        this.toast(`Duplication failed: ${err.message}`, 'error');
      }
    });

    // Import Bundle Modal
    const importBundleBtn = document.getElementById('import-bundle-btn');
    const importBundleModal = document.getElementById('import-bundle-modal');
    const closeBundleBtn = document.getElementById('close-bundle-modal-btn');
    const cancelBundleBtn = document.getElementById('cancel-bundle-btn');
    const bundleDropzone = document.getElementById('bundle-dropzone');
    const bundleFileInput = document.getElementById('bundle-file-input');
    const bundleLabel = document.getElementById('bundle-dropzone-label');
    const confirmBundleBtn = document.getElementById('confirm-bundle-import-btn');

    importBundleBtn?.addEventListener('click', () => {
      this.uploadedBundleBuffer = null;
      this.uploadedBundleName = null;
      if (bundleLabel) bundleLabel.textContent = 'Click to select .ZIP or .JSON bundle';
      document.getElementById('bundle-json-input').value = '';
      importBundleModal?.classList.add('open');
    });

    closeBundleBtn?.addEventListener('click', () => {
      importBundleModal?.classList.remove('open');
    });
    cancelBundleBtn?.addEventListener('click', () => {
      importBundleModal?.classList.remove('open');
    });

    bundleDropzone?.addEventListener('click', () => {
      bundleFileInput?.click();
    });

    const handleFile = (file) => {
      if (!file) return;
      this.uploadedBundleName = file.name;
      if (bundleLabel) bundleLabel.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;

      if (file.name.endsWith('.zip') || file.type.includes('zip')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.uploadedBundleBuffer = e.target.result;
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('bundle-json-input').value = e.target.result;
        };
        reader.readAsText(file);
      }
    };

    bundleFileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    bundleDropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      bundleDropzone.style.borderColor = 'var(--primary-color)';
    });

    bundleDropzone?.addEventListener('dragleave', () => {
      bundleDropzone.style.borderColor = 'var(--border-color)';
    });

    bundleDropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      bundleDropzone.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    confirmBundleBtn?.addEventListener('click', async () => {
      const targetMode = document.getElementById('bundle-target-select')?.value || 'new';
      const targetProjectId = targetMode === 'current' ? this.currentProjectId : null;
      const jsonText = document.getElementById('bundle-json-input')?.value.trim();

      try {
        confirmBundleBtn.disabled = true;
        confirmBundleBtn.textContent = 'Importing...';

        let res;
        const targetUrl = '/api/projects/import-bundle' + (targetProjectId ? `?projectId=${encodeURIComponent(targetProjectId)}` : '');

        if (this.uploadedBundleBuffer) {
          res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/zip' },
            body: this.uploadedBundleBuffer
          }).then((r) => r.json());
        } else if (jsonText) {
          const parsed = JSON.parse(jsonText);
          res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          }).then((r) => r.json());
        } else {
          this.toast('Please select a file or paste JSON bundle', 'error');
          return;
        }

        if (!res.success) {
          throw new Error(res.error || 'Import failed');
        }

        importBundleModal?.classList.remove('open');
        this.toast(`Imported ${res.data.count} workflow(s) successfully!`, 'success');

        if (res.data?.validation?.warnings && res.data.validation.warnings.length > 0) {
          this.toast(`Import notice: ${res.data.validation.warnings[0]}`, 'warning');
        }

        this.loadProjectsList();
        if (res.data.project) {
          this.selectProject(res.data.project.id, res.data.project.name);
        } else {
          this.loadWorkflowsList();
        }
      } catch (err) {
        this.toast(`Bundle import failed: ${err.message}`, 'error');
      } finally {
        confirmBundleBtn.disabled = false;
        confirmBundleBtn.textContent = 'Import Project';
      }
    });

    // Export Bundle Modal
    document.getElementById('close-export-modal-btn')?.addEventListener('click', () => {
      document.getElementById('export-bundle-modal')?.classList.remove('open');
    });
    document.getElementById('cancel-export-btn')?.addEventListener('click', () => {
      document.getElementById('export-bundle-modal')?.classList.remove('open');
    });
    document.getElementById('confirm-export-download-btn')?.addEventListener('click', () => {
      const projId = document.getElementById('export-project-id')?.value;
      const format = document.querySelector('input[name="export-format"]:checked')?.value || 'zip';
      if (!projId) return;
      window.open(`/api/projects/${projId}/export?format=${format}`, '_blank');
      document.getElementById('export-bundle-modal')?.classList.remove('open');
    });

    // Active / Archived Filter Tabs
    const activeTab = document.getElementById('filter-active-projects-btn');
    const archivedTab = document.getElementById('filter-archived-projects-btn');

    activeTab?.addEventListener('click', () => {
      this.projectFilter = 'active';
      activeTab.classList.add('active');
      archivedTab?.classList.remove('active');
      this.loadProjectsList();
    });

    archivedTab?.addEventListener('click', () => {
      this.projectFilter = 'archived';
      archivedTab.classList.add('active');
      activeTab?.classList.remove('active');
      this.loadProjectsList();
    });

    // Search & Sort
    document.getElementById('project-search-input')?.addEventListener('input', (e) => {
      this.projectSearch = e.target.value.toLowerCase().trim();
      this.renderProjectsGrid();
    });

    document.getElementById('project-sort-select')?.addEventListener('change', (e) => {
      this.projectSort = e.target.value;
      this.renderProjectsGrid();
    });
  }

  async loadProjectsList() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">Loading projects...</div>';

    try {
      const isArchived = this.projectFilter === 'archived';
      const [projectsRes, metricsRes] = await Promise.all([
        this.api(`/api/projects?archived=${isArchived}`),
        this.api('/api/projects/metrics/overview').catch(() => null)
      ]);

      this.projectsList = projectsRes.data || [];

      // Update metrics summary cards
      if (metricsRes && metricsRes.data) {
        const m = metricsRes.data;
        const totalP = document.getElementById('metric-total-projects');
        const totalW = document.getElementById('metric-total-workflows');
        const activeW = document.getElementById('metric-active-workflows');
        const healthR = document.getElementById('metric-health-rate');

        if (totalP) totalP.textContent = m.totalProjects;
        if (totalW) totalW.textContent = m.totalWorkflows;
        if (activeW) activeW.textContent = m.activeWorkflows;
        if (healthR) healthR.textContent = `${m.overallHealthRate}%`;
      }

      this.renderProjectsGrid();
    } catch (err) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 40px;">Failed to load projects: ${err.message}</div>`;
    }
  }

  renderProjectsGrid() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    let items = [...this.projectsList];

    // Search filter
    if (this.projectSearch) {
      items = items.filter((p) =>
        (p.name && p.name.toLowerCase().includes(this.projectSearch)) ||
        (p.description && p.description.toLowerCase().includes(this.projectSearch)) ||
        (Array.isArray(p.labels) && p.labels.some((l) => l.toLowerCase().includes(this.projectSearch)))
      );
    }

    // Sort
    const [sortField, sortDir] = (this.projectSort || 'updated_at:desc').split(':');
    items.sort((a, b) => {
      let valA, valB;
      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'created_at') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      valA = new Date(a.updatedAt).getTime();
      valB = new Date(b.updatedAt).getTime();
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 12px;">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">📁</div>
          <h3 style="color: #fff; margin-bottom: 6px;">No projects found</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 420px; margin: 0 auto 16px;">
            ${this.projectSearch ? 'No projects match your search query.' : this.projectFilter === 'archived' ? 'No archived projects.' : 'Create a new project workspace to organize your automation pipelines.'}
          </p>
          <button class="btn btn-primary" onclick="document.getElementById('new-project-btn').click()">+ Create Project</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    for (const proj of items) {
      const isCurrent = proj.id === this.currentProjectId;
      const color = proj.settings?.color || '#6366f1';
      const healthStatus = proj.health?.status || 'idle';
      const successRate = proj.health?.successRate ?? 100;
      const totalRuns = proj.health?.totalRuns ?? 0;

      const healthBadgeClass =
        healthStatus === 'healthy' ? 'badge-success' :
        healthStatus === 'warning' ? 'badge-warning' :
        healthStatus === 'error' ? 'badge-error' : 'badge-inactive';

      const labelsHtml = (proj.labels || []).map((l) => `<span class="proj-label-pill">${this.escapeHtml(l)}</span>`).join('');

      const card = document.createElement('div');
      card.className = `project-card ${isCurrent ? 'current-project' : ''}`;
      card.style.borderTop = `4px solid ${color}`;

      card.innerHTML = `
        <div class="project-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="project-color-dot" style="background: ${color}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
            <h3 class="project-card-title">${this.escapeHtml(proj.name)}</h3>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${isCurrent ? '<span class="badge badge-active" style="font-size: 0.7rem;">Active</span>' : ''}
            ${proj.archived ? '<span class="badge badge-inactive" style="font-size: 0.7rem;">Archived</span>' : ''}
          </div>
        </div>

        <p class="project-card-desc">${this.escapeHtml(proj.description || 'No description provided')}</p>

        <div class="project-labels-row" style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; min-height: 20px;">
          ${labelsHtml || '<span style="font-size: 0.75rem; color: var(--text-muted);">—</span>'}
        </div>

        <div class="project-card-stats">
          <div class="pstat">
            <span class="pstat-val">⚡ ${proj.workflowCount || 0}</span>
            <span class="pstat-lbl">Workflows</span>
          </div>
          <div class="pstat">
            <span class="badge ${healthBadgeClass}" style="font-size: 0.75rem;">${healthStatus.toUpperCase()} (${successRate}%)</span>
            <span class="pstat-lbl">${totalRuns} executions</span>
          </div>
          <div class="pstat" style="text-align: right;">
            <span class="pstat-val" style="font-size: 0.75rem; color: var(--text-muted);">${new Date(proj.updatedAt).toLocaleDateString()}</span>
            <span class="pstat-lbl">Updated</span>
          </div>
        </div>

        <div class="project-card-actions">
          <button class="btn btn-primary btn-sm open-proj-btn" title="Open workspace">Open Workspace</button>
          <button class="btn btn-secondary btn-sm export-proj-btn" title="Export ZIP/JSON bundle">📦 Export</button>
          <button class="btn btn-secondary btn-sm dup-proj-btn" title="Clone project">Duplicate</button>
          <button class="btn btn-secondary btn-sm edit-proj-btn" title="Edit project">Edit</button>
          <button class="btn btn-secondary btn-sm toggle-archive-proj-btn" title="${proj.archived ? 'Restore project' : 'Archive project'}">${proj.archived ? 'Restore' : 'Archive'}</button>
          ${proj.id !== 'default' ? `<button class="btn btn-danger btn-sm del-proj-btn" title="Permanently delete project">✕</button>` : ''}
        </div>
      `;

      // Event listeners
      card.querySelector('.open-proj-btn')?.addEventListener('click', () => {
        this.selectProject(proj.id, proj.name);
      });

      card.querySelector('.export-proj-btn')?.addEventListener('click', () => {
        document.getElementById('export-project-id').value = proj.id;
        document.getElementById('export-bundle-modal')?.classList.add('open');
      });

      card.querySelector('.dup-proj-btn')?.addEventListener('click', () => {
        document.getElementById('dup-source-id').value = proj.id;
        document.getElementById('dup-name-input').value = `Copy of ${proj.name}`;
        document.getElementById('duplicate-project-modal')?.classList.add('open');
      });

      card.querySelector('.edit-proj-btn')?.addEventListener('click', () => {
        document.getElementById('project-modal-title').textContent = 'Edit Project';
        document.getElementById('edit-project-id').value = proj.id;
        document.getElementById('project-name-input').value = proj.name;
        document.getElementById('project-desc-input').value = proj.description || '';
        document.getElementById('project-labels-input').value = (proj.labels || []).join(', ');
        document.getElementById('project-color-input').value = proj.settings?.color || '#6366f1';
        document.getElementById('project-modal')?.classList.add('open');
      });

      card.querySelector('.toggle-archive-proj-btn')?.addEventListener('click', async () => {
        try {
          if (proj.archived) {
            await this.api(`/api/projects/${proj.id}`, {
              method: 'PUT',
              body: JSON.stringify({ archived: false })
            });
            this.toast(`Project "${proj.name}" restored`, 'success');
          } else {
            await this.api(`/api/projects/${proj.id}`, { method: 'DELETE' });
            this.toast(`Project "${proj.name}" archived`, 'info');
          }
          this.loadProjectsList();
        } catch (err) {
          this.toast(`Action failed: ${err.message}`, 'error');
        }
      });

      card.querySelector('.del-proj-btn')?.addEventListener('click', async () => {
        if (confirm(`Permanently delete project "${proj.name}" and ALL its workflows? This action cannot be undone.`)) {
          try {
            await this.api(`/api/projects/${proj.id}?hard=true`, { method: 'DELETE' });
            this.toast(`Project "${proj.name}" deleted`, 'info');
            if (this.currentProjectId === proj.id) {
              this.selectProject('default', 'Default Project');
            } else {
              this.loadProjectsList();
            }
          } catch (err) {
            this.toast(`Delete failed: ${err.message}`, 'error');
          }
        }
      });

      grid.appendChild(card);
    }
  }

  selectProject(projectId, projectName) {
    this.currentProjectId = projectId;
    this.currentProjectName = projectName || 'Project';
    localStorage.setItem('autoflow_active_project', projectId);
    this.updateProjectHeaderUI();
    this.loadWorkflowsList();
    this.switchView('workflows');
    this.toast(`Switched workspace to "${this.currentProjectName}"`, 'info');
  }

  switchView(viewName) {
    document.querySelectorAll('.nav-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.view === viewName);
    });

    document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    document.querySelectorAll('.view-container').forEach((vc) => {
      vc.classList.toggle('active', vc.id === `view-${viewName}`);
    });

    if (viewName === 'projects') this.loadProjectsList();
    if (viewName === 'workflows') this.loadWorkflowsList();
    if (viewName === 'executions') this.loadExecutionsList();
    if (viewName === 'credentials') this.loadCredentialsList();
  }

  // --- Workflow Management ---
  openWorkflow(workflow) {
    this.currentWorkflow = workflow;
    document.getElementById('workflow-title-input').value = workflow.name;
    this.updateActiveToggleUI();
    this.canvas.loadWorkflow(this.currentWorkflow);
    setTimeout(() => this.canvas.zoomToFit(), 60);
    this.switchView('editor');
  }

  async createNewWorkflow(defaultName = 'New Workflow') {
    const templateNodes = [
      {
        id: 'node_start',
        name: 'Manual Trigger',
        type: 'manual-trigger',
        position: { x: 120, y: 180 },
        parameters: {}
      },
      {
        id: 'node_http',
        name: 'Fetch Data',
        type: 'http-request',
        position: { x: 420, y: 180 },
        parameters: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET'
        }
      },
      {
        id: 'node_gemini',
        name: 'Gemini AI Analyze',
        type: 'gemini',
        position: { x: 720, y: 180 },
        parameters: {
          model: 'gemini-3.8-flash',
          prompt: 'Summarize this data into 2 bullet points:\nTitle: {{ $json.data.title }}\nBody: {{ $json.data.body }}'
        }
      },
      {
        id: 'node_if',
        name: 'Check Output',
        type: 'if-condition',
        position: { x: 1020, y: 180 },
        parameters: {
          value1: '{{ $json.text }}',
          operation: 'isNotEmpty'
        }
      }
    ];

    const templateConnections = [
      { source: 'Manual Trigger', sourceOutput: 0, target: 'Fetch Data', targetInput: 0 },
      { source: 'Fetch Data', sourceOutput: 0, target: 'Gemini AI Analyze', targetInput: 0 },
      { source: 'Gemini AI Analyze', sourceOutput: 0, target: 'Check Output', targetInput: 0 }
    ];

    try {
      const res = await this.api('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name: defaultName,
          nodes: templateNodes,
          connections: templateConnections,
          active: false,
          projectId: this.currentProjectId || 'default'
        })
      });
      this.toast('New workflow created with Gemini template!', 'success');
      this.openWorkflow(res.data);
    } catch (err) {}
  }

  async saveCurrentWorkflow() {
    if (!this.currentWorkflow) return;
    if (!this.currentWorkflow.projectId) {
      this.currentWorkflow.projectId = this.currentProjectId || 'default';
    }
    try {
      const res = await this.api(`/api/workflows/${this.currentWorkflow.id}`, {
        method: 'PUT',
        body: JSON.stringify(this.currentWorkflow)
      });
      this.currentWorkflow = res.data;
      this.toast('Workflow saved successfully', 'success');
    } catch (err) {}
  }

  async executeCurrentWorkflow() {
    if (!this.currentWorkflow) return;

    // Auto-save changes first
    await this.saveCurrentWorkflow();

    this.toast('Running workflow execution...', 'info');
    this.canvas.clearExecutionStatuses();

    // Mark all nodes as running
    for (const node of this.currentWorkflow.nodes) {
      this.canvas.setNodeExecutionStatus(node.id, 'running');
    }

    try {
      const res = await this.api(`/api/workflows/${this.currentWorkflow.id}/execute`, {
        method: 'POST',
        body: JSON.stringify({})
      });

      const details = res.data;
      this.lastExecutionDetails = details;
      this.editor.setExecutionResults(details);
      this.updateFullscreenOutputIfOpen();

      // Update node badges based on actual execution results
      if (details && details.nodes) {
        for (const nr of details.nodes) {
          this.canvas.setNodeExecutionStatus(nr.nodeId, nr.status, nr.duration);
        }
      }

      if (details.execution.status === 'success') {
        this.toast(`Workflow completed in ${details.execution.duration}ms!`, 'success');
      } else {
        this.toast(`Execution error: ${details.execution.errorMessage}`, 'error');
      }
    } catch (err) {
      this.toast(`Execution failed: ${err.message}`, 'error');
      for (const node of this.currentWorkflow.nodes) {
        this.canvas.setNodeExecutionStatus(node.id, 'error');
      }
    }
  }

  updateActiveToggleUI() {
    const btn = document.getElementById('workflow-active-toggle');
    if (!btn || !this.currentWorkflow) return;

    if (this.currentWorkflow.active) {
      btn.textContent = 'Active (Live)';
      btn.className = 'btn btn-success btn-sm';
    } else {
      btn.textContent = 'Inactive';
      btn.className = 'btn btn-secondary btn-sm';
    }
  }

  // --- Version History Management (Capability 6) ---
  async openVersionHistory() {
    if (!this.currentWorkflow) return;
    const historyDrawer = document.getElementById('version-history-drawer');
    const listEl = document.getElementById('version-history-list');
    if (!historyDrawer || !listEl) return;

    listEl.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">Loading version history...</div>';
    
    // Close other drawers to prevent overlapping
    document.getElementById('node-drawer')?.classList.remove('open');
    document.getElementById('ai-copilot-drawer')?.classList.remove('open');
    document.getElementById('editor-sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('open');
    document.body.classList.add('has-open-drawer');

    historyDrawer.classList.add('open');

    try {
      const res = await this.api(`/api/workflows/${this.currentWorkflow.id}/versions`);
      const versions = res.data || [];

      if (versions.length === 0) {
        listEl.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No previous versions recorded.</div>';
        return;
      }

      listEl.innerHTML = versions.map((v) => {
        const dateStr = new Date(v.createdAt).toLocaleString();
        return `
          <div class="version-card">
            <div class="version-card-header">
              <span class="version-num-pill">Version ${v.versionNum}</span>
              <span class="version-date">${dateStr}</span>
            </div>
            <div class="version-desc">${v.description || 'Workflow snapshot'}</div>
            <div class="version-meta">
              <span>⚡ ${v.nodeCount} nodes</span>
              <span>🔗 ${v.connectionCount} connections</span>
            </div>
            <div class="version-card-actions">
              <button class="btn btn-secondary btn-sm restore-version-btn" data-vid="${v.id}" data-vnum="${v.versionNum}">↺ Restore This Version</button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.restore-version-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const vId = btn.dataset.vid;
          const vNum = btn.dataset.vnum;
          if (confirm(`Restore workflow to Version ${vNum}? Current canvas state will be saved as a new version first.`)) {
            try {
              btn.disabled = true;
              btn.textContent = 'Restoring...';
              const restoreRes = await this.api(`/api/workflows/${this.currentWorkflow.id}/versions/${vId}/restore`, { method: 'POST' });
              this.currentWorkflow = restoreRes.data;
              this.canvas.loadWorkflow(this.currentWorkflow);
              document.getElementById('workflow-title-input').value = this.currentWorkflow.name;
              this.updateActiveToggleUI();
              this.toast(`Workflow successfully restored to Version ${vNum}!`, 'success');
              this.openVersionHistory();
            } catch (err) {
              this.toast(`Restore failed: ${err.message}`, 'error');
              btn.disabled = false;
              btn.textContent = '↺ Restore This Version';
            }
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load versions: ${err.message}</div>`;
    }
  }

  // --- Dashboard Views ---
  async loadWorkflowsList() {
    const tbody = document.getElementById('workflows-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';

    try {
      // 1. Fetch tags and folders
      const [foldersRes, tagsRes] = await Promise.all([
        this.api('/api/folders').catch(() => ({ data: [] })),
        this.api('/api/tags').catch(() => ({ data: [] }))
      ]);

      const folders = foldersRes.data || [];
      const tags = tagsRes.data || [];
      const tagsMap = new Map(tags.map((t) => [t.id, t]));
      const foldersMap = new Map(folders.map((f) => [f.id, f.name]));

      // Populate folders select
      const folderSelect = document.getElementById('workflows-folder-filter');
      if (folderSelect) {
        folderSelect.innerHTML = '<option value="">📁 All Folders</option>' + folders.map((f) =>
          `<option value="${f.id}" ${this.selectedFolderId === f.id ? 'selected' : ''}>📁 ${f.name}</option>`
        ).join('');
      }

      // Populate tags bar
      const tagsBar = document.getElementById('workflows-tags-bar');
      if (tagsBar) {
        tagsBar.innerHTML = `<span class="tag-filter-chip ${!this.selectedTagId ? 'active' : ''}" data-tid="">All Tags</span>` +
          tags.map((t) => `<span class="tag-filter-chip ${this.selectedTagId === t.id ? 'active' : ''}" data-tid="${t.id}" style="border-left: 3px solid ${t.color}">🏷️ ${t.name}</span>`).join('');

        tagsBar.querySelectorAll('.tag-filter-chip').forEach((chip) => {
          chip.addEventListener('click', () => {
            this.selectedTagId = chip.dataset.tid || null;
            this.loadWorkflowsList();
          });
        });
      }

      // 2. Fetch filtered workflows
      const queryParams = [`projectId=${encodeURIComponent(this.currentProjectId || 'default')}`];
      if (this.selectedFolderId) queryParams.push(`folderId=${encodeURIComponent(this.selectedFolderId)}`);
      if (this.selectedTagId) queryParams.push(`tag=${encodeURIComponent(this.selectedTagId)}`);
      const url = '/api/workflows' + (queryParams.length > 0 ? `?${queryParams.join('&')}` : '');

      const res = await this.api(url);
      const workflows = res.data || [];
      tbody.innerHTML = '';

      if (workflows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No workflows found in this project. Click "+ New Workflow" to create one.</td></tr>';
        return;
      }

      for (const wf of workflows) {
        const tr = document.createElement('tr');
        const folderName = wf.folderId && foldersMap.has(wf.folderId) ? `📁 ${foldersMap.get(wf.folderId)}` : '';
        const tagPills = (wf.tags || []).map((tid) => {
          const t = tagsMap.get(tid);
          return t ? `<span class="workflow-tag-pill" style="background: ${t.color};">${t.name}</span>` : '';
        }).filter(Boolean).join(' ');

        tr.innerHTML = `
          <td><strong>${wf.name}</strong></td>
          <td>
            ${folderName ? `<span style="font-size: 0.78rem; color: #94a3b8; display: block; margin-bottom: 2px;">${folderName}</span>` : ''}
            <div>${tagPills || '<span style="color: #64748b; font-size: 0.75rem;">—</span>'}</div>
          </td>
          <td><span class="badge ${wf.active ? 'badge-active' : 'badge-inactive'}">${wf.active ? 'Active' : 'Inactive'}</span></td>
          <td>${wf.nodes?.length || 0} nodes</td>
          <td>${new Date(wf.updatedAt).toLocaleString()}</td>
          <td>
            <button class="btn btn-secondary btn-sm open-wf-btn">Open Editor</button>
            <button class="btn btn-danger btn-sm del-wf-btn" style="margin-left: 6px;">Delete</button>
          </td>
        `;

        tr.querySelector('.open-wf-btn').addEventListener('click', () => this.openWorkflow(wf));
        tr.querySelector('.del-wf-btn').addEventListener('click', async () => {
          if (confirm(`Delete workflow "${wf.name}"?`)) {
            await this.api(`/api/workflows/${wf.id}`, { method: 'DELETE' });
            this.loadWorkflowsList();
          }
        });

        tbody.appendChild(tr);
      }
    } catch (err) {
      console.error('loadWorkflowsList error:', err);
    }
  }

  async loadExecutionsList() {
    const tbody = document.getElementById('executions-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';

    try {
      const res = await this.api(`/api/executions?limit=30&projectId=${encodeURIComponent(this.currentProjectId || 'default')}`);
      const executions = res.data || [];
      tbody.innerHTML = '';

      if (executions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No executions recorded yet. Run a workflow to view history.</td></tr>';
        return;
      }

      for (const ex of executions) {
        const tr = document.createElement('tr');
        const badgeClass = ex.status === 'success' ? 'badge-success' : ex.status === 'error' ? 'badge-error' : 'badge-running';

        tr.innerHTML = `
          <td><strong>${ex.workflowName}</strong></td>
          <td><span class="badge ${badgeClass}">${ex.status}</span></td>
          <td><span style="text-transform: capitalize;">${ex.mode}</span></td>
          <td>${ex.duration !== undefined ? `${ex.duration}ms` : '-'}</td>
          <td>${new Date(ex.startedAt).toLocaleString()}</td>
          <td><button class="btn btn-secondary btn-sm view-exec-btn">View Nodes</button></td>
        `;

        tr.querySelector('.view-exec-btn').addEventListener('click', async () => {
          const detailRes = await this.api(`/api/executions/${ex.id}`);
          alert(`Execution Details:\n${JSON.stringify(detailRes.data, null, 2)}`);
        });

        tbody.appendChild(tr);
      }
    } catch (err) {}
  }

  async loadCredentialsList() {
    const tbody = document.getElementById('credentials-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Loading...</td></tr>';

    try {
      const res = await this.api('/api/credentials');
      this.credentials = res.data || [];
      tbody.innerHTML = '';

      if (this.credentials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No credentials saved. Add one to use with Gemini or HTTP nodes.</td></tr>';
        return;
      }

      for (const cred of this.credentials) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${cred.name}</strong></td>
          <td><code>${cred.type}</code></td>
          <td>${new Date(cred.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-danger btn-sm del-cred-btn">Delete</button>
          </td>
        `;

        tr.querySelector('.del-cred-btn').addEventListener('click', async () => {
          if (confirm(`Delete credential "${cred.name}"?`)) {
            await this.api(`/api/credentials/${cred.id}`, { method: 'DELETE' });
            this.loadCredentialsList();
          }
        });

        tbody.appendChild(tr);
      }
    } catch (err) {}
  }

  // --- Antigravity CLI Copilot Implementation ---
  initAiCopilot() {
    const toggleBtn = document.getElementById('ai-assistant-toggle-btn');
    const canvasBtn = document.getElementById('canvas-ai-copilot-btn');
    const floatingBtn = document.getElementById('floating-ai-copilot-bubble');
    const drawer = document.getElementById('ai-copilot-drawer');
    const closeBtn = document.getElementById('close-ai-drawer-btn');
    const clearBtn = document.getElementById('clear-ai-chat-btn');
    const sendBtn = document.getElementById('ai-chat-send-btn');
    const input = document.getElementById('ai-chat-input');
    const googleSigninBtn = document.getElementById('ai-google-signin-btn');
    const signoutBtn = document.getElementById('ai-signout-btn');

    if (!drawer) return;

    // Load persisted chat history from localStorage
    this.loadPersistedAiChat();

    // Check if drawer was previously open across refreshes
    const wasOpen = localStorage.getItem('autoflow_ai_copilot_open') === 'true';
    if (wasOpen) {
      drawer.classList.add('open');
    }

    const openDrawer = () => {
      // Close other drawers to prevent overlapping
      document.getElementById('node-drawer')?.classList.remove('open');
      document.getElementById('version-history-drawer')?.classList.remove('open');
      document.getElementById('editor-sidebar')?.classList.remove('open');
      document.getElementById('sidebar-backdrop')?.classList.remove('open');
      document.body.classList.add('has-open-drawer');

      this.switchView('editor');
      drawer.classList.add('open');
      localStorage.setItem('autoflow_ai_copilot_open', 'true');
      input?.focus();
    };

    const closeDrawer = () => {
      drawer.classList.remove('open');
      localStorage.setItem('autoflow_ai_copilot_open', 'false');
      if (!document.querySelector('.node-drawer.open, .version-history-drawer.open, .editor-sidebar.open')) {
        document.body.classList.remove('has-open-drawer');
      }
    };

    toggleBtn?.addEventListener('click', () => {
      if (drawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    canvasBtn?.addEventListener('click', () => {
      openDrawer();
    });

    floatingBtn?.addEventListener('click', () => {
      openDrawer();
    });

    closeBtn?.addEventListener('click', () => {
      closeDrawer();
    });

    clearBtn?.addEventListener('click', () => {
      if (confirm('Clear Antigravity Copilot conversation history?')) {
        this.clearAiChat();
      }
    });

    // Google Sign-In button click
    googleSigninBtn?.addEventListener('click', async () => {
      await this.signInWithAntigravityGoogle();
    });

    // Sign out button click
    signoutBtn?.addEventListener('click', async () => {
      await this.signOutAntigravity();
    });

    // Send button click
    sendBtn?.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        input.value = '';
        this.sendAiPrompt(text);
      }
    });

    // Enter to send (Shift+Enter for newline)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          input.value = '';
          this.sendAiPrompt(text);
        }
      }
    });

    // Prompt chips click handler
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.ai-chip');
      if (chip && chip.dataset.prompt) {
        openDrawer();
        this.sendAiPrompt(chip.dataset.prompt);
      }
    });
  }

  loadPersistedAiChat() {
    try {
      const historyStr = localStorage.getItem('autoflow_ai_chat_history');
      if (historyStr) {
        this.aiChatHistory = JSON.parse(historyStr);
      }
      const itemsStr = localStorage.getItem('autoflow_ai_chat_items');
      if (itemsStr) {
        this.aiChatItems = JSON.parse(itemsStr);
        if (Array.isArray(this.aiChatItems) && this.aiChatItems.length > 0) {
          const chatBody = document.getElementById('ai-chat-body');
          if (chatBody) {
            chatBody.innerHTML = '';
            for (const item of this.aiChatItems) {
              this.renderPersistedMessage(item);
            }
          }
        }
      } else {
        this.aiChatItems = [];
      }
    } catch (e) {
      console.warn('Could not load persisted chat:', e);
    }
  }

  saveAiChatState() {
    try {
      localStorage.setItem('autoflow_ai_chat_history', JSON.stringify(this.aiChatHistory || []));
      localStorage.setItem('autoflow_ai_chat_items', JSON.stringify(this.aiChatItems || []));
    } catch (e) {}
  }

  clearAiChat() {
    this.aiChatHistory = [];
    this.aiChatItems = [];
    localStorage.removeItem('autoflow_ai_chat_history');
    localStorage.removeItem('autoflow_ai_chat_items');

    const chatBody = document.getElementById('ai-chat-body');
    if (chatBody) {
      chatBody.innerHTML = `
        <div class="ai-message assistant">
          <div class="ai-bubble">
            <p>👋 <strong>Welcome to AutoFlow AI Copilot!</strong></p>
            <p style="margin-top: 6px; font-size: 0.85rem; color: #cbd5e1;">Prompt me with any automation workflow requirement in plain English. I will generate and connect all nodes directly on your canvas.</p>
            <div class="ai-prompt-chips">
              <button class="ai-chip" data-prompt="Build a webhook pipeline that receives customer inquiries, uses Gemini to analyze sentiment and classify urgency, then routes urgent items to HTTP alert and non-urgent items to a log.">
                🚀 Webhook ➔ Gemini Sentiment ➔ Alert Routing
              </button>
              <button class="ai-chip" data-prompt="Create a daily scheduled workflow running every morning at 8am that fetches trending tech news via HTTP GET, summarizes top 3 stories using Gemini AI, and sends a webhook response.">
                ⏰ Daily 8am ➔ Fetch News ➔ Gemini Digest
              </button>
              <button class="ai-chip" data-prompt="Build an autonomous AI agent workflow that accepts research queries, uses built-in tools to calculate numbers and query workflow history, and returns a final verified summary.">
                🤖 Autonomous Multi-Turn AI Agent Loop
              </button>
              <button class="ai-chip" data-prompt="Add a 3-second delay and a cryptographic SHA256 hash node to the current workflow.">
                ⚡ Add Delay & Crypto Hash to current canvas
              </button>
            </div>
          </div>
        </div>
      `;
    }
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

  renderPersistedMessage(item) {
    if (item.role === 'user') {
      this.appendAiMessage('user', item.contentHtml);
    } else {
      let html = `<p>${item.reply ? item.reply.replace(/\n/g, '<br/>') : 'Here is the generated workflow:'}</p>`;

      if (item.workflow && Array.isArray(item.workflow.nodes) && item.workflow.nodes.length > 0) {
        const wf = item.workflow;
        const nodeBadges = wf.nodes.map((n) => `<span class="ai-node-badge">${this.escapeHtml(n.name)}</span>`).join(' <span class="ai-node-arrow">➔</span> ');

        html += `
          <div class="ai-workflow-card">
            <div class="ai-card-title">⚡ Generated Pipeline: ${this.escapeHtml(wf.name || 'Custom Workflow')}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(wf.description || 'Deterministic automation pipeline')} (${wf.nodes.length} nodes, ${wf.connections?.length || 0} connections)</div>
            <div class="ai-card-pipeline">${nodeBadges}</div>
            <div class="ai-card-actions">
              <button class="btn btn-primary btn-sm rebuild-ai-wf-btn">⚡ Real-Time Build</button>
              <button class="btn btn-secondary btn-sm apply-ai-wf-btn">Instant Apply</button>
              <button class="btn btn-secondary btn-sm run-ai-wf-btn">▶ Run Live</button>
            </div>
          </div>
        `;
      }

      if (Array.isArray(item.suggestedFollowUps) && item.suggestedFollowUps.length > 0) {
        html += '<div class="ai-prompt-chips" style="margin-top: 8px;">';
        for (const sugg of item.suggestedFollowUps) {
          html += `<button class="ai-chip" data-prompt="${sugg.replace(/"/g, '&quot;')}">💡 ${sugg}</button>`;
        }
        html += '</div>';
      }

      const msgEl = this.appendAiMessage('assistant', html);

      if (item.workflow && msgEl) {
        msgEl.querySelector('.rebuild-ai-wf-btn')?.addEventListener('click', async () => {
          await this.buildWorkflowInRealTime(item.workflow);
        });

        msgEl.querySelector('.apply-ai-wf-btn')?.addEventListener('click', async () => {
          await this.applyAiWorkflowToCanvas(item.workflow);
        });

        msgEl.querySelector('.run-ai-wf-btn')?.addEventListener('click', async () => {
          await this.applyAiWorkflowToCanvas(item.workflow);
          await this.executeCurrentWorkflowStream();
        });
      }
    }
  }

  async checkAiStatus() {
    const statusEl = document.getElementById('ai-key-status');
    const signinBanner = document.getElementById('ai-key-banner');
    const accountCard = document.getElementById('ai-account-card');
    const accountEmail = document.getElementById('ai-account-email');

    try {
      const res = await this.api('/api/ai/assistant/status');
      if (res.connected) {
        if (statusEl) {
          const emailDisplay = res.email ? ` (${res.email.split('@')[0]})` : '';
          statusEl.innerHTML = `<span class="status-indicator connected"></span> Antigravity Active${emailDisplay}`;
        }
        if (signinBanner) signinBanner.style.display = 'none';
        if (accountCard) {
          accountCard.style.display = 'flex';
          if (accountEmail) accountEmail.textContent = res.email || res.user?.email || 'Google Account Connected';
        }
        return true;
      } else {
        if (statusEl) {
          statusEl.innerHTML = '<span class="status-indicator"></span> Sign In Required';
        }
        if (signinBanner) signinBanner.style.display = 'block';
        if (accountCard) accountCard.style.display = 'none';
        return false;
      }
    } catch {
      return false;
    }
  }

  async signInWithAntigravityGoogle() {
    const btn = document.getElementById('ai-google-signin-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Connecting to Google Account...';
    }

    try {
      const res = await this.api('/api/ai/assistant/signin', {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (res.success) {
        this.toast(`Signed in as ${res.email || 'Google Account'}! Antigravity Copilot activated.`, 'success');
        await this.checkAiStatus();
      } else {
        throw new Error(res.error || 'Failed to authenticate Google Account');
      }
    } catch (err) {
      this.toast(`Sign-in notice: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          Sign in with Google
        `;
      }
    }
  }

  async signOutAntigravity() {
    if (!confirm('Sign out of Antigravity Copilot?')) return;
    try {
      await this.api('/api/ai/assistant/signout', { method: 'POST' });
      this.toast('Signed out of Antigravity Copilot.', 'info');
      await this.checkAiStatus();
    } catch (err) {
      this.toast(`Sign-out error: ${err.message}`, 'error');
    }
  }

  appendAiMessage(role, contentHtml) {
    const chatBody = document.getElementById('ai-chat-body');
    if (!chatBody) return null;

    const msgEl = document.createElement('div');
    msgEl.className = `ai-message ${role}`;

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'ai-bubble';
    bubbleEl.innerHTML = contentHtml;

    msgEl.appendChild(bubbleEl);
    chatBody.appendChild(msgEl);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msgEl;
  }

  async sendAiPrompt(promptText) {
    const sendBtn = document.getElementById('ai-chat-send-btn');
    const sendIcon = document.getElementById('ai-send-icon');
    const sendSpinner = document.getElementById('ai-send-spinner');

    // 1. Render user bubble
    const userSafeText = promptText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    this.appendAiMessage('user', userSafeText);
    this.aiChatHistory.push({ role: 'user', content: promptText });
    this.aiChatItems = this.aiChatItems || [];
    this.aiChatItems.push({ role: 'user', contentHtml: userSafeText });
    this.saveAiChatState();

    // 2. Set button loading state
    if (sendBtn) sendBtn.disabled = true;
    if (sendIcon) sendIcon.style.display = 'none';
    if (sendSpinner) sendSpinner.style.display = 'inline-block';

    // 3. Render Assistant Observable Build Container
    const buildCardHtml = `
      <div class="ai-workflow-card">
        <div class="ai-card-title">🪐 Antigravity Observable Build Session</div>
        <div class="ai-live-builder">
          <div class="ai-live-builder-header">
            <span style="font-size: 0.82rem; font-weight: 600; color: #fff;">Build Pipeline Progress</span>
            <span class="ai-builder-status" style="color: #38bdf8; font-size: 0.8rem;">Initializing build session...</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; margin: 8px 0 12px; overflow: hidden;">
            <div class="ai-builder-progress-fill" style="width: 10%; height: 100%; background: linear-gradient(90deg, #6366f1, #38bdf8); transition: width 0.3s ease;"></div>
          </div>
          <div class="ai-live-builder-steps">
            <div class="ai-builder-step active">
              <span>🧠</span> <span>Initializing Antigravity Copilot session...</span>
            </div>
          </div>
        </div>
        <div class="ai-card-actions" style="display: none; margin-top: 10px;">
          <button class="btn btn-primary btn-sm run-ai-wf-btn">▶ Run Live</button>
          <button class="btn btn-secondary btn-sm rebuild-ai-wf-btn">⚡ Rebuild</button>
        </div>
      </div>
    `;

    const assistantMsgEl = this.appendAiMessage('assistant', buildCardHtml);
    const builderBox = assistantMsgEl?.querySelector('.ai-live-builder');
    const statusEl = builderBox?.querySelector('.ai-builder-status');
    const progressFill = builderBox?.querySelector('.ai-builder-progress-fill');
    const stepsEl = builderBox?.querySelector('.ai-live-builder-steps');
    const actionsEl = assistantMsgEl?.querySelector('.ai-card-actions');

    const updateStep = (icon, text, isDone = false) => {
      if (!stepsEl) return;
      const prevActive = stepsEl.querySelector('.ai-builder-step.active');
      if (prevActive) {
        prevActive.classList.remove('active');
        prevActive.classList.add('done');
        const iconSpan = prevActive.querySelector('span:first-child');
        if (iconSpan) iconSpan.textContent = '✓';
      }
      const newStep = document.createElement('div');
      newStep.className = `ai-builder-step ${isDone ? 'done' : 'active'}`;
      newStep.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
      stepsEl.appendChild(newStep);
      stepsEl.scrollTop = stepsEl.scrollHeight;
    };

    let generatedWorkflow = null;

    try {
      this.switchView('editor');

      // Connect to SSE build-stream
      const streamRes = await fetch('/api/ai/assistant/build-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: this.aiChatHistory,
          currentWorkflow: this.currentWorkflow,
          synthesizeData: true
        })
      });

      if (!streamRes.ok) {
        const errJson = await streamRes.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${streamRes.status}`);
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'progress';

      // Reset canvas for live building
      this.canvas.workflow = {
        id: this.currentWorkflow?.id || 'live_wf',
        name: 'Copilot Generated Workflow',
        description: promptText,
        nodes: [],
        connections: [],
        active: false,
        projectId: this.currentProjectId || 'default'
      };
      this.canvas.render();
      this.canvas.clearExecutionStatuses();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.percent && progressFill) {
                progressFill.style.width = `${Math.min(100, Math.max(10, data.percent))}%`;
              }
              if (data.message && statusEl) {
                statusEl.textContent = data.message;
              }

              if (data.stage === 'understanding') {
                updateStep('🧠', data.message || 'Understanding request requirements...');
              } else if (data.stage === 'planning') {
                updateStep('📐', data.message || 'Synthesizing DAG topology and node parameters...');
              } else if (data.stage === 'adding_nodes' && data.node) {
                updateStep('⚡', `[Node] Adding <strong>${this.escapeHtml(data.node.name)}</strong> (${data.node.type})`);
                this.canvas.workflow.nodes.push(data.node);
                this.canvas.renderNode(data.node);
                const nodeEl = document.getElementById(`node-${data.node.id}`);
                if (nodeEl) nodeEl.classList.add('node-building');
                this.canvas.panToNode(data.node.id);
                await new Promise((r) => setTimeout(r, 120));
              } else if (data.stage === 'connecting' && data.connection) {
                updateStep('🔗', `[Wire] Connecting <strong>${this.escapeHtml(data.connection.source)}</strong> ➔ <strong>${this.escapeHtml(data.connection.target)}</strong>`);
                this.canvas.workflow.connections.push(data.connection);
                this.canvas.renderConnections();
                this.canvas.svg.querySelectorAll('.connection-path').forEach((p) => p.classList.add('building-wire'));
                await new Promise((r) => setTimeout(r, 120));
              } else if (data.stage === 'testing') {
                updateStep('🧪', data.message || 'Testing pipeline with synthesized sample payloads...');
              } else if (data.stage === 'repairing') {
                updateStep('🛠️', `[Self-Healing] Diagnosing failure & applying patch (Iteration ${data.repairIteration || 1})...`);
              } else if (currentEvent === 'complete' || data.stage === 'complete') {
                generatedWorkflow = data.workflow;
                if (statusEl) {
                  statusEl.textContent = '✓ Workflow Verified & Built';
                  statusEl.style.color = '#4ade80';
                }
                if (progressFill) progressFill.style.width = '100%';
                updateStep('✅', `Production verified: ${data.workflow?.nodes?.length || 0} nodes connected and tested.`, true);
              }
            } catch (parseErr) {}
          }
        }
      }

      // Cleanup building styles
      document.querySelectorAll('.canvas-node').forEach((el) => el.classList.remove('node-building'));
      this.canvas.svg.querySelectorAll('.connection-path').forEach((p) => p.classList.remove('building-wire'));

      if (generatedWorkflow) {
        let savedWf;
        if (this.currentWorkflow && this.currentWorkflow.id && !this.currentWorkflow.id.startsWith('live_wf')) {
          const res = await this.api(`/api/workflows/${this.currentWorkflow.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: generatedWorkflow.name || this.currentWorkflow.name,
              description: generatedWorkflow.description || this.currentWorkflow.description,
              nodes: generatedWorkflow.nodes,
              connections: generatedWorkflow.connections,
              active: this.currentWorkflow.active || false,
              projectId: this.currentProjectId || 'default'
            })
          });
          savedWf = res.data;
        } else {
          const res = await this.api('/api/workflows', {
            method: 'POST',
            body: JSON.stringify({
              name: generatedWorkflow.name || 'AI Generated Workflow',
              description: generatedWorkflow.description,
              nodes: generatedWorkflow.nodes,
              connections: generatedWorkflow.connections,
              active: false,
              projectId: this.currentProjectId || 'default'
            })
          });
          savedWf = res.data;
        }

        this.openWorkflow(savedWf);
        this.loadWorkflowsList();
        this.toast(`✨ Copilot successfully built "${savedWf.name}"!`, 'success');

        if (actionsEl) {
          actionsEl.style.display = 'flex';
          actionsEl.querySelector('.run-ai-wf-btn')?.addEventListener('click', async () => {
            this.openFullscreenViewer();
            await this.executeCurrentWorkflowStream();
          });
          actionsEl.querySelector('.rebuild-ai-wf-btn')?.addEventListener('click', () => {
            this.sendAiPrompt(promptText);
          });
        }
      }
    } catch (err) {
      console.warn('Build-stream notice, falling back to standard copilot generation:', err);
      if (assistantMsgEl) assistantMsgEl.remove();

      if (err.message && (err.message.includes('Google Account sign-in') || err.message.includes('sign in') || err.message.includes('API key') || err.message.includes('needsSignIn'))) {
        this.appendAiMessage('assistant', `
          <div style="color: #fca5a5;">
            ⚠️ <strong>Google Sign-In Required</strong><br/>
            Please click <strong>"Sign in with Google"</strong> in the banner above to activate Antigravity Copilot and build workflows.
          </div>
        `);
        const banner = document.getElementById('ai-key-banner');
        if (banner) banner.style.display = 'block';
      } else {
        await this.fallbackAiChat(promptText);
      }
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (sendIcon) sendIcon.style.display = 'inline-block';
      if (sendSpinner) sendSpinner.style.display = 'none';
    }
  }

  async fallbackAiChat(promptText) {
    const thinkingMsg = this.appendAiMessage('assistant', '<span style="color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px;"><span>🪐</span> Antigravity is generating your workflow pipeline...</span>');

    try {
      const res = await this.api('/api/ai/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: promptText,
          history: this.aiChatHistory,
          currentWorkflow: this.currentWorkflow
        })
      });

      thinkingMsg?.remove();

      const aiData = res.data;
      if (!aiData) {
        throw new Error('No data received from AI Assistant');
      }

      this.aiChatHistory.push({ role: 'model', content: aiData.reply || 'Workflow generated' });
      this.aiChatItems.push({
        role: 'assistant',
        reply: aiData.reply,
        workflow: aiData.workflow,
        suggestedFollowUps: aiData.suggestedFollowUps
      });
      this.saveAiChatState();

      let html = `<p>${aiData.reply ? aiData.reply.replace(/\n/g, '<br/>') : 'Here is the generated workflow:'}</p>`;

      if (aiData.workflow && Array.isArray(aiData.workflow.nodes) && aiData.workflow.nodes.length > 0) {
        const wf = aiData.workflow;
        const nodeBadges = wf.nodes.map((n) => `<span class="ai-node-badge">${this.escapeHtml(n.name)}</span>`).join(' <span class="ai-node-arrow">➔</span> ');

        html += `
          <div class="ai-workflow-card">
            <div class="ai-card-title">⚡ Generated Pipeline: ${this.escapeHtml(wf.name || 'Custom Workflow')}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(wf.description || 'Deterministic automation pipeline')} (${wf.nodes.length} nodes, ${wf.connections?.length || 0} connections)</div>
            <div class="ai-card-pipeline">${nodeBadges}</div>
            <div class="ai-live-builder">
              <div class="ai-live-builder-header">
                <span>🛠️ Copilot Live Canvas Builder</span>
                <span class="ai-builder-status" style="color: #38bdf8;">Constructing workflow...</span>
              </div>
              <div class="ai-live-builder-steps"></div>
            </div>
            <div class="ai-card-actions">
              <button class="btn btn-primary btn-sm rebuild-ai-wf-btn">⚡ Real-Time Build</button>
              <button class="btn btn-secondary btn-sm apply-ai-wf-btn">Instant Apply</button>
              <button class="btn btn-secondary btn-sm run-ai-wf-btn">▶ Run Live</button>
            </div>
          </div>
        `;
      }

      if (Array.isArray(aiData.suggestedFollowUps) && aiData.suggestedFollowUps.length > 0) {
        html += '<div class="ai-prompt-chips" style="margin-top: 8px;">';
        for (const sugg of aiData.suggestedFollowUps) {
          html += `<button class="ai-chip" data-prompt="${sugg.replace(/"/g, '&quot;')}">💡 ${sugg}</button>`;
        }
        html += '</div>';
      }

      const msgEl = this.appendAiMessage('assistant', html);

      if (aiData.workflow && msgEl) {
        const builderBox = msgEl.querySelector('.ai-live-builder');
        await this.buildWorkflowInRealTime(aiData.workflow, true, builderBox);

        msgEl.querySelector('.rebuild-ai-wf-btn')?.addEventListener('click', async () => {
          await this.buildWorkflowInRealTime(aiData.workflow, true, builderBox);
        });

        msgEl.querySelector('.apply-ai-wf-btn')?.addEventListener('click', async () => {
          await this.applyAiWorkflowToCanvas(aiData.workflow);
        });

        msgEl.querySelector('.run-ai-wf-btn')?.addEventListener('click', async () => {
          await this.applyAiWorkflowToCanvas(aiData.workflow);
          this.openFullscreenViewer();
          await this.executeCurrentWorkflowStream();
        });
      }
    } catch (err) {
      thinkingMsg?.remove();
      this.appendAiMessage('assistant', `<span style="color: #fca5a5;">⚠️ Error generating workflow: ${err.message}</span>`);
    }
  }

  async buildWorkflowInRealTime(aiWorkflow, autoSave = true, builderContainerEl = null) {
    if (!aiWorkflow || !Array.isArray(aiWorkflow.nodes) || aiWorkflow.nodes.length === 0) return;

    this.switchView('editor');

    let statusEl = null;
    let stepsEl = null;
    if (builderContainerEl) {
      statusEl = builderContainerEl.querySelector('.ai-builder-status');
      stepsEl = builderContainerEl.querySelector('.ai-live-builder-steps');
      if (stepsEl) stepsEl.innerHTML = '';
      if (statusEl) {
        statusEl.textContent = 'Constructing pipeline live...';
        statusEl.style.color = '#38bdf8';
      }
    }

    const finalNodes = aiWorkflow.nodes;
    const finalConnections = aiWorkflow.connections || [];

    // Reset canvas to begin incremental step-by-step assembly
    this.canvas.workflow = {
      id: this.currentWorkflow?.id || 'live_wf',
      name: aiWorkflow.name || 'AI Generated Workflow',
      description: aiWorkflow.description || '',
      nodes: [],
      connections: [],
      active: false
    };
    this.canvas.render();
    this.canvas.clearExecutionStatuses();

    // Sequentially place nodes one by one
    for (let i = 0; i < finalNodes.length; i++) {
      const node = finalNodes[i];
      const nodeDef = this.nodeTypes.find((nt) => nt.type === node.type) || {};

      // Add step item in Copilot chat console
      let stepItem = null;
      if (stepsEl) {
        stepItem = document.createElement('div');
        stepItem.className = 'ai-builder-step active';
        stepItem.innerHTML = `<span>⚡</span> <span>[Step ${i + 1}/${finalNodes.length}] Placing <strong>${node.name}</strong> (${nodeDef.name || node.type})...</span>`;
        stepsEl.appendChild(stepItem);
        stepsEl.scrollTop = stepsEl.scrollHeight;
      }

      // Add node to canvas state and render it into the plane
      this.canvas.workflow.nodes.push(node);
      this.canvas.renderNode(node);

      // Add glowing neon building style to the freshly placed node
      const nodeEl = document.getElementById(`node-${node.id}`);
      if (nodeEl) {
        nodeEl.classList.add('node-building');
        const badge = nodeEl.querySelector('.node-status-badge');
        if (badge) {
          badge.className = 'node-status-badge running';
          badge.textContent = '⚡ Building...';
        }
      }

      // Smoothly pan canvas camera to keep the newly created node centered
      this.canvas.panToNode(node.id);

      // Form and draw all connections that are now possible with currently placed nodes
      const placedNames = new Set(this.canvas.workflow.nodes.map((n) => n.name));
      const placedIds = new Set(this.canvas.workflow.nodes.map((n) => n.id));
      const currentAvailableConns = finalConnections.filter((c) =>
        (placedNames.has(c.source) || placedIds.has(c.source)) &&
        (placedNames.has(c.target) || placedIds.has(c.target))
      );

      this.canvas.workflow.connections = currentAvailableConns;
      this.canvas.renderConnections();

      // Highlight new wires with glowing pulse
      this.canvas.svg.querySelectorAll('.connection-path').forEach((p) => {
        p.classList.add('building-wire');
      });

      // Pause briefly so the user clearly witnesses the real-time node-by-node construction
      await new Promise((r) => setTimeout(r, 450));

      // Mark step completed in chat console
      if (stepItem) {
        stepItem.className = 'ai-builder-step done';
        stepItem.innerHTML = `<span>✓</span> <span>[Step ${i + 1}/${finalNodes.length}] Placed <strong>${node.name}</strong></span>`;
      }
      if (nodeEl) {
        const badge = nodeEl.querySelector('.node-status-badge');
        if (badge) {
          badge.className = 'node-status-badge success';
          badge.textContent = '✓ Placed';
        }
      }
    }

    // Connect any remaining connections
    this.canvas.workflow.connections = finalConnections;
    this.canvas.renderConnections();

    // Clean up temporary building classes
    document.querySelectorAll('.canvas-node').forEach((el) => el.classList.remove('node-building'));
    this.canvas.svg.querySelectorAll('.connection-path').forEach((p) => p.classList.remove('building-wire'));
    this.canvas.clearExecutionStatuses();

    if (statusEl) {
      statusEl.textContent = '✓ Construction Complete';
      statusEl.style.color = '#4ade80';
    }

    if (autoSave) {
      try {
        let savedWf;
        if (this.currentWorkflow && this.currentWorkflow.id && !this.currentWorkflow.id.startsWith('live_wf')) {
          const res = await this.api(`/api/workflows/${this.currentWorkflow.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: aiWorkflow.name || this.currentWorkflow.name,
              description: aiWorkflow.description || this.currentWorkflow.description,
              nodes: finalNodes,
              connections: finalConnections,
              active: this.currentWorkflow.active || false,
              projectId: this.currentWorkflow.projectId || this.currentProjectId || 'default'
            })
          });
          savedWf = res.data;
        } else {
          const res = await this.api('/api/workflows', {
            method: 'POST',
            body: JSON.stringify({
              name: aiWorkflow.name || 'AI Generated Workflow',
              description: aiWorkflow.description,
              nodes: finalNodes,
              connections: finalConnections,
              active: false,
              projectId: this.currentProjectId || 'default'
            })
          });
          savedWf = res.data;
        }

        this.openWorkflow(savedWf);
        this.loadWorkflowsList();
        this.toast(`✨ Copilot constructed "${savedWf.name}" (${finalNodes.length} nodes) in real time!`, 'success');
      } catch (err) {
        this.toast(`Failed to save workflow: ${err.message}`, 'error');
      }
    }
  }

  async applyAiWorkflowToCanvas(aiWorkflow) {
    if (!aiWorkflow || !aiWorkflow.nodes) return;

    try {
      let savedWf;
      if (this.currentWorkflow && this.currentWorkflow.id) {
        // Update current workflow
        const payload = {
          name: aiWorkflow.name || this.currentWorkflow.name,
          description: aiWorkflow.description || this.currentWorkflow.description,
          nodes: aiWorkflow.nodes,
          connections: aiWorkflow.connections || [],
          active: this.currentWorkflow.active || false,
          projectId: this.currentWorkflow.projectId || this.currentProjectId || 'default'
        };
        const res = await this.api(`/api/workflows/${this.currentWorkflow.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        savedWf = res.data;
      } else {
        // Create new workflow
        const res = await this.api('/api/workflows', {
          method: 'POST',
          body: JSON.stringify({
            name: aiWorkflow.name || 'AI Generated Workflow',
            description: aiWorkflow.description,
            nodes: aiWorkflow.nodes,
            connections: aiWorkflow.connections || [],
            active: false,
            projectId: this.currentProjectId || 'default'
          })
        });
        savedWf = res.data;
      }

      this.openWorkflow(savedWf);
      this.toast(`Applied "${savedWf.name}" to canvas!`, 'success');
      this.loadWorkflowsList();
    } catch (err) {
      this.toast(`Failed to apply workflow: ${err.message}`, 'error');
    }
  }

  // --- Fullscreen Workflow Chart & Output Viewer ---
  initFullscreenViewer() {
    const fsBtnHeader = document.getElementById('fullscreen-workflow-btn');
    const fsBtnCanvas = document.getElementById('canvas-fullscreen-btn');
    const fsModal = document.getElementById('fullscreen-workflow-modal');
    const closeBtn = document.getElementById('fs-close-btn');
    const runBtn = document.getElementById('fs-run-btn');
    const copyJsonBtn = document.getElementById('fs-copy-json-btn');

    if (!fsModal) return;

    fsBtnHeader?.addEventListener('click', () => this.openFullscreenViewer());
    fsBtnCanvas?.addEventListener('click', () => this.openFullscreenViewer());
    closeBtn?.addEventListener('click', () => this.closeFullscreenViewer());

    // Tab switching
    document.querySelectorAll('.fs-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.fs-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.fs-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`fs-panel-${tab.dataset.fstab}`);
        if (panel) panel.classList.add('active');
      });
    });

    runBtn?.addEventListener('click', async () => {
      await this.executeCurrentWorkflowStream();
      this.renderFullscreenOutput();
    });

    copyJsonBtn?.addEventListener('click', () => {
      if (!this.currentWorkflow) return;
      const jsonStr = JSON.stringify(this.currentWorkflow, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        this.toast('Workflow JSON copied to clipboard!', 'success');
      }).catch(() => {
        this.toast('Unable to copy to clipboard', 'error');
      });
    });

    // Close on ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && fsModal.classList.contains('open')) {
        this.closeFullscreenViewer();
      }
    });
  }

  openFullscreenViewer() {
    if (!this.currentWorkflow) {
      this.toast('No workflow currently open', 'error');
      return;
    }

    const fsModal = document.getElementById('fullscreen-workflow-modal');
    const titleEl = document.getElementById('fs-workflow-title');
    const metaEl = document.getElementById('fs-workflow-meta');

    if (titleEl) titleEl.textContent = this.currentWorkflow.name || 'Untitled Workflow';
    if (metaEl) {
      const nodeCount = this.currentWorkflow.nodes?.length || 0;
      const connCount = this.currentWorkflow.connections?.length || 0;
      metaEl.textContent = `${nodeCount} nodes · ${connCount} connections · ${this.currentWorkflow.active ? 'ACTIVE' : 'INACTIVE'}`;
    }

    this.renderFullscreenChart();
    this.renderFullscreenOutput();
    this.renderFullscreenJson();

    fsModal?.classList.add('open');
  }

  closeFullscreenViewer() {
    const fsModal = document.getElementById('fullscreen-workflow-modal');
    fsModal?.classList.remove('open');
  }

  updateFullscreenOutputIfOpen() {
    const fsModal = document.getElementById('fullscreen-workflow-modal');
    if (fsModal && fsModal.classList.contains('open')) {
      this.renderFullscreenOutput();
    }
  }

  renderFullscreenChart() {
    const container = document.getElementById('fs-chart-svg-container');
    if (!container || !this.currentWorkflow) return;

    container.innerHTML = '';
    const nodes = this.currentWorkflow.nodes || [];

    if (nodes.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Workflow is empty. Use the palette or AI Copilot to add nodes!</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'fs-flowchart-grid';

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeDef = this.nodeTypes.find((nt) => nt.type === node.type) || {};

      const card = document.createElement('div');
      card.className = 'fs-node-card status-waiting';
      card.id = `fs-card-${node.id}`;
      card.dataset.nodeId = node.id;
      card.dataset.nodeName = node.name;

      let paramSnippet = '';
      if (node.parameters) {
        const keys = Object.keys(node.parameters);
        if (keys.length > 0) {
          const sample = keys.slice(0, 2).map((k) => `<strong>${k}:</strong> ${String(node.parameters[k]).slice(0, 30)}`).join('<br/>');
          paramSnippet = `<div class="fs-node-card-body">${sample}</div>`;
        }
      }

      card.innerHTML = `
        <div class="fs-node-card-header">
          <div class="fs-node-card-icon" style="background: ${nodeDef.color || '#8b5cf6'};">⚡</div>
          <div style="overflow: hidden; flex: 1;">
            <div class="fs-node-card-name">${node.name}</div>
            <div class="fs-node-card-type">${nodeDef.name || node.type}</div>
          </div>
        </div>
        ${paramSnippet}
        <div class="fs-node-card-badge-row">
          <span class="fs-node-exec-badge status-waiting" id="fs-badge-${node.id}">WAITING</span>
          <span style="font-size: 0.7rem; color: #64748b;">Step ${i + 1}/${nodes.length}</span>
        </div>
      `;
      grid.appendChild(card);

      if (i < nodes.length - 1) {
        const nextNode = nodes[i + 1];
        const connector = document.createElement('div');
        connector.className = 'fs-chart-connector';
        connector.id = `fs-conn-${i}`;
        connector.dataset.source = node.name;
        connector.dataset.sourceId = node.id;
        connector.dataset.target = nextNode.name;
        connector.dataset.targetId = nextNode.id;
        connector.dataset.index = i;
        connector.innerHTML = `
          <div class="fs-connector-line"></div>
          <div class="fs-connector-arrow">➔</div>
        `;
        grid.appendChild(connector);
      }
    }

    container.appendChild(grid);
  }

  async executeCurrentWorkflowStream() {
    if (!this.currentWorkflow || !this.currentWorkflow.id) {
      this.toast('Please save or open a valid workflow first', 'error');
      return;
    }

    // Auto-save current configuration
    await this.saveCurrentWorkflow();

    const runBtn = document.getElementById('fs-run-btn');
    const mainRunBtn = document.getElementById('execute-workflow-btn');
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span class="fs-spin">⏳</span> Running...';
    }
    if (mainRunBtn) {
      mainRunBtn.disabled = true;
      mainRunBtn.innerHTML = '<span class="fs-spin">⏳</span> Executing...';
    }

    // Reset Fullscreen Flowchart cards & connectors to WAITING
    const nodes = this.currentWorkflow.nodes || [];
    nodes.forEach((n) => {
      const card = document.getElementById(`fs-card-${n.id}`);
      const badge = document.getElementById(`fs-badge-${n.id}`);
      if (card) {
        card.className = 'fs-node-card status-waiting';
      }
      if (badge) {
        badge.className = 'fs-node-exec-badge status-waiting';
        badge.textContent = 'WAITING';
      }
    });

    document.querySelectorAll('.fs-chart-connector').forEach((c) => {
      c.className = 'fs-chart-connector';
    });

    // Clear canvas execution indicators & connection flows
    this.canvas.clearExecutionStatuses();
    this.canvas.clearConnectionHighlights();

    // Reset live execution results state
    this.lastExecutionDetails = {
      execution: { status: 'running' },
      nodes: []
    };
    this.updateFullscreenOutputIfOpen();

    this.toast('Executing workflow with live real-time stepping...', 'info');

    return new Promise((resolve) => {
      const eventSource = new EventSource(`/api/workflows/${this.currentWorkflow.id}/execute-stream`);

      eventSource.onmessage = async (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === 'node_start') {
            const { nodeId, nodeName } = data;

            // 1. Fullscreen flowchart: Mark node as RUNNING
            const card = document.getElementById(`fs-card-${nodeId}`);
            const badge = document.getElementById(`fs-badge-${nodeId}`);
            if (card) {
              card.classList.remove('status-waiting', 'status-success', 'status-error');
              card.classList.add('status-running');
            }
            if (badge) {
              badge.className = 'fs-node-exec-badge status-running';
              badge.innerHTML = '<span class="fs-spin">⏳</span> RUNNING...';
            }

            // 2. Main Canvas: Mark node as running and center view on it
            this.canvas.setNodeExecutionStatus(nodeId, 'running');
            this.canvas.panToNode(nodeId);

          } else if (data.type === 'node_finish') {
            const { record } = data;
            const { nodeId, nodeName, status, duration } = record;

            // Append record to live execution details
            if (!this.lastExecutionDetails.nodes) this.lastExecutionDetails.nodes = [];
            this.lastExecutionDetails.nodes.push(record);
            this.updateFullscreenOutputIfOpen();

            // 1. Fullscreen flowchart node update
            const card = document.getElementById(`fs-card-${nodeId}`);
            const badge = document.getElementById(`fs-badge-${nodeId}`);

            if (card) {
              card.classList.remove('status-running');
              card.classList.add(status === 'success' ? 'status-success' : 'status-error');
            }
            if (badge) {
              badge.className = `fs-node-exec-badge ${status === 'success' ? 'status-success' : 'status-error'}`;
              badge.textContent = status === 'success' ? `✓ SUCCESS (${duration}ms)` : '✗ FAILED';
            }

            // 2. Main Canvas: Update node execution status
            this.canvas.setNodeExecutionStatus(nodeId, status, duration);

            // 3. Arrow update: IF SUCCESS, TURN ARROW VIBRANT GREEN!
            if (status === 'success') {
              // Find outgoing connector in flowchart
              const connectors = document.querySelectorAll('.fs-chart-connector');
              connectors.forEach((conn) => {
                if (conn.dataset.source === nodeName || conn.dataset.sourceId === nodeId) {
                  conn.classList.remove('status-running', 'status-error');
                  conn.classList.add('status-success');
                }
              });

              // On main canvas: turn connection wire to vibrant glowing green active flow!
              this.canvas.highlightConnection(nodeName, null, 'success');
            } else {
              // Outgoing connector turns red error
              const connectors = document.querySelectorAll('.fs-chart-connector');
              connectors.forEach((conn) => {
                if (conn.dataset.source === nodeName || conn.dataset.sourceId === nodeId) {
                  conn.classList.add('status-error');
                }
              });

              // Add 1-click Auto-Fix button directly on the failed card in flowchart!
              if (card && !card.querySelector('.fs-card-autofix-btn')) {
                const fixBtn = document.createElement('button');
                fixBtn.className = 'btn-autofix fs-card-autofix-btn';
                fixBtn.style.cssText = 'margin-top: 10px; width: 100%; justify-content: center;';
                fixBtn.innerHTML = '⚡ Auto-Fix with Copilot';
                fixBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  this.triggerAutoFix(nodeId, record.error, record.inputData);
                });
                card.appendChild(fixBtn);
              }
            }

            // Visual pause so the real-time progression from one node to the next is clearly observable
            await new Promise((r) => setTimeout(r, 450));

          } else if (data.type === 'complete') {
            eventSource.close();
            this.lastExecutionDetails = data.execution;
            this.editor.setExecutionResults(data.execution);
            this.updateFullscreenOutputIfOpen();

            if (runBtn) {
              runBtn.disabled = false;
              runBtn.innerHTML = '▶ Run Workflow';
            }
            if (mainRunBtn) {
              mainRunBtn.disabled = false;
              mainRunBtn.innerHTML = '▶ Test Workflow';
            }

            const exec = data.execution?.execution;
            if (exec?.status === 'success') {
              this.toast(`Workflow successfully completed in ${exec.duration}ms!`, 'success');
            } else {
              this.toast(`Workflow completed with error: ${exec?.errorMessage || 'Check output tab'}`, 'error');
            }
            resolve();

          } else if (data.type === 'error') {
            eventSource.close();
            if (runBtn) {
              runBtn.disabled = false;
              runBtn.innerHTML = '▶ Run Workflow';
            }
            if (mainRunBtn) {
              mainRunBtn.disabled = false;
              mainRunBtn.innerHTML = '▶ Test Workflow';
            }
            this.toast(`Stream error: ${data.error}`, 'error');
            resolve();
          }
        } catch (err) {
          console.error('Error handling stream event:', err);
        }
      };

      eventSource.onerror = async () => {
        eventSource.close();
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = '▶ Run Workflow';
        }
        if (mainRunBtn) {
          mainRunBtn.disabled = false;
          mainRunBtn.innerHTML = '▶ Test Workflow';
        }
        // Fallback to standard execution if stream failed to connect
        await this.executeCurrentWorkflow();
        resolve();
      };
    });
  }

  renderFullscreenOutput() {
    const sidebar = document.getElementById('fs-output-nodes-list');
    const header = document.getElementById('fs-output-selected-node-title');
    const code = document.getElementById('fs-output-code-viewer');

    if (!sidebar || !code || !this.currentWorkflow) return;

    sidebar.innerHTML = '';
    const nodes = this.currentWorkflow.nodes || [];
    const executionNodes = this.lastExecutionDetails?.nodes || [];

    if (nodes.length === 0) {
      sidebar.innerHTML = '<div style="color: #64748b; font-size: 0.8rem;">No nodes in workflow</div>';
      code.textContent = '// Empty workflow';
      return;
    }

    nodes.forEach((node, idx) => {
      const execRecord = executionNodes.find((nr) => nr.nodeId === node.id || nr.nodeName === node.name);
      const pill = document.createElement('div');
      pill.className = `fs-node-pill ${idx === 0 ? 'active' : ''}`;

      const status = execRecord ? execRecord.status : 'waiting';
      const duration = execRecord && execRecord.duration ? `${execRecord.duration}ms` : '';

      pill.innerHTML = `
        <div>
          <div style="font-weight: 600; font-size: 0.82rem;">${node.name}</div>
          <div style="font-size: 0.72rem; color: #94a3b8;">${node.type}</div>
        </div>
        <span class="fs-node-pill-status ${status}">${status} ${duration}</span>
      `;

      pill.addEventListener('click', () => {
        sidebar.querySelectorAll('.fs-node-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');

        if (header) header.textContent = `Output Data: ${node.name} (${node.type})`;

        if (execRecord) {
          const displayObj = {
            status: execRecord.status,
            duration: execRecord.duration ? `${execRecord.duration}ms` : undefined,
            error: execRecord.error,
            inputData: execRecord.inputData,
            outputData: execRecord.outputData
          };
          code.textContent = JSON.stringify(displayObj, null, 2);
        } else {
          code.textContent = `// Node "${node.name}" has not executed yet.\n// Click "▶ Run Workflow" above to execute and inspect live data.`;
        }
      });

      sidebar.appendChild(pill);

      if (idx === 0) {
        if (header) {
          if (execRecord && execRecord.status === 'error') {
            header.innerHTML = `Output Data: ${node.name} (${node.type}) <button class="btn-autofix" style="float: right;" id="autofix-header-btn">⚡ Auto-Fix with Copilot</button>`;
            document.getElementById('autofix-header-btn')?.addEventListener('click', () => {
              this.triggerAutoFix(node.id, execRecord.error, execRecord.inputData);
            });
          } else {
            header.textContent = `Output Data: ${node.name} (${node.type})`;
          }
        }
        if (execRecord) {
          const displayObj = {
            status: execRecord.status,
            duration: execRecord.duration ? `${execRecord.duration}ms` : undefined,
            error: execRecord.error,
            inputData: execRecord.inputData,
            outputData: execRecord.outputData
          };
          code.textContent = JSON.stringify(displayObj, null, 2);
        } else {
          code.textContent = `// Node "${node.name}" has not executed yet.\n// Click "▶ Run Workflow" above to execute and inspect live data.`;
        }
      }
    });
  }

  renderFullscreenJson() {
    const viewer = document.getElementById('fs-json-code-viewer');
    if (!viewer || !this.currentWorkflow) return;
    viewer.textContent = JSON.stringify(this.currentWorkflow, null, 2);
  }

  // --- 1. AI Self-Healing & Auto-Fix Implementation ---
  initAutoFix() {
    const modal = document.getElementById('autofix-modal');
    const closeBtn = document.getElementById('close-autofix-modal-btn');
    const cancelBtn = document.getElementById('cancel-autofix-btn');
    const applyBtn = document.getElementById('apply-autofix-btn');
    const applyRerunBtn = document.getElementById('apply-and-rerun-autofix-btn');

    closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
    cancelBtn?.addEventListener('click', () => modal?.classList.remove('open'));

    applyBtn?.addEventListener('click', async () => {
      if (!this.pendingAutoFix) return;
      await this.applyAutoFix(this.pendingAutoFix);
      modal?.classList.remove('open');
    });

    applyRerunBtn?.addEventListener('click', async () => {
      if (!this.pendingAutoFix) return;
      await this.applyAutoFix(this.pendingAutoFix);
      modal?.classList.remove('open');
      await this.executeCurrentWorkflowStream();
    });
  }

  async triggerAutoFix(nodeId, errorMsg = null, inputData = null) {
    if (!this.currentWorkflow) return;
    const node = this.currentWorkflow.nodes?.find((n) => n.id === nodeId || n.name === nodeId);
    if (!node) return;

    const modal = document.getElementById('autofix-modal');
    const subtitle = document.getElementById('autofix-modal-subtitle');
    const loading = document.getElementById('autofix-loading');
    const results = document.getElementById('autofix-results');
    const footer = document.getElementById('autofix-modal-footer');
    const diagText = document.getElementById('autofix-diagnosis-text');
    const solText = document.getElementById('autofix-solution-text');
    const paramsPreview = document.getElementById('autofix-params-preview');

    if (subtitle) subtitle.textContent = `Analyzing failure on "${node.name}" (${node.type})...`;
    if (loading) loading.style.display = 'block';
    if (results) results.style.display = 'none';
    if (footer) footer.style.display = 'none';

    modal?.classList.add('open');

    // Retrieve runtime error from last execution if not passed
    let nodeError = errorMsg;
    let nodeInput = inputData;
    if (!nodeError && this.lastExecutionDetails?.nodes) {
      const rec = this.lastExecutionDetails.nodes.find((r) => r.nodeId === node.id || r.nodeName === node.name);
      if (rec) {
        nodeError = rec.error;
        nodeInput = rec.inputData;
      }
    }

    try {
      const res = await this.api('/api/ai/assistant/auto-fix', {
        method: 'POST',
        body: JSON.stringify({
          workflow: this.currentWorkflow,
          nodeId: node.id,
          error: nodeError || 'Runtime execution failed',
          inputData: nodeInput || []
        })
      });

      const fix = res.data;
      this.pendingAutoFix = fix;

      if (loading) loading.style.display = 'none';
      if (results) results.style.display = 'block';
      if (footer) footer.style.display = 'flex';

      if (diagText) diagText.textContent = fix.diagnosis;
      if (solText) solText.textContent = fix.fixExplanation;
      if (paramsPreview) paramsPreview.textContent = JSON.stringify(fix.fixedParameters, null, 2);
    } catch (err) {
      if (loading) {
        loading.innerHTML = `
          <div style="color: #f87171; font-weight: bold;">⚠️ Auto-Fix Diagnosis Failed</div>
          <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 8px;">${err.message}</p>
        `;
      }
    }
  }

  async applyAutoFix(fixData) {
    if (!this.currentWorkflow || !fixData) return;
    const node = this.currentWorkflow.nodes?.find((n) => n.id === fixData.nodeId);
    if (!node) return;

    node.parameters = fixData.fixedParameters;
    await this.saveCurrentWorkflow();
    this.openWorkflow(this.currentWorkflow);
    this.updateFullscreenOutputIfOpen();
    this.toast(`Applied fix to "${node.name}"!`, 'success');
  }

  // --- 2. Workflow Templates Implementation ---
  initTemplatesModal() {
    const modal = document.getElementById('templates-modal');
    const openBtn = document.getElementById('templates-btn');
    const closeBtn = document.getElementById('close-templates-modal-btn');
    const searchInput = document.getElementById('templates-search-input');
    const catPills = document.querySelectorAll('.tmpl-cat-btn');

    openBtn?.addEventListener('click', async () => {
      modal?.classList.add('open');
      await this.loadTemplates('all', '');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));

    catPills.forEach((btn) => {
      btn.addEventListener('click', async () => {
        catPills.forEach((b) => {
          b.classList.remove('btn-primary', 'active');
          b.classList.add('btn-secondary');
        });
        btn.classList.add('btn-primary', 'active');
        btn.classList.remove('btn-secondary');
        await this.loadTemplates(btn.dataset.cat, searchInput?.value || '');
      });
    });

    searchInput?.addEventListener('input', async (e) => {
      const activeCat = document.querySelector('.tmpl-cat-btn.active')?.dataset.cat || 'all';
      await this.loadTemplates(activeCat, e.target.value);
    });
  }

  async loadTemplates(category = 'all', query = '') {
    const grid = document.getElementById('templates-cards-grid');
    if (!grid) return;

    try {
      const res = await this.api(`/api/templates?category=${encodeURIComponent(category)}`);
      let list = res.data || [];

      if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter((t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
        );
      }

      grid.innerHTML = '';
      if (list.length === 0) {
        grid.innerHTML = '<div style="color: var(--text-muted); padding: 30px; text-align: center; grid-column: 1/-1;">No templates matching search.</div>';
        return;
      }

      for (const tmpl of list) {
        const card = document.createElement('div');
        card.className = 'template-card';

        const nodeTags = (tmpl.nodes || []).slice(0, 4).map((n) => `<span class="template-node-tag">${n.name}</span>`).join(' ');

        card.innerHTML = `
          <div>
            <div class="template-card-header">
              <div class="template-card-icon">${tmpl.icon || '⚡'}</div>
              <div class="template-card-title">${tmpl.name}</div>
            </div>
            <div class="template-card-desc">${tmpl.description}</div>
            <div class="template-card-pipeline">${nodeTags}</div>
          </div>
          <button class="btn btn-primary btn-sm use-tmpl-btn" style="width: 100%;">⚡ Use This Template</button>
        `;

        card.querySelector('.use-tmpl-btn')?.addEventListener('click', async () => {
          document.getElementById('templates-modal')?.classList.remove('open');
          this.toast(`Loading template "${tmpl.name}"...`, 'info');

          try {
            const cloneRes = await this.api(`/api/templates/${tmpl.id}/clone`, { method: 'POST' });
            const createdWf = cloneRes.data;
            this.openWorkflow(createdWf);
            this.loadWorkflowsList();
            await this.buildWorkflowInRealTime(createdWf, false);
            this.toast(`Template "${createdWf.name}" loaded successfully!`, 'success');
          } catch (err) {
            this.toast(`Failed to load template: ${err.message}`, 'error');
          }
        });

        grid.appendChild(card);
      }
    } catch (e) {
      grid.innerHTML = '<div style="color: #ef4444; padding: 20px;">Failed to load templates.</div>';
    }
  }

  // --- 3. Live Webhook Payload Simulator Implementation ---
  initPayloadSimulator() {
    const modal = document.getElementById('payload-modal');
    const openBtn = document.getElementById('payload-sim-btn');
    const closeBtn = document.getElementById('close-payload-modal-btn');
    const cancelBtn = document.getElementById('cancel-payload-btn');
    const fireBtn = document.getElementById('fire-payload-btn');
    const genBtn = document.getElementById('generate-payload-gemini-btn');
    const targetSelect = document.getElementById('sim-target-node');
    const textarea = document.getElementById('sim-payload-textarea');

    openBtn?.addEventListener('click', () => {
      if (!this.currentWorkflow) {
        this.toast('Open a workflow first', 'error');
        return;
      }
      modal?.classList.add('open');

      if (targetSelect) {
        targetSelect.innerHTML = '';
        const nodes = this.currentWorkflow.nodes || [];
        nodes.forEach((n) => {
          const opt = document.createElement('option');
          opt.value = n.id;
          opt.textContent = `${n.name} (${n.type})`;
          if (n.type.includes('webhook') || n.type.includes('trigger')) {
            opt.selected = true;
          }
          targetSelect.appendChild(opt);
        });
      }
    });

    closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
    cancelBtn?.addEventListener('click', () => modal?.classList.remove('open'));

    genBtn?.addEventListener('click', async () => {
      genBtn.disabled = true;
      genBtn.innerHTML = '<span class="fs-spin">⏳</span> Generating with Antigravity...';
      try {
        const res = await this.api('/api/ai/assistant/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: `Generate a realistic JSON payload for testing an automation workflow: "${this.currentWorkflow?.name || 'Order Intake'}". Include IDs, customer information, numeric amounts, timestamps, and nested items.`
          })
        });

        let text = res.data?.reply || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          textarea.value = JSON.stringify(JSON.parse(match[0]), null, 2);
          this.toast('Realistic payload synthesized by Antigravity!', 'success');
        } else {
          textarea.value = JSON.stringify({
            orderId: 'ORD-' + Math.floor(Math.random() * 89999 + 10000),
            amount: 249.99,
            customer: { name: 'Sarah Connor', email: 'sarah@example.com' },
            items: [{ sku: 'A100', price: 249.99, qty: 1 }],
            timestamp: new Date().toISOString()
          }, null, 2);
        }
      } catch (err) {
        textarea.value = JSON.stringify({
          orderId: 'ORD-' + Math.floor(Math.random() * 89999 + 10000),
          amount: 175.50,
          customer: { name: 'Alex Johnson', email: 'alex@example.com' },
          timestamp: new Date().toISOString()
        }, null, 2);
      } finally {
        genBtn.disabled = false;
        genBtn.innerHTML = '✨ Generate Realistic Data with Antigravity';
      }
    });

    fireBtn?.addEventListener('click', async () => {
      let parsed = {};
      try {
        parsed = JSON.parse(textarea.value.trim() || '{}');
      } catch (e) {
        this.toast('Invalid JSON format in payload body', 'error');
        return;
      }

      modal?.classList.remove('open');
      this.toast('Dispatching simulated webhook payload...', 'info');

      this.openFullscreenViewer();
      await this.executeCurrentWorkflowStreamWithData([ { json: parsed } ]);
    });
  }

  async executeCurrentWorkflowStreamWithData(initialData = []) {
    if (!this.currentWorkflow || !this.currentWorkflow.id) return;
    await this.saveCurrentWorkflow();

    try {
      const res = await this.api(`/api/workflows/${this.currentWorkflow.id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ initialData })
      });
      this.lastExecutionDetails = res.data;
      this.renderFullscreenOutput();

      if (res.data?.nodes) {
        for (const nr of res.data.nodes) {
          const card = document.getElementById(`fs-card-${nr.nodeId}`);
          const badge = document.getElementById(`fs-badge-${nr.nodeId}`);
          if (card) {
            card.className = `fs-node-card status-${nr.status}`;
          }
          if (badge) {
            badge.className = `fs-node-exec-badge status-${nr.status}`;
            badge.textContent = nr.status === 'success' ? `✓ SUCCESS (${nr.duration}ms)` : '✗ FAILED';
          }
          if (nr.status === 'success') {
            document.querySelectorAll('.fs-chart-connector').forEach((c) => {
              if (c.dataset.source === nr.nodeName || c.dataset.sourceId === nr.nodeId) {
                c.classList.add('status-success');
              }
            });
            this.canvas.highlightConnection(nr.nodeName, null, 'success');
          }
          this.canvas.setNodeExecutionStatus(nr.nodeId, nr.status, nr.duration);
        }
      }
      this.toast(`Simulation finished in ${res.data.execution.duration}ms!`, 'success');
    } catch (err) {
      this.toast(`Simulation failed: ${err.message}`, 'error');
    }
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AutoFlowApp();
});
