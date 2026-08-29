const { chromium } = require('playwright');

async function verifyNewRoutes() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const routes = [
    '/contact', '/privacy', '/terms', '/shipping', '/returns', '/warranty', '/faq',
    '/about', '/journal', '/careers', '/press', '/sustainability',
    '/cookies', '/accessibility', '/limited', '/gift-cards'
  ];
  
  console.log('=== VERIFYING NEW ROUTES ===\n');
  
  for (const route of routes) {
    try {
      await page.goto(`http://localhost:5175${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      
      const title = await page.title();
      const hasContent = await page.locator('h1').first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasError = await page.locator('text=Not Found, text=404, text=Error').isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasError || !hasContent) {
        console.log(`❌ ${route}: ERROR PAGE or NO CONTENT`);
      } else {
        console.log(`✅ ${route}: OK (title: "${title}")`);
      }
    } catch (e) {
      console.log(`❌ ${route}: ERROR - ${e.message}`);
    }
  }
  
  await browser.close();
  console.log('\n=== VERIFICATION COMPLETE ===');
}

verifyNewRoutes().catch(console.error);