const STORAGE_KEY = "workPunchRecords.v1";
const ACTIVE_KEY = "workPunchActiveStart.v1";

const timerDisplay = document.querySelector("#timerDisplay");
const timerSubtitle = document.querySelector("#timerSubtitle");
const timerButton = document.querySelector("#timerButton");
const timerPanel = document.querySelector(".timer-panel");
const calendarGrid = document.querySelector("#calendarGrid");
const todayMonthButton = document.querySelector("#todayMonthButton");
const rangeSelect = document.querySelector("#rangeSelect");
const countStat = document.querySelector("#countStat");
const totalStat = document.querySelector("#totalStat");
const averageStat = document.querySelector("#averageStat");
const recordList = document.querySelector("#recordList");
const exportBackupButton = document.querySelector("#exportBackupButton");
const importBackupButton = document.querySelector("#importBackupButton");
const backupFileInput = document.querySelector("#backupFileInput");
const pageTitle = document.querySelector("#pageTitle");
const pages = document.querySelectorAll("[data-page]");
const tabButtons = document.querySelectorAll("[data-target-page]");
const homeDateText = document.querySelector("#homeDateText");
const statsTopActions = document.querySelector("#statsTopActions");

let records = readRecords();
let activeStart = localStorage.getItem(ACTIVE_KEY);

const pageMeta = {
  home: {
    title: "今天",
  },
  calendar: {
    title: "日历",
  },
  stats: {
    title: "统计",
  },
};

function readRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
      .filter((record) => record.start && record.end)
      .map((record) => ({
        ...record,
        id: record.id || `${record.start}-${record.end}`,
      }))
      .sort((a, b) => new Date(b.start) - new Date(a.start));
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function normalizeRecords(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((record) => record && record.start && record.end)
    .map((record) => {
      const start = toSecondPrecision(new Date(record.start));
      const end = toSecondPrecision(new Date(record.end));
      return {
        id: record.id || `${start.toISOString()}-${end.toISOString()}`,
        start: start.toISOString(),
        end: end.toISOString(),
      };
    })
    .filter((record) => !Number.isNaN(new Date(record.start).getTime()) && !Number.isNaN(new Date(record.end).getTime()))
    .filter((record) => new Date(record.end) > new Date(record.start))
    .sort((a, b) => new Date(b.start) - new Date(a.start));
}

function createRecordId(start, end) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${start.toISOString()}-${end.toISOString()}-${Date.now()}`;
}

function toSecondPrecision(date) {
  const nextDate = new Date(date);
  nextDate.setMilliseconds(0);
  return nextDate;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (!hours) return `${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) return `${hours}h${minutes}m${seconds}s`;
  if (minutes) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
}

function formatDurationTokens(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) {
    return [
      { value: hours, unit: "h" },
      { value: minutes, unit: "m" },
      { value: seconds, unit: "s" },
    ];
  }

  if (minutes) {
    return [
      { value: minutes, unit: "m" },
      { value: seconds, unit: "s" },
    ];
  }

  return [{ value: seconds, unit: "s" }];
}

function renderDurationHtml(ms) {
  return formatDurationTokens(ms)
    .map((part) => `<span class="duration-number">${part.value}</span><span class="duration-unit">${part.unit}</span>`)
    .join("");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatShortTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRecordDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatFullDate(date) {
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
  }).format(date);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`;
}

function updateTimer() {
  if (!activeStart) {
    timerDisplay.textContent = "00:00";
    timerSubtitle.textContent = "点击开始";
    timerButton.textContent = "开始";
    timerButton.classList.remove("running");
    timerPanel.classList.remove("is-running");
    return;
  }

  const start = new Date(activeStart);
  timerDisplay.textContent = formatClock(Date.now() - start.getTime());
  timerSubtitle.textContent = `${formatTime(start)}开始`;
  timerButton.textContent = "结束";
  timerButton.classList.add("running");
  timerPanel.classList.add("is-running");
}

function toggleTimer() {
  if (!activeStart) {
    activeStart = toSecondPrecision(new Date()).toISOString();
    localStorage.setItem(ACTIVE_KEY, activeStart);
    updateTimer();
    return;
  }

  const end = toSecondPrecision(new Date());
  const start = new Date(activeStart);
  if (end - start >= 1000) {
    records.unshift({
      id: createRecordId(start, end),
      start: start.toISOString(),
      end: end.toISOString(),
    });
    saveRecords();
  }

  activeStart = null;
  localStorage.removeItem(ACTIVE_KEY);
  render();
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function getCalendarMonths() {
  const current = new Date();
  current.setDate(1);
  current.setHours(0, 0, 0, 0);

  return Array.from({ length: 19 }, (_, index) => {
    const month = new Date(current);
    month.setMonth(current.getMonth() - 6 + index);
    return month;
  });
}

function createWeekdayRow() {
  const row = document.createElement("div");
  row.className = "weekday-row";
  row.setAttribute("aria-hidden", "true");
  ["日", "一", "二", "三", "四", "五", "六"].forEach((day) => {
    const label = document.createElement("span");
    label.textContent = day;
    row.append(label);
  });
  return row;
}

function renderMonth(monthDate, counts, todayKey) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const sundayOffset = firstDay.getDay();

  const section = document.createElement("section");
  section.className = "calendar-month";
  section.dataset.month = monthKey(monthDate);
  section.setAttribute("aria-label", formatMonthTitle(monthDate));

  const title = document.createElement("h3");
  title.className = "month-title";
  title.textContent = formatMonthTitle(monthDate);
  section.append(title);
  section.append(createWeekdayRow());

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  for (let i = 0; i < sundayOffset; i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day is-empty";
    grid.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(year, month, day);
    const key = dateKey(cellDate);
    const count = counts.get(key) || 0;
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (key === todayKey) cell.classList.add("is-today");
    if (count && key !== todayKey) cell.classList.add("has-record");
    cell.setAttribute("aria-label", `${key}，${count} 次记录`);

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    cell.append(number);

    if (key === todayKey) {
      const badge = document.createElement("span");
      badge.className = "day-count";
      cell.append(badge);
    }

    grid.append(cell);
  }

  section.append(grid);
  return section;
}

function renderCalendar() {
  const todayKey = dateKey(new Date());
  const counts = records.reduce((map, record) => {
    const key = dateKey(new Date(record.start));
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());

  calendarGrid.innerHTML = "";
  getCalendarMonths().forEach((month) => {
    calendarGrid.append(renderMonth(month, counts, todayKey));
  });
}

function scrollToCurrentMonth(behavior = "smooth") {
  const currentMonth = monthKey(new Date());
  const target = calendarGrid.querySelector(`[data-month="${currentMonth}"]`);
  if (target) target.scrollIntoView({ behavior, block: "start" });
}

function getStatsRecords() {
  const value = rangeSelect.value;
  const now = new Date();

  if (value === "all") return records;

  if (value === "month") {
    return records.filter((record) => {
      const start = new Date(record.start);
      return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
    });
  }

  const days = Number(value);
  const since = new Date(now);
  since.setDate(now.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);
  return records.filter((record) => new Date(record.start) >= since);
}

function renderStats() {
  const scopedRecords = getStatsRecords();
  const total = scopedRecords.reduce((sum, record) => {
    return sum + (new Date(record.end) - new Date(record.start));
  }, 0);

  countStat.textContent = String(scopedRecords.length);
  totalStat.innerHTML = renderDurationHtml(total);
  averageStat.innerHTML = renderDurationHtml(scopedRecords.length ? total / scopedRecords.length : 0);
}

function renderRecords() {
  recordList.innerHTML = "";

  if (!records.length) {
    const item = document.createElement("li");
    const empty = document.createElement("p");
    item.className = "record-empty";
    empty.className = "empty-state";
    empty.textContent = "暂无记录";
    item.append(empty);
    recordList.append(item);
    return;
  }

  records.slice(0, 20).forEach((record) => {
    const start = new Date(record.start);
    const end = new Date(record.end);
    const item = document.createElement("li");
    item.className = "record-item";
    item.innerHTML = `
      <p class="record-date">${formatRecordDate(start)}</p>
      <button class="delete-record-button" type="button" data-record-id="${record.id}" aria-label="删除这条记录">删除</button>
      <span class="record-duration">${renderDurationHtml(end - start)}</span>
      <p class="record-time">${formatShortTime(start)}-${formatShortTime(end)}</p>
    `;
    recordList.append(item);
  });
}

function deleteRecord(recordId) {
  const record = records.find((item) => item.id === recordId);
  if (!record) return;

  const start = new Date(record.start);
  const message = `确定删除 ${formatDate(start)} ${formatTime(start)} 的记录吗？`;
  if (!confirm(message)) return;

  records = records.filter((item) => item.id !== recordId);
  saveRecords();
  render();
}

function exportBackup() {
  const backup = {
    app: "work-punch",
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `work-punch-backup-${dateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importBackupFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const payload = JSON.parse(String(reader.result || ""));
      const importedRecords = normalizeRecords(Array.isArray(payload) ? payload : payload.records);

      if (!importedRecords.length) {
        alert("没有找到可导入的记录。");
        return;
      }

      const message = `将导入 ${importedRecords.length} 条记录，并覆盖当前记录。确定继续吗？`;
      if (!confirm(message)) return;

      records = importedRecords;
      saveRecords();
      render();
      alert("导入完成。");
    } catch {
      alert("备份文件无法读取，请确认是 JSON 格式。");
    } finally {
      backupFileInput.value = "";
    }
  });
  reader.readAsText(file);
}

function render() {
  updateTimer();
  homeDateText.textContent = formatFullDate(new Date());
  renderCalendar();
  renderStats();
  renderRecords();
}

function showPage(pageName) {
  const meta = pageMeta[pageName] || pageMeta.home;
  pageTitle.textContent = meta.title;
  homeDateText.hidden = pageName !== "home";
  todayMonthButton.hidden = pageName !== "calendar";
  statsTopActions.hidden = pageName !== "stats";

  pages.forEach((page) => {
    const isActive = page.dataset.page === pageName;
    page.hidden = !isActive;
    page.classList.toggle("is-active", isActive);
  });

  tabButtons.forEach((button) => {
    const isActive = button.dataset.targetPage === pageName;
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

timerButton.addEventListener("click", toggleTimer);
rangeSelect.addEventListener("change", renderStats);
todayMonthButton.addEventListener("click", () => {
  scrollToCurrentMonth();
});
exportBackupButton.addEventListener("click", exportBackup);
importBackupButton.addEventListener("click", () => {
  backupFileInput.click();
});
backupFileInput.addEventListener("change", () => {
  importBackupFile(backupFileInput.files[0]);
});
recordList.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-record-button");
  if (!button) return;
  deleteRecord(button.dataset.recordId);
});
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const pageName = button.dataset.targetPage;
    showPage(pageName);
    if (pageName === "calendar") {
      requestAnimationFrame(() => scrollToCurrentMonth("auto"));
    }
  });
});

setInterval(updateTimer, 1000);
showPage("home");
render();
