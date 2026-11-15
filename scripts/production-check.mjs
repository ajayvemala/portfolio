import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()) })
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: "Let's explore" }).waitFor({ timeout: 90000 })
  await page.getByRole('button', { name: "Let's explore" }).click()
  await page.getByRole('button', { name: 'Pause and settings' }).click()
  await page.getByLabel('Visual quality').selectOption('low')
  await page.getByRole('button', { name: 'Continue exploring' }).click()
  await page.waitForTimeout(1500)
  assert.ok(await page.locator('canvas').isVisible())
  assert.deepEqual(errors, [])
  console.log('PASS: production bundle loads, enters the world, and opens settings without missing assets or runtime errors.')
} finally { await browser.close() }
