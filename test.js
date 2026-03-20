import { chromium } from 'playwright';
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log(msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
    await page.goto('http://localhost:8080/auth');
    await page.waitForTimeout(2000);
    await browser.close();
})();
