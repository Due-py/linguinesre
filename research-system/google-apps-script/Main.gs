/**
 * LINGUA-REFLEX: tự tạo Google Forms + Google Sheets cho nghiên cứu.
 *
 * Chạy lần đầu: chọn hàm taoTatCa ở thanh trên rồi bấm Run (xem research-system/HUONG-DAN.md).
 * Chạy lại an toàn: form nào đã tạo thì bỏ qua (nhớ bằng Script Properties), không tạo trùng.
 * Form đã có câu trả lời thì KHÔNG BAO GIỜ bị sửa hay tạo lại bằng code này (giữ nguyên dữ liệu và nội dung đã phát).
 *
 * Nội dung từng form nằm ở các file Form*.gs. File này chỉ có phần "máy" dựng form.
 */

var FOLDER_NAME = 'LINGUA-REFLEX – Dữ liệu nghiên cứu';
var INDEX_NAME = 'LINGUA-REFLEX – Danh sách form nghiên cứu';
var CODE_PATTERN = '^(?:[Ff][Bb][Gg][0-9]{4,6}|[A-Za-z]{2}[0-9]{2,4})$';
var CODE_TITLE = 'Mã học sinh (nếu không có thì ghi họ và tên)';
var CODE_HELP = 'Ghi mã em dùng để đăng nhập LINGUA-REFLEX, VD: FBG20124. Nếu em chưa có mã, ghi đầy đủ họ và tên.';

/**
 * Sửa câu hỏi mã học sinh trong các form ĐÃ TẠO (kể cả form đã có câu trả lời): đổi tiêu đề, lời dặn,
 * bỏ ràng buộc định dạng FBG20124, cập nhật lời giới thiệu form. Không xóa câu trả lời, không đổi câu hỏi khác.
 * Chạy một lần sau khi dán mã mới. Ghi lại ngày sửa vào nhật ký nghiên cứu.
 */
function capNhatCauMa() {
  allForms_().forEach(function (cfg) {
    var form = openSaved_(cfg.key);
    if (!form) { console.log(cfg.key + ': chưa tạo, bỏ qua (taoTatCa sẽ tạo đúng câu mới)'); return; }
    var codeCfg = cfg.items.filter(function (q) { return q.type === 'code'; })[0];
    if (!codeCfg) return;
    var n = 0;
    form.getItems(FormApp.ItemType.TEXT).forEach(function (it) {
      if (!/^mã học sinh/i.test(it.getTitle())) return;
      it.asTextItem().setTitle(codeCfg.title || CODE_TITLE).setHelpText(codeCfg.help || CODE_HELP).clearValidation();
      n++;
    });
    form.setDescription(cfg.description);
    console.log(cfg.key + ': đã sửa ' + n + ' câu hỏi mã (' + form.getResponses().length + ' câu trả lời giữ nguyên)');
  });
  writeIndex_(getFolder_());
}

/** Danh sách mọi form, theo thứ tự trong Quy trình. */
function allForms_() {
  return [form1_ThucTrang(), form2_FlcasTruoc(), form3_MiniTest(), form5_HangTuan(), form6_FlcasSau(), form7_CamNhan(), form8_PhongVanGV(), form9_PhongVanHS()];
}

// ───────────────────────────── Các hàm bấm Run ─────────────────────────────

/** Tạo mọi form còn thiếu + bảng danh sách. Chạy lại bao nhiêu lần cũng được. */
function taoTatCa() {
  var folder = getFolder_();
  var report = [];
  allForms_().forEach(function (cfg) {
    try {
      report.push(ensureForm_(cfg, folder));
    } catch (e) {
      report.push({ key: cfg.key, status: 'LỖI: ' + e.message });
      console.error(cfg.key + ': ' + e.stack);
    }
  });
  writeIndex_(folder);
  report.forEach(function (r) { console.log(r.key + ' → ' + r.status); });
  console.log('Xong. Mở file "' + INDEX_NAME + '" trong thư mục "' + FOLDER_NAME + '" trên Google Drive để lấy link.');
}

/** Chỉ cập nhật bảng danh sách (số câu trả lời, link). */
function capNhatDanhSach() {
  writeIndex_(getFolder_());
}

/**
 * Dựng lại nội dung MỘT form khi đã sửa nội dung trong file Form*.gs (VD: cô Vân góp ý).
 * Chỉ làm được khi form CHƯA có câu trả lời nào. VD: dungLaiForm('F3')
 */
function dungLaiForm(key) {
  var cfg = allForms_().filter(function (c) { return c.key === key; })[0];
  if (!cfg) throw new Error('Không có form mã ' + key);
  var form = openSaved_(key);
  if (!form) throw new Error(key + ' chưa được tạo. Chạy taoTatCa trước.');
  if (form.getResponses().length > 0) throw new Error(key + ' đã có ' + form.getResponses().length + ' câu trả lời: không sửa để giữ nguyên dữ liệu. Nếu thật sự cần, tạo form mới bằng tay và ghi lý do vào nhật ký nghiên cứu.');
  form.getItems().forEach(function (it) { form.deleteItem(it); });
  buildForm_(form, cfg);
  writeIndex_(getFolder_());
  console.log(key + ': đã dựng lại nội dung.');
}

/** Tạo mã bí mật cho cổng dữ liệu (doGet). Chạy MỘT lần, chép mã in ra vào biến RESEARCH_SHEETS_SECRET trên Vercel. */
function taoMaBiMat() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('API_SECRET')) {
    console.log('Đã có mã bí mật. Muốn đổi mã thì chạy doiMaBiMat.');
    return;
  }
  doiMaBiMat();
}

function doiMaBiMat() {
  var secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('API_SECRET', secret);
  console.log('Mã bí mật mới (chỉ dán vào Vercel, KHÔNG gửi qua chat nhóm): ' + secret);
}

// ───────────────────────────── Dựng form ─────────────────────────────

function getFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('folder');
  if (id) {
    try {
      var f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* thư mục đã bị xóa: tạo lại */ }
  }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('folder', folder.getId());
  return folder;
}

function openSaved_(key) {
  var id = PropertiesService.getScriptProperties().getProperty('form:' + key);
  if (!id) return null;
  try {
    if (DriveApp.getFileById(id).isTrashed()) return null;
    return FormApp.openById(id);
  } catch (e) {
    return null;
  }
}

function ensureForm_(cfg, folder) {
  var existing = openSaved_(cfg.key);
  if (existing) return { key: cfg.key, status: 'đã có, bỏ qua (' + existing.getResponses().length + ' câu trả lời)' };

  var form = FormApp.create(cfg.title);
  form.setDescription(cfg.description);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setPublishingSummary(false);
  form.setConfirmationMessage(cfg.confirmation || 'Cảm ơn em đã trả lời! Câu trả lời đã được ghi lại.');
  if (cfg.quiz) form.setIsQuiz(true);
  buildForm_(form, cfg);

  var ss = SpreadsheetApp.create(cfg.sheetName || cfg.title + ' (câu trả lời)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  DriveApp.getFileById(form.getId()).moveTo(folder);
  DriveApp.getFileById(ss.getId()).moveTo(folder);

  var props = PropertiesService.getScriptProperties();
  props.setProperty('form:' + cfg.key, form.getId());
  props.setProperty('sheet:' + cfg.key, ss.getId());
  return { key: cfg.key, status: 'đã tạo mới' };
}

/** Dựng các câu hỏi theo cấu hình. Hai lượt: tạo câu + trang, rồi gắn đường rẽ nhánh (cần trang đã tồn tại). */
function buildForm_(form, cfg) {
  var pages = {};
  var branches = [];
  var endPrev = false;
  cfg.items.forEach(function (q) {
    switch (q.type) {
      case 'section': {
        var pb = form.addPageBreakItem().setTitle(q.title);
        if (q.help) pb.setHelpText(q.help);
        if (endPrev) pb.setGoToPage(FormApp.PageNavigationType.SUBMIT);
        endPrev = !!q.endForm;
        if (q.key) pages[q.key] = pb;
        break;
      }
      case 'info':
        form.addSectionHeaderItem().setTitle(q.title).setHelpText(q.help || '');
        break;
      case 'code': {
        // Không ép định dạng: học sinh chưa có mã thì ghi họ và tên.
        form.addTextItem()
          .setTitle(q.title || CODE_TITLE)
          .setHelpText(q.help || CODE_HELP)
          .setRequired(true);
        break;
      }
      case 'text': {
        var t = form.addTextItem().setTitle(q.title).setRequired(!!q.required);
        if (q.help) t.setHelpText(q.help);
        break;
      }
      case 'paragraph': {
        var p = form.addParagraphTextItem().setTitle(q.title).setRequired(!!q.required);
        if (q.help) p.setHelpText(q.help);
        break;
      }
      case 'date': {
        var d = form.addDateItem().setTitle(q.title).setRequired(!!q.required);
        if (q.help) d.setHelpText(q.help);
        break;
      }
      case 'choice': {
        var c = form.addMultipleChoiceItem().setTitle(q.title).setRequired(q.required !== false);
        if (q.help) c.setHelpText(q.help);
        c.setChoiceValues(q.choices);
        if (q.other) c.showOtherOption(true);
        break;
      }
      case 'checkbox': {
        var cb = form.addCheckboxItem().setTitle(q.title).setRequired(!!q.required);
        if (q.help) cb.setHelpText(q.help);
        cb.setChoiceValues(q.choices);
        if (q.other) cb.showOtherOption(true);
        break;
      }
      case 'scale': {
        var s = form.addScaleItem()
          .setTitle(q.title)
          .setBounds(1, 5)
          .setLabels(q.low || 'Hoàn toàn không đồng ý', q.high || 'Hoàn toàn đồng ý')
          .setRequired(q.required !== false);
        if (q.help) s.setHelpText(q.help);
        break;
      }
      case 'quiz': {
        var m = form.addMultipleChoiceItem().setTitle(q.title).setRequired(true).setPoints(1);
        m.setChoices(q.choices.map(function (text, i) { return m.createChoice(text, i === q.answer); }));
        break;
      }
      case 'branch': {
        var b = form.addMultipleChoiceItem().setTitle(q.title).setRequired(true);
        if (q.help) b.setHelpText(q.help);
        branches.push({ item: b, options: q.options });
        break;
      }
      default:
        throw new Error('Loại câu hỏi lạ: ' + q.type);
    }
  });
  branches.forEach(function (br) {
    br.item.setChoices(br.options.map(function (o) {
      if (!pages[o.goTo]) throw new Error('Không có trang ' + o.goTo);
      return br.item.createChoice(o.label, pages[o.goTo]);
    }));
  });
}

// ───────────────────────────── Bảng danh sách ─────────────────────────────

function writeIndex_(folder) {
  var props = PropertiesService.getScriptProperties();
  var ss;
  var id = props.getProperty('index');
  try { ss = id ? SpreadsheetApp.openById(id) : null; } catch (e) { ss = null; }
  if (!ss) {
    ss = SpreadsheetApp.create(INDEX_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    props.setProperty('index', ss.getId());
  }
  var sh = ss.getSheets()[0].setName('Danh sách');
  sh.clear();
  var rows = [['Mã', 'Tên form', 'Mục đích', 'Đối tượng', 'Link gửi người trả lời', 'Link sửa form (chỉ nhóm)', 'Bảng câu trả lời (chỉ nhóm)', 'Số câu trả lời', 'Nội dung', 'Cập nhật lúc']];
  allForms_().forEach(function (cfg) {
    var form = openSaved_(cfg.key);
    var sheetId = props.getProperty('sheet:' + cfg.key);
    rows.push([
      cfg.key,
      cfg.title,
      cfg.purpose,
      cfg.audience,
      form ? form.getPublishedUrl() : '(chưa tạo)',
      form ? form.getEditUrl() : '',
      sheetId ? 'https://docs.google.com/spreadsheets/d/' + sheetId : '',
      form ? form.getResponses().length : 0,
      cfg.contentStatus,
      new Date(),
    ]);
  });
  var blind = props.getProperty('blindSheet');
  if (blind) rows.push(['F4', 'Bảng chấm mù bài kiểm tra nói', 'Chấm 0–1–2 (mục 3.6)', 'Người chấm (Duy, Hiệu)', '(không gửi học sinh)', '', 'https://docs.google.com/spreadsheets/d/' + blind, '', 'Mã file do research:blind tạo', new Date()]);
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 4);
}

// ───────────────────────────── Cổng dữ liệu cho trang thống kê ─────────────────────────────

/**
 * Trang thống kê LINGUA-REFLEX (máy chủ) gọi: <url web app>?secret=...&form=F2
 * Chỉ trả form có api: true. Phỏng vấn (F8, F9) không trả qua đây: phân tích tay.
 * Không có mã bí mật đúng → không trả gì.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var secret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!secret || params.secret !== secret) return json_({ ok: false, error: 'unauthorized' });
  var forms = allForms_().filter(function (c) { return c.api; });
  if (!params.form) {
    return json_({ ok: true, forms: forms.map(function (c) { return { key: c.key, title: c.title, created: !!openSaved_(c.key) }; }) });
  }
  var cfg = forms.filter(function (c) { return c.key === params.form; })[0];
  if (!cfg) return json_({ ok: false, error: 'unknown_form' });
  var sheetId = PropertiesService.getScriptProperties().getProperty('sheet:' + cfg.key);
  var form = openSaved_(cfg.key);
  if (!sheetId || !form) return json_({ ok: true, key: cfg.key, created: false, headers: [], rows: [] });
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets().filter(function (s) { var u = s.getFormUrl(); return u && u.indexOf(form.getId()) >= 0; })[0];
  if (!sheet || sheet.getLastRow() < 1) return json_({ ok: true, key: cfg.key, created: true, headers: [], rows: [] });
  var values = sheet.getDataRange().getValues();
  var out = values.map(function (row) {
    return row.map(function (v) { return v instanceof Date ? v.toISOString() : v; });
  });
  return json_({ ok: true, key: cfg.key, created: true, headers: out[0], rows: out.slice(1), at: new Date().toISOString() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
