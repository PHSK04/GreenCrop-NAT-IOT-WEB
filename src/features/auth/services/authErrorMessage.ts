import type { AuthErrorDetail } from './authError';

export function explainAuthError(error: AuthErrorDetail) {
  const reason = error.description?.trim() || '';
  const text = `${error.title} ${reason}`.toLowerCase();
  if (/invalid credentials|incorrect password|user not found/.test(text)) {
    return { title: 'เข้าสู่ระบบไม่สำเร็จ', reason: 'ชื่อผู้ใช้ อีเมล หรือรหัสผ่านไม่ถูกต้อง', help: 'ตรวจสอบอีเมลหรือชื่อผู้ใช้ รหัสผ่าน และภาษาของแป้นพิมพ์ แล้วลองอีกครั้ง' };
  }
  if (error.title === 'กรุณาตรวจสอบข้อมูล') {
    return { title: error.title, reason: 'กรอกข้อมูลให้ครบถ้วนและถูกต้อง', help: 'ตรวจสอบช่องที่มีกรอบสีแดงก่อนดำเนินการต่อ' };
  }
  if (/email already exists|already registered/.test(text)) {
    return { title: 'อีเมลนี้มีบัญชีแล้ว', reason: 'อีเมลที่กรอกถูกใช้สมัครสมาชิกไว้แล้ว', help: 'กลับไปเข้าสู่ระบบด้วยบัญชีเดิม หรือใช้อีเมลอื่นสมัครสมาชิก' };
  }
  if (/timeout|cannot connect|failed to fetch|network/.test(text)) {
    return { title: 'เชื่อมต่อไม่สำเร็จ', reason: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ในขณะนี้', help: 'ตรวจสอบอินเทอร์เน็ต แล้วลองอีกครั้ง หากยังไม่ได้โปรดรอสักครู่' };
  }
  if (/บริการ.*ยังไม่พร้อม|ไม่สามารถส่งอีเมล/.test(text)) {
    return { title: 'บริการกู้คืนบัญชียังไม่พร้อม', reason, help: 'ยังไม่มีการยืนยันการส่งอีเมล กรุณาลองใหม่ภายหลัง หรือติดต่อผู้ดูแลระบบ' };
  }
  if (/ลิงก์.*หมดอายุ|ถูกใช้ไปแล้ว/.test(text)) {
    return { title: 'ใช้ลิงก์นี้ไม่ได้แล้ว', reason, help: 'กดขอลิงก์ใหม่ แล้วใช้ลิงก์ล่าสุดภายใน 15 นาที' };
  }
  if (/missing vite_|not configured|production api/.test(text)) {
    return { title: 'บริการยังไม่พร้อมใช้งาน', reason: 'ระบบยังตั้งค่าบริการเข้าสู่ระบบไม่ครบ', help: 'ลองเข้าสู่ระบบด้วยวิธีอื่น หรือติดต่อผู้ดูแลระบบ' };
  }
  if (/cancelled|canceled|popup_closed/.test(text)) {
    return { title: 'ยังไม่ได้ยืนยันการเข้าสู่ระบบ', reason: 'หน้าต่างยืนยันถูกปิดหรือการเข้าสู่ระบบถูกยกเลิก', help: 'กดเข้าสู่ระบบอีกครั้ง และยืนยันให้ครบทุกขั้นตอน' };
  }
  if (/[ก-๙]/.test(reason)) {
    return { title: /registration|สมัคร/.test(text) ? 'สมัครสมาชิกไม่สำเร็จ' : 'ดำเนินการไม่สำเร็จ', reason, help: 'แก้ไขข้อมูลตามข้อความด้านบน แล้วลองอีกครั้ง' };
  }
  return { title: 'ดำเนินการไม่สำเร็จ', reason: 'ระบบไม่สามารถดำเนินการตามคำขอได้ในขณะนี้', help: 'ลองอีกครั้ง หากยังพบปัญหา กรุณาติดต่อผู้ดูแลระบบ' };
}
