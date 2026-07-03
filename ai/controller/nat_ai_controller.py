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
from datetime import datetime
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


def detect_language(text: str) -> str:
    return "TH" if re.search(r"[\u0e00-\u0e7f]", text or "") else "EN"


def detect_intent(text: str) -> str:
    raw = (text or "").lower()
    if re.search(r"หยุด|ปิด|stop|emergency|ฉุกเฉิน|ดับ", raw) and re.search(r"ปั๊ม|pump|เครื่อง|machine", raw):
        return "control_stop"
    if re.search(r"เปิด|เริ่ม|start|run", raw) and re.search(r"ปั๊ม|pump|เครื่อง|machine", raw):
        return "control_start"
    if re.search(r"ผลผลิต|ผลิตได้|เก็บเกี่ยว|yield|harvest|production", raw):
        return "crop_yield"
    if re.search(r"สถานะ|status|online|offline|mqtt|สัญญาณ|เครื่อง|device|บอร์ด", raw):
        return "machine_status"
    if re.search(r"ปั๊ม|pump", raw):
        return "pump_status"
    if re.search(r"sensor|เซ็นเซอร์|ph|ec|temp|อุณหภูมิ|น้ำ|ค่าน้ำ|history|ย้อนหลัง", raw):
        return "sensor_insight"
    if re.search(r"โหลด|ดาวน์โหลด|download|export|ส่งออก", raw):
        return "export_help"
    return "general"


def latest_sensor(context: dict[str, Any]) -> dict[str, Any]:
    row = context.get("latest_sensor")
    return row if isinstance(row, dict) else {}


def requested_summary(context: dict[str, Any]) -> dict[str, Any]:
    summary = context.get("requested_day_summary")
    return summary if isinstance(summary, dict) else {}


def risk_from_sensor(row: dict[str, Any]) -> tuple[str, int, list[str]]:
    reasons: list[str] = []
    if not row:
        return "offline", 50, ["no_latest_sensor"]

    if as_bool(row.get("locked")):
        reasons.append("locked")
    if as_bool(row.get("red_on")):
        reasons.append("red_alarm")
    if as_bool(row.get("float_alarm")):
        reasons.append("float_alarm")
    if as_bool(row.get("pump2_on")) and as_bool(row.get("wls2")):
        reasons.append("pump2_running_while_upper_water_detected")
    if not as_bool(row.get("ph_ok")):
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
    return f"pH {ph:.2f} | EC {ec:.2f} | Temp {temp:.1f} | Pump1 {pump1} | Pump2 {pump2}"


def answer_status(context: dict[str, Any], th: bool) -> dict[str, Any]:
    row = latest_sensor(context)
    severity, score, reasons = risk_from_sensor(row)
    values = format_sensor_values(row, th)
    if th:
        if severity == "normal":
            text = f"ตอนนี้เครื่องดูปกติจากข้อมูลล่าสุดครับ\n{values}"
        elif severity == "offline":
            text = "ตอนนี้ยังไม่มี sensor ล่าสุดให้วิเคราะห์ครับ\nให้ตรวจไฟเลี้ยง, Wi-Fi, MQTT และ device id ก่อน"
        else:
            text = f"ตอนนี้เครื่องมีความเสี่ยงระดับ {severity} ครับ\n{values}\nสาเหตุที่เห็น: {', '.join(reasons)}"
    else:
        if severity == "normal":
            text = f"The machine looks normal from the latest telemetry.\n{values}"
        elif severity == "offline":
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


def answer_control(intent: str, context: dict[str, Any], th: bool) -> dict[str, Any]:
    row = latest_sensor(context)
    severity, score, reasons = risk_from_sensor(row)
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
    prefix = "ผมเป็น AI controller ของโปรเจกต์นี้แล้วครับ" if th else "I am now acting as this project's AI controller."
    text = f"{prefix}\nถามได้เรื่องสถานะเครื่อง, ปั๊ม, sensor history, หรือให้ผมเตรียม action ที่ต้องยืนยันก่อนควบคุมเครื่อง\n\n{status['text']}"
    return {**status, "text": text, "confidence": 0.68}


def build_response(context: dict[str, Any]) -> dict[str, Any]:
    message = str(context.get("user_message") or "")
    language = detect_language(message)
    th = language == "TH"
    intent = detect_intent(message)

    day_answer = answer_requested_day(context, th)
    if day_answer:
        result = day_answer
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
