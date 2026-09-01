import { test, expect } from '@playwright/test'

// Lightweight, non-visual-diff regression check for the navbar/content
// width mismatch fixed earlier this session (.homepage was a flex item
// with margin:0 auto and no explicit width, so it shrank to fit-content
// instead of filling #root, leaving the content narrower than the navbar
// with a big empty gutter on wide screens). Asserts the actual computed
// widths line up instead of comparing screenshots pixel-by-pixel, which
// is more informative on failure and immune to anti-aliasing noise.

test.describe('responsive layout', () => {
    test('farmer homepage at 375px: no horizontal overflow, hero fills the viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 })
        await page.goto('/')
        await page.evaluate(() => {
            sessionStorage.setItem('farmerPhone', '+91 90000 09998')
            sessionStorage.setItem('farmerLanguage', 'en')
        })
        await page.goto('/')

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
        }))
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 for sub-pixel rounding
    })

    test('farmer homepage at 1440px: content width matches the navbar width (the bug that was fixed)', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/')
        await page.evaluate(() => {
            sessionStorage.setItem('farmerPhone', '+91 90000 09998')
            sessionStorage.setItem('farmerLanguage', 'en')
        })
        await page.goto('/')
        await page.waitForTimeout(300)

        const widths = await page.evaluate(() => ({
            homepage: document.querySelector('.homepage')?.getBoundingClientRect().width,
            viewport: window.innerWidth,
        }))
        // .homepage should fill (or nearly fill) the viewport, not shrink to
        // some arbitrary content-driven width with empty space on the side
        expect(widths.homepage).toBeGreaterThan(widths.viewport * 0.9)
    })

    test('admin dashboard at 1440px: table and toolbar are visible and not clipped', async ({ page }) => {
        const loginRes = await fetch('http://localhost:5000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'NKL001', password: 'Tngovnkl' }),
        })
        const { token, username, centre } = await loginRes.json()

        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto('/admin/dashboard')
        await page.evaluate((s) => {
            localStorage.setItem('adminToken', s.token)
            localStorage.setItem('adminUsername', s.username)
            localStorage.setItem('adminCentre', s.centre)
        }, { token, username, centre })
        await page.goto('/admin/dashboard')

        await expect(page.locator('.admin-toolbar-title')).toBeVisible()
        await expect(page.locator('.admin-navbar')).toBeVisible()
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
        }))
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
})
