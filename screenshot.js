const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--use-gl=swiftshader',
            '--ignore-gpu-blacklist',
            '--disable-web-security',
            '--font-render-hinting=none'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const path = require('path');
    const projectUrl = `file://${path.resolve(__dirname, 'web/index.html')}?headless=true`;

    console.log(`Navigating to ${projectUrl}`);
    await page.goto(projectUrl, { waitUntil: 'networkidle0' });

    console.log('Waiting for window.__appReady or timeout...');
    // We will advance the simulation using the renderFrame method exposed in app.js
    // Assuming 'world.json' appears at t=2.0s for example based on narratives,
    // let's look at the timeline to be precise, or just seek to 5000ms.

    // In app.js: "window.renderFrame = async (tMs) => { await window.__hf.seek(tMs / 1000); };"
    console.log('Seeking to 8000ms (to hit world.json phase)...');
    await page.evaluate(async () => {
        if (window.renderFrame) {
            await window.renderFrame(8000);
        }
    });

    // Wait a brief moment to ensure drawing completes
    await new Promise(r => setTimeout(r, 1000));

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'map_screenshot.png' });

    console.log('Screenshot saved to map_screenshot.png');
    await browser.close();
})();
