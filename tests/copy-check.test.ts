import { describe, expect, it } from "vitest";
import { givesExample, givesReason, givesSuggestion, isEcho } from "@/lib/module/copyCheck";
import { requirementMet } from "@/lib/module/measure";
import { hasReasonWord } from "@/lib/feedback/measures";

describe("đọc lại câu có sẵn thì không phải câu của em", () => {
  it("nhận ra đọc lại câu hỏi / câu ví dụ, câu trả lời thật thì không", () => {
    const q = "Why do you like your favourite singer so much?";
    expect(isEcho("why do you like your favourite singer so much", q)).toBe(true);
    expect(isEcho("I like Taylor Swift because her songs are about real life", q)).toBe(false);
    expect(isEcho("", q)).toBe(false);
  });
});

describe("lý do / ví dụ / gợi ý phải là vế câu thật", () => {
  it("một từ nối không đủ", () => {
    expect(givesReason("because")).toBe(false);
    expect(givesReason("I like it so much")).toBe(false);
    expect(givesReason("as well")).toBe(false);
    expect(givesReason("I walk to school because it is good for my health")).toBe(true);
    expect(givesReason("It rained, so we stayed at home")).toBe(true);
    expect(givesExample("for example")).toBe(false);
    expect(givesExample("We can recycle things, for example plastic bottles")).toBe(true);
    expect(givesSuggestion("should")).toBe(false);
    expect(givesSuggestion("We should plant more trees in our school")).toBe(true);
  });
  it("quy tắc của phần nghiên cứu KHÔNG đổi", () => {
    expect(hasReasonWord("I like it so much")).toBe(true); // giữ nguyên như cũ để cách đo nghiên cứu không đổi
  });
});

describe("yêu cầu roleplay không tính lượt nhắc lại câu của bạn nói chuyện", () => {
  const ai = ["Fine. And what should I do?", "Who will do the washing-up after dinner?"];
  it("nhắc lại câu bạn vừa nói thì không đạt", () => {
    expect(requirementMet({ kind: "suggestion", vi: "", words: [] }, ["Fine. And what should I do?"], [ai[0]])).toBe(false);
    expect(requirementMet({ kind: "keyword", vi: "", words: ["washing-up"] }, ["Who will do the washing-up after dinner?"], [ai[1]])).toBe(false);
  });
  it("tự nói thì đạt", () => {
    expect(requirementMet({ kind: "suggestion", vi: "", words: [] }, ["You should clean your room before dinner"], [ai[0]])).toBe(true);
    expect(requirementMet({ kind: "keyword", vi: "", words: ["washing-up"] }, ["I can do the washing-up tonight, Mum"], ["What will you do tonight?"])).toBe(true);
  });
});
