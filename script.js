// ============================================================
// ExamMark Pro – Examination Results System
// Complete, teacher-ready implementation
// ============================================================

const STORAGE_KEYS = {
  exams: "exammark_exams",
  results: "exammark_results",
  settings: "exammark_settings"
};

// ---------- State ----------
let exams = [];
let results = [];
let settings = {
  defaultPassMark: 75,
  gradeScale: [
    { min: 90, label: "Excellent", color: "#10b981" },
    { min: 85, label: "Very Good", color: "#34d399" },
    { min: 80, label: "Good", color: "#60a5fa" },
    { min: 75, label: "Passed", color: "#93c5fd" },
    { min: 0,  label: "Failed", color: "#f87171" }
  ]
};

let editingResultId = null;
let distChart = null;
let gradeChart = null;

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupNavigation();
  setupEventListeners();
  applyTheme();
  renderAll();
  showToast("Welcome to ExamMark Pro!", "success");
});

function loadData() {
  try {
    exams = JSON.parse(localStorage.getItem(STORAGE_KEYS.exams)) || [];
    results = JSON.parse(localStorage.getItem(STORAGE_KEYS.results)) || [];
    const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings));
    if (savedSettings) settings = { ...settings, ...savedSettings };
  } catch (e) {
    console.error("Failed to load data", e);
  }

  // Create a default exam if none exist
  if (exams.length === 0) {
    exams.push({
      id: uid(),
      name: "Sample Midterm Examination",
      subject: "General",
      date: new Date().toISOString().split("T")[0],
      passMark: settings.defaultPassMark
    });
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.exams, JSON.stringify(exams));
  localStorage.setItem(STORAGE_KEYS.results, JSON.stringify(results));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      showSection(section);
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // close mobile sidebar
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    examinations: "Examinations",
    results: "Student Results",
    statistics: "Statistics",
    compare: "Compare Exams",
    settings: "Settings"
  };
  document.getElementById("pageTitle").textContent = titles[id] || id;

  // refresh relevant parts
  if (id === "dashboard") updateDashboard();
  if (id === "statistics") updateStatistics();
  if (id === "compare") populateCompareSelectors();
  if (id === "settings") renderGradeScaleEditor();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // Exam form
  document.getElementById("examForm").addEventListener("submit", e => {
    e.preventDefault();
    createExam();
  });

  // Result form
  document.getElementById("resultForm").addEventListener("submit", e => {
    e.preventDefault();
    saveResult();
  });

  document.getElementById("cancelEditBtn").addEventListener("click", cancelEdit);

  // Filters
  ["searchInput", "sectionFilter", "sortBy"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", displayResults);
    if (el && el.tagName === "SELECT") el.addEventListener("change", displayResults);
  });

  // Exam selectors
  document.getElementById("examSelector").addEventListener("change", () => {
    displayResults();
    updateActiveExamBadge();
  });
  document.getElementById("statsExamSelector").addEventListener("change", updateStatistics);

  // Buttons
  document.getElementById("exportCsvBtn").addEventListener("click", exportCSV);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("clearExamResultsBtn").addEventListener("click", clearCurrentExamResults);
  document.getElementById("runCompareBtn").addEventListener("click", runComparison);
  document.getElementById("saveGradesBtn").addEventListener("click", saveGradeScale);
  document.getElementById("savePassMarkBtn").addEventListener("click", saveDefaultPassMark);
  document.getElementById("resetAllBtn").addEventListener("click", resetSystem);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // Keyboard
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && editingResultId) cancelEdit();
  });
}

// ============================================================
// TOAST
// ============================================================

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ============================================================
// THEME
// ============================================================

function applyTheme() {
  const theme = localStorage.getItem("exammark_theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeButton(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("exammark_theme", next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  document.getElementById("themeIcon").textContent = theme === "dark" ? "☀️" : "🌙";
  document.getElementById("themeText").textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

// ============================================================
// EXAMS
// ============================================================

function createExam() {
  const name = document.getElementById("examName").value.trim();
  const date = document.getElementById("examDate").value;
  const subject = document.getElementById("examSubject").value.trim() || "General";
  const passMark = Number(document.getElementById("examPassMark").value) || settings.defaultPassMark;

  if (!name || !date) {
    showToast("Please fill in name and date.", "error");
    return;
  }

  exams.push({
    id: uid(),
    name,
    subject,
    date,
    passMark
  });

  saveData();
  document.getElementById("examForm").reset();
  document.getElementById("examPassMark").value = settings.defaultPassMark;
  renderAll();
  showToast(`Examination "${name}" created.`, "success");
}

function deleteExam(id) {
  const exam = exams.find(e => e.id === id);
  if (!exam) return;

  if (!confirm(`Delete "${exam.name}" and all its results?`)) return;

  exams = exams.filter(e => e.id !== id);
  results = results.filter(r => r.examId !== id);
  saveData();
  renderAll();
  showToast("Examination deleted.", "success");
}

function renameExam(id) {
  const exam = exams.find(e => e.id === id);
  if (!exam) return;
  const newName = prompt("New examination name:", exam.name);
  if (newName === null) return;
  if (!newName.trim()) {
    showToast("Name cannot be empty.", "error");
    return;
  }
  exam.name = newName.trim();
  saveData();
  renderAll();
  showToast("Examination renamed.", "success");
}

function displayExams() {
  const tbody = document.getElementById("examTableBody");
  tbody.innerHTML = "";

  if (exams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No examinations yet</td></tr>`;
    return;
  }

  // newest first
  const sorted = [...exams].sort((a, b) => b.date.localeCompare(a.date));

  sorted.forEach(exam => {
    const count = results.filter(r => r.examId === exam.id).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${esc(exam.name)}</strong></td>
      <td>${esc(exam.subject || "—")}</td>
      <td>${exam.date}</td>
      <td>${exam.passMark}%</td>
      <td>${count}</td>
      <td>
        <button class="btn btn-sm secondary" onclick="renameExam('${exam.id}')">Rename</button>
        <button class="btn btn-sm danger" onclick="deleteExam('${exam.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("examCount").textContent = `${exams.length} exam${exams.length !== 1 ? "s" : ""}`;
}

function populateExamSelectors() {
  const selectors = ["examSelector", "statsExamSelector", "compareA", "compareB"];
  selectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = "";

    if (exams.length === 0) {
      sel.innerHTML = `<option value="">No examinations</option>`;
      return;
    }

    exams.forEach(exam => {
      const opt = document.createElement("option");
      opt.value = exam.id;
      opt.textContent = `${exam.name} (${exam.date})`;
      sel.appendChild(opt);
    });

    if (current && exams.some(e => e.id === current)) {
      sel.value = current;
    }
  });
}

// ============================================================
// RESULTS
// ============================================================

function saveResult() {
  const examId = document.getElementById("examSelector").value;
  if (!examId) {
    showToast("Please select an examination first.", "error");
    return;
  }

  const studentId = document.getElementById("studentId").value.trim();
  const name = document.getElementById("studentName").value.trim();
  const section = document.getElementById("studentSection").value.trim();
  const score = Number(document.getElementById("studentScore").value);

  if (!studentId || !name || !section) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  if (isNaN(score) || score < 0 || score > 100) {
    showToast("Score must be between 0 and 100.", "error");
    return;
  }

  // Duplicate check
  const duplicate = results.some(r =>
    r.examId === examId &&
    r.studentId.toLowerCase() === studentId.toLowerCase() &&
    r.id !== editingResultId
  );
  if (duplicate) {
    showToast("This Student ID already has a result in this exam.", "error");
    return;
  }

  if (editingResultId) {
    const r = results.find(x => x.id === editingResultId);
    if (r) {
      r.studentId = studentId;
      r.name = name;
      r.section = section;
      r.score = score;
    }
    editingResultId = null;
    document.getElementById("submitResultBtn").textContent = "Add Result";
    document.getElementById("cancelEditBtn").hidden = true;
    document.getElementById("formTitle").textContent = "Add Student Result";
    showToast("Result updated.", "success");
  } else {
    results.push({
      id: uid(),
      examId,
      studentId,
      name,
      section,
      score
    });
    showToast("Result added.", "success");
  }

  saveData();
  document.getElementById("resultForm").reset();
  displayResults();
  updateDashboard();
  updateStatistics();
}

function editResult(id) {
  const r = results.find(x => x.id === id);
  if (!r) return;

  document.getElementById("examSelector").value = r.examId;
  document.getElementById("studentId").value = r.studentId;
  document.getElementById("studentName").value = r.name;
  document.getElementById("studentSection").value = r.section;
  document.getElementById("studentScore").value = r.score;

  editingResultId = id;
  document.getElementById("submitResultBtn").textContent = "Update Result";
  document.getElementById("cancelEditBtn").hidden = false;
  document.getElementById("formTitle").textContent = "Edit Student Result";

  // scroll to form
  document.getElementById("resultForm").scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
  editingResultId = null;
  document.getElementById("resultForm").reset();
  document.getElementById("submitResultBtn").textContent = "Add Result";
  document.getElementById("cancelEditBtn").hidden = true;
  document.getElementById("formTitle").textContent = "Add Student Result";
}

function deleteResult(id) {
  const r = results.find(x => x.id === id);
  if (!r) return;
  if (!confirm(`Delete result of ${r.name}?`)) return;

  results = results.filter(x => x.id !== id);
  saveData();
  displayResults();
  updateDashboard();
  updateStatistics();
  showToast("Result deleted.", "success");
}

function displayResults() {
  const tbody = document.getElementById("resultsTableBody");
  tbody.innerHTML = "";

  const examId = document.getElementById("examSelector").value;
  if (!examId) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Select an examination</td></tr>`;
    return;
  }

  let list = results.filter(r => r.examId === examId);

  // Search
  const search = document.getElementById("searchInput").value.toLowerCase().trim();
  if (search) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(search) ||
      r.studentId.toLowerCase().includes(search)
    );
  }

  // Section filter
  const section = document.getElementById("sectionFilter").value;
  if (section) {
    list = list.filter(r => r.section === section);
  }

  // Ranking (competition ranking with ties)
  const ranked = [...list].sort((a, b) => b.score - a.score);
  const rankMap = {};
  let currentRank = 1;
  ranked.forEach((r, i) => {
    if (i > 0 && ranked[i - 1].score === r.score) {
      rankMap[r.id] = rankMap[ranked[i - 1].id]; // same rank
    } else {
      rankMap[r.id] = currentRank;
    }
    currentRank = i + 2; // next possible rank
  });

  // Sort display
  const sortBy = document.getElementById("sortBy").value;
  if (sortBy === "rank" || sortBy === "score-desc") {
    list.sort((a, b) => b.score - a.score);
  } else if (sortBy === "score-asc") {
    list.sort((a, b) => a.score - b.score);
  } else if (sortBy === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "id") {
    list.sort((a, b) => a.studentId.localeCompare(b.studentId));
  }

  const exam = exams.find(e => e.id === examId);
  const passMark = exam ? exam.passMark : settings.defaultPassMark;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">No results found</td></tr>`;
  } else {
    list.forEach(r => {
      const rank = rankMap[r.id];
      const grade = getGrade(r.score);
      const passed = r.score >= passMark;
      const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="rank-badge ${rankClass}">${rank}</span></td>
        <td>${esc(r.studentId)}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.section)}</td>
        <td><strong>${r.score}</strong></td>
        <td><span class="grade-badge" style="background:${grade.color}22;color:${grade.color}">${grade.label}</span></td>
        <td><span class="status-badge ${passed ? "status-passed" : "status-failed"}">${passed ? "Passed" : "Failed"}</span></td>
        <td>
          <button class="btn btn-sm secondary" onclick="editResult('${r.id}')">Edit</button>
          <button class="btn btn-sm danger" onclick="deleteResult('${r.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  updateSectionFilter(examId);
  updateActiveExamBadge();
}

function updateSectionFilter(examId) {
  const filter = document.getElementById("sectionFilter");
  const current = filter.value;
  const sections = [...new Set(
    results.filter(r => r.examId === examId).map(r => r.section)
  )].sort();

  filter.innerHTML = `<option value="">All Sections</option>`;
  sections.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    filter.appendChild(opt);
  });
  if (sections.includes(current)) filter.value = current;
}

function updateActiveExamBadge() {
  const examId = document.getElementById("examSelector").value;
  const exam = exams.find(e => e.id === examId);
  const badge = document.getElementById("activeExamBadge");
  if (exam) {
    badge.textContent = exam.name;
  } else {
    badge.textContent = "No exam selected";
  }
}

function clearCurrentExamResults() {
  const examId = document.getElementById("examSelector").value;
  if (!examId) return;
  const exam = exams.find(e => e.id === examId);
  if (!confirm(`Clear ALL results for "${exam?.name}"?`)) return;

  results = results.filter(r => r.examId !== examId);
  saveData();
  displayResults();
  updateDashboard();
  updateStatistics();
  showToast("Results cleared for this exam.", "success");
}

// ============================================================
// GRADES & STATS HELPERS
// ============================================================

function getGrade(score) {
  for (const g of settings.gradeScale) {
    if (score >= g.min) return g;
  }
  return settings.gradeScale[settings.gradeScale.length - 1];
}

function calcStats(scores) {
  if (!scores.length) {
    return { count: 0, avg: null, median: null, std: null, high: null, low: null };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = sum / scores.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  const variance = scores.reduce((acc, s) => acc + Math.pow(s - avg, 2), 0) / scores.length;
  const std = Math.sqrt(variance);

  return {
    count: scores.length,
    avg,
    median,
    std,
    high: Math.max(...scores),
    low: Math.min(...scores)
  };
}

// ============================================================
// DASHBOARD
// ============================================================

function updateDashboard() {
  document.getElementById("dashExams").textContent = exams.length;
  document.getElementById("dashStudents").textContent = results.length;

  if (results.length === 0) {
    document.getElementById("dashAverage").textContent = "—";
    document.getElementById("dashPassRate").textContent = "—";
  } else {
    const scores = results.map(r => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    document.getElementById("dashAverage").textContent = avg.toFixed(1);

    // overall pass rate using each exam's own pass mark
    let passed = 0;
    results.forEach(r => {
      const exam = exams.find(e => e.id === r.examId);
      const pm = exam ? exam.passMark : settings.defaultPassMark;
      if (r.score >= pm) passed++;
    });
    document.getElementById("dashPassRate").textContent =
      ((passed / results.length) * 100).toFixed(1) + "%";
  }

  // Recent exams
  const recent = [...exams].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const list = document.getElementById("recentExamsList");
  if (recent.length === 0) {
    list.innerHTML = `<p class="list-empty">No examinations yet</p>`;
  } else {
    list.innerHTML = recent.map(e => {
      const count = results.filter(r => r.examId === e.id).length;
      return `<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
        <span><strong>${esc(e.name)}</strong> <small style="color:var(--text-muted)">${e.date}</small></span>
        <span>${count} result${count !== 1 ? "s" : ""}</span>
      </div>`;
    }).join("");
  }

  // Quick stats for currently selected exam
  const examId = document.getElementById("examSelector")?.value;
  const qs = document.getElementById("quickStats");
  if (!examId) {
    qs.innerHTML = `<p>Select an examination in Student Results to see details</p>`;
    return;
  }
  const examResults = results.filter(r => r.examId === examId);
  const exam = exams.find(e => e.id === examId);
  if (examResults.length === 0) {
    qs.innerHTML = `<p>No results yet for this exam</p>`;
    return;
  }
  const scores = examResults.map(r => r.score);
  const stats = calcStats(scores);
  const pm = exam.passMark;
  const passed = examResults.filter(r => r.score >= pm).length;
  qs.innerHTML = `
    <p><strong>${esc(exam.name)}</strong></p>
    <p>Students: ${stats.count}</p>
    <p>Average: ${stats.avg.toFixed(2)}</p>
    <p>Highest: ${stats.high} &nbsp;|&nbsp; Lowest: ${stats.low}</p>
    <p>Pass Rate: ${((passed / stats.count) * 100).toFixed(1)}% (${passed}/${stats.count})</p>
  `;
}

// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {
  const examId = document.getElementById("statsExamSelector").value;
  const examResults = results.filter(r => r.examId === examId);
  const exam = exams.find(e => e.id === examId);
  const passMark = exam ? exam.passMark : settings.defaultPassMark;

  if (examResults.length === 0) {
    ["statCount", "statAvg", "statMedian", "statStd", "statHigh", "statLow", "statPassed", "statFailed", "statPassRate"]
      .forEach(id => document.getElementById(id).textContent = id.includes("Count") || id.includes("Passed") || id.includes("Failed") ? "0" : "—");
    updateCharts([]);
    document.getElementById("sectionPerformance").innerHTML = `<p class="list-empty">No data</p>`;
    return;
  }

  const scores = examResults.map(r => r.score);
  const stats = calcStats(scores);
  const passed = examResults.filter(r => r.score >= passMark).length;
  const failed = stats.count - passed;

  document.getElementById("statCount").textContent = stats.count;
  document.getElementById("statAvg").textContent = stats.avg.toFixed(2);
  document.getElementById("statMedian").textContent = stats.median.toFixed(2);
  document.getElementById("statStd").textContent = stats.std.toFixed(2);
  document.getElementById("statHigh").textContent = stats.high;
  document.getElementById("statLow").textContent = stats.low;
  document.getElementById("statPassed").textContent = passed;
  document.getElementById("statFailed").textContent = failed;
  document.getElementById("statPassRate").textContent = ((passed / stats.count) * 100).toFixed(1) + "%";

  updateCharts(scores);
  updateSectionPerformance(examResults, passMark);
}

function updateCharts(scores) {
  // Distribution
  const ranges = [
    { label: "90–100", min: 90, max: 100 },
    { label: "80–89", min: 80, max: 89 },
    { label: "75–79", min: 75, max: 79 },
    { label: "60–74", min: 60, max: 74 },
    { label: "0–59", min: 0, max: 59 }
  ];
  const distData = ranges.map(r => scores.filter(s => s >= r.min && s <= r.max).length);

  if (distChart) distChart.destroy();
  const ctx1 = document.getElementById("distChart").getContext("2d");
  distChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: ranges.map(r => r.label),
      datasets: [{
        label: "Students",
        data: distData,
        backgroundColor: ["#10b981", "#34d399", "#60a5fa", "#fbbf24", "#f87171"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });

  // Grade pie
  const gradeCounts = {};
  settings.gradeScale.forEach(g => gradeCounts[g.label] = 0);
  scores.forEach(s => {
    const g = getGrade(s);
    gradeCounts[g.label]++;
  });

  if (gradeChart) gradeChart.destroy();
  const ctx2 = document.getElementById("gradeChart").getContext("2d");
  gradeChart = new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: Object.keys(gradeCounts),
      datasets: [{
        data: Object.values(gradeCounts),
        backgroundColor: settings.gradeScale.map(g => g.color),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

function updateSectionPerformance(examResults, passMark) {
  const sections = {};
  examResults.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r.score);
  });

  const container = document.getElementById("sectionPerformance");
  if (Object.keys(sections).length === 0) {
    container.innerHTML = `<p class="list-empty">No data</p>`;
    return;
  }

  let html = `<div class="table-wrap"><table><thead><tr>
    <th>Section</th><th>Students</th><th>Average</th><th>Pass Rate</th>
  </tr></thead><tbody>`;

  Object.entries(sections).sort((a, b) => a[0].localeCompare(b[0])).forEach(([sec, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passed = scores.filter(s => s >= passMark).length;
    const rate = (passed / scores.length * 100).toFixed(1);
    html += `<tr>
      <td><strong>${esc(sec)}</strong></td>
      <td>${scores.length}</td>
      <td>${avg.toFixed(2)}</td>
      <td>${rate}%</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ============================================================
// COMPARE
// ============================================================

function populateCompareSelectors() {
  // already handled in populateExamSelectors
}

function runComparison() {
  const idA = document.getElementById("compareA").value;
  const idB = document.getElementById("compareB").value;

  if (!idA || !idB) {
    showToast("Select two examinations.", "error");
    return;
  }
  if (idA === idB) {
    showToast("Please choose two different examinations.", "error");
    return;
  }

  const examA = exams.find(e => e.id === idA);
  const examB = exams.find(e => e.id === idB);
  const resA = results.filter(r => r.examId === idA);
  const resB = results.filter(r => r.examId === idB);

  const statsA = calcStats(resA.map(r => r.score));
  const statsB = calcStats(resB.map(r => r.score));

  const container = document.getElementById("compareStats");
  container.innerHTML = `
    <div class="stat-card">
      <div>
        <p class="stat-label">${esc(examA.name)}</p>
        <h3>${statsA.count} students</h3>
        <p>Avg: ${statsA.avg?.toFixed(2) ?? "—"}</p>
      </div>
    </div>
    <div class="stat-card">
      <div>
        <p class="stat-label">${esc(examB.name)}</p>
        <h3>${statsB.count} students</h3>
        <p>Avg: ${statsB.avg?.toFixed(2) ?? "—"}</p>
      </div>
    </div>
  `;

  // Common students
  const mapA = {};
  resA.forEach(r => mapA[r.studentId.toLowerCase()] = r);
  const common = [];
  resB.forEach(r => {
    const key = r.studentId.toLowerCase();
    if (mapA[key]) {
      common.push({
        studentId: r.studentId,
        name: r.name,
        scoreA: mapA[key].score,
        scoreB: r.score,
        diff: r.score - mapA[key].score
      });
    }
  });

  const tbody = document.getElementById("compareTableBody");
  tbody.innerHTML = "";
  if (common.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No common students found</td></tr>`;
  } else {
    common.sort((a, b) => b.diff - a.diff);
    common.forEach(c => {
      const cls = c.diff > 0 ? "change-up" : c.diff < 0 ? "change-down" : "change-same";
      const sign = c.diff > 0 ? "+" : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(c.studentId)}</td>
        <td>${esc(c.name)}</td>
        <td>${c.scoreA}</td>
        <td>${c.scoreB}</td>
        <td class="${cls}">${sign}${c.diff.toFixed(1)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("compareResults").classList.remove("hidden");
}

// ============================================================
// SETTINGS
// ============================================================

function renderGradeScaleEditor() {
  const container = document.getElementById("gradeScaleEditor");
  container.innerHTML = settings.gradeScale.map((g, i) => `
    <div class="form-grid" style="margin-bottom:12px;align-items:end">
      <div class="form-group">
        <label>Min Score</label>
        <input type="number" class="grade-min" data-i="${i}" value="${g.min}" min="0" max="100" />
      </div>
      <div class="form-group">
        <label>Label</label>
        <input type="text" class="grade-label" data-i="${i}" value="${esc(g.label)}" />
      </div>
      <div class="form-group">
        <label>Color</label>
        <input type="color" class="grade-color" data-i="${i}" value="${g.color}" />
      </div>
    </div>
  `).join("");

  document.getElementById("defaultPassMark").value = settings.defaultPassMark;
}

function saveGradeScale() {
  const mins = document.querySelectorAll(".grade-min");
  const labels = document.querySelectorAll(".grade-label");
  const colors = document.querySelectorAll(".grade-color");

  const newScale = [];
  for (let i = 0; i < mins.length; i++) {
    newScale.push({
      min: Number(mins[i].value),
      label: labels[i].value.trim() || "Grade",
      color: colors[i].value
    });
  }
  newScale.sort((a, b) => b.min - a.min);
  settings.gradeScale = newScale;
  saveData();
  showToast("Grade scale saved.", "success");
  displayResults();
  updateStatistics();
}

function saveDefaultPassMark() {
  const val = Number(document.getElementById("defaultPassMark").value);
  if (isNaN(val) || val < 0 || val > 100) {
    showToast("Invalid pass mark.", "error");
    return;
  }
  settings.defaultPassMark = val;
  saveData();
  showToast("Default pass mark saved.", "success");
}

// ============================================================
// EXPORT / RESET
// ============================================================

function exportCSV() {
  const examId = document.getElementById("examSelector").value;
  let data = results;
  let filename = "all-results.csv";

  if (examId) {
    data = results.filter(r => r.examId === examId);
    const exam = exams.find(e => e.id === examId);
    filename = `${(exam?.name || "exam").replace(/[^a-z0-9]/gi, "_")}_results.csv`;
  }

  if (data.length === 0) {
    showToast("No results to export.", "warning");
    return;
  }

  const headers = ["Student ID", "Name", "Section", "Score", "Grade", "Status", "Exam"];
  const rows = data.map(r => {
    const exam = exams.find(e => e.id === r.examId);
    const pm = exam ? exam.passMark : settings.defaultPassMark;
    const grade = getGrade(r.score);
    return [
      r.studentId,
      r.name,
      r.section,
      r.score,
      grade.label,
      r.score >= pm ? "Passed" : "Failed",
      exam?.name || ""
    ];
  });

  let csv = headers.join(",") + "\n";
  rows.forEach(row => {
    csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV exported.", "success");
}

function resetSystem() {
  if (!confirm("Delete ALL examinations and results? This cannot be undone.")) return;
  if (!confirm("Are you absolutely sure?")) return;

  exams = [];
  results = [];
  localStorage.removeItem(STORAGE_KEYS.exams);
  localStorage.removeItem(STORAGE_KEYS.results);
  loadData(); // recreates default exam
  renderAll();
  showToast("System reset complete.", "success");
}

// ============================================================
// RENDER ALL
// ============================================================

function renderAll() {
  displayExams();
  populateExamSelectors();
  displayResults();
  updateDashboard();
  updateStatistics();
  updateActiveExamBadge();
}

// ============================================================
// UTIL
// ============================================================

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Expose functions needed by inline onclick
window.renameExam = renameExam;
window.deleteExam = deleteExam;
window.editResult = editResult;
window.deleteResult = deleteResult;