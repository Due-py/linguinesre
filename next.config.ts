import type { NextConfig } from "next";

// Không bật cacheComponents/partialPrefetching (mặc định của bộ khởi tạo): gần như mọi trang của
// LINGUA-REFLEX phụ thuộc phiên đăng nhập nên là trang động; bật chúng buộc bọc từng chỗ đọc cookie
// trong <Suspense> mà không đem lại lợi ích. Trang chủ vẫn được dựng tĩnh vì không đọc dữ liệu theo yêu cầu.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
