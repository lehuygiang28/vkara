# Lệnh URL

Query **không bắt buộc** để người và agent join/thao tác mà không cần thêm UI. Thiếu key = không làm gì. Sau khi apply, key đã dùng bị xóa (`history.replace`). Phiên tiếp tục trong localStorage. Agent bắt đầu từ `/llms.txt` (route động; domain/host theo deploy đang chạy).

**Bảo mật:** `password` và `joinToken` là bí mật (history, ảnh chụp, Referer). Agent nên mint `joinToken`. Act đổi phòng (`queue` / `play` / `next`) cần `roomId` khớp phòng đang mở và token `once`. `/tv` không đổi layout từ query. `deviceId` và lệnh phá hủy (đóng phòng, xóa queue…) bị bỏ qua.

## Thứ tự apply

`name` → stash secret → join → `provider` → `karaoke` → `q` → `tab` → `layoutMode` → đợi session → `queue` / `play` / `next` → dọn URL.

Trên `/tv` hoặc `/en/tv`: vẫn join và đặt `name`; bỏ qua `layoutMode`, `q`, `tab`. Không cướp focus, không toast thành công.

## Catalog

Giống bản [English](../agents/url-commands.md): `roomId`, `password`, `joinToken`, `layoutMode`, `q`, `karaoke`, `provider`, `name`, `tab`, `agent`, `queue` / `play` / `next`, `once`, `exp`. `launch` của TV shell được giữ.

QR người dùng vẫn chỉ `roomId` + `password` tùy chọn.

## Ví dụ

```text
https://vkara.example/?roomId=4821
https://vkara.example/en?roomId=4821&password=<mat-khau>&name=Claude
https://vkara.example/?roomId=4821&q=tinh+yeu+xanh&karaoke=1
https://vkara.example/?roomId=4821&queue=xxxxxxxxxxx&once=a1b2c3d4&name=Claude
https://vkara.example/tv?roomId=4821
```

Kết nối MCP: [../agents/mcp.md](../agents/mcp.md).
