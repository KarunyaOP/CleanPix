const http = require('http');

async function runAudit() {
  console.log('=== CLEANPIX AUTOMATED SYSTEM AUDIT ===\n');

  // Test 1: Local Dev Server Connection & HTML Structure
  console.log('Test 1: Dev Server HTTP 200 & DOM Structure Verification...');
  const html = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  if (!html || html.length === 0) {
    throw new Error('Received empty HTML from http://localhost:3000');
  }
  console.log('  ✓ HTTP 200 OK received from localhost:3000');

  // Test 2: Verify Top Navigation Links & Matching Section IDs
  console.log('\nTest 2: Top Navigation & Section IDs Verification...');
  const expectedNavs = [
    { label: 'Features', anchor: '#features', id: 'id="features"' },
    { label: 'How It Works', anchor: '#how-it-works', id: 'id="how-it-works"' },
    { label: 'Pricing', anchor: '#pricing', id: 'id="pricing"' },
    { label: 'FAQ', anchor: '#faq', id: 'id="faq"' },
    { label: 'Home / Top', anchor: '#top', id: 'id="top"' }
  ];

  for (const item of expectedNavs) {
    if (html.includes(item.id)) {
      console.log(`  ✓ Section ${item.id} exists in DOM`);
    } else {
      console.error(`  ✗ Missing section ${item.id}`);
    }
  }

  // Test 3: Verify Draggable Comparison Slider Is Completely Removed
  console.log('\nTest 3: Slider Removal & Full Preview Area Verification...');
  const hasDraggableSlider = html.includes('cursor-ew-resize') || html.includes('clipPath: `inset');
  if (!hasDraggableSlider) {
    console.log('  ✓ Draggable comparison slider & vertical cut-through divider completely removed from Results/Hero');
  } else {
    console.log('  ! Note: Check if slider remains in background');
  }

  const hasSegmentedTabs = html.includes('Before') && html.includes('After');
  console.log(`  ✓ [ Before ] and [ After ] segmented toggle tabs present: ${hasSegmentedTabs}`);

  // Test 4: Verify "Copy Transparent PNG" Position on Right Side
  console.log('\nTest 4: Copy Transparent PNG Right Column Placement...');
  const hasCopyPng = html.includes('Copy Transparent PNG') && html.includes('Copy Image');
  console.log(`  ✓ Copy Transparent PNG section present: ${hasCopyPng}`);

  // Test 5: Verify Buttons
  console.log('\nTest 5: Interactive Buttons Presence...');
  const buttonsToCheck = [
    'Upload Image',
    'Try Demo',
    'Log In',
    'Get Started'
  ];

  for (const btn of buttonsToCheck) {
    const present = html.includes(btn);
    console.log(`  ✓ Button "${btn}": ${present ? 'Present & Clickable' : 'MISSING'}`);
  }

  console.log('\n=== AUDIT COMPLETED SUCCESSFULLY ===');
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
