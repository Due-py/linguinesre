# Sửa nội dung lớp 9

Phạm vi: `content/modules/grade-9/unit-*.json` (phần `vocab`) và `tests/fixtures/use-word/grade-9.json`.
Mỗi cụm `collocations[0]` đổi đều có 3 câu thử mới (đạt) và câu đọc nguyên cụm (không đạt).
"khác SGK" = nghĩa/từ khác bảng từ vựng trong sách giáo khoa.

## 1. Nghĩa tiếng Việt / từ gốc

| Unit | Từ | Trước | Sau | Ghi chú |
|---|---|---|---|---|
| 01 | garbage collector | nhân viên dọn vệ sinh | người thu gom rác | khác SGK (dọn vệ sinh là cleaner) |
| 08 | homestay | nhà trọ | nhà dân cho khách du lịch ở cùng (homestay) | khác SGK (nhà trọ là boarding house) |
| 10 | pesticide | thuốc diệt cỏ | thuốc trừ sâu | khác SGK (thuốc diệt cỏ là herbicide) |
| 12 | agriculture engineering → agricultural engineering | ngành kĩ sư nông nghiệp | ngành kĩ thuật nông nghiệp | khác SGK: sửa cả từ tiếng Anh (tên ngành đúng là "agricultural engineering"), phiên âm, câu ví dụ, cụm "study agricultural engineering" |

## 2. Cụm trùng (trong cùng unit, hoặc lặp ý)

| Unit | Từ | Trước | Sau | Ghi chú |
|---|---|---|---|---|
| 01 | skilled | skilled artisan ; skilled worker | highly skilled workers ; skilled at making lanterns | gần trùng "skilled artisans" của artisan |
| 05 | tent | put up a tent ; sleep in a tent | sleep in a tent ; a small tent | trùng "put up a tent" của put up |
| 07 | coral | coral reef ; coral island | colourful coral ; a coral island | trùng từ "coral reef" (unit 05); cụm cũ chỉ là một từ ghép |
| 08 | fixed | a fixed itinerary ; a fixed price | a fixed price ; a fixed schedule | trùng "a fixed itinerary" của itinerary |
| 11 | keyboard | wireless keyboard ; virtual keyboard | type on a keyboard ; a computer keyboard | trùng "wireless keyboard" (wireless) và "a virtual keyboard" (virtual) |

## 3. Cụm quá chung chung / không tự nhiên / thiếu từ gốc

| Unit | Từ | Trước | Sau | Ghi chú |
|---|---|---|---|---|
| 01 | get on with | get on well with neighbours | get on with your neighbours | cụm cũ không chứa nguyên "get on with" (bài điền cụm bị lỗi) |
| 02 | rush hour | at rush hour ; rush-hour traffic | at rush hour ; rush hour traffic | cụm 2 có gạch nối nên không chứa từ gốc |
| 02 | underground | by underground | travel by underground | |
| 04 | recognise | be recognised as | be recognised as a World Heritage Site | |
| 06 | dependent | dependent on | dependent on technology | |
| 06 | opportunity | have an opportunity to ; equal opportunities | have an opportunity to ; a great opportunity | cụm 2 số nhiều không chứa từ gốc |
| 06 | countryside | in the countryside ; live in the countryside | live in the countryside ; grow up in the countryside | |
| 07 | locate | be located in ; be located near | be located in the north ; be located near | |
| 07 | permit | be permitted to ; permit visitors to | be permitted to enter ; permit visitors to | |
| 07 | crazy | be crazy about | be crazy about travelling | |
| 07 | admire | admire the view ; can't help admiring | admire the view ; admire the beauty of nature | cụm 2 không chứa từ gốc |
| 08 | ruinous | a ruinous site | in a ruinous state ; ruinous old buildings | "a ruinous site" không tự nhiên; giữ từ SGK "ruinous" (nghĩa "đổ nát" dùng trong "in a ruinous state") |
| 08 | online app | a travel app ; use an online app | use an online app ; book tickets on an online app | cụm cũ không chứa từ gốc |
| 09 | bilingual | bilingual in ; a bilingual school | grow up bilingual ; a bilingual school | |
| 09 | look up | look up a word ; look it up | look up a word ; look up information | cụm 2 không chứa nguyên "look up" |
| 09 | translate | translate into ; translate from English | translate something into English ; translate from English | |
| 09 | consist | consist of | consist of three parts | |
| 09 | model | a model of ; a simple model | a simple model ; the three-circle model | |
| 09 | dictionary | look up in a dictionary ; online dictionary | use an English dictionary ; online dictionary | cụm cũ không tự nhiên (thiếu tân ngữ của look up) |
| 10 | threat | a threat to ; a serious threat | a threat to wildlife ; a serious threat | |
| 10 | essential | essential for ; an essential part | essential for life on Earth ; an essential part | |
| 10 | vital | vital for ; play a vital role | play a vital role ; vital for survival | |
| 10 | grassland | wide grassland | vast grasslands | tự nhiên hơn |
| 10 | Solar System | in the Solar System | eight planets in the Solar System | |
| 10 | water body | large water body | the largest water body on Earth | "a large body of water" không chứa từ gốc "water body" nên giữ từ gốc |
| 12 | knowledgeable | knowledgeable about | knowledgeable about computers | |
| 12 | bartender | skilful bartender | work as a bartender | giữ từ SGK; bỏ "skilful" vì lặp với skilful worker / skilful tailor |
| 12 | earn a living | earn a living by | earn a living by doing something | |

Không đổi (đã sửa trước hoặc hợp lệ): unit 01 "remind somebody of something", unit 02 "stuck in a traffic jam", unit 09 "What does something mean?", unit 06 "replace A with B".

## Kiểm tra

- `GRADE=9 npx vitest run tests/use-word-fixtures.test.ts`: bộ câu lớp 9 đạt hết; phép kiểm tra phủ nội dung không còn dòng nào của grade-9 (các dòng thiếu còn lại thuộc khối khác đang sửa song song).
- `npm run module:check`: 12/12 unit lớp 9 ĐẠT.
