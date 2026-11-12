/**
 * Form 4 – Bài kiểm tra nói (Speaking pre-test / post-test).
 *
 * Phần GHI ÂM đã chạy trên web LINGUA-REFLEX (/student/test): bíp → tối đa 10 giây để bắt đầu, 20 giây cả câu,
 * không đồng hồ đếm ngược, ghi âm từng câu, đo RL tự động. Không làm lại bằng Google Forms (Forms không ghi âm được).
 *
 * Phần CHẤM 0–1–2 (Accuracy and Completeness, Quy trình mục 3.6) làm ở bảng tính tạo bởi hàm dưới đây:
 *  1. Lâm chạy trên máy: npm run research:blind  → đổi tên file ghi âm thành mã ngẫu nhiên (R0001…), tạo 2 danh sách
 *     nguoi-cham-1.csv, nguoi-cham-2.csv (có 20% file chung để tính kappa) và bảng đối chiếu BÍ MẬT.
 *  2. Chạy taoBangChamMu (một lần) → bảng tính có 2 trang "Người chấm 1", "Người chấm 2".
 *  3. Dán cột ma_file của từng danh sách vào trang tương ứng. Chia sẻ trang cho đúng người chấm.
 *  4. Chấm xong: tải mỗi trang về dạng CSV → npm run research:import-scores (xem HUONG-DAN.md).
 * Bảng tính này KHÔNG có nhóm A/B, KHÔNG có bài trước/sau, KHÔNG có mã học sinh.
 */

var RUBRIC = [
  ['Điểm', 'Mô tả', 'Ví dụ cho câu "What do you usually do in your free time?"'],
  [0, 'Không trả lời, không liên quan, hoặc chỉ nói 1–2 từ rời', '"Football." / im lặng'],
  [1, 'Đúng ý nhưng chưa thành câu hoàn chỉnh, hoặc có lỗi làm khó hiểu nghĩa', '"I… play football… with friend… yesterday."'],
  [2, 'Câu hoàn chỉnh (có chủ ngữ + động từ), đúng ý câu hỏi; lỗi nhỏ không ảnh hưởng nghĩa vẫn được 2', '"I usually play football with my friends."'],
];

function taoBangChamMu() {
  var props = PropertiesService.getScriptProperties();
  var existing = props.getProperty('blindSheet');
  if (existing) {
    console.log('Đã có bảng chấm mù: https://docs.google.com/spreadsheets/d/' + existing);
    return;
  }
  var ss = SpreadsheetApp.create('LINGUA-REFLEX – Bảng chấm mù bài kiểm tra nói');
  var guide = ss.getSheets()[0].setName('Hướng dẫn');
  var text = [
    ['Bảng chấm mù (Quy trình mục 3.6)'],
    ['1. Mỗi dòng là một file ghi âm đã đổi tên (VD: R0371.webm). Mở file, nghe, nhập điểm 0, 1 hoặc 2 vào cột "diem".'],
    ['2. Mỗi người chỉ chấm trang của mình và KHÔNG xem trang của người kia (chấm độc lập).'],
    ['3. Không biết file thuộc học sinh nào, nhóm nào, bài trước hay sau. Nếu nhận ra giọng bạn, vẫn chấm theo bảng điểm, không đoán.'],
    ['4. Câu khó quyết định: ghi lý do ở cột "ghi_chu".'],
    [''],
  ];
  guide.getRange(1, 1, text.length, 1).setValues(text);
  guide.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  guide.getRange(text.length + 1, 1, RUBRIC.length, 3).setValues(RUBRIC);
  guide.getRange(text.length + 1, 1, 1, 3).setFontWeight('bold');
  guide.setColumnWidth(1, 520);

  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['0', '1', '2'], true).setAllowInvalid(false).setHelpText('Chỉ nhập 0, 1 hoặc 2').build();
  ['Người chấm 1', 'Người chấm 2'].forEach(function (name) {
    var sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, 3).setValues([['ma_file', 'diem', 'ghi_chu']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, 2, 2000, 1).setDataValidation(rule);
    sh.setColumnWidth(3, 360);
  });
  DriveApp.getFileById(ss.getId()).moveTo(getFolder_());
  props.setProperty('blindSheet', ss.getId());
  writeIndex_(getFolder_());
  console.log('Đã tạo bảng chấm mù: ' + ss.getUrl());
}
