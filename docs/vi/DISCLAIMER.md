# Tuyên bố từ chối trách nhiệm và thông báo về quyền tác giả

**Phiên bản:** 1.0
**Ngày cập nhật:** tháng 6 năm 2026
**Đơn vị phát hành:** Dự án vkara (mã nguồn mở)
**Thư điện tử tiếp nhận khiếu nại, yêu cầu gỡ bỏ và hỗ trợ:** [lehuygiang28@gmail.com](mailto:lehuygiang28@gmail.com)

---

## 1. Mục đích

Tài liệu này mô tả phạm vi chức năng của phần mềm vkara, cách Dự án cung cấp Phần mềm, phân định trách nhiệm giữa các bên liên quan, và quy trình tiếp nhận khiếu nại về quyền tác giả, quyền liên quan cũng như điều khoản dịch vụ của bên thứ ba.

Dự án vkara là phần mềm mã nguồn mở dùng trên toàn cầu. Người sử dụng và người triển khai cần tuân thủ pháp luật tại quốc gia hoặc khu vực nơi họ sử dụng hoặc vận hành Phần mềm.

## 2. Không phải tư vấn pháp lý

Nội dung dưới đây chỉ nhằm mục đích thông báo. Tài liệu này không thay thế ý kiến tư vấn pháp lý. Người sử dụng, người triển khai và người vận hành cần tự xác định nghĩa vụ pháp lý tại nơi mình cư trú hoặc vận hành dịch vụ, và tham vấn luật sư khi cần.

## 3. Giải thích thuật ngữ

1. **Dự án vkara** hoặc **Phần mềm**: chương trình máy tính mã nguồn mở phát hành theo giấy phép [MIT](../../LICENSE).
2. **Người sử dụng cuối**: cá nhân hoặc tổ chức dùng Phần mềm qua giao diện ứng dụng.
3. **Người triển khai** hoặc **Người vận hành**: cá nhân hoặc tổ chức tự cài đặt, vận hành hoặc cung cấp Phần mềm cho bên thứ ba.
4. **Chủ thể quyền**: tác giả, chủ sở hữu quyền tác giả, chủ sở hữu quyền liên quan hoặc đại diện hợp pháp.
5. **Nội dung bên thứ ba**: video, âm thanh, hình ảnh, playlist và dữ liệu liên quan do YouTube hoặc người dùng YouTube cung cấp. Dự án vkara không sở hữu các nội dung này.
6. **Sử dụng thương mại**: mọi hình thức khai thác Phần mềm hoặc nội dung phát qua Phần mềm nhằm mục đích kinh doanh, thu lợi, thu phí công chúng, quảng bá thương mại, hoặc thay thế dịch vụ karaoke/cấp phép âm nhạc đã trả quyền.

---

## 4. Phạm vi chức năng của Phần mềm

Phần mềm vkara cho phép nhiều người cùng tìm metadata video trên YouTube, quản lý danh sách phát tạm thời và phát nội dung qua **YouTube IFrame Player** (trình nhúng do YouTube cung cấp) trên trình duyệt.

Phần mềm được thiết kế cho **karaoke cá nhân, phi thương mại** trong phạm vi cho phép của trình phát nhúng YouTube. Dự án **không** thương mại hóa nội dung âm nhạc hay video và **không** cung cấp dịch vụ cấp phép bản quyền.

Phần mềm không:

1. Lưu trữ, tải xuống, trích xuất, chuyển mã hoặc phân phối file âm thanh, video từ YouTube trên máy chủ của người vận hành;
2. Phát lại độc lập ngoài YouTube embedded player (mọi phát video đều diễn ra trong iframe do YouTube kiểm soát);
3. Bán, cho thuê, cấp phép, chuyển nhượng hoặc phân phối thương mại nội dung âm nhạc, video;
4. Tuyên bố quyền sở hữu đối với tác phẩm, cuộc biểu diễn, bản ghi âm, ghi hình hoặc chương trình phát sóng của bên thứ ba;
5. Đại diện, liên kết với, được bảo trợ bởi hoặc thuộc sở hữu của YouTube, Google LLC, TikTok hay nền tảng phát trực tuyến nào khác.

Phần mềm có thể:

1. Truy vấn metadata video và/hoặc cung cấp gợi ý tìm kiếm;
2. Phát video bằng YouTube IFrame Player theo cơ chế nhúng do YouTube cung cấp;
3. Loại trừ video không cho phép nhúng (embed disabled) khỏi luồng phát;
4. Hiển thị playlist gợi ý do người vận hành cấu hình, dưới dạng liên kết hoặc mã định danh playlist trên YouTube, không phải bản sao nội dung lưu trữ cục bộ.

**Lưu ý về tìm kiếm và metadata:** Một số thành phần tìm kiếm/metadata có thể phụ thuộc vào thư viện bên thứ ba (ví dụ `youtubei`) và có thể không tương đương với YouTube Data API chính thức. Người triển khai cần tự đánh giá và chịu trách nhiệm về mức độ tuân thủ điều khoản nền tảng khi sử dụng các thành phần đó.

---

## 5. Điều khoản YouTube và mục đích sử dụng dự kiến

Theo [Điều khoản dịch vụ của YouTube](https://www.youtube.com/t/terms), trong phạm vi các điều khoản đó, người dùng có thể xem và nghe nội dung cho **mục đích cá nhân, phi thương mại** và có thể **hiển thị video qua YouTube embedded player** theo cơ chế do YouTube cung cấp. Người tải nội dung lên cấp quyền cho người dùng khác dùng nội dung qua Dịch vụ (ví dụ phát/nhúng), nhưng không cấp quyền dùng độc lập ngoài Dịch vụ.

Cùng điều khoản đó cấm chiếu công cộng hoặc phát sóng công cộng ngoài phạm vi cá nhân, phi thương mại, và cấm sử dụng Dịch vụ hoặc Nội dung theo cách không được YouTube hoặc chủ thể quyền cho phép.

Dự án vkara **được thiết kế theo hướng** sử dụng YouTube embedded player cho mục đích cá nhân, phi thương mại: phát qua iframe, không tách luồng media khỏi YouTube, không bán hoặc cấp phép lại nội dung. Tài liệu này không khẳng định mọi cách triển khai hoặc mọi thành phần phụ thuộc đều tuân thủ điều khoản YouTube. Mọi hình thức **sử dụng thương mại** (quán karaoke kinh doanh, sự kiện thu phí, livestream kiếm lợi, v.v.) nằm ngoài phạm vi dự kiến của Dự án và thuộc trách nhiệm của người sử dụng hoặc người vận hành.

### 5.1. Tuân thủ YouTube Player/API

Người sử dụng, người triển khai và người vận hành không được dùng Phần mềm hoặc bản sửa đổi của Phần mềm để:

1. Tải xuống, proxy, cache, lưu trữ, tách âm thanh/video hoặc phát ngoại tuyến nội dung YouTube;
2. Vượt qua giới hạn nhúng, giới hạn địa lý, giới hạn độ tuổi hoặc biện pháp kỹ thuật của YouTube;
3. Che, sửa đổi, vô hiệu hóa hoặc can thiệp vào YouTube player, logo, controls, attribution hoặc quảng cáo;
4. Scrape YouTube, sử dụng API không được tài liệu hóa hoặc phương thức truy cập không được YouTube cho phép;
5. Thu phí người dùng để xem nội dung YouTube trong embedded player hoặc bán quảng cáo/tài trợ dựa chủ yếu trên nội dung YouTube nếu không được cho phép.

Trình nhúng YouTube phải hiển thị đủ kích thước tối thiểu theo chính sách của YouTube (ví dụ 200×200 pixel). Nếu bật autoplay, player phải hiển thị trên màn hình. Ứng dụng WebView hoặc desktop app tích hợp player cần cung cấp danh tính client qua HTTP Referer hoặc cơ chế tương đương theo yêu cầu của YouTube.

---

## 6. Quyền tác giả và tuân thủ pháp luật

Quyền tác giả và quyền liên quan đối với tác phẩm âm nhạc, video thuộc về tác giả, người biểu diễn, nhà sản xuất bản ghi và các chủ thể quyền được pháp luật bảo hộ. Việc trình diễn, phát sóng, truyền đạt hoặc khai thác công cộng tác phẩm (kể cả qua YouTube) tại cơ sở kinh doanh, sự kiện thu phí hoặc livestream có mục đích thu lợi thường cần **sự cho phép và/hoặc nghĩa vụ trả tiền bản quyền** theo pháp luật tại nơi diễn ra hoạt động. Quy định cụ thể khác nhau giữa các quốc gia.

Một số nội dung karaoke hoặc video âm nhạc trên YouTube có thể do người dùng tải lên, biên tập lại hoặc phát hành lại mà Dự án vkara **không có khả năng xác minh** tình trạng pháp lý của từng nội dung. Người sử dụng cuối và người vận hành tự chịu trách nhiệm về việc chọn và sử dụng nội dung.

Các nền tảng phát trực tuyến, dịch vụ âm nhạc trả phí và hệ thống karaoke thương mại hoạt động trên cơ sở thỏa thuận cấp phép và trả quyền tác giả. Dự án vkara không ký thỏa thuận cấp phép âm nhạc và không thay thế các dịch vụ đó.

---

## 7. Trách nhiệm pháp lý

### 7.1. Người sử dụng cuối

1. Dùng Phần mềm cho mục đích cá nhân, phi thương mại, trừ khi đã có sự cho phép, giấy phép hoặc căn cứ pháp lý hợp lệ theo pháp luật áp dụng;
2. Tuân thủ pháp luật về quyền tác giả, quyền liên quan tại nơi sử dụng và Điều khoản dịch vụ của YouTube;
3. Không dùng Phần mềm cho sử dụng thương mại nếu chưa có cơ sở pháp lý phù hợp.

### 7.2. Người triển khai và vận hành

Người triển khai và vận hành chịu trách nhiệm đối với cách thức cung cấp, cấu hình, quảng bá và khai thác phiên bản Phần mềm do mình vận hành, trong phạm vi pháp luật áp dụng và trong phạm vi các thành phần mà họ kiểm soát.

Khi triển khai công khai, người vận hành nên thiết lập chính sách sử dụng chấp nhận được, đầu mối tiếp nhận khiếu nại và quy trình xử lý, gỡ bỏ hoặc chặn truy cập đối với nội dung, playlist hoặc cấu hình do mình kiểm soát khi nhận được thông báo hợp lệ.

Người triển khai có thể thay đổi hoặc loại bỏ playlist gợi ý trong `packages/curated-playlists/` khi cần.

### 7.3. Tác giả và người duy trì mã nguồn

Tác giả và người duy trì Dự án vkara:

1. Phát hành Phần mềm theo nguyên trạng (*as-is*) theo giấy phép MIT;
2. Không thương mại hóa nội dung âm nhạc hay video, không bán quyền sử dụng nội dung bên thứ ba;
3. Không bảo đảm mọi nội dung trên YouTube đều hợp pháp cho mọi hình thức sử dụng;
4. Tiếp nhận khiếu nại của chủ thể quyền qua thư điện tử ở đầu tài liệu và xử lý trong thời hạn hợp lý đối với phần do Dự án kiểm soát (danh mục playlist gợi ý, tài liệu, phiên bản demo công khai nếu có).

### 7.4. Từ chối trách nhiệm đối với sử dụng thương mại của bên thứ ba

Dự án vkara **từ chối trách nhiệm** đối với việc bên thứ ba (người sử dụng cuối, người triển khai, khách hàng của họ hoặc bất kỳ tổ chức, cá nhân nào khác) sử dụng Phần mềm để:

1. Thương mại hóa, thu lợi hoặc cung cấp dịch vụ karaoke/cấp phát nội dung có trả phí;
2. Phát công cộng tại cơ sở kinh doanh, sự kiện thu phí hoặc livestream kiếm lợi khi chưa có cơ sở pháp lý phù hợp;
3. Vi phạm điều khoản YouTube, quyền tác giả hoặc quyền liên quan tại quốc gia nơi họ hoạt động.

Việc cung cấp mã nguồn mở **không** đồng nghĩa Dự án ủy quyền, khuyến khích hoặc chịu trách nhiệm cho các hình thức sử dụng thương mại do bên thứ ba tự quyết định.

### 7.5. Pháp luật áp dụng

Trách nhiệm pháp lý về bản quyền, dịch vụ trung gian và nền tảng số **khác nhau theo từng quốc gia**. Người triển khai và người vận hành cần tự tìm hiểu quy định tại nơi họ cung cấp dịch vụ, gồm (nếu có) nghĩa vụ tiếp nhận khiếu nại, gỡ bỏ nội dung và cơ chế miễn trừ trách nhiệm đối với dịch vụ trung gian.

Giấy phép MIT chỉ giới hạn trách nhiệm về lỗi kỹ thuật và bảo hành phần mềm. Giấy phép này không miễn trừ trách nhiệm phát sinh từ vi phạm pháp luật về quyền sở hữu trí tuệ hoặc từ sử dụng thương mại trái phép do bên thứ ba thực hiện.

Tuyên bố từ chối trách nhiệm không loại bỏ nghĩa vụ pháp lý bắt buộc theo pháp luật áp dụng, gồm trường hợp Dự án hoặc người vận hành nhận thông báo hợp lệ từ chủ thể quyền mà không xử lý các thành phần do mình kiểm soát.

---

## 8. Tiếp nhận khiếu nại và yêu cầu gỡ bỏ

Chủ thể quyền, đại diện hợp pháp hoặc bên được ủy quyền của YouTube/Google có thể gửi khiếu nại khi cho rằng Dự án vkara xâm phạm quyền sở hữu trí tuệ hoặc quyền lợi hợp pháp của mình.

**Thư điện tử:** [lehuygiang28@gmail.com](mailto:lehuygiang28@gmail.com)

Khiếu nại cần có:

1. Họ tên, địa chỉ liên hệ và thông tin xác thực của người gửi;
2. URL video hoặc playlist bị cho là vi phạm, hoặc mô tả nội dung trong danh mục gợi ý do Dự án duy trì;
3. Tài liệu chứng minh quyền sở hữu hoặc văn bản ủy quyền hợp lệ;
4. Tuyên bố thiện chí (*good faith*) rằng việc sử dụng chưa được cấp phép hoặc ủy quyền.

Sau khi xem xét, Dự án có thể gỡ mục tương ứng khỏi danh mục playlist gợi ý, cập nhật tài liệu hoặc phiên bản demo công khai, và hướng dẫn người triển khai tự host thực hiện biện pháp tương ứng.

Phần mềm không lưu trữ file video trên máy chủ. Việc gỡ nội dung trên YouTube do YouTube và người tải lên quyết định.

---

## 9. Giấy phép MIT

Phần mềm được cung cấp theo nguyên trạng (*AS IS*), không kèm bảo đảm. Chi tiết tại [LICENSE](../../LICENSE).

Giấy phép MIT không cấp quyền vi phạm bản quyền của bên thứ ba, không bảo đảm mọi cách triển khai tuân thủ điều khoản YouTube, và không miễn trách nhiệm khi người sử dụng hoặc bên thứ ba cố ý vi phạm pháp luật hoặc sử dụng thương mại trái phép.

---

## 10. Khuyến nghị

1. Karaoke gia đình, sinh hoạt cá nhân không thu lợi: tuân thủ Điều khoản YouTube và pháp luật tại nơi sử dụng.
2. Cơ sở kinh doanh, sự kiện thu phí hoặc livestream có mục đích thu lợi: tự thu xếp sự cho phép, giấy phép và/hoặc trả tiền bản quyền theo pháp luật áp dụng, hoặc dùng dịch vụ đã được cấp phép. Phần mềm vkara không thay thế các dịch vụ đó.
3. Triển khai tự host: rà soát thư viện tìm kiếm/metadata bên thứ ba và danh mục playlist gợi ý; tắt hoặc thay thế khi cần.
4. Truyền thông: không quảng bá Phần mềm cho mục đích thương mại trái phép.

---

## Tài liệu liên quan

- [README tiếng Việt](README.md)
- [README English](../../README.md)
- [Disclaimer (English)](../DISCLAIMER.md)
