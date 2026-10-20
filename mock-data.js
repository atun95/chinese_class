// ============================================================================
// DỮ LIỆU MẪU BAN ĐẦU DÀNH CHO GIÁO VIÊN TIẾNG TRUNG ONLINE
// ============================================================================

const DEFAULT_TEACHER_SETTINGS = {
  teacherName: "Thầy Lý Quốc (李老师)",
  phone: "0988 123 456",
  bankName: "Techcombank",
  bankAccount: "1903567891011",
  bankOwner: "LY QUOC",
  tuitionNotice: "Học phí xin vui lòng chuyển khoản trước ngày mùng 5 hàng tháng. Cú pháp: [Họ Tên] - [Tên Lớp]. Chúc các bạn học tập tốt! 加油!"
};

const DEFAULT_CLASSES = [
  {
    id: "cls-hsk2-k1",
    name: "Tiếng Trung HSK 2 Căn Bản (K01)",
    level: "HSK 2",
    scheduleDays: "Thứ 2 - 4 - 6",
    scheduleTime: "19:30 - 21:00",
    feeType: "per_lesson", // per_lesson | monthly
    feeAmount: 120000,
    onlineLink: "https://meet.google.com/abc-defg-hjk",
    notes: "Giáo trình Chuẩn HSK 2 (15 bài). Mục tiêu thi đỗ 180+ điểm HSK 2.",
    createdAt: "2026-09-01"
  },
  {
    id: "cls-hsk3-k4",
    name: "Luyện Thi HSK 3 & HSKK Trung Cấp (K04)",
    level: "HSK 3",
    scheduleDays: "Thứ 3 - 5 - 7",
    scheduleTime: "20:00 - 21:30",
    feeType: "monthly",
    feeAmount: 1200000,
    onlineLink: "https://us02web.zoom.us/j/8920192830",
    notes: "Luyện 600 từ vựng và ngữ pháp trọng điểm, phản xạ nói HSKK.",
    createdAt: "2026-09-15"
  },
  {
    id: "cls-gt-kd",
    name: "Tiếng Trung Giao Tiếp Kinh Doanh & Đặt Hàng 1688",
    level: "Giao tiếp",
    scheduleDays: "Thứ 7 - Chủ Nhật",
    scheduleTime: "09:00 - 10:30",
    feeType: "per_lesson",
    feeAmount: 150000,
    onlineLink: "https://voovmeeting.com/dm/sample123",
    notes: "Kỹ năng chat đàm phán giá cả, tìm xưởng Quảng Châu, xử lý khiếu nại.",
    createdAt: "2026-10-01"
  }
];

const DEFAULT_STUDENTS = [
  {
    id: "hv-001",
    classId: "cls-hsk2-k1",
    name: "Nguyễn Thu Hà",
    chineseName: "阮秋霞 (Qiūxiá)",
    phone: "0912345678",
    code: "HV001",
    joinDate: "2026-09-01",
    note: "Mục tiêu thi HSK 2 tháng 12 để xin học bổng Đài Loan"
  },
  {
    id: "hv-002",
    classId: "cls-hsk2-k1",
    name: "Trần Minh Quân",
    chineseName: "陈明军 (Míngjūn)",
    phone: "0987654321",
    code: "HV002",
    joinDate: "2026-09-01",
    note: "Nhân viên xuất nhập khẩu, cần giao tiếp với đối tác Thượng Hải"
  },
  {
    id: "hv-003",
    classId: "cls-hsk2-k1",
    name: "Lê Hoàng Yến",
    chineseName: "黎黄燕 (Huángyàn)",
    phone: "0905123987",
    code: "HV003",
    joinDate: "2026-09-05",
    note: "Yêu thích văn hóa và phim ảnh Trung Quốc"
  },
  {
    id: "hv-004",
    classId: "cls-hsk3-k4",
    name: "Phạm Hải Đăng",
    chineseName: "范海登 (Hǎidēng)",
    phone: "0933112233",
    code: "HV004",
    joinDate: "2026-09-15",
    note: "Sinh viên ĐH Ngoại ngữ, cần chuẩn đầu ra HSK 3"
  },
  {
    id: "hv-005",
    classId: "cls-hsk3-k4",
    name: "Vũ Phương Linh",
    chineseName: "武芳玲 (Fānglíng)",
    phone: "0977889900",
    code: "HV005",
    joinDate: "2026-09-15",
    note: "Đã có HSK 2, mục tiêu hoàn thành HSK 3 trong 3 tháng"
  },
  {
    id: "hv-006",
    classId: "cls-gt-kd",
    name: "Đỗ Quốc Bảo",
    chineseName: "杜国宝 (Guóbǎo)",
    phone: "0944556677",
    code: "HV006",
    joinDate: "2026-10-01",
    note: "Chủ shop order quần áo Taobao / 1688 tại Hà Nội"
  }
];

const DEFAULT_SESSIONS = [
  // Lớp HSK 2: Tháng 10
  {
    id: "ses-01",
    classId: "cls-hsk2-k1",
    date: "2026-10-05",
    lessonTopic: "Bài 1: Chín tháng là lúc Bắc Kinh đẹp nhất (九月去北京旅游最好)",
    homework: "Làm bài tập sách bài tập trang 10-12, chép từ mới mỗi từ 3 dòng.",
    attendance: {}
  },
  {
    id: "ses-02",
    classId: "cls-hsk2-k1",
    date: "2026-10-07",
    lessonTopic: "Bài 1 (tiếp): Ngữ pháp câu hỏi với '怎么样' & trợ từ ngữ khí '了'",
    homework: "Ghi âm phát âm 5 câu hội thoại mẫu gửi nhóm Zalo.",
    attendance: {}
  },
  {
    id: "ses-03",
    classId: "cls-hsk2-k1",
    date: "2026-10-09",
    lessonTopic: "Bài 2: Tôi mỗi ngày sáu giờ đều thức dậy (我每天六点起床)",
    homework: "Luyện viết 20 chữ Hán mới bài 2.",
    attendance: {}
  },
  {
    id: "ses-04",
    classId: "cls-hsk2-k1",
    date: "2026-10-12",
    lessonTopic: "Bài 2 (tiếp): Động từ lặp lại & Cấu trúc thời gian '从...到...'",
    homework: "Đặt 5 câu với cấu trúc 从...到...",
    attendance: {}
  },
  {
    id: "ses-05",
    classId: "cls-hsk2-k1",
    date: "2026-10-14",
    lessonTopic: "Bài 3: Cà phê bên trái là của ai? (左边那个咖啡是谁的)",
    homework: "Luyện nghe File Audio Bài 3 phần 1.",
    attendance: {}
  },
  {
    id: "ses-06",
    classId: "cls-hsk2-k1",
    date: "2026-10-16",
    lessonTopic: "Bài 3 (tiếp): Phương vị từ (上/下/左/右) và đại từ sở hữu 的",
    homework: "Ôn tập 50 từ vựng đã học chuẩn bị kiểm tra ngắn 15 phút.",
    attendance: {}
  },

  // Lớp HSK 3: Tháng 10
  {
    id: "ses-07",
    classId: "cls-hsk3-k4",
    date: "2026-10-06",
    lessonTopic: "Bài 1: Cuối tuần bạn có dự định gì? (周末你有什么打算)",
    homework: "Viết đoạn văn ngắn 80 chữ về kế hoạch du lịch cuối tuần.",
    attendance: {}
  },
  {
    id: "ses-08",
    classId: "cls-hsk3-k4",
    date: "2026-10-08",
    lessonTopic: "Bài 1 (tiếp): Liên từ 一边...一边... và bổ ngữ kết quả",
    homework: "Luyện phát âm phần thi HSKK phần nhắc lại câu.",
    attendance: {}
  },
  {
    id: "ses-09",
    classId: "cls-hsk3-k4",
    date: "2026-10-13",
    lessonTopic: "Bài 2: Anh ấy khi nào về? (他什么时候回来 - Bổ ngữ xu hướng 来/去)",
    homework: "Hoàn thiện đề thi thử HSK 3 Đọc hiểu số 1.",
    attendance: {}
  },

  // Lớp Giao tiếp Kinh doanh: Tháng 10
  {
    id: "ses-10",
    classId: "cls-gt-kd",
    date: "2026-10-03",
    lessonTopic: "Chủ đề: Chào hỏi, giới thiệu mặt hàng và hỏi bảng báo giá (报价单)",
    homework: "Soạn thảo 1 mẫu tin nhắn chat hỏi giá xưởng 1688.",
    attendance: {}
  },
  {
    id: "ses-11",
    classId: "cls-gt-kd",
    date: "2026-10-04",
    lessonTopic: "Chủ đề: Đàm phán số lượng tối thiểu (起订量 MOQ) và chiết khấu",
    homework: "Thực hành hội thoại trả giá giảm 15%.",
    attendance: {}
  },
  {
    id: "ses-12",
    classId: "cls-gt-kd",
    date: "2026-10-10",
    lessonTopic: "Chủ đề: Đặt cọc, phương thức thanh toán Alipay / WeChat Pay",
    homework: "Tra cứu từ vựng về hóa đơn và phí vận chuyển nội địa TQ.",
    attendance: {}
  }
];

// Bản ghi thanh toán học phí (Ghi nhận số tiền học viên đã nộp)
const DEFAULT_PAYMENTS = [];

// Thời khóa biểu & Lịch dạy học để học viên theo dõi (không tính vào học phí)
const DEFAULT_SCHEDULES = [
  {
    id: "sch-01",
    classId: "cls-hsk2-k1",
    date: "2026-10-19",
    time: "19:30 - 21:00",
    topic: "Bài 4: Cô ấy đi Bắc Kinh làm việc (Ngữ pháp 是...的)",
    notes: "Học viên chuẩn bị trước từ mới trang 28",
    link: "https://meet.google.com/abc-defg-hjk"
  },
  {
    id: "sch-02",
    classId: "cls-hsk3-k4",
    date: "2026-10-20",
    time: "20:00 - 21:30",
    topic: "Bài 3: Trái cây trên bàn nhiều như vậy (Ngữ pháp 越来越...)",
    notes: "Luyện phát âm đoạn đối thoại 1 & 2",
    link: "https://us02web.zoom.us/j/8920192830"
  },
  {
    id: "sch-03",
    classId: "cls-hsk2-k1",
    date: "2026-10-21",
    time: "19:30 - 21:00",
    topic: "Bài 4 (tiếp): Luyện tập hội thoại và ngữ pháp",
    notes: "Kiểm tra 15 phút đầu giờ",
    link: "https://meet.google.com/abc-defg-hjk"
  },
  {
    id: "sch-04",
    classId: "cls-hsk3-k4",
    date: "2026-10-22",
    time: "20:00 - 21:30",
    topic: "Bài 3 (tiếp): Bổ ngữ trạng thái 得 và liên từ 虽然...但是...",
    notes: "Làm đề luyện đọc HSK 3",
    link: "https://us02web.zoom.us/j/8920192830"
  },
  {
    id: "sch-05",
    classId: "cls-gt-kd",
    date: "2026-10-24",
    time: "09:00 - 10:30",
    topic: "Chủ đề: Đàm phán vận chuyển & gom hàng kho Bằng Tường",
    notes: "Chuẩn bị mẫu packing list thực tế",
    link: "https://voovmeeting.com/dm/sample123"
  }
];

