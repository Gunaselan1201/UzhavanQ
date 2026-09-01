import { test, expect } from '@playwright/test'

// Why this matters: a farmer who's allowed to "book" a slot that already
// started arrives to find no queue waiting for them — the exact
// "uncertainty about procurement status" the problem statement calls out.

test('a farmer cannot select a time slot earlier than the current time on today\'s date', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
        sessionStorage.setItem('farmerPhone', '+91 90000 00001')
        sessionStorage.setItem('farmerLanguage', 'en')
    })
    await page.goto('/register/onion')
    await page.locator('input[type="number"]').fill('5')
    await page.locator('input[placeholder]:not([type="number"])').fill('Mohanur')
    await page.getByRole('button', { name: /Next/i }).click()
    await expect(page).toHaveURL(/\/slot$/)

    await page.locator('.form-select').selectOption('namakkal-coop')
    await page.locator('.datepicker-field').click()
    // the FIRST open day is always today (minDate is today) — pick it
    // specifically to test "today", not "tomorrow"
    await page.locator('.datepicker-day--open').first().click()
    await page.waitForTimeout(400)

    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const chips = page.locator('.slot-chip')
    const count = await chips.count()
    for (let i = 0; i < count; i += 1) {
        const chip = chips.nth(i)
        const label = (await chip.textContent()).trim()
        const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label)
        if (!match) continue
        let hours = Number(match[1]) % 12
        if (match[3].toUpperCase() === 'PM') hours += 12
        const slotMinutes = hours * 60 + Number(match[2])

        const isDisabled = await chip.isDisabled()
        if (slotMinutes < nowMinutes) {
            expect(isDisabled, `${label} is earlier than now (${now.getHours()}:${now.getMinutes()}) and must be disabled`).toBe(true)
        }
    }
})
