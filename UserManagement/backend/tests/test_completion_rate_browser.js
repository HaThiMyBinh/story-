/* global document, window, permissionsMap, switchTab */
// Optional full production page test with mocked HTTP APIs; no MySQL needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const html = fs.readFileSync(path.join(__dirname, '../../Frontend/index.html'), 'utf8');
const name = 'O\'Brien <img src=x onerror="window.us6Xss=1"> & "College"';
const summary = {total:16,completed:8,active:7,notCompleted:1,unknownStatus:0,rate:50};
async function main() {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[],queries=[]; let empty=false,fail=false,delayed=false;
  page.on('pageerror',err=>errors.push(err.message));
  await page.addInitScript(()=>{
   sessionStorage.setItem('authToken','browser-test-token');
   sessionStorage.setItem('currentUser',JSON.stringify({id:1,role:'HR',name:'HR',email:'hr@example.test'}));
  });
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(url.hostname!=='us6.test') return route.abort();
   if(url.pathname==='/index.html') return route.fulfill({contentType:'text/html',body:html});
   if(url.pathname==='/api/permissions') return json({HR:['VIEW_REPORTS'],Admin:[],Mentor:[],Intern:[]});
   if(url.pathname==='/api/reports/completion-rate') {
    if(fail) return json({message:'Bộ lọc không hợp lệ'},400);
    return json({success:true,data:empty?{summary:{total:0,completed:0,active:0,notCompleted:0,unknownStatus:0,rate:0},byProgram:[],byMentor:[],programs:[]}:{summary,byProgram:[{key:'1',name,...summary}],byMentor:[{key:'unknown',name,...summary}],programs:[{id:1,name}]}});
   }
   if(url.pathname==='/api/reports/completion-rate/interns') {
    queries.push(Object.fromEntries(url.searchParams));
    if(delayed) await new Promise(resolve=>setTimeout(resolve,150));
    const second=url.searchParams.get('page')==='2';
    return json({success:true,data:{summary,items:[{id:second?16:1,fullName:name,studentCode:'US6',university:name,mentorName:name,status:'Hoàn thành'}],pagination:{page:second?2:1,pageSize:15,total:16,totalPages:2}}});
   }
   if(url.pathname==='/api/reports/completion-rate/export.csv') return route.fulfill({contentType:'text/csv; charset=utf-8',headers:{'content-disposition':'attachment; filename=ty-le-hoan-thanh-chuong-trinh.csv'},body:Buffer.from('\uFEFF"CSV"\r\n')});
   if(url.pathname==='/api/notifications') return json({data:{unread:0,items:[]}});
   if(url.pathname.startsWith('/api/')) return json({success:true,data:{},applications:{total:0,pending:0,approved:0,rejected:0},interns:{total:0,assigned:0},contracts:{total:0,confirmed:0}});
   return route.fulfill({status:204,body:''});
  });
  await page.goto('http://us6.test/index.html');
  await page.locator('#crHubCard').waitFor({state:'visible'});
  await page.locator('#crHubCard').click();
  await page.locator('#crPrograms .cr-group').waitFor();
  assert.ok((await page.locator('#crSummary').innerText()).includes('50.0%'));
  assert.equal(await page.locator('#crPrograms .cr-group').innerText(),`${name} — 50.0%`);
  assert.equal(await page.locator('#crPrograms img').count(),0);
  await page.locator('#crQ').fill('changed but not submitted');
  await page.locator('#crPrograms .cr-group').click();
  await page.locator('#crDetails table').waitFor();
  assert.equal(queries[0].groupKey,'1'); assert.equal(queries[0].q,undefined);
  assert.equal(await page.locator('#crModalTitle').innerText(),`Danh sách: ${name}`);
  assert.equal(await page.locator('#crDetails img').count(),0);
  await page.locator('#crPages button').last().click();
  await page.waitForFunction(()=>document.getElementById('crPages').textContent.includes('2/2'));
  assert.equal(queries.at(-1).page,'2');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#crModal').evaluate(el=>el.style.display),'none');
  assert.equal(await page.evaluate(()=>window.us6Xss),undefined);
  console.log('[PASS] Full page: hub, render, apostrophe/HTML labels, click, pagination, applied filters, Escape');
  const pending=page.waitForEvent('download'); await page.locator('#crExport').click(); const download=await pending;
  assert.equal(download.suggestedFilename(),'ty-le-hoan-thanh-chuong-trinh.csv');
  assert.deepEqual([...fs.readFileSync(await download.path()).subarray(0,3)],[239,187,191]);
  console.log('[PASS] CSV download and UTF-8 BOM');
  delayed=true; await page.locator('#crPrograms .cr-group').click(); await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#crModal').evaluate(el=>el.style.display),'none');
  empty=true; await page.locator('#crFilters button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('crSummary').textContent.includes('Không có thực tập sinh'));
  assert.equal(await page.locator('.cr-group').count(),0);
  fail=true; await page.locator('#crFilters button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('crError').textContent.includes('Bộ lọc không hợp lệ'));
  assert.ok(await page.locator('#crExport').isDisabled());
  console.log('[PASS] Empty/error states and stale modal response');
  await page.evaluate(()=>{permissionsMap.HR=[];switchTab('tab-completion-rate');});
  assert.equal(await page.locator('#tab-completion-rate').evaluate(el=>el.style.display),'none');
  console.log('[PASS] Frontend blocks HR without VIEW_REPORTS');
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
