const CURRENT_DATE = '2026-06-14';
const SUBJECTS = ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Information Technology'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STORE_KEY = 'studysync-class10-board-companion-v1';
const AUTH_USERS_KEY = 'studysync-local-users-v1';
const AUTH_SESSION_KEY = 'studysync-current-user-v1';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaults = {
  homework: [
    { id: uid(), subject: 'Science', title: 'Revise light reflection numericals', due: '2026-06-15', completed: false },
    { id: uid(), subject: 'Mathematics', title: 'Complete quadratic equations worksheet', due: '2026-06-16', completed: false },
    { id: uid(), subject: 'English', title: 'Write letter to editor practice answer', due: '2026-06-18', completed: true }
  ],
  periods: [
    { id: uid(), day: 'Monday', time: '8:00 AM', subject: 'Mathematics', topic: 'Quadratic equations' },
    { id: uid(), day: 'Tuesday', time: '9:00 AM', subject: 'Science', topic: 'Light and electricity' },
    { id: uid(), day: 'Wednesday', time: '5:00 PM', subject: 'Social Science', topic: 'Nationalism in India' }
  ],
  subjects: SUBJECTS.map((name, index) => ({
    name,
    total: [15, 16, 21, 11, 12, 8][index],
    completed: [8, 7, 9, 6, 5, 4][index]
  })),
  exams: [
    { id: uid(), name: 'Science Pre-board', subject: 'Science', date: '2026-07-02' },
    { id: uid(), name: 'Mathematics Mock Test', subject: 'Mathematics', date: '2026-07-09' }
  ],
  goals: [
    { id: uid(), text: 'Solve 20 maths questions without looking at solutions', completed: false, date: CURRENT_DATE },
    { id: uid(), text: 'Revise one Science diagram from memory', completed: false, date: CURRENT_DATE }
  ],
  notes: [
    { id: uid(), type: 'Formula', subject: 'Mathematics', title: 'Quadratic formula', body: 'x = (-b ± √(b² - 4ac)) / 2a' },
    { id: uid(), type: 'Important date', subject: 'Social Science', title: 'Civil Disobedience Movement', body: 'Started in 1930 with the Salt March.' }
  ],
  streak: { studiedDates: [], current: 0, longest: 0 },
  timer: { mode: 'focus', remaining: 25 * 60, sessions: 0 }
};

let state = loadState();
let timerInterval = null;
let authMode = 'login';
let currentUser = loadCurrentUser();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved) return structuredClone(defaults);
    return {
      ...structuredClone(defaults),
      ...saved,
      subjects: mergeSubjects(saved.subjects || [])
    };
  } catch {
    return structuredClone(defaults);
  }
}

function mergeSubjects(savedSubjects) {
  return SUBJECTS.map((name) => {
    const existing = savedSubjects.find((subject) => subject.name === name);
    const fallback = defaults.subjects.find((subject) => subject.name === name);
    return existing || fallback;
  });
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function loadCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user, remember) {
  currentUser = user;
  if (remember) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
  else sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  currentUser = null;
  localStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

function daysBetween(dateString) {
  const today = new Date(`${CURRENT_DATE}T00:00:00`);
  const target = new Date(`${dateString}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function formatDate(dateString) {
  if (!dateString) return 'No date';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function populateSubjectSelects() {
  ['#homeworkSubject', '#periodSubject', '#examSubject', '#noteSubject'].forEach((selector) => {
    const select = $(selector);
    if (!select) return;
    select.innerHTML = SUBJECTS.map((subject) => `<option value="${subject}">${subject}</option>`).join('');
  });

  const filter = $('#homeworkSubjectFilter');
  if (filter) {
    filter.innerHTML = '<option value="all">All subjects</option>' + SUBJECTS.map((subject) => `<option value="${subject}">${subject}</option>`).join('');
  }
}

function renderHomework() {
  const list = $('#homeworkList');
  if (!list) return;

  const subjectFilter = $('#homeworkSubjectFilter')?.value || 'all';
  const statusFilter = $('#homeworkStatusFilter')?.value || 'all';
  const search = ($('#globalSearch')?.value || '').toLowerCase();

  const filtered = state.homework
    .filter((item) => subjectFilter === 'all' || item.subject === subjectFilter)
    .filter((item) => statusFilter === 'all' || (statusFilter === 'completed' ? item.completed : !item.completed))
    .filter((item) => `${item.title} ${item.subject}`.toLowerCase().includes(search))
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  list.innerHTML = filtered.length ? filtered.map((item) => `
    <article class="list-item ${item.completed ? 'completed' : ''}">
      <div class="item-main">
        <h3>${item.title}</h3>
        <p>${item.subject} • Due ${formatDate(item.due)} • ${item.completed ? 'Completed' : 'Pending'}</p>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="toggle-homework" data-id="${item.id}">${item.completed ? 'Undo' : 'Done'}</button>
        <button class="icon-btn" data-action="edit-homework" data-id="${item.id}">Edit</button>
        <button class="icon-btn danger" data-action="delete-homework" data-id="${item.id}">Delete</button>
      </div>
    </article>
  `).join('') : '<p class="empty-state">No homework matches your filters. Add one above.</p>';
}

function renderTimetable() {
  const board = $('#timetableBoard');
  if (!board) return;

  board.innerHTML = DAYS.map((day) => {
    const periods = state.periods
      .filter((period) => period.day === day)
      .sort((a, b) => a.time.localeCompare(b.time));

    return `
      <section class="day-column">
        <h3>${day}</h3>
        ${periods.length ? periods.map((period) => `
          <div class="period-chip">
            <strong>${period.time}</strong>
            <span>${period.subject}</span>
            <span>${period.topic}</span>
            <div class="item-actions">
              <button class="icon-btn" data-action="edit-period" data-id="${period.id}">Edit</button>
              <button class="icon-btn danger" data-action="delete-period" data-id="${period.id}">Delete</button>
            </div>
          </div>
        `).join('') : '<p class="item-meta">No periods yet.</p>'}
      </section>
    `;
  }).join('');
}

function renderSubjects() {
  const grid = $('#subjectsGrid');
  if (!grid) return;

  grid.innerHTML = state.subjects.map((subject) => {
    const completed = Math.min(Number(subject.completed) || 0, Number(subject.total) || 0);
    const total = Math.max(Number(subject.total) || 0, 0);
    const remaining = Math.max(total - completed, 0);
    const percent = total ? Math.round((completed / total) * 100) : 0;

    return `
      <article class="glass-card subject-card">
        <span>${subjectIcon(subject.name)}</span>
        <h3>${subject.name}</h3>
        <p>${completed}/${total} chapters complete • ${remaining} remaining</p>
        <meter class="subject-progress" min="0" max="100" value="${percent}">${percent}%</meter>
        <p class="item-meta">${percent}% complete</p>
        <div class="subject-edit">
          <label>Total chapters<input type="number" min="0" value="${total}" data-action="subject-total" data-subject="${subject.name}" /></label>
          <label>Completed<input type="number" min="0" value="${completed}" data-action="subject-completed" data-subject="${subject.name}" /></label>
        </div>
      </article>
    `;
  }).join('');
}

function subjectIcon(subject) {
  return {
    Mathematics: '∑', Science: '⚛', 'Social Science': '⌂', English: 'Aa', Hindi: 'अ', 'Information Technology': '</>'
  }[subject] || '◈';
}

function renderExams() {
  const list = $('#examList');
  if (!list) return;

  const exams = [...state.exams].sort((a, b) => daysBetween(a.date) - daysBetween(b.date));
  list.innerHTML = exams.length ? exams.map((exam) => {
    const days = daysBetween(exam.date);
    const expired = days < 0;
    return `
      <article class="glass-card exam-card ${expired ? 'expired' : ''}">
        <div class="count-ring"><strong>${expired ? 0 : days}</strong><span>${expired ? 'done' : 'days'}</span></div>
        <h3>${exam.name}</h3>
        <p>${exam.subject} • ${formatDate(exam.date)}</p>
        <div class="item-actions">
          <button class="icon-btn" data-action="edit-exam" data-id="${exam.id}">Edit</button>
          <button class="icon-btn danger" data-action="delete-exam" data-id="${exam.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('') : '<p class="empty-state">No exams added yet. Add your board or mock exam dates.</p>';
}

function renderGoals() {
  const list = $('#goalsList');
  if (!list) return;

  const todayGoals = state.goals.filter((goal) => goal.date === CURRENT_DATE);
  list.innerHTML = todayGoals.length ? todayGoals.map((goal) => `
    <article class="list-item ${goal.completed ? 'completed' : ''}">
      <div class="item-main"><h3>${goal.text}</h3><p>${goal.completed ? 'Completed today' : 'Pending today'}</p></div>
      <div class="item-actions">
        <button class="icon-btn" data-action="toggle-goal" data-id="${goal.id}">${goal.completed ? 'Undo' : 'Done'}</button>
        <button class="icon-btn" data-action="edit-goal" data-id="${goal.id}">Edit</button>
        <button class="icon-btn danger" data-action="delete-goal" data-id="${goal.id}">Delete</button>
      </div>
    </article>
  `).join('') : '<p class="empty-state">No goals for today. Add one above.</p>';
}

function renderNotes() {
  const list = $('#notesList');
  if (!list) return;
  const search = ($('#globalSearch')?.value || '').toLowerCase();
  const notes = state.notes.filter((note) => `${note.type} ${note.subject} ${note.title} ${note.body}`.toLowerCase().includes(search));

  list.innerHTML = notes.length ? notes.map((note) => `
    <article class="list-item">
      <div class="item-main">
        <h3>${note.title}</h3>
        <p>${note.type} • ${note.subject}</p>
        <p>${note.body}</p>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="edit-note" data-id="${note.id}">Edit</button>
        <button class="icon-btn danger" data-action="delete-note" data-id="${note.id}">Delete</button>
      </div>
    </article>
  `).join('') : '<p class="empty-state">No revision notes yet. Store formulas, definitions, dates, or short notes.</p>';
}

function calculateStreak() {
  const dates = [...new Set(state.streak.studiedDates)].sort();
  let current = 0;
  let cursor = new Date(`${CURRENT_DATE}T00:00:00`);

  while (dates.includes(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longest = 0;
  let run = 0;
  let previous = null;
  dates.forEach((date) => {
    const currentDate = new Date(`${date}T00:00:00`);
    if (previous && (currentDate - previous) / 86400000 === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    previous = currentDate;
  });

  state.streak.current = current;
  state.streak.longest = Math.max(longest, state.streak.longest || 0);
}

function renderAnalytics() {
  calculateStreak();
  const totalHomework = state.homework.length;
  const completedHomework = state.homework.filter((item) => item.completed).length;
  const pendingHomework = totalHomework - completedHomework;
  const upcomingExams = state.exams.filter((exam) => daysBetween(exam.date) >= 0).length;
  const subjectPercent = averageSubjectProgress();
  const todayGoals = state.goals.filter((goal) => goal.date === CURRENT_DATE);
  const completedGoals = todayGoals.filter((goal) => goal.completed).length;
  const weeklyProgress = Math.round(((completedHomework + completedGoals) / Math.max(totalHomework + todayGoals.length, 1)) * 100);

  setText('#metricHomework', pendingHomework);
  setText('#metricStreak', state.streak.current);
  setText('#metricSubjectProgress', `${subjectPercent}%`);
  setText('#analyticsTotalHomework', totalHomework);
  setText('#analyticsCompletedHomework', completedHomework);
  setText('#analyticsPendingHomework', pendingHomework);
  setText('#analyticsUpcomingExams', upcomingExams);
  setText('#analyticsCurrentStreak', state.streak.current);
  setText('#analyticsLongestStreak', state.streak.longest);
  setText('#homeworkCountPill', `${pendingHomework} open`);
  setText('#weeklyProgressPill', `${weeklyProgress}% weekly`);
  setText('#goalProgressPill', `${todayGoals.length ? Math.round((completedGoals / todayGoals.length) * 100) : 0}% complete`);
  setText('#streakDisplay', state.streak.current);
  setText('#longestStreakPill', `Longest: ${state.streak.longest} days`);
}

function averageSubjectProgress() {
  const total = state.subjects.reduce((sum, subject) => {
    const chapters = Number(subject.total) || 0;
    const completed = Math.min(Number(subject.completed) || 0, chapters);
    return sum + (chapters ? (completed / chapters) * 100 : 0);
  }, 0);
  return Math.round(total / Math.max(state.subjects.length, 1));
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function renderTimer() {
  const minutes = Math.floor(state.timer.remaining / 60).toString().padStart(2, '0');
  const seconds = (state.timer.remaining % 60).toString().padStart(2, '0');
  setText('#timerDisplay', `${minutes}:${seconds}`);
  setText('#timerModeLabel', state.timer.mode === 'focus' ? 'Focus mode' : 'Break mode');
  setText('#sessionCounter', `${state.timer.sessions} focus session${state.timer.sessions === 1 ? '' : 's'}`);
}

function renderAll() {
  renderHomework();
  renderTimetable();
  renderSubjects();
  renderExams();
  renderGoals();
  renderNotes();
  renderTimer();
  renderAnalytics();
  saveState();
}

function handleHomeworkSubmit(event) {
  event.preventDefault();
  const id = $('#homeworkId').value;
  const payload = {
    id: id || uid(),
    subject: $('#homeworkSubject').value,
    title: $('#homeworkTitle').value.trim(),
    due: $('#homeworkDue').value,
    completed: id ? state.homework.find((item) => item.id === id)?.completed || false : false
  };
  state.homework = id ? state.homework.map((item) => item.id === id ? payload : item) : [...state.homework, payload];
  event.target.reset();
  $('#homeworkId').value = '';
  renderAll();
}

function handlePeriodSubmit(event) {
  event.preventDefault();
  const id = $('#periodId').value;
  const payload = { id: id || uid(), day: $('#periodDay').value, time: $('#periodTime').value.trim(), subject: $('#periodSubject').value, topic: $('#periodTopic').value.trim() };
  state.periods = id ? state.periods.map((item) => item.id === id ? payload : item) : [...state.periods, payload];
  event.target.reset();
  $('#periodId').value = '';
  renderAll();
}

function handleExamSubmit(event) {
  event.preventDefault();
  const id = $('#examId').value;
  const payload = { id: id || uid(), name: $('#examName').value.trim(), subject: $('#examSubject').value, date: $('#examDate').value };
  state.exams = id ? state.exams.map((item) => item.id === id ? payload : item) : [...state.exams, payload];
  event.target.reset();
  $('#examId').value = '';
  renderAll();
}

function handleGoalSubmit(event) {
  event.preventDefault();
  const id = $('#goalId').value;
  const payload = { id: id || uid(), text: $('#goalText').value.trim(), completed: id ? state.goals.find((item) => item.id === id)?.completed || false : false, date: CURRENT_DATE };
  state.goals = id ? state.goals.map((item) => item.id === id ? payload : item) : [...state.goals, payload];
  event.target.reset();
  $('#goalId').value = '';
  renderAll();
}

function handleNoteSubmit(event) {
  event.preventDefault();
  const id = $('#noteId').value;
  const payload = { id: id || uid(), type: $('#noteType').value, subject: $('#noteSubject').value, title: $('#noteTitle').value.trim(), body: $('#noteBody').value.trim() };
  state.notes = id ? state.notes.map((item) => item.id === id ? payload : item) : [...state.notes, payload];
  event.target.reset();
  $('#noteId').value = '';
  renderAll();
}

function handleActions(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, subject } = button.dataset;

  if (action === 'toggle-homework') state.homework = state.homework.map((item) => item.id === id ? { ...item, completed: !item.completed } : item);
  if (action === 'delete-homework') state.homework = state.homework.filter((item) => item.id !== id);
  if (action === 'edit-homework') fillHomeworkForm(id);

  if (action === 'delete-period') state.periods = state.periods.filter((item) => item.id !== id);
  if (action === 'edit-period') fillPeriodForm(id);

  if (action === 'delete-exam') state.exams = state.exams.filter((item) => item.id !== id);
  if (action === 'edit-exam') fillExamForm(id);

  if (action === 'toggle-goal') state.goals = state.goals.map((item) => item.id === id ? { ...item, completed: !item.completed } : item);
  if (action === 'delete-goal') state.goals = state.goals.filter((item) => item.id !== id);
  if (action === 'edit-goal') fillGoalForm(id);

  if (action === 'delete-note') state.notes = state.notes.filter((item) => item.id !== id);
  if (action === 'edit-note') fillNoteForm(id);

  if (action === 'subject-total' || action === 'subject-completed') {
    state.subjects = state.subjects.map((item) => item.name === subject ? { ...item, [action === 'subject-total' ? 'total' : 'completed']: Number(button.value) } : item);
  }

  renderAll();
}

function fillHomeworkForm(id) {
  const item = state.homework.find((homework) => homework.id === id);
  if (!item) return;
  $('#homeworkId').value = item.id;
  $('#homeworkSubject').value = item.subject;
  $('#homeworkTitle').value = item.title;
  $('#homeworkDue').value = item.due;
  $('#homeworkTitle').focus();
}

function fillPeriodForm(id) {
  const item = state.periods.find((period) => period.id === id);
  if (!item) return;
  $('#periodId').value = item.id;
  $('#periodDay').value = item.day;
  $('#periodTime').value = item.time;
  $('#periodSubject').value = item.subject;
  $('#periodTopic').value = item.topic;
  $('#periodTime').focus();
}

function fillExamForm(id) {
  const item = state.exams.find((exam) => exam.id === id);
  if (!item) return;
  $('#examId').value = item.id;
  $('#examName').value = item.name;
  $('#examSubject').value = item.subject;
  $('#examDate').value = item.date;
  $('#examName').focus();
}

function fillGoalForm(id) {
  const item = state.goals.find((goal) => goal.id === id);
  if (!item) return;
  $('#goalId').value = item.id;
  $('#goalText').value = item.text;
  $('#goalText').focus();
}

function fillNoteForm(id) {
  const item = state.notes.find((note) => note.id === id);
  if (!item) return;
  $('#noteId').value = item.id;
  $('#noteType').value = item.type;
  $('#noteSubject').value = item.subject;
  $('#noteTitle').value = item.title;
  $('#noteBody').value = item.body;
  $('#noteTitle').focus();
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    state.timer.remaining -= 1;
    if (state.timer.remaining <= 0) {
      if (state.timer.mode === 'focus') {
        state.timer.sessions += 1;
        state.timer.mode = 'break';
        state.timer.remaining = 5 * 60;
        markStudied(false);
      } else {
        state.timer.mode = 'focus';
        state.timer.remaining = 25 * 60;
      }
    }
    renderTimer();
    saveState();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  saveState();
}

function resetTimer() {
  pauseTimer();
  state.timer.mode = 'focus';
  state.timer.remaining = 25 * 60;
  renderAll();
}

function markStudied(shouldRender = true) {
  if (!state.streak.studiedDates.includes(CURRENT_DATE)) {
    state.streak.studiedDates.push(CURRENT_DATE);
  }
  calculateStreak();
  if (shouldRender) renderAll();
}

function resetStreak() {
  state.streak = { studiedDates: [], current: 0, longest: 0 };
  renderAll();
}

function setupAuth() {
  const modal = $('#authModal');
  const form = $('#authForm');
  const authName = $('#authName');
  const authEmail = $('#authEmail');
  const authPassword = $('#authPassword');
  const rememberMe = $('#rememberMe');
  const message = $('#authMessage');
  const submit = $('#authSubmit');
  const logout = $('#logoutBtn');

  function setMode(mode) {
    authMode = mode;
    modal?.classList.toggle('login-mode', mode === 'login');
    $$('.auth-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.authMode === mode));
    if (submit) submit.textContent = mode === 'login' ? 'Login' : 'Create account';
    if (authName) authName.required = mode === 'signup';
    setAuthMessage('');
  }

  function setAuthMessage(text, type = '') {
    if (!message) return;
    message.textContent = text;
    message.className = `auth-message ${type}`.trim();
  }

  function openModal() {
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    setMode(currentUser ? 'login' : authMode);
    setTimeout(() => (currentUser ? logout : authEmail)?.focus(), 50);
  }

  function closeModal() {
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    setAuthMessage('');
  }

  function updateProfile() {
    const profileName = $('#profileName');
    const profileStatus = $('#profileStatus');
    const profileAvatar = $('#profileAvatar');
    modal?.classList.toggle('logged-in', Boolean(currentUser));

    if (currentUser) {
      const displayName = currentUser.name || currentUser.email.split('@')[0];
      if (profileName) profileName.textContent = displayName;
      if (profileStatus) profileStatus.textContent = 'Logged in • remembered';
      if (profileAvatar) profileAvatar.textContent = displayName.slice(0, 2).toUpperCase();
    } else {
      if (profileName) profileName.textContent = 'Class 10';
      if (profileStatus) profileStatus.textContent = 'Sign up or log in';
      if (profileAvatar) profileAvatar.textContent = '10';
    }
  }

  $('#authTrigger')?.addEventListener('click', openModal);
  $$('[data-auth-close]').forEach((item) => item.addEventListener('click', closeModal));
  $$('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.authMode)));

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const users = getUsers();
    const email = authEmail.value.trim().toLowerCase();
    const password = authPassword.value;
    const remember = rememberMe.checked;

    if (authMode === 'signup') {
      if (users.some((user) => user.email === email)) {
        setAuthMessage('An account already exists for this email. Switch to login.', 'error');
        return;
      }

      const user = { id: uid(), name: authName.value.trim() || 'Class 10 Student', email, password };
      users.push(user);
      saveUsers(users);
      saveCurrentUser({ id: user.id, name: user.name, email: user.email }, remember);
      setAuthMessage('Account created. You are logged in on this browser.', 'success');
      form.reset();
      updateProfile();
      return;
    }

    const user = users.find((item) => item.email === email && item.password === password);
    if (!user) {
      setAuthMessage('Invalid email or password. Try again or create an account.', 'error');
      return;
    }

    saveCurrentUser({ id: user.id, name: user.name, email: user.email }, remember);
    setAuthMessage('Logged in successfully. Welcome back.', 'success');
    form.reset();
    updateProfile();
  });

  logout?.addEventListener('click', () => {
    clearCurrentUser();
    updateProfile();
    setAuthMessage('Logged out from this browser.', 'success');
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  setMode('login');
  updateProfile();
}

function setupShellInteractions() {
  const sidebar = $('#sidebar');
  const menuToggle = $('#menuToggle');
  const navLinks = $$('.nav-link');
  const sections = $$('section[id]');
  const revealBlocks = $$('.reveal');
  const glassCards = $$('.glass-card');

  function closeSidebar() {
    sidebar?.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }

  menuToggle?.addEventListener('click', () => {
    const isOpening = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', isOpening);
    document.body.classList.toggle('sidebar-open', isOpening);
    menuToggle.setAttribute('aria-expanded', String(isOpening));
  });

  navLinks.forEach((link) => link.addEventListener('click', () => closeSidebar()));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
      navLinks.forEach((link) => link.classList.remove('active'));
      activeLink?.classList.add('active');
    });
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
  sections.forEach((section) => sectionObserver.observe(section));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealBlocks.forEach((block) => revealObserver.observe(block));

  glassCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  });

  $$('[data-scroll]').forEach((button) => button.addEventListener('click', () => $(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' })));
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });
}

function bindEvents() {
  $('#homeworkForm')?.addEventListener('submit', handleHomeworkSubmit);
  $('#periodForm')?.addEventListener('submit', handlePeriodSubmit);
  $('#examForm')?.addEventListener('submit', handleExamSubmit);
  $('#goalForm')?.addEventListener('submit', handleGoalSubmit);
  $('#noteForm')?.addEventListener('submit', handleNoteSubmit);
  $('#homeworkSubjectFilter')?.addEventListener('change', renderHomework);
  $('#homeworkStatusFilter')?.addEventListener('change', renderHomework);
  $('#globalSearch')?.addEventListener('input', () => { renderHomework(); renderNotes(); });
  $('#timerStart')?.addEventListener('click', startTimer);
  $('#timerPause')?.addEventListener('click', pauseTimer);
  $('#timerReset')?.addEventListener('click', resetTimer);
  $('#markStudiedBtn')?.addEventListener('click', () => markStudied(true));
  $('#resetStreakBtn')?.addEventListener('click', resetStreak);
  document.addEventListener('click', handleActions);
  document.addEventListener('input', handleActions);
}

populateSubjectSelects();
setupAuth();
setupShellInteractions();
bindEvents();
renderAll();
