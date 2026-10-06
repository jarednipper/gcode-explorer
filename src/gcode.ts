const knownCommands: Record<string, string> = {
  G0: 'Move rapidly to a position without printing.',
  G1: 'Move in a straight line; E controls extrusion and F sets feed rate.',
  G2: 'Move clockwise along an arc.',
  G3: 'Move counterclockwise along an arc.',
  G4: 'Pause for the specified duration (P is milliseconds; S is seconds).',
  G10: 'Retract filament using firmware-configured retraction settings (firmware-dependent).',
  G11: 'Recover filament using firmware-configured retraction settings (firmware-dependent).',
  G17: 'Select the XY plane for arc moves.',
  G18: 'Select the ZX plane for arc moves.',
  G19: 'Select the YZ plane for arc moves.',
  G20: 'Use inches for distance units.',
  G21: 'Use millimeters for distance units.',
  G28: 'Home one or more axes (or all axes if none are specified).',
  G29: 'Run the configured bed-leveling procedure (firmware-dependent).',
  G30: 'Probe a single point on the bed (if supported by the firmware).',
  G53: 'Interpret the following move in machine coordinates.',
  G90: 'Use absolute coordinates for positioning.',
  G91: 'Use relative coordinates for positioning.',
  G92: 'Set the current position without moving the machine.',
  'G150.1': 'Wipe the nozzle against the silicone wiper.',
  'G150.2': 'Retract filament from the PTFE tube and extruder area.',
  'G150.3': 'Move the nozzle over the trash bin/wiper module.',
  M0: 'Pause the print until the user resumes it.',
  M1: 'Request an optional or interruptible pause (firmware-dependent).',
  M17: 'Enable the stepper motors.',
  M18: 'Disable the stepper motors.',
  M82: 'Use absolute positioning for extrusion.',
  M83: 'Use relative positioning for extrusion.',
  M84: 'Disable one or more stepper motors.',
  M85: 'Set the maximum inactive time before the printer shuts down.',
  M92: 'Set steps per unit for one or more axes.',
  M104: 'Set the hotend target temperature without waiting.',
  M105: 'Request the current temperature report.',
  M106: 'Set a fan speed.',
  M107: 'Turn off a fan.',
  M108: 'Cancel a heater wait or pause (firmware-dependent).',
  M109: 'Set the hotend target temperature and wait for it to be reached.',
  M112: 'Immediately stop the printer with an emergency stop.',
  M114: 'Report the current or last-planned position.',
  M115: 'Report firmware identification and capabilities.',
  M117: 'Show a message on the printer display.',
  M118: 'Send a message to the host or printer console (firmware-dependent).',
  M119: 'Report the current endstop states.',
  M140: 'Set the heated-bed target temperature without waiting.',
  M150: 'Set the RGB(W) LED color (if supported by the firmware).',
  M190: 'Set the heated-bed target temperature and wait for it to be reached.',
  M201: 'Set maximum acceleration limits for one or more axes.',
  M203: 'Set maximum feed rates for one or more axes.',
  M204: 'Set motion acceleration for print, travel, or retract moves.',
  M205: 'Set motion limits such as jerk, junction deviation, and minimum feed rates.',
  M206: 'Set persistent offsets from the configured home position.',
  M207: 'Configure firmware-based retract length and speed.',
  M208: 'Configure additional firmware-based recover length and speed.',
  M220: 'Set the print speed percentage.',
  M221: 'Set the extrusion flow percentage.',
  M300: 'Play a tone for a specified frequency and duration (if supported).',
  M400: 'Wait for queued movement to finish.',
  M500: 'Save configurable settings to nonvolatile storage (if supported).',
  M501: 'Load configurable settings from nonvolatile storage (if supported).',
  M502: 'Reset configurable settings to firmware defaults.',
  M503: 'Report the current configurable settings.',
  M600: 'Pause for a filament change, then resume the print (if supported).',
  M701: 'Load filament using the configured load procedure (if supported).',
  M702: 'Unload filament using the configured unload procedure (if supported).',
  M73: 'Set print progress and/or estimated time remaining.',
  G389: 'Undocumented Bambu-specific firmware command.',
  M620: 'AMS filament-selection or remapping command.',
  'M620.1': 'Set extrusion parameters for an AMS filament load or unload.',
  'M620.3': 'Enable or configure AMS filament-tangle detection.',
  'M620.6': 'Configure AMS air-printing detection.',
  'M620.10': 'Set filament-change extrusion and flushing parameters.',
  'M620.11': 'Configure long-retraction behavior when cutting filament.',
  M621: 'End the AMS selection block opened by M620.',
  M622: 'Run or skip a conditional block according to the last M1002 flag check.',
  'M622.1': 'Configure a Bambu conditional-execution compatibility mode.',
  M623: 'End the conditional block opened by M622.',
  M628: 'Undocumented Bambu-specific firmware command',
  M629: 'Undocumented Bambu-specific firmware command.',
  M630: 'Undocumented Bambu-specific firmware command.',
  M960: 'Turn a Bambu printer light on or off.',
  'M970.2': 'Configure a Bambu-specific printer subsystem.',
  'M970.3': 'Configure a Bambu-specific printer subsystem.',
  M971: 'Capture an image, commonly used for timelapse.',
  M972: 'Configure a Bambu-specific printer subsystem.',
  M974: 'Configure a Bambu-specific printer subsystem.',
  M975: 'Enable or configure vibration suppression.',
  M976: 'Run a Bambu print-bed or first-layer scan.',
  M981: 'Enable or disable the spaghetti-detection feature.',
  'M982.2': 'Enable or configure motor cog-noise reduction.',
  'M983.1': 'Configure Bambu extrusion-calibration behavior.',
  'M983.3': 'Calibrate dynamic extrusion compensation.',
  'M983.4': 'Configure Bambu extrusion-calibration behavior.',
  'M985.1': 'Configure a Bambu-specific printer subsystem.',
  M991: 'Notify the printer of a layer change or timelapse event.',
  M993: 'Configure nozzle-camera detection behavior.',
  M1002: 'Set a Bambu printer display action or firmware flag.',
  M1003: 'Enable or disable power-loss recovery.',
  M1004: 'Control the external camera shutter.',
  M1006: 'Play a tone or melody using the stepper motors.',
  M1010:
    'Undocumented Bambu-specific firmware tuning command.',
  'M1010.1':
    'Undocumented Bambu-specific firmware tuning command.',
  'M1015.3': 'Enable or configure filament-clog detection.',
  'M1015.4': 'Enable or configure extrusion air-printing detection.',
  BED_MESH_CALIBRATE:
    'Probe the bed and generate an active bed mesh for movement compensation.',
  BED_MESH_PROFILE: 'Load, save, or remove a named bed-mesh profile.',
  CANCEL_PRINT: 'Cancel the current print using the configured cancel macro.',
  QUERY_ENDSTOPS: 'Report the current endstop states.',
  RESTORE_GCODE_STATE:
    'Restore a previously saved G-code coordinate and motion state.',
  SAVE_GCODE_STATE:
    'Save the current G-code coordinate and motion state under a name.',
  SET_FAN_SPEED: 'Set a configured fan to the requested speed.',
  SET_GCODE_OFFSET:
    'Adjust the coordinate offset applied to subsequent toolhead moves.',
  SET_HEATER_TEMPERATURE: 'Set a configured heater target temperature.',
  SET_PIN: 'Set the value of a configured output pin.',
  SET_PRESSURE_ADVANCE:
    'Set extruder pressure advance and optional smoothing parameters.',
  SET_SERVO: 'Set a configured servo angle or pulse width.',
  SET_VELOCITY_LIMIT:
    'Set motion limits for velocity, acceleration, and cornering.',
  TEMPERATURE_WAIT:
    'Wait until a configured sensor reaches the requested range.',
  TURN_OFF_HEATERS: 'Turn off all configured heaters.',
  PAUSE: 'Pause the print using the configured pause macro.',
  RESUME: 'Resume a paused print using the configured resume macro.',
}

function getParameter(parameters: string, name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return parameters.match(
    new RegExp(`(?:^|\\s)${escapedName}(-?\\d+(?:\\.\\d+)?)`, 'i'),
  )?.[1]
}

function describeAxisParameters(
  parameters: string,
  axes: string[],
  label: string,
  unit: string,
): string | undefined {
  const values = axes.flatMap((axis) => {
    const value = getParameter(parameters, axis)
    return value === undefined ? [] : [`${axis} ${value}${unit}`]
  })
  return values.length > 0 ? `${label}: ${values.join(', ')}.` : undefined
}

function explainMotionSettings(
  code: string,
  parameters: string,
): string | undefined {
  if (code === 'M201') {
    return describeAxisParameters(
      parameters,
      ['X', 'Y', 'Z', 'E'],
      'Maximum acceleration',
      ' mm/s²',
    )
  }

  if (code === 'M203') {
    return describeAxisParameters(
      parameters,
      ['X', 'Y', 'Z', 'E'],
      'Maximum feed rate',
      ' units/s',
    )
  }

  if (code === 'M204') {
    const settings = [
      ['P', 'P acceleration'],
      ['T', 'T acceleration'],
      ['R', 'retract acceleration'],
      ['S', 'S acceleration'],
    ].flatMap(([parameter, moveType]) => {
      const value = getParameter(parameters, parameter)
      return value === undefined ? [] : [`${moveType} ${value} mm/s²`]
    })
    return settings.length > 0
      ? `Set motion acceleration: ${settings.join(', ')}.`
      : 'Set motion acceleration limits'
  }

  if (code === 'M205') {
    const parameterMeanings = [
      ['X', 'X jerk'],
      ['Y', 'Y jerk'],
      ['Z', 'Z jerk'],
      ['E', 'extruder jerk'],
      ['J', 'junction deviation'],
      ['S', 'minimum print feed rate / jerk'],
      ['T', 'minimum travel feed rate / jerk'],
      ['B', 'minimum segment time'],
    ]
    const settings = parameterMeanings.flatMap(([parameter, meaning]) => {
      const value = getParameter(parameters, parameter)
      return value === undefined ? [] : [`${meaning} ${value}`]
    })
    return settings.length > 0
      ? `Set motion limits: ${settings.join(', ')}. Exact parameter support depends on firmware.`
      : 'Set motion limits such as jerk, junction deviation, and minimum feed rates.'
  }

  return undefined
}

function explainKlipperCommand(command: string): string | undefined {
  const explanation = knownCommands[command.toUpperCase()]
  return explanation ? `Klipper: ${explanation}` : undefined
}

function explainM1002(parameters: string): string | undefined {
  const normalized = parameters.trim()
  const action = normalized.match(/^gcode_claim_action\s*:\s*(\d+)/i)
  if (action) {
    const actionDescriptions: Record<string, string> = {
      '0': 'clear the printer status action',
      '1': 'show automatic bed leveling',
      '2': 'show heated-bed preheating',
      '4': 'show filament changing',
      '5': 'show a pause action',
    }
    const actionId = action[1]
    return `Set the printer display action to ${actionId}${actionDescriptions[actionId] ? ` (${actionDescriptions[actionId]})` : ''}.`
  }

  const flag = normalized.match(/^judge_flag\s+([A-Za-z0-9_]+)/i)
  if (flag) {
    return `Check the Bambu firmware flag “${flag[1]}”; a following M622 uses the result to branch.`
  }

  const filament = normalized.match(/^set_filament_type\s*:\s*(\S+)/i)
  if (filament) {
    return `Tell the firmware the active filament type is ${filament[1]}.`
  }

  const speed = normalized.match(/^set_gcode_claim_speed_level\s*:\s*(\d+)/i)
  if (speed) {
    return `Set the printer's displayed G-code speed level to ${speed[1]}.`
  }

  const setFlag = normalized.match(/^set_flag\s+([A-Za-z0-9_]+)\s*=\s*(\S+)/i)
  if (setFlag) {
    return `Set Bambu firmware flag “${setFlag[1]}” to ${setFlag[2]}.`
  }

  return undefined
}

function explainBambuCommand(
  code: string,
  parameters: string,
): string | undefined {
  if (code === 'M1002') return explainM1002(parameters)

  if (code === 'M620' && /^M(?:\s|$)/i.test(parameters)) {
    return 'Enable Bambu AMS/tool remapping.'
  }

  if (code === 'M620' && /^S[\d.+-]+A?(?:\s|$)/i.test(parameters)) {
    return 'Start a conditional AMS filament-selection block, closed by M621.'
  }

  if (code === 'M620' && /^[CRP]\s*/i.test(parameters)) {
    const operation = parameters.trimStart()[0].toUpperCase()
    const descriptions: Record<string, string> = {
      C: 'Calibrate the AMS.',
      R: 'Refresh AMS tray information.',
      P: 'Select an AMS tray.',
    }
    return descriptions[operation]
  }

  if (code === 'M622') {
    const branch = parameters.match(/(?:^|\s)J([01])(?:\s|$)/i)?.[1]
    if (branch) {
      return `Continue the M622 conditional block when the last checked firmware flag is ${branch === '1' ? 'true' : 'false'}; otherwise skip to M623.`
    }
  }

  if (code === 'M960') {
    const light = parameters.match(/(?:^|\s)S([45])(?:\s|$)/i)?.[1]
    const state = parameters.match(/(?:^|\s)P([01])(?:\s|$)/i)?.[1]
    if (light && state) {
      const name = light === '5' ? 'logo light' : 'nozzle light'
      return `Turn the toolhead ${name} ${state === '1' ? 'on' : 'off'}.`
    }
  }

  if (code === 'M981') {
    const state = parameters.match(/(?:^|\s)S([01])(?:\s|$)/i)?.[1]
    if (state) {
      return `${state === '1' ? 'Enable' : 'Disable'} Bambu spaghetti detection.`
    }
  }

  if (code === 'M1003') {
    const state = parameters.match(/(?:^|\s)S([01])(?:\s|$)/i)?.[1]
    if (state) {
      return `${state === '1' ? 'Enable' : 'Disable'} power-loss recovery.`
    }
  }

  if (code === 'M1015.3') {
    const state = parameters.match(/(?:^|\s)S([01])(?:\s|$)/i)?.[1]
    if (state) {
      return `${state === '1' ? 'Enable' : 'Disable'} filament-clog detection.`
    }
  }

  if (code === 'M1015.4') {
    const state = parameters.match(/(?:^|\s)S([01])(?:\s|$)/i)?.[1]
    if (state) {
      return `${state === '1' ? 'Enable' : 'Disable'} extrusion air-printing detection.`
    }
  }

  if (code === 'M73.2') {
    return "Adjust the printer's remaining-time display scale."
  }

  return undefined
}

function describeKlipperParameters(
  command: string,
  parameters: string,
): string | undefined {
  const values = [...parameters.matchAll(/(?:^|\s)([A-Z_]+)=([^\s]+)/gi)]
  const get = (name: string) =>
    values.find(([, key]) => key.toUpperCase() === name)?.[2]

  if (command === 'SET_VELOCITY_LIMIT') {
    const settings = [
      ['VELOCITY', 'maximum velocity'],
      ['ACCEL', 'maximum acceleration'],
      ['SQUARE_CORNER_VELOCITY', 'square-corner velocity'],
      ['MINIMUM_CRUISE_RATIO', 'minimum cruise ratio'],
    ].flatMap(([parameter, label]) => {
      const value = get(parameter)
      return value === undefined ? [] : [`${label} ${value}`]
    })
    if (settings.length > 0) return `Klipper: Set ${settings.join(', ')}.`
  }

  if (command === 'SET_PRESSURE_ADVANCE') {
    const extruder = get('EXTRUDER')
    const settings = [
      ['ADVANCE', 'pressure advance'],
      ['SMOOTH_TIME', 'smoothing time'],
    ].flatMap(([parameter, label]) => {
      const value = get(parameter)
      return value === undefined ? [] : [`${label} ${value}`]
    })
    if (settings.length > 0) {
      const target = extruder ? ` for extruder ${extruder}` : ''
      return `Klipper: Set ${settings.join(', ')}${target}.`
    }
  }

  if (command === 'SET_HEATER_TEMPERATURE') {
    const heater = get('HEATER')
    const target = get('TARGET')
    if (heater || target) {
      return `Klipper: Set ${heater ?? 'configured heater'} target${target ? ` to ${target}°C` : ''}.`
    }
  }

  if (command === 'SET_FAN_SPEED') {
    const fan = get('FAN')
    const speed = get('SPEED')
    if (fan || speed) {
      return `Klipper: Set ${fan ?? 'configured fan'} speed${speed ? ` to ${speed}` : ''}.`
    }
  }

  return undefined
}

export function explainGcodeLine(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return '[blank line]'

  if (trimmed.startsWith(';')) {
    return '[comment]'
  }

  const commentStart = line.indexOf(';')
  const commandText = (
    commentStart === -1 ? line : line.slice(0, commentStart)
  ).trim()
  if (!commandText && commentStart !== -1) return '[comment]'
  const extendedCommand = commandText.match(/^([A-Z_]+)(?:\s+(.*))?$/i)

  if (extendedCommand && !/^[GMT]\d/i.test(commandText)) {
    const commandName = extendedCommand[1].toUpperCase()
    const explanation =
      describeKlipperParameters(commandName, extendedCommand[2] ?? '') ??
      explainKlipperCommand(commandName)
    if (explanation) return explanation
  }

  const command = commandText.match(/^([GMT])(\d+(?:\.\d+)?)(.*)$/i)

  if (!command) {
    return 'Unrecognized or printer-specific GCODE line.'
  }

  const code = `${command[1].toUpperCase()}${command[2]}`
  const parameters = command[3].trim()
  const baseExplanation =
    explainBambuCommand(code, parameters) ??
    explainMotionSettings(code, parameters) ??
    knownCommands[code] ??
    (code[0] === 'T'
      ? `Select tool ${code.slice(1)}.`
      : `Unrecognized or printer-specific ${command[1].toUpperCase()}-code ${command[2]}.`)

  if (code === 'G1' && parameters) {
    const axes = [...parameters.matchAll(/(?:^|\s)([XYZE])(-?\d+(?:\.\d+)?)/gi)]
      .map((match) => match[1].toUpperCase())
      .join(', ')
    const movement = axes
      ? `Move along ${axes}${axes.includes('E') ? ', with extrusion or retraction' : ''}`
      : 'Move in a straight line'
    const feedRate = /(?:^|\s)F-?\d+(?:\.\d+)?/i.test(parameters)
      ? '; F sets the feed rate'
      : ''
    const explanation = `${movement}${feedRate}.`
    if (axes || feedRate) return explanation
  }

  if (code === 'G4') {
    const milliseconds = getParameter(parameters, 'P')
    const seconds = getParameter(parameters, 'S')
    if (milliseconds !== undefined || seconds !== undefined) {
      const duration =
        milliseconds !== undefined ? `${milliseconds} ms` : `${seconds} seconds`
      return `Pause movement for ${duration}.`
    }
  }

  if (code === 'M204' && !parameters) {
    return baseExplanation
  }

  if (code === 'M206') {
    const offsets = describeAxisParameters(
      parameters,
      ['X', 'Y', 'Z'],
      'Set home offset',
      ' units',
    )
    if (offsets) {
      return offsets
    }
  }

  if (code === 'M207' || code === 'M208') {
    const settings = [
      ['S', code === 'M207' ? 'retract length' : 'additional recover length'],
      ['W', 'additional swap length'],
      ['F', code === 'M207' ? 'retract feed rate' : 'recover feed rate'],
      ['Z', 'Z lift'],
    ].flatMap(([parameter, label]) => {
      const value = getParameter(parameters, parameter)
      return value === undefined ? [] : [`${label} ${value}`]
    })
    if (settings.length > 0) {
      const explanation = `${baseExplanation} ${settings.join(', ')}.`
      return explanation
    }
  }

  if (
    code === 'M104' ||
    code === 'M109' ||
    code === 'M140' ||
    code === 'M190'
  ) {
    const temperature =
      getParameter(parameters, 'S') ?? getParameter(parameters, 'R')
    if (temperature !== undefined) {
      const target =
        code === 'M104' || code === 'M109' ? 'hotend' : 'heated bed'
      const wait = code === 'M109' || code === 'M190'
      const coolingWait =
        code === 'M109' && getParameter(parameters, 'R') !== undefined
      const detail = coolingWait
        ? ', waiting for heating or cooling'
        : wait
          ? ', waiting for the target'
          : ''
      const explanation = `Set ${target} target to ${temperature}°C${detail}.`
      return explanation
    }
  }

  if (code === 'M220' || code === 'M221') {
    const percent = getParameter(parameters, 'S')
    if (percent !== undefined) {
      const target = code === 'M220' ? 'print speed' : 'extrusion flow'
      const explanation = `Set ${target} override to ${percent}%.`
      return explanation
    }
  }

  if (code === 'M106') {
    const speed = getParameter(parameters, 'S')
    const fan = getParameter(parameters, 'P')
    if (speed !== undefined) {
      const fanTarget = fan === undefined ? 'fan' : `fan ${fan}`
      return `Set ${fanTarget} speed to ${speed} (commonly 0–255).`
    }
  }

  return baseExplanation
}

export function isGcodeFile(fileName: string): boolean {
  return /\.(gcode|gco|gc|g)$/i.test(fileName)
}
