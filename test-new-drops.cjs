const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Testing Home page...');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Find the "VIEW ALL NEW DROPS" button
  const btn = page.locator('button:has-text("VIEW ALL NEW DROPS")');
  const visible = await btn.isVisible();
  console.log(`Button visible: ${visible}`);

  if (visible) {
    await btn.click();
    await page.waitForTimeout(1000);
    console.log(`URL after click: ${page.url()}`);
    
    // Check if we're on /new-drops
    if (page.url().includes('/new-drops')) {
      console.log('✅ Navigation to /new-drops works!');
      
      // Check if page content loads
      const heading = await page.locator('h1:has-text("JUST LANDED")').isVisible();
      console.log(`New Drops page heading visible: ${heading}`);
      
      // Check product cards
      const products = await page.locator('article:has(img)').count();
      console.log(`Product cards on new drops page: ${products}`);
    } else {
      console.log('❌ Navigation failed');
    }
  }

  // Also test the Navbar "New Drops" link
  console.log('\nTesting Navbar "New Drops" link...');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const navLink = page.locator('a[href="/new-drops"]');
  const navVisible = await navLink.isVisible();
  console.log(`Navbar New Drops link visible: ${navVisible}`);
  
  if (navVisible) {
    await navLink.click();
    await page.waitForTimeout(1000);
    console.log(`URL after navbar click: ${page.url()}`);
  }

  await browser.close();
}

test().catch(console.error);