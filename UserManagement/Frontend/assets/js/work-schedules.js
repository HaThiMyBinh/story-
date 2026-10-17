function wsCanEdit() {
  return currentRole === "HR";
}
function wsRenderDayRows(days) {
  document.getElementById("wsDays").innerHTML = WEEKDAY_LABELS.map(
    (label, i) => {
      const d = days[i];
      return `<tr><td>${label}</td><td><input type="checkbox" id="wsOn${i + 1}" ${d.isWorking ? "checked" : ""} onchange="updateWorkScheduleMode()" aria-label="Làm việc ${label}"></td><td class="ws-time-col"><input type="time" id="wsStart${i + 1}" value="${d.startTime || ""}" aria-label="Bắt đầu ${label}"></td><td class="ws-time-col"><input type="time" id="wsEnd${i + 1}" value="${d.endTime || ""}" aria-label="Kết thúc ${label}"></td></tr>`;
    },
  ).join("");
}
function updateWorkScheduleMode() {
  const fixed = document.getElementById("wsMode").value === "FIXED";
  document.getElementById("wsGraceWrap").style.display = fixed ? "" : "none";
  document.getElementById("wsMinWrap").style.display = fixed ? "none" : "";
  document
    .querySelectorAll("#wsForm .ws-time-col")
    .forEach((el) => el.classList.toggle("ws-hide", !fixed));
  for (let n = 1; n <= 7; n++) {
    const on = document.getElementById(`wsOn${n}`).checked;
    document.getElementById(`wsStart${n}`).disabled = !on;
    document.getElementById(`wsEnd${n}`).disabled = !on;
  }
}
function copyFirstDayHours() {
  const start = document.getElementById("wsStart1").value,
    end = document.getElementById("wsEnd1").value;
  for (let n = 2; n <= 7; n++) {
    document.getElementById(`wsStart${n}`).value = start;
    document.getElementById(`wsEnd${n}`).value = end;
  }
}
function showWorkScheduleForm(id = null) {
  const schedule = id ? wsSchedules.find((s) => s.id === id) : null;
  wsEditingId = id;
  setText("wsFormError", "");
  setText(
    "wsFormTitle",
    schedule ? `Sửa mẫu lịch: ${schedule.name}` : "Tạo mẫu lịch",
  );
  document.getElementById("wsName").value = schedule ? schedule.name : "";
  document.getElementById("wsDesc").value = schedule
    ? schedule.description
    : "";
  document.getElementById("wsMode").value = schedule ? schedule.mode : "FIXED";
  document.getElementById("wsGrace").value = schedule
    ? schedule.graceMinutes
    : 15;
  document.getElementById("wsMinDaily").value =
    schedule && schedule.minDailyMinutes ? schedule.minDailyMinutes : 240;
  const byDay = (n) =>
    (schedule ? schedule.days.find((d) => d.weekday === n) : null) || {
      isWorking: n <= 5,
      startTime: "08:30",
      endTime: "17:30",
    };
  wsRenderDayRows(
    [1, 2, 3, 4, 5, 6, 7].map((n) => {
      const d = byDay(n);
      return {
        isWorking: d.isWorking,
        startTime: d.startTime || (d.isWorking ? "08:30" : ""),
        endTime: d.endTime || (d.isWorking ? "17:30" : ""),
      };
    }),
  );
  const warning = document.getElementById("wsEditWarning");
  warning.style.display = schedule && schedule.assignmentCount ? "" : "none";
  warning.textContent =
    "Lịch này đang được áp dụng cho nhóm. Thay đổi sẽ ảnh hưởng cả báo cáo các ngày đã qua; nên tạo mẫu lịch mới và áp dụng từ ngày hiệu lực để giữ nguyên số liệu cũ.";
  updateWorkScheduleMode();
  document.getElementById("wsForm").style.display = "";
  document
    .getElementById("wsForm")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}
function workSchedulePayload() {
  const fixed = document.getElementById("wsMode").value === "FIXED";
  const days = [1, 2, 3, 4, 5, 6, 7].map((n) => {
    const on = document.getElementById(`wsOn${n}`).checked;
    return {
      weekday: n,
      is_working: on,
      start_time:
        fixed && on ? document.getElementById(`wsStart${n}`).value : null,
      end_time: fixed && on ? document.getElementById(`wsEnd${n}`).value : null,
    };
  });
  const payload = {
    name: document.getElementById("wsName").value.trim(),
    description: document.getElementById("wsDesc").value.trim(),
    mode: fixed ? "FIXED" : "FLEXIBLE",
    days,
  };
  if (fixed)
    payload.grace_minutes = Number(document.getElementById("wsGrace").value);
  else
    payload.min_daily_minutes = Number(
      document.getElementById("wsMinDaily").value,
    );
  return payload;
}
function validateWorkSchedulePayload(p) {
  if (!p.name) return "Vui lòng nhập tên lịch.";
  if (!p.days.some((d) => d.is_working))
    return "Lịch phải có ít nhất một ngày làm việc.";
  if (p.mode === "FIXED") {
    if (
      !Number.isInteger(p.grace_minutes) ||
      p.grace_minutes < 0 ||
      p.grace_minutes > 120
    )
      return "Dung sai phải từ 0 đến 120 phút.";
    for (const d of p.days.filter((x) => x.is_working)) {
      if (!d.start_time || !d.end_time)
        return `Vui lòng nhập giờ bắt đầu và kết thúc cho ${WEEKDAY_LABELS[d.weekday - 1]}.`;
      if (d.end_time <= d.start_time)
        return `Giờ kết thúc phải sau giờ bắt đầu (${WEEKDAY_LABELS[d.weekday - 1]}).`;
    }
  } else if (
    !Number.isInteger(p.min_daily_minutes) ||
    p.min_daily_minutes < 30 ||
    p.min_daily_minutes > 720
  )
    return "Số phút tối thiểu phải từ 30 đến 720.";
  return "";
}
async function saveWorkSchedule() {
  const payload = workSchedulePayload(),
    problem = validateWorkSchedulePayload(payload);
  if (problem) {
    setText("wsFormError", problem);
    return;
  }
  const button = document.getElementById("wsSaveButton");
  button.disabled = true;
  setText("wsFormError", "");
  try {
    const result = await wrRequest(
      wsEditingId ? `/work-schedules/${wsEditingId}` : "/work-schedules",
      postJson(payload, wsEditingId ? "PUT" : "POST"),
    );
    if (!result) return;
    if (!result.res.ok) {
      setText("wsFormError", wrApiError(result, "Không lưu được lịch."));
      return;
    }
    document.getElementById("wsForm").style.display = "none";
    await loadWorkSchedulesTab();
  } finally {
    button.disabled = false;
  }
}
async function deleteWorkSchedule(id) {
  const schedule = wsSchedules.find((s) => s.id === id);
  if (!confirm(`Xóa mẫu lịch "${schedule ? schedule.name : id}"?`)) return;
  const result = await wrRequest(`/work-schedules/${id}`, {
    method: "DELETE",
  });
  if (!result) return;
  if (!result.res.ok) {
    setText("wsError", wrApiError(result, "Không xóa được lịch."));
    return;
  }
  await loadWorkSchedulesTab();
}
function renderWorkScheduleList() {
  const edit = wsCanEdit();
  document.getElementById("wsList").innerHTML =
    `<div class="table-container"><table><thead><tr><th>Tên lịch</th><th>Chế độ</th><th>Tóm tắt</th><th>Đang áp dụng</th>${edit ? "<th>Thao tác</th>" : ""}</tr></thead><tbody>${wsSchedules.map((s) => `<tr><td>${escapeHtml(s.name)}${s.id === 1 ? ' <span class="load-badge ok">Mặc định</span>' : ""}${s.description && !(s.id === 1 && s.description === "Lịch làm việc mặc định toàn hệ thống") ? `<span class="fr-sub">${escapeHtml(s.description)}</span>` : ""}</td><td>${s.mode === "FIXED" ? "Giờ cố định" : "Giờ linh hoạt"}</td><td>${escapeHtml(s.summary)}${s.mode === "FIXED" ? `<span class="fr-sub">Dung sai ${s.graceMinutes} phút</span>` : ""}</td><td>${s.assignmentCount} lần áp dụng</td>${edit ? `<td><div class="fr-row-actions"><button class="btn btn-sm btn-secondary" onclick="showWorkScheduleForm(${s.id})">Sửa</button>${s.id === 1 ? "" : `<button class="btn btn-sm btn-danger" onclick="deleteWorkSchedule(${s.id})">Xóa</button>`}</div></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}
function assignmentStatus(a, today) {
  if (a.effectiveFrom > today) return pill("Sắp áp dụng", "ar-b-pending");
  if (a.effectiveTo && a.effectiveTo < today)
    return pill("Đã kết thúc", "ar-b-muted");
  return pill("Đang áp dụng", "ar-b-present");
}
function renderAssignments(rows) {
  const today = getVietnamToday(),
    edit = wsCanEdit();
  document.getElementById("wsAssignments").innerHTML =
    `<div class="table-container"><table><thead><tr><th>Phạm vi</th><th>Lịch</th><th>Hiệu lực</th><th>Trạng thái</th>${edit ? "<th></th>" : ""}</tr></thead><tbody>${rows
      .map((a) => {
        const target =
          a.targetType === "INTERN"
            ? `Cá nhân (ID ${a.targetValue})`
            : a.targetLabel;
        return `<tr><td>${escapeHtml(target)}</td><td>${escapeHtml(a.scheduleName)}<span class="fr-sub">${escapeHtml(a.scheduleSummary)}</span></td><td>${escapeHtml(a.effectiveFrom === "1970-01-01" ? "Từ trước đến nay" : formatDateOnly(a.effectiveFrom))} – ${a.effectiveTo ? escapeHtml(formatDateOnly(a.effectiveTo)) : "không giới hạn"}</td><td>${assignmentStatus(a, today)}</td>${edit ? `<td>${a.targetType === "DEFAULT" ? "" : `<button class="btn btn-sm btn-danger" onclick="removeAssignment(${a.id})">Xóa</button>`}</td>` : ""}</tr>`;
      })
      .join("")}</tbody></table></div>`;
}
function renderResolvedSchedules(rows) {
  document.getElementById("wsResolved").innerHTML = rows.length
    ? `<div class="table-container"><table><thead><tr><th>Thực tập sinh</th><th>Trường</th><th>Lịch áp dụng</th><th>Theo</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${escapeHtml(r.intern.fullName)}<span class="fr-sub">${escapeHtml(r.intern.studentCode || "")}</span></td><td>${escapeHtml(r.intern.university || "")}</td><td>${r.schedule ? `${escapeHtml(r.schedule.name)}<span class="fr-sub">${escapeHtml(r.schedule.summary)}</span>` : "—"}</td><td>${r.source ? escapeHtml(r.source.label) : "—"}</td></tr>`).join("")}</tbody></table></div>`
    : "<p>Chưa có thực tập sinh nào đang hoặc sắp thực tập (cần hợp đồng đã xác nhận).</p>";
}
function renderHolidays(rows) {
  const edit = wsCanEdit();
  document.getElementById("wsHolidays").innerHTML = rows.length
    ? `<div class="table-container"><table><thead><tr><th>Ngày</th><th>Tên</th>${edit ? "<th></th>" : ""}</tr></thead><tbody>${rows.map((h) => `<tr><td>${escapeHtml(weekdayLabel(h.holidayDate))}, ${escapeHtml(formatDateOnly(h.holidayDate))}</td><td>${escapeHtml(h.name)}</td>${edit ? `<td><button class="btn btn-sm btn-danger" onclick="removeWorkHoliday(${h.id})">Xóa</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`
    : "<p>Chưa có ngày nghỉ chung nào. Ngày nghỉ chung không bị tính là vắng mặt trong báo cáo chuyên cần.</p>";
}
async function loadWorkSchedulesTab() {
  document
    .querySelectorAll("#tab-work-schedules .ws-hr-only")
    .forEach((el) => el.classList.toggle("ws-hide", !wsCanEdit()));
  setText("wsError", "");
  const [schedules, assignments, resolved, holidays, options] =
    await Promise.all([
      wrRequest("/work-schedules"),
      wrRequest("/work-schedules/assignments"),
      wrRequest("/work-schedules/resolved"),
      wrRequest("/work-holidays"),
      loadWorkScopeOptions(true),
    ]);
  const failed = [schedules, assignments, resolved, holidays].find(
    (r) => r && !r.res.ok,
  );
  if (failed) {
    setText(
      "wsError",
      wrApiError(failed, "Không tải được dữ liệu lịch làm việc."),
    );
  }
  if (!schedules || !assignments || !resolved || !holidays) return;
  if (schedules.res.ok) {
    wsSchedules = schedules.body.data;
    renderWorkScheduleList();
  }
  if (assignments.res.ok) renderAssignments(assignments.body.data);
  if (resolved.res.ok) renderResolvedSchedules(resolved.body.data);
  if (holidays.res.ok) renderHolidays(holidays.body.data);
  const select = document.getElementById("wsAsSchedule"),
    keep = select.value;
  select.innerHTML = wsSchedules
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");
  if (keep) select.value = keep;
  if (!document.getElementById("wsAsFrom").value)
    document.getElementById("wsAsFrom").value = getVietnamToday();
  void options;
  await updateAssignmentScope();
}
async function updateAssignmentScope() {
  const type = document.getElementById("wsAsType").value;
  document.getElementById("wsAsValueWrap").style.display =
    type === "DEFAULT" ? "none" : "";
  if (type !== "DEFAULT") {
    setText("wsAsValueLabel", SCOPE_LABEL[type]);
    fillScopeSelect("wsAsValue", type, await loadWorkScopeOptions());
  }
}
async function submitAssignment() {
  const type = document.getElementById("wsAsType").value,
    value = document.getElementById("wsAsValue").value;
  const scheduleId = document.getElementById("wsAsSchedule").value,
    from = document.getElementById("wsAsFrom").value,
    to = document.getElementById("wsAsTo").value;
  setText("wsAsError", "");
  if (!scheduleId) return setText("wsAsError", "Vui lòng chọn lịch làm việc.");
  if (type !== "DEFAULT" && !value)
    return setText("wsAsError", "Vui lòng chọn phạm vi áp dụng.");
  if (!from) return setText("wsAsError", "Vui lòng chọn ngày hiệu lực.");
  if (to && to < from)
    return setText(
      "wsAsError",
      "Ngày kết thúc không được trước ngày hiệu lực.",
    );
  const body = {
    schedule_id: Number(scheduleId),
    target_type: type,
    effective_from: from,
  };
  if (type !== "DEFAULT") body.target_value = value;
  if (to) body.effective_to = to;
  const result = await wrRequest("/work-schedules/assignments", postJson(body));
  if (!result) return;
  if (!result.res.ok)
    return setText("wsAsError", wrApiError(result, "Không áp dụng được lịch."));
  document.getElementById("wsAsTo").value = "";
  await loadWorkSchedulesTab();
}
async function removeAssignment(id) {
  if (
    !confirm(
      "Xóa lần áp dụng lịch này? Nhóm sẽ quay về lịch của phạm vi rộng hơn.",
    )
  )
    return;
  const result = await wrRequest(`/work-schedules/assignments/${id}`, {
    method: "DELETE",
  });
  if (!result) return;
  if (!result.res.ok)
    return setText("wsError", wrApiError(result, "Không xóa được."));
  await loadWorkSchedulesTab();
}
async function addWorkHoliday() {
  const date = document.getElementById("wsHolDate").value,
    name = document.getElementById("wsHolName").value.trim();
  setText("wsHolError", "");
  if (!date || !name)
    return setText("wsHolError", "Vui lòng nhập ngày và tên ngày nghỉ.");
  const result = await wrRequest(
    "/work-holidays",
    postJson({ holiday_date: date, name }),
  );
  if (!result) return;
  if (!result.res.ok)
    return setText(
      "wsHolError",
      wrApiError(result, "Không thêm được ngày nghỉ."),
    );
  document.getElementById("wsHolName").value = "";
  await loadWorkSchedulesTab();
}
async function removeWorkHoliday(id) {
  const result = await wrRequest(`/work-holidays/${id}`, {
    method: "DELETE",
  });
  if (!result) return;
  if (!result.res.ok)
    return setText(
      "wsHolError",
      wrApiError(result, "Không xóa được ngày nghỉ."),
    );
  await loadWorkSchedulesTab();
}

// ---------- Lịch của thực tập sinh trên tab Chấm công ----------
async function loadAttendanceScheduleInfo() {
  const el = document.getElementById("attendanceSchedule");
  el.innerHTML = "";
  const result = await wrRequest("/me/work-schedule");
  if (!result || !result.res.ok) return;
  const d = result.body.data;
  let note = "";
  if (d.today.holiday)
    note = `Hôm nay là ngày nghỉ chung (${d.today.holiday}); bạn vẫn có thể chấm công nếu làm việc.`;
  else if (!d.today.rule.isWorkingDay)
    note =
      "Hôm nay là ngày nghỉ theo lịch; bạn vẫn có thể chấm công nếu làm việc.";
  el.innerHTML = `<i class="fa-regular fa-calendar"></i><span>Lịch của bạn: <b>${escapeHtml(d.schedule.summary)}</b> · theo ${escapeHtml(d.source.label)}</span>${note ? `<span class="att-schedule-note">${escapeHtml(note)}</span>` : ""}`;
}
