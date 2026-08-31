# Hướng dẫn sử dụng OpenTelemetry & Jaeger v2 SPM (Local Tracing & Performance Monitoring)

Tài liệu này hướng dẫn bạn cách khởi chạy hệ thống giám sát phân tán (Distributed Tracing) & theo dõi hiệu năng ứng dụng (Service Performance Monitoring - SPM) cho backend `ssl-be` chạy trực tiếp trên máy tính của bạn thông qua Docker Compose.

---

## 1. Yêu cầu hệ thống
- Máy tính đã cài đặt **Docker** hoặc **Docker Desktop**.

---

## 2. Khởi chạy Jaeger v2 & Prometheus (Traces + SPM)

Hệ thống bao gồm **Jaeger v2** (thu thập Traces + tự động tạo RED metrics bằng `spanmetrics` connector) và **Prometheus** (lưu trữ RED metrics).

Bạn có thể dùng script kiểm tra và tự động khởi chạy:

```bash
bash daniel_workspace/local_tracing/scripts/check_jaeger.sh
```

Hoặc tự khởi chạy bằng Docker Compose:

```bash
cd daniel_workspace/local_tracing
docker compose up -d
```

**Ý nghĩa các cổng (ports):**
- `4318`: Cổng OTLP HTTP để backend `ssl-be` gửi traces về.
- `16686`: Giao diện web Jaeger UI (Search Traces & SPM Monitor Tab).
- `9090`: Giao diện Prometheus (lưu trữ RED metrics).
- `8889`: Endpoint Prometheus Metrics do Jaeger v2 export ra.

---

## 3. Khởi động Backend với Local Tracing

Thay vì chạy bằng lệnh `pnpm start:dev` như bình thường, bạn hãy dùng lệnh sau (chạy bên trong thư mục `ssl-be`):

```bash
cd ssl-be
NODE_OPTIONS="--import ../daniel_workspace/local_tracing/instrumentation.mjs" pnpm start:dev
```

Lúc này, trên Terminal của backend bạn sẽ thấy dòng chữ:
`🚀 [Local Tracing] OpenTelemetry Instrumentation Started (Exporting to OTLP)`

---

## 4. Xem dữ liệu Tracing & SPM

### A. Tìm kiếm & Tracing chi tiết (Search Traces)
1. Mở trình duyệt và truy cập: [http://localhost:16686](http://localhost:16686)
2. Ở cột bên trái, phần **Service**, chọn `ssl-be-local`.
3. Bấm nút **Find Traces**.
4. Bấm vào một Trace bất kỳ để xem biểu đồ thác nước (Waterfall), chi tiết từng request HTTP, Mongoose query, Redis command.

### B. Theo dõi Hiệu năng Service (Monitor Tab / SPM)
1. Mở tab **Monitor** ở thanh menu trên cùng của Jaeger UI.
2. Chọn Service `ssl-be-local`.
3. Bạn sẽ thấy biểu đồ trực quan RED metrics:
   - **Request Rate (QPS)**: Tần suất gửi request tới backend.
   - **Error Rate (%)**: Tỷ lệ request gặp lỗi.
   - **Latency (P50, P75, P95)**: Thời gian phản hồi phân phối theo percentiles.

---

## 5. Script hỗ trợ truy vấn nhanh

Sử dụng script `query_traces.sh` để kiểm tra sức khỏe hệ thống tracing ngay từ terminal:

```bash
# Xem tổng quan sức khỏe tracing
bash daniel_workspace/local_tracing/scripts/query_traces.sh --summary

# Tìm các trace bị lỗi
bash daniel_workspace/local_tracing/scripts/query_traces.sh --errors

# Tìm các trace chậm (>500ms)
bash daniel_workspace/local_tracing/scripts/query_traces.sh --slow 500
```

---

## 6. Dọn dẹp

Nếu bạn muốn tắt các service tracing:

```bash
cd daniel_workspace/local_tracing
docker compose down
```
*(Lưu ý: Backend vẫn chạy bình thường kể cả khi tắt Jaeger).*
