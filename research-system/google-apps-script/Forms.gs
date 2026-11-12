/**
 * Nội dung các form nghiên cứu (trừ FLCAS ở FormFlcas.gs).
 * Sửa nội dung ở đây, rồi: form chưa tạo → chạy taoTatCa; form đã tạo nhưng CHƯA có câu trả lời → dungLaiForm('F3').
 *
 * Quy ước câu Likert: tiêu đề bắt đầu bằng mã (VD "C3. ...") để bảng câu trả lời có cột ổn định, dễ phân tích.
 * Câu hỏi viết trung tính: không gợi ý câu trả lời "tốt", không làm học sinh thấy luyện thêm là sai.
 */

var PRIVACY_NOTE =
  'Câu trả lời chỉ gắn với mã học sinh (hoặc họ tên nếu em chưa có mã), chỉ nhóm nghiên cứu và cô giáo hướng dẫn xem, ' +
  'và KHÔNG ảnh hưởng đến điểm số ở trường.';

function likert_(prefix, list) {
  return list.map(function (text, i) { return { type: 'scale', title: prefix + (i + 1) + '. ' + text }; });
}

// ───────────────────────────── F1. Khảo sát thực trạng (CH1) ─────────────────────────────

function form1_ThucTrang() {
  return {
    key: 'F1',
    api: true,
    title: 'Khảo sát: Em học và nói tiếng Anh như thế nào?',
    sheetName: 'F1 – Khảo sát thực trạng CH1 (câu trả lời)',
    purpose: 'CH1: chênh lệch giữa kiến thức và khả năng nói; rào cản khi nói; thói quen luyện nói',
    audience: 'Học sinh lớp 6–12 (ẩn danh)',
    contentStatus: 'AI soạn theo Quy trình mục 3.2 – nhóm thử với 5 học sinh trước khi phát',
    description:
      'Chào em! Nhóm The Linguines (lớp 8A1) đang làm nghiên cứu khoa học về việc học nói tiếng Anh của học sinh. ' +
      'Phiếu này giúp nhóm hiểu các bạn đang gặp khó khăn gì khi nói tiếng Anh.\n\n' +
      '• Phiếu HOÀN TOÀN ẨN DANH: không hỏi họ tên, mã học sinh hay email.\n' +
      '• Không có câu trả lời đúng hay sai. Hãy chọn điều đúng với em nhất.\n' +
      '• Mất khoảng 7 phút. Em có thể dừng bất cứ lúc nào, việc trả lời không ảnh hưởng đến điểm số.\n\n' +
      'Với các câu có thang 1–5: 1 = Hoàn toàn không đồng ý, 5 = Hoàn toàn đồng ý.',
    items: [
      { type: 'info', title: 'A. Thông tin chung' },
      { type: 'choice', title: 'A1. Em đang học lớp mấy?', choices: ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'] },
      { type: 'choice', title: 'A2. Giới tính (không bắt buộc)', choices: ['Nam', 'Nữ', 'Không muốn trả lời'], required: false },

      { type: 'section', title: 'B. Thói quen luyện nói' },
      { type: 'choice', title: 'B1. Ngoài giờ học trên lớp, em luyện NÓI tiếng Anh bao lâu một lần?', choices: ['Gần như không bao giờ', 'Ít hơn 1 lần mỗi tuần', '1–2 lần mỗi tuần', '3–5 lần mỗi tuần', 'Gần như mỗi ngày'] },
      { type: 'checkbox', title: 'B2. Em thường luyện nói tiếng Anh bằng cách nào? (chọn tất cả cách em dùng)', required: true, other: true,
        choices: ['Nói chuyện với bạn bè', 'Nói với người thân trong gia đình', 'Học ở trung tâm hoặc lớp học thêm', 'Ứng dụng học tiếng Anh trên điện thoại', 'Xem video rồi nói theo', 'Đọc to sách, bài hội thoại', 'Nói chuyện với AI (ChatGPT, Gemini, …)', 'Em gần như không luyện nói'] },
      { type: 'choice', title: 'B3. Em dùng công cụ AI (ChatGPT, Gemini, …) để học tiếng Anh ở mức nào?', choices: ['Không bao giờ', 'Hiếm khi', 'Thỉnh thoảng', 'Thường xuyên', 'Gần như mỗi ngày'] },
      { type: 'choice', title: 'B4. Khi được hỏi một câu đơn giản bằng tiếng Anh, em thường mất bao lâu để BẮT ĐẦU trả lời?', choices: ['Dưới 2 giây', 'Khoảng 2–5 giây', 'Khoảng 5–10 giây', 'Hơn 10 giây', 'Em thường không trả lời được'] },

      { type: 'section', title: 'C. Khi em nói tiếng Anh', help: 'Chọn từ 1 (Hoàn toàn không đồng ý) đến 5 (Hoàn toàn đồng ý). Mỗi câu được báo cáo riêng, không cộng thành một điểm.' },
    ].concat(likert_('C', [
      'Em biết nhiều từ vựng và ngữ pháp nhưng khó dùng chúng khi nói.',
      'Em biết từ nhưng không ghép được thành câu khi nói.',
      'Khi được hỏi bằng tiếng Anh, em không biết bắt đầu câu trả lời từ đâu.',
      'Em cần nhiều thời gian suy nghĩ trước khi bắt đầu nói.',
      'Khi nói, em dịch từng từ từ tiếng Việt sang tiếng Anh trong đầu.',
      'Em khó diễn đạt đúng điều mình muốn nói bằng tiếng Anh.',
      'Em thường chỉ trả lời được rất ngắn (vài từ) và khó nói dài hơn.',
      'Em khó nêu lý do hoặc ví dụ để mở rộng câu trả lời.',
      'Em sợ nói sai bị các bạn cười.',
      'Em thấy lo lắng khi phải nói tiếng Anh trước lớp.',
      'Điểm bài kiểm tra tiếng Anh trên giấy của em tốt hơn khả năng nói của em.',
      'Ngoài giờ học trên lớp, em có nhiều cơ hội để nói tiếng Anh.',
    ])).concat([
      { type: 'section', title: 'D. Cảm nhận khi nói tiếng Anh trên lớp', help: 'Các câu về việc nói trong thang FLCAS (Horwitz, Horwitz & Cope, 1986), bản dịch tiếng Việt. Số ở đầu là số câu trong thang gốc.' },
    ]).concat(flcasItems_(FLCAS_SPEAKING)).concat([
      { type: 'section', title: 'E. Mong muốn của em' },
      { type: 'choice', title: 'E1. Em có muốn luyện nói tiếng Anh ở nhà với một trợ lý AI không?', choices: ['Có', 'Không', 'Chưa chắc'] },
      { type: 'checkbox', title: 'E2. Khi bị bí lúc nói, em muốn được hỗ trợ kiểu gì?', required: false, other: true,
        choices: ['Gợi ý từ vựng', 'Khung câu mẫu (VD: "I think … because …")', 'Một câu trả lời mẫu để tham khảo', 'Nghe lại câu hỏi chậm hơn', 'Em không cần hỗ trợ'] },
      { type: 'paragraph', title: 'E3. Khó khăn lớn nhất của em khi luyện nói tiếng Anh là gì?', required: false },
    ]),
  };
}

// ───────────────────────────── F3. Mini-test kiến thức (20 câu) ─────────────────────────────

/**
 * 20 câu trắc nghiệm, lớp 8 Global Success, Unit 1–3 (cùng các Unit của bài kiểm tra nói: content/tests/grade-8.json).
 * 8 từ vựng (V), 8 ngữ pháp (G), 4 dùng trong ngữ cảnh (K). answer = vị trí đáp án đúng (0 = A).
 * Câu soạn mới, không lấy từ ngân hàng câu luyện (test tests/research-forms.test.ts kiểm tra không trùng).
 * Chấm: mỗi câu đúng 1 điểm, tổng /20. Không trừ điểm câu sai hay bỏ trống.
 */
var MINI_TEST = [
  { id: 'V1', unit: 1, title: 'My brother makes shelves and photo frames by himself. He really enjoys ______.', choices: ['doing DIY', 'doing puzzles', 'going cycling', 'surfing the net'], answer: 0 },
  { id: 'V2', unit: 1, title: 'When I ______ the net, I usually read news about football.', choices: ['ride', 'surf', 'swim', 'play'], answer: 1 },
  { id: 'V3', unit: 2, title: 'In the countryside, farmers grow rice in the ______.', choices: ['orchards', 'car parks', 'paddy fields', 'playgrounds'], answer: 2 },
  { id: 'V4', unit: 2, title: 'During ______, the whole village is busy collecting rice from the fields.', choices: ['rush hour', 'bedtime', 'break time', 'harvest time'], answer: 3 },
  { id: 'V5', unit: 2, title: 'The people in my grandparents\' village are very ______. They always welcome visitors warmly.', choices: ['hospitable', 'stressful', 'crowded', 'noisy'], answer: 0 },
  { id: 'V6', unit: 3, title: 'Some students start skipping breakfast just because their friends do it. This is an example of ______.', choices: ['social media', 'peer pressure', 'creativity', 'a school club'], answer: 1 },
  { id: 'V7', unit: 3, title: 'It is hard to ______ on my homework when my phone keeps ringing.', choices: ['upload', 'browse', 'concentrate', 'log on'], answer: 2 },
  { id: 'V8', unit: 3, title: 'Before you can read your school emails, you need to ______ with your username and password.', choices: ['hang out', 'keep in touch', 'fly kites', 'log on'], answer: 3 },

  { id: 'G1', unit: 1, title: 'My sister enjoys ______ comic books in her free time.', choices: ['read', 'reading', 'to reading', 'reads'], answer: 1 },
  { id: 'G2', unit: 1, title: 'I\'m keen on ______ jigsaw puzzles with my dad.', choices: ['do', 'to do', 'doing', 'did'], answer: 2 },
  { id: 'G3', unit: 1, title: 'Would you like ______ to the cinema with us tonight?', choices: ['to go', 'go', 'going', 'went'], answer: 0 },
  { id: 'G4', unit: 2, title: 'Children in villages can run around ______ than city children, as they have more open space.', choices: ['freer', 'more freely', 'more free', 'freely'], answer: 1 },
  { id: 'G5', unit: 2, title: 'Nam runs ______ than his older brother.', choices: ['fast', 'more fast', 'fastest', 'faster'], answer: 3 },
  { id: 'G6', unit: 2, title: 'My aunt drives ______ on village roads than on busy city streets.', choices: ['more carefully', 'carefuller', 'more careful', 'most carefully'], answer: 0 },
  { id: 'G7', unit: 3, title: 'I wanted to go out, ______ it was raining heavily.', choices: ['and', 'so', 'but', 'or'], answer: 2 },
  { id: 'G8', unit: 3, title: 'Minh felt very tired after the match, ______ he went to bed early.', choices: ['but', 'or', 'because', 'so'], answer: 3 },

  { id: 'K1', unit: 1, title: 'Mai: "How about playing badminton after school?"\nNam: "______ What time shall we meet?"', choices: ["That's a good idea.", "No, I don't.", "You're welcome.", "I'm fine, thanks."], answer: 0 },
  { id: 'K2', unit: 2, title: 'Read: "My village has green rice fields, a small river and old trees. Every visitor wants to take photos of it."\nWhich word best describes the village?', choices: ['stressful', 'picturesque', 'crowded', 'modern'], answer: 1 },
  { id: 'K3', unit: 3, title: 'Linh spends three hours on social media every night, so she often feels tired at school. What is the best advice for her?', choices: ['She should upload more photos.', 'She should check notifications more often.', 'She should spend less time online at night.', 'She should stay up later.'], answer: 2 },
  { id: 'K4', unit: 1, title: 'Nick writes: "How do you often spend your Saturday afternoons?"\nWhich reply is the most suitable?', choices: ['Yes, I often do.', 'I went to the zoo next Saturday.', 'Because it is Saturday.', 'I often go cycling with my cousins or play board games.'], answer: 3 },
];

function form3_MiniTest() {
  var section = function (prefix, title, help) {
    return [{ type: 'section', title: title, help: help }].concat(
      MINI_TEST.filter(function (q) { return q.id.charAt(0) === prefix; }).map(function (q) {
        return { type: 'quiz', title: q.id + '. ' + q.title, choices: q.choices, answer: q.answer };
      })
    );
  };
  return {
    key: 'F3',
    api: true,
    quiz: true,
    title: 'Mini-test tiếng Anh lớp 8 (Unit 1–3)',
    sheetName: 'F3 – Mini-test kiến thức (câu trả lời)',
    purpose: 'Điểm kiến thức từ vựng – ngữ pháp /20 (CH1: "biết trên giấy" so với tốc độ nói). Chỉ làm một lần, đầu vào.',
    audience: 'Học sinh lớp 8 tham gia thực nghiệm',
    contentStatus: 'AI soạn 20 câu (8 từ vựng, 8 ngữ pháp, 4 ngữ cảnh) – cần cô Vân duyệt (noi-dung-can-duyet.md)',
    confirmation: 'Em đã nộp bài. Cảm ơn em!',
    description:
      'Bài trắc nghiệm 20 câu, khoảng 10 phút, về Unit 1–3 tiếng Anh lớp 8 (Global Success).\n' +
      'Em tự làm, không dùng sách, điện thoại hay hỏi bạn. Mỗi câu chọn MỘT đáp án đúng nhất.\n\n' + PRIVACY_NOTE,
    items: [{ type: 'code' }]
      .concat(section('V', 'Phần 1. Từ vựng (8 câu)'))
      .concat(section('G', 'Phần 2. Ngữ pháp (8 câu)'))
      .concat(section('K', 'Phần 3. Dùng tiếng Anh trong tình huống (4 câu)')),
  };
}

// ───────────────────────────── F5. Khảo sát hằng tuần (yếu tố gây nhiễu) ─────────────────────────────

function form5_HangTuan() {
  return {
    key: 'F5',
    api: true,
    title: 'Câu hỏi hằng tuần về việc luyện tiếng Anh',
    sheetName: 'F5 – Khảo sát hằng tuần (câu trả lời)',
    purpose: 'Theo dõi yếu tố bên ngoài có thể ảnh hưởng kết quả (luyện thêm, công cụ khác, dùng chế độ của bạn, lỗi kỹ thuật, bỏ buổi)',
    audience: 'Học sinh lớp 8 tham gia thực nghiệm – mỗi cuối tuần một lần',
    contentStatus: 'AI soạn – nhóm đọc lại',
    description:
      'Mỗi cuối tuần, em trả lời giúp nhóm vài câu ngắn (khoảng 2 phút).\n' +
      'Luyện tiếng Anh thêm ở nơi khác là HOÀN TOÀN BÌNH THƯỜNG và không bị trừ điểm hay nhắc nhở gì. ' +
      'Nhóm chỉ cần biết để hiểu đúng kết quả nghiên cứu, nên em cứ trả lời thật nhé.\n\n' + PRIVACY_NOTE,
    items: [
      { type: 'code' },
      { type: 'choice', title: 'W1. Tuần này, ngoài bài luyện trên web LINGUA-REFLEX, em có luyện NÓI tiếng Anh ở đâu khác không?', choices: ['Không', 'Có'] },
      { type: 'choice', title: 'W2. Nếu có, em luyện thêm khoảng mấy lần trong tuần?', required: false, choices: ['1 lần', '2–3 lần', '4 lần trở lên'] },
      { type: 'checkbox', title: 'W3. Nếu có, em luyện thêm ở đâu / bằng cách nào?', required: false, other: true,
        choices: ['Lớp học thêm hoặc trung tâm', 'Nói với gia đình, bạn bè', 'Ứng dụng học tiếng Anh', 'Nói chuyện với AI (ChatGPT, Gemini, …)', 'Xem video rồi nói theo'] },
      { type: 'choice', title: 'W4. Tuần này em có dùng ứng dụng hoặc công cụ AI nào KHÁC để học tiếng Anh không?', choices: ['Không', 'Có'] },
      { type: 'text', title: 'W5. Nếu có, đó là ứng dụng / công cụ nào?', required: false },
      { type: 'choice', title: 'W6. Tuần này em có xem hoặc thử chế độ luyện của bạn khác (chế độ không phải của em) không?', choices: ['Không', 'Có, 1 lần', 'Có, nhiều lần'] },
      { type: 'checkbox', title: 'W7. Tuần này em có gặp vấn đề kỹ thuật khi luyện trên web không?', required: true, other: true,
        choices: ['Không gặp vấn đề gì', 'Không ghi âm được', 'Web chậm hoặc bị treo', 'Không đăng nhập được', 'Máy không nghe rõ lời em nói', 'Không có máy hoặc mạng để luyện'] },
      { type: 'paragraph', title: 'W8. Nếu có vấn đề, em kể ngắn gọn chuyện gì đã xảy ra:', required: false },
      { type: 'choice', title: 'W9. Tuần này em có bỏ lỡ buổi luyện nào không?', choices: ['Không', '1 buổi', '2 buổi', '3 buổi trở lên'] },
      { type: 'checkbox', title: 'W10. Nếu có bỏ lỡ, vì sao?', required: false, other: true,
        choices: ['Bận học hoặc bận việc khác', 'Bị ốm', 'Quên', 'Lỗi kỹ thuật trên web', 'Không có máy hoặc mạng'] },
    ],
  };
}

// ───────────────────────────── F7. Phiếu cảm nhận sau thực nghiệm ─────────────────────────────

function form7_CamNhan() {
  return {
    key: 'F7',
    api: true,
    title: 'Phiếu cảm nhận sau thời gian luyện tập',
    sheetName: 'F7 – Cảm nhận sau thực nghiệm (câu trả lời)',
    purpose: 'CH4: học sinh đánh giá cách luyện mình đã dùng. Chế độ A chỉ hỏi về LINGUA-REFLEX, chế độ B chỉ hỏi về đọc to.',
    audience: 'Học sinh lớp 8 đã tham gia thực nghiệm (chế độ A và B, mỗi chế độ một nhánh câu hỏi)',
    contentStatus: 'AI soạn theo Quy trình mục 3.9 – nhóm đọc lại',
    description:
      'Em đã luyện nói trên web LINGUA-REFLEX trong thời gian qua. Phiếu này hỏi em thấy cách luyện đó thế nào (khoảng 7 phút).\n' +
      'Hãy trả lời thật, kể cả khi em thấy không thích hay không hữu ích: ý kiến thật giúp nhóm nhiều nhất.\n\n' +
      'Với các câu có thang 1–5: 1 = Hoàn toàn không đồng ý, 5 = Hoàn toàn đồng ý.\n\n' + PRIVACY_NOTE,
    items: [
      { type: 'code' },
      { type: 'choice', title: 'P1. Trong thời gian nghiên cứu, em có dùng thử chế độ luyện của bạn khác (chế độ không phải của em) không?', choices: ['Không', 'Có, 1–2 lần', 'Có, nhiều hơn 2 lần'] },
      { type: 'branch', title: 'P2. Em luyện theo chế độ nào?', help: 'Xem ở trang chủ khi em đăng nhập web.', options: [{ label: 'Chế độ A', goTo: 'A' }, { label: 'Chế độ B', goTo: 'B' }] },

      { type: 'section', key: 'A', endForm: true, title: 'Chế độ A', help: '1 = Hoàn toàn không đồng ý, 5 = Hoàn toàn đồng ý.' },
    ].concat(likert_('A', [
      'Phần trả lời nhanh (Speed Q&A) giúp em bắt đầu trả lời nhanh hơn.',
      'Thời gian trả lời giảm dần (5 giây → 3 giây → 1,5 giây) là phù hợp với em.',
      'Giới hạn thời gian trong phần trả lời nhanh làm em căng thẳng.',
      'Học theo từng bậc (từ vựng → khung câu → mở rộng câu → nói đoạn) giúp em nói được câu dài hơn.',
      'Khi bị bí, gợi ý giúp em nói tiếp được.',
      'Gợi ý hiện ra từng bậc, từ ít đến nhiều, là vừa đủ với em.',
      'Phần hội thoại ngắn (Micro-Roleplay) giúp em quen nói chuyện bằng tiếng Anh.',
      'Nhận xét sau mỗi câu trả lời giúp em biết cần sửa gì.',
      'Em giữ được thói quen luyện 10–15 phút mỗi ngày.',
      'Sau thời gian luyện, em tự tin hơn khi nói tiếng Anh.',
      'Em muốn tiếp tục dùng LINGUA-REFLEX sau khi nghiên cứu kết thúc.',
    ])).concat([
      { type: 'paragraph', title: 'A12. Phần nào em thấy hữu ích nhất? Vì sao?', required: false },
      { type: 'paragraph', title: 'A13. Phần nào em thấy khó chịu hoặc không hữu ích? Vì sao?', required: false },
      { type: 'paragraph', title: 'A14. Em muốn LINGUA-REFLEX thay đổi gì?', required: false },

      { type: 'section', key: 'B', title: 'Chế độ B', help: '1 = Hoàn toàn không đồng ý, 5 = Hoàn toàn đồng ý.' },
    ]).concat(likert_('B', [
      'Đọc to bài hội thoại và đoạn văn giúp em nói tiếng Anh trôi chảy hơn.',
      'Việc ghi âm khi đọc giúp em chú ý hơn đến cách mình nói.',
      'Bài đọc có độ khó phù hợp với em.',
      'Luyện đọc to làm em thấy nhàm chán.',
      'Em giữ được thói quen luyện 10–15 phút mỗi ngày.',
      'Sau thời gian luyện, em tự tin hơn khi nói tiếng Anh.',
      'Em muốn tiếp tục luyện theo cách này.',
    ])).concat([
      { type: 'paragraph', title: 'B8. Điều gì trong cách luyện này em thấy hữu ích nhất? Vì sao?', required: false },
      { type: 'paragraph', title: 'B9. Điều gì em thấy khó chịu hoặc không hữu ích? Vì sao?', required: false },
      { type: 'paragraph', title: 'B10. Em muốn cách luyện này thay đổi gì?', required: false },
    ]),
  };
}

// ───────────────────────────── F8. Phỏng vấn giáo viên ─────────────────────────────

function interviewQ_(id, title, probe, onlyAfter) {
  return { type: 'paragraph', title: id + '. ' + title + (onlyAfter ? ' (chỉ hỏi ở buổi SAU thực nghiệm)' : ''), help: probe ? 'Hỏi thêm nếu cần: ' + probe : '', required: false };
}

function form8_PhongVanGV() {
  return {
    key: 'F8',
    api: false,
    title: 'Phiếu ghi phỏng vấn giáo viên (người phỏng vấn điền)',
    sheetName: 'F8 – Phỏng vấn giáo viên (ghi chép)',
    purpose: 'Ghi lại phỏng vấn ~15 phút với khoảng 3 giáo viên tiếng Anh (Quy trình mục 3.10)',
    audience: 'Người phỏng vấn (Lâm) điền trong/sau buổi phỏng vấn – KHÔNG gửi cho giáo viên',
    contentStatus: 'AI soạn – nhóm đọc lại',
    description:
      'Người phỏng vấn điền phiếu này. Không ghi họ tên giáo viên: dùng mã GV1, GV2, GV3 (bảng tên riêng do Lâm giữ).\n' +
      'Chỉ ghi âm khi giáo viên đồng ý. Ghi ý chính bằng lời của giáo viên, không thêm ý của mình. Thời gian dự kiến: 15 phút.',
    items: [
      { type: 'text', title: 'Mã giáo viên (VD: GV1)', required: true },
      { type: 'date', title: 'Ngày phỏng vấn', required: true },
      { type: 'choice', title: 'Thời điểm', choices: ['Trước thực nghiệm', 'Sau thực nghiệm'] },
      { type: 'choice', title: 'Giáo viên đồng ý ghi âm?', choices: ['Có', 'Không (chỉ ghi chép)'] },
      interviewQ_('T1', 'Thầy/cô thấy khả năng nói tiếng Anh của học sinh hiện nay thế nào?', 'khối nào, ví dụ cụ thể'),
      interviewQ_('T2', 'Học sinh thường gặp những khó khăn nào khi nói?', 'bắt đầu câu, tìm từ, ghép câu, sợ sai'),
      interviewQ_('T3', 'Thầy/cô có thấy khác biệt giữa điểm kiến thức (từ vựng, ngữ pháp) và khả năng giao tiếp của học sinh không?', 'ví dụ một học sinh điểm cao nhưng nói chậm'),
      interviewQ_('T4', 'Trên lớp, học sinh có đủ thời gian luyện phản xạ nói không? Thầy/cô đang cho học sinh luyện nói bằng cách nào?'),
      interviewQ_('T5', 'Thầy/cô nghĩ gì về việc học sinh luyện nói ở nhà với AI?', 'lợi ích, lo ngại'),
      interviewQ_('T6', 'Thầy/cô nhận xét gì về các phương pháp luyện nói (khung câu, trả lời nhanh, đọc to, hội thoại)?'),
      interviewQ_('T7', 'Theo thầy/cô, LINGUA-REFLEX hữu ích ở điểm nào?', '', true),
      interviewQ_('T8', 'LINGUA-REFLEX còn hạn chế gì, cần cải thiện gì?', '', true),
      interviewQ_('T9', 'Thầy/cô nhận xét gì về kết quả thực nghiệm nhóm trình bày?', 'điều gì bất ngờ, điều gì cần thận trọng khi kết luận', true),
      { type: 'paragraph', title: 'Ghi chú khác của người phỏng vấn', required: false },
    ],
  };
}

// ───────────────────────────── F9. Phỏng vấn học sinh ─────────────────────────────

function form9_PhongVanHS() {
  return {
    key: 'F9',
    api: false,
    title: 'Phiếu ghi phỏng vấn học sinh chế độ A (người phỏng vấn điền)',
    sheetName: 'F9 – Phỏng vấn học sinh (ghi chép)',
    purpose: 'Ghi lại phỏng vấn 10–15 phút với khoảng 6 học sinh chế độ A sau thực nghiệm (Quy trình mục 3.10)',
    audience: 'Người phỏng vấn (Lâm) điền – chọn 2 học sinh tiến bộ nhiều, 2 trung bình, 2 ít',
    contentStatus: 'AI soạn – nhóm đọc lại',
    description:
      'Người phỏng vấn điền phiếu này. Chọn học sinh theo mức tiến bộ (cao / trung bình / thấp) để không chỉ nghe ý kiến của các bạn có kết quả tốt.\n' +
      'Hỏi trung tính, không gợi ý câu trả lời "tốt" (VD: hỏi "Em thấy… thế nào?" thay vì "Em thấy… có tốt không?"). ' +
      'Chỉ ghi âm khi học sinh đồng ý. Thời gian dự kiến: 10–15 phút.',
    items: [
      { type: 'code', title: 'Mã học sinh (nếu không có thì ghi họ và tên)', help: 'Mã học sinh (VD: FBG20124). Nếu học sinh chưa có mã, ghi đầy đủ họ và tên.' },
      { type: 'date', title: 'Ngày phỏng vấn', required: true },
      { type: 'choice', title: 'Nhóm mức tiến bộ (theo RL trước – sau)', choices: ['Tiến bộ nhiều', 'Tiến bộ trung bình', 'Tiến bộ ít / chưa tiến bộ'] },
      { type: 'choice', title: 'Học sinh đồng ý ghi âm?', choices: ['Có', 'Không (chỉ ghi chép)'] },
      interviewQ_('S1', 'Em kể lại một buổi luyện bình thường của em trên web.', 'luyện lúc nào, ở đâu, bao lâu'),
      interviewQ_('S2', 'Trước khi luyện, em gặp khó khăn gì khi nói tiếng Anh? Bây giờ những khó khăn đó thế nào?'),
      interviewQ_('S3', 'Em thấy tốc độ bắt đầu trả lời của em bây giờ so với trước khi luyện thế nào?', 'em nhận ra điều đó khi nào'),
      interviewQ_('S4', 'Phần nào của web em thấy hữu ích? Phần nào không hữu ích hoặc khó chịu?', 'trả lời nhanh, gợi ý, khung câu, hội thoại, nhận xét'),
      interviewQ_('S5', 'Em có nhận thấy mình thay đổi gì khi nói tiếng Anh trên lớp hoặc ngoài lớp không?'),
      interviewQ_('S6', 'Những khó khăn nào khi nói em vẫn còn gặp?'),
      interviewQ_('S7', 'Nếu được sửa web, em muốn sửa gì?'),
      { type: 'paragraph', title: 'Ghi chú khác của người phỏng vấn', required: false },
    ],
  };
}
