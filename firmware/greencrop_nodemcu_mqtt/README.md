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
