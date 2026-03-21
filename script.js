// Initialize prompts on page load
document.addEventListener('DOMContentLoaded', function () {
  // Seed demo data on first visit
  if (!localStorage.getItem('prompts')) {
    localStorage.setItem('prompts', JSON.stringify(DEMO_PROMPTS));
  }

  renderPrompts();
  document.getElementById('promptForm').addEventListener('submit', savePrompt);

  // Search and sort controls
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  if (searchInput) searchInput.addEventListener('input', renderPrompts);
  if (sortSelect) sortSelect.addEventListener('change', renderPrompts);
  // Listen for star rating clicks (event delegation)
  document
    .getElementById('promptsContainer')
    .addEventListener('click', function (e) {
      const btn = e.target.closest('.star');
      if (!btn) return;
      const card = btn.closest('.prompt-card');
      if (!card) return;
      const id = Number(card.dataset.id);
      const value = Number(btn.dataset.value);
      setPromptRating(id, value);
    });
  // Notes: event delegation for add/edit/save/cancel/delete
  document
    .getElementById('promptsContainer')
    .addEventListener('click', function (e) {
      const addBtn = e.target.closest('.add-note');
      if (addBtn) {
        const card = addBtn.closest('.prompt-card');
        const promptId = Number(card.dataset.id);
        showNoteEditor(card, promptId);
        return;
      }

      const editBtn = e.target.closest('.edit-note');
      if (editBtn) {
        const card = editBtn.closest('.prompt-card');
        const promptId = Number(card.dataset.id);
        const noteId = editBtn.closest('.note-item').dataset.noteId;
        const noteText = editBtn
          .closest('.note-item')
          .querySelector('.note-text').textContent;
        showNoteEditor(card, promptId, noteId, noteText);
        return;
      }

      const saveBtn = e.target.closest('.save-note');
      if (saveBtn) {
        const card = saveBtn.closest('.prompt-card');
        const promptId = Number(card.dataset.id);
        const editor = card.querySelector('.note-editor');
        const textarea = editor.querySelector('textarea');
        const noteId = saveBtn.dataset.noteId || null;
        const text = textarea.value.trim();
        saveNote(promptId, noteId, text);
        return;
      }

      const cancelBtn = e.target.closest('.cancel-note');
      if (cancelBtn) {
        const card = cancelBtn.closest('.prompt-card');
        const editor = card.querySelector('.note-editor');
        if (editor) editor.remove();
        return;
      }

      const deleteBtn = e.target.closest('.delete-note');
      if (deleteBtn) {
        const card = deleteBtn.closest('.prompt-card');
        const promptId = Number(card.dataset.id);
        const noteId = deleteBtn.closest('.note-item').dataset.noteId;
        if (confirm('Delete this note?')) {
          deleteNote(promptId, noteId);
        }
        return;
      }

      const copyBtn = e.target.closest('.card-copy-btn');
      if (copyBtn) {
        const card = copyBtn.closest('.prompt-card');
        const promptId = Number(card.dataset.id);
        const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
        const p = prompts.find((x) => Number(x.id) === promptId);
        if (p && navigator.clipboard) {
          navigator.clipboard.writeText(p.content).then(() => {
            const orig = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = orig; }, 1500);
          });
        }
        return;
      }
    });

  // char counter for live textarea input (delegated)
  document
    .getElementById('promptsContainer')
    .addEventListener('input', function (e) {
      const ta = e.target.closest('.note-textarea');
      if (!ta) return;
      const editor = ta.closest('.note-editor');
      const counter = editor.querySelector('.note-counter');
      const max = Number(ta.getAttribute('maxlength') || 500);
      const remaining = Math.max(0, max - ta.value.length);
      counter.textContent = `${remaining} chars left`;
    });
});

// Save prompt to localStorage
function savePrompt(e) {
  e.preventDefault();

  const title = document.getElementById('promptTitle').value.trim();
  const content = document.getElementById('promptContent').value.trim();

  const modelName = document.getElementById('modelName').value.trim();

  if (!title || !content) {
    alert('Please fill in all fields');
    return;
  }

  // Get existing prompts from localStorage
  const prompts = JSON.parse(localStorage.getItem('prompts')) || [];

  try {
    validateModelName(modelName);
  } catch (err) {
    alert(err.message);
    return;
  }

  // Create new prompt object with unique ID and attached metadata
  const newPrompt = {
    id: Date.now(),
    title: title,
    content: content,
    rating: 0,
    notes: [],
    // attach metadata object according to schema
    metadata: trackModel(modelName, content),
  };

  // Add to prompts array and save to localStorage
  prompts.push(newPrompt);
  localStorage.setItem('prompts', JSON.stringify(prompts));

  // Clear form
  document.getElementById('promptForm').reset();

  // Re-render prompts
  renderPrompts();
}

// Render all prompts from localStorage
function renderPrompts() {
  const allPrompts = JSON.parse(localStorage.getItem('prompts')) || [];
  const container = document.getElementById('promptsContainer');
  const countBadge = document.getElementById('promptCount');

  // Update count badge
  if (countBadge) countBadge.textContent = allPrompts.length;

  // Filter by search query
  const query = (document.getElementById('searchInput') || {}).value || '';
  const q = query.trim().toLowerCase();
  const filtered = q
    ? allPrompts.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q) ||
          (p.metadata && p.metadata.model || '').toLowerCase().includes(q),
      )
    : allPrompts;

  // Sort
  const sortVal = (document.getElementById('sortSelect') || {}).value || 'newest';
  const sorted = filtered.slice().sort((a, b) => {
    if (sortVal === 'oldest') return parsePromptCreatedAt(a) - parsePromptCreatedAt(b);
    if (sortVal === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortVal === 'title') return (a.title || '').localeCompare(b.title || '');
    // newest (default)
    return parsePromptCreatedAt(b) - parsePromptCreatedAt(a);
  });

  // Clear container
  container.innerHTML = '';

  if (allPrompts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">📭</div>
        <p class="empty-title">No prompts yet</p>
        <p class="empty-sub">Create your first prompt using the form on the left.</p>
      </div>`;
    return;
  }

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <p class="empty-title">No results</p>
        <p class="empty-sub">No prompts match "<em>${escapeHtml(q)}</em>".</p>
      </div>`;
    return;
  }

  // Create card for each prompt
  sorted.forEach((prompt) => {
    if (typeof prompt.rating !== 'number') prompt.rating = 0;
    if (!Array.isArray(prompt.notes)) prompt.notes = [];
    const card = createPromptCard(prompt);
    container.appendChild(card);
  });
}

// Create a prompt card element
function createPromptCard(prompt) {
  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;

  // Get preview (first 15 words)
  const preview = getPreview(prompt.content, 15);

  // metadata display (use fallback if missing)
  const md = prompt.metadata || null;
  const modelDisplay = md && md.model ? escapeHtml(md.model) : '—';
  const createdDisplay =
    md && md.createdAt
      ? formatTimestampISO(md.createdAt)
      : formatTimestamp(prompt.createdAt);
  const updatedDisplay =
    md && md.updatedAt ? formatTimestampISO(md.updatedAt) : '';
  const tokenHtml =
    md && md.tokenEstimate ? renderTokenEstimateHtml(md.tokenEstimate) : '';

  card.innerHTML = `
        <div class="card-header">
          <h3>${escapeHtml(prompt.title)}</h3>
          <button class="card-copy-btn" title="Copy prompt content">Copy</button>
        </div>
        <div class="meta-row">
          <span class="meta-model-tag">⚡ ${modelDisplay}</span>
          <span class="meta-date">${createdDisplay}</span>
        </div>
        <div class="stars" aria-label="Rating">
          ${renderStars(prompt.rating)}
        </div>
        <pre class="prompt-preview">${escapeHtml(preview)}</pre>
        <div class="meta-tokens">${tokenHtml}</div>
        <div class="notes-container">
          <div class="notes-header">
            <button class="btn btn-ghost btn-sm add-note">+ Add note</button>
          </div>
          ${renderNotesHtml(prompt.notes)}
        </div>
        <div class="prompt-actions">
            <button class="btn btn-danger btn-sm" onclick="deletePrompt(${prompt.id})">Delete</button>
        </div>
    `;

  return card;
}

// Render the stars HTML for a given rating (0-5)
function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating ? 'filled' : '';
    const starChar = i <= rating ? '★' : '☆';
    html += `<button class="star ${filled}" data-value="${i}" aria-label="Rate ${i} star" title="Rate ${i} star">${starChar}</button>`;
  }
  return html;
}

// Set rating for a prompt and persist
function setPromptRating(promptId, value) {
  const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
  const p = prompts.find((x) => Number(x.id) === Number(promptId));
  if (!p) return;
  const rating = Math.max(0, Math.min(5, Math.round(Number(value))));
  p.rating = rating;
  localStorage.setItem('prompts', JSON.stringify(prompts));
  renderPrompts();
}

// Render notes list HTML for a prompt
function renderNotesHtml(notes) {
  if (!notes || notes.length === 0)
    return '<p class="notes-empty">No notes</p>';
  // newest first
  const sorted = notes.slice().sort((a, b) => b.createdAt - a.createdAt);
  let html = '<ul class="notes-list">';
  for (const n of sorted) {
    html += `
      <li class="note-item" data-note-id="${n.id}">
        <div class="note-body">
          <div class="note-text">${escapeHtml(n.text)}</div>
          <div class="note-meta">${formatTimestamp(n.createdAt)}</div>
        </div>
        <div class="note-actions">
          <button class="btn btn-ghost btn-sm edit-note" aria-label="Edit note">Edit</button>
          <button class="btn btn-danger btn-sm delete-note" aria-label="Delete note">Del</button>
        </div>
      </li>`;
  }
  html += '</ul>';
  return html;
}

// Show inline editor inside a prompt card. If noteId provided, prefill text for edit.
function showNoteEditor(card, promptId, noteId = null, initialText = '') {
  // remove existing editor if any
  const existing = card.querySelector('.note-editor');
  if (existing) existing.remove();

  const editor = document.createElement('div');
  editor.className = 'note-editor';
  const max = 500;
  editor.innerHTML = `
    <textarea class="note-textarea" maxlength="${max}" rows="4">${escapeHtml(initialText)}</textarea>
    <div class="note-editor-footer">
      <span class="note-counter">${max - String(initialText).length} chars left</span>
      <div class="editor-actions">
        <button class="btn btn-primary btn-sm save-note" data-note-id="${noteId || ''}">Save</button>
        <button class="btn btn-ghost btn-sm cancel-note">Cancel</button>
      </div>
    </div>
  `;

  const container = card.querySelector('.notes-container');
  container.appendChild(editor);
  const ta = editor.querySelector('textarea');
  ta.focus();
  // update counter initially
  const counter = editor.querySelector('.note-counter');
  counter.textContent = `${max - ta.value.length} chars left`;
}

// Save or update a note
function saveNote(promptId, noteId, text) {
  const max = 500;
  if (!text) {
    alert('Note cannot be empty');
    return;
  }
  if (text.length > max) {
    alert('Note is too long');
    return;
  }
  const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
  const p = prompts.find((x) => Number(x.id) === Number(promptId));
  if (!p) return;
  if (!Array.isArray(p.notes)) p.notes = [];
  if (noteId) {
    const n = p.notes.find((x) => String(x.id) === String(noteId));
    if (n) {
      n.text = text;
      // keep original createdAt
    }
  } else {
    p.notes.push({ id: Date.now(), text: text, createdAt: Date.now() });
  }
  localStorage.setItem('prompts', JSON.stringify(prompts));
  renderPrompts();
}

// Delete a note
function deleteNote(promptId, noteId) {
  const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
  const p = prompts.find((x) => Number(x.id) === Number(promptId));
  if (!p || !Array.isArray(p.notes)) return;
  p.notes = p.notes.filter((n) => String(n.id) !== String(noteId));
  localStorage.setItem('prompts', JSON.stringify(prompts));
  renderPrompts();
}

// Format timestamp for display
function formatTimestamp(ts) {
  try {
    return new Date(Number(ts)).toLocaleString();
  } catch (e) {
    return '';
  }
}

// Parse createdAt from prompt (supports metadata.createdAt ISO or legacy numeric/string)
function parsePromptCreatedAt(prompt) {
  try {
    if (
      prompt &&
      prompt.metadata &&
      typeof prompt.metadata.createdAt === 'string'
    ) {
      const t = Date.parse(prompt.metadata.createdAt);
      return isNaN(t) ? 0 : t;
    }
    if (prompt && prompt.createdAt) {
      const n = Number(prompt.createdAt);
      if (!isNaN(n)) return n;
      const t = Date.parse(String(prompt.createdAt));
      return isNaN(t) ? 0 : t;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

function formatTimestampISO(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString();
  } catch (e) {
    return '';
  }
}

function renderTokenEstimateHtml(tokenEstimate) {
  if (!tokenEstimate) return '';
  const cls =
    tokenEstimate.confidence === 'high'
      ? 'token-high'
      : tokenEstimate.confidence === 'medium'
        ? 'token-medium'
        : 'token-low';
  return `<span class="token-estimate ${cls}">${Math.round(tokenEstimate.min)} - ${Math.round(tokenEstimate.max)} tokens • ${tokenEstimate.confidence}</span>`;
}

// Validation helpers
function isValidISODate(s) {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  return !isNaN(d) && s === d.toISOString();
}

function validateModelName(name) {
  if (typeof name !== 'string') throw new Error('Model name must be a string');
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Model name cannot be empty');
  if (trimmed.length > 100)
    throw new Error('Model name must be 100 characters or fewer');
  return true;
}

// Token estimation per spec
function estimateTokens(text, isCode) {
  try {
    if (typeof text !== 'string') throw new Error('Text must be a string');
    const words =
      text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;
    let min = 0.75 * words;
    let max = 0.25 * chars;
    if (isCode) {
      min *= 1.3;
      max *= 1.3;
    }
    // Normalize to integers
    min = Math.max(0, Math.round(min));
    max = Math.max(0, Math.round(max));
    const reference = Math.max(min, max);
    let confidence = 'high';
    if (reference < 1000) confidence = 'high';
    else if (reference <= 5000) confidence = 'medium';
    else confidence = 'low';
    return { min, max, confidence };
  } catch (e) {
    throw new Error('Failed to estimate tokens: ' + e.message);
  }
}

// trackModel: creates metadata object
function trackModel(modelName, content) {
  try {
    validateModelName(modelName);
    if (typeof content !== 'string')
      throw new Error('Content must be a string');
    const createdAt = new Date().toISOString();
    const tokenEstimate = estimateTokens(content, false);
    return {
      model: modelName,
      createdAt: createdAt,
      updatedAt: createdAt,
      tokenEstimate: tokenEstimate,
    };
  } catch (e) {
    throw new Error('trackModel error: ' + e.message);
  }
}

// updateTimestamps: update updatedAt ensuring validity
function updateTimestamps(metadata) {
  try {
    if (!metadata || typeof metadata !== 'object')
      throw new Error('Metadata must be an object');
    if (!isValidISODate(metadata.createdAt))
      throw new Error('createdAt must be a valid ISO 8601 string');
    const now = new Date().toISOString();
    if (Date.parse(now) < Date.parse(metadata.createdAt))
      throw new Error('updatedAt cannot be earlier than createdAt');
    metadata.updatedAt = now;
    return metadata;
  } catch (e) {
    throw new Error('updateTimestamps error: ' + e.message);
  }
}

// small helper for try/catch safe now
function safeIsoNow() {
  return new Date().toISOString();
}

// Delete prompt from localStorage
function deletePrompt(id) {
  if (confirm('Are you sure you want to delete this prompt?')) {
    let prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    prompts = prompts.filter((prompt) => prompt.id !== id);
    localStorage.setItem('prompts', JSON.stringify(prompts));
    renderPrompts();
  }
}

// Get preview text (first n words)
function getPreview(text, wordCount) {
  const words = text.split(/\s+/);
  const preview = words.slice(0, wordCount).join(' ');
  return words.length > wordCount ? preview + '...' : preview;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ----------------------- Export/Import System -----------------------
const EXPORT_SCHEMA_VERSION = 1;

document.addEventListener('DOMContentLoaded', function () {
  // wire up export/import buttons
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (exportBtn) exportBtn.addEventListener('click', exportPrompts);
  if (importBtn) importBtn.addEventListener('click', () => importFile.click());
  if (importFile) importFile.addEventListener('change', handleFileInputChange);

  // modal handlers
  const modalMerge = document.getElementById('conflictMerge');
  const modalOverwrite = document.getElementById('conflictOverwrite');
  const modalCreateNew = document.getElementById('conflictCreateNew');
  const modalCancel = document.getElementById('conflictCancel');
  if (modalMerge)
    modalMerge.addEventListener('click', () => resolveImport('merge'));
  if (modalOverwrite)
    modalOverwrite.addEventListener('click', () => resolveImport('overwrite'));
  if (modalCreateNew)
    modalCreateNew.addEventListener('click', () => resolveImport('create-new'));
  if (modalCancel)
    modalCancel.addEventListener('click', () => resolveImport('cancel'));
});

let pendingImport = null; // holds parsed import payload while user resolves conflicts

function showMessage(text, timeout = 6000) {
  const area = document.getElementById('messageArea');
  if (!area) return;
  const el = document.createElement('div');
  el.className = 'msg';
  el.textContent = text;
  area.appendChild(el);
  if (timeout > 0) setTimeout(() => el.remove(), timeout);
}

function computeStats(prompts) {
  const total = prompts.length;
  const avgRating =
    total === 0
      ? 0
      : prompts.reduce((s, p) => s + (Number(p.rating) || 0), 0) / total;
  const modelCounts = {};
  for (const p of prompts) {
    const m =
      p && p.metadata && p.metadata.model
        ? String(p.metadata.model)
        : 'unknown';
    modelCounts[m] = (modelCounts[m] || 0) + 1;
  }
  let mostUsed = null;
  let max = 0;
  for (const k of Object.keys(modelCounts)) {
    if (modelCounts[k] > max) {
      max = modelCounts[k];
      mostUsed = k;
    }
  }
  return {
    totalPrompts: total,
    averageRating: Number(avgRating.toFixed(2)),
    mostUsedModel: mostUsed,
  };
}

function validatePromptShape(p) {
  const errors = [];
  if (!p || typeof p !== 'object') {
    errors.push('Prompt must be an object');
    return errors;
  }
  if (p.id === undefined || p.id === null) errors.push('Missing id');
  if (!p.title || typeof p.title !== 'string')
    errors.push('Missing or invalid title');
  if (!p.content || typeof p.content !== 'string')
    errors.push('Missing or invalid content');
  if (p.rating !== undefined && typeof p.rating !== 'number')
    errors.push('rating must be a number');
  if (p.notes !== undefined && !Array.isArray(p.notes))
    errors.push('notes must be an array');
  if (!p.metadata || typeof p.metadata !== 'object')
    errors.push('Missing metadata');
  else {
    if (!p.metadata.model || typeof p.metadata.model !== 'string')
      errors.push('metadata.model missing or invalid');
    if (!p.metadata.createdAt || !isValidISODate(p.metadata.createdAt))
      errors.push('metadata.createdAt missing or not ISO string');
  }
  return errors;
}

function validateExportSchema(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') errors.push('Export must be an object');
  if (obj.version !== EXPORT_SCHEMA_VERSION)
    errors.push('Unsupported export version: ' + String(obj.version));
  if (!obj.timestamp || typeof obj.timestamp !== 'string')
    errors.push('Missing export timestamp');
  if (!obj.stats || typeof obj.stats !== 'object') errors.push('Missing stats');
  if (!Array.isArray(obj.prompts)) errors.push('Missing prompts array');
  else {
    for (let i = 0; i < obj.prompts.length; i++) {
      const p = obj.prompts[i];
      const pe = validatePromptShape(p);
      if (pe.length) errors.push('Prompt[' + i + ']: ' + pe.join('; '));
    }
  }
  return errors;
}

function exportPrompts() {
  try {
    const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    // validate each prompt shape (best-effort)
    const invalid = [];
    for (const p of prompts) {
      const errs = validatePromptShape(p);
      if (errs.length) invalid.push({ id: p && p.id, errors: errs });
    }
    if (invalid.length) {
      const msg =
        'Export validation: ' +
        invalid.length +
        ' prompts have issues. They will still be exported.';
      showMessage(msg);
    }

    const payload = {
      version: EXPORT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      stats: computeStats(prompts),
      prompts: prompts,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fname = `prompts_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showMessage('Export started: ' + fname, 4000);
  } catch (e) {
    alert('Export failed: ' + (e && e.message));
  }
}

function handleFileInputChange(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  readImportFile(f).catch((err) =>
    showMessage('Import error: ' + err.message, 8000),
  );
  // reset input so same file can be selected again later
  e.target.value = '';
}

function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const parsed = JSON.parse(String(ev.target.result));
        const vErr = validateExportSchema(parsed);
        if (vErr.length) {
          reject(new Error('Invalid import structure: ' + vErr.join(' | ')));
          return;
        }
        // store pending import and detect duplicates
        pendingImport = parsed;
        const existing = JSON.parse(localStorage.getItem('prompts')) || [];
        const existingMap = new Set(existing.map((p) => String(p.id)));
        const duplicates = parsed.prompts.filter((p) =>
          existingMap.has(String(p.id)),
        );
        if (duplicates.length === 0) {
          // no conflicts — proceed to apply
          applyImport(parsed, 'merge')
            .then(() => resolve())
            .catch(reject);
        } else {
          // show modal with info
          const msgEl = document.getElementById('conflictMessage');
          if (msgEl)
            msgEl.textContent = `${duplicates.length} duplicate prompt ID(s) detected. Choose how to resolve conflicts.`;
          const modal = document.getElementById('conflictModal');
          if (modal) modal.setAttribute('aria-hidden', 'false');
          showMessage(
            `Import blocked: ${duplicates.length} duplicates detected. Choose resolution.`,
            8000,
          );
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = function () {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

async function resolveImport(choice) {
  const modal = document.getElementById('conflictModal');
  if (modal) modal.setAttribute('aria-hidden', 'true');
  if (!pendingImport) {
    showMessage('No pending import to resolve');
    return;
  }
  if (choice === 'cancel') {
    pendingImport = null;
    showMessage('Import cancelled');
    return;
  }
  try {
    await applyImport(pendingImport, choice);
    pendingImport = null;
  } catch (e) {
    showMessage('Import failed: ' + (e && e.message), 8000);
  }
}

async function applyImport(payload, conflictResolution) {
  // backup existing
  const existing = JSON.parse(localStorage.getItem('prompts')) || [];
  const backupKey = 'prompts_backup_' + new Date().toISOString();
  try {
    localStorage.setItem(backupKey, JSON.stringify(existing));
  } catch (e) {
    throw new Error('Failed to create backup: ' + e.message);
  }

  try {
    const existingMap = new Map(existing.map((p) => [String(p.id), p]));
    const result = existing.slice();
    let createdNew = 0;
    for (const incoming of payload.prompts) {
      const key = String(incoming.id);
      if (!existingMap.has(key)) {
        // no conflict — add
        result.push(incoming);
        existingMap.set(key, incoming);
        continue;
      }
      // conflict
      const existingPrompt = existingMap.get(key);
      if (conflictResolution === 'overwrite') {
        // replace existing in result array
        const idx = result.findIndex((r) => String(r.id) === key);
        if (idx >= 0) result[idx] = incoming;
        else result.push(incoming);
        existingMap.set(key, incoming);
      } else if (conflictResolution === 'merge') {
        // update fields but keep createdAt if present
        const merged = Object.assign({}, existingPrompt, incoming);
        // merge notes without duplicates
        merged.notes = mergeNotes(
          existingPrompt.notes || [],
          incoming.notes || [],
        );
        // ensure metadata.createdAt preserved if existing valid
        if (
          existingPrompt.metadata &&
          existingPrompt.metadata.createdAt &&
          isValidISODate(existingPrompt.metadata.createdAt)
        ) {
          merged.metadata = merged.metadata || {};
          merged.metadata.createdAt = existingPrompt.metadata.createdAt;
        }
        const idx = result.findIndex((r) => String(r.id) === key);
        if (idx >= 0) result[idx] = merged;
        else result.push(merged);
        existingMap.set(key, merged);
      } else if (conflictResolution === 'create-new') {
        // give incoming a new unique id
        const newId = generateUniqueId(existingMap);
        const clone = Object.assign({}, incoming, { id: newId });
        result.push(clone);
        existingMap.set(String(newId), clone);
        createdNew++;
      } else {
        throw new Error(
          'Unknown conflict resolution: ' + String(conflictResolution),
        );
      }
    }

    // final validation pass
    for (const p of result) {
      const errs = validatePromptShape(p);
      if (errs.length)
        throw new Error(
          'Validation error after merge/replace: ' + errs.join('; '),
        );
    }

    localStorage.setItem('prompts', JSON.stringify(result));
    renderPrompts();
    showMessage(
      'Import complete. ' +
        payload.prompts.length +
        ' prompts processed. ' +
        (createdNew ? createdNew + ' created with new IDs.' : ''),
      8000,
    );
    return true;
  } catch (e) {
    // rollback
    try {
      const b = localStorage.getItem(backupKey);
      if (b !== null) localStorage.setItem('prompts', b);
    } catch (rbErr) {
      throw new Error(
        'Import failed and rollback failed: ' +
          rbErr.message +
          ' | original: ' +
          e.message,
      );
    }
    throw e;
  }
}

function mergeNotes(a, b) {
  const map = new Map();
  for (const n of a || []) map.set(String(n.id), n);
  for (const n of b || []) {
    if (!map.has(String(n.id))) map.set(String(n.id), n);
  }
  return Array.from(map.values());
}

function generateUniqueId(existingMap) {
  let id;
  do {
    id = Date.now() + Math.floor(Math.random() * 10000);
  } while (existingMap.has(String(id)));
  return id;
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

function loadDemoData() {
  if (!confirm('This will replace all current prompts with 20 demo prompts. Continue?')) return;
  localStorage.setItem('prompts', JSON.stringify(DEMO_PROMPTS));
  renderPrompts();
  showMessage('20 demo prompts loaded.', 4000);
}

const DEMO_PROMPTS = [
  {
    id: 1700000001000,
    title: 'Summarize Article into Bullet Points',
    content: 'You are a skilled editor. Summarize the following article into exactly 5 concise bullet points. Each bullet should be one sentence, capturing a distinct key idea. Do not repeat information across bullets.\n\nArticle:\n{{article}}',
    rating: 5,
    notes: [
      { id: 1700000001100, text: 'Works great for news articles and blog posts. Tends to miss nuance on academic papers.', createdAt: 1700000001100 }
    ],
    metadata: {
      model: 'gpt-4o',
      createdAt: '2025-11-14T09:00:00.000Z',
      updatedAt: '2025-11-14T09:00:00.000Z',
      tokenEstimate: { min: 62, max: 89, confidence: 'high' }
    }
  },
  {
    id: 1700000002000,
    title: 'Code Review — Security Focus',
    content: 'You are a senior application security engineer. Review the following code for security vulnerabilities only. For each issue found:\n1. Name the vulnerability (e.g., SQL Injection, XSS)\n2. Quote the specific line(s)\n3. Explain the risk\n4. Provide a corrected code snippet\n\nCode:\n```\n{{code}}\n```',
    rating: 5,
    notes: [
      { id: 1700000002100, text: 'Very reliable for OWASP Top 10. Add "focus on authentication" for auth-heavy code.', createdAt: 1700000002100 },
      { id: 1700000002200, text: 'Tested on Python Flask and Node.js Express — both excellent results.', createdAt: 1700000002200 }
    ],
    metadata: {
      model: 'claude-sonnet-4-6',
      createdAt: '2025-11-15T10:30:00.000Z',
      updatedAt: '2025-11-15T11:00:00.000Z',
      tokenEstimate: { min: 88, max: 124, confidence: 'high' }
    }
  },
  {
    id: 1700000003000,
    title: 'Generate Unit Tests',
    content: 'You are a test engineer. Write comprehensive unit tests for the function below using {{framework}} (e.g., Jest, pytest, JUnit). Cover:\n- Happy path\n- Edge cases (empty input, null, boundary values)\n- Error cases\n\nUse descriptive test names that explain what is being tested and why.\n\nFunction:\n```\n{{function_code}}\n```',
    rating: 4,
    notes: [],
    metadata: {
      model: 'gpt-4o-mini',
      createdAt: '2025-11-16T08:00:00.000Z',
      updatedAt: '2025-11-16T08:00:00.000Z',
      tokenEstimate: { min: 74, max: 108, confidence: 'high' }
    }
  },
  {
    id: 1700000004000,
    title: 'Explain Code to a Junior Developer',
    content: 'You are a patient senior developer mentoring a junior engineer. Explain the following code step by step as if the reader is familiar with programming basics but new to this codebase.\n\n- Avoid jargon without defining it first\n- Use analogies where helpful\n- End with a one-sentence summary of what the code accomplishes\n\nCode:\n```\n{{code}}\n```',
    rating: 4,
    notes: [
      { id: 1700000004100, text: 'Great for onboarding docs. Pair with "Explain Code to a Non-Technical Stakeholder" for full coverage.', createdAt: 1700000004100 }
    ],
    metadata: {
      model: 'claude-sonnet-4-6',
      createdAt: '2025-11-17T14:00:00.000Z',
      updatedAt: '2025-11-17T14:00:00.000Z',
      tokenEstimate: { min: 79, max: 113, confidence: 'high' }
    }
  },
  {
    id: 1700000005000,
    title: 'Write a Product Requirements Document (PRD)',
    content: 'You are a product manager. Write a concise PRD for the feature described below. Include these sections:\n\n## Problem Statement\n## Goals & Non-Goals\n## User Stories (at least 3, in "As a… I want… so that…" format)\n## Success Metrics\n## Open Questions\n\nFeature description:\n{{feature_description}}',
    rating: 3,
    notes: [],
    metadata: {
      model: 'gpt-4o',
      createdAt: '2025-11-18T11:00:00.000Z',
      updatedAt: '2025-11-18T11:00:00.000Z',
      tokenEstimate: { min: 68, max: 100, confidence: 'high' }
    }
  },
  {
    id: 1700000006000,
    title: 'Translate Error Message to Plain English',
    content: 'You are a developer experience expert. Translate the following technical error message into plain English for a non-technical user. The explanation should:\n- Be 1-3 sentences\n- Avoid all technical terms\n- Suggest one actionable next step the user can take\n\nError:\n{{error_message}}',
    rating: 5,
    notes: [
      { id: 1700000006100, text: 'Use this in support tooling. Users love it — CSAT improved ~12% after we integrated this.', createdAt: 1700000006100 }
    ],
    metadata: {
      model: 'gpt-4o-mini',
      createdAt: '2025-11-19T09:30:00.000Z',
      updatedAt: '2025-11-19T09:30:00.000Z',
      tokenEstimate: { min: 65, max: 95, confidence: 'high' }
    }
  },
  {
    id: 1700000007000,
    title: 'Refactor Code for Readability',
    content: 'You are a software craftsperson. Refactor the code below to improve readability and maintainability without changing its external behavior. Apply these principles:\n- Meaningful variable and function names\n- Single responsibility per function\n- Remove duplication (DRY)\n- Add brief comments only where the logic is non-obvious\n\nReturn only the refactored code, then a short "What changed" section.\n\nOriginal code:\n```\n{{code}}\n```',
    rating: 4,
    notes: [],
    metadata: {
      model: 'claude-sonnet-4-6',
      createdAt: '2025-11-20T15:00:00.000Z',
      updatedAt: '2025-11-20T15:00:00.000Z',
      tokenEstimate: { min: 84, max: 121, confidence: 'high' }
    }
  },
  {
    id: 1700000008000,
    title: 'Socratic Debate Partner',
    content: 'You are a Socratic debate partner. I will state a position and you will challenge it with thoughtful, probing questions — not counter-arguments. Your goal is to help me stress-test my reasoning, expose hidden assumptions, and think more rigorously.\n\nAsk one question at a time. After I respond, ask the next question based on my answer.\n\nMy position: {{position}}',
    rating: 4,
    notes: [
      { id: 1700000008100, text: 'Excellent for pre-mortem exercises before big decisions. Works best with Claude — GPT-4o tends to drift into giving answers instead of asking questions.', createdAt: 1700000008100 }
    ],
    metadata: {
      model: 'claude-opus-4-6',
      createdAt: '2025-11-21T10:00:00.000Z',
      updatedAt: '2025-11-21T10:00:00.000Z',
      tokenEstimate: { min: 77, max: 111, confidence: 'high' }
    }
  },
  {
    id: 1700000009000,
    title: 'Convert JSON to TypeScript Interface',
    content: 'Convert the following JSON object into a TypeScript interface. Rules:\n- Use PascalCase for the interface name (derive it from context if possible, or use "Root")\n- Mark fields as optional (?) if their value is null or if the field name suggests it might be absent\n- Use union types for fields that could be multiple types\n- Add a JSDoc comment to each field explaining its purpose\n\nJSON:\n```json\n{{json}}\n```',
    rating: 5,
    notes: [],
    metadata: {
      model: 'gpt-4o-mini',
      createdAt: '2025-11-22T13:00:00.000Z',
      updatedAt: '2025-11-22T13:00:00.000Z',
      tokenEstimate: { min: 71, max: 104, confidence: 'high' }
    }
  },
  {
    id: 1700000010000,
    title: 'Write a Cold Outreach Email',
    content: 'You are an expert copywriter specialising in B2B outreach. Write a cold email for the following context. The email must:\n- Subject line: under 8 words, curiosity-driving, no clickbait\n- Opening: personalised reference to something specific about the recipient\n- Body: one clear value proposition (2-3 sentences max)\n- CTA: one specific, low-friction ask\n- Total length: under 150 words\n\nContext:\nSender: {{sender_info}}\nRecipient: {{recipient_info}}\nGoal: {{goal}}',
    rating: 3,
    notes: [
      { id: 1700000010100, text: 'Results vary heavily based on how much detail you put in the context. Rich context = much better email.', createdAt: 1700000010100 }
    ],
    metadata: {
      model: 'gpt-4o',
      createdAt: '2025-11-23T08:00:00.000Z',
      updatedAt: '2025-11-23T08:00:00.000Z',
      tokenEstimate: { min: 95, max: 136, confidence: 'high' }
    }
  },
  {
    id: 1700000011000,
    title: 'SQL Query Optimiser',
    content: 'You are a database performance expert. Analyse the following SQL query and suggest optimisations. For each suggestion:\n1. Describe the issue (e.g., full table scan, N+1, missing index)\n2. Show the optimised query or schema change\n3. Estimate the performance impact (low / medium / high)\n\nDatabase engine: {{engine}} (e.g., PostgreSQL, MySQL)\nQuery:\n```sql\n{{query}}\n```\n\nSchema (if relevant):\n```sql\n{{schema}}\n```',
    rating: 4,
    notes: [],
    metadata: {
      model: 'gpt-4o',
      createdAt: '2025-11-24T11:00:00.000Z',
      updatedAt: '2025-11-24T11:00:00.000Z',
      tokenEstimate: { min: 80, max: 116, confidence: 'high' }
    }
  },
  {
    id: 1700000012000,
    title: 'Generate Commit Message from Diff',
    content: 'You are a disciplined engineer. Write a git commit message for the following diff. Follow the Conventional Commits spec:\n- Format: <type>(<scope>): <subject>\n- Types: feat, fix, refactor, test, docs, chore, perf\n- Subject: imperative mood, ≤72 chars, no period at end\n- Body (optional): explain *why*, not *what*, wrap at 72 chars\n\nDiff:\n```diff\n{{diff}}\n```',
    rating: 5,
    notes: [
      { id: 1700000012100, text: 'Add "Do not include co-author lines" if you want clean messages without AI attribution.', createdAt: 1700000012100 }
    ],
    metadata: {
      model: 'gpt-4o-mini',
      createdAt: '2025-11-25T14:00:00.000Z',
      updatedAt: '2025-11-25T14:00:00.000Z',
      tokenEstimate: { min: 76, max: 110, confidence: 'high' }
    }
  },
  {
    id: 1700000013000,
    title: 'Design System Component Spec',
    content: 'You are a design systems engineer. Write a component specification for the UI component described below. Include:\n\n## Component Name & Purpose\n## Props / API\n| Prop | Type | Default | Description |\n|------|------|---------|-------------|\n## Variants\n## Accessibility Requirements (ARIA, keyboard navigation)\n## Usage Examples (code snippets)\n## What NOT to do\n\nComponent description:\n{{description}}',
    rating: 4,
    notes: [],
    metadata: {
      model: 'claude-sonnet-4-6',
      createdAt: '2025-11-26T09:00:00.000Z',
      updatedAt: '2025-11-26T09:00:00.000Z',
      tokenEstimate: { min: 70, max: 105, confidence: 'high' }
    }
  },
  {
    id: 1700000014000,
    title: 'Root Cause Analysis (5 Whys)',
    content: 'You are a reliability engineer facilitating a blameless post-mortem. Apply the 5 Whys technique to the following incident. For each "why", state the cause and the evidence that supports it. After the 5th why, state:\n- Root cause\n- Recommended corrective action\n- Recommended preventive action\n\nIncident summary:\n{{incident}}',
    rating: 3,
    notes: [
      { id: 1700000014100, text: 'Useful starting point but always review with the actual engineers — the model sometimes makes plausible-sounding but wrong causal chains.', createdAt: 1700000014100 }
    ],
    metadata: {
      model: 'claude-sonnet-4-6',
      createdAt: '2025-11-27T10:00:00.000Z',
      updatedAt: '2025-11-27T10:00:00.000Z',
      tokenEstimate: { min: 72, max: 106, confidence: 'high' }
    }
  },
  {
    id: 1700000015000,
    title: 'Interview Question Generator',
    content: 'You are a senior engineering interviewer. Generate {{n}} interview questions for the role and level below. For each question:\n- State the question\n- List 2-3 signals you are looking for in a strong answer\n- Classify it: Behavioural | Technical | System Design\n\nRole: {{role}}\nLevel: {{level}} (e.g., L4 / Senior / Staff)\nFocus areas: {{focus_areas}}',
    rating: 4,
    notes: [],
    metadata: {
      model: 'gpt-4o',
      createdAt: '2025-11-28T13:00:00.000Z',
      updatedAt: '2025-11-28T13:00:00.000Z',
      tokenEstimate: { min: 63, max: 94, confidence: 'high' }
    }
  },
  {
    id: 1700000016000,
    title: 'API Documentation from Code',
    content: 'You are a technical writer. Generate OpenAPI-style documentation for the following API endpoint. Include:\n- Summary and description\n- Request: method, path, path params, query params, request body (with JSON Schema)\n- Response: status codes, response body schema, example responses\n- Error responses\n\nFormat the output as a YAML OpenAPI 3.0 snippet.\n\nEndpoint code:\n```\n{{code}}\n```',
    rating: 4,
    notes: [
      { id: 1700000016100, text: 'Best results when you include the full route handler + any middleware. Partial context leads to incomplete schemas.', createdAt: 1700000016100 }
    ],
    metadata: {
      model: 'gpt-4o',
      createdAt: '2025-11-29T09:00:00.000Z',
      updatedAt: '2025-11-29T09:00:00.000Z',
      tokenEstimate: { min: 78, max: 114, confidence: 'high' }
    }
  },
  {
    id: 1700000017000,
    title: 'Competitive Analysis Matrix',
    content: 'You are a strategic analyst. Build a competitive analysis matrix comparing {{our_product}} against the competitors listed. For each competitor, evaluate:\n\n| Dimension | Us | {{competitor_1}} | {{competitor_2}} | {{competitor_3}} |\n|-----------|----|----|----|----|  \n\nDimensions to cover: Pricing, Core Features, Target Segment, Strengths, Weaknesses, Differentiator.\n\nAfter the matrix, write a 3-sentence strategic insight paragraph.\n\nContext: {{context}}',
    rating: 2,
    notes: [
      { id: 1700000017100, text: 'Output quality depends heavily on how current the model knowledge is. Always verify competitor data manually before sharing.', createdAt: 1700000017100 }
    ],
    metadata: {
      model: 'gpt-4o',
      createdAt: '2025-11-30T11:00:00.000Z',
      updatedAt: '2025-11-30T11:00:00.000Z',
      tokenEstimate: { min: 90, max: 131, confidence: 'high' }
    }
  },
  {
    id: 1700000018000,
    title: 'Regex Pattern Generator',
    content: 'You are a regex expert. Generate a regex pattern for the requirement below. Provide:\n1. The pattern itself\n2. Explanation of each part of the pattern\n3. Three example strings that MATCH\n4. Three example strings that DO NOT match\n5. Known edge cases or limitations\n\nTarget language/engine: {{language}} (affects syntax for lookaheads, flags, etc.)\n\nRequirement:\n{{requirement}}',
    rating: 5,
    notes: [],
    metadata: {
      model: 'gpt-4o-mini',
      createdAt: '2025-12-01T10:00:00.000Z',
      updatedAt: '2025-12-01T10:00:00.000Z',
      tokenEstimate: { min: 74, max: 108, confidence: 'high' }
    }
  },
  {
    id: 1700000019000,
    title: 'Meeting Notes → Action Items',
    content: 'You are an executive assistant. Extract all action items from the meeting notes below. For each action item output:\n- Owner (person responsible)\n- Task (what needs to be done)\n- Due date (if mentioned, otherwise "TBD")\n- Priority: High / Medium / Low (infer from context)\n\nFormat as a markdown table. After the table, write a one-paragraph "Key Decisions" summary.\n\nMeeting notes:\n{{notes}}',
    rating: 5,
    notes: [
      { id: 1700000019100, text: 'Works best on verbatim transcript. For rough notes, prepend "Clean up any typos and informal language before extracting."', createdAt: 1700000019100 }
    ],
    metadata: {
      model: 'gpt-4o-mini',
      createdAt: '2025-12-02T08:00:00.000Z',
      updatedAt: '2025-12-02T08:00:00.000Z',
      tokenEstimate: { min: 82, max: 119, confidence: 'high' }
    }
  },
  {
    id: 1700000020000,
    title: 'System Design Interview Coach',
    content: 'You are a staff engineer coaching a candidate through a system design interview. I will describe a system to design and you will:\n1. Ask 3 clarifying questions before we start (requirements, scale, constraints)\n2. Wait for my answers\n3. Guide me through the design iteratively — prompt me to think about components, data flow, trade-offs, and failure modes\n4. After each component I propose, give brief feedback: what is good, what is missing\n5. At the end, give an overall score (1-5) and 2-3 specific improvement areas\n\nSystem to design: {{system}}',
    rating: 5,
    notes: [
      { id: 1700000020100, text: 'Outstanding for mock interview prep. Claude maintains the coach persona much more consistently than GPT-4o for long sessions.', createdAt: 1700000020100 },
      { id: 1700000020200, text: 'Add "Do not give the full solution upfront" to prevent the model from just designing everything itself.', createdAt: 1700000020200 }
    ],
    metadata: {
      model: 'claude-opus-4-6',
      createdAt: '2025-12-03T09:00:00.000Z',
      updatedAt: '2025-12-03T09:00:00.000Z',
      tokenEstimate: { min: 111, max: 158, confidence: 'high' }
    }
  }
];
