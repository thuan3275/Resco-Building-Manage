const API_URL = "https://script.google.com/macros/s/AKfycbwn6nIqNxEliqlnRBHwVoxoEA5ItvOxJpW5GdfPifq-6_uLSHVHA5tm-ydN4g_R6Tan/exec";

// --- XỬ LÝ ĐĂNG NHẬP ---
async function handleLogin() {
    const id = document.getElementById('staffId').value;
    if(!id) return alert("Vui lòng nhập mã!");

    const res = await callAPI({ action: "login", staffId: id });
    if(res.success) {
        sessionStorage.setItem('staffId', id);
        sessionStorage.setItem('staffName', res.name);
        sessionStorage.setItem('staffRole', res.role);
        //alert("Thành công nhập mã!");
        showApp();
        //location.reload(true);
    } else {
        alert(res.message);
    }
}
function showApp() { 
    const role = sessionStorage.getItem('staffRole');
    const name = sessionStorage.getItem('staffName');

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    
    // Hiển thị lời chào và nút Đăng xuất
    const showInfo = "<div class='alert alert-info d-flex justify-content-between align-items-center'>";
    showInfo += "<span>Chào, <b> ";
    showInfo += name ;
    showInfo +="</b> ( ";
    showInfo += role;
    showInfo +=" )</span><button class='btn btn-sm btn-outline-danger' onclick='logout()'>Đăng xuất</button></div>";
    document.getElementById('userInfo').innerHTML = showInfo;

    // Nếu là Admin, hiển thị thêm nút chuyển hướng nhanh
    if (role === 'Admin' || role === 'Quản lý') {
      document.getElementById('adminLink').style.display = 'block';
      
      // Tùy chọn: Tự động hỏi có muốn vào trang Admin không
      Swal.fire({
        title: 'Chào Admin!',
        text: 'Bạn có muốn chuyển sang trang Quản lý không?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Vào Admin',
        cancelButtonText: 'Ở lại nhập liệu'
      }).then((result) => {
        if (result.isConfirmed) {
          goToAdmin();
        }
      });
    }
  }
  function goToAdmin() {
    const currentUrl = window.location.href;
    // Thay url_web_app_admin bằng link Deploy của file Admin.html
    const adminUrl = currentUrl + "admin.html"; 
    window.location.href = adminUrl;
  }

  //function logout() {
  //  sessionStorage.clear(); // Xóa sạch bộ nhớ phiên
  //  location.reload(true);      // Tải lại trang để về màn hình đăng nhập
  //}
// --- CHỤP & NÉN ẢNH ---
let base64Image = "";
document.getElementById('camInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            const preview = document.getElementById('preview');
            preview.src = canvas.toDataURL('image/jpeg');
            preview.style.display = "block";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- GỬI DỮ LIỆU ---
async function uploadData() {
    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.innerText = "Đang gửi...";

    const data = {
        action: "saveRecord",
        deviceId: document.getElementById('deviceId').value,
        value: document.getElementById('meterValue').value,
        image: base64Image,
        staffId: sessionStorage.getItem('staffId')
    };

    const res = await callAPI(data);
    alert(res.message + (res.aiResult ? "\nAI đọc được: " + res.aiResult : ""));
    location.reload();
}

// --- HÀM GỌI API CHUNG ---
async function callAPI(payload) {
    const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    return await response.json();
}

function logout() {
    sessionStorage.clear();
    window.location.href = "index.html";
}
