function evFormatScore(value) {
  return value === null || value === undefined ? "—" : `${value}/5`;
}

async function loadMentorEvaluations() {
  const tbody = document.getElementById("evBody");
  document.getElementById("evDetail").style.display = "none";
  evCurrentInternId = null;
  try {
    const r = await wrRequest("/evaluations/overview");
    if (!r) return;
    if (!r.res.ok || !r.body.success)
      throw new Error(
        wrApiError(r, "Không thể tải danh sách đánh giá thực tập sinh."),
      );
    evOverview = r.body.data;
    renderMentorEvaluationTable();
  } catch (err) {
    evOverview = null;
    document.getElementById("evSummary").innerHTML = "";
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#b91c1c;padding:24px">${escapeHtml(err.message || "Lỗi kết nối server!")}</td></tr>`;
  }
}

// Vẽ lại tóm tắt + bảng từ evOverview (không gọi API).
function renderMentorEvaluationTable() {
  const data = evOverview;
  if (!data) return;
  const tbody = document.getElementById("evBody");
  const pendingOnly = document.getElementById("evPendingOnly").checked;
  const s = data.summary;
  document.getElementById("evSummary").innerHTML = `
          <span>Tổng thực tập sinh: <b>${s.total}</b></span>
          <span>Đã đánh giá: <b>${s.evaluated}</b></span>
          <span>Chưa đánh giá: <b>${s.pending}</b></span>`;

  if (!data.interns.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px">Bạn chưa được phân công thực tập sinh nào.</td></tr>`;
    return;
  }
  const rows = pendingOnly
    ? data.interns.filter((i) => !i.has_evaluation)
    : data.interns;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px">Tất cả thực tập sinh đã được đánh giá.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map((i) => {
      const code = i.student_code
        ? ` <span style="color:#94a3b8">(${escapeHtml(i.student_code)})</span>`
        : "";
      return `<tr>
              <td>${escapeHtml(i.intern_name)}${code}</td>
              <td>${taskBadge(EV_STATUS_UI, i.has_evaluation ? "DONE" : "PENDING")}</td>
              <td>${escapeHtml(evFormatScore(i.skill_score))}</td>
              <td>${escapeHtml(evFormatScore(i.attitude_score))}</td>
              <td>${i.has_evaluation ? `<b>${escapeHtml(i.overall_score)}</b>/5` : "—"}</td>
              <td>${escapeHtml(i.updated_at ? formatProgressTime(i.updated_at) : "—")}</td>
              <td><button class="btn btn-sm btn-primary" type="button" onclick="openMentorEvaluation(${Number(i.intern_id)})">${i.has_evaluation ? "Xem / Sửa" : "Đánh giá"}</button></td>
            </tr>`;
    })
    .join("");
}

function evScoreGroup(name, selected) {
  return `<div class="ev-score-group" role="radiogroup">${[1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<label class="ev-score-option"><input type="radio" name="${name}" value="${n}" ${Number(selected) === n ? "checked" : ""} onchange="updateEvaluationOverall()" />${n} ${"★".repeat(n)}</label>`,
    )
    .join("")}</div>`;
}

async function openMentorEvaluation(internId) {
  const row = evOverview?.interns.find(
    (i) => Number(i.intern_id) === Number(internId),
  );
  const box = document.getElementById("evDetail");
  if (!row) {
    box.style.display = "none";
    return;
  }
  evCurrentInternId = Number(internId);
  box.style.display = "block";
  box.innerHTML = `<div class="card-body" style="color:#94a3b8">Đang tải đánh giá...</div>`;
  let ev = null;
  try {
    const r = await wrRequest(`/interns/${Number(internId)}/evaluation`);
    if (!r) return;
    if (!r.res.ok || !r.body.success)
      throw new Error(wrApiError(r, "Không thể tải đánh giá."));
    ev = r.body.data;
  } catch (err) {
    box.innerHTML = `<div class="card-body" style="color:#b91c1c">${escapeHtml(err.message || "Lỗi kết nối server!")}</div>`;
    return;
  }
  const code = row.student_code ? ` (${escapeHtml(row.student_code)})` : "";
  const info = ev
    ? `Đánh giá bởi ${escapeHtml(ev.mentor_name || "Mentor")}${ev.updated_at ? ` · cập nhật lúc ${escapeHtml(formatProgressTime(ev.updated_at))}` : ""}`
    : "Thực tập sinh này chưa được đánh giá.";
  box.innerHTML = `
          <div class="card-header">
            <h3><i class="fa-solid fa-star text-primary"></i> ${escapeHtml(row.intern_name)}${code}</h3>
          </div>
          <div class="card-body">
            <div class="wr-field-note" style="margin-bottom:12px">${info}</div>

            <div class="form-group">
              <label><i class="fa-solid fa-screwdriver-wrench text-primary"></i> Kỹ năng (chuyên môn, chất lượng công việc) *</label>
              ${evScoreGroup("evSkillScore", ev ? ev.skill_score : null)}
              <textarea id="evSkillComment" class="form-control" maxlength="${EV_COMMENT_MAX}" style="min-height:80px" placeholder="Nhận xét về kỹ năng (không bắt buộc)..."></textarea>
            </div>

            <div class="form-group">
              <label><i class="fa-solid fa-heart text-primary"></i> Thái độ (chủ động, trách nhiệm, tinh thần học hỏi) *</label>
              ${evScoreGroup("evAttitudeScore", ev ? ev.attitude_score : null)}
              <textarea id="evAttitudeComment" class="form-control" maxlength="${EV_COMMENT_MAX}" style="min-height:80px" placeholder="Nhận xét về thái độ (không bắt buộc)..."></textarea>
            </div>

            <div id="evOverall" class="ev-overall"></div>

            <div class="form-group">
              <label for="evOverallComment"><i class="fa-solid fa-flag-checkered text-primary"></i> Nhận xét tổng kết *</label>
              <textarea id="evOverallComment" class="form-control" maxlength="${EV_COMMENT_MAX}" style="min-height:110px" placeholder="Tổng kết quá trình thực tập..." oninput="updateEvaluationCounter()"></textarea>
              <div id="evCounter" class="wr-field-note"></div>
            </div>

            <div id="evError" class="modal-error"></div>
            <div class="wr-feedback-actions">
              <button id="evSaveBtn" class="btn btn-primary" type="button" onclick="saveMentorEvaluation()"><i class="fa-solid fa-floppy-disk"></i> ${ev ? "Cập nhật đánh giá" : "Lưu đánh giá"}</button>
              ${ev ? `<button id="evDeleteBtn" class="btn btn-sm btn-outline-danger" type="button" onclick="deleteMentorEvaluation()"><i class="fa-solid fa-trash"></i> Xóa đánh giá</button>` : ""}
              <button id="evCloseBtn" class="btn btn-sm" type="button" onclick="closeMentorEvaluation()">Đóng</button>
            </div>
          </div>`;
  // Gán qua .value để nội dung người dùng không bao giờ được diễn giải như HTML.
  document.getElementById("evSkillComment").value = ev ? ev.skill_comment : "";
  document.getElementById("evAttitudeComment").value = ev
    ? ev.attitude_comment
    : "";
  document.getElementById("evOverallComment").value = ev
    ? ev.overall_comment
    : "";
  updateEvaluationOverall();
  updateEvaluationCounter();
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeMentorEvaluation() {
  document.getElementById("evDetail").style.display = "none";
  evCurrentInternId = null;
}

function evSelectedScore(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? Number(el.value) : null;
}

// Điểm tổng (xem trước) = trung bình kỹ năng và thái độ; server mới là nơi tính chính thức.
function updateEvaluationOverall() {
  const el = document.getElementById("evOverall");
  if (!el) return;
  const skill = evSelectedScore("evSkillScore");
  const attitude = evSelectedScore("evAttitudeScore");
  el.innerHTML =
    skill && attitude
      ? `Điểm tổng: <b>${Math.round(((skill + attitude) / 2) * 10) / 10}/5</b>`
      : `Điểm tổng: <span style="color:#94a3b8">chọn đủ điểm kỹ năng và thái độ</span>`;
}

function updateEvaluationCounter() {
  const input = document.getElementById("evOverallComment");
  const counter = document.getElementById("evCounter");
  if (!input || !counter) return;
  counter.textContent = `${input.value.trim().length}/${EV_COMMENT_MAX} ký tự`;
}

function setEvaluationBusy(busy) {
  for (const id of [
    "evSaveBtn",
    "evDeleteBtn",
    "evCloseBtn",
    "evSkillComment",
    "evAttitudeComment",
    "evOverallComment",
  ]) {
    const el = document.getElementById(id);
    if (el) el.disabled = busy;
  }
  document
    .querySelectorAll('#evDetail input[type="radio"]')
    .forEach((el) => (el.disabled = busy));
}

// Cập nhật dòng của thực tập sinh trong bộ nhớ rồi vẽ lại bảng (không tải lại cả trang).
function applyEvaluationResult(internId, ev) {
  if (!evOverview) return;
  const row = evOverview.interns.find(
    (i) => Number(i.intern_id) === Number(internId),
  );
  if (row) {
    row.has_evaluation = Boolean(ev);
    row.skill_score = ev ? ev.skill_score : null;
    row.attitude_score = ev ? ev.attitude_score : null;
    row.overall_score = ev ? ev.overall_score : null;
    row.updated_at = ev ? ev.updated_at : null;
  }
  const evaluated = evOverview.interns.filter((i) => i.has_evaluation).length;
  evOverview.summary.evaluated = evaluated;
  evOverview.summary.pending = evOverview.interns.length - evaluated;
  renderMentorEvaluationTable();
}

async function saveMentorEvaluation() {
  const errEl = document.getElementById("evError");
  const skillScore = evSelectedScore("evSkillScore");
  const attitudeScore = evSelectedScore("evAttitudeScore");
  const skillComment = document.getElementById("evSkillComment").value;
  const attitudeComment = document.getElementById("evAttitudeComment").value;
  const overallComment = document.getElementById("evOverallComment").value;

  if (!skillScore) {
    errEl.textContent = "Vui lòng chấm điểm kỹ năng!";
    return;
  }
  if (!attitudeScore) {
    errEl.textContent = "Vui lòng chấm điểm thái độ!";
    return;
  }
  if (!overallComment.trim()) {
    errEl.textContent = "Vui lòng nhập nhận xét tổng kết!";
    return;
  }
  for (const [label, text] of [
    ["Nhận xét kỹ năng", skillComment],
    ["Nhận xét thái độ", attitudeComment],
    ["Nhận xét tổng kết", overallComment],
  ]) {
    if (text.trim().length > EV_COMMENT_MAX) {
      errEl.textContent = `${label} không được vượt quá ${EV_COMMENT_MAX} ký tự!`;
      return;
    }
  }
  errEl.textContent = "";
  const internId = evCurrentInternId;
  setEvaluationBusy(true);
  try {
    const r = await wrRequest(`/interns/${Number(internId)}/evaluation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skill_score: skillScore,
        skill_comment: skillComment,
        attitude_score: attitudeScore,
        attitude_comment: attitudeComment,
        overall_comment: overallComment,
      }),
    });
    if (!r) return;
    if (!r.res.ok || !r.body.success) {
      errEl.textContent = wrApiError(r, "Không thể lưu đánh giá.");
      return;
    }
    showToast(r.body.message || "Đã lưu đánh giá!", "success");
    applyEvaluationResult(internId, r.body.data);
    await openMentorEvaluation(internId);
  } catch (err) {
    errEl.textContent = "Lỗi kết nối server!";
  } finally {
    setEvaluationBusy(false);
  }
}

async function deleteMentorEvaluation() {
  if (!confirm("Bạn có chắc chắn muốn xóa đánh giá này không?")) return;
  const errEl = document.getElementById("evError");
  errEl.textContent = "";
  const internId = evCurrentInternId;
  setEvaluationBusy(true);
  try {
    const r = await wrRequest(`/interns/${Number(internId)}/evaluation`, {
      method: "DELETE",
    });
    if (!r) return;
    if (!r.res.ok || !r.body.success) {
      errEl.textContent = wrApiError(r, "Không thể xóa đánh giá.");
      return;
    }
    showToast(r.body.message || "Đã xóa đánh giá!", "success");
    applyEvaluationResult(internId, null);
    await openMentorEvaluation(internId);
  } catch (err) {
    errEl.textContent = "Lỗi kết nối server!";
  } finally {
    setEvaluationBusy(false);
  }
}
