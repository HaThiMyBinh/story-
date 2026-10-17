function openScheduleManager(internId, internName) {
  scheduleManagerInternId = Number(internId);
  scheduleManagerInternName = internName || "";
  document.getElementById("scheduleManagerInternName").textContent =
    scheduleManagerInternName;
  document.getElementById("scheduleManagerModal").classList.add("open");
  resetScheduleMilestoneForm();
  loadScheduleMilestones();
}

function closeScheduleManager() {
  document.getElementById("scheduleManagerModal").classList.remove("open");
}

function resetScheduleMilestoneForm() {
  document.getElementById("scheduleMilestoneForm").reset();
  document.getElementById("scheduleMilestoneId").value = "";
  document.getElementById("scheduleSaveButton").textContent = "Thêm mốc";
}

async function loadScheduleMilestones() {
  const list = document.getElementById("scheduleMilestonesList");
  const message = document.getElementById("scheduleManagerMessage");
  list.innerHTML = `<p style="color:#94a3b8">Đang tải mốc lịch...</p>`;
  message.textContent = "";
  try {
    const response = await fetch(
      `${API_BASE}/interns/${scheduleManagerInternId}/schedule`,
      { headers: authHeaders() },
    );
    if (response.status === 401)
      return forceLogout("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!");
    const body = await response.json();
    if (!response.ok || !body.success)
      throw new Error(body.message || "Không tải được lịch.");
    scheduleMilestones = Array.isArray(body.data?.milestones)
      ? body.data.milestones
      : [];
    if (body.data?.schedule_sync_warning)
      message.innerHTML = `<span style="color:#b45309">${escapeHtml(body.data.schedule_sync_warning)}</span>`;
    renderScheduleMilestones();
  } catch (err) {
    list.innerHTML = `<p style="color:#b91c1c">${escapeHtml(err.message || "Không tải được lịch.")}</p>`;
  }
}

function renderScheduleMilestones() {
  const list = document.getElementById("scheduleMilestonesList");
  if (!scheduleMilestones.length) {
    list.innerHTML = `<p style="color:#64748b;padding:10px 0">Chưa có mốc. Có thể tạo mốc bên dưới hoặc dùng nút “Tạo kế hoạch từ mẫu” sau khi có hợp đồng đã xác nhận.</p>`;
    return;
  }
  list.innerHTML = scheduleMilestones
    .map(
      (m) =>
        `<article class="schedule-milestone-row"><div><b>${Number(m.phase_order)}. ${escapeHtml(m.title)}</b><div style="color:#64748b;font-size:12px">${escapeHtml(formatDateOnly(m.start_date) || "Chưa có ngày")} – ${escapeHtml(formatDateOnly(m.end_date) || "Chưa có ngày")} · ${escapeHtml(m.status)}</div></div><div class="action-group"><button type="button" class="btn btn-sm btn-outline-primary" onclick="editScheduleMilestone(${Number(m.id)})"><i class="fa-solid fa-pen"></i> Sửa</button><button type="button" class="btn btn-sm btn-danger" onclick="deleteScheduleMilestone(${Number(m.id)})"><i class="fa-solid fa-trash"></i> Xóa</button></div></article>`,
    )
    .join("");
}

function editScheduleMilestone(milestoneId) {
  const milestone = scheduleMilestones.find(
    (item) => Number(item.id) === Number(milestoneId),
  );
  if (!milestone) return;
  document.getElementById("scheduleMilestoneId").value = milestone.id;
  document.getElementById("schedulePhaseOrder").value = milestone.phase_order;
  document.getElementById("scheduleTitle").value = milestone.title || "";
  document.getElementById("scheduleStartDate").value =
    milestone.start_date || "";
  document.getElementById("scheduleEndDate").value = milestone.end_date || "";
  document.getElementById("scheduleDuration").value =
    milestone.duration_weeks || "";
  document.getElementById("scheduleDescription").value =
    milestone.description || "";
  document.getElementById("scheduleExpectedResults").value =
    milestone.expected_results || "";
  document.getElementById("scheduleStatus").value =
    milestone.status || "NOT_STARTED";
  document.getElementById("scheduleSaveButton").textContent = "Lưu thay đổi";
}

async function saveScheduleMilestone(event) {
  event.preventDefault();
  const id = document.getElementById("scheduleMilestoneId").value;
  const payload = {
    phase_order: Number(document.getElementById("schedulePhaseOrder").value),
    title: document.getElementById("scheduleTitle").value.trim(),
    start_date: document.getElementById("scheduleStartDate").value || null,
    end_date: document.getElementById("scheduleEndDate").value || null,
    duration_weeks:
      document.getElementById("scheduleDuration").value.trim() || null,
    description:
      document.getElementById("scheduleDescription").value.trim() || null,
    expected_results:
      document.getElementById("scheduleExpectedResults").value.trim() || null,
    status: document.getElementById("scheduleStatus").value,
  };
  try {
    const response = await fetch(
      `${API_BASE}/interns/${scheduleManagerInternId}/schedule/milestones${id ? `/${Number(id)}` : ""}`,
      {
        method: id ? "PATCH" : "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      },
    );
    const body = await response.json();
    if (!response.ok || !body.success)
      throw new Error(body.message || "Không lưu được mốc lịch.");
    showToast(id ? "Đã cập nhật mốc lịch." : "Đã tạo mốc lịch.", "success");
    resetScheduleMilestoneForm();
    await loadScheduleMilestones();
  } catch (err) {
    showToast(err.message || "Không lưu được mốc lịch.", "error");
  }
}

async function deleteScheduleMilestone(milestoneId) {
  if (!confirm("Xóa mốc lịch này?")) return;
  try {
    const response = await fetch(
      `${API_BASE}/interns/${scheduleManagerInternId}/schedule/milestones/${Number(milestoneId)}`,
      { method: "DELETE", headers: authHeaders() },
    );
    const body = await response.json();
    if (!response.ok || !body.success)
      throw new Error(body.message || "Không xóa được mốc lịch.");
    if (
      document.getElementById("scheduleMilestoneId").value ===
      String(milestoneId)
    )
      resetScheduleMilestoneForm();
    showToast("Đã xóa mốc lịch.", "success");
    await loadScheduleMilestones();
  } catch (err) {
    showToast(err.message || "Không xóa được mốc lịch.", "error");
  }
}

async function loadMySchedule() {
  if (currentRole !== "Intern") return;
  const list = document.getElementById("myScheduleList");
  list.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:16px">Đang tải lịch thực tập...</p>`;
  try {
    const response = await fetch(`${API_BASE}/me/schedule`, {
      headers: authHeaders(),
    });
    if (response.status === 401)
      return forceLogout("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!");
    const body = await response.json();
    if (!response.ok || !body.success)
      throw new Error(body.message || "Không tải được lịch thực tập.");
    const milestones = Array.isArray(body.data?.milestones)
      ? body.data.milestones
      : [];
    myScheduleMentor = body.data?.mentor || null;
    myScheduleProgram = body.data?.program || null;
    if (!milestones.length) {
      list.innerHTML = `<div class="intern-schedule-calendar">${buildMyScheduleHeader()}</div><p style="text-align:center;color:#64748b;padding:24px">Chưa có lịch. Vui lòng liên hệ HR hoặc Mentor phụ trách để tạo kế hoạch thực tập.</p>`;
      return;
    }
    myScheduleMilestones = milestones;
    myScheduleWarning = body.data?.schedule_sync_warning || "";
    const firstDated = milestones.find(
      (m) => m.start_date && parseCalendarDate(m.start_date),
    );
    if (!myScheduleMonth && firstDated) {
      const firstDate = parseCalendarDate(firstDated.start_date);
      myScheduleMonth = new Date(
        Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1),
      );
    }
    renderMyScheduleCalendar();
  } catch (err) {
    list.innerHTML = `<p style="text-align:center;color:#ef4444;padding:16px">${escapeHtml(err.message || "Lỗi tải lịch thực tập.")}</p>`;
  }
}

// Các thẻ thông tin ở đầu trang Lịch thực tập của tôi
function buildMyInfoCard(icon, title, rows, emptyText) {
  const body = rows
    ? `<div class="my-info-grid">${rows
        .map(
          ([label, valueHtml]) =>
            `<div class="my-info-item"><small>${label}</small><span>${valueHtml || "—"}</span></div>`,
        )
        .join("")}</div>`
    : `<p class="my-info-empty">${emptyText}</p>`;
  return `<section class="my-info-card"><h4><i class="fa-solid ${icon} text-primary"></i> ${title}</h4>${body}</section>`;
}

function buildMyMentorCard() {
  const m = myScheduleMentor;
  const link = (scheme, value) =>
    value
      ? `<a href="${scheme}:${escapeHtml(value)}">${escapeHtml(value)}</a>`
      : "";
  return buildMyInfoCard(
    "fa-user-tie",
    "Mentor phụ trách",
    m && [
      ["Họ tên", escapeHtml(m.full_name)],
      ["Email", link("mailto", m.email)],
      ["Số điện thoại", link("tel", m.phone)],
      ["Phòng ban", escapeHtml(m.department)],
    ],
    "Bạn chưa được phân công Mentor phụ trách.",
  );
}

function buildMyProgramCard() {
  const p = myScheduleProgram;
  const period = p
    ? [p.start_date, p.end_date]
        .map((d) => formatDateOnly(d) || "Chưa có ngày")
        .join(" – ")
    : "";
  return buildMyInfoCard(
    "fa-graduation-cap",
    "Chương trình thực tập",
    p && [
      ["Tên chương trình", escapeHtml(p.name)],
      ["Phòng ban", escapeHtml(p.department_name)],
      ["Thời gian", escapeHtml(period)],
      [
        "Trạng thái",
        p.status
          ? `<span class="program-status">${escapeHtml(p.status)}</span>`
          : "",
      ],
    ],
    "Bạn chưa được gắn với chương trình thực tập nào.",
  );
}

function buildMyScheduleHeader() {
  return buildMyMentorCard() + buildMyProgramCard();
} // Date UTC của thứ Hai đầu tuần

function scheduleDateToStr(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

// Thứ Hai đầu tuần (UTC) chứa ngày dateStr.
function weekStartOf(dateStr) {
  const date = parseCalendarDate(dateStr) || new Date();
  const offset = (date.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - offset,
    ),
  );
}

function setScheduleView(mode) {
  if (mode === myScheduleView) return;
  if (!myScheduleMonth) myScheduleMonth = monthStartOf(getVietnamToday());
  if (mode === "week") {
    const monthPrefix = scheduleDateToStr(myScheduleMonth).slice(0, 7);
    const today = getVietnamToday();
    const anchor =
      myScheduleSelectedDate ||
      (today.startsWith(monthPrefix)
        ? today
        : scheduleDateToStr(myScheduleMonth));
    myScheduleWeekStart = weekStartOf(anchor);
  } else if (myScheduleWeekStart) {
    // Về chế độ tháng: lấy tháng của ngày giữa tuần (Thứ Năm)
    const mid = new Date(myScheduleWeekStart.getTime() + 3 * 86400000);
    myScheduleMonth = new Date(
      Date.UTC(mid.getUTCFullYear(), mid.getUTCMonth(), 1),
    );
  }
  myScheduleView = mode;
  renderMyScheduleCalendar();
}

function shiftScheduleRange(delta) {
  if (myScheduleView === "week") {
    if (!myScheduleWeekStart)
      myScheduleWeekStart = weekStartOf(getVietnamToday());
    myScheduleWeekStart = new Date(
      myScheduleWeekStart.getTime() + delta * 7 * 86400000,
    );
    myScheduleSelectedDate = "";
    renderMyScheduleCalendar();
  } else {
    shiftScheduleMonth(delta);
  }
}

// Khung "Hôm nay có gì": liệt kê các mốc đang diễn ra trong ngày hôm nay.
function buildScheduleTodayPanel(todayStr) {
  const todayDate = parseCalendarDate(todayStr);
  if (!todayDate) return "";
  const dayNames = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  const statusText = {
    IN_PROGRESS: "Đang thực hiện",
    COMPLETED: "Hoàn thành",
    PENDING: "Chưa bắt đầu",
    NOT_STARTED: "Chưa bắt đầu",
  };
  const dayMs = 86400000;
  const dated = myScheduleMilestones.filter(
    (item) =>
      parseCalendarDate(item.start_date) && parseCalendarDate(item.end_date),
  );
  const active = dated.filter(
    (item) => item.start_date <= todayStr && item.end_date >= todayStr,
  );
  const label = `${dayNames[todayDate.getUTCDay()]}, ${formatDateOnly(todayStr)}`;
  let body = "";
  if (active.length) {
    body = active
      .map((item) => {
        const start = parseCalendarDate(item.start_date);
        const end = parseCalendarDate(item.end_date);
        const total = Math.round((end - start) / dayMs) + 1;
        const current = Math.round((todayDate - start) / dayMs) + 1;
        const percent = Math.min(100, Math.round((current / total) * 100));
        const cls =
          item.status === "IN_PROGRESS"
            ? "is-in-progress"
            : item.status === "COMPLETED"
              ? "is-completed"
              : "";
        return `<article class="schedule-today-item ${cls}"><div class="schedule-today-item-head"><b>${Number(item.phase_order)}. ${escapeHtml(item.title)}</b><span class="badge ${item.status === "COMPLETED" ? "badge-active" : "badge-pending"}">${escapeHtml(statusText[item.status] || item.status)}</span></div><div class="schedule-today-meta">${escapeHtml(formatDateOnly(item.start_date))} – ${escapeHtml(formatDateOnly(item.end_date))} · Ngày ${current}/${total}</div><div class="schedule-today-progress"><span style="width:${percent}%"></span></div>${item.description ? `<p class="schedule-agenda-description">${escapeHtml(item.description)}</p>` : ""}${item.expected_results ? `<small style="color:#64748b">Kết quả dự kiến: ${escapeHtml(item.expected_results)}</small>` : ""}</article>`;
      })
      .join("");
  } else {
    const upcoming = dated
      .filter((item) => item.start_date > todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
    const past = dated
      .filter((item) => item.end_date < todayStr)
      .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
    let hint = "";
    if (upcoming) {
      const days = Math.round(
        (parseCalendarDate(upcoming.start_date) - todayDate) / dayMs,
      );
      hint = `Mốc tiếp theo: <b>${escapeHtml(upcoming.title)}</b> – bắt đầu ${escapeHtml(formatDateOnly(upcoming.start_date))} (còn ${days} ngày).`;
    } else if (past) {
      hint = `Mốc gần nhất đã kết thúc: <b>${escapeHtml(past.title)}</b> (${escapeHtml(formatDateOnly(past.end_date))}).`;
    }
    body = `<p class="schedule-today-empty">Hôm nay không có mốc nào.${hint ? " " + hint : ""}</p>`;
  }
  return `<section class="schedule-today-panel"><div class="schedule-today-head"><i class="fa-solid fa-sun text-primary"></i><h4>Hôm nay có gì?</h4><span class="schedule-today-date">${escapeHtml(label)}</span><button type="button" class="schedule-today-close" onclick="closeScheduleTodayPanel()" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div>${body}</section>`;
}

function goToScheduleToday() {
  const today = getVietnamToday();
  myScheduleMonth = monthStartOf(today);
  myScheduleWeekStart = weekStartOf(today);
  myScheduleSelectedDate = today; // chọn luôn ngày hôm nay để hiện chi tiết bên dưới
  myScheduleShowToday = true;
  renderMyScheduleCalendar();
}

function closeScheduleTodayPanel() {
  myScheduleShowToday = false;
  renderMyScheduleCalendar();
}

function parseCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

// Ngày đầu tháng (UTC) của một chuỗi YYYY-MM-DD.
function monthStartOf(dateStr) {
  const [year, month] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function shiftScheduleMonth(delta) {
  if (!myScheduleMonth) myScheduleMonth = monthStartOf(getVietnamToday());
  myScheduleMonth = new Date(
    Date.UTC(
      myScheduleMonth.getUTCFullYear(),
      myScheduleMonth.getUTCMonth() + delta,
      1,
    ),
  );
  myScheduleSelectedDate = "";
  renderMyScheduleCalendar();
}

function selectScheduleCalendarDate(dateStr) {
  myScheduleSelectedDate = dateStr;
  renderMyScheduleCalendar();
}

function renderMyScheduleCalendar() {
  const list = document.getElementById("myScheduleList");
  if (!list || !myScheduleMilestones.length) return;
  if (!myScheduleMonth) myScheduleMonth = monthStartOf(getVietnamToday());
  const year = myScheduleMonth.getUTCFullYear();
  const month = myScheduleMonth.getUTCMonth();
  const monthTitle = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(myScheduleMonth);
  const weekdayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const isWeek = myScheduleView === "week";
  if (isWeek && !myScheduleWeekStart)
    myScheduleWeekStart = weekStartOf(
      myScheduleSelectedDate || getVietnamToday(),
    );
  const weekEnd = isWeek
    ? new Date(myScheduleWeekStart.getTime() + 6 * 86400000)
    : null;
  const rangeStartStr = isWeek
    ? scheduleDateToStr(myScheduleWeekStart)
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const rangeEndStr = isWeek
    ? scheduleDateToStr(weekEnd)
    : `${year}-${String(month + 1).padStart(2, "0")}-31`;
  const pad2 = (n) => String(n).padStart(2, "0");
  const rangeTitle = isWeek
    ? `${pad2(myScheduleWeekStart.getUTCDate())}/${pad2(myScheduleWeekStart.getUTCMonth() + 1)} – ${pad2(weekEnd.getUTCDate())}/${pad2(weekEnd.getUTCMonth() + 1)}/${weekEnd.getUTCFullYear()}`
    : monthTitle;
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const offset = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = isWeek ? 7 : Math.ceil((offset + daysInMonth) / 7) * 7;
  const todayStr = getVietnamToday();
  const todayPanel = myScheduleShowToday
    ? buildScheduleTodayPanel(todayStr)
    : "";
  let cells = "";
  for (let index = 0; index < totalCells; index += 1) {
    const date = isWeek
      ? new Date(myScheduleWeekStart.getTime() + index * 86400000)
      : new Date(Date.UTC(year, month, 1 - offset + index));
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    const active = myScheduleMilestones.filter(
      (item) =>
        item.start_date &&
        item.end_date &&
        item.start_date <= dateStr &&
        item.end_date >= dateStr,
    );
    const classes = ["schedule-day"];
    if (isWeek) classes.push("is-week");
    else if (date.getUTCMonth() !== month) classes.push("is-outside");
    if (dateStr === todayStr) classes.push("is-today");
    if (dateStr === myScheduleSelectedDate) classes.push("is-selected");
    const dots = active
      .slice(0, isWeek ? undefined : 2)
      .map(
        (item) =>
          `<span class="schedule-day-event ${item.status === "IN_PROGRESS" ? "is-in-progress" : item.status === "COMPLETED" ? "is-completed" : ""}" title="${escapeHtml(item.title)}"></span>${isWeek || item.start_date === dateStr ? `<span class="schedule-day-label">${escapeHtml(item.title)}</span>` : ""}`,
      )
      .join("");
    cells += `<button type="button" class="${classes.join(" ")}" onclick="selectScheduleCalendarDate('${dateStr}')" aria-label="${dateStr}${active.length ? `: ${escapeHtml(active.map((item) => item.title).join(", "))}` : ""}"><span class="schedule-day-number">${date.getUTCDate()}</span>${isWeek ? `<span class="schedule-day-weekname">${weekdayNames[index]}</span>` : ""}<span class="schedule-day-events">${dots}</span></button>`;
  }
  const undated = myScheduleMilestones.filter(
    (item) => !item.start_date || !item.end_date,
  );
  list.innerHTML = `<div class="intern-schedule-calendar">${buildMyScheduleHeader()}${myScheduleWarning ? `<p class="alert-box alert-error" style="display:block">${escapeHtml(myScheduleWarning)}</p>` : ""}${todayPanel}<div class="schedule-view-bar"><div class="schedule-view-toggle"><button type="button" class="${isWeek ? "" : "active"}" onclick="setScheduleView('month')">Tháng</button><button type="button" class="${isWeek ? "active" : ""}" onclick="setScheduleView('week')">Tuần</button></div><button class="btn btn-sm btn-outline-primary" type="button" onclick="goToScheduleToday()">Hôm nay</button></div><div class="schedule-calendar-toolbar"><button class="btn btn-sm btn-outline-primary" type="button" onclick="shiftScheduleRange(-1)" aria-label="${isWeek ? "Tuần trước" : "Tháng trước"}"><i class="fa-solid fa-chevron-left"></i></button><h4>${escapeHtml(rangeTitle)}</h4><button class="btn btn-sm btn-outline-primary" type="button" onclick="shiftScheduleRange(1)" aria-label="${isWeek ? "Tuần sau" : "Tháng sau"}"><i class="fa-solid fa-chevron-right"></i></button></div><div class="schedule-calendar-grid${isWeek ? " is-week" : ""}">${weekdayNames.map((day) => `<div class="schedule-weekday">${day}</div>`).join("")}${cells}</div>${undated.length ? `<section class="schedule-month-agenda"><h4>Mốc chưa có ngày</h4>${undated.map((item) => `<article class="schedule-agenda-item"><b>${Number(item.phase_order)}. ${escapeHtml(item.title)}</b><div class="schedule-agenda-date">Chưa đặt đủ ngày · ${escapeHtml(item.status)}</div></article>`).join("")}</section>` : ""}</div>`;
}
