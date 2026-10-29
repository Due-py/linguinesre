// Kiểm tra giao diện bằng trình duyệt thật (Edge có sẵn trên máy, không tải trình duyệt mới).
// Dùng: node scripts/ui-check.mjs <đường dẫn> [rộng=375] [cao=812] [tên-ảnh]
// In ra chiều rộng nội dung so với khung nhìn (cuộn ngang = lỗi) và lưu ảnh chụp cả trang.
import { chromium } from "@playwright/test";

const [path = "/", w = "375", h = "812", name] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3124";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
await page.goto(base + path, { waitUntil: "load" });
await page.waitForTimeout(900); // chờ hiệu ứng hiện dần xong
const m = await page.evaluate(() => ({
  viewport: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  tooWide: [...document.querySelectorAll("body *")]
    .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
    .slice(0, 5)
    .map((el) => el.tagName + "." + String(el.className).slice(0, 40)),
}));
console.log(JSON.stringify(m));
if (name) await page.screenshot({ path: name, fullPage: true });
await browser.close();
process.exit(m.scrollWidth > m.viewport ? 1 : 0);
