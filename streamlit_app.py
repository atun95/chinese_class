import os
import streamlit as st
import streamlit.components.v1 as components

# ============================================================================
# CẤU HÌNH GIAO DIỆN STREAMLIT
# ============================================================================
st.set_page_config(
    page_title="Quản Lý Lớp Học Tiếng Trung Online",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Tối ưu hóa không gian hiển thị, loại bỏ khoảng trắng thừa của Streamlit
st.markdown("""
<style>
    /* Ẩn header và footer mặc định của Streamlit */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Mở rộng tối đa chiều ngang và bỏ padding */
    .block-container {
        padding-top: 0rem !important;
        padding-bottom: 0rem !important;
        padding-left: 0rem !important;
        padding-right: 0rem !important;
        max-width: 100% !important;
    }
    
    /* Khung iframe ứng dụng */
    iframe {
        border: none !important;
        width: 100% !important;
        min-height: 100vh !important;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================================
# TẢI VÀ TỔNG HỢP MÃ NGUỒN (INLINE TẤT CẢ FILE CSS & JAVASCRIPT)
# ============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def read_file(filename):
    filepath = os.path.join(BASE_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    return ""


def get_supabase_from_secrets():
    """Đọc URL và khóa client (anon hoặc publishable) từ Streamlit Secrets."""
    url = ""
    key = ""
    try:
        if "SUPABASE_URL" in st.secrets:
            url = str(st.secrets["SUPABASE_URL"]).strip()
        if "SUPABASE_PUBLISHABLE_KEY" in st.secrets:
            key = str(st.secrets["SUPABASE_PUBLISHABLE_KEY"]).strip()
        elif "SUPABASE_KEY" in st.secrets:
            key = str(st.secrets["SUPABASE_KEY"]).strip()
    except Exception:
        pass
    return url, key


def supabase_secrets_configured():
    url, key = get_supabase_from_secrets()
    return bool(url and key)


def build_full_html():
    index_html = read_file("index.html")
    style_css = read_file("style.css")
    config_js = read_file("config.js")
    mock_data_js = read_file("mock-data.js")
    app_js = read_file("app.js")

    supabase_url, supabase_key = get_supabase_from_secrets()

    # Nếu có secrets từ Streamlit Cloud, tiêm trực tiếp vào config
    secrets_injection = ""
    if supabase_url and supabase_key:
        secrets_injection = f"""
        <script>
            window.ZHONGWEN_CONFIG = window.ZHONGWEN_CONFIG || {{}};
            window.ZHONGWEN_CONFIG.supabaseUrl = "{supabase_url}";
            window.ZHONGWEN_CONFIG.supabaseAnonKey = "{supabase_key}";
        </script>
        """

    # Nhúng trực tiếp CSS
    index_html = index_html.replace(
        '<link rel="stylesheet" href="style.css">',
        f'<style>\n{style_css}\n</style>'
    )

    # Nhúng Supabase CDN SDK trước các script ứng dụng
    supabase_cdn = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'

    # Thay thế các script bằng inline code
    scripts_replacement = f"""
    {supabase_cdn}
    <script>
    {config_js}
    </script>
    {secrets_injection}
    <script>
    {mock_data_js}
    </script>
    <script>
    {app_js}
    </script>
    """

    # Thay các thẻ script trong index.html
    import re
    # Xóa các dòng link script config.js, mock-data.js, app.js cũ
    index_html = re.sub(r'<script\s+src=["\'](config\.js|mock-data\.js|app\.js)["\']><\/script>', '', index_html)
    
    # Chèn khối script mới trước </body>
    if "</body>" in index_html:
        index_html = index_html.replace("</body>", f"{scripts_replacement}\n</body>")
    else:
        index_html += scripts_replacement

    return index_html

# ============================================================================
# HIỂN THỊ ỨNG DỤNG TRÊN STREAMLIT
# ============================================================================
html_bundle = build_full_html()

# Sidebar tiện ích
with st.sidebar:
    st.title("🎓 Quản Lý Lớp Học")
    st.markdown("---")
    st.markdown("### ☁️ Trạng Thái Backend")
    if supabase_secrets_configured():
        st.success("Đã cấu hình **Supabase** qua Streamlit Secrets. Ứng dụng tự động lưu và tải dữ liệu đám mây.")
    else:
        st.warning(
            "Chưa thấy `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY` (hoặc `SUPABASE_KEY`) trong Streamlit Secrets. "
            "Thêm trong App settings → Secrets, hoặc cấu hình qua nút ☁️ trên thanh menu. "
            "**Không** dùng `SUPABASE_SECRET_KEY` trong app trình duyệt."
        )
    st.markdown("---")
    st.markdown("### 📌 Hướng dẫn nhanh:")
    st.markdown("1. Dữ liệu thay đổi trên máy tính sẽ tự động lưu lên đám mây.")
    st.markdown("2. Người khác mở link Streamlit này sẽ thấy dữ liệu mới nhất.")
    st.markdown("3. Bấm biểu tượng ☁️ trên thanh menu để kiểm tra hoặc đổi cấu hình.")

# Hiển thị app với kích thước 100%
components.html(html_bundle, height=1150, scrolling=True)
