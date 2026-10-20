// ============================================================================
// ZHONGWEN CLASS - QUẢN LÝ LỚP HỌC TIẾNG TRUNG ONLINE
// ============================================================================

const STORAGE_KEY = "zhongwen_class_manager_data_v1";

// Khởi tạo trạng thái ứng dụng
let appState = {
  teacherSettings: null,
  classes: [],
  students: [],
  sessions: [],
  payments: []
};

// ============================================================================
// KHỞI ĐỘNG & NẠP DỮ LIỆU TỪ LOCALSTORAGE
// ============================================================================
function initApp() {
  loadDataFromStorage();

  // Đặt giá trị mặc định cho ô chọn tháng tính phí là tháng hiện tại (YYYY-MM)
  const currentMonthStr = getCurrentMonthString();
  const monthInput = document.getElementById("select-tuition-month");
  if (monthInput && !monthInput.value) {
    monthInput.value = currentMonthStr;
  }

  // Ngày mặc định cho modal điểm danh là hôm nay (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];
  const attDateInput = document.getElementById("att-date");
  if (attDateInput) attDateInput.value = todayStr;

  // Render toàn bộ giao diện
  updateDashboardStats();
  populateClassDropdowns();
  renderClasses();
  renderAttendanceHistory();
  renderTuitionManagement();
  renderWeeklySchedule();
  renderQuickSampleStudents();
}

function syncSchedulesToSessions() {
  if (!appState.schedules || !appState.sessions) return;
  appState.schedules.forEach(sched => {
    // Nếu ngày này từng bị xóa khỏi lịch thì không đồng bộ lại
    const isCancelled = (appState.cancelledClassDates || []).some(c => c.classId === sched.classId && c.date === sched.date);
    if (isCancelled) return;

    let existing = appState.sessions.find(s => s.classId === sched.classId && s.date === sched.date);
    if (!existing) {
      appState.sessions.push({
        id: "ses-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        classId: sched.classId,
        date: sched.date,
        sessionTime: sched.time || "",
        lessonTopic: sched.topic || "Buổi học Tiếng Trung",
        homework: "",
        attendance: {}
      });
    } else {
      if (sched.time) existing.sessionTime = sched.time;
      if (sched.topic && (!existing.lessonTopic || existing.lessonTopic === "Buổi học Tiếng Trung")) {
        existing.lessonTopic = sched.topic;
      }
    }
  });
}

function loadDataFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      appState.teacherSettings = parsed.teacherSettings || DEFAULT_TEACHER_SETTINGS;
      appState.classes = parsed.classes || DEFAULT_CLASSES;
      appState.students = parsed.students || DEFAULT_STUDENTS;
      appState.sessions = parsed.sessions || DEFAULT_SESSIONS;
      appState.payments = parsed.payments || DEFAULT_PAYMENTS;
      appState.schedules = parsed.schedules || (typeof DEFAULT_SCHEDULES !== "undefined" ? [...DEFAULT_SCHEDULES] : []);
      appState.cancelledClassDates = parsed.cancelledClassDates || [];

      // Reset lại số buổi dạy tháng này: xóa dữ liệu điểm danh mẫu ban đầu, có điểm danh xong mới tính 1 buổi
      if (!parsed.isAttendanceResetV2) {
        (appState.sessions || []).forEach(s => {
          s.attendance = {};
        });
        appState.payments = [];
        appState.isAttendanceResetV2 = true;
        saveDataToStorage();
      }

      syncSchedulesToSessions();
      return;
    } catch (e) {
      console.error("Lỗi đọc dữ liệu localStorage:", e);
    }
  }

  // Nếu chưa có, nạp dữ liệu mẫu
  appState.teacherSettings = { ...DEFAULT_TEACHER_SETTINGS };
  appState.classes = [...DEFAULT_CLASSES];
  appState.students = [...DEFAULT_STUDENTS];
  appState.sessions = [...DEFAULT_SESSIONS];
  appState.payments = [...DEFAULT_PAYMENTS];
  appState.schedules = typeof DEFAULT_SCHEDULES !== "undefined" ? [...DEFAULT_SCHEDULES] : [];
  appState.cancelledClassDates = [];
  appState.isAttendanceResetV2 = true;
  syncSchedulesToSessions();
  saveDataToStorage();
}

function saveDataToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

// ============================================================================
// CHUYỂN ĐỔI GIAO DIỆN & TABS
// ============================================================================
function switchRole(role) {
  // Đã hợp nhất thành 1 trang quản lý chung duy nhất
}

function switchTeacherTab(tabId) {
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-tab") === tabId);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  if (tabId === "tab-classes") renderClasses();
  if (tabId === "tab-attendance") renderAttendanceHistory();
  if (tabId === "tab-tuition") renderTuitionManagement();
  if (tabId === "tab-schedule") renderWeeklySchedule();
}

// ============================================================================
// DASHBOARD THỐNG KÊ TỔNG QUAN
// ============================================================================
function updateDashboardStats() {
  const totalClasses = appState.classes.length;
  const totalStudents = appState.students.length;

  const currentMonth = getCurrentMonthString();
  // Có điểm danh xong mới tính 1 buổi dạy
  const currentMonthSessions = appState.sessions.filter(s => 
    s.date.startsWith(currentMonth) && 
    s.attendance && 
    Object.keys(s.attendance).length > 0
  );
  const monthLessonsCount = currentMonthSessions.length;

  // Tính tổng học phí tháng hiện tại
  let totalTuitionDue = 0;
  let totalTuitionCollected = 0;

  appState.students.forEach(student => {
    const cls = appState.classes.find(c => c.id === student.classId);
    if (!cls) return;

    // Số buổi đã tham gia tháng này
    const attendedCount = currentMonthSessions.filter(s => 
      s.classId === cls.id && s.attendance && s.attendance[student.id] === "present"
    ).length;

    let dueAmount = 0;
    if (cls.feeType === "per_lesson") {
      dueAmount = attendedCount * (cls.feeAmount || 0);
    } else {
      // Gói tháng: nếu trong tháng có ít nhất 1 buổi học hoặc có trong danh sách
      dueAmount = cls.feeAmount || 0;
    }

    // Đã nộp
    const payment = appState.payments.find(p => p.studentId === student.id && p.month === currentMonth);
    const paidAmount = payment ? payment.amountPaid : 0;

    totalTuitionDue += dueAmount;
    totalTuitionCollected += paidAmount;
  });

  const pendingAmount = Math.max(0, totalTuitionDue - totalTuitionCollected);

  // Hiển thị DOM
  document.getElementById("stat-total-classes").innerText = totalClasses;
  document.getElementById("stat-total-students").innerText = totalStudents;
  document.getElementById("stat-month-lessons").innerText = monthLessonsCount;
  document.getElementById("stat-month-name").innerText = `Tháng ${formatMonthDisplay(currentMonth)}`;

  document.getElementById("stat-month-tuition").innerText = formatVND(totalTuitionDue);
  document.getElementById("stat-collected-tuition").innerText = formatVND(totalTuitionCollected);
  document.getElementById("stat-pending-tuition").innerText = formatVND(pendingAmount);
}

// ============================================================================
// TAB 1: QUẢN LÝ LỚP HỌC
// ============================================================================
function renderClasses() {
  const container = document.getElementById("classes-list-container");
  if (!container) return;

  const searchTerm = (document.getElementById("search-class-input")?.value || "").toLowerCase().trim();
  const levelFilter = document.getElementById("filter-level-select")?.value || "all";

  const filtered = appState.classes.filter(cls => {
    const matchName = cls.name.toLowerCase().includes(searchTerm) || (cls.notes && cls.notes.toLowerCase().includes(searchTerm));
    const matchLevel = levelFilter === "all" || cls.level.includes(levelFilter);
    return matchName && matchLevel;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white; border-radius: 10px; border: 1px dashed var(--border-color);">
        <p style="color: var(--text-muted); font-size: 15px;">Chưa có lớp học nào phù hợp với bộ lọc.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="openClassModal()">+ Thêm Lớp Mới</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(cls => {
    const studentCount = appState.students.filter(s => s.classId === cls.id).length;
    // Chỉ tính số buổi đã thực sự điểm danh xong
    const sessionCount = appState.sessions.filter(s => s.classId === cls.id && s.attendance && Object.keys(s.attendance).length > 0).length;

    // Chỉ hiển thị cấp độ nếu có điền
    const levelBadgeHtml = cls.level 
      ? `<span class="class-badge">${escapeHtml(cls.level)}</span>` 
      : "";

    // Chỉ hiển thị học phí nếu có điền và lớn hơn 0
    const hasFee = cls.feeAmount && cls.feeAmount > 0;
    const feeText = hasFee 
      ? (cls.feeType === "per_lesson" ? `${formatVND(cls.feeAmount)} / buổi` : `${formatVND(cls.feeAmount)} / tháng`) 
      : "";
    const feeTypeLabel = hasFee 
      ? `<span style="font-size: 12px; color: var(--text-muted);">${cls.feeType === "per_lesson" ? "Học phí theo buổi" : "Trọn gói tháng"}</span>` 
      : "";

    // Xử lý lịch học: chỉ hiển thị nếu có điền
    let scheduleDetailHtml = "";
    if (cls.scheduleDays && cls.scheduleTime) {
      scheduleDetailHtml = `
        <div class="detail-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Lịch: <strong>${escapeHtml(cls.scheduleDays)}</strong> (${escapeHtml(cls.scheduleTime)})</span>
        </div>
      `;
    } else if (cls.scheduleDays) {
      scheduleDetailHtml = `
        <div class="detail-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Lịch: <strong>${escapeHtml(cls.scheduleDays)}</strong></span>
        </div>
      `;
    } else if (cls.scheduleTime) {
      scheduleDetailHtml = `
        <div class="detail-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Giờ học: <strong>${escapeHtml(cls.scheduleTime)}</strong></span>
        </div>
      `;
    }

    return `
      <div class="class-card">
        <div>
          ${(levelBadgeHtml || feeTypeLabel) ? `
            <div class="class-card-header">
              ${levelBadgeHtml}
              ${feeTypeLabel}
            </div>
          ` : ""}

          <h3 class="class-card-title">${escapeHtml(cls.name)}</h3>

          <div class="class-card-details">
            ${scheduleDetailHtml}
            <div class="detail-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span>Học viên: <strong>${studentCount} bạn</strong></span>
            </div>
            ${hasFee ? `
              <div class="detail-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Học phí: <strong>${feeText}</strong></span>
              </div>
            ` : ""}
            <div class="detail-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
              <span>Đã dạy: <strong>${sessionCount} buổi</strong></span>
            </div>

            ${cls.onlineLink ? `
              <a href="${escapeHtml(cls.onlineLink)}" target="_blank" rel="noopener" class="online-link-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5-5m0 0l-5-5m5 5H9a8 8 0 0 0 0 16h3"/></svg>
                Vào phòng học Online
              </a>
            ` : ""}

            ${cls.notes ? `
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; font-style: italic;">
                ${escapeHtml(cls.notes)}
              </div>
            ` : ""}
          </div>
        </div>

        <div class="class-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="openClassStudentsModal('${cls.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Học Viên (${studentCount})
          </button>
          <div class="class-actions" style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" title="Chỉnh sửa lớp" onclick="openEditClassModal('${cls.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Sửa
            </button>
            <button class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: #fca5a5; background: #fff5f5;" title="Xóa lớp học" onclick="deleteClass('${cls.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Xóa
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function openClassModal() {
  document.getElementById("modal-class-title").innerText = "Thêm Lớp Học Tiếng Trung Mới";
  document.getElementById("class-id").value = "";
  document.getElementById("form-class").reset();
  document.getElementById("class-level").value = "";
  document.getElementById("class-fee-amount").value = "";
  const deleteWrapper = document.getElementById("modal-class-delete-action");
  if (deleteWrapper) deleteWrapper.innerHTML = "";
  toggleFeeUnitLabel();
  openModal("modal-class");
}

function openEditClassModal(classId) {
  const cls = appState.classes.find(c => c.id === classId);
  if (!cls) return;

  document.getElementById("modal-class-title").innerText = "Chỉnh Sửa Lớp Học";
  document.getElementById("class-id").value = cls.id;
  document.getElementById("class-name").value = cls.name;
  document.getElementById("class-level").value = cls.level || "";
  document.getElementById("class-schedule-days").value = cls.scheduleDays || "";
  document.getElementById("class-schedule-time").value = cls.scheduleTime || "";
  document.getElementById("class-fee-type").value = cls.feeType || "per_lesson";
  document.getElementById("class-fee-amount").value = cls.feeAmount ? formatNumberWithDots(cls.feeAmount) : "";
  document.getElementById("class-online-link").value = cls.onlineLink || "";
  document.getElementById("class-notes").value = cls.notes || "";

  const deleteWrapper = document.getElementById("modal-class-delete-action");
  if (deleteWrapper) {
    deleteWrapper.innerHTML = `
      <button type="button" class="btn btn-danger btn-sm" onclick="deleteClass('${cls.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Xóa Lớp Học Này
      </button>
    `;
  }

  toggleFeeUnitLabel();
  openModal("modal-class");
}

function toggleFeeUnitLabel() {
  const feeType = document.getElementById("class-fee-type").value;
  const label = document.getElementById("fee-amount-label");
  if (label) {
    label.innerText = feeType === "per_lesson" ? "Học phí mỗi buổi (VNĐ)" : "Học phí trọn gói theo tháng (VNĐ)";
  }
}

function handleSaveClass(e) {
  e.preventDefault();
  const classId = document.getElementById("class-id").value;
  const name = document.getElementById("class-name").value.trim() || "Lớp Tiếng Trung mới";
  const level = document.getElementById("class-level").value.trim(); // có thể để trống
  const scheduleDays = document.getElementById("class-schedule-days").value.trim(); // có thể để trống
  const scheduleTime = document.getElementById("class-schedule-time").value.trim(); // có thể để trống
  const feeType = document.getElementById("class-fee-type").value || "per_lesson";
  const feeAmount = parseNumberFromDots(document.getElementById("class-fee-amount").value); // bóc tách số từ định dạng chấm
  const onlineLink = document.getElementById("class-online-link").value.trim(); // có thể để trống
  const notes = document.getElementById("class-notes").value.trim(); // có thể để trống

  if (classId) {
    // Sửa lớp
    const cls = appState.classes.find(c => c.id === classId);
    if (cls) {
      cls.name = name;
      cls.level = level;
      cls.scheduleDays = scheduleDays;
      cls.scheduleTime = scheduleTime;
      cls.feeType = feeType;
      cls.feeAmount = feeAmount;
      cls.onlineLink = onlineLink;
      cls.notes = notes;
      showToast("Đã cập nhật thông tin lớp học!");
    }
  } else {
    // Thêm lớp mới
    const newClass = {
      id: "cls-" + Date.now().toString(36),
      name,
      level,
      scheduleDays,
      scheduleTime,
      feeType,
      feeAmount,
      onlineLink,
      notes,
      createdAt: new Date().toISOString().split("T")[0]
    };
    appState.classes.push(newClass);
    showToast("Đã tạo lớp học mới thành công!");
  }

  saveDataToStorage();
  closeModal("modal-class");
  populateClassDropdowns();
  renderClasses();
  updateDashboardStats();
  renderCalendar();
}

let pendingDeleteClassId = null;

function deleteClass(classId) {
  const cls = appState.classes.find(c => c.id === classId);
  if (!cls) return;

  pendingDeleteClassId = classId;
  const count = appState.students.filter(s => s.classId === classId).length;
  const msgEl = document.getElementById("confirm-delete-msg");
  if (msgEl) {
    msgEl.innerHTML = `Bạn có chắc chắn muốn xóa lớp <strong>"${escapeHtml(cls.name)}"</strong>?<br><small style="color: var(--danger);">(Lớp hiện có ${count} học viên. Toàn bộ học viên và điểm danh thuộc lớp sẽ bị xóa)</small>`;
  }

  const confirmBtn = document.getElementById("btn-execute-delete-class");
  if (confirmBtn) {
    confirmBtn.onclick = executeDeleteClass;
  }
  openModal("modal-confirm-delete");
}

function executeDeleteClass() {
  if (!pendingDeleteClassId) return;
  const classId = pendingDeleteClassId;
  pendingDeleteClassId = null;

  appState.classes = appState.classes.filter(c => c.id !== classId);
  appState.students = appState.students.filter(s => s.classId !== classId);
  appState.sessions = appState.sessions.filter(s => s.classId !== classId);
  appState.payments = appState.payments.filter(p => p.classId !== classId);
  appState.schedules = (appState.schedules || []).filter(s => s.classId !== classId);

  saveDataToStorage();
  closeModal("modal-confirm-delete");
  closeModal("modal-class");
  populateClassDropdowns();
  renderClasses();
  updateDashboardStats();
  renderAttendanceHistory();
  renderTuitionManagement();
  renderCalendar();
  showToast("Đã xóa lớp học thành công!");
}

// ============================================================================
// MODAL QUẢN LÝ DANH SÁCH HỌC VIÊN CỦA LỚP
// ============================================================================
let currentManagingClassId = null;

function openClassStudentsModal(classId) {
  currentManagingClassId = classId;
  const cls = appState.classes.find(c => c.id === classId);
  if (!cls) return;

  document.getElementById("modal-class-students-title").innerText = `Danh Sách Học Viên: ${cls.name}`;
  document.getElementById("modal-class-students-sub").innerText = `Lịch: ${cls.scheduleDays} (${cls.scheduleTime})`;

  renderClassStudentsTable(classId);
  openModal("modal-students-list");
}

function renderClassStudentsTable(classId) {
  const tbody = document.getElementById("modal-class-students-tbody");
  if (!tbody) return;

  const students = appState.students.filter(s => s.classId === classId);

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
          Lớp này chưa có học viên. Nhấn nút "Thêm Học Viên Vào Lớp" bên trên để thêm học viên mới.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.code || "HV")}</strong></td>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td><span style="font-family: var(--font-cn); color: var(--primary); font-weight: 500;">${escapeHtml(s.chineseName || "-")}</span></td>
      <td>${escapeHtml(s.phone)}</td>
      <td>${escapeHtml(s.joinDate || "-")}</td>
      <td><small style="color: var(--text-muted);">${escapeHtml(s.note || "-")}</small></td>
      <td>
        <div style="display: flex; gap: 4px;">
          <button class="btn-icon" style="width: 28px; height: 28px;" title="Sửa học viên" onclick="openEditStudentModal('${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon" style="width: 28px; height: 28px;" title="Xóa học viên" onclick="deleteStudent('${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openAddStudentModal() {
  document.getElementById("modal-student-form-title").innerText = "Thêm Học Viên Mới";
  document.getElementById("form-student").reset();
  document.getElementById("student-id").value = "";
  document.getElementById("student-target-class-id").value = currentManagingClassId || "";
  document.getElementById("student-join-date").value = new Date().toISOString().split("T")[0];

  // Tự sinh mã học viên gợi ý
  const nextNumber = appState.students.length + 1;
  document.getElementById("student-code").value = "HV" + String(nextNumber).padStart(3, "0");

  openModal("modal-student-form");
}

function openEditStudentModal(studentId) {
  const s = appState.students.find(item => item.id === studentId);
  if (!s) return;

  document.getElementById("modal-student-form-title").innerText = "Chỉnh Sửa Học Viên";
  document.getElementById("student-id").value = s.id;
  document.getElementById("student-target-class-id").value = s.classId;
  document.getElementById("student-name").value = s.name;
  document.getElementById("student-chinese-name").value = s.chineseName || "";
  document.getElementById("student-phone").value = s.phone;
  document.getElementById("student-code").value = s.code || "";
  document.getElementById("student-join-date").value = s.joinDate || "";
  document.getElementById("student-note").value = s.note || "";

  openModal("modal-student-form");
}

function handleSaveStudent(e) {
  e.preventDefault();
  const studentId = document.getElementById("student-id").value;
  const classId = document.getElementById("student-target-class-id").value;
  const name = document.getElementById("student-name").value.trim();
  const chineseName = document.getElementById("student-chinese-name").value.trim();
  const phone = document.getElementById("student-phone").value.trim();
  const code = document.getElementById("student-code").value.trim() || ("HV" + Math.floor(100 + Math.random() * 900));
  const joinDate = document.getElementById("student-join-date").value;
  const note = document.getElementById("student-note").value.trim();

  if (studentId) {
    const s = appState.students.find(item => item.id === studentId);
    if (s) {
      s.name = name;
      s.chineseName = chineseName;
      s.phone = phone;
      s.code = code;
      s.joinDate = joinDate;
      s.note = note;
      showToast("Đã cập nhật thông tin học viên!");
    }
  } else {
    const newStudent = {
      id: "hv-" + Date.now().toString(36),
      classId,
      name,
      chineseName,
      phone,
      code,
      joinDate,
      note
    };
    appState.students.push(newStudent);
    showToast("Đã thêm học viên mới vào lớp!");
  }

  saveDataToStorage();
  closeModal("modal-student-form");
  if (currentManagingClassId) {
    renderClassStudentsTable(currentManagingClassId);
  }
  renderClasses();
  updateDashboardStats();
  renderTuitionManagement();
}

function deleteStudent(studentId) {
  const s = appState.students.find(item => item.id === studentId);
  if (!s) return;

  if (!confirm(`Bạn có chắc muốn xóa học viên "${s.name}" khỏi danh sách lớp?`)) {
    return;
  }

  appState.students = appState.students.filter(item => item.id !== studentId);
  saveDataToStorage();

  if (currentManagingClassId) {
    renderClassStudentsTable(currentManagingClassId);
  }
  renderClasses();
  updateDashboardStats();
  renderTuitionManagement();
  showToast("Đã xóa học viên!");
}

// ============================================================================
// TAB 2: ĐIỂM DANH & TỰ TÍNH TỔNG BUỔI HỌC
// ============================================================================
function renderAttendanceHistory() {
  const classSelect = document.getElementById("select-attendance-class");
  if (!classSelect) return;

  const selectedClassId = classSelect.value;
  const cls = appState.classes.find(c => c.id === selectedClassId) || appState.classes[0];
  if (!cls) return;

  if (classSelect.value !== cls.id) {
    classSelect.value = cls.id;
  }

  // Tự động đồng bộ các buổi học từ Thời Khóa Biểu Tuần
  syncSchedulesToSessions();

  const sessions = appState.sessions
    .filter(s => s.classId === cls.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const students = appState.students.filter(s => s.classId === cls.id);

  // Thẻ tóm tắt số buổi của lớp
  const summaryBox = document.getElementById("class-attendance-summary");
  if (summaryBox) {
    const checkedCount = sessions.filter(s => s.attendance && Object.keys(s.attendance).length > 0).length;
    summaryBox.innerHTML = `
      <div>
        <h4>Lớp: ${escapeHtml(cls.name)} (${escapeHtml(cls.level || "Tiếng Trung")})</h4>
        <small style="color: var(--primary);">Lịch học: ${escapeHtml(cls.scheduleDays)} • ${escapeHtml(cls.scheduleTime)}</small>
      </div>
      <div class="attendance-summary-stats">
        <span>Tổng buổi từ Thời Khóa Biểu: <strong>${sessions.length} buổi</strong></span>
        <span>Đã điểm danh: <strong>${checkedCount} buổi</strong></span>
        <span>Sĩ số: <strong>${students.length} bạn</strong></span>
      </div>
    `;
  }

  // Bảng chi tiết từng buổi
  const tbody = document.getElementById("attendance-history-table");
  if (!tbody) return;

  if (sessions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 28px; color: var(--text-muted);">
          Lớp này chưa có buổi học nào. Buổi học được thêm từ tab <strong>Thời Khóa Biểu Tuần</strong> sẽ tự động đồng bộ sang đây để điểm danh.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = sessions.map((session, index) => {
    const sessionNum = sessions.length - index;
    const hasAttendance = session.attendance && Object.keys(session.attendance).length > 0;
    const presentCount = hasAttendance 
      ? Object.values(session.attendance).filter(v => v === "present").length 
      : 0;
    const totalCount = students.length;

    // Danh sách vắng
    const absentNames = hasAttendance 
      ? students.filter(s => session.attendance[s.id] === "absent").map(s => s.name)
      : [];

    let badgeHtml = "";
    let statusHtml = "";
    let actionBtnHtml = "";

    if (!hasAttendance) {
      badgeHtml = `<span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 600;">Chưa điểm danh</span>`;
      statusHtml = `<span style="font-size: 12.5px; color: #d97706; font-weight: 500;">⏱️ Buổi học trên Thời Khóa Biểu (Bấm để check-in)</span>`;
      actionBtnHtml = `<button class="btn btn-primary btn-sm">✓ Điểm danh</button>`;
    } else {
      badgeHtml = `<span class="badge ${presentCount === totalCount ? "badge-success" : (presentCount > 0 ? "badge-info" : "badge-danger")}">
        ${presentCount}/${totalCount} có mặt
      </span>`;
      statusHtml = absentNames.length > 0 
        ? `<span style="font-size: 12.5px; color: var(--danger); font-weight: 500;">Vắng (${absentNames.length}): ${escapeHtml(absentNames.join(", "))}</span>` 
        : `<span style="font-size: 12.5px; color: var(--success); font-weight: 600;">✓ Có mặt đầy đủ</span>`;
      actionBtnHtml = `<span style="color: var(--primary); font-size: 13px; font-weight: 600;">Sửa check-in &rarr;</span>`;
    }

    return `
      <tr style="cursor: pointer;" onclick="openEditAttendanceModal('${session.id}')" title="Bấm trực tiếp vào buổi học để điểm danh">
        <td><strong style="color: var(--primary);">Buổi ${sessionNum}</strong></td>
        <td>
          <strong style="font-size: 13.5px;">${formatDateDisplay(session.date)}</strong>
        </td>
        <td>${badgeHtml}</td>
        <td>${statusHtml}</td>
        <td style="text-align: right;">${actionBtnHtml}</td>
      </tr>
    `;
  }).join("");
}

function openAttendanceModal() {
  document.getElementById("modal-attendance-title").innerText = "Điểm Danh Buổi Học";
  document.getElementById("form-attendance").reset();
  document.getElementById("attendance-session-id").value = "";

  const classSelect = document.getElementById("select-attendance-class");
  let chosenClassId = classSelect ? classSelect.value : "";
  if (!chosenClassId && appState.classes.length > 0) {
    chosenClassId = appState.classes[0].id;
  }

  if (chosenClassId) {
    document.getElementById("att-class-select").value = chosenClassId;
  }

  document.getElementById("att-date").value = new Date().toISOString().split("T")[0];
  renderStudentAttendanceChecklist();
  openModal("modal-attendance");
}

function onAttendanceClassChange() {
  renderStudentAttendanceChecklist();
}

function openEditAttendanceModal(sessionId) {
  const session = appState.sessions.find(s => s.id === sessionId);
  if (!session) return;

  document.getElementById("modal-attendance-title").innerText = `Điểm Danh Buổi Học (${formatDateDisplay(session.date)})`;
  document.getElementById("attendance-session-id").value = session.id;
  document.getElementById("att-class-select").value = session.classId;
  document.getElementById("att-date").value = session.date;

  renderStudentAttendanceChecklist(session.attendance);
  openModal("modal-attendance");
}

function renderStudentAttendanceChecklist(existingAttendance = null) {
  const classId = document.getElementById("att-class-select").value;
  const container = document.getElementById("attendance-students-checklist");
  if (!container) return;

  const students = appState.students.filter(s => s.classId === classId);

  if (students.length === 0) {
    container.innerHTML = `<p style="padding: 16px; color: var(--text-muted); text-align: center;">Lớp này chưa có học viên nào.</p>`;
    return;
  }

  container.innerHTML = students.map(student => {
    const currentStatus = existingAttendance ? (existingAttendance[student.id] || "present") : "present";
    return `
      <div class="attendance-row">
        <div class="attendance-student-meta">
          <span style="font-size: 11px; font-weight: 700; color: var(--primary); background: #ccfbf1; padding: 2px 6px; border-radius: 4px;">
            ${escapeHtml(student.code || "HV")}
          </span>
          <span style="font-weight: 600; font-size: 13.5px; color: var(--text-main);">${escapeHtml(student.name)}</span>
          ${student.chineseName ? `<small style="font-family: var(--font-cn); color: var(--text-muted);">(${escapeHtml(student.chineseName)})</small>` : ""}
        </div>
        <div class="attendance-status-radios">
          <label class="attendance-status-pill present-pill">
            <input type="radio" name="att_status_${student.id}" value="present" ${currentStatus === "present" ? "checked" : ""}>
            <span>✓ Có mặt</span>
          </label>
          <label class="attendance-status-pill absent-pill">
            <input type="radio" name="att_status_${student.id}" value="absent" ${currentStatus === "absent" ? "checked" : ""}>
            <span>✗ Vắng</span>
          </label>
        </div>
      </div>
    `;
  }).join("");
}

function markAllAttendance(status) {
  const classId = document.getElementById("att-class-select").value;
  const students = appState.students.filter(s => s.classId === classId);
  students.forEach(student => {
    const radio = document.querySelector(`input[name="att_status_${student.id}"][value="${status}"]`);
    if (radio) radio.checked = true;
  });
}

function handleSaveAttendance(e) {
  e.preventDefault();
  const sessionId = document.getElementById("attendance-session-id").value;
  const classId = document.getElementById("att-class-select").value;
  const date = document.getElementById("att-date").value || new Date().toISOString().split("T")[0];

  // Thu thập điểm danh học viên
  const students = appState.students.filter(s => s.classId === classId);
  const attendance = {};
  students.forEach(s => {
    const checkedRadio = document.querySelector(`input[name="att_status_${s.id}"]:checked`);
    attendance[s.id] = checkedRadio ? checkedRadio.value : "present";
  });

  if (sessionId) {
    const session = appState.sessions.find(s => s.id === sessionId);
    if (session) {
      session.classId = classId;
      session.date = date;
      session.attendance = attendance;
      showToast("Đã lưu điểm danh học viên!");
    }
  } else {
    const newSession = {
      id: "ses-" + Date.now().toString(36),
      classId,
      date,
      sessionTime: "",
      lessonTopic: "Buổi học Tiếng Trung",
      homework: "",
      attendance
    };
    appState.sessions.push(newSession);
    showToast("Đã điểm danh & tự động tính buổi học!");
  }

  if (appState.cancelledClassDates) {
    appState.cancelledClassDates = appState.cancelledClassDates.filter(c => !(c.classId === classId && c.date === date));
  }

  saveDataToStorage();
  closeModal("modal-attendance");

  // Đồng bộ chọn lớp ở tab điểm danh
  document.getElementById("select-attendance-class").value = classId;
  renderAttendanceHistory();
  renderTuitionManagement();
  renderCalendar();
  updateDashboardStats();
}


function deleteSession(sessionId) {
  const session = (appState.sessions || []).find(s => s.id === sessionId);
  if (session) {
    deleteAnyDaySession(session.classId, session.date, null, session.id);
  }
}

// ============================================================================
// TAB 3: TỰ TÍNH TỔNG HỌC PHÍ HÀNG THÁNG & QUẢN LÝ THU PHÍ
// ============================================================================
function renderTuitionManagement() {
  const monthInput = document.getElementById("select-tuition-month");
  if (!monthInput) return;

  const currentMonth = monthInput.value || getCurrentMonthString();
  const classFilter = document.getElementById("select-tuition-class")?.value || "all";
  const statusFilter = document.getElementById("select-tuition-status")?.value || "all";

  // Lọc danh sách học viên
  let students = appState.students.filter(s => {
    if (classFilter !== "all" && s.classId !== classFilter) return false;
    return true;
  });

  // Lấy danh sách buổi học trong tháng được chọn
  const monthSessions = appState.sessions.filter(s => s.date.startsWith(currentMonth));

  let totalMonthDue = 0;
  let totalMonthPaid = 0;

  // Tính toán dữ liệu học phí từng học viên
  const tuitionRecords = students.map(student => {
    const cls = appState.classes.find(c => c.id === student.classId);
    if (!cls) return null;

    // Số buổi đã học trong tháng
    const studentMonthSessions = monthSessions.filter(s => 
      s.classId === cls.id && s.attendance && s.attendance[student.id] === "present"
    );
    const attendedCount = studentMonthSessions.length;

    let dueAmount = 0;
    let feeCalculationText = "";

    if (cls.feeType === "per_lesson") {
      dueAmount = attendedCount * (cls.feeAmount || 0);
      feeCalculationText = `${attendedCount} buổi × ${formatVND(cls.feeAmount)}`;
    } else {
      dueAmount = cls.feeAmount || 0;
      feeCalculationText = `Gói tháng (${formatVND(cls.feeAmount)})`;
    }

    // Bản ghi thanh toán tháng này
    const payment = appState.payments.find(p => p.studentId === student.id && p.month === currentMonth);
    const amountPaid = payment ? payment.amountPaid : 0;
    const remainingAmount = Math.max(0, dueAmount - amountPaid);

    // Trạng thái: Chỉ hiện Đã đóng hoặc Chưa đóng
    const isPaid = (dueAmount > 0 ? amountPaid >= dueAmount : amountPaid > 0);
    const status = isPaid ? "paid" : "unpaid";

    totalMonthDue += dueAmount;
    totalMonthPaid += amountPaid;

    return {
      student,
      cls,
      attendedCount,
      feeCalculationText,
      dueAmount,
      amountPaid,
      remainingAmount,
      status,
      isPaid,
      payment
    };
  }).filter(Boolean);

  // Lọc theo trạng thái (Tất cả, Chưa đóng, Đã đóng)
  const filteredRecords = tuitionRecords.filter(item => {
    if (statusFilter === "paid") return item.status === "paid";
    if (statusFilter === "unpaid") return item.status === "unpaid";
    return true;
  });

  // KPI Bar
  const kpiBar = document.getElementById("tuition-kpi-bar");
  if (kpiBar) {
    kpiBar.innerHTML = `
      <div class="tuition-kpi-item">
        <span>Tổng học phí dự thu (${formatMonthDisplay(currentMonth)})</span>
        <h4 style="color: var(--text-main);">${formatVND(totalMonthDue)}</h4>
      </div>
      <div class="tuition-kpi-item">
        <span>Thực tế đã thu</span>
        <h4 style="color: var(--success);">${formatVND(totalMonthPaid)}</h4>
      </div>
      <div class="tuition-kpi-item">
        <span>Còn phải thu</span>
        <h4 style="color: var(--danger);">${formatVND(Math.max(0, totalMonthDue - totalMonthPaid))}</h4>
      </div>
    `;
  }

  // Render Table
  const tbody = document.getElementById("tuition-table-body");
  if (!tbody) return;

  if (filteredRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 28px; color: var(--text-muted);">
          Không có dữ liệu học phí cho tháng và bộ lọc đã chọn.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredRecords.map(item => {
    const statusBadge = item.isPaid
      ? `<span class="badge badge-success" style="cursor: pointer; font-size: 13px; padding: 6px 14px; font-weight: 600;" onclick="openPaymentModal('${item.student.id}', '${item.cls.id}', '${currentMonth}', ${item.dueAmount}, ${item.amountPaid})" title="Bấm để xem / chỉnh sửa">✓ Đã đóng</span>`
      : `<span class="badge badge-danger" style="cursor: pointer; font-size: 13px; padding: 6px 14px; font-weight: 600;" onclick="openPaymentModal('${item.student.id}', '${item.cls.id}', '${currentMonth}', ${item.dueAmount}, ${item.amountPaid})" title="Bấm để cập nhật nộp học phí">Chưa đóng</span>`;

    return `
      <tr>
        <td>
          <div style="font-weight: 600;">${escapeHtml(item.student.name)}</div>
          ${item.student.chineseName ? `<small style="font-family: var(--font-cn); color: var(--primary);">${escapeHtml(item.student.chineseName)}</small>` : ""}
        </td>
        <td><small>${escapeHtml(item.cls.name)}</small></td>
        <td><strong style="color: var(--primary);">${item.attendedCount} buổi</strong></td>
        <td><small style="color: var(--text-muted);">${item.feeCalculationText}</small></td>
        <td>
          <strong style="font-size: 14.5px; color: var(--text-main);">${formatVND(item.dueAmount)}</strong>
        </td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join("");
}

function openPaymentModal(studentId, classId, month, dueAmount, currentPaid) {
  const student = appState.students.find(s => s.id === studentId);
  const cls = appState.classes.find(c => c.id === classId);
  if (!student || !cls) return;

  document.getElementById("pay-student-id").value = studentId;
  document.getElementById("pay-class-id").value = classId;
  document.getElementById("pay-month").value = month;

  // Tóm tắt thông tin
  const summaryBox = document.getElementById("pay-summary-box");
  summaryBox.innerHTML = `
    <strong>Học viên:</strong> ${escapeHtml(student.name)} (${escapeHtml(student.code || "")})<br>
    <strong>Lớp:</strong> ${escapeHtml(cls.name)}<br>
    <strong>Tháng tính phí:</strong> ${formatMonthDisplay(month)}<br>
    <strong>Tổng học phí cần đóng:</strong> ${formatVND(dueAmount)} (Đã nộp trước đó: ${formatVND(currentPaid)})
  `;

  // Mặc định điền số tiền còn thiếu (định dạng dấu chấm)
  const remaining = Math.max(0, dueAmount - currentPaid);
  const defaultVal = remaining > 0 ? remaining : (dueAmount > 0 ? dueAmount : 0);
  document.getElementById("pay-amount-paid").value = defaultVal > 0 ? formatNumberWithDots(defaultVal) : "";
  document.getElementById("pay-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("pay-note").value = "";

  openModal("modal-tuition-payment");
}

function handleSaveTuitionPayment(e) {
  e.preventDefault();
  const studentId = document.getElementById("pay-student-id").value;
  const classId = document.getElementById("pay-class-id").value;
  const month = document.getElementById("pay-month").value;
  const amountPaid = parseNumberFromDots(document.getElementById("pay-amount-paid").value);
  const paidDate = document.getElementById("pay-date").value;
  const method = document.getElementById("pay-method").value;
  const note = document.getElementById("pay-note").value.trim();

  // Tìm xem đã có bản ghi thanh toán tháng này chưa
  const existingIndex = appState.payments.findIndex(p => p.studentId === studentId && p.month === month);

  if (existingIndex >= 0) {
    appState.payments[existingIndex].amountPaid += amountPaid;
    appState.payments[existingIndex].paidDate = paidDate;
    appState.payments[existingIndex].method = method;
    if (note) {
      appState.payments[existingIndex].note = (appState.payments[existingIndex].note ? appState.payments[existingIndex].note + "; " : "") + note;
    }
  } else {
    appState.payments.push({
      studentId,
      classId,
      month,
      amountPaid,
      paidDate,
      method,
      note
    });
  }

  saveDataToStorage();
  closeModal("modal-tuition-payment");
  renderTuitionManagement();
  updateDashboardStats();
  showToast("Đã lưu khoản học phí thành công!");
}

// Tạo & sao chép tin nhắn nhắc học phí qua Zalo
function copyZaloTuitionReminder(studentId, classId, month) {
  const student = appState.students.find(s => s.id === studentId);
  const cls = appState.classes.find(c => c.id === classId);
  if (!student || !cls) return;

  const monthSessions = appState.sessions.filter(s => s.date.startsWith(month));
  const attendedCount = monthSessions.filter(s => 
    s.classId === cls.id && s.attendance && s.attendance[student.id] === "present"
  ).length;

  let dueAmount = cls.feeType === "per_lesson" ? attendedCount * (cls.feeAmount || 0) : (cls.feeAmount || 0);
  const payment = appState.payments.find(p => p.studentId === student.id && p.month === month);
  const amountPaid = payment ? payment.amountPaid : 0;
  const remaining = Math.max(0, dueAmount - amountPaid);

  const teacher = appState.teacherSettings || DEFAULT_TEACHER_SETTINGS;

  const msg = `[THÔNG BÁO HỌC PHÍ THÁNG ${formatMonthDisplay(month)}]\n` +
    `Chào em ${student.name}${student.chineseName ? ` (${student.chineseName})` : ""},\n` +
    `Thầy gửi em bảng tổng kết học phí lớp: ${cls.name}\n` +
    `- Số buổi đã học trong tháng: ${attendedCount} buổi\n` +
    `- Tổng học phí: ${formatVND(dueAmount)}\n` +
    `- Đã nộp: ${formatVND(amountPaid)}\n` +
    `- Số tiền cần nộp: ${formatVND(remaining)}\n\n` +
    `Thông tin tài khoản nhận học phí:\n` +
    `• Ngân hàng: ${teacher.bankName || "Techcombank"}\n` +
    `• Số tài khoản: ${teacher.bankAccount || "..."}\n` +
    `• Tên chủ thẻ: ${teacher.bankOwner || ""}\n` +
    `• Cú pháp CK: ${student.code || student.name} - Hoc phi thang ${formatMonthDisplay(month)}\n\n` +
    `Cảm ơn em và chúc em học tập tiếng Trung thật tốt! 加油!`;

  navigator.clipboard.writeText(msg).then(() => {
    showToast("Đã sao chép nội dung tin nhắn nhắc phí! Bạn có thể dán vào Zalo gửi cho học viên.");
  }).catch(() => {
    alert(msg);
  });
}

// Xuất bảng học phí ra file Excel / CSV
function exportTuitionToCSV() {
  const monthInput = document.getElementById("select-tuition-month");
  const month = monthInput.value || getCurrentMonthString();
  const monthSessions = appState.sessions.filter(s => s.date.startsWith(month));

  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += "Mã HV,Họ Tên,Tên Tiếng Trung,SĐT,Lớp Học,Số Buổi Học Trong Tháng,Cách Tính Phí,Tổng Cộng (VNĐ),Trạng Thái\n";

  appState.students.forEach(student => {
    const cls = appState.classes.find(c => c.id === student.classId);
    if (!cls) return;

    const attendedCount = monthSessions.filter(s => 
      s.classId === cls.id && s.attendance && s.attendance[student.id] === "present"
    ).length;

    const dueAmount = cls.feeType === "per_lesson" ? attendedCount * (cls.feeAmount || 0) : (cls.feeAmount || 0);
    const payment = appState.payments.find(p => p.studentId === student.id && p.month === month);
    const amountPaid = payment ? payment.amountPaid : 0;
    const isPaid = dueAmount > 0 ? amountPaid >= dueAmount : amountPaid > 0;
    const statusText = isPaid ? "Đã đóng" : "Chưa đóng";

    const row = [
      `"${student.code || ""}"`,
      `"${student.name}"`,
      `"${student.chineseName || ""}"`,
      `"${student.phone}"`,
      `"${cls.name}"`,
      attendedCount,
      `"${cls.feeType === "per_lesson" ? "Theo buổi" : "Trọn gói tháng"}"`,
      dueAmount,
      `"${statusText}"`
    ];

    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Bao_cao_hoc_phi_thang_${month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Đã tải về bảng học phí Excel/CSV!");
}

// ============================================================================
// TAB 4: THỜI KHÓA BIỂU DẠNG LỊCH (CALENDAR & STICKY NOTES)
// ============================================================================
let calendarCurrentDate = new Date();
let calendarViewMode = "month"; // 'month' | 'week'

function setCalendarViewMode(mode) {
  calendarViewMode = mode;
  const btnMonth = document.getElementById("btn-view-month");
  const btnWeek = document.getElementById("btn-view-week");
  if (btnMonth && btnWeek) {
    if (mode === "month") {
      btnMonth.className = "btn btn-sm btn-primary";
      btnWeek.className = "btn btn-sm btn-secondary";
    } else {
      btnMonth.className = "btn btn-sm btn-secondary";
      btnWeek.className = "btn btn-sm btn-primary";
    }
  }
  renderCalendar();
}

function navCalendarPrev() {
  if (calendarViewMode === "month") {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
  } else {
    calendarCurrentDate.setDate(calendarCurrentDate.getDate() - 7);
  }
  renderCalendar();
}

function navCalendarNext() {
  if (calendarViewMode === "month") {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
  } else {
    calendarCurrentDate.setDate(calendarCurrentDate.getDate() + 7);
  }
  renderCalendar();
}

function goToCalendarToday() {
  calendarCurrentDate = new Date();
  renderCalendar();
}

function renderWeeklySchedule() {
  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById("calendar-container");
  if (!container) return;

  // Cập nhật dropdown bộ lọc lớp trên lịch
  const filterSelect = document.getElementById("calendar-filter-class");
  if (filterSelect && filterSelect.options.length <= 1) {
    const currentVal = filterSelect.value || "all";
    filterSelect.innerHTML = `<option value="all">Tất cả các lớp</option>` +
      appState.classes.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    filterSelect.value = currentVal;
  }

  if (calendarViewMode === "month") {
    renderMonthCalendar(container);
  } else {
    renderWeekCalendar(container);
  }
}

// Render Lịch Dạng Tháng (Month Calendar Grid)
function renderMonthCalendar(container) {
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth(); // 0-indexed

  // Cập nhật tiêu đề tháng
  const titleEl = document.getElementById("calendar-current-title");
  if (titleEl) {
    titleEl.innerText = `Tháng ${month + 1} / ${year} (${year}年${month + 1}月)`;
  }

  const selectedClassFilter = document.getElementById("calendar-filter-class")?.value || "all";

  // Ngày đầu tiên của tháng và số ngày trong tháng
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Thứ của ngày mùng 1 (0: CN, 1: T2, ..., 6: T7)
  // Lịch bắt đầu từ Thứ 2 (周一), nên offset: T2 (1) -> 0, T3 (2) -> 1, ..., CN (0) -> 6
  const startDay = firstDay.getDay();
  const dayOffset = startDay === 0 ? 6 : startDay - 1;

  const todayStr = new Date().toISOString().split("T")[0];

  // Hàng tiêu đề 7 ngày trong tuần
  const weekdaysHtml = `
    <div class="calendar-weekdays-row">
      <div class="calendar-weekday-item">Thứ Hai <span class="weekday-cn">周一</span></div>
      <div class="calendar-weekday-item">Thứ Ba <span class="weekday-cn">周二</span></div>
      <div class="calendar-weekday-item">Thứ Tư <span class="weekday-cn">周三</span></div>
      <div class="calendar-weekday-item">Thứ Năm <span class="weekday-cn">周四</span></div>
      <div class="calendar-weekday-item">Thứ Sáu <span class="weekday-cn">周五</span></div>
      <div class="calendar-weekday-item">Thứ Bảy <span class="weekday-cn">周六</span></div>
      <div class="calendar-weekday-item" style="color: #b91c1c;">Chủ Nhật <span class="weekday-cn">周日</span></div>
    </div>
  `;

  // Tổng số ô (35 hoặc 42 ô)
  const totalCells = Math.ceil((dayOffset + daysInMonth) / 7) * 7;
  let cellsHtml = "";

  for (let i = 0; i < totalCells; i++) {
    let cellYear = year;
    let cellMonth = month;
    let dayNum = 1;
    let isOtherMonth = false;

    if (i < dayOffset) {
      // Ngày của tháng trước
      dayNum = daysInPrevMonth - dayOffset + i + 1;
      cellMonth = month - 1;
      if (cellMonth < 0) {
        cellMonth = 11;
        cellYear = year - 1;
      }
      isOtherMonth = true;
    } else if (i >= dayOffset + daysInMonth) {
      // Ngày của tháng sau
      dayNum = i - (dayOffset + daysInMonth) + 1;
      cellMonth = month + 1;
      if (cellMonth > 11) {
        cellMonth = 0;
        cellYear = year + 1;
      }
      isOtherMonth = true;
    } else {
      // Ngày trong tháng hiện tại
      dayNum = i - dayOffset + 1;
    }

    const cellDateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const cellDateObj = new Date(cellYear, cellMonth, dayNum);
    const cellDayOfWeek = cellDateObj.getDay();
    const isToday = cellDateStr === todayStr;

    // Lấy danh sách các buổi học / note của ngày này
    const dayNotes = getDayClassNotes(cellDateStr, cellDayOfWeek, selectedClassFilter);

    // Render các Note trên ô ngày
    let notesHtml = "";
    if (dayNotes.length > 0) {
      const maxDisplay = 2;
      const visibleNotes = dayNotes.slice(0, maxDisplay);
      const remaining = dayNotes.length - maxDisplay;

      notesHtml = visibleNotes.map(item => {
        const themeClass = getThemeClassByLevel(item.cls.level);
        const displayTime = item.sched ? (item.sched.time ? item.sched.time.split("-")[0].trim() : "19:30") : ((item.session && item.session.sessionTime) ? item.session.sessionTime.split("-")[0].trim() : (item.cls.scheduleTime ? item.cls.scheduleTime.split("-")[0].trim() : "19:30"));
        const topic = item.sched ? item.sched.topic : (item.session ? item.session.lessonTopic : "");
        const schedIdStr = item.sched ? item.sched.id : "";
        const sessIdStr = item.session ? item.session.id : "";
        return `
          <div class="calendar-note ${themeClass}" onclick="event.stopPropagation(); openCalendarDayDetail('${cellDateStr}')" title="Bấm xem chi tiết: ${escapeHtml(item.cls.name)}">
            <div class="cal-note-header">
              <span class="cal-note-time">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${escapeHtml(displayTime)}
              </span>
              <button type="button" class="cal-note-del-btn" title="Xóa buổi dạy này khỏi lịch" onclick="event.stopPropagation(); deleteAnyDaySession('${item.cls.id}', '${cellDateStr}', '${schedIdStr}', '${sessIdStr}')">&times;</button>
            </div>
            <div class="cal-note-title">${escapeHtml(item.cls.name)}</div>
            ${topic ? `
              <div class="cal-note-desc">${escapeHtml(topic)}</div>
            ` : ""}
          </div>
        `;
      }).join("");

      if (remaining > 0) {
        notesHtml += `
          <div style="font-size: 10.5px; color: var(--primary); font-weight: 700; cursor: pointer; padding: 2px 4px;" onclick="event.stopPropagation(); openCalendarDayDetail('${cellDateStr}')">
            + ${remaining} ca học khác...
          </div>
        `;
      }
    } else {
      notesHtml = "";
    }

    const clickAction = dayNotes.length === 0 ? `openAddScheduleModal('${cellDateStr}')` : `openCalendarDayDetail('${cellDateStr}')`;

    cellsHtml += `
      <div class="calendar-day-cell ${isOtherMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""}" onclick="${clickAction}">
        <div class="calendar-day-header">
          <span class="calendar-day-number">${dayNum}</span>
          ${isToday ? `<span class="calendar-day-today-tag">Hôm nay</span>` : ""}
        </div>
        <div class="calendar-notes-stack">
          ${notesHtml}
        </div>
      </div>
    `;
  }

  container.innerHTML = weekdaysHtml + `<div class="calendar-month-grid">${cellsHtml}</div>`;
}

// Render Lịch Dạng Tuần Chi Tiết (Week Calendar Grid)
function renderWeekCalendar(container) {
  // Tìm ngày Thứ 2 đầu tuần của calendarCurrentDate
  const current = new Date(calendarCurrentDate);
  const day = current.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const mondayDate = new Date(current);
  mondayDate.setDate(current.getDate() + diffToMonday);

  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  // Cập nhật tiêu đề tuần
  const titleEl = document.getElementById("calendar-current-title");
  if (titleEl) {
    titleEl.innerText = `Tuần: ${formatDateDisplay(mondayDate.toISOString().split("T")[0])} - ${formatDateDisplay(sundayDate.toISOString().split("T")[0])}`;
  }

  const selectedClassFilter = document.getElementById("calendar-filter-class")?.value || "all";
  const todayStr = new Date().toISOString().split("T")[0];

  const weekdayNames = [
    { label: "Thứ Hai", cn: "周一" },
    { label: "Thứ Ba", cn: "周二" },
    { label: "Thứ Tư", cn: "周三" },
    { label: "Thứ Năm", cn: "周四" },
    { label: "Thứ Sáu", cn: "周五" },
    { label: "Thứ Bảy", cn: "周六" },
    { label: "Chủ Nhật", cn: "周日" }
  ];

  let colsHtml = "";

  for (let i = 0; i < 7; i++) {
    const colDate = new Date(mondayDate);
    colDate.setDate(mondayDate.getDate() + i);
    const colDateStr = colDate.toISOString().split("T")[0];
    const colDayOfWeek = colDate.getDay();
    const isToday = colDateStr === todayStr;

    const dayNotes = getDayClassNotes(colDateStr, colDayOfWeek, selectedClassFilter);

    let cardsHtml = "";
    if (dayNotes.length === 0) {
      cardsHtml = `
        <div class="calendar-week-empty" onclick="openAddScheduleModal('${colDateStr}')" style="cursor: pointer;">
          Chưa có lịch học
        </div>
      `;
    } else {
      cardsHtml = dayNotes.map(item => {
        const themeClass = getThemeClassByLevel(item.cls.level);
        const displayTime = item.sched ? item.sched.time : ((item.session && item.session.sessionTime) ? item.session.sessionTime : (item.cls.scheduleTime || ""));
        const topic = item.sched ? item.sched.topic : (item.session ? item.session.lessonTopic : "");
        const link = item.sched ? (item.sched.link || item.cls.onlineLink) : item.cls.onlineLink;
        const schedIdStr = item.sched ? item.sched.id : "";
        const sessIdStr = item.session ? item.session.id : "";
        return `
          <div class="calendar-note ${themeClass}" style="padding: 10px 12px; font-size: 12.5px;" onclick="openCalendarDayDetail('${colDateStr}')">
            <div class="cal-note-header" style="font-size: 11.5px; margin-bottom: 4px;">
              <span class="cal-note-time">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${escapeHtml(displayTime)}
              </span>
              <button type="button" class="cal-note-del-btn" title="Xóa buổi dạy này khỏi lịch" onclick="event.stopPropagation(); deleteAnyDaySession('${item.cls.id}', '${colDateStr}', '${schedIdStr}', '${sessIdStr}')">&times;</button>
            </div>
            <div class="cal-note-title" style="font-size: 13.5px; margin-bottom: 4px;">${escapeHtml(item.cls.name)}</div>
            ${topic ? `
              <div style="font-size: 12px; margin-bottom: 6px; color: var(--text-main);">
                <strong>Bài học:</strong> ${escapeHtml(topic)}
              </div>
            ` : ""}
            ${link ? `
              <a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="online-link-pill" style="margin-top: 4px; font-size: 11.5px;" onclick="event.stopPropagation()">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5-5m0 0l-5-5m5 5H9a8 8 0 0 0 0 16h3"/></svg>
                Phòng Online
              </a>
            ` : ""}
          </div>
        `;
      }).join("");
    }

    colsHtml += `
      <div class="calendar-week-col">
        <div class="calendar-week-col-header ${isToday ? "is-today" : ""}">
          <div class="col-day-name">${weekdayNames[i].label} (${weekdayNames[i].cn})</div>
          <div class="col-day-num">${colDate.getDate()}/${colDate.getMonth() + 1}</div>
          ${isToday ? `<span class="calendar-day-today-tag" style="margin-top: 2px; display: inline-block;">Hôm nay</span>` : ""}
        </div>
        <div class="calendar-week-col-body">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  container.innerHTML = `<div class="calendar-week-grid">${colsHtml}</div>`;
}

// Hàm lấy tất cả các buổi học (lịch dạy dự kiến + buổi đã điểm danh + lịch định kỳ) của 1 ngày
function getDayClassNotes(dateStr, dayOfWeek, classFilter) {
  const result = [];
  const processedClassIds = new Set();

  // 1. Kiểm tra lịch dạy đã xếp trong appState.schedules (thời khóa biểu để học viên theo dõi)
  const dateSchedules = (appState.schedules || []).filter(s => s.date === dateStr);
  dateSchedules.forEach(sched => {
    if (classFilter !== "all" && sched.classId !== classFilter) return;
    const cls = appState.classes.find(c => c.id === sched.classId);
    if (cls) {
      const session = (appState.sessions || []).find(s => s.classId === cls.id && s.date === dateStr);
      result.push({
        cls,
        sched,
        session: session || null,
        isSchedule: true,
        isRecorded: !!session
      });
      processedClassIds.add(cls.id);
    }
  });

  // 2. Kiểm tra các buổi học đã có nhật ký trong appState.sessions với ngày này (nếu chưa có trong schedules)
  const dateSessions = (appState.sessions || []).filter(s => s.date === dateStr);
  dateSessions.forEach(session => {
    if (processedClassIds.has(session.classId)) return;
    if (classFilter !== "all" && session.classId !== classFilter) return;
    const cls = appState.classes.find(c => c.id === session.classId);
    if (cls) {
      result.push({
        cls,
        sched: null,
        session,
        isSchedule: false,
        isRecorded: true
      });
      processedClassIds.add(cls.id);
    }
  });

  // 3. Kiểm tra các lớp có lịch định kỳ vào thứ này nhưng chưa có bản ghi cụ thể
  appState.classes.forEach(cls => {
    if (processedClassIds.has(cls.id)) return;
    if (classFilter !== "all" && cls.id !== classFilter) return;
    if (classMatchesWeekday(cls, dayOfWeek)) {
      if ((appState.cancelledClassDates || []).some(c => c.classId === cls.id && c.date === dateStr)) {
        return;
      }
      result.push({
        cls,
        sched: null,
        session: null,
        isSchedule: false,
        isRecorded: false,
        isRecurring: true
      });
    }
  });

  return result;
}

// Kiểm tra lớp có khớp với thứ trong tuần hay không
function classMatchesWeekday(cls, dayOfWeek) {
  // 0: Chủ Nhật, 1: Thứ 2, 2: Thứ 3, 3: Thứ 4, 4: Thứ 5, 5: Thứ 6, 6: Thứ 7
  const s = (cls.scheduleDays || "").toLowerCase();
  if (dayOfWeek === 1 && (s.includes("thứ 2") || s.includes("2 - 4 - 6") || s.includes("2,4,6") || s.includes("2-4-6") || s.includes("t2"))) return true;
  if (dayOfWeek === 2 && (s.includes("thứ 3") || s.includes("3 - 5 - 7") || s.includes("3,5,7") || s.includes("3-5-7") || s.includes("t3"))) return true;
  if (dayOfWeek === 3 && (s.includes("thứ 4") || s.includes("2 - 4 - 6") || s.includes("2,4,6") || s.includes("2-4-6") || s.includes("t4"))) return true;
  if (dayOfWeek === 4 && (s.includes("thứ 5") || s.includes("3 - 5 - 7") || s.includes("3,5,7") || s.includes("3-5-7") || s.includes("t5"))) return true;
  if (dayOfWeek === 5 && (s.includes("thứ 6") || s.includes("2 - 4 - 6") || s.includes("2,4,6") || s.includes("2-4-6") || s.includes("t6"))) return true;
  if (dayOfWeek === 6 && (s.includes("thứ 7") || s.includes("3 - 5 - 7") || s.includes("3,5,7") || s.includes("3-5-7") || s.includes("7 - chủ nhật") || s.includes("t7"))) return true;
  if (dayOfWeek === 0 && (s.includes("chủ nhật") || s.includes("cn") || s.includes("7 - chủ nhật"))) return true;
  return false;
}

// Lấy theme màu cho note trên lịch theo cấp độ lớp
function getThemeClassByLevel(level) {
  if (!level) return "theme-teal";
  const lvl = level.toLowerCase();
  if (lvl.includes("hsk 1") || lvl.includes("hsk 2")) return "theme-teal";
  if (lvl.includes("hsk 3") || lvl.includes("hsk 4")) return "theme-blue";
  if (lvl.includes("giao tiếp")) return "theme-amber";
  return "theme-purple";
}

// MODAL CHI TIẾT NGÀY KHI CLICK VÀO LỊCH HOẶC NOTE
function openCalendarDayDetail(dateStr) {
  const parts = dateStr.split("-");
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const dayOfWeek = dateObj.getDay();

  const weekdayNames = ["Chủ Nhật (周日)", "Thứ Hai (周一)", "Thứ Ba (周二)", "Thứ Tư (周三)", "Thứ Năm (周四)", "Thứ Sáu (周五)", "Thứ Bảy (周六)"];
  const titleText = `${weekdayNames[dayOfWeek]}, Ngày ${formatDateDisplay(dateStr)}`;

  document.getElementById("cal-modal-day-title").innerText = titleText;

  // Gắn sự kiện nút thêm lịch dạy ở đầu modal
  const topAddBtn = document.getElementById("cal-modal-btn-add-session");
  if (topAddBtn) {
    topAddBtn.onclick = () => openAddScheduleModal(dateStr);
  }

  const notes = getDayClassNotes(dateStr, dayOfWeek, "all");
  const contentEl = document.getElementById("cal-modal-day-content");

  if (notes.length === 0) {
    contentEl.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
        <div style="font-size: 32px; margin-bottom: 8px;">📅</div>
        <p style="font-size: 15px; margin-bottom: 14px; font-weight: 500;">Ngày này chưa có ca dạy nào.</p>
        <button class="btn btn-primary" onclick="openAddScheduleModal('${dateStr}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          + Thêm Ngày Dạy Vào Thời Khóa Biểu
        </button>
      </div>
    `;
  } else {
    const cardsListHtml = notes.map(item => {
      const studentCount = appState.students.filter(s => s.classId === item.cls.id).length;
      const displayTime = item.sched ? item.sched.time : ((item.session && item.session.sessionTime) ? item.session.sessionTime : (item.cls.scheduleTime || "Chưa đặt giờ"));
      const topic = item.sched ? item.sched.topic : (item.session ? item.session.lessonTopic : "Lịch học định kỳ");
      const notesText = item.sched ? item.sched.notes : (item.session ? item.session.homework : "");
      const link = item.sched ? (item.sched.link || item.cls.onlineLink) : item.cls.onlineLink;

      return `
        <div class="cal-modal-card">
          <div class="cal-modal-card-top">
            <div>
              ${item.cls.level ? `<span class="class-badge" style="margin-bottom: 4px;">${escapeHtml(item.cls.level)}</span>` : ""}
              <h4 class="cal-modal-card-title">${escapeHtml(item.cls.name)}</h4>
            </div>
          </div>

          <div class="cal-modal-card-meta">
            <span>⏰ Khung giờ: <strong>${escapeHtml(displayTime)}</strong></span>
            <span>👥 Sĩ số: <strong>${studentCount} học viên</strong></span>
            ${(item.cls.feeAmount && item.cls.feeAmount > 0) ? `<span>💰 Học phí: <strong>${item.cls.feeType === "per_lesson" ? formatVND(item.cls.feeAmount) + "/buổi" : formatVND(item.cls.feeAmount) + "/tháng"}</strong></span>` : ""}
          </div>

          <div class="cal-modal-card-lesson">
            <div style="font-weight: 700; color: var(--primary-hover); margin-bottom: 4px;">
              📖 Bài học: ${escapeHtml(topic)}
            </div>
            ${notesText ? `
              <div style="font-size: 12.5px; color: var(--text-muted);">
                📝 Dặn dò / Ghi chú: ${escapeHtml(notesText)}
              </div>
            ` : ""}
          </div>

          <div class="cal-modal-card-actions">
            ${link ? `
              <a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5-5m0 0l-5-5m5 5H9a8 8 0 0 0 0 16h3"/></svg>
                Vào Phòng Học
              </a>
            ` : ""}

            ${item.sched ? `
              <button class="btn btn-secondary btn-sm" onclick="openEditScheduleModal('${item.sched.id}')">
                Sửa Lịch
              </button>
            ` : ""}

            ${item.isRecorded && item.session ? `
              <button class="btn btn-primary btn-sm" onclick="closeModal('modal-calendar-day-detail'); openEditAttendanceModal('${item.session.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Xem / Sửa Điểm Danh
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="closeModal('modal-calendar-day-detail'); openNewAttendanceForClassAndDate('${item.cls.id}', '${dateStr}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg>
                Điểm Danh Buổi Này
              </button>
            `}

            <button class="btn btn-danger btn-sm" style="margin-left: auto;" onclick="deleteAnyDaySession('${item.cls.id}', '${dateStr}', '${item.sched ? item.sched.id : ""}', '${item.session ? item.session.id : ""}')">
              🗑️ Xóa Buổi Dạy Này
            </button>
          </div>
        </div>
      `;
    }).join("");

    contentEl.innerHTML = cardsListHtml + `
      <div style="text-align: center; margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
        <button class="btn btn-secondary btn-sm" onclick="openAddScheduleModal('${dateStr}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          + Thêm Lịch Dạy Khác Vào Ngày Này
        </button>
      </div>
    `;
  }

  openModal("modal-calendar-day-detail");
}

// ============================================================================
// CHỨC NĂNG THỜI KHÓA BIỂU: THÊM / SỬA / XÓA LỊCH DẠY CHO HỌC VIÊN THEO DÕI
// (Không tính buổi học vào học phí tại đây)
// ============================================================================
function openAddScheduleModal(dateStr, classId = "") {
  closeModal("modal-calendar-day-detail");
  document.getElementById("modal-schedule-title").innerText = "Thêm Ngày Dạy Vào Thời Khóa Biểu";
  document.getElementById("form-schedule-item").reset();
  document.getElementById("sched-id").value = "";

  const delBtn = document.getElementById("btn-delete-sched-in-modal");
  if (delBtn) delBtn.style.display = "none";

  populateClassDropdowns();

  // 1. Ngày dạy
  const dateInput = document.getElementById("sched-date");
  if (dateInput) {
    dateInput.value = dateStr || new Date().toISOString().split("T")[0];
  }

  // 2. Chọn lớp phù hợp
  let targetClassId = classId;
  if (!targetClassId) {
    const calFilter = document.getElementById("calendar-filter-class")?.value;
    if (calFilter && calFilter !== "all") {
      targetClassId = calFilter;
    } else if (dateStr) {
      const parts = dateStr.split("-");
      const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayOfWeek = dObj.getDay();
      const matched = appState.classes.find(c => classMatchesWeekday(c, dayOfWeek));
      if (matched) targetClassId = matched.id;
    }
  }
  if (!targetClassId && appState.classes.length > 0) {
    targetClassId = appState.classes[0].id;
  }

  const classSelect = document.getElementById("sched-class-select");
  if (classSelect && targetClassId) {
    classSelect.value = targetClassId;
  }

  onScheduleClassChange();
  openModal("modal-schedule-item");
}

function onScheduleClassChange() {
  const classId = document.getElementById("sched-class-select")?.value;
  const cls = appState.classes.find(c => c.id === classId);
  const timeInput = document.getElementById("sched-time");
  const linkInput = document.getElementById("sched-link");
  if (cls) {
    if (timeInput && cls.scheduleTime) {
      timeInput.value = cls.scheduleTime;
    }
    if (linkInput && cls.onlineLink) {
      linkInput.value = cls.onlineLink;
    }
  }
}

function openEditScheduleModal(scheduleId) {
  const sched = (appState.schedules || []).find(s => s.id === scheduleId);
  if (!sched) return;

  closeModal("modal-calendar-day-detail");
  document.getElementById("modal-schedule-title").innerText = "Chỉnh Sửa Ngày Dạy";
  document.getElementById("sched-id").value = sched.id;

  const delBtn = document.getElementById("btn-delete-sched-in-modal");
  if (delBtn) delBtn.style.display = "inline-block";

  populateClassDropdowns();

  document.getElementById("sched-class-select").value = sched.classId;
  document.getElementById("sched-date").value = sched.date;
  document.getElementById("sched-time").value = sched.time || "";
  document.getElementById("sched-topic").value = sched.topic || "";
  document.getElementById("sched-notes").value = sched.notes || "";
  document.getElementById("sched-link").value = sched.link || "";

  openModal("modal-schedule-item");
}

function deleteCurrentScheduleItem() {
  const schedId = document.getElementById("sched-id").value;
  if (schedId) {
    deleteScheduleItem(schedId);
  }
}

function handleSaveScheduleItem(e) {
  e.preventDefault();
  const schedId = document.getElementById("sched-id").value;
  const classId = document.getElementById("sched-class-select").value;
  const date = document.getElementById("sched-date").value || new Date().toISOString().split("T")[0];
  const time = document.getElementById("sched-time").value.trim();
  const topic = document.getElementById("sched-topic").value.trim() || "Buổi học Tiếng Trung";
  const notes = document.getElementById("sched-notes").value.trim();
  const link = document.getElementById("sched-link").value.trim();

  if (!appState.schedules) {
    appState.schedules = [];
  }

  if (schedId) {
    const existing = appState.schedules.find(s => s.id === schedId);
    if (existing) {
      existing.classId = classId;
      existing.date = date;
      existing.time = time;
      existing.topic = topic;
      existing.notes = notes;
      existing.link = link;
      showToast("Đã cập nhật lịch dạy!");
    }
  } else {
    const newSched = {
      id: "sch-" + Date.now().toString(36),
      classId,
      date,
      time,
      topic,
      notes,
      link
    };
    appState.schedules.push(newSched);
    showToast("Đã thêm ngày dạy và đồng bộ sang Điểm Danh!");
  }

  // TỰ ĐỘNG ĐỒNG BỘ SANG ĐIỂM DANH BUỔI HỌC (appState.sessions)
  let matchedSession = (appState.sessions || []).find(s => s.classId === classId && s.date === date);
  if (!matchedSession) {
    matchedSession = {
      id: "ses-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      classId,
      date,
      sessionTime: time,
      lessonTopic: topic || "Buổi học Tiếng Trung",
      homework: "",
      attendance: {}
    };
    appState.sessions.push(matchedSession);
  } else {
    matchedSession.sessionTime = time;
    if (topic && (!matchedSession.lessonTopic || matchedSession.lessonTopic === "Buổi học Tiếng Trung")) {
      matchedSession.lessonTopic = topic;
    }
  }

  // Nếu ngày này từng bị xóa/hủy trước đây, gỡ khỏi danh sách hủy vì đã được thêm lại
  if (appState.cancelledClassDates) {
    appState.cancelledClassDates = appState.cancelledClassDates.filter(c => !(c.classId === classId && c.date === date));
  }

  saveDataToStorage();
  closeModal("modal-schedule-item");
  renderCalendar();
  renderAttendanceHistory();
}

function deleteAnyDaySession(classId, dateStr, schedId, sessionId) {
  if (schedId && (!classId || !dateStr)) {
    const sc = (appState.schedules || []).find(s => s.id === schedId);
    if (sc) {
      classId = classId || sc.classId;
      dateStr = dateStr || sc.date;
    }
  }
  if (sessionId && (!classId || !dateStr)) {
    const ss = (appState.sessions || []).find(s => s.id === sessionId);
    if (ss) {
      classId = classId || ss.classId;
      dateStr = dateStr || ss.date;
    }
  }

  // 1. Xóa khỏi schedules
  if (schedId) {
    appState.schedules = (appState.schedules || []).filter(s => s.id !== schedId);
  }

  // 2. Xóa khỏi sessions điểm danh
  if (sessionId) {
    appState.sessions = (appState.sessions || []).filter(s => s.id !== sessionId);
  }

  // 3. Đồng nhất xóa theo classId và dateStr ở cả hai nơi
  if (classId && dateStr) {
    appState.schedules = (appState.schedules || []).filter(s => !(s.classId === classId && s.date === dateStr));
    appState.sessions = (appState.sessions || []).filter(s => !(s.classId === classId && s.date === dateStr));

    // Đánh dấu hủy ngày dạy này để lịch định kỳ của lớp KHÔNG tự động hiển thị lại
    if (!appState.cancelledClassDates) {
      appState.cancelledClassDates = [];
    }
    if (!appState.cancelledClassDates.some(c => c.classId === classId && c.date === dateStr)) {
      appState.cancelledClassDates.push({ classId, date: dateStr });
    }
  }

  saveDataToStorage();
  closeModal("modal-calendar-day-detail");
  closeModal("modal-schedule-item");
  closeModal("modal-attendance");
  renderCalendar();
  renderAttendanceHistory();
  renderTuitionManagement();
  updateDashboardStats();
  showToast("Đã xóa hoàn toàn buổi dạy ngày " + formatDateDisplay(dateStr));
}

function deleteScheduleItem(scheduleId) {
  const sched = (appState.schedules || []).find(s => s.id === scheduleId);
  if (sched) {
    deleteAnyDaySession(sched.classId, sched.date, sched.id, null);
  } else {
    appState.schedules = (appState.schedules || []).filter(s => s.id !== scheduleId);
    saveDataToStorage();
    closeModal("modal-schedule-item");
    closeModal("modal-calendar-day-detail");
    renderCalendar();
    showToast("Đã xóa ngày dạy khỏi Thời Khóa Biểu!");
  }
}

function cancelRecurringClassDate(classId, dateStr) {
  deleteAnyDaySession(classId, dateStr, null, null);
}

function openNewAttendanceForClassAndDate(classId, dateStr) {
  closeModal("modal-calendar-day-detail");
  openAttendanceModal();
  document.getElementById("att-class-select").value = classId;
  document.getElementById("att-date").value = dateStr;
  const cls = appState.classes.find(c => c.id === classId);
  const timeInput = document.getElementById("att-time");
  if (cls && cls.scheduleTime && timeInput) {
    timeInput.value = cls.scheduleTime;
  }
  document.getElementById("modal-attendance-title").innerText = `Điểm Danh Buổi Học Ngày ${formatDateDisplay(dateStr)}`;
  renderStudentAttendanceChecklist();
}


// ============================================================================
// PHÂN HỆ HỌC VIÊN TRA CỨU
// ============================================================================
function renderQuickSampleStudents() {
  const container = document.getElementById("quick-sample-students");
  if (!container) return;

  const sampleList = appState.students.slice(0, 4);
  if (sampleList.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <span>Gợi ý tra cứu thử: </span>
    ${sampleList.map(s => `
      <span class="quick-sample-tag" onclick="quickFillStudentLookup('${s.phone}')">
        ${escapeHtml(s.name)} (${s.phone})
      </span>
    `).join("")}
  `;
}

function quickFillStudentLookup(phone) {
  document.getElementById("student-lookup-input").value = phone;
  lookupStudent();
}

function lookupStudent() {
  const input = document.getElementById("student-lookup-input").value.trim().toLowerCase();
  const container = document.getElementById("student-result-container");
  if (!container) return;

  if (!input) {
    showToast("Vui lòng nhập Số điện thoại hoặc Mã học viên!");
    return;
  }

  const student = appState.students.find(s => 
    s.phone.toLowerCase().includes(input) || 
    (s.code && s.code.toLowerCase().includes(input)) ||
    s.name.toLowerCase().includes(input)
  );

  if (!student) {
    container.style.display = "block";
    container.innerHTML = `
      <div style="background: white; padding: 36px; border-radius: 12px; text-align: center; border: 1px dashed var(--border-color);">
        <h4 style="font-size: 16px; color: var(--danger); margin-bottom: 8px;">Không tìm thấy thông tin học viên</h4>
        <p style="font-size: 13.5px; color: var(--text-muted);">Không tìm thấy học viên với từ khóa "<strong>${escapeHtml(input)}</strong>". Vui lòng kiểm tra lại số điện thoại hoặc mã học viên.</p>
      </div>
    `;
    return;
  }

  const cls = appState.classes.find(c => c.id === student.classId);
  const teacher = appState.teacherSettings || DEFAULT_TEACHER_SETTINGS;

  // Tính số buổi đã học
  const allSessionsOfClass = appState.sessions.filter(s => s.classId === student.classId);
  const attendedSessions = allSessionsOfClass.filter(s => s.attendance && s.attendance[student.id] === "present");
  const absentSessions = allSessionsOfClass.filter(s => s.attendance && s.attendance[student.id] === "absent");

  // Tính học phí tháng hiện tại
  const currentMonth = getCurrentMonthString();
  const currentMonthSessions = allSessionsOfClass.filter(s => s.date.startsWith(currentMonth));
  const currentMonthAttended = currentMonthSessions.filter(s => s.attendance && s.attendance[student.id] === "present").length;

  let dueAmount = 0;
  if (cls) {
    dueAmount = cls.feeType === "per_lesson" ? currentMonthAttended * (cls.feeAmount || 0) : (cls.feeAmount || 0);
  }

  const payment = appState.payments.find(p => p.studentId === student.id && p.month === currentMonth);
  const paidAmount = payment ? payment.amountPaid : 0;
  const remainingAmount = Math.max(0, dueAmount - paidAmount);

  // 5 buổi học gần nhất đã điểm danh
  const recentSessions = [...allSessionsOfClass]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // Lịch học trong thời khóa biểu để học viên theo dõi
  const classUpcomingSchedules = (appState.schedules || [])
    .filter(s => s.classId === student.classId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  container.style.display = "block";
  container.innerHTML = `
    <!-- Header hồ sơ học viên -->
    <div class="student-profile-header">
      <div class="student-avatar-block">
        <div class="student-avatar">
          ${student.chineseName ? student.chineseName.charAt(0) : student.name.charAt(0)}
        </div>
        <div class="student-info-meta">
          <h3>${escapeHtml(student.name)}</h3>
          ${student.chineseName ? `<div class="student-chinese-sub">${escapeHtml(student.chineseName)}</div>` : ""}
          <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
            Mã HV: <strong>${escapeHtml(student.code || "HV")}</strong> • SĐT: ${escapeHtml(student.phone)}
          </div>
        </div>
      </div>

      <div>
        <span class="class-badge" style="font-size: 13px; padding: 6px 12px;">
          Lớp: ${cls ? escapeHtml(cls.name) : "Chưa xếp lớp"}
        </span>
      </div>
    </div>

    <!-- Thông tin lớp & link học -->
    ${cls ? `
      <div class="stat-card" style="margin-bottom: 0;">
        <div class="stat-icon icon-classes">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="stat-data" style="width: 100%;">
          <span class="stat-label">Lịch học trực tuyến</span>
          <h3 style="font-size: 17px; margin: 4px 0;">${escapeHtml(cls.scheduleDays)} (${escapeHtml(cls.scheduleTime)})</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">${escapeHtml(cls.notes || "Khóa học tiếng Trung chuẩn.")}</p>
          ${cls.onlineLink ? `
            <a href="${escapeHtml(cls.onlineLink)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="width: fit-content;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5-5m0 0l-5-5m5 5H9a8 8 0 0 0 0 16h3"/></svg>
              Bấm vào đây để vào lớp học Online (Zoom / Meet)
            </a>
          ` : ""}
        </div>
      </div>
    ` : ""}

    <!-- Thời khóa biểu các ngày dạy để học viên theo dõi -->
    <div class="stat-card" style="margin-top: 14px; margin-bottom: 0;">
      <div style="width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
          <h4 style="font-size: 15px; color: var(--text-main); font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Thời Khóa Biểu & Lịch Học Lớp Em
          </h4>
          <span style="font-size: 12px; color: var(--text-muted);">
            Lịch định kỳ: <strong>${escapeHtml(cls ? cls.scheduleDays : "")}</strong>
          </span>
        </div>

        ${classUpcomingSchedules.length === 0 ? `
          <p style="font-size: 13px; color: var(--text-muted); margin: 0; padding: 10px; background: #f8fafc; border-radius: 8px; text-align: center;">
            Thầy chưa thêm lịch học cụ thể mới trong tuần. Em chú ý lịch định kỳ (${escapeHtml(cls ? cls.scheduleDays + " • " + cls.scheduleTime : "")}) nhé!
          </p>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${classUpcomingSchedules.map(sch => `
              <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="font-weight: 700; color: var(--primary); font-size: 13px;">
                    📅 ${formatDateDisplay(sch.date)} • ⏰ ${escapeHtml(sch.time || (cls ? cls.scheduleTime : "19:30"))}
                  </div>
                  <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main); margin-top: 2px;">
                    📖 ${escapeHtml(sch.topic || "Buổi học Tiếng Trung")}
                  </div>
                  ${sch.notes ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">📝 Dặn dò chuẩn bị: ${escapeHtml(sch.notes)}</div>` : ""}
                </div>
                ${(sch.link || (cls && cls.onlineLink)) ? `
                  <a href="${escapeHtml(sch.link || cls.onlineLink)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="font-size: 12px;">
                    Vào Học
                  </a>
                ` : ""}
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>

    <!-- Thống kê số buổi đã học -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon icon-lessons">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg>
        </div>
        <div class="stat-data">
          <span class="stat-label">Số buổi đã tham gia</span>
          <h3>${attendedSessions.length} buổi</h3>
          <span class="stat-desc">Tổng số buổi đã lên lớp</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-tuition">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="stat-data">
          <span class="stat-label">Học phí tháng ${formatMonthDisplay(currentMonth)}</span>
          <h3 style="color: ${remainingAmount === 0 ? "var(--success)" : "var(--danger)"};">
            ${remainingAmount === 0 ? "Đã hoàn thành ✓" : formatVND(remainingAmount)}
          </h3>
          <span class="stat-desc">Đã nộp: <strong>${formatVND(paidAmount)}</strong> / Cần nộp: <strong>${formatVND(dueAmount)}</strong></span>
        </div>
      </div>
    </div>

    <!-- Hướng dẫn chuyển khoản học phí nếu còn thiếu -->
    ${remainingAmount > 0 ? `
      <div class="student-tuition-notice-box">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <h4>Thông tin đóng học phí tháng ${formatMonthDisplay(currentMonth)}</h4>
          <p>${escapeHtml(teacher.tuitionNotice || "Học phí xin vui lòng chuyển khoản trước ngày mùng 5 hàng tháng.")}</p>
          <div class="bank-info-badge">
            <strong>Ngân hàng:</strong> ${escapeHtml(teacher.bankName || "Techcombank")}<br>
            <strong>Số tài khoản:</strong> <span style="font-size: 15px; font-weight: 700; color: #1e293b;">${escapeHtml(teacher.bankAccount || "")}</span><br>
            <strong>Chủ tài khoản:</strong> ${escapeHtml(teacher.bankOwner || "")}<br>
            <strong>Cú pháp chuyển khoản:</strong> <code>${escapeHtml(student.code || student.name)} - Hoc phi thang ${formatMonthDisplay(currentMonth)}</code>
          </div>
        </div>
      </div>
    ` : ""}

    <!-- Lịch sử các bài học gần nhất -->
    <div class="table-container">
      <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color); font-weight: 700;">
        Nhật Ký Các Buổi Học Gần Nhất
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Ngày học</th>
            <th>Nội dung bài học</th>
            <th>Tình trạng</th>
            <th>Bài tập về nhà</th>
          </tr>
        </thead>
        <tbody>
          ${recentSessions.length === 0 ? `
            <tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Chưa có buổi học nào được ghi nhận.</td></tr>
          ` : recentSessions.map(session => {
            const status = session.attendance ? session.attendance[student.id] : "absent";
            return `
              <tr>
                <td><strong>${formatDateDisplay(session.date)}</strong></td>
                <td><strong>${escapeHtml(session.lessonTopic)}</strong></td>
                <td>
                  <span class="badge ${status === "present" ? "badge-success" : "badge-danger"}">
                    ${status === "present" ? "Có mặt" : "Vắng mặt"}
                  </span>
                </td>
                <td><small style="color: var(--text-muted);">${escapeHtml(session.homework || "-")}</small></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// MODAL CÀI ĐẶT THÔNG TIN THẦY GIÁO
// ============================================================================
function openTeacherSettingsModal() {
  const teacher = appState.teacherSettings || DEFAULT_TEACHER_SETTINGS;
  document.getElementById("cfg-teacher-name").value = teacher.teacherName || "";
  document.getElementById("cfg-teacher-phone").value = teacher.phone || "";
  document.getElementById("cfg-bank-name").value = teacher.bankName || "";
  document.getElementById("cfg-bank-account").value = teacher.bankAccount || "";
  document.getElementById("cfg-bank-owner").value = teacher.bankOwner || "";
  document.getElementById("cfg-tuition-notice").value = teacher.tuitionNotice || "";

  openModal("modal-teacher-settings");
}

function handleSaveTeacherSettings(e) {
  e.preventDefault();
  appState.teacherSettings = {
    teacherName: document.getElementById("cfg-teacher-name").value.trim(),
    phone: document.getElementById("cfg-teacher-phone").value.trim(),
    bankName: document.getElementById("cfg-bank-name").value.trim(),
    bankAccount: document.getElementById("cfg-bank-account").value.trim(),
    bankOwner: document.getElementById("cfg-bank-owner").value.trim().toUpperCase(),
    tuitionNotice: document.getElementById("cfg-tuition-notice").value.trim()
  };

  saveDataToStorage();
  closeModal("modal-teacher-settings");
  showToast("Đã lưu thông tin tài khoản thầy giáo!");
}

// ============================================================================
// SAO LƯU & KHÔI PHỤC DỮ LIỆU
// ============================================================================
function openBackupModal() {
  openModal("modal-backup");
}

function exportDataToFile() {
  const dataStr = JSON.stringify(appState, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `ZhongWen_Backup_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Đã xuất file sao lưu dữ liệu!");
}

function handleRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.classes && parsed.students) {
        appState = parsed;
        saveDataToStorage();
        initApp();
        closeModal("modal-backup");
        showToast("Khôi phục dữ liệu từ file thành công!");
      } else {
        alert("File sao lưu không đúng cấu trúc!");
      }
    } catch (err) {
      alert("Lỗi đọc file JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

function resetToSampleData() {
  if (!confirm("Bạn có chắc chắn muốn nạp lại dữ liệu tiếng Trung mẫu ban đầu? Toàn bộ thay đổi hiện tại sẽ được thay bằng dữ liệu mẫu.")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  loadDataFromStorage();
  initApp();
  closeModal("modal-backup");
  showToast("Đã khôi phục bộ dữ liệu mẫu Tiếng Trung!");
}

// ============================================================================
// HÀM TIỆN ÍCH CHUNG
// ============================================================================
function populateClassDropdowns() {
  const attendanceSelect = document.getElementById("select-attendance-class");
  const modalAttSelect = document.getElementById("att-class-select");
  const tuitionClassSelect = document.getElementById("select-tuition-class");

  const optionsHtml = appState.classes.map(c => `
    <option value="${c.id}">${escapeHtml(c.name)} (${c.level})</option>
  `).join("");

  if (attendanceSelect) {
    const currentVal = attendanceSelect.value;
    attendanceSelect.innerHTML = optionsHtml;
    if (currentVal && appState.classes.some(c => c.id === currentVal)) {
      attendanceSelect.value = currentVal;
    }
  }

  if (modalAttSelect) {
    modalAttSelect.innerHTML = optionsHtml;
  }

  const schedClassSelect = document.getElementById("sched-class-select");
  if (schedClassSelect) {
    schedClassSelect.innerHTML = optionsHtml;
  }

  if (tuitionClassSelect) {
    const currentVal = tuitionClassSelect.value;
    tuitionClassSelect.innerHTML = `<option value="all">Tất cả các lớp</option>` + optionsHtml;
    if (currentVal) tuitionClassSelect.value = currentVal;
  }

  const calendarFilterSelect = document.getElementById("calendar-filter-class");
  if (calendarFilterSelect) {
    const currentVal = calendarFilterSelect.value;
    calendarFilterSelect.innerHTML = `<option value="all">Tất cả các lớp</option>` + optionsHtml;
    if (currentVal) calendarFilterSelect.value = currentVal;
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function formatNumberWithDots(val) {
  if (val === null || val === undefined) return "";
  const numStr = String(val).replace(/\D/g, "");
  if (!numStr) return "";
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumberFromDots(val) {
  if (!val) return 0;
  return parseInt(String(val).replace(/\./g, ""), 10) || 0;
}

function formatMoneyInput(input) {
  const raw = input.value;
  input.value = formatNumberWithDots(raw);
}

function formatVND(amount) {
  const n = parseInt(amount, 10) || 0;
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatMonthDisplay(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  return `${month}/${year}`;
}

function getCurrentMonthString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Lắng nghe click đóng modal khi click ra ngoài backdrop
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) {
    e.target.classList.remove("open");
  }
});

// Khởi chạy ứng dụng khi DOM tải xong
document.addEventListener("DOMContentLoaded", initApp);
