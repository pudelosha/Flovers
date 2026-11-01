# Device pump duration

`ReadingDevice.pump_duration_seconds` is an owner-editable integer from 1 to 300.
New devices default to 20 seconds. Migration `readings.0010` gives existing devices
30 seconds, preserving the previous generated-sketch default. Partial updates by
older app clients leave the saved value unchanged. Shared viewers cannot edit it.

Both code download and code email pass this saved value to `generate_arduino_code`.
The generated `PUMP_RUN_MS` constant is the saved number of seconds multiplied by
1000. Changing the app setting does not remotely change an uploaded sketch: the
owner must generate and upload the code again. Automatic watering uses this
compiled constant. A manual job with an explicit `duration_seconds` continues to
use its own 1-300 second duration. The Schedule watering form defaults to 20 seconds
on each opening, independently of the device default. Requests from legacy clients
that omit a duration retain the existing board-code fallback behavior.

Updated firmware includes its actual compiled duration in automatic claim requests.
The server validates this optional value and reserves cooldown plus the actual run
time, including when saved settings have changed since the firmware was uploaded.
Older firmware can omit it and retains the previous 30-second safety allowance.
Automatic jobs still do not use the manual task duration field. Existing delivery
retry protection and persistent board cooldown records remain in place.

Deploy the migration and backend before distributing the updated mobile app or
requesting freshly generated code. The existing deployment pipeline applies the
migration automatically. Existing uploaded sketches continue to run their compiled
duration until replaced; no device flash happens automatically.
