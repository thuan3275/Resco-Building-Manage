const API_URL = "https://script.google.com/macros/s/AKfycbzDIF_Cwxpjztl3w2KuO_Qm0HxUdzBENmF--jSWaSszTK8AzpMU5pU0YfU0fc4Whuv1/exec";
let base64Image = "";

// KIỂM TRA ĐĂNG NHẬP NGAY KHI TẢI TRANG
document.addEventListener("DOMContentLoaded", () => {
    const savedId = sessionStorage.getItem('employeeID');
    if (savedId) {
        showApp(); // Nếu đã có session, vào thẳng App
    }
});
// --- XỬ LÝ ĐĂNG NHẬP ---
async function handleLogin() {
    const id = document.getElementById('staffId').value;
    if (!id) return Swal.fire('Lỗi', 'Vui lòng nhập mã nhân viên!', 'error');

    showLoading(true);
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "login", staffId: id })
        });
        const res = await response.json();

        if (res.success) {
            sessionStorage.setItem('employeeID', res.employeeID);
            sessionStorage.setItem('staffName', res.fullName);
            sessionStorage.setItem('staffRole', res.role);
            showApp();
        } else {
            Swal.fire('Thất bại', res.message, 'error');
        }
    } catch (e) {
        Swal.fire('Lỗi', 'Không thể kết nối Server', 'error');
    } finally {
        showLoading(false);
    }
}
function showApp() { 
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    
    const name = sessionStorage.getItem('staffName');
    const role = sessionStorage.getItem('staffRole');

    document.getElementById('userInfo').innerHTML = `
        <div class="alert alert-primary d-flex justify-content-between align-items-center p-2 mb-0 w-100">
            <span class="small">Chào, <b>${name}</b></span>
            <button class="btn btn-sm btn-outline-danger border-0" onclick="logout()">Thoát</button>
        </div>
    `;

    /*// Hiển thị lời chào và nút Đăng xuất
    let showInfo = "<div class='alert alert-info d-flex justify-content-between align-items-center'><span>Chào, <b> " + name + "</b> ( "+ role+" )</span><button class='btn btn-sm btn-outline-danger' onclick='logout()'>Đăng xuất</button></div>";
    document.getElementById('userInfo').innerHTML = showInfo;*/

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

// Đi đến trang Admin
  function goToAdmin() {
    let currentUrl = window.location.href;
    if(currentUrl.includes("index"))
        currentUrl = currentUrl.replace("index","admin");
      else
        currentUrl += "admin.html";
    // Thay url_web_app_admin bằng link Deploy của file Admin.html
    const adminUrl = currentUrl; 
    window.location.href = adminUrl;
  }

// Xử lý nén ảnh khi chọn file
document.getElementById('camInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
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
            
            // Lưu base64 nén 70%
            base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            
            // Hiển thị preview
            const preview = document.getElementById('preview');
            preview.src = canvas.toDataURL('image/jpeg');
            preview.style.display = "block";
            document.getElementById('camPlaceholder').style.display = "none";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Load trang Admin
async function loadAdminDashboard() {
    showLoading(true); 
    
    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: "getAdminData" }) 
        });
        
        if (!response.ok) throw new Error("Mất kết nối với máy chủ Google");
        
        const data = await response.json();

        // KIỂM TRA DỮ LIỆU ĐẦU VÀO (Sửa lỗi slice ở đây)
        if (!data || !data.logs || !Array.isArray(data.logs)) {
            console.error("Dữ liệu logs không hợp lệ:", data);
            return Swal.fire('Thông báo', 'Bảng dữ liệu đang trống hoặc bị sai cấu trúc!', 'info');
        }

        // Cập nhật thống kê
        if (data.stats) {
            document.getElementById('count-active').innerText = data.stats.totalDevices || 0;
            document.getElementById('count-broken').innerText = data.stats.brokenCount || 0;
            document.getElementById('count-water').innerText = data.stats.waterCount || 0;
        }

        const logsBody = document.getElementById('logsBody');
        logsBody.innerHTML = ""; 

        // CHỈ CHẠY SLICE KHI CHẮC CHẮN CÓ DỮ LIỆU
        // Nếu chỉ có 1 dòng (dòng tiêu đề) thì không hiện gì
        if (data.logs.length <= 1) {
            logsBody.innerHTML = "<tr><td colspan='6' class='text-center'>Chưa có dữ liệu ghi chép</td></tr>";
        } else {
            const rows = data.logs.slice(1).reverse(); 

            rows.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row[3] ? new Date(row[3]).toLocaleString('vi-VN') : '---'}</td>
                    <td><span class="badge bg-info">${row[1] || 'N/A'}</span></td>
                    <td>${row[2] || '---'}</td>
                    <td class="fw-bold">${row[4] || 0} m³</td>
                    <td>
                        ${(row[5] && row[5] !== "No Image") 
                            ? `<img src="${row[5]}" style="width:40px; border-radius:4px; cursor:pointer" onclick="window.open('${row[5]}')">` 
                            : "---"}
                    </td>
                    <td><span class="badge ${row[7] === 'Hoàn thành' ? 'bg-success' : 'bg-warning'}">${row[7] || 'Chờ'}</span></td>
                `;
                logsBody.appendChild(tr);
            });
        }

        // Khởi tạo DataTable
        if ($.fn.DataTable.isDataTable('#logsTable')) {
            $('#logsTable').DataTable().destroy();
        }
        $('#logsTable').DataTable({
            order: [[0, 'desc']],
            language: { url: "//cdn.datatables.net/plug-ins/1.13.4/i18n/vi.json" }
        });

    } catch (error) {
        console.error("Lỗi Dashboard:", error);
        Swal.fire('Lỗi', 'Không thể hiển thị dữ liệu: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function renderLogsTable(data) {
    const tableBody = document.getElementById('logsBody');
    // Dùng DocumentFragment để tối ưu việc chèn hàng nghìn dòng vào DOM
    const fragment = document.createDocumentFragment();
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(row[3]).toLocaleString()}</td>
            <td>${row[1]}</td>
            <td>${row[4]} m³</td>
            <td><a href="${row[5]}" target="_blank">Xem ảnh</a></td>
            <td><span class="badge ${row[7] === 'Chờ duyệt' ? 'bg-warning' : 'bg-success'}">${row[7]}</span></td>
        `;
        fragment.appendChild(tr);
    });
    
    tableBody.innerHTML = "";
    tableBody.appendChild(fragment);
    
    // Khởi tạo Datatable (Chỉ làm 1 lần)
    if (!$.fn.DataTable.isDataTable('#logsTable')) {
        $('#logsTable').DataTable({ pageLength: 10, order: [[0, "desc"]] });
    }
}

function logout() {
    sessionStorage.clear();
    window.location.reload();
}
// Hàm hiển thị/ẩn hiệu ứng Loading
function showLoading(status) {
    if (status) {
        Swal.fire({ title: 'Đang gửi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    } else {
        Swal.close();
    }
}

// HÀM GỬI DỮ LIỆU CHÍNH
async function uploadData() {
    // 1. Kiểm tra dữ liệu đầu vào cơ bản
    const deviceId = document.getElementById('deviceId').value;
    const meterValue = document.getElementById('meterValue').value;
    const staffId = sessionStorage.getItem('employeeID'); // Lấy từ session khi login
   
    if (!deviceId || !meterValue || !base64Image) {
        return Swal.fire('Thiếu thông tin', 'Vui lòng nhập ID, chỉ số và chụp ảnh!', 'warning');
    }

    showLoading(true);

    try {
        // 2. Lấy tọa độ GPS (Đã đổi tên biến để tránh lỗi reload)
        const getGPS = () => new Promise((resolve) => {
            if (!navigator.geolocation) return resolve({ lat: 0, lng: 0, acc: 0 });
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
                () => resolve({ lat: 0, lng: 0, acc: 0 }),
                { timeout: 5000 }
            );
        });

        const gpsCoords = await getGPS();
        // 3. Chuẩn bị Payload gửi lên Google Apps Script
        const payload = {
            action: "saveRecord",
            deviceID: deviceId,
            employeeID: staffId,
            meterValue: meterValue,
            image: base64Image,
            note: document.getElementById('note').value,
            lat: gpsCoords.lat,
            lng: gpsCoords.lng,
            acc: gpsCoords.acc
        };
        // 4. Gọi API
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const res = await response.json();

        if (res.success) {
            await Swal.fire('Thành công', 'Dữ liệu đã được lưu!', 'success');
            window.location.reload(); // Đã thêm window. để xác định rõ hàm hệ thống
        } else {
            throw new Error(res.message);
        }
    } catch (err) {
        Swal.fire('Lỗi', err.message || 'Lỗi kết nối', 'error');
    } finally {
        showLoading(false);
    }
}
// --- HÀM GỌI API CHUNG ---
async function callAPI(payload) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", // Thêm dòng này để bỏ qua kiểm tra CORS nghiêm ngặt
            headers: {
                "Content-Type": "text/plain", // Đổi từ application/json sang text/plain
            },
            body: JSON.stringify(payload)
        });

        // Lưu ý: Với mode 'no-cors', bạn không thể đọc nội dung trả về trực tiếp.
        // Để vừa ghi được dữ liệu, vừa đọc được phản hồi, hãy dùng cách dưới đây:
        
        const resp = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await resp.json();
    } catch (error) {
        console.error("Lỗi kết nối API:", error);
        throw error;
    }
}


