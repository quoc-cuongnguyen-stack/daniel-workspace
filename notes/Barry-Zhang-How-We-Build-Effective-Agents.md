# How We Build Effective Agents — Barry Zhang (Anthropic)

## Thông tin nguồn

| Mục | Chi tiết |
| --- | --- |
| Diễn giả | Barry Zhang, Applied AI, Anthropic |
| Sự kiện | AI Engineer Summit |
| Thời lượng clip trên X | 14:46 |
| Clip trên X | https://x.com/xiathis/status/2079782236778332638 |
| Bài nói gốc (YouTube) | https://www.youtube.com/watch?v=D7_ipDqhtwk |
| Blog nền | https://www.anthropic.com/engineering/building-effective-agents |

**Ghi chú về Goldfish:** Goldfish ghi lại giao diện trình duyệt (tiêu đề tweet, nút play, mốc phút player), **không** ghi lời thoại audio và **không** lưu khung hình slide. Phần mô tả nội dung 14 phút được đối chiếu với phụ đề bài gốc trên YouTube. Ảnh slide trong tài liệu này được trích khung từ YouTube tại các mốc thời gian tương ứng.

## Timeline xem (Goldfish — 21/09/2026)

| Giờ máy | Mốc player | URL / ngữ cảnh |
| --- | --- | --- |
| 15:28 | 0:53 / 14:46 | X — repost @sergiorocaa |
| 15:32 | 1:32 / 14:46 | X — @sergiorocaa |
| 15:33 | 0:04 / 14:46 | X — @xiathis (bắt đầu xem) |
| 15:33 | 0:34 / 14:46 | X — @xiathis |
| 16:03 | 3:39 / 14:46 | X — @xiathis |
| 16:11 | 3:39 / 14:46 | X — @xiathis (audio playing) |
| 16:43 | 4:16 / 14:46 | X — @xiathis |
| 17:06 | 2:39 / 14:46 | X — @xiathis (tua lại) |
| 17:09 | 14:30 / 14:46 | X — @xiathis (gần hết) |
| 17:22 | 14:30 / 14:46 | X — @xiathis |

---

## 0:00–1:00 — Ba nguyên tắc cốt lõi

![Ba nguyên tắc](assets/barry-zhang-agents/01-three-ideas.png)

Barry Zhang mở đầu bài nói tại AI Engineer Summit. Khoảng hai tháng trước, anh và Erik viết blog *Building Effective Agents*, chia sẻ quan điểm rõ ràng về agent là gì và không phải là gì, cùng các bài học thực tế.

Hôm nay Barry đi sâu vào **ba ý tưởng cốt lõi** từ blog, và kết thúc bằng vài suy nghĩ cá nhân:

1. **Đừng xây agent cho mọi thứ**
2. **Giữ cho nó đơn giản**
3. **Hãy nghĩ như chính các agent của bạn**

---

## 1:00–2:30 — Từ LLM đơn giản đến workflow và agent

Hầu hết mọi người bắt đầu với các tính năng rất đơn giản: **tóm tắt, phân loại, trích xuất** — những thứ hai đến ba năm trước còn cảm giác như phép thuật, giờ đã trở thành tiêu chuẩn.

Khi sản phẩm chín muồi, một lần gọi mô hình thường không đủ. Người ta bắt đầu **điều phối nhiều lần gọi mô hình** trong luồng kiểm soát được định sẵn — đánh đổi **chi phí và độ trễ** để đổi lấy hiệu năng tốt hơn. Đây là **workflow** — khởi đầu của hệ thống có tính agent.

Giờ các mô hình mạnh hơn, nhiều **agent chuyên theo lĩnh vực** xuất hiện trong production. Khác workflow, **agent tự quyết định quỹ đạo** và vận hành gần như độc lập theo phản hồi môi trường.

Xu hướng lớn: càng trao **quyền tự chủ**, hệ thống càng hữu ích và mạnh — nhưng **chi phí, độ trễ, hậu quả sai sót** cũng tăng. Điều đó dẫn tới nguyên tắc đầu tiên: **đừng xây agent cho mọi thứ**.

---

## 2:30–5:30 — Khi nào nên xây agent? (Checklist)

![Checklist](assets/barry-zhang-agents/02-checklist.png)

Agent là cách **mở rộng quy mô các tác vụ phức tạp và có giá trị**, không phải bản nâng cấp gắn vào mọi use case. Anthropic rất ưa **workflow** vì chúng mang lại giá trị cụ thể ngay hôm nay.

**Checklist khi cân nhắc xây agent:**

1. **Độ phức tạp:** Agent phát huy ở không gian bài toán **mơ hồ**. Nếu vẽ được **toàn bộ cây quyết định** dễ dàng → xây tường minh, tối ưu từng nút. Rẻ hơn, kiểm soát tốt hơn.

2. **Giá trị tác vụ:** Khám phá tốn **nhiều token** → tác vụ phải đủ đáng. Ví dụ ngân sách **~10 cent/task** (~30.000–50.000 token) cho hệ support khối lượng lớn → dùng **workflow** cho kịch bản phổ biến. Ngược lại, nếu “không quan tâm bao nhiêu token, chỉ cần xong việc” → use case cao giá trị.

3. **Gỡ nút thắt năng lực:** Với coding agent, cần viết code tốt, debug, phục hồi lỗi. Nút thắt nhân chi phí và latency → **thu hẹp phạm vi**, đơn giản hóa, thử lại.

4. **Chi phí sai sót:** Sai lầm **cao stake** và **khó phát hiện** → khó tin agent hành động thay bạn. Giảm thiểu: read-only, human-in-the-loop — nhưng hạn chế khả năng scale.

**Ví dụ: coding agent**

- Design doc → PR: **mơ hồ, phức tạp**
- Code có **giá trị cao**
- Claude đã **mạnh ở nhiều bước** coding workflow
- Output **dễ verify** qua unit test và CI → lý do nhiều coding agent thành công

---

## 5:30–8:00 — Giữ đơn giản: environment + tools + system prompt

![Agent loop](assets/barry-zhang-agents/03-agent-loop.png)

Nguyên tắc thứ hai: **giữ càng đơn giản càng tốt**.

Agent = **model dùng tools trong vòng lặp**. Ba thành phần:

| Thành phần | Vai trò |
| --- | --- |
| **Environment** | Hệ thống agent vận hành |
| **Tools** | Giao diện hành động và nhận phản hồi |
| **System prompt** | Mục tiêu, ràng buộc, hành vi mong muốn |

Model được gọi trong vòng lặp — đó là agent.

**Bài học:** phức tạp hóa sớm **giết tốc độ lặp**. Chỉnh ba thành phần cơ bản cho **ROI cao nhất**; tối ưu sau.

Ba use case khác nhau trên bề mặt sản phẩm nhưng **cùng backbone/code**. Hai quyết định thiết kế chính: **bộ tools** và **prompt**.

**Tối ưu sau khi hành vi ổn:**

- Coding/computer use: **cache trajectory** giảm chi phí
- Search: **parallel tool calls** giảm latency
- Mọi use case: **hiển thị tiến độ** để tăng niềm tin người dùng

Barry cũng nhắc workshop MCP của Mahesh tại sự kiện.

---

## 8:00–11:20 — Nghĩ như agent (context 10–20k token)

![Think like agent](assets/barry-zhang-agents/04-think-like-agent.png)

Nguyên tắc thứ ba: **đặt mình vào context window của agent**.

Nhiều builder phát triển từ góc nhìn con người, rồi bối rối khi agent sai. Mỗi bước model chỉ **suy luận trên tập context hạn chế** — mọi thứ agent biết về thế giới nằm trong **~10.000–20.000 token**. Hãy tự hỏi: context đó có **đủ và mạch lạc** không?

**Bài tập computer-use agent:**

- Chỉ nhận **screenshot tĩnh** + mô tả kém
- Chỉ **tools** tác động môi trường
- Click xong → **nhắm mắt 3–5 giây** (inference + tool execution) → mở mắt thấy screenshot mới
- Không biết click thành công hay tắt máy — **lethal phase**

**Context cần cung cấp:** độ phân giải màn hình, hành động gợi ý, giới hạn khám phá.

**Dùng Claude để hiểu Claude:** ném system prompt, tool description, toàn bộ trajectory vào Claude và hỏi instruction có mơ hồ không, agent hiểu tool không, vì sao quyết định sai. Không thay thế hiểu biết của bạn, nhưng giúp gần góc nhìn agent hơn.

---

## 11:20–13:40 — Suy nghĩ cá nhân: ba câu hỏi mở

![Future](assets/barry-zhang-agents/05-future.png)

Barry chia sẻ ba hướng luôn nghĩ tới:

1. **Budget-aware agents:** Workflow kiểm soát chi phí/latency tốt; agent thì chưa. Cần cách **định nghĩa và enforce budget** theo thời gian, tiền, token.

2. **Self-evolving tools:** Model đã giúp lặp tool description; có thể mở rộng thành **meta tool** để agent tự thiết kế/cải thiện ergonomics tool → đa năng hơn.

3. **Multi-agent:** Barry tin sẽ thấy nhiều **cộng tác multi-agent trong production** cuối năm — song song hóa tốt, tách concern, sub-agent bảo vệ context window chính. Câu hỏi mở: agent **giao tiếp với nhau** thế nào? Hiện chủ yếu **user–assistant đồng bộ**; cần **giao tiếp bất đồng bộ** và nhiều vai trò.

---

## 13:40–14:46 — Ba takeaway và kết

![Takeaways](assets/barry-zhang-agents/06-takeaways.png)

**Nếu quên hết, nhớ ba điều:**

1. **Đừng xây agent cho mọi thứ**
2. Nếu có use case tốt → **giữ đơn giản càng lâu càng tốt**
3. Khi lặp → **nghĩ như agent**, lấy góc nhìn của chúng, giúp chúng làm việc

Barry kể: năm 2023 tại Meta, sau blog của Swix, anh tự đặt job description **“AI engineer”** đầu tiên — tập trung thực dụng, làm AI thực sự hữu ích. Hy vọng khán giả tận hưởng phần còn lại AI Engineer Summit — *let's keep building*.
