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

This firmware follows the latest wiring:

- `D1`: WLS1 lower water level sensor.
- `D6`: WLS2 upper water level sensor.
- `GPIO3/RX`: float switch input.
- `D2`: Start button.
- `D5`: Stop NC button.
- `D4`: pump 1 relay.
- `D0`: pump 2 relay + yellow light.
- `D7`: green light.
- `D3`: red light.
- `D8`: ISD1820 sound trigger.

Commands from the web:

- `START`: starts pump 2 if the board is not locked.
- `STOP`: stops all outputs and locks the board.

Unlock condition:

- The board unlocks only when WLS2 detects water.

Important hardware note:

- `GPIO3/RX` is used as the float switch input, so this firmware does not use `Serial.begin()` or Serial Monitor.
- `D3`, `D4`, and `D8` are ESP8266 boot-sensitive pins.
- If upload or boot fails, disconnect relays/switches from boot-sensitive pins during upload or move those signals to safer pins.

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

Because `GPIO3/RX` is used by the float switch, the board does not print these values in Serial Monitor.
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

Do not use Serial Monitor with this wiring because `GPIO3/RX` is used by the float switch.
