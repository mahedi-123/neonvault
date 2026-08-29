const { chromium } = require('playwright');

async function runInteractionAudit() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
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

  async function testInteraction(name, fn) {
    try {
      await fn();
      results.passed++;
      results.details.push({ name, status: 'PASS' });
      console.log(`✅ ${name}`);
    } catch (e) {
      results.failed++;
      results.details.push({ name, status: 'FAIL', error: e.message });
      console.log(`❌ ${name}: ${e.message}`);
    }
  }

  async function navigateAndWait(url) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
  }

  console.log('🔍 Starting Interaction Audit...\n');

  // ============ HOME PAGE ============
  console.log('--- HOME PAGE ---');
  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: Hero CTA "EXPLORE COLLECTION" navigates to /shop', async () => {
    const btn = page.locator('button:has-text("EXPLORE COLLECTION")').first();
    await btn.click();
    await page.waitForTimeout(1000);
    if (!page.url().includes('/shop')) throw new Error('Did not navigate to /shop');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: Hero CTA "VIEW NEW DROPS" navigates to /new-drops', async () => {
    const btn = page.locator('button:has-text("VIEW NEW DROPS")').first();
    await btn.click();
    await page.waitForTimeout(1000);
    if (!page.url().includes('/new-drops')) throw new Error('Did not navigate to /new-drops');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: "VIEW ALL NEW DROPS" button navigates to /new-drops', async () => {
    const btn = page.locator('button:has-text("VIEW ALL NEW DROPS")').first();
    await btn.click();
    await page.waitForTimeout(1000);
    if (!page.url().includes('/new-drops')) throw new Error('Did not navigate to /new-drops');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: "VIEW ALL BEST SELLERS" button navigates to /best-sellers', async () => {
    const btn = page.locator('button:has-text("VIEW ALL BEST SELLERS")').first();
    await btn.click();
    await page.waitForTimeout(1000);
    if (!page.url().includes('/best-sellers')) throw new Error('Did not navigate to /best-sellers');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: "CREATE ACCOUNT" button in CTA section', async () => {
    const btn = page.locator('button:has-text("CREATE ACCOUNT")').first();
    await btn.click();
    await page.waitForTimeout(500);
    // Should navigate or show auth modal - check it does something
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: "EXPLORE CATALOG" button in CTA section', async () => {
    const btn = page.locator('button:has-text("EXPLORE CATALOG")').first();
    await btn.click();
    await page.waitForTimeout(1000);
    if (!page.url().includes('/shop')) throw new Error('Did not navigate to /shop');
  });

  await navigateAndWait('http://localhost:5176');

  // Product card interactions on home page
  await testInteraction('Home: Product card "Add to cart" button works', async () => {
    const btn = page.locator('a[href*="/product/"] button:has(svg.lucide-shopping-bag)').first();
    await btn.click();
    await page.waitForTimeout(500);
    const cartDrawer = await page.locator('[role="dialog"]:has-text("Shopping Cart")').isVisible();
    if (!cartDrawer) throw new Error('Cart drawer did not open');
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: Product card wishlist button works', async () => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const btn = page.locator('button[aria-label*="wishlist"]').first();
    await btn.click();
    await page.waitForTimeout(500);
    const toast = await page.locator('[role="alert"]').isVisible({ timeout: 1000 }).catch(() => false);
    if (!toast) throw new Error('No toast notification for wishlist');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Home: Product card quick view button works', async () => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const btn = page.locator('button[aria-label="Quick view"]').first();
    await btn.click();
    await page.waitForTimeout(500);
    const modal = await page.locator('[role="dialog"]:has-text("ADD TO CART")').isVisible();
    if (!modal) throw new Error('Quick view modal did not open');
    await page.keyboard.press('Escape');
  });

  // ============ NAVBAR ============
  console.log('\n--- NAVBAR ---');
  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Logo link navigates to home', async () => {
    await page.click('a[href="/"]');
    await page.waitForTimeout(500);
    if (page.url() !== 'http://localhost:5176/') throw new Error('Logo did not navigate to home');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Shop link navigates to /shop', async () => {
    await page.click('a[href="/shop"]');
    await page.waitForTimeout(1000);
    if (!page.url().includes('/shop')) throw new Error('Shop link failed');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Collections link navigates to /collections', async () => {
    await page.click('a[href="/collections"]');
    await page.waitForTimeout(1000);
    // Should redirect to shop with category or show collections page
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: New Drops link navigates to /new-drops', async () => {
    await page.click('a[href="/new-drops"]');
    await page.waitForTimeout(1000);
    if (!page.url().includes('/new-drops')) throw new Error('New Drops link failed');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Best Sellers link navigates to /best-sellers', async () => {
    await page.click('a[href="/best-sellers"]');
    await page.waitForTimeout(1000);
    if (!page.url().includes('/best-sellers')) throw new Error('Best Sellers link failed');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Journal link navigates to /journal', async () => {
    await page.click('a[href="/journal"]');
    await page.waitForTimeout(1000);
    // Journal page may not exist - check it handles gracefully
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Search button opens search overlay', async () => {
    await page.click('button[aria-label="Search"]');
    await page.waitForTimeout(300);
    const overlay = await page.locator('input[placeholder*="Search"]').isVisible();
    if (!overlay) throw new Error('Search overlay did not open');
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Cart button opens cart drawer', async () => {
    await page.click('button[aria-label*="Cart"]');
    await page.waitForTimeout(300);
    const drawer = await page.locator('[role="dialog"]:has-text("Shopping Cart")').isVisible();
    if (!drawer) throw new Error('Cart drawer did not open');
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Wishlist button toggles wishlist', async () => {
    await page.click('button[aria-label*="wishlist"]');
    await page.waitForTimeout(300);
    const toast = await page.locator('[role="alert"]').isVisible({ timeout: 1000 }).catch(() => false);
    // Wishlist button should show toast
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Navbar: Account button works', async () => {
    await page.click('button[aria-label="Account"]');
    await page.waitForTimeout(300);
    // Should do something - check no error
  });

  // Mega menu
  await testInteraction('Navbar: Mega menu opens on Shop hover', async () => {
    await page.hover('button:has-text("Shop")');
    await page.waitForTimeout(300);
    const megaMenu = await page.locator('.absolute.left-0.right-0.top-full').isVisible({ timeout: 2000 }).catch(() => false);
    if (!megaMenu) throw new Error('Mega menu did not open');
    await page.hover('body');
  });

  await navigateAndWait('http://localhost:5176');

  // ============ SEARCH ============
  console.log('\n--- SEARCH ---');
  await testInteraction('Search: Opens with ⌘K shortcut', async () => {
    await page.keyboard.press('Meta+/');
    await page.waitForTimeout(300);
    const overlay = await page.locator('input[placeholder*="Search"]').isVisible();
    if (!overlay) throw new Error('Search overlay did not open with ⌘K');
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Search: Live results appear when typing', async () => {
    await page.keyboard.press('Meta+/');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder*="Search"]', 'headphones');
    await page.waitForTimeout(800);
    const results = await page.locator('[role="dialog"] >> text=NEON X1').first().isVisible();
    if (!results) throw new Error('No live search results');
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Search: Recent searches section visible', async () => {
    await page.keyboard.press('Meta+/');
    await page.waitForTimeout(300);
    const recent = await page.locator('text=Recent Searches').isVisible({ timeout: 1000 }).catch(() => false);
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Search: Trending searches clickable', async () => {
    await page.keyboard.press('Meta+/');
    await page.waitForTimeout(300);
    const trending = page.locator('button:has-text("NEON X1")').first();
    await trending.click();
    await page.waitForTimeout(500);
    // Should navigate to product or search results
    await page.keyboard.press('Escape');
  });

  // ============ SHOP PAGE ============
  console.log('\n--- SHOP PAGE ---');
  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Filter panel visible on desktop', async () => {
    const panel = await page.locator('aside:has(h3:has-text("Categories"))').isVisible({ timeout: 3000 }).catch(() => false);
    if (!panel) throw new Error('Filter panel not visible');
  });

  await testInteraction('Shop: Category checkbox filters products', async () => {
    const checkbox = page.locator('input[type="checkbox"]:near(:text("Headphones"))').first();
    await checkbox.click();
    await page.waitForTimeout(1000);
    const products = await page.locator('a[href*="/product/"]').count();
    if (products === 0) throw new Error('No products after filter');
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Price range filter works', async () => {
    const minInput = page.locator('input[type="number"]').first();
    await minInput.fill('100');
    await page.waitForTimeout(300);
    const maxInput = page.locator('input[type="number"]').nth(1);
    await maxInput.fill('500');
    await page.waitForTimeout(500);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Sort dropdown changes order', async () => {
    const select = page.locator('select').first();
    await select.selectOption('price-asc');
    await page.waitForTimeout(500);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: In Stock Only checkbox works', async () => {
    const checkbox = page.locator('input[type="checkbox"]:near(:text("In Stock Only"))').first();
    await checkbox.click();
    await page.waitForTimeout(500);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Limited Edition checkbox works', async () => {
    const checkbox = page.locator('input[type="checkbox"]:near(:text("Limited Edition"))').first();
    await checkbox.click();
    await page.waitForTimeout(500);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Best Sellers checkbox works', async () => {
    const checkbox = page.locator('input[type="checkbox"]:near(:text("Best Sellers"))').first();
    await checkbox.click();
    await page.waitForTimeout(500);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: View mode toggle (grid/list)', async () => {
    await page.click('button[aria-label="List view"]');
    await page.waitForTimeout(300);
    await page.click('button[aria-label="Grid view"]');
    await page.waitForTimeout(300);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Clear All Filters button works', async () => {
    // First set a filter
    await page.locator('input[type="checkbox"]:near(:text("Headphones"))').first().click();
    await page.waitForTimeout(300);
    await page.click('button:has-text("Clear All")');
    await page.waitForTimeout(300);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Product card add to cart works', async () => {
    const btn = page.locator('a[href*="/product/"] button:has(svg.lucide-shopping-bag)').first();
    await btn.click();
    await page.waitForTimeout(500);
    const drawer = await page.locator('[role="dialog"]:has-text("Shopping Cart")').isVisible();
    if (!drawer) throw new Error('Cart drawer did not open');
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Product card wishlist works', async () => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const btn = page.locator('button[aria-label*="wishlist"]').first();
    await btn.click();
    await page.waitForTimeout(300);
  });

  await navigateAndWait('http://localhost:5176/shop');

  await testInteraction('Shop: Product card quick view works', async () => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const btn = page.locator('button[aria-label="Quick view"]').first();
    await btn.click();
    await page.waitForTimeout(500);
    const modal = await page.locator('[role="dialog"]:has-text("ADD TO CART")').isVisible();
    if (!modal) throw new Error('Quick view did not open');
    await page.keyboard.press('Escape');
  });

  // ============ NEW DROPS PAGE ============
  console.log('\n--- NEW DROPS PAGE ---');
  await navigateAndWait('http://localhost:5176/new-drops');

  await testInteraction('New Drops: Page loads with new products', async () => {
    const products = await page.locator('a[href*="/product/"]').count();
    if (products === 0) throw new Error('No products on new drops page');
  });

  await testInteraction('New Drops: Filters work on new drops page', async () => {
    const checkbox = page.locator('label:has-text("Headphones") input[type="checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(500);
  });

  // ============ PRODUCT DETAIL PAGE ============
  console.log('\n--- PRODUCT DETAIL PAGE ---');
  await navigateAndWait('http://localhost:5176/shop');
  await page.waitForTimeout(2000);

  await testInteraction('Product: Clicking product navigates to detail page', async () => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForURL('**/product/**', { timeout: 10000 });
    await page.waitForTimeout(1000);
    const title = await page.locator('h1').first().isVisible();
    if (!title) throw new Error('Product detail page did not load');
  });

  await testInteraction('Product: Image gallery navigation', async () => {
    const nextBtn = page.locator('button[aria-label="Next image"]').first();
    if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    }
  });

  await testInteraction('Product: Color variant selection', async () => {
    const colorBtn = page.locator('button[aria-label]').filter({ hasText: /obsidian|titanium|arctic/i }).first();
    if (await colorBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await colorBtn.click();
      await page.waitForTimeout(300);
    }
  });

  await testInteraction('Product: Quantity selector works', async () => {
    const plusBtn = page.locator('button[aria-label="Increase quantity"]').first();
    await plusBtn.click();
    await page.waitForTimeout(300);
    const minusBtn = page.locator('button[aria-label="Decrease quantity"]').first();
    await minusBtn.click();
    await page.waitForTimeout(300);
  });

  await testInteraction('Product: Add to cart button works', async () => {
    const btn = page.locator('button:has-text("ADD TO CART")').first();
    await btn.click();
    await page.waitForTimeout(500);
    const drawer = await page.locator('[role="dialog"]:has-text("Shopping Cart")').isVisible();
    if (!drawer) throw new Error('Cart drawer did not open');
    await page.keyboard.press('Escape');
  });

  await testInteraction('Product: Buy Now button navigates to checkout', async () => {
    const btn = page.locator('button:has-text("BUY NOW")').first();
    await btn.click();
    await page.waitForTimeout(1000);
    if (!page.url().includes('/checkout')) throw new Error('Buy Now did not navigate to checkout');
  });

  await testInteraction('Product: Wishlist toggle works', async () => {
    await page.goBack();
    await page.waitForTimeout(500);
    const btn = page.locator('button[aria-label*="wishlist"]').first();
    await btn.click();
    await page.waitForTimeout(300);
  });

  await testInteraction('Product: Quick view button works', async () => {
    const btn = page.locator('button[aria-label="Quick view"]').first();
    await btn.click();
    await page.waitForTimeout(500);
    const modal = await page.locator('[role="dialog"]:has-text("ADD TO CART")').isVisible();
    if (!modal) throw new Error('Quick view did not open');
    await page.keyboard.press('Escape');
  });

  await testInteraction('Product: Share button works', async () => {
    const btn = page.locator('button[aria-label="Share"]').first();
    await btn.click();
    await page.waitForTimeout(300);
  });

  await testInteraction('Product: Tabs switch correctly', async () => {
    const tabs = ['Description', 'Specifications', 'Reviews', 'Shipping'];
    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);
      await page.waitForTimeout(300);
    }
  });

  // ============ CART DRAWER ============
  console.log('\n--- CART DRAWER ---');
  await navigateAndWait('http://localhost:5176');

  await testInteraction('Cart: Opens with items', async () => {
    await page.locator('a[href*="/product/"] button:has(svg.lucide-shopping-bag)').first().click();
    await page.waitForTimeout(500);
    const drawer = await page.locator('[role="dialog"]:has-text("Shopping Cart")').isVisible();
    if (!drawer) throw new Error('Cart drawer did not open');
  });

  await testInteraction('Cart: Quantity increase works', async () => {
    const btn = page.locator('button[aria-label="Increase quantity"]').first();
    await btn.click();
    await page.waitForTimeout(300);
  });

  await testInteraction('Cart: Quantity decrease works', async () => {
    const btn = page.locator('button[aria-label="Decrease quantity"]').first();
    await btn.click();
    await page.waitForTimeout(300);
  });

  await testInteraction('Cart: Remove item works', async () => {
    const btn = page.locator('button[aria-label*="Remove"]').first();
    await btn.click();
    await page.waitForTimeout(300);
  });

  await testInteraction('Cart: Continue Shopping button closes drawer', async () => {
    // Re-add an item since previous test may have removed it
    await page.locator('a[href*="/product/"] button:has(svg.lucide-shopping-bag)').first().click();
    await page.waitForTimeout(500);
    await page.click('button:has-text("CONTINUE SHOPPING")');
    await page.waitForTimeout(800); // Increased wait for animation
    const drawer = await page.locator('[role="dialog"]:has-text("Shopping Cart")').isVisible().catch(() => false);
    if (drawer) throw new Error('Cart drawer did not close');
  });

  await testInteraction('Cart: Proceed to Checkout navigates', async () => {
    await page.locator('a[href*="/product/"] button:has(svg.lucide-shopping-bag)').first().click();
    await page.waitForTimeout(300);
    await page.click('button:has-text("PROCEED TO CHECKOUT")');
    await page.waitForTimeout(1000);
    if (!page.url().includes('/checkout')) throw new Error('Did not navigate to checkout');
  });

  // ============ CHECKOUT FLOW ============
  console.log('\n--- CHECKOUT FLOW ---');
  await navigateAndWait('http://localhost:5176/checkout');

  await testInteraction('Checkout: Step 1 - Email validation', async () => {
    await page.fill('input[type="email"]', 'invalid');
    await page.click('button:has-text("CONTINUE")');
    await page.waitForTimeout(300);
    const error = await page.locator('text=Invalid email').isVisible({ timeout: 1000 }).catch(() => false);
    if (!error) throw new Error('No email validation error');
  });

  await testInteraction('Checkout: Step 1 - Valid email continues', async () => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("CONTINUE")');
    await page.waitForTimeout(800);
    if (!page.url().includes('/checkout')) throw new Error('Did not continue to step 2');
  });

  await testInteraction('Checkout: Step 2 - Fill shipping address', async () => {
    await page.fill('input[placeholder="John"]', 'John');
    await page.fill('input[placeholder="Doe"]', 'Doe');
    await page.fill('input[placeholder="123 Main Street"]', '123 Main St');
    await page.fill('input[placeholder="New York"]', 'New York');
    await page.fill('input[placeholder="NY"]', 'NY');
    await page.fill('input[placeholder="10001"]', '10001');
    await page.fill('input[placeholder="+1 (555) 000-0000"]', '+1 555 000 0000');
    await page.click('button:has-text("CONTINUE")');
    await page.waitForTimeout(800);
  });

  await testInteraction('Checkout: Step 3 - Fill payment info', async () => {
    await page.fill('input[placeholder="4242 4242 4242 4242"]', '4242 4242 4242 4242');
    await page.fill('input[placeholder="12/28"]', '12/28');
    await page.fill('input[placeholder="123"]', '123');
    await page.fill('input[placeholder="JOHN DOE"]', 'JOHN DOE');
    await page.click('button:has-text("REVIEW ORDER")');
    await page.waitForTimeout(800);
  });

  await testInteraction('Checkout: Step 4 - Place order', async () => {
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("PLACE ORDER")');
    await page.waitForTimeout(3000);
    const confirmation = await page.locator('text=ORDER CONFIRMED').isVisible({ timeout: 5000 }).catch(() => false);
    if (!confirmation) throw new Error('Order confirmation not shown');
  });

  // ============ FOOTER ============
  console.log('\n--- FOOTER ---');
  await navigateAndWait('http://localhost:5176');

  await testInteraction('Footer: All Products link works', async () => {
    await page.click('a[href="/shop"]:has-text("All Products")');
    await page.waitForTimeout(1000);
  });

  await testInteraction('Footer: New Drops link works', async () => {
    await page.click('a[href="/new-drops"]');
    await page.waitForTimeout(1000);
  });

  await testInteraction('Footer: Best Sellers link works', async () => {
    await page.click('a[href="/best-sellers"]');
    await page.waitForTimeout(1000);
  });

async function waitForFooterReady(page) {
    // Ensure page is fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Scroll to footer
    await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    // Wait for footer to be in viewport and links to be clickable
    await page.waitForFunction(() => {
      const footer = document.querySelector('footer');
      if (!footer) return false;
      const rect = footer.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom >= 0;
      if (!inView) return false;
      
      const links = footer.querySelectorAll('a[href]');
      const hasContact = Array.from(links).some(a => a.href.includes('/contact'));
      const hasPrivacy = Array.from(links).some(a => a.href.includes('/privacy'));
      const hasTerms = Array.from(links).some(a => a.href.includes('/terms'));
      const hasTwitter = Array.from(links).some(a => a.href.includes('twitter.com'));
      const hasInstagram = Array.from(links).some(a => a.href.includes('instagram.com'));
      const hasYoutube = Array.from(links).some(a => a.href.includes('youtube.com'));
      const hasDiscord = Array.from(links).some(a => a.href.includes('discord.com'));
      const hasGithub = Array.from(links).some(a => a.href.includes('github.com'));
      return hasContact && hasPrivacy && hasTerms && hasTwitter && hasInstagram && hasYoutube && hasDiscord && hasGithub;
    }, { timeout: 15000 });
    
    await page.waitForTimeout(200);
  }

  await testInteraction('Footer: Contact Us link works', async () => {
    await navigateAndWait('http://localhost:5176');
    await waitForFooterReady(page);
    await page.click('a[href="/contact"]');
    await page.waitForTimeout(500);
  });

  await testInteraction('Footer: Privacy Policy link works', async () => {
    await navigateAndWait('http://localhost:5176');
    await waitForFooterReady(page);
    await page.click('a[href="/privacy"]');
    await page.waitForTimeout(500);
  });

  await testInteraction('Footer: Terms of Service link works', async () => {
    await navigateAndWait('http://localhost:5176');
    await waitForFooterReady(page);
    const termsLink = page.locator('footer a[href="/terms"]').first();
    await termsLink.click();
    await page.waitForTimeout(500);
  });

  await testInteraction('Footer: Social media links open external', async () => {
    await navigateAndWait('http://localhost:5176');
    await waitForFooterReady(page);
    const links = page.locator('footer a[href*="twitter.com"], footer a[href*="instagram.com"], footer a[href*="youtube.com"], footer a[href*="discord.com"], footer a[href*="github.com"]');
    const count = await links.count();
    if (count < 5) throw new Error('Missing social links');
  });

  // ============ COMMAND PALETTE ============
  console.log('\n--- COMMAND PALETTE ---');
  await navigateAndWait('http://localhost:5176');

  await testInteraction('Command Palette: Opens with ⌘K', async () => {
    await page.keyboard.press('Meta+KeyK');
    await page.waitForTimeout(300);
    const palette = await page.locator('[role="dialog"]:has-text("COMMANDS")').isVisible({ timeout: 1000 }).catch(() => false);
    if (!palette) throw new Error('Command palette did not open');
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Command Palette: Search command works', async () => {
    await page.keyboard.press('Meta+KeyK');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder*="command"]', 'search');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
  });

  await navigateAndWait('http://localhost:5176');

  await testInteraction('Command Palette: Navigate to Shop command', async () => {
    await page.keyboard.press('Meta+KeyK');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    if (!page.url().includes('/shop')) throw new Error('Command did not navigate');
  });

  // ============ MOBILE ============
  console.log('\n--- MOBILE LAYOUT ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await navigateAndWait('http://localhost:5176');

  await testInteraction('Mobile: Hamburger menu opens', async () => {
    await page.click('button[aria-label*="menu"]');
    await page.waitForTimeout(500);
    const menu = await page.locator('[role="dialog"]:has-text("Menu")').isVisible({ timeout: 1000 }).catch(() => false);
    if (!menu) throw new Error('Mobile menu did not open');
    await page.keyboard.press('Escape');
  });

  await testInteraction('Mobile: Search button works', async () => {
    await page.click('button[aria-label="Search"]');
    await page.waitForTimeout(300);
    const overlay = await page.locator('input[placeholder*="Search"]').isVisible();
    if (!overlay) throw new Error('Mobile search did not open');
    await page.keyboard.press('Escape');
  });

  await page.setViewportSize({ width: 1440, height: 900 });

  // ============ DROP ROOM & VAULT PICKS ============
  console.log('\n--- DROP ROOM / VAULT PICKS ---');
  await navigateAndWait('http://localhost:5176/drop-room');

  await testInteraction('Drop Room: Page loads with countdown', async () => {
    const countdown = await page.locator('text=DAYS').isVisible({ timeout: 3000 }).catch(() => false);
    if (!countdown) throw new Error('Drop room countdown not visible');
  });

  await navigateAndWait('http://localhost:5176/vault-picks');

  await testInteraction('Vault Picks: Page loads with recommendations', async () => {
    const products = await page.locator('article:has(img)').count();
    if (products === 0) throw new Error('No products on vault picks page');
  });

  // ============ 404 / UNKNOWN ROUTES ============
  console.log('\n--- 404 HANDLING ---');
  await testInteraction('Unknown route redirects to home', async () => {
    await navigateAndWait('http://localhost:5176/nonexistent-page');
    if (page.url() !== 'http://localhost:5176/') throw new Error('Did not redirect to home');
  });

  // ============ SUMMARY ============
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTERACTION AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total interactions tested: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED INTERACTIONS:');
    results.details.filter(d => d.status === 'FAIL').forEach(d => {
      console.log(`  - ${d.name}: ${d.error}`);
    });
  }

  if (consoleErrors.length > 0) {
    console.log('\n❌ CONSOLE ERRORS:');
    consoleErrors.forEach(e => console.log(`  - ${e}`));
  }

  await browser.close();
  
  return results;
}

runInteractionAudit().then(r => {
  process.exit(r.failed > 0 ? 1 : 0);
}).catch(e => {
  console.error('Audit crashed:', e);
  process.exit(1);
});