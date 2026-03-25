const API_URL = "https://script.google.com/macros/s/AKfycbzDIF_Cwxpjztl3w2KuO_Qm0HxUdzBENmF--jSWaSszTK8AzpMU5pU0YfU0fc4Whuv1/exec";

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
    let showInfo = "<div class='alert alert-info d-flex justify-content-between align-items-center'><span>Chào, <b> " + name + "</b> ( "+ role+" )</span><button class='btn btn-sm btn-outline-danger' onclick='logout()'>Đăng xuất</button></div>";
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
    let currentUrl = window.location.href;
    if(currentUrl.includes("index"))
        currentUrl = currentUrl.replace("index","admin");
      else
        currentUrl += "admin.html";
    // Thay url_web_app_admin bằng link Deploy của file Admin.html
    const adminUrl = currentUrl; 
    window.location.href = adminUrl;
  }
/**
 * TỐI ƯU 3: Tải song song dữ liệu Dashboard và Logs
 */
/*async function loadAdminDashboard() {
    showLoading(true); // Hiển thị spinner
    
    try {
        // Tải song song (Parallel Fetching)
        const [statsResponse, logsResponse] = await Promise.all([
            fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "getDashboardStats" }) }),
            fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "readData", sheetName: "MeterReadings" }) })
        ]);

        const stats = await statsResponse.json();
        const logsData = await logsResponse.json();

        // Hiển thị Stats
        document.getElementById('dash-total').innerText = stats.totalDevices;
        document.getElementById('dash-broken').innerText = stats.brokenCount;
        document.getElementById('dash-water').innerText = stats.waterCount;

        // Render Table (Tối ưu: Chỉ render 50 bản ghi mới nhất trước)
        renderLogsTable(logsData.slice(1).reverse().slice(0, 50));

    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
    } finally {
        showLoading(false);
    }
}*/
async function loadAdminDashboard() {
    showLoading(true); 
    
    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: "getAdminData" }) 
        });
        const data = await response.json();

        // 1. Cập nhật các con số Thống kê
        if (data.stats) {
            document.getElementById('count-active').innerText = data.stats.totalDevices;
            document.getElementById('count-broken').innerText = data.stats.brokenCount;
            document.getElementById('count-water').innerText = data.stats.waterCount;
        }

        // 2. Đổ dữ liệu vào bảng Logs (MeterReadings)
        const logsBody = document.getElementById('logsBody');
        logsBody.innerHTML = ""; 

        // Bỏ dòng tiêu đề (slice(1)) và đảo ngược để hiện cái mới nhất lên đầu
        const rows = data.logs.slice(1).reverse(); 

        rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(row[3]).toLocaleString('vi-VN')}</td>
                <td><span class="badge bg-info">${row[1]}</span></td>
                <td>${row[2]}</td>
                <td class="fw-bold">${row[4]} m³</td>
                <td>
                    ${row[5] !== "No Image" 
                        ? `<img src="${row[5]}" style="width:40px; border-radius:4px; cursor:pointer" onclick="window.open('${row[5]}')">` 
                        : "---"}
                </td>
                <td><span class="badge ${row[7] === 'Hoàn thành' ? 'bg-success' : 'bg-warning'}">${row[7]}</span></td>
            `;
            logsBody.appendChild(tr);
        });

        // 3. Khởi tạo/Làm mới DataTable
        if ($.fn.DataTable.isDataTable('#logsTable')) {
            $('#logsTable').DataTable().destroy();
        }
        $('#logsTable').DataTable({
            order: [[0, 'desc']],
            language: { url: "//cdn.datatables.net/plug-ins/1.13.4/i18n/vi.json" }
        });

    } catch (error) {
        console.error("Lỗi:", error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu từ máy chủ', 'error');
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
// Hàm hiển thị/ẩn hiệu ứng Loading
function showLoading(isLoading) {
    if (isLoading) {
        Swal.fire({
            title: 'Đang xử lý...',
            html: 'Vui lòng chờ trong giây lát',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    } else {
        Swal.close();
    }
}
// --- Load dữ liệu tại trang Admin
/*async function loadAdminDashboard() {
    try {
        // 1. Gọi API để lấy toàn bộ dữ liệu từ Google Apps Script
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getAdminData" })
        });
        const data = await response.json();

        if (!data || !data.logs) {
            console.error("Không có dữ liệu trả về");
            return;
        }

        // 2. Cập nhật các con số trên Dashboard (Thẻ màu)
        const stats = data.stats;
        document.getElementById('count-active').innerText = stats.totalDevices;
        document.getElementById('count-broken').innerText = stats.brokenCount;
        document.getElementById('count-water').innerText = stats.waterCount;

        // 3. Xử lý dữ liệu bảng Logs
        const logsBody = document.getElementById('logsBody');
        logsBody.innerHTML = ""; // Xóa dữ liệu cũ

        // data.logs[0] thường là Header, chúng ta lấy từ dòng index 1
        const rows = data.logs.slice(1); 

        rows.forEach(row => {
            const tr = document.createElement('tr');
            
            // Định dạng ngày tháng cho dễ nhìn
            const date = new Date(row[0]).toLocaleString('vi-VN');
            const deviceId = row[1];
            const staffName = row[2];
            const value = row[3];
            const imgUrl = row[4];
            const status = row[5];

            tr.innerHTML = `
                <td>${date}</td>
                <td><span class="badge bg-secondary">${deviceId}</span></td>
                <td>${staffName}</td>
                <td class="fw-bold text-primary">${value} m³</td>
                <td>
                    ${imgUrl !== "No Image" 
                        ? `<img src="${imgUrl}" class="img-thumbnail" style="width:50px; cursor:pointer" onclick="window.open('${imgUrl}')">` 
                        : "N/A"}
                </td>
                <td><span class="badge ${status.includes('Lỗi') ? 'bg-danger' : 'bg-success'}">${status}</span></td>
            `;
            logsBody.appendChild(tr);
        });

        // 4. Kích hoạt DataTables để hỗ trợ tìm kiếm/phân trang
        $('#logsTable').DataTable({
            destroy: true, // Hỗ trợ tải lại dữ liệu mà không lỗi
            order: [[0, 'desc']], // Mới nhất hiện lên đầu
            language: {
                url: "//cdn.datatables.net/plug-ins/1.13.4/i18n/vi.json"
            }
        });

    } catch (error) {
        console.error("Lỗi khi tải Dashboard:", error);
        Swal.fire('Lỗi', 'Không thể kết nối dữ liệu Database', 'error');
    }
}
*/
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
    // 1. Kiểm tra dữ liệu đầu vào cơ bản
    const deviceId = document.getElementById('deviceId').value;
    const meterValue = document.getElementById('meterValue').value;
    const staffId = sessionStorage.getItem('employeeID'); // Lấy từ session khi login

    if (!deviceId || !meterValue) {
        return Swal.fire('Thông báo', 'Vui lòng nhập đầy đủ Mã thiết bị và Chỉ số!', 'warning');
    }

    if (!base64Image) {
        return Swal.fire('Thông báo', 'Vui lòng chụp ảnh đồng hồ!', 'warning');
    }

    // 2. Hiện hiệu ứng chờ (Hàm showLoading đã thêm ở bước trước)
    showLoading(true);

    try {
        // 3. Lấy tọa độ GPS (Hỗ trợ truy vết vị trí ghi số)
        let location = { lat: 0, lng: 0, acc: 0 };
        
        const getGPS = () => new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(location);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    acc: pos.coords.accuracy
                }),
                () => resolve(location), // Nếu lỗi/từ chối thì trả về 0
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });

        const gpsData = await getGPS();

        // 4. Chuẩn bị Payload gửi lên Google Apps Script
        const payload = {
            action: "saveRecord",
            deviceID: deviceId,
            employeeID: staffId,
            meterValue: meterValue,
            image: base64Image, // Chuỗi base64 đã được nén từ lúc chụp
            note: document.getElementById('note')?.value || "",
            lat: gpsData.lat,
            lng: gpsData.lng,
            acc: gpsData.acc
        };

        // 5. Gọi API
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const res = await response.json();

        if (res.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Dữ liệu đã được lưu vào hệ thống.',
                timer: 2000
            });
            location.reload(); // Reset form sau khi gửi thành công
        } else {
            throw new Error(res.message || "Lỗi không xác định từ Server");
        }

    } catch (error) {
        console.error("Lỗi Upload:", error);
        Swal.fire('Lỗi hệ thống', 'Không thể gửi dữ liệu. Vui lòng kiểm tra kết nối mạng!', 'error');
    } finally {
        showLoading(false);
    }
}
/*
async function uploadData() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const extraData = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                acc: pos.coords.accuracy
            };
            sendToServer(extraData);
        }, () => sendToServer({})); // Gửi không có GPS nếu người dùng từ chối
    }
    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.innerText = "Đang gửi...";
    
    
    const payload = {
        action: "saveRecord",
        deviceId: document.getElementById('deviceId').value,
        value: document.getElementById('meterValue').value,
        image: base64Image, // Chuỗi base64 đã nén
        staffId: sessionStorage.getItem('staffId')
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors", // Quan trọng khi dùng Vercel
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        
        Swal.fire('Thành công', res.message, 'success').then(() => {
            location.reload();
        });
    } catch (err) {
        Swal.fire('Lỗi', 'Không thể kết nối với server Google', 'error');
    }
}
*/
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
