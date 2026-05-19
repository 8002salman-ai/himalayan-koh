import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4173';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'customer@himalayankoh.com');
await page.fill('input[type="password"]', 'Customer123!');
await page.getByRole('button', { name: /sign in|log in/i }).click();
await page.waitForTimeout(3500);

await page.goto(`${base}/products/himalayan-edible-pink-salt-fine`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Add to Cart' }).first().click();
await page.waitForTimeout(2500);

await page.goto(`${base}/checkout`, { waitUntil: 'networkidle' });
const empty = (await page.getByText(/your cart is empty/i).count()) > 0;
const hasForm = (await page.locator('form').count()) > 0;
const hasPlaceOrder = (await page.getByRole('button', { name: /place order|submit/i }).count()) > 0;

console.log(JSON.stringify({ empty, hasForm, hasPlaceOrder, url: page.url() }, null, 2));
await browser.close();
process.exit(empty ? 1 : 0);
