import { chromium } from 'playwright'
const out = process.argv[2] || 'screenshots'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] })
const sizes = [['desktop',1440,900],['mobile',390,844]]
for (const [name,w,h] of sizes) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1, hasTouch: name==='mobile' })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', m => { if (m.type()==='error' || m.type()==='warning') errs.push(m.type()+': '+m.text()) })
  page.on('pageerror', e => errs.push('pageerror: '+e.message))
  await page.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${out}/${name}-0-hero.png` })
  const ids = ['about','ritual','breathe','lab','specimens','promises','stay']
  for (const id of ids) {
    await page.evaluate(id => { document.documentElement.style.scrollBehavior='auto'; const el=document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (id==='ritual'? innerHeight*1.6: id==='specimens'? innerHeight*0.6: 0)) }, id)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${out}/${name}-${id}.png` })
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/${name}-footer.png` })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  console.log(name, 'overflow', overflow, 'errors', JSON.stringify(errs, null, 1))
  await ctx.close()
}
await browser.close()
