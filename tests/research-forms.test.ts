import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { FLCAS_REVERSED, FLCAS_SPEAKING, flcasItemNo, scoreFlcas } from "@/lib/research/flcas";
import { CODE_PATTERN } from "@/lib/research/code";
import { byCode, quizScore } from "@/lib/research/sheetData";
import { cohenKappa, cronbachAlpha, median } from "@/lib/research/stats";

/** Chạy các file .gs trong một "Google giả" để kiểm tra form được dựng đúng mà không cần tài khoản Google. */
const GAS = join(process.cwd(), "research-system", "google-apps-script");
type Rec = { kind: string; title?: string; help?: string; required?: boolean; choices?: unknown[]; points?: number; goTo?: unknown; other?: boolean; bounds?: number[] };

function fakeForm() {
  const items: Rec[] = [];
  const settings: Record<string, unknown> = {};
  const makeItem = (kind: string) => {
    const r: Rec = { kind };
    items.push(r);
    const it: Record<string, (...a: unknown[]) => unknown> = {
      setTitle: (t) => ((r.title = t as string), it),
      setHelpText: (t) => ((r.help = t as string), it),
      setRequired: (b) => ((r.required = b as boolean), it),
      setChoiceValues: (c) => ((r.choices = c as unknown[]), it),
      setChoices: (c) => ((r.choices = c as unknown[]), it),
      createChoice: (value, x) => ({ value, x }),
      showOtherOption: (b) => ((r.other = b as boolean), it),
      setValidation: () => it,
      setBounds: (a, b) => ((r.bounds = [a as number, b as number]), it),
      setLabels: () => it,
      setPoints: (p) => ((r.points = p as number), it),
      setGoToPage: (g) => ((r.goTo = g), it),
    };
    return it;
  };
  const form = new Proxy(
    {},
    {
      get: (_t, name: string) =>
        name.startsWith("add") ? () => makeItem(name.slice(3)) : (v: unknown) => ((settings[name] = v), form),
    },
  );
  return { form, items, settings };
}

function loadGas() {
  const chain: unknown = new Proxy(() => chain, { get: (_t, n) => (n === "build" ? () => ({}) : () => chain) });
  const ctx = vm.createContext({
    FormApp: { createTextValidation: () => chain, PageNavigationType: { SUBMIT: "SUBMIT" }, DestinationType: { SPREADSHEET: "S" } },
    console,
  });
  for (const f of readdirSync(GAS).filter((f) => f.endsWith(".gs"))) vm.runInContext(readFileSync(join(GAS, f), "utf8"), ctx, { filename: f });
  return ctx as unknown as {
    allForms_: () => { key: string; title: string; quiz?: boolean; api: boolean; items: { type: string; title?: string; answer?: number; choices?: string[] }[] }[];
    buildForm_: (form: unknown, cfg: unknown) => void;
    FLCAS: { n: number; en: string; vi: string }[];
    FLCAS_REVERSED: number[];
    FLCAS_SPEAKING: number[];
    MINI_TEST: { id: string; unit: number; title: string; choices: string[]; answer: number }[];
    CODE_PATTERN: string;
  };
}

const gas = loadGas();
const forms = gas.allForms_();
const built = Object.fromEntries(
  forms.map((cfg) => {
    const f = fakeForm();
    gas.buildForm_(f.form, cfg);
    return [cfg.key, f.items];
  }),
);

describe("Google Forms nghiên cứu", () => {
  it("đủ form, mã không trùng, dựng được không lỗi", () => {
    expect(forms.map((f) => f.key)).toEqual(["F1", "F2", "F3", "F5", "F6", "F7", "F8", "F9"]);
    for (const k of Object.keys(built)) expect(built[k].length).toBeGreaterThan(3);
  });

  it("không hỏi họ tên (trừ câu mã học sinh khi chưa có mã), email, số điện thoại", () => {
    for (const items of Object.values(built))
      for (const it of items) if (!/^mã học sinh/i.test(it.title ?? "")) expect(it.title ?? "").not.toMatch(/họ (và )?tên|email của em|điện thoại|địa chỉ/i);
  });

  it("mẫu mã học sinh khớp với web (mã FPT Bắc Giang, VD FBG20124)", () => {
    const re = new RegExp(gas.CODE_PATTERN);
    for (const ok of ["FBG20124", "fbg20124", "HS008"]) expect(re.test(ok)).toBe(true);
    for (const bad of ["Nguyen Van A", "minh2010", "FBG12"]) expect(re.test(bad)).toBe(false);
    expect(CODE_PATTERN.test("FBG20124")).toBe(true);
    expect(CODE_PATTERN.test("HS008")).toBe(true);
    expect(CODE_PATTERN.test("MINH2010")).toBe(false);
  });

  it("phỏng vấn không đi qua cổng dữ liệu", () => {
    expect(forms.filter((f) => !f.api).map((f) => f.key)).toEqual(["F8", "F9"]);
  });
});

describe("FLCAS", () => {
  it("đủ 33 câu gốc, đúng thứ tự, mỗi câu có bản dịch", () => {
    expect(gas.FLCAS.map((x) => x.n)).toEqual(Array.from({ length: 33 }, (_, i) => i + 1));
    for (const x of gas.FLCAS) {
      expect(x.en.length).toBeGreaterThan(20);
      expect(x.vi.length).toBeGreaterThan(15);
    }
  });

  it("trước (F2) và sau (F6) giống hệt: câu, thứ tự, thang", () => {
    expect(JSON.stringify(built.F2)).toBe(JSON.stringify(built.F6));
    const scales = built.F2.filter((i) => i.kind === "ScaleItem");
    expect(scales).toHaveLength(33);
    for (const s of scales) expect(s.bounds).toEqual([1, 5]);
    expect(scales.map((s) => flcasItemNo(s.title!))).toEqual(Array.from({ length: 33 }, (_, i) => i + 1));
  });

  it("câu tính ngược và câu về Nói giống ở form và ở trang thống kê", () => {
    expect([...gas.FLCAS_REVERSED]).toEqual([...FLCAS_REVERSED]);
    expect([...gas.FLCAS_SPEAKING]).toEqual([...FLCAS_SPEAKING]);
  });

  it("tính điểm: câu thoải mái bị đảo, điểm cao = lo âu cao", () => {
    const headers = ["Dấu thời gian", "Mã học sinh của em", ...gas.FLCAS.map((x) => `${x.n}. ${x.vi}`)];
    // Học sinh rất lo: đồng ý 5 với mọi câu lo âu, chọn 1 với mọi câu thoải mái.
    const row = ["2026-11-20T01:00:00Z", "HS008", ...gas.FLCAS.map((x) => (FLCAS_REVERSED.includes(x.n as never) ? 1 : 5))];
    const s = scoreFlcas(headers, row);
    expect(s.mean).toBe(5);
    expect(s.total).toBe(165);
    expect(s.speakingMean).toBe(5);
    expect(s.missing).toEqual([]);
    const half = scoreFlcas(headers, row.map((v, i) => (i === 5 ? "" : v)));
    expect(half.missing).toEqual([4]);
    expect(half.total).toBeNull();
  });

  it("khảo sát CH1 dùng đúng các câu về Nói, cùng bản dịch", () => {
    const d = built.F1.filter((i) => i.kind === "ScaleItem" && flcasItemNo(i.title!) !== null).map((i) => i.title);
    expect(d).toEqual(FLCAS_SPEAKING.map((n) => `${n}. ${gas.FLCAS[n - 1].vi}`));
  });
});

describe("Mini-test", () => {
  const all = gas.MINI_TEST;
  it("20 câu: 8 từ vựng, 8 ngữ pháp, 4 ngữ cảnh; mỗi câu 4 lựa chọn khác nhau, 1 đáp án", () => {
    expect(all).toHaveLength(20);
    expect(all.filter((q) => q.id[0] === "V")).toHaveLength(8);
    expect(all.filter((q) => q.id[0] === "G")).toHaveLength(8);
    expect(all.filter((q) => q.id[0] === "K")).toHaveLength(4);
    for (const q of all) {
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect([1, 2, 3]).toContain(q.unit);
    }
    // Đáp án đúng không dồn vào một vị trí.
    for (const pos of [0, 1, 2, 3]) expect(all.filter((q) => q.answer === pos).length).toBeGreaterThanOrEqual(4);
  });

  it("form là bài trắc nghiệm có chấm điểm, mỗi câu 1 điểm, đúng một đáp án", () => {
    const qs = built.F3.filter((i) => i.points === 1);
    expect(qs).toHaveLength(20);
    for (const q of qs) expect((q.choices as { x: boolean }[]).filter((c) => c.x === true)).toHaveLength(1);
  });

  it("không lấy câu từ ngân hàng câu luyện hay đề kiểm tra nói", () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim();
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f.endsWith(".json")) files.push(norm(readFileSync(p, "utf8").replace(/\\n/g, " ")));
      }
    };
    walk(join(process.cwd(), "content"));
    const bank = files.join(" | ");
    for (const q of all) {
      // Mọi đoạn 6 từ liên tiếp của câu hỏi (bỏ chỗ trống) không được có sẵn trong nội dung luyện.
      const words = norm(q.title.replace(/_+/g, " ")).split(" ");
      for (let i = 0; i + 6 <= words.length; i++) {
        const gram = words.slice(i, i + 6).join(" ");
        expect(bank.includes(gram), `${q.id}: "${gram}" có trong nội dung luyện`).toBe(false);
      }
    }
  });
});

describe("Phiếu cảm nhận (F7)", () => {
  it("chế độ A chỉ hỏi về A, chế độ B chỉ hỏi về B; hết phần A thì nộp, không lạc sang B", () => {
    const items = built.F7;
    const branch = items.find((i) => i.title?.startsWith("P2."))!;
    expect((branch.choices as { value: string }[]).map((c) => c.value)).toEqual(["Chế độ A", "Chế độ B"]);
    const pages = items.filter((i) => i.kind === "PageBreakItem");
    expect(pages.map((p) => p.title)).toEqual(["Chế độ A", "Chế độ B"]);
    expect(pages[1].goTo).toBe("SUBMIT");
    const iB = items.indexOf(pages[1]);
    const inA = items.slice(items.indexOf(pages[0]) + 1, iB).map((i) => i.title ?? "");
    const inB = items.slice(iB + 1).map((i) => i.title ?? "");
    expect(inA.some((t) => /đọc to/i.test(t))).toBe(false);
    expect(inB.some((t) => /speed|gợi ý|roleplay|LINGUA-REFLEX/i.test(t))).toBe(false);
  });
});

describe("Đọc Google Sheets và thống kê", () => {
  it("giữ lần nộp đầu tiên, báo bản trùng và mã sai, không bỏ dòng nào", () => {
    const d = byCode({
      headers: ["Dấu thời gian", "Mã học sinh của em", "Score"],
      rows: [
        ["2026-11-20T02:00:00Z", "hs008", "12 / 20"],
        ["2026-11-20T01:00:00Z", "HS008", "15 / 20"],
        ["2026-11-20T03:00:00Z", "Nguyen Van A", "10 / 20"],
      ],
    });
    expect(d.first.get("HS008")!.row[2]).toBe("15 / 20");
    expect(d.duplicates.get("HS008")).toBe(2);
    expect(d.invalid).toEqual(["Nguyen Van A"]);
    expect(d.total).toBe(3);
    expect(quizScore(["Score"], ["15 / 20"])).toBe(15);
    expect(quizScore(["Điểm"], [17])).toBe(17);
  });

  it("kappa, alpha, trung vị", () => {
    expect(cohenKappa([[2, 2], [1, 1], [0, 0]]).kappa).toBe(1);
    expect(cohenKappa([[2, 1], [1, 2]]).agree).toBe(0);
    expect(cohenKappa([]).kappa).toBeNull();
    expect(cronbachAlpha([[1, 1], [2, 2], [3, 3]])).toBeCloseTo(1);
    expect(median([3, 1, 2, 10])).toBe(2.5);
  });
});
