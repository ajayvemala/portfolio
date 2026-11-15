import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

await mkdir('.test-artifacts', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', error => errors.push(error.stack || error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' })
  await page.locator('.loading-screen').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('canvas').waitFor({ timeout: 90000 })
  await page.locator('.loading-screen').waitFor({ state: 'detached', timeout: 90000 })
  await page.getByRole('button', { name: 'Pause and settings' }).waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Pause and settings' }).click()
  await page.locator('#lighting').selectOption('night')
  await page.locator('#weather').selectOption('rain')
  await page.getByRole('button', { name: 'Continue exploring' }).click()
  await page.waitForTimeout(2500)
  const frameRate = await page.evaluate(() => new Promise(resolve => {
    let frames = 0
    const start = performance.now()
    const tick = (now) => { frames++; if (now - start >= 1200) resolve(Math.round(frames * 1000 / (now - start))); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }))
  console.log(`Desktop night/rain preview: ${frameRate} FPS`)
  await page.screenshot({ path: '.test-artifacts/production-night-rain.png' })
  await page.getByRole('button', { name: 'Pause and settings' }).click()
  assert.equal(await page.locator('#lighting').inputValue(), 'night')
  assert.equal(await page.locator('#weather').inputValue(), 'rain')
  await page.getByRole('button', { name: 'Continue exploring' }).click()
  await page.getByRole('button', { name: 'Open world map' }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Close menu' }).click()

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  mobile.on('pageerror', error => errors.push(error.stack || error.message))
  mobile.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  mobile.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await mobile.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' })
  await mobile.locator('canvas').waitFor({ timeout: 90000 })
  await mobile.locator('.loading-screen').waitFor({ state: 'detached', timeout: 90000 })
  await mobile.getByRole('button', { name: 'Pause and settings' }).waitFor({ timeout: 30000 })
  await mobile.getByRole('button', { name: 'Pause and settings' }).click()
  await mobile.locator('#lighting').selectOption('night')
  await mobile.locator('#weather').selectOption('rain')
  await mobile.getByRole('button', { name: 'Continue exploring' }).click()
  await mobile.waitForTimeout(1500)
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await mobile.screenshot({ path: '.test-artifacts/production-mobile-night-rain.png' })
  await mobile.close()
  assert.deepEqual(errors, [])
  console.log('PASS: production canvas, night/rain settings, map, mobile layout, no browser errors.')
} finally {
  await browser.close()
}
