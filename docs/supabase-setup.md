# Kết nối Supabase (đăng ký / đăng nhập bằng mã lớp)

Làm 1 lần. Khoảng 15 phút. **Không dán khóa bí mật (secret key) vào chat với AI.**

## 1. Tạo project

1. Vào supabase.com → **New project**.
2. Tên: `linguareflex`. **Region: Singapore** (gần Việt Nam nhất).
3. Database password: tự đặt, **tự giữ** (lưu vào chỗ an toàn). Web không cần mật khẩu này.

## 2. Tạo bảng dữ liệu

1. Mở **SQL Editor** → **New query**.
2. Mở file `supabase/migrations/0001_classes_students.sql` trong dự án, chép toàn bộ, dán vào → **Run**.
3. Kiểm tra: mục **Table Editor** có 3 bảng `classes`, `students`, `login_attempts`, cả 3 đều có chữ **RLS enabled**.

## 3. Tạo mã lớp

1. Mở file `supabase/seed-class-example.sql`, **đổi mã lớp** (khó đoán, ví dụ `8A1-XK7Q`), tên lớp, khối lớp.
2. Dán vào SQL Editor → **Run**.
3. Muốn thêm lớp khác: chạy lại với mã khác.

## 4. Cài đặt đăng nhập (quan trọng cho an toàn)

Vào **Authentication**:

- **Sign In / Providers → Email**:
  - **Tắt "Allow new users to sign up"** (cho phép người lạ tự đăng ký). Tài khoản học sinh chỉ được tạo qua web sau khi nhập **đúng mã lớp**, nên phải tắt cái này để không ai lách qua.
  - **Tắt "Confirm email"** (không gửi thư xác nhận — học sinh không dùng email).
- **Password**: độ dài tối thiểu phải **≤ 6** (mặc định là 6) và **không** yêu cầu chữ hoa / ký tự đặc biệt — vì PIN là 6 chữ số.

## 5. Lấy khóa và đưa vào web

Vào **Project Settings → API Keys** (và **Data API** để lấy URL):

| Tên biến | Lấy ở đâu | Bí mật? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) | Không |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) | Không |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`) | **CÓ — tuyệt đối không chia sẻ** |

**Trên Vercel:** Project → **Settings → Environment Variables** → thêm 3 biến trên (Production + Preview) → vào **Deployments** → **Redeploy** bản mới nhất. (Phải redeploy thì web mới nhận khóa.)

**Trên máy (để chạy `npm run dev`):** chép `.env.example` thành `.env.local` ở thư mục dự án, điền 3 giá trị. File `.env.local` không bao giờ lên GitHub.

## 6. Thử

1. Mở `/dang-ky` → nhập mã lớp vừa tạo, biệt danh, PIN 6 số → phải vào trang **Góc học** (`/hoc`).
2. Bấm **Đăng xuất** → `/dang-nhap` → đăng nhập lại.
3. Thử sai PIN 5 lần → phải bị khóa 15 phút.
4. Thử mã lớp sai → phải báo lỗi.
5. Trong Supabase **Table Editor → students** phải thấy biệt danh (không có tên thật, không có email thật).

Gặp lỗi → chụp màn hình thông báo (đừng chụp khóa bí mật) gửi Claude.

## Việc thường ngày

- **Học sinh quên PIN** (V1 làm tay; trang giáo viên ở V2 sẽ có nút): không gửi thư khôi phục được vì không có email. Chạy trong SQL Editor (đổi biệt danh, mã lớp, PIN mới):

  ```sql
  update auth.users
  set encrypted_password = extensions.crypt('654321', extensions.gen_salt('bf'))
  where id = (
    select s.id from public.students s join public.classes c on c.id = s.class_id
    where c.code = '8A1-XK7Q' and s.nickname_key = lower('Mèo Con')
  );
  delete from public.login_attempts where nickname_key = lower('Mèo Con');
  ```

  ⚠️ Cách này **chưa được thử** trên project thật — thử với một tài khoản thử nghiệm trước.
- **Đóng đăng ký một lớp:** `update public.classes set is_open = false where code = 'MÃ-LỚP';`
