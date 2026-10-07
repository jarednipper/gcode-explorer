import { describe, expect, it } from 'vitest'
import { explainGcodeLine, isGcodeFile } from './gcode'

describe('explainGcodeLine', () => {
  it('explains common motion commands and their axes', () => {
    expect(explainGcodeLine('G1 X10 Y20 E0.4 F1800')).toBe(
      'Move along X, Y, E, with extrusion or retraction; F sets the feed rate.',
    )
  })

  it('explains Marlin and Klipper motion settings with parameter values', () => {
    expect(explainGcodeLine('M204 P2400 T3000')).toBe(
      'Set motion acceleration: P acceleration 2400 mm/s², T acceleration 3000 mm/s².',
    )
    expect(explainGcodeLine('M204 S10000')).toContain(
      'S acceleration 10000 mm/s²',
    )
    expect(explainGcodeLine('M201 X1000 Y1200 E5000')).toBe(
      'Maximum acceleration: X 1000 mm/s², Y 1200 mm/s², E 5000 mm/s².',
    )
    expect(explainGcodeLine('M203 X300 Y300 Z10 E25')).toBe(
      'Maximum feed rate: X 300 units/s, Y 300 units/s, Z 10 units/s, E 25 units/s.',
    )
    expect(explainGcodeLine('M205 X9.0 J0.02')).toContain(
      'X jerk 9.0, junction deviation 0.02',
    )
  })

  it('explains temperature, dwell, fan, and tool-change parameters', () => {
    expect(explainGcodeLine('M109 R210')).toBe(
      'Set hotend target to 210°C, waiting for heating or cooling.',
    )
    expect(explainGcodeLine('M140 S60')).toBe('Set heated bed target to 60°C.')
    expect(explainGcodeLine('G4 P250')).toBe('Pause movement for 250 ms.')
    expect(explainGcodeLine('M106 P2 S128')).toBe(
      'Set fan 2 speed to 128 (commonly 0–255).',
    )
    expect(explainGcodeLine('T1')).toBe('Select tool 1.')
  })

  it('explains G150 nozzle cleaning and filament retraction commands', () => {
    expect(explainGcodeLine('G150.1')).toBe(
      'Wipe the nozzle against the silicone wiper.',
    )
    expect(explainGcodeLine('G150.2')).toBe(
      'Retract filament from the PTFE tube and extruder area.',
    )
    expect(explainGcodeLine('G150.3')).toBe(
      'Move the nozzle over the trash bin/wiper module.',
    )
  })

  it('explains common Klipper extended commands and their settings', () => {
    expect(explainGcodeLine('SET_VELOCITY_LIMIT VELOCITY=200 ACCEL=3000')).toBe(
      'Klipper: Set maximum velocity 200, maximum acceleration 3000.',
    )
    expect(
      explainGcodeLine('SET_PRESSURE_ADVANCE EXTRUDER=extruder ADVANCE=0.04'),
    ).toBe('Klipper: Set pressure advance 0.04 for extruder extruder.')
    expect(
      explainGcodeLine('SET_HEATER_TEMPERATURE HEATER=extruder TARGET=210'),
    ).toBe('Klipper: Set extruder target to 210°C.')
    expect(explainGcodeLine('BED_MESH_CALIBRATE')).toContain(
      'generate an active bed mesh',
    )
  })

  it('labels blank lines and comments without repeating their contents', () => {
    expect(explainGcodeLine('')).toBe('[blank line]')
    expect(explainGcodeLine('   ')).toBe('[blank line]')
    expect(explainGcodeLine('; FEATURE: Outer wall')).toBe('[comment]')
    expect(explainGcodeLine('; layer_height = 0.2')).toBe('[comment]')
    expect(explainGcodeLine('  ; arbitrary comment')).toBe('[comment]')
  })

  it('explains Bambu AMS, conditional, and vendor-specific commands', () => {
    expect(explainGcodeLine('M620 M ;enable remap')).toBe(
      'Enable Bambu AMS/tool remapping.',
    )
    expect(explainGcodeLine('M620.10 A0 F548.788')).toBe(
      'Set filament-change extrusion and flushing parameters.',
    )
    expect(explainGcodeLine('M620 S0A')).toBe(
      'Start a conditional AMS filament-selection block, closed by M621.',
    )
    expect(explainGcodeLine('M622 J1')).toBe(
      'Continue the M622 conditional block when the last checked firmware flag is true; otherwise skip to M623.',
    )
    expect(explainGcodeLine('M623')).toBe(
      'End the conditional block opened by M622.',
    )
    expect(explainGcodeLine('G389')).toBe(
      'Undocumented Bambu-specific firmware command.',
    )
  })

  it('explains Bambu printer display actions and firmware flags', () => {
    expect(explainGcodeLine('M1002 gcode_claim_action : 2')).toBe(
      'Set the printer display action to 2 (show heated-bed preheating).',
    )
    expect(explainGcodeLine('M1002 gcode_claim_action : 29')).toBe(
      'Set the printer display action to 29.',
    )
    expect(explainGcodeLine('M1002 judge_flag g29_before_print_flag')).toBe(
      'Check the Bambu firmware flag “g29_before_print_flag”; a following M622 uses the result to branch.',
    )
    expect(explainGcodeLine('M1002 set_filament_type:PLA')).toBe(
      'Tell the firmware the active filament type is PLA.',
    )
  })

  it('does not repeat inline comments in command explanations', () => {
    expect(explainGcodeLine('M106 S255 ; turn on fan')).toBe(
      'Set fan speed to 255 (commonly 0–255).',
    )
  })

  it('recognizes common G-code file extensions', () => {
    expect(isGcodeFile('print.GCODE')).toBe(true)
    expect(isGcodeFile('print.txt')).toBe(false)
  })
})
