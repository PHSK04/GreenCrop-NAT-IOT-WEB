#!/usr/bin/env python3
"""NAT AI controller for GreenCropNAT.

The Node API sends the current tenant-bound machine context to this script.
This controller returns a structured answer plus recommended actions. It does
not directly operate pumps or relays; physical actions must be confirmed and
executed by the app/backend safety layer.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from typing import Any


THAI_MONTHS = {
    "ม.ค.": 1,
    "มกราคม": 1,
    "ก.พ.": 2,
    "กุมภาพันธ์": 2,
    "มี.ค.": 3,
    "มีนาคม": 3,
    "เม.ย.": 4,
    "เมษายน": 4,
    "พ.ค.": 5,
    "พฤษภาคม": 5,
    "มิ.ย.": 6,
    "มิถุนายน": 6,
    "ก.ค.": 7,
    "กรกฎาคม": 7,
    "ส.ค.": 8,
    "สิงหาคม": 8,
    "ก.ย.": 9,
    "กันยายน": 9,
    "ต.ค.": 10,
    "ตุลาคม": 10,
    "พ.ย.": 11,
    "พฤศจิกายน": 11,
    "ธ.ค.": 12,
    "ธันวาคม": 12,
}


def as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    return str(value or "").strip().lower() in {"1", "true", "on", "yes"}


def as_number(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed == parsed else default


def parse_requested_date(text: str) -> str:
    raw = text.lower()
    for label, month in THAI_MONTHS.items():
        match = re.search(rf"(\d{{1,2}})\s*{re.escape(label)}\s*(\d{{4}})", raw)
        if match:
            year = int(match.group(2))
            if year > 2400:
                year -= 543
            return f"{year:04d}-{month:02d}-{int(match.group(1)):02d}"

    match = re.search(r"(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})", raw)
    if match:
        year = int(match.group(3))
        if year > 2400:
            year -= 543
        return f"{year:04d}-{int(match.group(2)):02d}-{int(match.group(1)):02d}"
    return ""


def parse_requested_year(text: str) -> int | None:
    raw = text.lower()
    match = re.search(r"(?:พ\.?\s*ศ\.?|ปี|year|ค\.?\s*ศ\.?)\s*(\d{4})", raw)
    if not match:
        match = re.search(r"\b(20\d{2}|25\d{2})\b", raw)
    if not match:
        return None
    year = int(match.group(1))
    if year > 2400:
        year -= 543
    return year if 2000 <= year <= 2100 else None


def date_label(date_key: str, th: bool) -> str:
    if not date_key:
        return "วันที่ที่ถาม" if th else "the requested date"
    try:
        date = datetime.strptime(date_key, "%Y-%m-%d")
    except ValueError:
        return date_key
    if th:
        month_labels = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
        return f"{date.day} {month_labels[date.month - 1]} {date.year + 543}"
    return date.strftime("%d %b %Y")


def year_label(year: int | None, th: bool) -> str:
    if not year:
        return "ปีที่ถาม" if th else "the requested year"
    return f"พ.ศ. {year + 543}" if th else str(year)


def detect_language(text: str) -> str:
    return "TH" if re.search(r"[\u0e00-\u0e7f]", text or "") else "EN"


def detect_intent(text: str) -> str:
    raw = (text or "").lower()
    if re.search(r"หยุด|ปิด|stop|emergency|ฉุกเฉิน|ดับ", raw) and re.search(r"ปั๊ม|pump|เครื่อง|machine", raw):
        return "control_stop"
    if re.search(r"เปิด|เริ่ม|start|run", raw) and re.search(r"ปั๊ม|pump|เครื่อง|machine", raw):
        return "control_start"
    if re.search(r"ผลผลิต|ผลิตได้|ผลิตเท่า|มีผลิต|เก็บเกี่ยว|yield|harvest|production", raw):
        return "crop_yield"
    if re.search(r"สถานะ|status|online|offline|mqtt|สัญญาณ|เครื่อง|device|บอร์ด|ไม่อัปเดต|ไม่อัพเดต|ค้าง|stale|not updating", raw):
        return "machine_status"
    if re.search(r"ปั๊ม|pump", raw):
        return "pump_status"
    if re.search(r"sensor|เซ็นเซอร์|ph|ec|temp|อุณหภูมิ|น้ำ|ค่าน้ำ|history|ย้อนหลัง", raw):
        return "sensor_insight"
    if re.search(r"โหลด|ดาวน์โหลด|download|export|ส่งออก", raw):
        return "export_help"
    return "general"


def compact_text(text: str) -> str:
    return re.sub(r"[\s\.\?!,，。:;\"'“”‘’…]+", "", (text or "").lower())


def is_show_details_follow_up(text: str) -> bool:
    compact = compact_text(text)
    compact = re.sub(r"(ครับ|ค่ะ|คะ|คับ|จ้า|หน่อย|please)$", "", compact)
    return bool(
        re.fullmatch(
            r"(ขอดู|ดู|แสดง|แสดงให้ดู|ขอรายละเอียด|รายละเอียด|อันนั้น|รายการนั้น|ตัวนั้น|ล่าสุด|show|showme|details?|view|viewit|that|thatone)",
            compact,
        )
        or re.fullmatch(r"(ขอดู|ดู|แสดง).*(รายละเอียด|รายการ|ให้ดู)?", compact)
    )


def recent_conversation(context: dict[str, Any]) -> list[dict[str, Any]]:
    items = context.get("recent_conversation")
    return items if isinstance(items, list) else []


def has_recent_crop_yield_context(context: dict[str, Any]) -> bool:
    crop_markers = re.compile(
        r"ผลผลิต|ผลิตได้|เก็บเกี่ยว|yield|harvest|production|สรุปผลผลิต|รายงานผลผลิต|รายการล่าสุดที่มี|latest saved entry",
        re.IGNORECASE,
    )
    for message in recent_conversation(context)[-6:]:
        text = str(message.get("text") if isinstance(message, dict) else "")
        if crop_markers.search(text):
            return True
    return False


def latest_sensor(context: dict[str, Any]) -> dict[str, Any]:
    row = context.get("latest_sensor")
    return row if isinstance(row, dict) else {}


def requested_summary(context: dict[str, Any]) -> dict[str, Any]:
    summary = context.get("requested_day_summary")
    return summary if isinstance(summary, dict) else {}


def page_project_snapshot(context: dict[str, Any]) -> dict[str, Any]:
    snapshot = context.get("page_project_snapshot")
    return snapshot if isinstance(snapshot, dict) else {}


def crop_yield_snapshot(context: dict[str, Any]) -> dict[str, Any]:
    crop = page_project_snapshot(context).get("crop_yield")
    return crop if isinstance(crop, dict) else {}


def crop_yield_entries(context: dict[str, Any]) -> list[dict[str, Any]]:
    entries = crop_yield_snapshot(context).get("recent_entries")
    if not isinstance(entries, list):
        return []
    clean_entries = [entry for entry in entries if isinstance(entry, dict)]
    return sorted(clean_entries, key=lambda row: f"{row.get('date') or ''} {row.get('time') or ''}", reverse=True)


def crop_yield_yearly(context: dict[str, Any]) -> list[dict[str, Any]]:
    yearly = crop_yield_snapshot(context).get("yearly")
    if not isinstance(yearly, list):
        return []
    return [row for row in yearly if isinstance(row, dict)]


def sensor_age_minutes(row: dict[str, Any], context: dict[str, Any] | None = None) -> float | None:
    raw_timestamp = row.get("timestamp")
    if not raw_timestamp:
        return None
    try:
        captured = datetime.fromisoformat(str(raw_timestamp).replace("Z", "+00:00"))
        if captured.tzinfo is None:
            captured = captured.replace(tzinfo=timezone.utc)
        raw_now = (context or {}).get("current_datetime")
        now = datetime.fromisoformat(str(raw_now).replace("Z", "+00:00")) if raw_now else datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        return max(0.0, (now - captured).total_seconds() / 60.0)
    except (TypeError, ValueError):
        return None


def has_valid_sensor_values(row: dict[str, Any]) -> bool:
    return any(as_number(row.get(key)) > 0 for key in ("ph_value", "ec_value", "temp_c"))


def risk_from_sensor(row: dict[str, Any], context: dict[str, Any] | None = None) -> tuple[str, int, list[str]]:
    reasons: list[str] = []
    if not row:
        return "offline", 50, ["no_latest_sensor"]

    age_minutes = sensor_age_minutes(row, context)
    if age_minutes is not None and age_minutes > 10:
        return "offline", 78, ["telemetry_stale"]
    if not has_valid_sensor_values(row):
        return "offline", 60, ["sensor_values_missing"]

    if as_bool(row.get("locked")):
        reasons.append("locked")
    if as_bool(row.get("red_on")):
        reasons.append("red_alarm")
    if as_bool(row.get("float_alarm")):
        reasons.append("float_alarm")
    if as_bool(row.get("pump2_on")) and as_bool(row.get("wls2")):
        reasons.append("pump2_running_while_upper_water_detected")
    if as_number(row.get("ph_value")) > 0 and not as_bool(row.get("ph_ok")):
        reasons.append("ph_out_of_range")

    if any(reason in reasons for reason in ["locked", "red_alarm", "float_alarm", "pump2_running_while_upper_water_detected"]):
        return "critical", 92, reasons
    if reasons:
        return "warning", 65, reasons
    return "normal", 18, reasons


def format_sensor_values(row: dict[str, Any], th: bool) -> str:
    if not row:
        return "ยังไม่มีข้อมูล sensor ล่าสุด" if th else "No latest sensor data is available."
    ph = as_number(row.get("ph_value"))
    ec = as_number(row.get("ec_value"))
    temp = as_number(row.get("temp_c"))
    pump1 = "ON" if as_bool(row.get("pump1_on")) else "OFF"
    pump2 = "ON" if as_bool(row.get("pump2_on")) else "OFF"
    ph_label = f"{ph:.2f}" if ph > 0 else "--"
    ec_label = f"{ec:.2f}" if ec > 0 else "--"
    temp_label = f"{temp:.1f}" if temp > 0 else "--"
    return f"pH {ph_label} | EC {ec_label} | Temp {temp_label} | Pump1 {pump1} | Pump2 {pump2}"


def answer_status(context: dict[str, Any], th: bool) -> dict[str, Any]:
    row = latest_sensor(context)
    severity, score, reasons = risk_from_sensor(row, context)
    values = format_sensor_values(row, th)
    age_minutes = sensor_age_minutes(row, context)
    if th:
        if severity == "normal":
            text = f"ตอนนี้เครื่องดูปกติจากข้อมูลล่าสุดครับ\n{values}"
        elif severity == "offline":
            if "telemetry_stale" in reasons:
                age_label = f"{age_minutes:.0f}" if age_minutes is not None else "มากกว่า 10"
                text = (
                    f"ข้อมูล telemetry ล่าสุดหยุดอัปเดตประมาณ {age_label} นาทีครับ จึงไม่ควรใช้ค่าชุดนี้ตัดสินสถานะเครื่อง\n"
                    "ให้ตรวจตามลำดับ: 1) ไฟและสถานะ ESP32 2) Wi-Fi ของบอร์ด 3) MQTT ว่ายัง connected/publish อยู่ "
                    "4) device id และ topic ให้ตรงกับอุปกรณ์ที่เลือก แล้วส่งข้อมูลทดสอบใหม่"
                )
            elif "sensor_values_missing" in reasons:
                text = (
                    "ระบบพบแถวข้อมูลล่าสุด แต่ค่า pH, EC และอุณหภูมิยังว่างหรือเป็นศูนย์ จึงยังสรุปว่าค่าผิดช่วงไม่ได้ครับ\n"
                    "ให้ตรวจ payload จาก ESP32, การ map ชื่อ field และ MQTT topic ก่อน"
                )
            else:
                text = "ตอนนี้ยังไม่มี sensor ล่าสุดให้วิเคราะห์ครับ\nให้ตรวจไฟเลี้ยง, Wi-Fi, MQTT และ device id ก่อน"
        else:
            text = f"ตอนนี้เครื่องมีความเสี่ยงระดับ {severity} ครับ\n{values}\nสาเหตุที่เห็น: {', '.join(reasons)}"
    else:
        if severity == "normal":
            text = f"The machine looks normal from the latest telemetry.\n{values}"
        elif severity == "offline":
            if "telemetry_stale" in reasons:
                age_label = f"{age_minutes:.0f}" if age_minutes is not None else "more than 10"
                text = f"Telemetry has not updated for about {age_label} minutes. Check ESP32 power, Wi-Fi, MQTT publishing, device id, and topic, then send a test reading."
            elif "sensor_values_missing" in reasons:
                text = "A latest row exists, but pH, EC, and temperature are empty or zero. Check the ESP32 payload, field mapping, and MQTT topic."
            else:
                text = "No latest sensor data is available. Check power, Wi-Fi, MQTT, and device id first."
        else:
            text = f"The machine is in {severity} state.\n{values}\nReasons: {', '.join(reasons)}"

    return {
        "text": text,
        "risk": {"severity": severity, "score": score, "reasons": reasons},
        "actions": [],
        "confidence": 0.88 if row else 0.7,
    }


def answer_requested_day(context: dict[str, Any], th: bool) -> dict[str, Any] | None:
    date_key = context.get("requested_date") or parse_requested_date(str(context.get("user_message") or ""))
    if not date_key:
        return None

    summary = requested_summary(context)
    intent = detect_intent(str(context.get("user_message") or ""))
    if intent == "crop_yield":
        return None

    label = date_label(date_key, th)
    count = int(summary.get("count") or 0)
    if count <= 0:
        text = (
            f"วันที่ {label} ยังไม่พบข้อมูล sensor ใน history ของเครื่องนี้ครับ"
            if th
            else f"I do not see sensor history for {label} on this device."
        )
        return {"text": text, "risk": {"severity": "unknown", "score": 0, "reasons": ["no_rows_for_date"]}, "actions": [], "confidence": 0.84}

    averages = summary.get("averages") if isinstance(summary.get("averages"), dict) else {}
    alarm_seen = bool(summary.get("alarm_seen"))
    pump_seen = summary.get("pump_seen_on") if isinstance(summary.get("pump_seen_on"), dict) else {}
    if th:
        text = (
            f"วันที่ {label} มีข้อมูล sensor {count} รายการครับ\n"
            f"ค่าเฉลี่ย: pH {averages.get('ph_value') or '--'} | EC {averages.get('ec_value') or '--'} | Temp {averages.get('temp_c') or '--'}\n"
            f"ปั๊มที่เคย ON: Pump1 {'ใช่' if pump_seen.get('pump1_on') else 'ไม่'} | Pump2 {'ใช่' if pump_seen.get('pump2_on') else 'ไม่'}"
        )
    else:
        text = (
            f"{label} has {count} sensor records.\n"
            f"Averages: pH {averages.get('ph_value') or '--'} | EC {averages.get('ec_value') or '--'} | Temp {averages.get('temp_c') or '--'}\n"
            f"Pump seen ON: Pump1 {'yes' if pump_seen.get('pump1_on') else 'no'} | Pump2 {'yes' if pump_seen.get('pump2_on') else 'no'}"
        )

    severity = "warning" if alarm_seen else "normal"
    return {"text": text, "risk": {"severity": severity, "score": 55 if alarm_seen else 20, "reasons": ["alarm_seen"] if alarm_seen else []}, "actions": [], "confidence": 0.9}


def format_yield_number(value: Any, th: bool) -> str:
    amount = as_number(value)
    if amount.is_integer():
        return f"{int(amount):,}"
    return f"{amount:,.2f}".rstrip("0").rstrip(".")


def average_entry_value(entries: list[dict[str, Any]], key: str, digits: int) -> str:
    values = [as_number(entry.get(key), -1) for entry in entries]
    values = [value for value in values if value > 0]
    if not values:
        return "--"
    return f"{sum(values) / len(values):.{digits}f}"


def answer_crop_yield(context: dict[str, Any], th: bool) -> dict[str, Any]:
    message = str(context.get("user_message") or "")
    date_key = context.get("requested_date") or parse_requested_date(message)
    requested_year = context.get("requested_year") or parse_requested_year(message)
    entries = crop_yield_entries(context)
    if date_key:
        target_entries = [entry for entry in entries if entry.get("date") == date_key]
    elif requested_year:
        target_entries = [entry for entry in entries if str(entry.get("date") or "").startswith(f"{int(requested_year):04d}-")]
    else:
        target_entries = entries[:1]
    label = date_label(date_key, th) if date_key else (year_label(int(requested_year), th) if requested_year else ("รายการล่าสุด" if th else "latest entry"))

    if requested_year and not date_key:
        summary = next((row for row in crop_yield_yearly(context) if int(as_number(row.get("year"), -1)) == int(requested_year)), None)
        if summary and int(as_number(summary.get("harvest_count"))) > 0:
            total_yield = as_number(summary.get("total_yield_g"))
            harvest_count = int(as_number(summary.get("harvest_count")))
            average_yield = as_number(summary.get("average_yield_g"), total_yield / harvest_count if harvest_count else 0)
            if th:
                lines = [
                    "สรุปผลผลิต",
                    f"วันที่: {label}",
                    f"ผลผลิตรวม: {format_yield_number(total_yield, th)} กรัม",
                    f"จำนวนบันทึก: {harvest_count} รายการ",
                    f"เฉลี่ยต่อรายการ: {format_yield_number(average_yield, th)} กรัม",
                    "",
                    "ค่าน้ำเฉลี่ย",
                    f"pH: {as_number(summary.get('avg_ph')):.2f}",
                    f"EC: {as_number(summary.get('avg_ec')):.2f} mS/cm",
                    f"อุณหภูมิ: {as_number(summary.get('avg_temp')):.1f} C",
                ]
            else:
                lines = [
                    "Yield summary",
                    f"Date: {label}",
                    f"Total yield: {format_yield_number(total_yield, th)} g",
                    f"Records: {harvest_count}",
                    f"Average per record: {format_yield_number(average_yield, th)} g",
                    "",
                    "Average water values",
                    f"pH: {as_number(summary.get('avg_ph')):.2f}",
                    f"EC: {as_number(summary.get('avg_ec')):.2f} mS/cm",
                    f"Temp: {as_number(summary.get('avg_temp')):.1f} C",
                ]
            return {"text": "\n".join(lines), "risk": {"severity": "normal", "score": 0, "reasons": []}, "actions": [], "confidence": 0.94}

    if not target_entries:
        latest = entries[0] if entries else None
        if not latest:
            text = (
                f"ยังไม่มีข้อมูลผลผลิตที่บันทึกไว้ในหน้า รายงานผลผลิต ครับ"
                if th
                else "There is no saved crop yield data in Crop Reports yet."
            )
        elif th:
            text = (
                f"{'ปี' if requested_year and not date_key else 'วันที่'} {label} ยังไม่พบรายการผลผลิตที่บันทึกไว้ครับ\n"
                f"รายการล่าสุดที่มีคือ {date_label(str(latest.get('date') or ''), th)} เวลา {latest.get('time') or '--'}: "
                f"{format_yield_number(latest.get('yield_g'), th)} กรัม"
            )
        else:
            text = (
                f"I do not see a saved yield entry for {label}.\n"
                f"Latest saved entry: {date_label(str(latest.get('date') or ''), th)} at {latest.get('time') or '--'}: "
                f"{format_yield_number(latest.get('yield_g'), th)} g."
            )
        return {"text": text, "risk": {"severity": "normal", "score": 0, "reasons": []}, "actions": [], "confidence": 0.9}

    total_yield = sum(as_number(entry.get("yield_g")) for entry in target_entries)
    average_yield = total_yield / len(target_entries)
    detail_lines = "\n".join(
        (
            f"{index + 1}. เวลา {entry.get('time') or '--'} | {format_yield_number(entry.get('yield_g'), th)} กรัม"
            if th
            else f"{index + 1}. {entry.get('time') or '--'} | {format_yield_number(entry.get('yield_g'), th)} g"
        )
        for index, entry in enumerate(target_entries)
    )
    has_quality = any(as_number(entry.get("ph")) > 0 or as_number(entry.get("ec")) > 0 or as_number(entry.get("temp_c")) > 0 for entry in target_entries)
    if th:
        lines = [
            "สรุปผลผลิต",
            f"วันที่: {label}",
            f"ผลผลิตรวม: {format_yield_number(total_yield, th)} กรัม",
            f"จำนวนบันทึก: {len(target_entries)} รายการ",
        ]
        if len(target_entries) > 1:
            lines.append(f"เฉลี่ยต่อรายการ: {format_yield_number(average_yield, th)} กรัม")
        lines.extend(["", "รายละเอียดบันทึก", detail_lines])
        if has_quality:
            lines.extend([
                "",
                "ค่าน้ำเฉลี่ย",
                f"pH: {average_entry_value(target_entries, 'ph', 2)}",
                f"EC: {average_entry_value(target_entries, 'ec', 2)} mS/cm",
                f"อุณหภูมิ: {average_entry_value(target_entries, 'temp_c', 1)} C",
            ])
    else:
        lines = [
            "Yield summary",
            f"Date: {label}",
            f"Total yield: {format_yield_number(total_yield, th)} g",
            f"Records: {len(target_entries)}",
        ]
        if len(target_entries) > 1:
            lines.append(f"Average per record: {format_yield_number(average_yield, th)} g")
        lines.extend(["", "Record details", detail_lines])
        if has_quality:
            lines.extend([
                "",
                "Average water values",
                f"pH: {average_entry_value(target_entries, 'ph', 2)}",
                f"EC: {average_entry_value(target_entries, 'ec', 2)} mS/cm",
                f"Temp: {average_entry_value(target_entries, 'temp_c', 1)} C",
            ])

    return {"text": "\n".join(lines), "risk": {"severity": "normal", "score": 0, "reasons": []}, "actions": [], "confidence": 0.93}


def answer_control(intent: str, context: dict[str, Any], th: bool) -> dict[str, Any]:
    row = latest_sensor(context)
    severity, score, reasons = risk_from_sensor(row, context)
    wants_stop = intent == "control_stop"
    action = {
        "type": "machine_control",
        "command": "EMERGENCY_STOP" if wants_stop else "START",
        "requires_confirmation": True,
        "reason": "physical_device_safety",
    }
    if th:
        if wants_stop:
            text = "ทำได้ครับ แต่ผมจะไม่สั่งปั๊มหรือเครื่องจริงทันทีโดยไม่ยืนยัน\nคำสั่งที่แนะนำ: EMERGENCY_STOP\nถ้าจะให้ระบบส่งคำสั่งจริง ต้องกด/ยืนยันจากชั้นควบคุมที่ปลอดภัยก่อน"
        else:
            text = "ผมเตรียมคำสั่ง START ได้ แต่ต้องยืนยันก่อนสั่งเครื่องจริง\nถ้าเครื่อง locked, ไฟแดง, float alarm หรือ pH ผิดช่วง ไม่ควรเริ่มเครื่อง"
    else:
        if wants_stop:
            text = "I can prepare an EMERGENCY_STOP action, but I will not operate the real device without confirmation."
        else:
            text = "I can prepare a START action, but it needs confirmation before controlling the real machine."
    return {"text": text, "risk": {"severity": severity, "score": score, "reasons": reasons}, "actions": [action], "confidence": 0.86}


def answer_general(context: dict[str, Any], th: bool) -> dict[str, Any]:
    status = answer_status(context, th)
    prefix = "ผมคือ NAT AI ผู้ช่วยเดียวของโปรเจกต์นี้ครับ" if th else "I am NAT AI, this project's unified assistant."
    scope_line = (
        "ถามได้หมดในช่องนี้ ทั้งสถานะเครื่อง ปั๊ม sensor history รายงาน การโหลดข้อมูล หรือให้ผมเตรียม action ที่ต้องยืนยันก่อนควบคุมเครื่อง"
        if th
        else "You can ask everything here: machine status, pumps, sensor history, reports, data export, or action preparation that requires confirmation before machine control."
    )
    text = f"{prefix}\n{scope_line}\n\n{status['text']}"
    return {**status, "text": text, "confidence": 0.68}


def build_response(context: dict[str, Any]) -> dict[str, Any]:
    message = str(context.get("user_message") or "")
    language = detect_language(message)
    th = language == "TH"
    intent = detect_intent(message)
    if intent == "general" and is_show_details_follow_up(message) and has_recent_crop_yield_context(context):
        intent = "crop_yield"

    day_answer = answer_requested_day(context, th)
    if day_answer:
        result = day_answer
    elif intent == "crop_yield":
        result = answer_crop_yield(context, th)
    elif intent in {"machine_status", "pump_status", "sensor_insight"}:
        result = answer_status(context, th)
    elif intent in {"control_stop", "control_start"}:
        result = answer_control(intent, context, th)
    elif intent == "export_help":
        text = (
            "ได้ครับ บอกชนิดข้อมูลและช่วงวันที่ เช่น sensor วันนี้, รายงานผลผลิตเดือนนี้ หรือ transcript แชทนี้"
            if th
            else "Sure. Tell me the data type and date range, such as today's sensors, this month's crop report, or this chat transcript."
        )
        result = {"text": text, "risk": {"severity": "normal", "score": 0, "reasons": []}, "actions": [], "confidence": 0.72}
    else:
        result = answer_general(context, th)

    return {
        "provider": "python-controller",
        "intent": intent,
        "language": language,
        "text": result["text"],
        "risk": result.get("risk", {}),
        "actions": result.get("actions", []),
        "confidence": result.get("confidence", 0.5),
    }


def main() -> None:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw or "{}")
        context = payload.get("context") if isinstance(payload, dict) else payload
        if not isinstance(context, dict):
            raise ValueError("context must be an object")
        print(json.dumps(build_response(context), ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"provider": "python-controller", "error": str(exc), "text": ""}, ensure_ascii=False))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
