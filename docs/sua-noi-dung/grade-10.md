# Sửa nội dung lớp 10

Phạm vi: `content/modules/grade-10/unit-*.json` và `tests/fixtures/use-word/grade-10.json`.
Mỗi cụm đứng đầu (`collocations[0]`, dùng ở bước "Từ vựng thành câu") đã đổi đều có 3 câu thử mới trong bộ câu thử.

## Nghĩa tiếng Việt

| Unit | Từ | Trước | Sau | Ghi chú |
|---|---|---|---|---|
| 04 | donation | đồ mang cho, đồ hiến tặng | sự quyên góp; đồ quyên góp | khác SGK (cụm "make a donation" là sự quyên góp) |
| 06 | officer | sĩ quan | sĩ quan; nhân viên (cảnh sát, …) | khác SGK ("police officer" là cảnh sát, không phải sĩ quan) |
| 07 | quality | có chất lượng | chất lượng | khác SGK (từ chính là danh từ, như "high quality") |
| 07 | harm | hiểm hoạ, sự nguy hiểm | sự tổn hại, điều có hại | khác SGK |
| 08 | install | lắp đặt | cài đặt (ứng dụng, phần mềm) | khác SGK (cụm là "install an app/software") |
| 08 | resource | nguồn lực | tài nguyên, nguồn tài liệu | khác SGK ("learning resources" là tài liệu học) |
| 09 | endangered | bị nguy hiểm | có nguy cơ tuyệt chủng | khác SGK |

## Cụm trùng

Giữ cụm ở từ xuất hiện trước, từ sau được cụm riêng có chính từ của nó.

| Unit | Từ | Trước | Sau | Ghi chú |
|---|---|---|---|---|
| 01 | household | household chores, household tasks | household tasks, household items | trùng với chore |
| 01 | success | achieve success, success in your studies | success in your studies, great success | trùng với achieve |
| 02 | electrical | (cụm 2) electrical appliances | electrical equipment | trùng với appliance |
| 02 | calculate | (cụm 2) calculate your carbon footprint | calculate the distance | trùng với carbon footprint |
| 02 | harmful | harmful chemicals, harmful to the environment | harmful to the environment, harmful gases | trùng với chemical |
| 02 | environmental | environmental issues, environmental problems | environmental problems, environmental protection | trùng với issue |
| 03 | live | (cụm 2) perform live | a live show | trùng với perform |
| 04 | development | community development | personal development | trùng với community (cụm 2) |
| 05 | software | install software | download software | trùng với install (cụm 2) |
| 05 | educational | educational apps, educational games | educational games, educational videos | trùng với app |
| 06 | gender | gender equality, gender roles | gender roles, gender differences | trùng với equality |
| 06 | strength | physical strength, mental strength | build up your strength, a test of strength | trùng với physical và mental |
| 09 | panda | giant panda | protect pandas, a baby panda | trùng với giant |
| 09 | giant | (cụm 2) giant tortoise | giant waves | trùng với tortoise; giữ "giant tortoise" cho tortoise vì đó là cụm dùng để nói |
| 09 | habitat | (cụm 2) destroy habitats | habitat loss | trùng với destroy |

## Cụm quá chung chung, sai chính tả hoặc không tự nhiên

| Unit | Từ | Trước | Sau | Ghi chú |
|---|---|---|---|---|
| 01 | benefit | the benefits of, get a benefit from | the benefits of housework, health benefits | cụm 2 không tự nhiên |
| 01 | truthful | be truthful with | be truthful with your parents | |
| 03 | vote | vote for | vote for your favourite singer | |
| 03 | stage | on stage | sing on stage | |
| 04 | volunteer | volunteer at | volunteer at a community centre | |
| 04 | generous | very generous | be generous to somebody | |
| 04 | participate | participate in | participate in volunteer activities | |
| 04 | opportunity | an opportunity to | an opportunity to help others | |
| 05 | communicate | communicate with | communicate with friends | |
| 05 | suitable | suitable for | suitable for children | |
| 05 | apply | apply something to, apply new technology | apply new technology, apply something to | đổi thứ tự |
| 05 | convenient | convenient for | convenient for students | |
| 06 | traditionally | traditionally done by | a job traditionally done by men | |
| 07 | essential | essential for | essential for economic growth | |
| 07 | invest | invest in something | invest in education | |
| 08 | focus | focus on, focus on your studies | focus on your studies, focus on the lesson | |
| 08 | communicate | communicate with | communicate with classmates | |
| 09 | solution | a solution to | a solution to the problem | |
| 10 | aware | be aware of | be aware of local customs | |
| 10 | crowd | crowd into | crowd into famous places | |
| 10 | responsible | be responsible for | be responsible for the environment | |
| 10 | waste | waste water | waste water at home | "waste water" dễ hiểu nhầm là "nước thải" |
| 10 | fieldtrip → field trip | go on a fieldtrip, an eco-friendly fieldtrip | go on a field trip, an eco-friendly field trip | sửa chính tả cả từ chính, phiên âm, câu ví dụ và câu hỏi nói của unit 10; khác SGK (từ chính lấy từ bảng từ SGK viết liền "fieldtrip") |

## Chưa sửa (cần quyết định)

- 05 laboratory: giữ "science laboratory". Từ chính là "laboratory" nên cụm phải chứa đúng chữ này. Học sinh nói "science lab" sẽ chưa được tính đúng; muốn nhận "lab" phải sửa bộ chấm (`src/`), ngoài phạm vi lần này.
- 05 AI (artificial intelligence): cụm "use AI", "AI apps" không chứa nguyên chữ từ chính nên từ này không vào câu đố "Complete the phrase". Bước nói vẫn chạy.
- Một số cụm không chứa đúng chữ từ chính vì dùng số nhiều hoặc tách cụm động từ (grocery: "shop for groceries"; cheer up: "cheer somebody up"; developing country, disability). Bước nói vẫn chạy; câu đố dùng cụm khác hoặc bỏ qua từ đó.
