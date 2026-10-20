-- ============================================================================
-- SCRIPT KHỞI TẠO BẢNG DATABASE CHO PHẦN MỀM QUẢN LÝ LỚP HỌC TIẾNG TRUNG
-- Chạy đoạn mã này trong mục "SQL Editor" trên trang quản trị Supabase.com
-- ============================================================================

-- 1. Tạo bảng zhongwen_app_data lưu trữ toàn bộ dữ liệu ứng dụng dưới dạng JSON
CREATE TABLE IF NOT EXISTS zhongwen_app_data (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Kích hoạt Row Level Security (RLS)
ALTER TABLE zhongwen_app_data ENABLE ROW LEVEL SECURITY;

-- 3. Cấp quyền Đọc và Ghi cho khóa công khai (anon key)
DROP POLICY IF EXISTS "Cho phép đọc dữ liệu công khai" ON zhongwen_app_data;
CREATE POLICY "Cho phép đọc dữ liệu công khai" 
ON zhongwen_app_data FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Cho phép ghi dữ liệu" ON zhongwen_app_data;
CREATE POLICY "Cho phép ghi dữ liệu" 
ON zhongwen_app_data FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép cập nhật dữ liệu" ON zhongwen_app_data;
CREATE POLICY "Cho phép cập nhật dữ liệu" 
ON zhongwen_app_data FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Bật tính năng Realtime để tự động cập nhật khi nhiều người cùng mở app
ALTER PUBLICATION supabase_realtime ADD TABLE zhongwen_app_data;
