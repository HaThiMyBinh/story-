function setSidebarOpen(open, restoreFocus = true) {
  const sidebar = document.getElementById("appSidebar");
  const toggle = document.getElementById("sidebarToggle");
  const wasOpen = document.body.classList.contains("sidebar-open");
  open = Boolean(open && sidebarMedia.matches);
  if (!open) document.querySelector("main").inert = false;
  if (!open && wasOpen && restoreFocus) toggle.focus();
  document.body.classList.toggle("sidebar-open", open);
  document.getElementById("sidebarBackdrop").hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  sidebar.inert = sidebarMedia.matches && !open;
  sidebar.setAttribute("aria-hidden", String(sidebarMedia.matches && !open));
  if (open) {
    document.getElementById("sidebarClose").focus();
    document.querySelector("main").inert = true;
  }
}
function initSidebarNavigation() {
  document
    .getElementById("sidebarToggle")
    .addEventListener("click", () => setSidebarOpen(true));
  document
    .getElementById("sidebarClose")
    .addEventListener("click", () => setSidebarOpen(false));
  document
    .getElementById("sidebarBackdrop")
    .addEventListener("click", () => setSidebarOpen(false));
  sidebarMedia.addEventListener("change", () => {
    const focused = document.activeElement;
    if (
      sidebarMedia.matches &&
      document.getElementById("appSidebar").contains(focused)
    )
      document.getElementById("sidebarToggle").focus();
    else if (
      !sidebarMedia.matches &&
      ["sidebarClose", "sidebarToggle"].includes(focused?.id)
    )
      document.querySelector("#sidebarMenu .nav-link")?.focus();
    setSidebarOpen(false, false);
  });
  document
    .getElementById("sidebarMenu")
    .addEventListener("keydown", (event) => {
      if (
        (event.key === "Enter" || event.key === " ") &&
        event.target.matches(".nav-link")
      ) {
        event.preventDefault();
        event.target.click();
      }
    });
  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("sidebar-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setSidebarOpen(false);
    } else if (event.key === "Tab") {
      const items = [
        ...document.querySelectorAll(
          '#appSidebar button, #appSidebar [tabindex="0"], #appSidebar a[href]',
        ),
      ].filter((el) => el.getClientRects().length && !el.disabled);
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  setSidebarOpen(false, false);
}

// Hiển thị thông tin tài khoản đang đăng nhập lên menu avatar góc trên
function renderUserMenu(user) {
  const name = user && user.name ? user.name : "Người dùng";
  const email = user && user.email ? user.email : "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  document.getElementById("userAvatarInitial").innerText = initial;
  document.getElementById("userNameShort").innerText = name;
  document.getElementById("userFullName").innerText = name;
  document.getElementById("userEmailText").innerText = email;
  startNotificationPolling();
}

// Mở / đóng dropdown menu tài khoản
function toggleUserMenu(event) {
  event.stopPropagation();
  document.getElementById("userMenuDropdown").classList.toggle("open");
}

// Mở trang Cấu hình Email (SMTP) từ dropdown tài khoản (chỉ Admin)
function openEmailConfigFromMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("userMenuDropdown").classList.remove("open");
  switchTab("tab-email-config");
}

// Mở trang Nhật ký gửi Email từ dropdown tài khoản (chỉ HR)
function openEmailLogsFromMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("userMenuDropdown").classList.remove("open");
  switchTab("tab-email-logs");
}

// Hàm Đăng xuất
function handleLogout() {
  if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?")) {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("authToken");
    window.location.href = "login.html";
  }
}

function updateRoleContext() {
  // XỬ LÝ ẨN / HIỆN MENU THEO QUYỀN
  renderDynamicMenu();

  // KIỂM TRA CHẶN TRUY CẬP TRANG HIỆN TẠI NẾU KHÔNG CÓ QUYỀN
  checkAccessAndRender(currentTab);
}

// =========================================================================
// DYNAMIC MENU: ẨN / HIỆN MENU THEO QUYỀN VAI TRÒ
// =========================================================================
function getRolePermissions(role) {
  return permissionsMap[role] || [];
}

function hasPermissionForTab(tabId, role) {
  if (tabId === "tab-meetings") return role === "HR" || role === "Mentor";
  if (tabId === "tab-my-meetings") return role === "Intern";
  if (tabId === "tab-reports" && role === "HR") return true; // trang chọn báo cáo luôn mở cho HR
  if (tabId === "tab-programs") return role === "HR" || role === "Admin";
  if (tabId === "tab-my-interns") return role === "Mentor";
  if (tabId === "tab-weekly-reports") return role === "Mentor";
  if (tabId === "tab-evaluations") return role === "Mentor";
  if (tabId === "tab-my-profile") {
    return role === "Intern";
  }
  if (tabId === "tab-my-contracts") {
    return role === "Intern";
  }
  if (tabId === "tab-my-allowances") return role === "Intern";
  if (tabId === "tab-my-support") return role === "Intern";
  if (tabId === "tab-support-requests") return role === "HR";
  if (tabId === "tab-my-schedule") return role === "Intern";
  if (tabId === "tab-my-tasks") return role === "Intern";
  if (tabId === "tab-my-attendance") return role === "Intern";
  if (tabId === "tab-staff-attendance")
    return role === "Mentor" || role === "HR";
  if (tabId === "tab-final-reports") return role === "HR";
  if (tabId === "tab-attendance-report") return role === "HR";
  if (tabId === "tab-completion-rate")
    return role === "HR" && getRolePermissions(role).includes("VIEW_REPORTS");
  if (tabId === "tab-intern-origin-report") return role === "HR";
  if (tabId === "tab-work-schedules") return role === "HR" || role === "Admin";
  if (tabId === "tab-my-leaves") return role === "Intern";
  if (tabId === "tab-candidates") {
    return role === "HR" || role === "Admin";
  }
  if (tabId === "tab-mentors" || tabId === "tab-students") {
    return role === "HR" || role === "Admin";
  }
  if (tabId === "tab-contracts") {
    return role === "HR";
  }
  if (tabId === "tab-allowances") {
    return role === "HR";
  }
  if (tabId === "tab-email-config") {
    return role === "Admin";
  }
  if (tabId === "tab-email-logs") {
    return role === "HR";
  }
  const permDef = PERMISSIONS_DEF.find((p) => p.tabId === tabId);
  if (!permDef) return true; // Tab không bị ràng buộc
  const rolePerms = getRolePermissions(role);
  return rolePerms.includes(permDef.code);
}

function toggleSupportBenefitsSubmenu(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const parentLi = document.getElementById("menuItemSupportBenefits");
  if (!parentLi) return;
  const willOpen = !parentLi.classList.contains("open");
  parentLi.classList.toggle("open", willOpen);
  isSupportBenefitsSubmenuOpen = willOpen;
}

function clickSupportBenefitsParent() {
  const isChildActive =
    currentTab === "tab-support-requests" || currentTab === "tab-allowances";
  if (isChildActive) {
    toggleSupportBenefitsSubmenu();
  } else {
    isSupportBenefitsSubmenuOpen = true;
    switchTab("tab-support-requests");
  }
}

function toggleAttendanceTimeSubmenu(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const parentLi = document.getElementById("menuItemAttendanceTime");
  if (!parentLi) return;
  const willOpen = !parentLi.classList.contains("open");
  parentLi.classList.toggle("open", willOpen);
  isAttendanceTimeSubmenuOpen = willOpen;
}

function clickAttendanceTimeParent() {
  const isChildActive =
    currentTab === "tab-staff-attendance" ||
    currentTab === "tab-work-schedules";
  if (isChildActive) {
    toggleAttendanceTimeSubmenu();
  } else {
    isAttendanceTimeSubmenuOpen = true;
    switchTab("tab-staff-attendance");
  }
}

function renderDynamicMenu() {
  const menuEl = document.getElementById("sidebarMenu");
  menuEl.innerHTML = "";
  const rolePerms = getRolePermissions(currentRole);

  const btnFormUngTuyen = document.getElementById("btnFormUngTuyen");
  if (btnFormUngTuyen) {
    btnFormUngTuyen.style.display = currentRole === "Intern" ? "flex" : "none";
  }

  let allowedCount = 0;

  // US9: Thêm tab "Hồ sơ của tôi" cho vai trò Intern lên đầu menu
  if (currentRole === "Intern") {
    allowedCount += 5;
    const isProfileActive = currentTab === "tab-my-profile";
    const liProfile = document.createElement("li");
    liProfile.className = "nav-item";
    liProfile.innerHTML = `
          <a class="nav-link ${isProfileActive ? "active" : ""}" onclick="switchTab('tab-my-profile')">
            <i class="fa-solid fa-folder-open"></i>
            <span>Hồ sơ của tôi</span>
          </a>
        `;
    menuEl.appendChild(liProfile);

    const liMyContracts = document.createElement("li");
    liMyContracts.className = "nav-item";
    liMyContracts.innerHTML = `
          <a class="nav-link ${currentTab === "tab-my-contracts" ? "active" : ""}" onclick="switchTab('tab-my-contracts')">
            <i class="fa-solid fa-file-contract"></i>
            <span>Hợp đồng của tôi</span>
          </a>
        `;
    menuEl.appendChild(liMyContracts);

    allowedCount++;
    const liMyAllowances = document.createElement("li");
    liMyAllowances.className = "nav-item";
    liMyAllowances.innerHTML = `
          <a class="nav-link ${currentTab === "tab-my-allowances" ? "active" : ""}" onclick="switchTab('tab-my-allowances')">
            <i class="fa-solid fa-hand-holding-dollar"></i>
            <span>Phụ cấp của tôi</span>
          </a>
        `;
    menuEl.appendChild(liMyAllowances);

    allowedCount++;
    const liSupport = document.createElement("li");
    liSupport.className = "nav-item";
    liSupport.innerHTML = `<a class="nav-link ${currentTab === "tab-my-support" ? "active" : ""}" onclick="switchTab('tab-my-support')"><i class="fa-solid fa-file-circle-question"></i><span>Yêu cầu hỗ trợ</span></a>`;
    menuEl.appendChild(liSupport);
    const liMySchedule = document.createElement("li");
    liMySchedule.className = "nav-item";
    liMySchedule.innerHTML = `<a class="nav-link ${currentTab === "tab-my-schedule" ? "active" : ""}" onclick="switchTab('tab-my-schedule')"><i class="fa-solid fa-calendar-days"></i><span>Lịch thực tập của tôi</span></a>`;
    menuEl.appendChild(liMySchedule);

    const liMyTasks = document.createElement("li");
    liMyTasks.className = "nav-item";
    liMyTasks.innerHTML = `<a class="nav-link ${currentTab === "tab-my-tasks" ? "active" : ""}" onclick="switchTab('tab-my-tasks')"><i class="fa-solid fa-list-check"></i><span>Nhiệm vụ của tôi</span></a>`;
    menuEl.appendChild(liMyTasks);

    allowedCount++;
    const liAttendance = document.createElement("li");
    liAttendance.className = "nav-item";
    liAttendance.innerHTML = `<a class="nav-link ${currentTab === "tab-my-attendance" ? "active" : ""}" onclick="switchTab('tab-my-attendance')"><i class="fa-solid fa-clock"></i><span>Chấm công</span></a>`;
    menuEl.appendChild(liAttendance);

    allowedCount++;
    const liMyLeaves = document.createElement("li");
    liMyLeaves.className = "nav-item";
    liMyLeaves.innerHTML = `<a class="nav-link ${currentTab === "tab-my-leaves" ? "active" : ""}" onclick="switchTab('tab-my-leaves')"><i class="fa-solid fa-umbrella-beach"></i><span>Nghỉ phép</span></a>`;
    menuEl.appendChild(liMyLeaves);
  }

  if (["HR", "Mentor", "Intern"].includes(currentRole)) {
    allowedCount++;
    const id = currentRole === "Intern" ? "tab-my-meetings" : "tab-meetings";
    const li = document.createElement("li");
    li.className = "nav-item";
    li.innerHTML = `<a class="nav-link ${currentTab === id ? "active" : ""}" onclick="switchTab('${id}')"><i class="fa-solid fa-calendar-check"></i><span>${currentRole === "Intern" ? "Lịch họp của tôi" : "Lịch họp"}</span></a>`;
    menuEl.appendChild(li);
  }
  PERMISSIONS_DEF.forEach((item) => {
    const isAllowed = rolePerms.includes(item.code);
    if (isAllowed) {
      allowedCount++;
      const li = document.createElement("li");
      li.className = "nav-item";
      const isActive =
        currentTab === item.tabId ||
        (item.tabId === "tab-reports" &&
          currentRole === "HR" &&
          REPORT_SUBTABS.includes(currentTab));
      li.innerHTML = `
            <a class="nav-link ${isActive ? "active" : ""}" onclick="switchTab('${item.tabId}')">
              <i class="fa-solid ${item.icon}"></i>
              <span>${item.name}</span>
            </a>
          `;
      menuEl.appendChild(li);
    }
  });

  // Mục "Cấu hình Email (SMTP)" của Admin nằm trong dropdown tài khoản (cạnh "Hồ sơ").
  const emailCfgMenuItem = document.getElementById("userMenuEmailConfig");
  if (emailCfgMenuItem) {
    emailCfgMenuItem.style.display = currentRole === "Admin" ? "flex" : "none";
    emailCfgMenuItem.classList.toggle(
      "active",
      currentTab === "tab-email-config",
    );
  }

  // Mục "Nhật ký gửi Email" của HR nằm trong dropdown tài khoản (cạnh "Hồ sơ").
  const emailLogsMenuItem = document.getElementById("userMenuEmailLogs");
  if (emailLogsMenuItem) {
    emailLogsMenuItem.style.display = currentRole === "HR" ? "flex" : "none";
    emailLogsMenuItem.classList.toggle(
      "active",
      currentTab === "tab-email-logs",
    );
  }
  if (currentRole === "HR") allowedCount++; // vẫn tính vào số mục được phép

  // Thêm các tab đặc thù cho HR: Hồ sơ ứng tuyển online, Mentor & phòng ban, Hồ sơ thực tập sinh, Hợp đồng, Phụ cấp
  if (currentRole === "HR") {
    allowedCount += 5;
    const isCandidateActive = currentTab === "tab-candidates";
    const isMentorActive = currentTab === "tab-mentors";
    const isStudentActive = currentTab === "tab-students";
    const isContractsActive = currentTab === "tab-contracts";
    const isAllowancesActive = currentTab === "tab-allowances";

    const liCand = document.createElement("li");
    liCand.className = "nav-item";
    liCand.innerHTML = `
          <a class="nav-link ${isCandidateActive ? "active" : ""}" onclick="switchTab('tab-candidates')">
            <i class="fa-solid fa-file-lines"></i>
            <span>Hồ sơ ứng tuyển online</span>
          </a>
        `;
    menuEl.appendChild(liCand);

    const liMentor = document.createElement("li");
    liMentor.className = "nav-item";
    liMentor.innerHTML = `
          <a class="nav-link ${isMentorActive ? "active" : ""}" onclick="switchTab('tab-mentors')">
            <i class="fa-solid fa-user-tie"></i>
            <span>Mentor & Phòng ban</span>
          </a>
        `;
    menuEl.appendChild(liMentor);

    const liStudent = document.createElement("li");
    liStudent.className = "nav-item";
    liStudent.innerHTML = `
          <a class="nav-link ${isStudentActive ? "active" : ""}" onclick="switchTab('tab-students')">
            <i class="fa-solid fa-id-card"></i>
            <span>Hồ sơ thực tập sinh</span>
          </a>
        `;
    menuEl.appendChild(liStudent);

    const liContracts = document.createElement("li");
    liContracts.className = "nav-item";
    liContracts.innerHTML = `
          <a class="nav-link ${isContractsActive ? "active" : ""}" onclick="switchTab('tab-contracts')">
            <i class="fa-solid fa-file-contract"></i>
            <span>Quản lý hợp đồng</span>
          </a>
        `;
    menuEl.appendChild(liContracts);

    allowedCount += 2;
    const isSupportActive = currentTab === "tab-support-requests";
    const isGroupActive = isSupportActive || isAllowancesActive;
    const isOpen =
      isSupportBenefitsSubmenuOpen !== null
        ? isSupportBenefitsSubmenuOpen
        : isGroupActive;

    const liGroup = document.createElement("li");
    liGroup.id = "menuItemSupportBenefits";
    liGroup.className = `nav-item nav-has-submenu ${isOpen ? "open" : ""}`;
    liGroup.innerHTML = `
            <a class="nav-link ${isGroupActive ? "parent-active" : ""}" onclick="clickSupportBenefitsParent()">
              <i class="fa-solid fa-handshake-angle"></i>
              <span style="flex:1;">Quản lý hỗ trợ &amp; quyền lợi</span>
              <i class="fa-solid fa-chevron-down submenu-arrow" onclick="toggleSupportBenefitsSubmenu(event)"></i>
            </a>
            <ul class="nav-submenu">
              <li class="nav-item">
                <a class="nav-link ${isSupportActive ? "active" : ""}" onclick="switchTab('tab-support-requests')">
                  <i class="fa-solid fa-file-circle-question"></i>
                  <span>Yêu cầu hỗ trợ</span>
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link ${isAllowancesActive ? "active" : ""}" onclick="switchTab('tab-allowances')">
                  <i class="fa-solid fa-hand-holding-dollar"></i>
                  <span>Phụ cấp thực tập sinh</span>
                </a>
              </li>
            </ul>
          `;
    menuEl.appendChild(liGroup);

    // Báo cáo cuối kỳ / chuyên cần nằm trong trang "Báo cáo & Thống kê"; nếu HR bị thu quyền VIEW_REPORTS thì vẫn giữ lối vào.
    if (!rolePerms.includes("VIEW_REPORTS")) {
      allowedCount++;
      const liReportsHub = document.createElement("li");
      liReportsHub.className = "nav-item";
      const hubActive =
        currentTab === "tab-reports" || REPORT_SUBTABS.includes(currentTab);
      liReportsHub.innerHTML = `<a class="nav-link ${hubActive ? "active" : ""}" onclick="switchTab('tab-reports')"><i class="fa-solid fa-chart-line"></i><span>Báo cáo &amp; Thống kê</span></a>`;
      menuEl.appendChild(liReportsHub);
    }
  }

  if (currentRole === "HR" || currentRole === "Admin") {
    allowedCount++;
    const liPrograms = document.createElement("li");
    liPrograms.className = "nav-item";
    liPrograms.innerHTML = `<a class="nav-link ${currentTab === "tab-programs" ? "active" : ""}" onclick="switchTab('tab-programs')"><i class="fa-solid fa-calendar-days"></i><span>Chương trình thực tập</span></a>`;
    menuEl.appendChild(liPrograms);
  }

  if (currentRole === "HR") {
    allowedCount += 2;
    const isStaffAttendanceActive = currentTab === "tab-staff-attendance";
    const isWorkSchedulesActive = currentTab === "tab-work-schedules";
    const isAttendanceGroupActive =
      isStaffAttendanceActive || isWorkSchedulesActive;
    const isAttendanceOpen =
      isAttendanceTimeSubmenuOpen !== null
        ? isAttendanceTimeSubmenuOpen
        : isAttendanceGroupActive;

    const liAttendanceGroup = document.createElement("li");
    liAttendanceGroup.id = "menuItemAttendanceTime";
    liAttendanceGroup.className = `nav-item nav-has-submenu ${isAttendanceOpen ? "open" : ""}`;
    liAttendanceGroup.innerHTML = `
            <a class="nav-link ${isAttendanceGroupActive ? "parent-active" : ""}" onclick="clickAttendanceTimeParent()">
              <i class="fa-solid fa-user-clock"></i>
              <span style="flex:1;">Quản lý chấm công &amp; thời gian</span>
              <i class="fa-solid fa-chevron-down submenu-arrow" onclick="toggleAttendanceTimeSubmenu(event)"></i>
            </a>
            <ul class="nav-submenu">
              <li class="nav-item">
                <a class="nav-link ${isStaffAttendanceActive ? "active" : ""}" onclick="switchTab('tab-staff-attendance')">
                  <i class="fa-solid fa-clock"></i>
                  <span>Chấm công thực tập sinh</span>
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link ${isWorkSchedulesActive ? "active" : ""}" onclick="switchTab('tab-work-schedules')">
                  <i class="fa-solid fa-calendar-week"></i>
                  <span>Lịch làm việc</span>
                </a>
              </li>
            </ul>
          `;
    menuEl.appendChild(liAttendanceGroup);
  }

  if (currentRole === "Admin") {
    allowedCount++;
    const liWorkSchedules = document.createElement("li");
    liWorkSchedules.className = "nav-item";
    liWorkSchedules.innerHTML = `<a class="nav-link ${currentTab === "tab-work-schedules" ? "active" : ""}" onclick="switchTab('tab-work-schedules')"><i class="fa-solid fa-calendar-week"></i><span>Lịch làm việc</span></a>`;
    menuEl.appendChild(liWorkSchedules);
  }

  if (currentRole === "Mentor") {
    allowedCount++;
    const liMyInterns = document.createElement("li");
    liMyInterns.className = "nav-item";
    liMyInterns.innerHTML = `<a class="nav-link ${currentTab === "tab-my-interns" ? "active" : ""}" onclick="switchTab('tab-my-interns')"><i class="fa-solid fa-user-graduate"></i><span>Thực tập sinh của tôi</span></a>`;
    menuEl.appendChild(liMyInterns);

    const liWeeklyReports = document.createElement("li");
    liWeeklyReports.className = "nav-item";
    liWeeklyReports.innerHTML = `<a class="nav-link ${currentTab === "tab-weekly-reports" ? "active" : ""}" onclick="switchTab('tab-weekly-reports')"><i class="fa-solid fa-clipboard-check"></i><span>Báo cáo tuần</span></a>`;
    menuEl.appendChild(liWeeklyReports);

    const liEvaluations = document.createElement("li");
    liEvaluations.className = "nav-item";
    liEvaluations.innerHTML = `<a class="nav-link ${currentTab === "tab-evaluations" ? "active" : ""}" onclick="switchTab('tab-evaluations')"><i class="fa-solid fa-star"></i><span>Đánh giá thực tập sinh</span></a>`;
    menuEl.appendChild(liEvaluations);

    allowedCount++;
    const liStaffAttendance = document.createElement("li");
    liStaffAttendance.className = "nav-item";
    liStaffAttendance.innerHTML = `<a class="nav-link ${currentTab === "tab-staff-attendance" ? "active" : ""}" onclick="switchTab('tab-staff-attendance')"><i class="fa-solid fa-clock"></i><span>Chấm công thực tập sinh</span></a>`;
    menuEl.appendChild(liStaffAttendance);
  }

  menuEl.querySelectorAll(".nav-link").forEach((link) => {
    link.tabIndex = 0;
    link.setAttribute("role", "button");
  });
  document.getElementById("menuCountBadge").innerText = `${allowedCount} mục`;
}

// CHUYỂN TAB VÀ CHẶN TRUY CẬP TRÊN UI
function switchTab(tabId) {
  setSidebarOpen(false);
  currentTab = tabId;
  document.querySelector(".content-scroll").scrollTop = 0;
  checkAccessAndRender(tabId);
  renderDynamicMenu();
}

function checkAccessAndRender(tabId) {
  const allowed = hasPermissionForTab(tabId, currentRole);
  const forbiddenEl = document.getElementById("forbiddenScreen");

  // Ẩn tất cả các tab
  document
    .querySelectorAll(".tab-pane")
    .forEach((el) => (el.style.display = "none"));

  if (!allowed) {
    // CHƯA CÓ QUYỀN -> HIỆN MÀN HÌNH THÔNG BÁO
    forbiddenEl.style.display = "block";
    const permDef = PERMISSIONS_DEF.find((p) => p.tabId === tabId);
    document.getElementById("forbiddenMessage").innerHTML = `
          Vai trò <b>[${currentRole}]</b> chưa được cấp quyền <b>[${permDef ? permDef.code : "UNKNOWN"}]</b> để vào trang này.<br/>
          Vui lòng liên hệ Admin để được cấp thêm quyền.
        `;
    document.getElementById("pageTitle").innerText = "Chưa có quyền truy cập";
    document.getElementById("pageSubtitle").innerText =
      "Vai trò hiện tại chưa được cấp quyền sử dụng chức năng này";
  } else {
    forbiddenEl.style.display = "none";
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.style.display = "block";

    const permDef = PERMISSIONS_DEF.find((p) => p.tabId === tabId);
    if (permDef) {
      document.getElementById("pageTitle").innerText = permDef.name;
      document.getElementById("pageSubtitle").innerText = "";
      if (tabId === "tab-reports") {
        const isHr = currentRole === "HR";
        const canSeeStats =
          getRolePermissions(currentRole).includes("VIEW_REPORTS");
        document.getElementById("reportsHub").style.display = isHr
          ? "grid"
          : "none";
        document.getElementById("crHubCard").style.display =
          isHr && canSeeStats ? "" : "none";
        document.getElementById("reportsOverviewCard").style.display =
          canSeeStats ? "block" : "none";
        if (canSeeStats) loadReports();
      }
      if (tabId === "tab-tasks") loadTasksTab();
      if (tabId === "tab-submissions") {
        document.getElementById("pageSubtitle").innerText =
          "Nộp báo cáo kết quả thực tập mỗi tuần (hạn nộp: hết Chủ nhật)";
        loadWeeklyReportsTab();
      }
    } else if (tabId === "tab-meetings" || tabId === "tab-my-meetings") {
      document.getElementById("pageTitle").textContent =
        tabId === "tab-my-meetings" ? "Lịch họp của tôi" : "Lịch họp";
      setupMeetingPage(tabId === "tab-my-meetings");
    } else if (tabId === "tab-my-profile") {
      document.getElementById("pageTitle").innerText = "Hồ Sơ Của Tôi";
      document.getElementById("pageSubtitle").innerText =
        "Tải lên CV và Đơn xin thực tập để hoàn thiện hồ sơ ứng tuyển (US 9)";
      loadMyDocuments();
    } else if (tabId === "tab-my-contracts") {
      document.getElementById("pageTitle").innerText = "Hợp Đồng Của Tôi";
      document.getElementById("pageSubtitle").innerText =
        "Xem và xác nhận hợp đồng thực tập do HR gửi";
      loadMyContracts();
    } else if (tabId === "tab-my-support") {
      document.getElementById("pageTitle").innerText = "Yêu cầu hỗ trợ";
      loadSupportMine();
    } else if (tabId === "tab-support-requests") {
      document.getElementById("pageTitle").innerText = "Yêu cầu hỗ trợ";
      loadSupportHr();
    } else if (tabId === "tab-my-allowances") {
      document.getElementById("pageTitle").innerText = "Phụ Cấp Của Tôi";
      document.getElementById("pageSubtitle").innerText =
        "Xem lịch sử các khoản phụ cấp bạn được hưởng để theo dõi thu nhập";
      loadMyAllowances();
    } else if (tabId === "tab-my-tasks") {
      document.getElementById("pageTitle").innerText = "Nhiệm vụ của tôi";
      document.getElementById("pageSubtitle").innerText =
        "Các nhiệm vụ mentor đã giao cho bạn";
      loadMyTasks();
    } else if (tabId === "tab-my-attendance") {
      document.getElementById("pageTitle").innerText = "Chấm công";
      document.getElementById("pageSubtitle").innerText =
        "Ghi nhận thời gian làm việc theo giờ Việt Nam";
      loadAttendanceTab();
      loadAttendanceScheduleInfo();
    } else if (tabId === "tab-staff-attendance") {
      document.getElementById("pageTitle").innerText =
        "Chấm công thực tập sinh";
      document.getElementById("pageSubtitle").innerText =
        "Xem giờ làm việc và duyệt đề nghị bổ sung check-out";
      loadStaffAttendanceTab();
      loadStaffPendingLeaves();
    } else if (tabId === "tab-final-reports") {
      document.getElementById("pageTitle").innerText = "Báo cáo cuối kỳ";
      document.getElementById("pageSubtitle").innerText =
        "Tổng hợp đánh giá và xuất báo cáo cho nhà trường";
      loadFinalReports();
    } else if (tabId === "tab-attendance-report") {
      document.getElementById("pageTitle").innerText = "Báo cáo chuyên cần";
      document.getElementById("pageSubtitle").innerText =
        "Tổng hợp đi làm, nghỉ phép và vắng mặt";
      loadAttendanceReport();
    } else if (tabId === "tab-completion-rate") {
      document.getElementById("pageTitle").innerText =
        "Tỷ lệ hoàn thành chương trình";
      document.getElementById("pageSubtitle").innerText =
        "Kết quả hồ sơ theo chương trình và mentor";
      loadCompletionRate();
    } else if (tabId === "tab-intern-origin-report") {
      document.getElementById("pageTitle").innerText =
        "Thống kê thực tập sinh theo trường / ngành";
      document.getElementById("pageSubtitle").innerText =
        "Phân tích nguồn ứng viên";
      loadInternOriginReport();
    } else if (tabId === "tab-work-schedules") {
      document.getElementById("pageTitle").innerText = "Lịch làm việc";
      document.getElementById("pageSubtitle").innerText =
        "Thiết lập lịch làm việc linh hoạt cho từng nhóm thực tập sinh";
      loadWorkSchedulesTab();
    } else if (tabId === "tab-my-leaves") {
      document.getElementById("pageTitle").innerText = "Nghỉ phép";
      document.getElementById("pageSubtitle").innerText =
        "Xin nghỉ và theo dõi trạng thái duyệt";
      loadMyLeaves();
    } else if (tabId === "tab-my-schedule") {
      document.getElementById("pageTitle").innerText = "Lịch thực tập của tôi";
      document.getElementById("pageSubtitle").innerText =
        "Kế hoạch và các mốc trong kỳ thực tập (US 10)";
      loadMySchedule();
    } else if (tabId === "tab-candidates") {
      document.getElementById("pageTitle").innerText = "Hồ Sơ Ứng Tuyển Online";
      document.getElementById("pageSubtitle").innerText =
        "Danh sách sinh viên nộp đơn tham gia chương trình thực tập (US 3)";
      loadCandidates();
    } else if (tabId === "tab-mentors") {
      document.getElementById("pageTitle").innerText =
        "Quản Lý Mentor & Phòng Ban";
      document.getElementById("pageSubtitle").innerText =
        "HR thêm mới / chỉnh sửa mentor để phân công hướng dẫn thực tập sinh";
      loadMentors();
    } else if (tabId === "tab-students") {
      document.getElementById("pageTitle").innerText =
        "Quản Lý Hồ Sơ Thực Tập Sinh";
      document.getElementById("pageSubtitle").innerText =
        "HR thêm mới / chỉnh sửa thông tin cá nhân của thực tập sinh";
      loadMentorsForSelect();
      loadStudents();
    } else if (tabId === "tab-weekly-reports") {
      document.getElementById("pageTitle").innerText =
        "Báo cáo tuần của thực tập sinh";
      document.getElementById("pageSubtitle").innerText =
        "Theo dõi thực tập sinh nộp báo cáo đúng hạn hay chưa";
      loadMentorWeeklyReports();
    } else if (tabId === "tab-evaluations") {
      document.getElementById("pageTitle").innerText = "Đánh giá thực tập sinh";
      document.getElementById("pageSubtitle").innerText =
        "Đánh giá kỹ năng và thái độ của thực tập sinh để tổng kết kỳ thực tập";
      loadMentorEvaluations();
    } else if (tabId === "tab-my-interns") {
      document.getElementById("pageTitle").innerText = "Thực tập sinh của tôi";
      document.getElementById("pageSubtitle").innerText =
        "Danh sách thực tập sinh được HR phân công cho bạn";
      loadMyAssignedInterns();
    } else if (tabId === "tab-allowances") {
      document.getElementById("pageTitle").innerText = "Phụ Cấp Thực Tập Sinh";
      document.getElementById("pageSubtitle").innerText =
        "HR nhập và theo dõi các khoản phụ cấp của thực tập sinh để quản lý quyền lợi";
      loadAllowanceOverview();
    } else if (tabId === "tab-contracts") {
      document.getElementById("pageTitle").innerText =
        "Quản Lý Hợp Đồng Thực Tập";
      document.getElementById("pageSubtitle").innerText =
        "HR tải lên, xem, tải xuống và xóa hợp đồng gắn với hồ sơ thực tập sinh";
      loadStudents();
    } else if (tabId === "tab-programs") {
      document.getElementById("pageTitle").innerText = "Chương trình thực tập";
      document.getElementById("pageSubtitle").innerText =
        "Tổ chức kế hoạch thực tập theo phòng ban";
      programLoad();
    } else if (tabId === "tab-email-config") {
      document.getElementById("pageTitle").innerText = "Cấu Hình Email & SMTP";
      document.getElementById("pageSubtitle").innerText =
        "Thiết lập máy chủ SMTP gửi thông báo kết quả duyệt hồ sơ ứng viên (US 8)";
      loadEmailConfig();
    } else if (tabId === "tab-email-logs") {
      document.getElementById("pageTitle").innerText = "Nhật Ký Gửi Email";
      document.getElementById("pageSubtitle").innerText =
        "Theo dõi trạng thái gửi email thông báo xét duyệt & thử lại khi thất bại (US 8)";
      loadEmailLogs(1);
    }
  }
}

// ---- Báo cáo & Thống kê: số liệu thật từ GET /api/reports ----
function formatReportRate(rate) {
  return rate === null || rate === undefined ? "--" : `${rate}%`;
}

async function loadReports() {
  const status = document.getElementById("reportsStatus");
  const grid = document.getElementById("reportsGrid");
  status.className = "report-status";
  status.textContent = "Đang tải số liệu thống kê...";
  grid.style.display = "none";
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      headers: authHeaders(),
    });
    if (res.status === 401) {
      return forceLogout("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!");
    }
    if (!res.ok) {
      throw new Error(
        await readErrorMessage(res, "Không tải được số liệu thống kê."),
      );
    }
    const data = await res.json();
    const { applications, interns, contracts, rates } = data;
    const reviewed = applications.approved + applications.rejected;
    document.getElementById("reportApprovalRate").textContent =
      formatReportRate(rates.applicationApproval);
    document.getElementById("reportApprovalDetail").textContent =
      `${applications.approved}/${reviewed} hồ sơ đã xử lý (${applications.pending} đang chờ duyệt)`;
    document.getElementById("reportContractRate").textContent =
      formatReportRate(rates.contractConfirmation);
    document.getElementById("reportContractDetail").textContent =
      `${contracts.confirmed}/${contracts.total} hợp đồng`;
    document.getElementById("reportMentorRate").textContent = formatReportRate(
      rates.internMentorAssigned,
    );
    document.getElementById("reportMentorDetail").textContent =
      `${interns.assigned}/${interns.total} thực tập sinh`;
    status.textContent = "";
    grid.style.display = "flex";
  } catch (err) {
    status.className = "report-status is-error";
    status.textContent = err.message || "Không tải được số liệu thống kê.";
  }
}

function switchToFirstAllowedTab() {
  switchTab(getDefaultTabForRole(currentRole));
}

function getDefaultTabForRole(role) {
  if (role === "Intern") return "tab-my-profile";

  const rolePerms = getRolePermissions(role);
  const firstDefAllowed = PERMISSIONS_DEF.find((p) =>
    rolePerms.includes(p.code),
  );
  if (firstDefAllowed) return firstDefAllowed.tabId;

  // HR/Admin luôn có quyền vào các mục quản lý Mentor/Hồ sơ thực tập sinh/Ứng viên
  if (role === "HR" || role === "Admin") return "tab-mentors";

  // Vai trò chưa được Admin cấp bất kỳ quyền nào -> vẫn trả về 1 tab hợp lệ
  // để checkAccessAndRender hiển thị đúng màn "Chưa có quyền truy cập"
  return "tab-users";
}
