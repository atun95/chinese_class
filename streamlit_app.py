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


def get_firebase_from_secrets():
    """Đọc cấu hình Firebase Firestore từ Streamlit Secrets."""
    config = {}
    try:
        if "FIREBASE_CONFIG" in st.secrets:
            raw = st.secrets["FIREBASE_CONFIG"]
            if isinstance(raw, dict):
                config = dict(raw)
            else:
                config = json.loads(str(raw).strip())
        elif "FIREBASE_API_KEY" in st.secrets and "FIREBASE_PROJECT_ID" in st.secrets:
            proj = str(st.secrets["FIREBASE_PROJECT_ID"]).strip()
            config = {
                "apiKey": str(st.secrets["FIREBASE_API_KEY"]).strip(),
                "projectId": proj,
                "authDomain": str(st.secrets.get("FIREBASE_AUTH_DOMAIN", f"{proj}.firebaseapp.com")).strip(),
                "storageBucket": str(st.secrets.get("FIREBASE_STORAGE_BUCKET", f"{proj}.appspot.com")).strip(),
                "appId": str(st.secrets.get("FIREBASE_APP_ID", "")).strip(),
            }
    except Exception:
        pass
    return config


def firebase_secrets_configured():
    cfg = get_firebase_from_secrets()
    return bool(cfg and cfg.get("apiKey") and cfg.get("projectId"))


def build_full_html():
    index_html = read_file("index.html")
    style_css = read_file("style.css")
    config_js = read_file("config.js")
    mock_data_js = read_file("mock-data.js")
    app_js = read_file("app.js")

    fb_config = get_firebase_from_secrets()

    # Nếu có secrets từ Streamlit Cloud, tiêm trực tiếp vào config
    secrets_injection = ""
    if fb_config and fb_config.get("apiKey") and fb_config.get("projectId"):
        cfg_json = json.dumps(fb_config)
        secrets_injection = f"""
        <script>
            window.ZHONGWEN_CONFIG = window.ZHONGWEN_CONFIG || {{}};
            window.ZHONGWEN_CONFIG.firebaseConfig = {cfg_json};
        </script>
        """

    # Nhúng trực tiếp CSS
    index_html = index_html.replace(
        '<link rel="stylesheet" href="style.css">',
        f'<style>\n{style_css}\n</style>'
    )

    # Nhúng Google Firebase Compat CDN SDK trước các script ứng dụng
    firebase_cdn = """
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
    """

    # Thay thế các script bằng inline code
    scripts_replacement = f"""
    {firebase_cdn}
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
    if firebase_secrets_configured():
        st.success("Đã cấu hình **Google Firebase** qua Streamlit Secrets. Dữ liệu lưu trữ lâu dài và không bao giờ bị tạm dừng.")
    else:
        st.info(
            "Có thể cấu hình `FIREBASE_CONFIG` trong Streamlit Secrets (App settings → Secrets), "
            "hoặc bấm biểu tượng ☁️ trên thanh menu để kết nối trực tiếp."
        )
    st.markdown("---")
    st.markdown("### 📌 Hướng dẫn nhanh:")
    st.markdown("1. Dữ liệu thay đổi trên máy tính sẽ tự động lưu lên đám mây Firebase.")
    st.markdown("2. Người khác mở link Streamlit này sẽ thấy dữ liệu mới nhất.")
    st.markdown("3. Bấm biểu tượng ☁️ trên thanh menu để kiểm tra hoặc đổi cấu hình.")

# Hiển thị app với kích thước 100%
components.html(html_bundle, height=1150, scrolling=True)
