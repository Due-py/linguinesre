/**
 * FLCAS – Foreign Language Classroom Anxiety Scale
 * Nguồn: Horwitz, E. K., Horwitz, M. B., & Cope, J. (1986). Foreign Language Classroom Anxiety.
 *        The Modern Language Journal, 70(2), 125–132. Thang gốc: 33 câu, Likert 5 mức
 *        (1 = Strongly disagree … 5 = Strongly agree).
 *
 * - Dùng ĐỦ 33 câu, ĐÚNG thứ tự gốc. "foreign language" được thay bằng "tiếng Anh" (cách làm phổ biến khi dùng thang
 *   cho một ngôn ngữ cụ thể; ghi rõ trong báo cáo).
 * - Bản dịch tiếng Việt do AI soạn ngày 10/11/2026. Quy trình mục 3.3 yêu cầu dịch ngược để kiểm tra: xem
 *   research-system/noi-dung-can-duyet.md. Câu tiếng Anh gốc giữ ở cột en để đối chiếu.
 * - Câu tính NGƯỢC điểm (câu nói về sự thoải mái): 2, 5, 8, 11, 14, 18, 22, 28, 32 → điểm = 6 − lựa chọn.
 *   Điểm cao = lo âu cao. Phần tính điểm nằm ở src/lib/research/flcas.ts (có test).
 * - Form trước (F2) và sau (F6) gọi CHUNG hàm flcasItems_(): nội dung, thứ tự, thang đo giống hệt nhau.
 */

var FLCAS = [
  { n: 1, en: 'I never feel quite sure of myself when I am speaking in my foreign language class.', vi: 'Em không bao giờ thấy thật sự tự tin vào bản thân khi nói trong giờ học tiếng Anh.' },
  { n: 2, en: "I don't worry about making mistakes in language class.", vi: 'Em không lo bị mắc lỗi trong giờ học tiếng Anh.' },
  { n: 3, en: "I tremble when I know that I'm going to be called on in language class.", vi: 'Em run khi biết mình sắp bị gọi trả lời trong giờ học tiếng Anh.' },
  { n: 4, en: "It frightens me when I don't understand what the teacher is saying in the foreign language.", vi: 'Em thấy sợ khi không hiểu thầy cô đang nói gì bằng tiếng Anh.' },
  { n: 5, en: "It wouldn't bother me at all to take more foreign language classes.", vi: 'Em hoàn toàn không thấy phiền nếu phải học thêm nhiều giờ tiếng Anh nữa.' },
  { n: 6, en: 'During language class, I find myself thinking about things that have nothing to do with the course.', vi: 'Trong giờ học tiếng Anh, em hay thấy mình nghĩ về những chuyện không liên quan gì đến bài học.' },
  { n: 7, en: 'I keep thinking that the other students are better at languages than I am.', vi: 'Em cứ nghĩ rằng các bạn khác học ngoại ngữ giỏi hơn em.' },
  { n: 8, en: 'I am usually at ease during tests in my language class.', vi: 'Em thường thấy thoải mái khi làm bài kiểm tra trong giờ học tiếng Anh.' },
  { n: 9, en: 'I start to panic when I have to speak without preparation in language class.', vi: 'Em bắt đầu hoảng khi phải nói mà không được chuẩn bị trước trong giờ học tiếng Anh.' },
  { n: 10, en: 'I worry about the consequences of failing my foreign language class.', vi: 'Em lo về hậu quả nếu bị trượt môn tiếng Anh.' },
  { n: 11, en: "I don't understand why some people get so upset over foreign language classes.", vi: 'Em không hiểu tại sao có người lại lo lắng, bực bội nhiều đến vậy vì giờ học tiếng Anh.' },
  { n: 12, en: 'In language class, I can get so nervous I forget things I know.', vi: 'Trong giờ học tiếng Anh, có lúc em hồi hộp đến mức quên cả những điều mình đã biết.' },
  { n: 13, en: 'It embarrasses me to volunteer answers in my language class.', vi: 'Em thấy ngại khi tự giơ tay trả lời trong giờ học tiếng Anh.' },
  { n: 14, en: 'I would not be nervous speaking the foreign language with native speakers.', vi: 'Em sẽ không thấy hồi hộp khi nói tiếng Anh với người bản ngữ.' },
  { n: 15, en: "I get upset when I don't understand what the teacher is correcting.", vi: 'Em thấy khó chịu khi không hiểu thầy cô đang sửa lỗi gì.' },
  { n: 16, en: 'Even if I am well prepared for language class, I feel anxious about it.', vi: 'Dù đã chuẩn bị bài kỹ, em vẫn thấy lo lắng về giờ học tiếng Anh.' },
  { n: 17, en: 'I often feel like not going to my language class.', vi: 'Em thường có cảm giác không muốn đến giờ học tiếng Anh.' },
  { n: 18, en: 'I feel confident when I speak in foreign language class.', vi: 'Em thấy tự tin khi nói trong giờ học tiếng Anh.' },
  { n: 19, en: 'I am afraid that my language teacher is ready to correct every mistake I make.', vi: 'Em sợ rằng thầy cô dạy tiếng Anh lúc nào cũng sẵn sàng sửa từng lỗi em mắc.' },
  { n: 20, en: "I can feel my heart pounding when I'm going to be called on in language class.", vi: 'Em thấy tim mình đập mạnh khi sắp bị gọi trả lời trong giờ học tiếng Anh.' },
  { n: 21, en: 'The more I study for a language test, the more confused I get.', vi: 'Càng ôn nhiều cho bài kiểm tra tiếng Anh, em càng thấy rối.' },
  { n: 22, en: "I don't feel pressure to prepare very well for language class.", vi: 'Em không thấy áp lực phải chuẩn bị thật kỹ cho giờ học tiếng Anh.' },
  { n: 23, en: 'I always feel that the other students speak the foreign language better than I do.', vi: 'Em luôn cảm thấy các bạn khác nói tiếng Anh giỏi hơn em.' },
  { n: 24, en: 'I feel very self-conscious about speaking the foreign language in front of other students.', vi: 'Em rất ngại và để ý đến bản thân khi nói tiếng Anh trước mặt các bạn khác.' },
  { n: 25, en: 'Language class moves so quickly I worry about getting left behind.', vi: 'Giờ học tiếng Anh diễn ra nhanh đến mức em lo mình bị tụt lại phía sau.' },
  { n: 26, en: 'I feel more tense and nervous in my language class than in my other classes.', vi: 'Em thấy căng thẳng và hồi hộp trong giờ học tiếng Anh hơn các giờ học khác.' },
  { n: 27, en: 'I get nervous and confused when I am speaking in my language class.', vi: 'Em thấy hồi hộp và lúng túng khi nói trong giờ học tiếng Anh.' },
  { n: 28, en: "When I'm on my way to language class, I feel very sure and relaxed.", vi: 'Trên đường đến giờ học tiếng Anh, em thấy rất vững vàng và thoải mái.' },
  { n: 29, en: "I get nervous when I don't understand every word the language teacher says.", vi: 'Em thấy hồi hộp khi không hiểu hết từng từ thầy cô dạy tiếng Anh nói.' },
  { n: 30, en: 'I feel overwhelmed by the number of rules you have to learn to speak a foreign language.', vi: 'Em thấy choáng ngợp vì có quá nhiều quy tắc phải học để nói được tiếng Anh.' },
  { n: 31, en: 'I am afraid that the other students will laugh at me when I speak the foreign language.', vi: 'Em sợ các bạn khác sẽ cười em khi em nói tiếng Anh.' },
  { n: 32, en: 'I would probably feel comfortable around native speakers of the foreign language.', vi: 'Có lẽ em sẽ thấy thoải mái khi ở cạnh người bản ngữ nói tiếng Anh.' },
  { n: 33, en: "I get nervous when the language teacher asks questions which I haven't prepared in advance.", vi: 'Em thấy hồi hộp khi thầy cô dạy tiếng Anh hỏi những câu em chưa chuẩn bị trước.' },
];

/** Câu tính ngược điểm (giống src/lib/research/flcas.ts). */
var FLCAS_REVERSED = [2, 5, 8, 11, 14, 18, 22, 28, 32];

/**
 * Các câu về NÓI (communication apprehension) hay được dùng trong các nghiên cứu sau Horwitz và cộng sự (1986).
 * Quy trình mục 1.4 lấy "trung bình các câu về Nói" làm chỉ số chính. Nhóm PHẢI chốt danh sách này trong kế hoạch phân tích
 * trước khi thu dữ liệu (và kiểm tra nguồn phân nhóm). Form vẫn hỏi đủ 33 câu để tính được cả điểm toàn thang.
 */
var FLCAS_SPEAKING = [1, 9, 14, 18, 24, 27, 29, 32];

var FLCAS_LOW = '1 – Hoàn toàn không đồng ý';
var FLCAS_HIGH = '5 – Hoàn toàn đồng ý';

/** Tiêu đề câu: "số. câu tiếng Việt". Số ở đầu để máy tính điểm nhận ra câu gốc nào. */
function flcasTitle_(it) { return it.n + '. ' + it.vi; }

function flcasItems_(numbers) {
  var list = numbers ? FLCAS.filter(function (it) { return numbers.indexOf(it.n) >= 0; }) : FLCAS;
  return list.map(function (it) { return { type: 'scale', title: flcasTitle_(it), low: FLCAS_LOW, high: FLCAS_HIGH }; });
}

var FLCAS_INTRO =
  'Phiếu này hỏi về cảm nhận của em khi học và nói tiếng Anh. Không có câu trả lời đúng hay sai.\n' +
  'Với mỗi câu, chọn từ 1 (Hoàn toàn không đồng ý) đến 5 (Hoàn toàn đồng ý), đúng với em nhất. Mất khoảng 7 phút.\n\n' +
  'Câu trả lời chỉ gắn với mã học sinh (hoặc họ tên nếu em chưa có mã), chỉ nhóm nghiên cứu và cô giáo hướng dẫn xem. ' +
  'Câu trả lời KHÔNG ảnh hưởng đến điểm số ở trường. Em có thể dừng tham gia nghiên cứu bất cứ lúc nào.\n\n' +
  'Bộ câu hỏi: Foreign Language Classroom Anxiety Scale (Horwitz, Horwitz & Cope, 1986), bản dịch tiếng Việt.';

function flcasForm_(key, phaseVi, purpose) {
  return {
    key: key,
    api: true,
    title: 'Cảm nhận khi học tiếng Anh – ' + phaseVi,
    sheetName: 'FLCAS – ' + phaseVi + ' (câu trả lời)',
    purpose: purpose,
    audience: 'Học sinh lớp 8 tham gia thực nghiệm (cả chế độ A và B)',
    contentStatus: 'FLCAS 33 câu gốc; bản dịch AI soạn – cần dịch ngược (noi-dung-can-duyet.md)',
    description: FLCAS_INTRO,
    items: [{ type: 'code' }].concat(flcasItems_()),
  };
}

function form2_FlcasTruoc() {
  return flcasForm_('F2', 'trước thực nghiệm', 'FLCAS lần 1: mức lo âu trước thực nghiệm (CH4)');
}

function form6_FlcasSau() {
  return flcasForm_('F6', 'sau thực nghiệm', 'FLCAS lần 2: cùng bộ câu, cùng thứ tự, cùng thang như lần 1 (CH4)');
}
