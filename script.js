// Initialize prompts on page load
document.addEventListener('DOMContentLoaded', function () {
  renderPrompts();
  document.getElementById('promptForm').addEventListener('submit', savePrompt);
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
  const prompts = JSON.parse(localStorage.getItem('prompts')) || [];
  const container = document.getElementById('promptsContainer');

  // Clear container
  container.innerHTML = '';

  if (prompts.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No prompts saved yet. Create your first prompt above!</p>';
    return;
  }

  // Sort prompts by createdAt descending (use metadata.createdAt when available)
  const sorted = prompts.slice().sort((a, b) => {
    const aDate = parsePromptCreatedAt(a);
    const bDate = parsePromptCreatedAt(b);
    return bDate - aDate;
  });

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
        <h3>${escapeHtml(prompt.title)}</h3>
        <div class="meta-row">
          <div class="meta-model">Model: <strong>${modelDisplay}</strong></div>
          <div class="meta-times">Created: ${createdDisplay}${updatedDisplay ? ' • Updated: ' + updatedDisplay : ''}</div>
        </div>
        <div class="stars" aria-hidden="false">
          ${renderStars(prompt.rating)}
        </div>
        <p class="prompt-preview">${escapeHtml(preview)}</p>
        <div class="meta-tokens">${tokenHtml}</div>
        <div class="notes-container">
          <div class="notes-header">
            <button class="btn add-note">Add note</button>
          </div>
          ${renderNotesHtml(prompt.notes)}
        </div>
        <div class="prompt-actions">
            <button class="btn btn-delete" onclick="deletePrompt(${prompt.id})">Delete</button>
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
          <button class="btn edit-note" aria-label="Edit note">Edit</button>
          <button class="btn delete-note" aria-label="Delete note">Delete</button>
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
        <button class="btn save-note" data-note-id="${noteId || ''}">Save</button>
        <button class="btn cancel-note">Cancel</button>
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
