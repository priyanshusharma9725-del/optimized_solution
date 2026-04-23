/* ============================
   DAILY WORK DIARY — APP.JS
   Optimized Solution
   ============================ */

const API_BASE = '/api';

// ---- App State ----
let currentUser = null;
let currentEditId = null;
let deleteTargetId = null;
let allUsers = [];

// ============================
// INITIALIZATION
// ============================
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in (session storage)
  const savedUser = sessionStorage.getItem('dwd_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    navigateAfterLogin();
  }

  // Set today's date on entry form
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('entryDate');
  if (dateInput) dateInput.value = today;
});

// ============================
// NAVIGATION
// ============================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  window.scrollTo(0, 0);
}

function navigateAfterLogin() {
  if (!currentUser) return;
  if (currentUser.role === 'admin') {
    showPage('adminPage');
    loadAdminEntries();
  } else {
    showPage('employeePage');
    initEmployeePage();
    loadUserEntries();
  }
}

// ============================
// LOGIN
// ============================
let loginRole = 'user';

function switchLoginRole(role) {
  loginRole = role;
  document.querySelectorAll('.role-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.role === role);
  });
  document.getElementById('loginSubtitle').textContent =
    role === 'admin' ? 'Sign in to the admin panel' : 'Sign in to your employee account';
  hideLoginError();
}

function togglePassword() {
  const pwInput = document.getElementById('loginPassword');
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
}

async function handleLogin() {
  const name = document.getElementById('loginName').value.trim();
  const password = document.getElementById('loginPassword').value;
  hideLoginError();

  if (!name || !password) {
    showLoginError('Please enter your name and password.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, role: loginRole })
    });

    const data = await res.json();
    if (!data.success) {
      showLoginError(data.message || 'Login failed.');
      return;
    }

    currentUser = data.user;
    sessionStorage.setItem('dwd_user', JSON.stringify(currentUser));
    navigateAfterLogin();

  } catch (err) {
    showLoginError('Cannot connect to server. Please try again.');
    console.error(err);
  }
}

function logout() {
  currentUser = null;
  currentEditId = null;
  sessionStorage.removeItem('dwd_user');
  showPage('loginPage');
  document.getElementById('loginName').value = '';
  document.getElementById('loginPassword').value = '';
  hideLoginError();
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'flex';
}

function hideLoginError() {
  document.getElementById('loginError').style.display = 'none';
}

// Enter key on login
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('loginPage').classList.contains('active')) {
    handleLogin();
  }
});

// ============================
// EMPLOYEE PAGE INIT
// ============================
async function initEmployeePage() {
  // Set user display name
  document.getElementById('userNameDisplay').textContent = currentUser.name;
  document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('entryDate').value = today;

  // Load all users for employee name dropdown
  try {
    const res = await fetch(`${API_BASE}/auth/users`);
    const data = await res.json();
    allUsers = data.users || [];
    populateEmployeeDropdown();
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

function populateEmployeeDropdown(disableAll = false) {
  const select = document.getElementById('employeeName');
  select.innerHTML = '';

  allUsers.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    // Restrict: only current user selectable
    if (u.name !== currentUser.name) {
      opt.disabled = true;
    } else {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  select.disabled = true; // always disabled per spec
}

// ============================
// EMPLOYEE ENTRY FORM
// ============================
function resetForm() {
  document.getElementById('projectName').value = '';
  document.getElementById('taskName').value = '';
  document.getElementById('taskDescription').value = '';
  document.getElementById('hoursAssigned').value = '';
  document.getElementById('hoursSpent').value = '';
  document.getElementById('entryStatus').value = 'Pending';
  document.getElementById('entryRemarks').value = '';

  hideFormMessages();
  setFormMode('add');
  currentEditId = null;
}

function setFormMode(mode) {
  const isEdit = mode === 'edit';

  // Fields disabled during edit (except hours_spent, status, remarks)
  const lockedFields = ['projectName', 'taskName', 'taskDescription', 'hoursAssigned'];
  lockedFields.forEach(id => {
    document.getElementById(id).disabled = isEdit;
  });

  // Update UI
  document.getElementById('formTitle').textContent = isEdit ? 'Edit Work Entry' : 'New Work Entry';
  document.getElementById('formDesc').textContent = isEdit
    ? 'Only Hours Spent, Status, and Remarks can be modified'
    : 'Log your daily tasks and progress';
  document.getElementById('submitBtnText').textContent = isEdit ? 'Update Entry' : 'Submit Entry';
  document.getElementById('cancelEditBtn').style.display = isEdit ? 'flex' : 'none';
}

function cancelEdit() {
  resetForm();
  currentEditId = null;
}

async function submitEntry() {
  hideFormMessages();

  const userId = currentUser.id;
  const date = document.getElementById('entryDate').value;
  const projectName = document.getElementById('projectName').value.trim();
  const taskName = document.getElementById('taskName').value.trim();
  const description = document.getElementById('taskDescription').value.trim();
  const hoursAssigned = parseFloat(document.getElementById('hoursAssigned').value) || 0;
  const hoursSpent = parseFloat(document.getElementById('hoursSpent').value) || 0;
  const status = document.getElementById('entryStatus').value;
  const remarks = document.getElementById('entryRemarks').value.trim();

  // Validate
  if (!projectName) { showFormError('Project Name is required.'); return; }
  if (!taskName) { showFormError('Task Name is required.'); return; }
  if (hoursAssigned <= 0) { showFormError('Hours Assigned must be greater than 0.'); return; }

  try {
    let res, data;

    if (currentEditId) {
      // UPDATE
      res = await fetch(`${API_BASE}/entries/${currentEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, hours_spent: hoursSpent, status, remarks })
      });
    } else {
      // CREATE
      res = await fetch(`${API_BASE}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, date, project_name: projectName, task_name: taskName, description, hours_assigned: hoursAssigned, hours_spent: hoursSpent, status, remarks })
      });
    }

    data = await res.json();

    if (!data.success) {
      showFormError(data.message || 'Failed to save entry.');
      return;
    }

    showFormSuccess(currentEditId ? 'Entry updated successfully!' : 'Entry submitted successfully!');
    resetForm();
    await loadUserEntries();

  } catch (err) {
    showFormError('Server error. Please try again.');
    console.error(err);
  }
}

// ============================
// LOAD USER ENTRIES
// ============================
async function loadUserEntries() {
  const tbody = document.getElementById('userEntriesBody');
  tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Loading...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/entries/user/${currentUser.id}`);
    const data = await res.json();

    if (!data.success || !data.entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="table-empty">No entries found in the last 5 days.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.entries.forEach((entry, idx) => {
      const row = createUserEntryRow(entry, idx + 1);
      tbody.appendChild(row);
    });

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Failed to load entries.</td></tr>';
    console.error(err);
  }
}

function createUserEntryRow(entry, num) {
  const tr = document.createElement('tr');
  const hoursClass = parseFloat(entry.hours_spent) === 0 ? 'hours-chip--zero' : '';

  tr.innerHTML = `
    <td>${num}</td>
    <td>${formatDate(entry.date)}</td>
    <td><strong>${escHtml(entry.project_name)}</strong></td>
    <td>${escHtml(entry.task_name)}</td>
    <td class="text-truncate" title="${escHtml(entry.description || '')}">${escHtml(entry.description || '—')}</td>
    <td><span class="hours-chip">${entry.hours_assigned}h</span></td>
    <td><span class="hours-chip ${hoursClass}">${entry.hours_spent}h</span></td>
    <td>${statusBadge(entry.status)}</td>
    <td class="text-truncate" title="${escHtml(entry.remarks || '')}">${escHtml(entry.remarks || '—')}</td>
    <td>
      <div class="action-btns">
        <button class="btn btn--icon btn--icon-edit" title="Edit" onclick="startEdit(${entry.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn--icon btn--icon-delete" title="Delete" onclick="openDeleteModal(${entry.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </td>
  `;
  return tr;
}

// ============================
// EDIT ENTRY
// ============================
async function startEdit(entryId) {
  // Fetch current entries list
  try {
    const res = await fetch(`${API_BASE}/entries/user/${currentUser.id}`);
    const data = await res.json();
    const entry = data.entries.find(e => e.id === entryId);

    if (!entry) {
      alert('Entry not found or no longer editable (past 5 days).');
      return;
    }

    // Populate form
    document.getElementById('projectName').value = entry.project_name;
    document.getElementById('taskName').value = entry.task_name;
    document.getElementById('taskDescription').value = entry.description || '';
    document.getElementById('hoursAssigned').value = entry.hours_assigned;
    document.getElementById('hoursSpent').value = entry.hours_spent;
    document.getElementById('entryStatus').value = entry.status;
    document.getElementById('entryRemarks').value = entry.remarks || '';

    currentEditId = entryId;
    setFormMode('edit');

    // Scroll to form
    document.getElementById('employeePage').querySelector('.entry-card').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('Edit load error:', err);
  }
}

// ============================
// DELETE ENTRY
// ============================
function openDeleteModal(entryId) {
  deleteTargetId = entryId;
  document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('deleteModal').style.display = 'none';
}

async function confirmDelete() {
  if (!deleteTargetId) return;

  try {
    const res = await fetch(`${API_BASE}/entries/${deleteTargetId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
    });

    const data = await res.json();
    closeDeleteModal();

    if (data.success) {
      await loadUserEntries();
      showFormSuccess('Entry deleted successfully.');
    } else {
      showFormError(data.message || 'Delete failed.');
    }

  } catch (err) {
    closeDeleteModal();
    showFormError('Server error during delete.');
    console.error(err);
  }
}

// ============================
// ADMIN PAGE
// ============================
async function loadAdminEntries() {
  const tbody = document.getElementById('adminEntriesBody');
  tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Loading...</td></tr>';

  const date = document.getElementById('adminFilterDate').value;
  const employee = document.getElementById('adminFilterEmployee').value.trim();

  let url = `${API_BASE}/entries/admin`;
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (employee) params.append('employee_name', employee);
  if (params.toString()) url += '?' + params.toString();

  try {
    const res = await fetch(url);
    const data = await res.json();

    updateAdminStats(data.entries || []);

    if (!data.success || !data.entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="table-empty">No entries found.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.entries.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      const hoursClass = parseFloat(entry.hours_spent) === 0 ? 'hours-chip--zero' : '';

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${escHtml(entry.employee_name)}</strong></td>
        <td>${formatDate(entry.date)}</td>
        <td>${escHtml(entry.project_name)}</td>
        <td>${escHtml(entry.task_name)}</td>
        <td class="text-truncate" title="${escHtml(entry.description || '')}">${escHtml(entry.description || '—')}</td>
        <td><span class="hours-chip">${entry.hours_assigned}h</span></td>
        <td><span class="hours-chip ${hoursClass}">${entry.hours_spent}h</span></td>
        <td>${statusBadge(entry.status)}</td>
        <td class="text-truncate" title="${escHtml(entry.remarks || '')}">${escHtml(entry.remarks || '—')}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Failed to load entries.</td></tr>';
    console.error(err);
  }
}

function updateAdminStats(entries) {
  const completed = entries.filter(e => e.status === 'Completed').length;
  const pending = entries.filter(e => e.status === 'Pending').length;
  const uniqueEmployees = new Set(entries.map(e => e.employee_name)).size;

  document.getElementById('statTotalEntries').textContent = entries.length;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statEmployees').textContent = uniqueEmployees;
}

function clearAdminFilters() {
  document.getElementById('adminFilterDate').value = '';
  document.getElementById('adminFilterEmployee').value = '';
  loadAdminEntries();
}

// ============================
// EXPORT PDF
// ============================
function exportPDF() {
  const date = document.getElementById('adminFilterDate').value;
  const employee = document.getElementById('adminFilterEmployee').value.trim();

  let url = `${API_BASE}/export/pdf`;
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (employee) params.append('employee_name', employee);
  if (params.toString()) url += '?' + params.toString();

  // Open in new tab to trigger download
  window.open(url, '_blank');
}

// ============================
// HELPERS
// ============================
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m)-1]} ${y}`;
}

function statusBadge(status) {
  const cls = status === 'Completed' ? 'status-badge--completed' : 'status-badge--pending';
  return `<span class="status-badge ${cls}">${status}</span>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showFormError(msg) {
  const el = document.getElementById('entryFormError');
  el.textContent = msg;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showFormSuccess(msg) {
  const el = document.getElementById('entryFormSuccess');
  el.textContent = msg;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function hideFormMessages() {
  document.getElementById('entryFormError').style.display = 'none';
  document.getElementById('entryFormSuccess').style.display = 'none';
}

// Close modal when clicking overlay
document.getElementById('deleteModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeDeleteModal();
});
