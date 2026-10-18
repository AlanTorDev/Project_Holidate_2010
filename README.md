# Love Universe 20.10 💗

Một website chúc mừng 20/10 dành tặng vợ/người yêu, xây dựng bằng React, Vite, Three.js, React Three Fiber và GSAP.

## Yêu cầu
- Node.js 18 trở lên (khuyên dùng bản LTS)
- npm

## Chạy trên Windows
1. Giải nén thư mục project.
2. Mở PowerShell tại thư mục `love-universe-2010`.
3. Cài thư viện:
   ```powershell
   npm install
   ```
4. Chạy website:
   ```powershell
   npm run dev
   ```
5. Mở URL Vite in ra terminal (thường là `http://localhost:5173`).

Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd install` và `npm.cmd run dev`, hoặc chạy các lệnh trong Command Prompt (cmd).

## Cá nhân hóa
Mở `src/App.jsx`:
- Sửa `WIFE_NAME` thành tên/nickname của vợ.
- Sửa nội dung `LOVE_LETTER` thành lời nhắn của riêng bạn.
- Sửa mảng `MEMORIES` để thay ảnh, tiêu đề, ngày tháng và lời chú thích bằng kỷ niệm thật.

## Nhạc nền
Đặt file MP3 bạn có quyền sử dụng tại `public/audio/love-song.mp3`. Bấm **Bật nhạc** trên website để phát. Trình duyệt thường yêu cầu người dùng bấm nút trước khi cho phép phát nhạc.

## Ảnh kỷ niệm
Thay các URL `src` trong `MEMORIES` bằng URL ảnh của bạn hoặc đặt ảnh trong `public/images/` và dùng đường dẫn dạng `/images/ten-anh.jpg`.

## Build bản production
```powershell
npm run build
npm run preview
```

Bản này có hoa hồng 3D procedural (cánh hoa dựng từ geometry), trái tim nổi trong scene 3D và lớp trái tim bay xuyên suốt các section, thư tình mở/đóng, gallery ảnh có modal, hộp quà tương tác và bố cục responsive.
