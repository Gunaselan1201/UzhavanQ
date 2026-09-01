import { test, expect } from '@playwright/test'

// Why this matters: this is the other half of "reduce waiting time" — a
// centre officer needs to see their queue and communicate real delays
// back to farmers quickly, or the countdown/status the farmer sees is
// just as unreliable as having no system at all.

test('admin login -> sees only own-centre bookings -> marks one delayed -> UI reflects it', async ({ page, request }) => {
    // Seed a fresh, known booking directly via the API so this test doesn't
    // depend on whatever happens to already be in the dev database.
    const slotDateTime = new Date()
    slotDateTime.setDate(slotDateTime.getDate() + 2) // safely in the future
    slotDateTime.setHours(11, 30, 0, 0)

    const bookingRes = await request.post('http://localhost:5000/api/bookings', {
        data: {
            farmerName: 'E2E Test Farmer',
            phone: '+91 90000 09999',
            location: 'Test Location',
            produce: 'Onion',
            weight: 3,
            centre: 'namakkal-coop',
            slotDateTime: slotDateTime.toISOString(),
        },
    })
    expect(bookingRes.ok()).toBe(true)
    const booking = await bookingRes.json()

    await page.goto('/admin/login')
    await page.locator('input[type="text"]').fill('NKL001')
    await page.locator('input[type="password"]').fill('Tngovnkl')
    await page.getByRole('button', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard$/)

    // filter to the booking's actual date so it's visible in the table
    const dateStr = slotDateTime.toISOString().slice(0, 10)
    await page.locator('.admin-date-filter input').fill(dateStr)
    await page.waitForTimeout(500)

    const row = page.locator('tr', { hasText: booking.token })
    await expect(row).toBeVisible()
    // every visible row belongs to this admin's own centre (namakkal-coop) —
    // the cross-centre boundary already has a dedicated backend test, this
    // just confirms the admin UI doesn't render anything from another centre
    await expect(page.locator('.admin-booking-table')).not.toContainText('salem-regulated')

    // mark it delayed by 20 minutes
    await row.getByRole('button', { name: 'Delay' }).click()
    await page.getByRole('button', { name: '20 min' }).click()
    await page.waitForTimeout(500)

    await expect(row.locator('.admin-status--delayed')).toBeVisible()
    await expect(row).toContainText('+20m')
})
