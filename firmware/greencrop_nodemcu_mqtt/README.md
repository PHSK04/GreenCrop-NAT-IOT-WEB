# GreenCrop ESP32 MQTT Firmware

Open `greencrop_nodemcu_mqtt.ino` with Arduino IDE, or use VS Code with the Arduino extension.

## VS Code setup

This repo includes `.vscode/arduino.json` for:

- Sketch: `firmware/greencrop_nodemcu_mqtt/greencrop_nodemcu_mqtt.ino`
- Board: `ESP32 Dev Module`

In VS Code:

1. Install recommended extensions when prompted.
2. Install Arduino IDE or `arduino-cli`.
3. Install ESP32 board package.
4. Install `PubSubClient`.
5. Select the serial port from the Arduino extension, or edit `.vscode/arduino.json`.

## Required Arduino setup

1. Install ESP32 board package.
2. Select `ESP32 Dev Module`.
3. Install `PubSubClient`.
4. Edit Wi-Fi credentials in the `.ino` file.
5. Upload to the ESP32.

## Current control logic

This firmware follows the latest wiring:

- `GPIO13`: WLS1 lower water level sensor.
- `GPIO14`: WLS2 upper water level sensor.
- `GPIO25`: float switch input.
- `GPIO27`: Start button.
- `GPIO26`: Stop NC button.
- `GPIO33`: pump 1 relay.
- `GPIO5`: pump 2 relay + yellow light.
- `GPIO18`: green light.
- `GPIO19`: red light.
- `GPIO23`: ISD1820 sound trigger.

Pump 1 behavior:

- Pump 1 turns on when the board is not locked, WLS1 detects water, and WLS2 is not full.
- pH is still published as telemetry, but it does not block pump 1 by default because an uncalibrated pH probe can keep pump 1 off.
- To make pH block pump 1 again after calibration, set `PUMP1_REQUIRES_PH_OK` to `true` in the firmware.

Commands from the web:

- `START`: starts pump 2 if the board is not locked.
- `PUMP2_OFF`: stops pump 2 only, without locking the board.
- `ACK_ALARM` or `SILENCE_ALARM`: acknowledges the cabinet alarm, stops pump 2, and mutes cabinet indicator/sound until WLS2 and float return to normal or a new start command is sent.
- `STOP`: stops all outputs and locks the board.
- `RESET_UPTIME`: resets the pump 2 uptime counter.

Stop / lock behavior:

- The physical cabinet `STOP` button and web `STOP` command can both stop all outputs and lock the board.
- The web `PUMP2_OFF` command stops pump 2 and the web also sends `ACK_ALARM` to silence the cabinet indicator/sound while keeping the automatic logic running.

Unlock condition:

- The board unlocks only when WLS2 detects water.

Important hardware note:

- Relay outputs are Active LOW: `LOW` = ON, `HIGH` = OFF.
- Serial Monitor is enabled at `9600` baud and prints WLS, pH, Pump1, Pump2, and the Pump1 block reason.

## MQTT topics

- Web command topic: `smartfarm/control`
- Board status topic: `smartfarm/sensors`
- Member command topic: `tenants/<tenant_id>/devices/<device_id>/control`
- Member status topic: `tenants/<tenant_id>/devices/<device_id>/sensors`

For a real paired member device, set these constants in the `.ino` file:

```cpp
const char* DEVICE_ID = "GREENCROP01";
const char* PAIRING_CODE = "123456";
```

Use the constants in the `.ino` file when pairing from the web.

After a successful web pairing, the web app publishes a pairing acknowledgement to:

```text
greencrop/devices/<device_id>/pairing
```

The board then replies on:

```text
greencrop/devices/<device_id>/pairing/status
```

## Serial Monitor

Open Serial Monitor at `9600` baud. Check `Pump1 Block`:

- `READY`: pump 1 should be ON.
- `LOCKED`: system is locked.
- `WLS2_FULL`: tank 1 is already full.
- `WLS1_DRY`: lower water sensor is not active.
- `PH_OUT_OF_RANGE`: only appears if `PUMP1_REQUIRES_PH_OK` is set to `true`.
