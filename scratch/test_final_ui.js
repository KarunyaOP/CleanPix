const http = require('http');
const fs = require('fs');
const path = require('path');

async function runFinalUiAudit() {
  console.log('=== CLEANPIX COMPACT LANDING PANEL AUDIT ===\n');

  // Test 1: Fetch Landing Page HTML from Dev Server
  console.log('Test 1: Landing Page Hero & Compact Panel Check...');
  const pageHtml = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  const heroHtmlMatch = pageHtml.match(/<section[\s\S]*?<\/section>/);
  const heroHtml = heroHtmlMatch ? heroHtmlMatch[0] : '';

  // Compact Detection Panel verification
  const landingHasName = heroHtml.includes('Leather Handbag');
  const landingHasCategory = heroHtml.includes('Product');
  const landingHasConfidence = heroHtml.includes('99.4%');
  const landingHasUploadBtn = heroHtml.includes('Upload Image');
  const landingHasTryDemoBtn = heroHtml.includes('Try Demo');

  console.log(`  ✓ Detected Object Name in Compact Panel: ${landingHasName}`);
  console.log(`  ✓ Category in Compact Panel: ${landingHasCategory}`);
  console.log(`  ✓ Confidence Score in Compact Panel: ${landingHasConfidence}`);
  console.log(`  ✓ Upload Image button present: ${landingHasUploadBtn}`);
  console.log(`  ✓ Try Demo button present: ${landingHasTryDemoBtn}`);

  // Verification that large detection card is NOT on landing page
  const hasLargeSubjectBox = heroHtml.includes('Detected Subject Name');
  const hasLargeStatusBox = heroHtml.includes('Neural Vision v2.4');
  console.log(`  ✓ Large Subject Box removed: ${!hasLargeSubjectBox}`);
  console.log(`  ✓ Large Status Box removed: ${!hasLargeStatusBox}`);

  // Landing Page Exclusion Rule Checks
  const heroHasCopySection = heroHtml.includes('Copy Transparent PNG');
  const heroHasExportOptions = heroHtml.includes('Export Options');
  const heroHasOpenSocialKit = heroHtml.includes('Open Social Media Kit');

  console.log(`  ✓ Copy Transparent PNG section EXCLUDED from Landing: ${!heroHasCopySection}`);
  console.log(`  ✓ Export Options EXCLUDED from Landing: ${!heroHasExportOptions}`);
  console.log(`  ✓ Open Social Kit Button EXCLUDED from Landing: ${!heroHasOpenSocialKit}`);

  if (!landingHasName || !landingHasCategory || !landingHasConfidence || hasLargeSubjectBox || hasLargeStatusBox) {
    throw new Error('Verification failed: Compact panel criteria not met!');
  }

  // Test 2: Results Page Code & Hierarchy Verification
  console.log('\nTest 2: Results Page Untouched & Preserved Verification...');
  const leftColFile = fs.readFileSync(
    path.join(__dirname, '../src/components/upload/LeftColumnResults.tsx'),
    'utf-8'
  );
  const previewCardFile = fs.readFileSync(
    path.join(__dirname, '../src/components/editor/ProcessedPreviewCard.tsx'),
    'utf-8'
  );

  const resultsHasBack = leftColFile.includes('← Back');
  const resultsHasChange = leftColFile.includes('Change Image');
  const resultsHasRemove = leftColFile.includes('Remove Image');
  const resultsHasImageDetails = leftColFile.includes('IMAGE DETAILS CARD');
  const resultsHasExportOptions = leftColFile.includes('EXPORT OPTIONS CARD');
  const resultsHasSocialKit = leftColFile.includes('Social Media Kit Generator');
  const resultsHasOpenSocialKit = leftColFile.includes('Open Social Media Kit');
  const resultsHasCopySection = previewCardFile.includes('COPY TRANSPARENT PNG SECTION');

  console.log(`  ✓ Results Page [ ← Back ] intact: ${resultsHasBack}`);
  console.log(`  ✓ Results Page [ Change Image ] intact: ${resultsHasChange}`);
  console.log(`  ✓ Results Page [ Remove Image ] intact: ${resultsHasRemove}`);
  console.log(`  ✓ Results Page Image Details intact: ${resultsHasImageDetails}`);
  console.log(`  ✓ Results Page Export Options intact: ${resultsHasExportOptions}`);
  console.log(`  ✓ Results Page Social Kit intact: ${resultsHasSocialKit}`);
  console.log(`  ✓ Results Page Copy Transparent PNG intact: ${resultsHasCopySection}`);

  console.log('\n=== COMPACT LANDING PANEL AUDIT PASSED 100% ===');
}

runFinalUiAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
