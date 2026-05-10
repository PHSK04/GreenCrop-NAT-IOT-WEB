# GreenCrop NodeMCU MQTT Firmware

Open `greencrop_nodemcu_mqtt.ino` with Arduino IDE, or use VS Code with the Arduino extension.

## VS Code setup

This repo includes `.vscode/arduino.json` for:

- Sketch: `firmware/greencrop_nodemcu_mqtt/greencrop_nodemcu_mqtt.ino`
- Board: `NodeMCU 1.0 (ESP-12E Module)`

In VS Code:

1. Install recommended extensions when prompted.
2. Install Arduino IDE or `arduino-cli`.
3. Install ESP8266 board package.
4. Install `PubSubClient`.
5. Select the serial port from the Arduino extension, or edit `.vscode/arduino.json`.

## Required Arduino setup

1. Install ESP8266 board package.
2. Select `NodeMCU 1.0 (ESP-12E Module)`.
3. Install `PubSubClient`.
4. Edit Wi-Fi credentials in the `.ino` file.
5. Upload to the NodeMCU.

## Current control logic

This firmware follows the latest two-system wiring:

- `A0`: WLS1 analog, `analogRead(A0) > 300` means water detected.
- `D1`: WLS2 digital.
- `D2`: Start 1 button.
- `D3`: Start 2 button.
- `D4`: danger float switch.
- `D5`: Stop NC button.
- `D6`: pump 1 relay.
- `D7`: green light 1.
- `D0`: yellow light 1.
- `D8`: green light 2.
- `GPIO1/TX`: yellow light 2.
- `GPIO3/RX`: red light + sound alarm.

Commands from the web:

- `START` or `START1`: starts system 1 if the board is not locked.
- `START2`: starts system 2 if the board is not locked.
- `STOP`: stops both systems and locks the board.

Unlock condition:

- The board unlocks only when WLS2 detects water.

Important hardware note:

- `D3`, `D4`, and `D8` are ESP8266 boot-sensitive pins.
- `GPIO1/TX` and `GPIO3/RX` are also used by Serial Monitor and upload/debug.
- If upload or boot fails, disconnect relays/switches from those pins during upload or move those signals to safer pins.

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

The board prints these values in Serial Monitor at `115200`.

After a successful web pairing, the web app publishes a pairing acknowledgement to:

```text
greencrop/devices/<device_id>/pairing
```

The board then prints:

```text
GreenCrop Pairing Complete
Status: PAIRED
```

## Serial Monitor

Use baud rate `115200`.
