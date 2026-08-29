const { chromium } = require('playwright');

async function testNavbarLinks() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  async function testLink(name, selector, expectedUrl, shouldNavigate = true) {
    try {
      console.log(`\nTesting ${name}...`);
      await page.goto('http://localhost:5176/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        if (shouldNavigate) {
          await element.click();
          await page.waitForTimeout(1000);
          const url = page.url();
          const isError = await page.locator('text=Not Found, text=Error, text=404').isVisible({ timeout: 1000 }).catch(() => false);
          
          if (isError) {
            console.log(`  ❌ ${name}: ERROR PAGE DETECTED at ${url}`);
            results.failed++;
            results.details.push({ name, status: 'FAIL', reason: 'Error page detected', url });
          } else if (expectedUrl && !url.includes(expectedUrl)) {
            console.log(`  ❌ ${name}: Wrong URL - expected ${expectedUrl}, got ${url}`);
            results.failed++;
            results.details.push({ name, status: 'FAIL', reason: 'Wrong URL', url, expected: expectedUrl });
          } else {
            console.log(`  ✅ ${name}: ${url}`);
            results.passed++;
            results.details.push({ name, status: 'PASS', url });
          }
        } else {
          // For overlays like search, cart, wishlist
          await element.click();
          await page.waitForTimeout(500);
          console.log(`  ✅ ${name}: Opened`);
          results.passed++;
          results.details.push({ name, status: 'PASS' });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      } else {
        console.log(`  ⚠️ ${name}: Not visible`);
        results.failed++;
        results.details.push({ name, status: 'FAIL', reason: 'Not visible' });
      }
    } catch (e) {
      console.log(`  ❌ ${name}: Error - ${e.message}`);
      results.failed++;
      results.details.push({ name, status: 'FAIL', reason: e.message });
    }
  }

  console.log('=== TESTING NAVBAR LINKS ===\n');

  // Desktop navbar links
  await testLink('Shop', 'a[href="/shop"]', '/shop');
  await testLink('Collections', 'a[href="/collections"]', '/collections');
  await testLink('New Drops', 'a[href="/new-drops"]', '/new-drops');
  await testLink('Best Sellers', 'a[href="/best-sellers"]', '/best-sellers');
  await testLink('Journal', 'a[href="/journal"]', '/journal');

  // Navbar buttons
  await testLink('Search', 'button[aria-label="Search"]', null, false);
  await testLink('Cart', 'button[aria-label*="Cart"]', null, false);
  await testLink('Wishlist', 'button[aria-label*="wishlist"]', null, false);
  await testLink('Account', 'button[aria-label="Account"]', null, false);

  // Test direct navigation to each route
  console.log('\n=== TESTING DIRECT ROUTE ACCESS ===\n');
  
  const routes = [
    { name: '/shop', path: '/shop' },
    { name: '/collections', path: '/collections' },
    { name: '/new-drops', path: '/new-drops' },
    { name: '/best-sellers', path: '/best-sellers' },
    { name: '/journal', path: '/journal' },
  ];

  for (const route of routes) {
    try {
      await page.goto(`http://localhost:5176${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      const isError = await page.locator('text=Not Found, text=Error, text=404').isVisible({ timeout: 1000 }).catch(() => false);
      const hasContent = await page.locator('h1').first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isError || !hasContent) {
        console.log(`  ❌ ${route.name}: ERROR or NO CONTENT`);
        results.failed++;
        results.details.push({ name: route.name, status: 'FAIL', reason: 'Error or no content' });
      } else {
        console.log(`  ✅ ${route.name}: OK`);
        results.passed++;
        results.details.push({ name: route.name, status: 'PASS' });
      }
    } catch (e) {
      console.log(`  ❌ ${route.name}: Error - ${e.message}`);
      results.failed++;
      results.details.push({ name: route.name, status: 'FAIL', reason: e.message });
    }
  }

  // Test footer links
  console.log('\n=== TESTING FOOTER LINKS ===\n');
  
  const footerLinks = [
    { name: 'All Products', selector: 'a[href="/shop"]:has-text("All Products")', path: '/shop' },
    { name: 'New Drops', selector: 'a[href="/new-drops"]', path: '/new-drops' },
    { name: 'Best Sellers', selector: 'a[href="/best-sellers"]', path: '/best-sellers' },
    { name: 'Contact Us', selector: 'a[href="/contact"]', path: '/contact' },
    { name: 'Privacy Policy', selector: 'a[href="/privacy"]', path: '/privacy' },
    { name: 'Terms of Service', selector: 'a[href="/terms"]', path: '/terms' },
    { name: 'Cookie Policy', selector: 'a[href="/cookies"]', path: '/cookies' },
    { name: 'Accessibility', selector: 'a[href="/accessibility"]', path: '/accessibility' },
    { name: 'Shipping Info', selector: 'a[href="/shipping"]', path: '/shipping' },
    { name: 'Returns & Exchanges', selector: 'a[href="/returns"]', path: '/returns' },
    { name: 'Warranty', selector: 'a[href="/warranty"]', path: '/warranty' },
    { name: 'FAQ', selector: 'a[href="/faq"]', path: '/faq' },
    { name: 'About NEONVAULT', selector: 'a[href="/about"]', path: '/about' },
    { name: 'Journal', selector: 'a[href="/journal"]', path: '/journal' },
    { name: 'Careers', selector: 'a[href="/careers"]', path: '/careers' },
    { name: 'Press', selector: 'a[href="/press"]', path: '/press' },
    { name: 'Sustainability', selector: 'a[href="/sustainability"]', path: '/sustainability' },
    { name: 'Limited Editions', selector: 'a[href="/limited"]', path: '/limited' },
    { name: 'Gift Cards', selector: 'a[href="/gift-cards"]', path: '/gift-cards' },
  ];

  for (const link of footerLinks) {
    try {
      await page.goto('http://localhost:5176/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      const element = page.locator(link.selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.click();
        await page.waitForTimeout(1000);
        const url = page.url();
        const isError = await page.locator('text=Not Found, text=Error, text=404').isVisible({ timeout: 1000 }).catch(() => false);
        const hasContent = await page.locator('h1').first().isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isError || !hasContent) {
          console.log(`  ❌ ${link.name}: ERROR at ${url}`);
          results.failed++;
          results.details.push({ name: link.name, status: 'FAIL', reason: 'Error or no content', url });
        } else {
          console.log(`  ✅ ${link.name}: ${url}`);
          results.passed++;
          results.details.push({ name: link.name, status: 'PASS', url });
        }
      } else {
        console.log(`  ⚠️ ${link.name}: Not visible`);
        results.failed++;
        results.details.push({ name: link.name, status: 'FAIL', reason: 'Not visible' });
      }
    } catch (e) {
      console.log(`  ❌ ${link.name}: Error - ${e.message}`);
      results.failed++;
      results.details.push({ name: link.name, status: 'FAIL', reason: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  consoleErrors.forEach(e => console.log(`  - ${e}`));
  
  if (results.failed > 0) {
    console.log('\nFailed Details:');
    results.details.filter(d => d.status === 'FAIL').forEach(d => {
      console.log(`  - ${d.name}: ${d.reason}${d.url ? ` (${d.url})` : ''}`);
    });
  }

  await browser.close();
  return results;
}

testNavbarLinks().catch(console.error);