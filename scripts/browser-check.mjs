import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

await mkdir('.test-artifacts', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const errors = []
const monitor = page => {
  page.on('pageerror', e => errors.push(e.stack))
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
}
const state = page => page.evaluate(async () => {
  const { useGameStore } = await import('/src/game/store.ts')
  const s = useGameStore.getState()
  return { phase: s.phase, position: s.position, speed: s.speed, heading: s.heading, nearbyZone: s.nearbyZone, active: s.activeZone, target: s.travelTarget, visited: s.visited }
})
const action = (page, name, value) => page.evaluate(async ({ name, value }) => {
  const { useGameStore } = await import('/src/game/store.ts')
  useGameStore.getState()[name](value)
}, { name, value })
const waitState = async (page, predicate, timeout = 30000) => {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (predicate(await state(page))) return
    await page.waitForTimeout(100)
  }
  assert.fail(`Timed out waiting for ${predicate}: ${JSON.stringify(await state(page))}`)
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  monitor(page)
  await page.goto('http://127.0.0.1:5173')
  await page.getByRole('button', { name: "Let's explore" }).waitFor({ timeout: 90000 })
  await page.waitForTimeout(4000)
  await page.screenshot({ path: '.test-artifacts/desktop-start.png' })
  await action(page, 'setQuality', 'low')
  await page.getByRole('button', { name: "Let's explore" }).click()
  await page.keyboard.down('w')
  await waitState(page, s => s.nearbyZone === 'about')
  await page.keyboard.up('w')
  await page.keyboard.down('Space')
  await waitState(page, s => s.speed < 2)
  await page.keyboard.up('Space')
  console.log('Driving and braking:', await state(page))
  await page.screenshot({ path: '.test-artifacts/desktop-drive.png' })
  await page.keyboard.press('e')
  assert.equal((await state(page)).active, 'about')
  await page.keyboard.press('Escape')
  assert.equal((await state(page)).active, null)
  await page.getByRole('button', { name: 'Pause and settings' }).click()
  assert.equal((await state(page)).phase, 'paused')
  await page.getByRole('button', { name: 'Continue exploring' }).click()
  await page.keyboard.press('e')
  assert.equal((await state(page)).active, 'about', 'Keyboard should work after menu focus restores')
  for (const zone of ['about', 'experience', 'skills', 'projects', 'cloud', 'contact']) {
    await action(page, 'openZone', zone)
    await page.waitForTimeout(2200)
    await page.screenshot({ path: `.test-artifacts/exhibit-${zone}.png` })
    await page.getByRole('button', { name: 'Read exhibit text' }).click()
    const expected = { about: 'Ajay Vemala', experience: 'Luvetha Tech Solutions', skills: 'React.js', projects: 'Upanaya HRMS', cloud: 'Azure', contact: 'ajayvemala@gmail.com' }
    assert.ok((await page.getByRole('dialog').innerText()).includes(expected[zone]), `${zone} reader displays its content`)
    await page.getByRole('button', { name: 'Close reading view' }).click()
    if (zone === 'projects') {
      await page.getByRole('button', { name: 'Next project', exact: true }).click()
      await page.waitForTimeout(700)
      await page.screenshot({ path: '.test-artifacts/project-next.png' })
    }
  }
  assert.equal((await state(page)).visited.length, 6)
  await page.getByRole('button', { name: 'Back to exploring' }).click()
  await page.getByRole('button', { name: 'Open world map' }).click()
  await page.getByRole('button', { name: /Cloud Station/ }).click()
  assert.equal((await state(page)).target, 'cloud')
  await action(page, 'restart')
  await page.keyboard.down('w')
  await page.waitForTimeout(12000)
  const collision = await state(page)
  await page.keyboard.up('w')
  assert.ok(collision.position[0] > -65 && collision.position[0] < -30, 'Car stays within the island')
  assert.ok(collision.position[1] > 0, 'Suspension supports the chassis above the ground')
  assert.ok(collision.speed < 3, 'Collider stops forward movement')
  console.log('Collision:', collision)
  await action(page, 'restart')
  await page.keyboard.down('s')
  await waitState(page, s => s.position[0] > -1)
  await page.keyboard.up('s')
  await action(page, 'restart')
  await page.keyboard.down('w')
  await page.keyboard.down('a')
  await waitState(page, s => Math.abs(s.heading - Math.PI / 2) > .25)
  await page.keyboard.up('w')
  await page.keyboard.up('a')
  console.log('Reverse and steering: PASS')
  await page.close()

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  monitor(mobile)
  await mobile.goto('http://127.0.0.1:5173')
  await mobile.getByRole('button', { name: "Let's explore" }).waitFor({ timeout: 90000 })
  await mobile.waitForTimeout(2000)
  await mobile.screenshot({ path: '.test-artifacts/mobile-start.png' })
  await mobile.getByRole('button', { name: "Let's explore" }).tap()
  const pedal = await mobile.getByRole('button', { name: 'Accelerate', exact: true }).boundingBox()
  assert.ok(pedal)
  const touch = await mobile.context().newCDPSession(mobile)
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pedal.x + pedal.width / 2, y: pedal.y + pedal.height / 2 }] })
  await waitState(mobile, s => s.speed > 10)
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await mobile.screenshot({ path: '.test-artifacts/mobile-drive.png' })
  await action(mobile, 'openZone', 'projects')
  await mobile.waitForTimeout(2200)
  await mobile.getByRole('button', { name: 'Read exhibit text' }).tap()
  assert.ok(await mobile.getByRole('heading', { name: 'Upanaya HRMS' }).isVisible())
  await mobile.waitForTimeout(400)
  const readerBounds = await mobile.getByRole('dialog').boundingBox()
  assert.ok(readerBounds.x >= 0 && readerBounds.x + readerBounds.width <= 390, 'Reading dialog fits the phone screen')
  await mobile.screenshot({ path: '.test-artifacts/mobile-reader.png' })
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const resume = await mobile.request.get('http://127.0.0.1:5173/assets/ajay-vemala-resume.pdf')
  assert.equal(resume.status(), 200)
  assert.ok((await resume.body()).subarray(0, 4).toString() === '%PDF')
  assert.deepEqual(errors, [])
  console.log('PASS: desktop driving, braking, proximity interaction, menus, six exhibits, map, collision, mobile controls, reader, resume and asset/runtime checks.')
} finally {
  await browser.close()
}
