# GreenCrop NAT — Mac Handoff

วันที่บันทึก: 31 กรกฎาคม 2026

ไฟล์นี้สรุปงานล่าสุดสำหรับย้ายจากเครื่อง Windows ชั่วคราวไปพัฒนาต่อบน Mac

## งานที่เสร็จแล้ว

### NAT AI Voice Assistant

- รองรับ wake word และการสนทนาต่อเนื่องจากระบบเดิม
- เพิ่มคำสั่งเสียง `พูดซ้ำ`, `พูดอีกครั้ง`, `พูดช้าลง`, `พูดปกติ` และ `พูดเร็วขึ้น`
- เพิ่มปุ่มพูดคำตอบล่าสุดซ้ำ
- เพิ่มปุ่มหยุด NAT AI ขณะกำลังพูด
- เพิ่มความเร็วเสียง `0.8x`, `1x` และ `1.15x`
- บันทึกการเปิดเสียงและความเร็วไว้ใน Local Storage
- คง fallback ด้วย Web Speech/Speech Synthesis ของเบราว์เซอร์
- Production build ผ่านหลังแก้ไข

ไฟล์หลัก:

- `src/features/chat/hooks/useNatVoiceAssistant.ts`
- `src/features/chat/components/CustomerChatWidget.tsx`

### Logo

- เอาพื้นวงกลมสีเขียวออกจากโลโก้ใน Login/Register modal ที่อยู่ใน `src/App.tsx`
- ขยายโลโก้จาก 24px เป็น 56px
- หากหน้าเว็บที่ใช้งานจริงยังไม่เปลี่ยน ให้ตรวจว่า UI มาจาก `src/App.tsx` หรือ `src/features/auth/components/Login.tsx`

## งาน Local Thai TTS ที่เริ่มแล้ว

เป้าหมายคือให้ NAT AI ใช้โมเดลเสียงภาษาไทยในเครื่อง โดยไม่เสียค่าบริการต่อการพูด

โมเดลทดลอง:

```text
facebook/mms-tts-tha
```

ข้อจำกัดสิทธิ์ใช้งาน:

```text
CC-BY-NC 4.0 — ใช้สำหรับทดลอง การศึกษา และ Portfolio
ไม่ควรใช้เชิงพาณิชย์
```

สิ่งที่ติดตั้งบน Windows ชั่วคราวแล้ว:

- Python 3.11.9
- `.venv-tts`
- PyTorch
- Transformers
- SciPy
- Safetensors

สิ่งที่ยังไม่เสร็จ:

- Python TTS worker
- Backend API สำหรับสร้างเสียง
- Frontend audio playback จาก Local TTS
- การดาวน์โหลดและทดสอบโมเดลเสียงไทย
- fallback จาก Local TTS ไป Browser Speech
- เอกสารติดตั้งฉบับสมบูรณ์

อย่า Commit `.venv-tts` เพราะ environment ของ Windows ใช้บน macOS ไม่ได้

## ย้ายงานไป Mac

หลัง Commit และ Push จาก Windows:

```bash
git pull
```

หากยังไม่มี repository บน Mac:

```bash
git clone <repository-url>
cd GreenCrop-NAT-IOT-WEB
```

ติดตั้ง JavaScript dependencies:

```bash
npm install
cd server
npm install
cd ..
```

ติดตั้ง Python 3.11 บน Mac ด้วย Homebrew:

```bash
brew install python@3.11
```

สร้าง environment ใหม่สำหรับ TTS:

```bash
python3.11 -m venv .venv-tts
source .venv-tts/bin/activate
python -m pip install --upgrade pip
pip install torch transformers scipy safetensors
```

ตรวจการติดตั้ง:

```bash
python -c "import torch, transformers, scipy; print(torch.__version__); print(transformers.__version__)"
```

## Environment ที่วางแผนใช้

เพิ่มค่าต่อไปนี้ใน `server/.env` บน Mac ภายหลัง:

```env
NAT_AI_LOCAL_TTS_ENABLED=true
NAT_AI_TTS_PYTHON_BIN=../.venv-tts/bin/python
NAT_AI_TTS_MODEL=facebook/mms-tts-tha
NAT_AI_TTS_TIMEOUT_MS=120000
```

ห้าม Commit `server/.env`

## Architecture เป้าหมาย

```text
Mac/Windows/มือถือของผู้ใช้
        |
        v
GreenCrop Web
        |
        v
Node Backend (Mac server)
        |
        v
Local Python Thai TTS
        |
        v
WAV audio response
```

ผู้ใช้ที่เปิดเว็บไม่ต้องติดตั้งโมเดล โมเดลติดตั้งเพียงเครื่องเดียวบน Mac ที่รัน Backend

## จุดเริ่มทำงานต่อ

1. สร้าง `ai/tts/local_thai_tts.py`
2. สร้าง Node service ที่เปิด Python worker ค้างไว้ เพื่อไม่โหลดโมเดลใหม่ทุกประโยค
3. เพิ่ม authenticated endpoint เช่น `POST /api/ai/voice/synthesize`
4. จำกัดความยาวข้อความและตรวจ Token/tenant
5. ให้ `useNatVoiceAssistant.ts` เรียก API และเล่น Blob audio
6. หาก Local TTS ใช้งานไม่ได้ ให้ fallback ไป `speechSynthesis`
7. ทดสอบภาษาไทย คำว่า NAT, pH, EC, ปั๊ม และชื่ออุปกรณ์

## ตรวจงานล่าสุด

ดู Commit ของวันนี้:

```bash
git log --since="today" --oneline
```

ดู Commit ล่าสุด:

```bash
git show HEAD
```

ข้อความ Commit ที่แนะนำ:

```text
Develop NAT AI voice controls and document Mac TTS handoff
```
