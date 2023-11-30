import ts_preset from 'ts-jest/jest-preset.js'
import puppeteer_preset from 'jest-puppeteer/jest-preset.js'
import esm_preset from 'ts-jest/presets/default-esm/jest-preset.js'

export default Object.assign(ts_preset, puppeteer_preset, esm_preset)
