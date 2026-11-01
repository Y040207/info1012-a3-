/* ==========================================================================
   tasks.js — login gate + CRUD for study tasks
   --------------------------------------------------------------------------
   Structure of this file:
     1. Storage helpers      (read / write / seed)
     2. Authentication gate  (sign in, sign out, session restore)
     3. Validation           (pure functions returning error strings)
     4. Rendering            (table rows, status pills, summary)
     5. Event wiring         (form submit, edit, delete, search, filter)

   Design notes:
   - Tasks are kept in an array in memory and mirrored to localStorage on
     every change. The table is always re-rendered from that array ("single
     source of truth"), which avoids the classic bug of the DOM and the data
     disagreeing after a delete.
   - Rows are built with document.createElement + textContent rather than
     innerHTML, so a task called "<img src=x onerror=...>" is stored and
     displayed as text instead of being executed. This is discussed in the
     ethics reflection.
   ========================================================================== */

(function () {
  'use strict';

  /* =====================================================================
     1. Storage
     ===================================================================== */

  var STORE_KEY = 'studyflow.tasks.v1';
  var AUTH_KEY = 'studyflow.auth';

  // Credentials for this demonstration system. Documented in the README.
  var CREDENTIALS = { username: 'student', password: 'studyflow2026' };

  var tasks = [];

  function loadTasks() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORE_KEY);
    } catch (err) {
      // Private-browsing modes can throw on access; fall back to memory only.
      console.warn('localStorage unavailable:', err);
      return seedTasks();
    }

    if (!raw) {
      tasks = seedTasks();
      saveTasks();
      return tasks;
    }

    try {
      var parsed = JSON.parse(raw);
      tasks = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      // Corrupted JSON should not white-screen the page.
      console.warn('Stored task data could not be parsed:', err);
      tasks = seedTasks();
    }
    return tasks;
  }

  function saveTasks() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn('Could not save tasks:', err);
    }
  }

  // A few starter rows so the table is never empty on first run.
  function seedTasks() {
    return [
      {
        id: 'seed-1',
        title: 'Complete Assignment 3',
        courseCode: 'INFO1012',
        courseName: 'Information Technology Systems',
        dueDate: offsetDate(3),
        description: 'Finish the portfolio site: home, task manager, blog, ethics page.',
        notes: 'Submit the ZIP of the GitHub repo through Canvas.'
      },
      {
        id: 'seed-2',
        title: 'Revise Week 6 Studio',
        courseCode: 'COMP1101',
        courseName: 'Programming Fundamentals',
        dueDate: offsetDate(6),
        description: 'Re-do the array exercises from the week 6 studio sheet.',
        notes: 'Focus on map/filter — still slow at these.'
      },
      {
        id: 'seed-3',
        title: 'Quiz 2 preparation',
        courseCode: 'MATH1011',
        courseName: 'Mathematics for IT',
        dueDate: offsetDate(1),
        description: 'Work through the practice quiz and review matrices.',
        notes: ''
      }
    ];
  }

  /* =====================================================================
     Date helpers
     ---------------------------------------------------------------------
     All comparisons use local calendar dates expressed as "YYYY-MM-DD"
     strings. Comparing those strings lexicographically avoids the timezone
     trap described in the troubleshooting blog (new Date('2026-11-15') is
     parsed as UTC midnight, which is a different calendar day for users in
     negative UTC offsets).
     ===================================================================== */

  function isoLocal(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function todayIso() {
    return isoLocal(new Date());
  }

  function offsetDate(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return isoLocal(d);
  }

  function daysUntil(isoDate) {
    var a = new Date(isoDate + 'T00:00:00');
    var b = new Date(todayIso() + 'T00:00:00');
    return Math.round((a - b) / 86400000);
  }

  function formatDate(isoDate) {
    var d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function statusOf(task) {
    var diff = daysUntil(task.dueDate);
    if (diff < 0) return 'overdue';
    if (diff <= 2) return 'soon';
    return 'upcoming';
  }

  /* =====================================================================
     2. Authentication gate
     ===================================================================== */

  var gate = document.getElementById('gate');
  var app = document.getElementById('app');
  var loginForm = document.getElementById('login-form');
  var gateError = document.getElementById('gate-error');

  function signIn(username, password) {
    if (username.trim() === CREDENTIALS.username && password === CREDENTIALS.password) {
      try { window.sessionStorage.setItem(AUTH_KEY, '1'); } catch (err) { /* ignore */ }
      return true;
    }
    return false;
  }

  function isSignedIn() {
    try { return window.sessionStorage.getItem(AUTH_KEY) === '1'; }
    catch (err) { return false; }
  }

  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    document.getElementById('task-summary').textContent = '';
    render();
    document.getElementById('search').value = '';
    document.getElementById('filter').value = 'all';
  }

  function showGate() {
    app.hidden = true;
    gate.hidden = false;
    document.getElementById('password').value = '';
    document.getElementById('username').focus();
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var username = document.getElementById('username');
    var password = document.getElementById('password');
    var usernameError = document.getElementById('username-error');
    var passwordError = document.getElementById('password-error');

    usernameError.textContent = '';
    passwordError.textContent = '';
    username.removeAttribute('aria-invalid');
    password.removeAttribute('aria-invalid');
    gateError.hidden = true;

    var ok = true;
    if (username.value.trim() === '') {
      usernameError.textContent = 'Enter your username.';
      username.setAttribute('aria-invalid', 'true');
      ok = false;
    }
    if (password.value === '') {
      passwordError.textContent = 'Enter your password.';
      password.setAttribute('aria-invalid', 'true');
      ok = false;
    }
    if (!ok) return;

    if (signIn(username.value, password.value)) {
      showApp();
    } else {
      gateError.textContent = 'Username or password is incorrect. Please try again.';
      gateError.hidden = false;
      password.value = '';
      password.focus();
    }
  });

  document.getElementById('logout').addEventListener('click', function () {
    try { window.sessionStorage.removeItem(AUTH_KEY); } catch (err) { /* ignore */ }
    showGate();
  });

  /* =====================================================================
     3. Validation
     ---------------------------------------------------------------------
     Each validator returns an error string, or '' when the value is valid.
     Keeping them separate from the DOM makes the rules easy to read and easy
     to test by hand in the console.
     ===================================================================== */

  var CODE_PATTERN = /^[A-Za-z]{2,6}\s?\d{3,5}$/;   // e.g. INFO1012, COMP 1101

  function validateTitle(value) {
    if (value.trim() === '') return 'A task title is required.';
    if (value.trim().length < 3) return 'Use at least 3 characters.';
    return '';
  }

  function validateCourseCode(value) {
    var v = value.trim();
    if (v === '') return 'A course code is required.';
    if (!CODE_PATTERN.test(v)) return 'Use a format such as INFO1012.';
    return '';
  }

  function validateCourseName(value) {
    if (value.trim() === '') return 'A course name is required.';
    return '';
  }

  function validateDueDate(value) {
    if (value === '') return 'A due date is required.';

    // Guard against impossible dates typed into a non-supporting browser.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a date in the form YYYY-MM-DD.';
    var parsed = new Date(value + 'T00:00:00');
    if (isNaN(parsed.getTime())) return 'That is not a real date.';

    if (value < todayIso()) return 'The due date cannot be in the past.';
    return '';
  }

  function validateDescription(value) {
    if (value.trim() === '') return 'A short description is required.';
    return '';
  }

  /* =====================================================================
     4. Rendering
     ===================================================================== */

  var form = document.getElementById('task-form');
  var tbody = document.getElementById('task-body');
  var emptyState = document.getElementById('empty-state');
  var summary = document.getElementById('task-summary');

  function currentView() {
    var term = document.getElementById('search').value.trim().toLowerCase();
    var filter = document.getElementById('filter').value;

    return tasks
      .filter(function (task) {
        if (filter !== 'all' && statusOf(task) !== filter) return false;
        if (!term) return true;
        var haystack = (task.title + ' ' + task.courseCode + ' ' + task.courseName).toLowerCase();
        return haystack.indexOf(term) !== -1;
      })
      .sort(function (a, b) {
        return a.dueDate.localeCompare(b.dueDate);
      });
  }

  function buildRow(task) {
    var tr = document.createElement('tr');

    // --- Task (title + description + notes) ---
    var tdTask = document.createElement('td');

    var title = document.createElement('div');
    title.className = 'cell-title';
    title.textContent = task.title;          // textContent, never innerHTML
    tdTask.appendChild(title);

    var desc = document.createElement('div');
    desc.className = 'cell-note';
    desc.textContent = task.description;
    tdTask.appendChild(desc);

    if (task.notes) {
      var notes = document.createElement('div');
      notes.className = 'cell-note';
      notes.style.fontStyle = 'italic';
      notes.textContent = 'Note: ' + task.notes;
      tdTask.appendChild(notes);
    }

    // --- Course ---
    var tdCourse = document.createElement('td');
    var code = document.createElement('div');
    code.style.fontWeight = '600';
    code.textContent = task.courseCode;
    var name = document.createElement('div');
    name.className = 'cell-note';
    name.textContent = task.courseName;
    tdCourse.appendChild(code);
    tdCourse.appendChild(name);

    // --- Due date ---
    var tdDue = document.createElement('td');
    tdDue.textContent = formatDate(task.dueDate);

    // --- Status ---
    var tdStatus = document.createElement('td');
    var status = statusOf(task);
    var pill = document.createElement('span');
    pill.className = 'pill ' + (
      status === 'overdue' ? 'pill-overdue' :
      status === 'soon'    ? 'pill-soon'    : 'pill-ok'
    );
    var diff = daysUntil(task.dueDate);
    pill.textContent =
      status === 'overdue' ? 'Overdue by ' + Math.abs(diff) + ' day' + (Math.abs(diff) === 1 ? '' : 's') :
      diff === 0           ? 'Due today' :
      diff === 1           ? 'Due tomorrow' :
      'In ' + diff + ' days';
    tdStatus.appendChild(pill);

    // --- Actions ---
    var tdActions = document.createElement('td');
    var wrapActions = document.createElement('div');
    wrapActions.className = 'row-actions';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-ghost btn-sm';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', function () { startEdit(task.id); });

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-ghost btn-sm';
    deleteBtn.style.color = 'var(--danger)';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () { requestDelete(task.id); });

    wrapActions.appendChild(editBtn);
    wrapActions.appendChild(deleteBtn);
    tdActions.appendChild(wrapActions);

    [tdTask, tdCourse, tdDue, tdStatus, tdActions].forEach(function (cell) {
      tr.appendChild(cell);
    });

    return tr;
  }

  function render() {
    var rows = currentView();

    tbody.textContent = '';                  // clear previous rows
    rows.forEach(function (task) { tbody.appendChild(buildRow(task)); });

    emptyState.hidden = rows.length !== 0;

    // Summary line: total, overdue, due soon.
    var overdue = tasks.filter(function (t) { return statusOf(t) === 'overdue'; }).length;
    var soon = tasks.filter(function (t) { return statusOf(t) === 'soon'; }).length;
    summary.textContent = tasks.length + ' task' + (tasks.length === 1 ? '' : 's') +
      ' · ' + overdue + ' overdue · ' + soon + ' due within 2 days';
  }

  /* =====================================================================
     5. Event wiring
     ===================================================================== */

  var FIELDS = [
    { id: 'title',       errorId: 'title-error',       validate: validateTitle },
    { id: 'course-code', errorId: 'course-code-error', validate: validateCourseCode },
    { id: 'course-name', errorId: 'course-name-error', validate: validateCourseName },
    { id: 'due-date',    errorId: 'due-date-error',    validate: validateDueDate },
    { id: 'description', errorId: 'description-error', validate: validateDescription }
  ];

  function setFieldError(field, message) {
    var input = document.getElementById(field.id);
    var slot = document.getElementById(field.errorId);
    slot.textContent = message;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
    return message === '';
  }

  function validateForm() {
    var firstInvalid = null;
    FIELDS.forEach(function (field) {
      var input = document.getElementById(field.id);
      var ok = setFieldError(field, field.validate(input.value));
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) firstInvalid.focus();
    return firstInvalid === null;
  }

  // Live re-validation: once a field has been flagged, fix it as the user types.
  FIELDS.forEach(function (field) {
    var input = document.getElementById(field.id);
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') {
        setFieldError(field, field.validate(input.value));
      }
    });
  });

  function resetForm() {
    form.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('form-title').textContent = 'Add a study task';
    document.getElementById('submit-btn').textContent = 'Add task';
    FIELDS.forEach(function (field) { setFieldError(field, ''); });
  }

  function readForm() {
    return {
      title: document.getElementById('title').value.trim(),
      courseCode: document.getElementById('course-code').value.trim().toUpperCase(),
      courseName: document.getElementById('course-name').value.trim(),
      dueDate: document.getElementById('due-date').value,
      description: document.getElementById('description').value.trim(),
      notes: document.getElementById('notes').value.trim()
    };
  }

  function showFormStatus(message, kind) {
    var box = document.getElementById('form-status');
    box.textContent = message;
    box.className = 'alert alert-' + (kind || 'ok');
    box.hidden = false;
    window.setTimeout(function () { box.hidden = true; }, 4000);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!validateForm()) {
      showFormStatus('Please correct the highlighted fields.', 'danger');
      return;
    }

    var data = readForm();
    var id = document.getElementById('task-id').value;

    if (id) {
      // Update existing
      var target = tasks.find(function (t) { return t.id === id; });
      if (target) {
        Object.assign(target, data);
        saveTasks();
        render();
        showFormStatus('Task updated.', 'ok');
      }
    } else {
      // Create new
      data.id = 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      tasks.push(data);
      saveTasks();
      render();
      showFormStatus('Task added.', 'ok');
    }

    resetForm();
  });

  document.getElementById('reset-btn').addEventListener('click', resetForm);

  function startEdit(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    document.getElementById('task-id').value = task.id;
    document.getElementById('title').value = task.title;
    document.getElementById('course-code').value = task.courseCode;
    document.getElementById('course-name').value = task.courseName;
    document.getElementById('due-date').value = task.dueDate;
    document.getElementById('description').value = task.description;
    document.getElementById('notes').value = task.notes || '';

    document.getElementById('form-title').textContent = 'Edit study task';
    document.getElementById('submit-btn').textContent = 'Save changes';

    FIELDS.forEach(function (field) { setFieldError(field, ''); });
    document.getElementById('title').focus();
    document.getElementById('task-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  var dialog = document.getElementById('confirm-dialog');
  var pendingDeleteId = null;

  function requestDelete(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    pendingDeleteId = id;
    document.getElementById('confirm-text').textContent =
      '"' + task.title + '" (' + task.courseCode + ') will be removed permanently.';

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else if (window.confirm('Delete "' + task.title + '"?')) {
      deleteTask(id);          // fallback for browsers without <dialog>
    }
  }

  dialog.addEventListener('close', function () {
    if (dialog.returnValue === 'confirm' && pendingDeleteId) {
      deleteTask(pendingDeleteId);
    }
    pendingDeleteId = null;
  });

  function deleteTask(id) {
    tasks = tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    render();
    showFormStatus('Task deleted.', 'ok');
    // If the deleted task was being edited, clear the form.
    if (document.getElementById('task-id').value === id) resetForm();
  }

  document.getElementById('search').addEventListener('input', render);
  document.getElementById('filter').addEventListener('change', render);

  /* =====================================================================
     Start-up
     ===================================================================== */

  loadTasks();

  // Default the date picker to today, and block impossible input at the
  // browser level as a second line of defence behind the JS checks.
  var dueInput = document.getElementById('due-date');
  dueInput.min = todayIso();

  if (isSignedIn()) {
    showApp();
  } else {
    showGate();
  }
})();
