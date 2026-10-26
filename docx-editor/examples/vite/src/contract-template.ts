import {createEmptyDocument} from '../../../packages/core/src/utils/createDocument';

const SPECS={
 dichvu:[
  ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',true,true],['Độc lập - Tự do - Hạnh phúc',false,true],['',false,false],
  ['HỢP ĐỒNG CUNG CẤP DỊCH VỤ',true,true],['Số: 024/2026/HĐDV',false,true],['',false,false],
  ['Hôm nay, ngày 23 tháng 10 năm 2026, tại Thành phố Hồ Chí Minh, các bên gồm:',false,false],
  ['BÊN A · CÔNG TY TNHH AN PHÁT',true,false],['Đại diện: Nguyễn Minh Anh — Giám đốc',false,false],['Địa chỉ: 28 Nguyễn Thị Minh Khai, Thành phố Hồ Chí Minh',false,false],
  ['BÊN B · CÔNG TY CỔ PHẦN MINH LONG',true,false],['Đại diện: Trần Quốc Bảo — Giám đốc',false,false],['',false,false],
  ['ĐIỀU 1. PHẠM VI DỊCH VỤ',true,false],['Bên B cung cấp dịch vụ tư vấn và triển khai hệ thống quản lý hợp đồng cho Bên A. Phạm vi gồm khảo sát, cấu hình quy trình, chuyển giao và đào tạo sử dụng.',false,false],
  ['ĐIỀU 2. GIÁ TRỊ VÀ THANH TOÁN',true,false],['Giá trị hợp đồng: 120.000.000 VNĐ (chưa bao gồm thuế GTGT). Thanh toán 50% khi ký hợp đồng và 50% sau khi nghiệm thu.',false,false],
  ['Thời hạn thanh toán: trong vòng 30 ngày kể từ khi nhận đủ hồ sơ thanh toán hợp lệ.',false,false],
  ['ĐIỀU 3. TIẾN ĐỘ VÀ NGHIỆM THU',true,false],['Thời gian thực hiện: 60 ngày kể từ ngày hợp đồng có hiệu lực. Các bên lập biên bản nghiệm thu theo từng giai đoạn.',false,false],
  ['ĐIỀU 4. BẢO MẬT VÀ HIỆU LỰC',true,false],['Các bên cam kết bảo mật thông tin. Hợp đồng có hiệu lực kể từ ngày ký và được lập thành 02 bản có giá trị pháp lý như nhau.',false,false],
  ['ĐẠI DIỆN BÊN A                                      ĐẠI DIỆN BÊN B',true,false],['(Ký, ghi rõ họ tên)                                      (Ký, ghi rõ họ tên)',false,false]
 ],
 muaban:[
  ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',true,true],['Độc lập - Tự do - Hạnh phúc',false,true],['',false,false],
  ['HỢP ĐỒNG MUA BÁN HÀNG HÓA',true,true],['Số: 018/2026/HĐMB',false,true],['',false,false],
  ['Hôm nay, ngày 23 tháng 10 năm 2026, tại Thành phố Hồ Chí Minh, các bên gồm:',false,false],
  ['BÊN A · CÔNG TY TNHH AN PHÁT',true,false],['Đại diện: Nguyễn Minh Anh — Giám đốc',false,false],['Địa chỉ: 28 Nguyễn Thị Minh Khai, Thành phố Hồ Chí Minh',false,false],
  ['BÊN B · CÔNG TY TNHH VTCODE',true,false],['Đại diện: Lê Hoàng Nam — Giám đốc',false,false],['',false,false],
  ['ĐIỀU 1. HÀNG HÓA',true,false],['Bên B bán cho Bên A bộ thiết bị văn phòng theo phụ lục đính kèm, bao gồm bàn giao, lắp đặt và hướng dẫn sử dụng.',false,false],
  ['ĐIỀU 2. GIÁ VÀ GIAO HÀNG',true,false],['Tổng giá trị: 86.000.000 VNĐ (chưa bao gồm thuế GTGT). Giao hàng trong 15 ngày tại trụ sở Bên A. Bên A thanh toán trong 15 ngày sau khi nhận đủ hàng.',false,false],
  ['ĐIỀU 3. BẢO HÀNH',true,false],['Bên B bảo hành 12 tháng đối với lỗi kỹ thuật từ nhà sản xuất. Hàng hóa không đúng chủng loại được đổi trong 7 ngày.',false,false],
  ['ĐIỀU 4. HIỆU LỰC',true,false],['Hợp đồng có hiệu lực từ ngày ký, lập thành 02 bản có giá trị như nhau.',false,false],
  ['ĐẠI DIỆN BÊN A                                      ĐẠI DIỆN BÊN B',true,false],['(Ký, ghi rõ họ tên)                                      (Ký, ghi rõ họ tên)',false,false]
 ],
 thue:[
  ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',true,true],['Độc lập - Tự do - Hạnh phúc',false,true],['',false,false],
  ['HỢP ĐỒNG THUÊ VĂN PHÒNG',true,true],['Số: 007/2026/HĐT',false,true],['',false,false],
  ['Hôm nay, ngày 23 tháng 10 năm 2026, tại Thành phố Hồ Chí Minh, các bên gồm:',false,false],
  ['BÊN CHO THUÊ · CÔNG TY CỔ PHẦN SAO KHUÊ',true,false],['Đại diện: Phạm Thu Hà — Giám đốc',false,false],['Địa chỉ: 12 Pasteur, Quận 1, Thành phố Hồ Chí Minh',false,false],
  ['BÊN THUÊ · CÔNG TY TNHH AN PHÁT',true,false],['Đại diện: Nguyễn Minh Anh — Giám đốc',false,false],['',false,false],
  ['ĐIỀU 1. DIỆN TÍCH THUÊ',true,false],['Bên thuê sử dụng tầng 8, diện tích 180 m² tại tòa nhà Sao Khuê. Mục đích sử dụng: văn phòng làm việc.',false,false],
  ['ĐIỀU 2. GIÁ THUÊ VÀ THANH TOÁN',true,false],['Giá thuê: 45.000.000 VNĐ/tháng, thanh toán trước vào ngày 05 hàng tháng. Tiền đặt cọc bằng 02 tháng tiền thuê.',false,false],
  ['ĐIỀU 3. THỜI HẠN',true,false],['Thời hạn thuê: 12 tháng kể từ ngày bàn giao mặt bằng. Bên thuê được ưu tiên gia hạn nếu báo trước 30 ngày.',false,false],
  ['ĐIỀU 4. QUYỀN VÀ NGHĨA VỤ',true,false],['Bên thuê giữ gìn mặt bằng và không được cho thuê lại nếu chưa có văn bản đồng ý. Hợp đồng lập thành 02 bản có giá trị như nhau.',false,false],
  ['ĐẠI DIỆN BÊN CHO THUÊ                               ĐẠI DIỆN BÊN THUÊ',true,false],['(Ký, ghi rõ họ tên)                                      (Ký, ghi rõ họ tên)',false,false]
 ]
} as const;

export function createContractTemplate(id:keyof typeof SPECS | string='dichvu'){
 const lines=SPECS[id as keyof typeof SPECS]||SPECS.dichvu;
 const initial=createEmptyDocument({pageWidth:11906,pageHeight:16838,marginLeft:1134,marginRight:1134,marginTop:1000,marginBottom:1000});
 initial.package.document!.content=lines.map(([text,bold,center],i)=>({type:'paragraph',paraId:(i+1).toString(16).padStart(8,'0').toUpperCase(),formatting:{alignment:center?'center':'left',spaceAfter:140,lineSpacing:276},content:[{type:'run',formatting:{bold,fontSize:i===3?30:22,fontFamily:{ascii:'Arial',hAnsi:'Arial'}},content:[{type:'text',text}]}]})) as never;
 return initial;
}
