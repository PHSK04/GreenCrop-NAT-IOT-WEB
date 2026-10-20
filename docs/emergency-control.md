# Emergency control integration (prepared; hardware connection pending)

The dashboard mode selector only enables/disables web buttons; it does not change the physical selector. Auto disables action buttons; Manual enables them unless a safety lock is active. Emergency locks actions and the mode selector immediately. The shared MachineContext blocks further commands, including a start waiting for gateway preparation. The local lock is persisted per account/device and cannot be cleared by switching mode, reloading or losing connection.

The agreed recovery is: release the physical Emergency button, press Reset at the cabinet, then receive fresh status from the device. The web never sends an unlock command and must not restart the pump automatically.

The prepared receiver uses the existing `locked` telemetry field:

1. Device confirms `locked: true` with a timestamp after the web stop request (or reports a hardware-originated lock).
2. While stopped, the firmware must reject Start and all normal control commands and keep outputs stopped, regardless of Manual/Auto selector changes.
3. Only after physical release **and** cabinet Reset, the firmware may publish `locked: false` with a newer timestamp. This releases the web latch; Auto still keeps web actions disabled.
4. Old, missing or unconfirmed lock telemetry must not clear the web latch.

Current `greencrop_web_telemetry.ino` sends sensor values only and declares Emergency as a hardware power cut with no GPIO feedback. It cannot confirm stop/reset to the web yet. No pins have been invented or firmware flashed in this change. GPIO feedback (or another real cabinet status channel), reset detection, command subscription and acknowledgement must be implemented and tested on the actual cabinet before claiming end-to-end emergency control. A network disconnect alone is not evidence of Emergency Stop.

Validation: `node --test scripts/tests/emergency-interlock.test.mjs` covers stale packets, missing fields, persisted requests and the locked-to-unlocked confirmation sequence. This does not validate physical stopping hardware.
