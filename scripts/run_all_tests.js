import { spawnSync } from 'child_process';
import path from 'path';

const isWindows = process.platform === 'win32';

const testSuites = [
  { id: 'unit', name: 'Vitest Unit Test Suite (19 files, 57 tests)', cmd: isWindows ? 'npx.cmd' : 'npx', args: ['vitest', 'run'] },
  { id: 'i18n', name: 'i18n Multi-Language Verification (EN/ZH/DE/ES/FR)', cmd: 'node', args: ['scripts/e2e_i18n_test.js'] },
  { id: 'merge', name: 'E2E Business: PDF Merge (合并多个 PDF)', cmd: 'node', args: ['scripts/e2e_merge_test.js'] },
  { id: 'compress', name: 'E2E Business: PDF Compress (智能模式与压缩率)', cmd: 'node', args: ['scripts/e2e_compress_test.js'] },
  { id: 'organize', name: 'E2E Business: PDF Organize (旋转/删除/纸张调整)', cmd: 'node', args: ['scripts/e2e_organize_test.js'] },
  { id: 'split', name: 'E2E Business: PDF Split (逐页/范围拆分并打包 ZIP)', cmd: 'node', args: ['scripts/e2e_split_test.js'] },
  { id: 'sign', name: 'E2E Business: PDF Sign (画笔/印章/印章定位/日期)', cmd: 'node', args: ['scripts/e2e_sign_test.js'] },
  { id: 'image_to_pdf', name: 'E2E Business: Image to PDF (多图上传/A4纸张/边距)', cmd: 'node', args: ['scripts/e2e_image_to_pdf_test.js'] },
  { id: 'unlock', name: 'E2E Business: PDF Unlock (密码验证/密码显隐/彻底解密)', cmd: 'node', args: ['scripts/e2e_unlock_test.js'] },
  { id: 'watermark', name: 'E2E Business: PDF Watermark (角度/颜色/防篡改锁)', cmd: 'node', args: ['scripts/e2e_watermark_test.js'] },
  { id: 'sanitize', name: 'E2E Business: PDF Sanitize (敏感指纹/XMP流/脱敏)', cmd: 'node', args: ['scripts/e2e_sanitize_test.js'] },
  { id: 'pipeline', name: 'E2E Business: Automation Pipeline (流水线批量编排与执行)', cmd: 'node', args: ['scripts/e2e_pipeline_test.js'] },
  { id: 'deep', name: 'E2E Deep Integration (流水线/商用模拟/设置/日志)', cmd: 'node', args: ['scripts/e2e_deep_test.js'] },
];

console.log('\n===============================================================');
console.log('🚀 [PDFSeal Test Matrix] Running Complete Test Suite...');
console.log('===============================================================\n');

const results = [];
let allPassed = true;

for (const suite of testSuites) {
  process.stdout.write(`⏳ Running [${suite.id.toUpperCase()}] ${suite.name}... `);
  const start = Date.now();
  
  const res = spawnSync(suite.cmd, suite.args, {
    stdio: 'pipe',
    shell: isWindows,
    encoding: 'utf-8'
  });

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  const passed = res.status === 0;

  if (passed) {
    console.log(`✅ PASSED (${duration}s)`);
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}s` });
  } else {
    console.log(`❌ FAILED (${duration}s)`);
    results.push({ name: suite.name, status: 'FAILED', duration: `${duration}s` });
    allPassed = false;
    if (res.stderr) {
      console.error(res.stderr.slice(-500));
    }
  }
}

console.log('\n===============================================================');
console.log('📊 [PDFSeal Test Suite Summary Report]');
console.log('===============================================================');
console.table(results);

if (allPassed) {
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! (100% Green)');
  process.exit(0);
} else {
  console.error('\n❌ SOME TESTS FAILED. Please review output above.');
  process.exit(1);
}
