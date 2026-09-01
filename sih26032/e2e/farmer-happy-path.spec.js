import { test, expect } from '@playwright/test'

// Why this matters: this is the entire reason the app exists — a farmer
// getting from "I need to sell my produce" to "I have a real, scannable
// token and I know when to show up" without ever having to call anyone
// or wait in an unscheduled line.

test.describe('farmer happy path', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test('language select -> mock OTP login -> produce -> form -> future slot -> booked -> token with QR', async ({ page }) => {
        // fresh session: no farmerPhone yet, so / redirects to /language
        await expect(page).toHaveURL(/\/language$/)
        await page.getByRole('button', { name: 'English' }).click()
        await expect(page).toHaveURL(/\/login$/)

        // mock OTP login
        const phoneDigits = String(9000000000 + Math.floor(Math.random() * 99999999))
        await page.locator('.phone-input').fill(phoneDigits)
        await page.locator('.login-submit-btn').click()
        await expect(page).toHaveURL(/\/login\/otp$/)

        // the app displays its own mock OTP to itself (OtpNotification) and
        // also keeps it in sessionStorage — read it back rather than guessing
        const code = await page.evaluate(() => sessionStorage.getItem('pendingOtpCode'))
        for (const digit of code) await page.keyboard.type(digit)
        await page.locator('.login-submit-btn').click()

        // lands on homepage, logged in
        await expect(page).toHaveURL('http://localhost:5173/')
        await expect(page.locator('.hero-title')).toBeVisible()

        // select a produce card
        await page.locator('.produce-card').first().click()
        await expect(page).toHaveURL(/\/register\/.+$/)

        // form page: weight + location are the only editable fields
        await page.locator('input[type="number"]').fill('5')
        await page.locator('input[placeholder]:not([type="number"])').fill('Mohanur')
        await page.getByRole('button', { name: /Next/i }).click()
        await expect(page).toHaveURL(/\/slot$/)

        // pick a centre, then a FUTURE date (tomorrow) so no slot is disabled by "past"
        await page.locator('.form-select').selectOption('namakkal-coop')
        await page.locator('.datepicker-field').click()
        const openDays = page.locator('.datepicker-day--open')
        await expect(openDays.first()).toBeVisible()
        // pick the 2nd open day if there is one (tomorrow), else the 1st (today)
        const dayCount = await openDays.count()
        await openDays.nth(dayCount > 1 ? 1 : 0).click()

        // pick the first non-disabled slot chip
        const bookableChip = page.locator('.slot-chip:not(.slot-chip--disabled)').first()
        await expect(bookableChip).toBeVisible({ timeout: 10000 })
        await bookableChip.click()

        await page.getByRole('button', { name: /Book/i }).click()
        await expect(page).toHaveURL(/\/booked$/, { timeout: 10000 })

        // booked screen auto-redirects after a few seconds, but "View Token"
        // does it immediately — deterministic and faster than waiting it out
        await page.getByRole('button', { name: /View Token/i }).click()
        await expect(page).toHaveURL(/\/confirm$/)
        await expect(page.locator('.token-card')).toBeVisible()

        // flip to QR
        await page.locator('.token-card').click()
        await expect(page.locator('.token-qr svg')).toBeVisible()
        await expect(page.locator('.token-qr-label')).toBeVisible()

        // flip back
        await page.locator('.token-card').click()
        await expect(page.locator('.token-number')).toBeVisible()
    })
})
