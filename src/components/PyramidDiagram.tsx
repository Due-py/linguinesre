/**
 * Sơ đồ Kim tự tháp 4 tầng (L0 ở đáy → L3 ở đỉnh) của chế độ luyện LINGUA-REFLEX. SVG thuần, không hoạt ảnh.
 * Trong hình chỉ ghi tên tầng (đỉnh hẹp không đủ chỗ cho chữ dài); tên đầy đủ nằm trong mô tả và danh sách cạnh hình.
 * Hình chỉ minh họa thứ tự các tầng; nội dung từng tầng nằm ở danh sách cạnh hình (trình đọc màn hình đọc danh sách đó),
 * nên SVG có tiêu đề ngắn và mô tả tóm tắt.
 */
const LAYERS = [
  { id: "L3", fill: "var(--brand)", text: "#ffffff" },
  { id: "L2", fill: "#6f57fe", text: "#ffffff" },
  { id: "L1", fill: "#c9c0ff", text: "var(--ink)" },
  { id: "L0", fill: "var(--brand-soft)", text: "var(--ink)" },
];

export default function PyramidDiagram({ className = "" }: { className?: string }) {
  const W = 340;
  const H = 56;
  const GAP = 6;
  const TOP = 92; // chiều rộng đỉnh
  const total = LAYERS.length * H + (LAYERS.length - 1) * GAP;
  const widthAt = (y: number) => TOP + ((W - TOP) * y) / total;
  return (
    <svg viewBox={`0 0 ${W} ${total}`} role="img" aria-labelledby="pyr-title pyr-desc" className={className}>
      <title id="pyr-title">Kim tự tháp luyện nói 4 tầng</title>
      <desc id="pyr-desc">Từ đáy lên đỉnh: L0 từ vựng, L1 khung câu và Speed Q&amp;A, L2 mở rộng có lý do, L3 hội thoại.</desc>
      {LAYERS.map((l, i) => {
        const y0 = i * (H + GAP);
        const y1 = y0 + H;
        const [a, b] = [widthAt(y0), widthAt(y1)];
        const pts = [(W - a) / 2, y0, (W + a) / 2, y0, (W + b) / 2, y1, (W - b) / 2, y1].join(" ");
        return (
          <g key={l.id}>
            <polygon points={pts} fill={l.fill} />
            <text x={W / 2} y={y0 + H / 2 + 6} textAnchor="middle" fill={l.text} fontSize={17} fontWeight={650}>
              {l.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
