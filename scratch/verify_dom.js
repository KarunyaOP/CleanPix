async function verify() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();

  console.log("=== DOM AUDIT RESULTS ===");
  console.log("1. HTTP Status:", res.status);
  console.log("2. Contains PERSON badge:", html.includes('PERSON'));
  console.log("3. Contains PRODUCT in detected badge:", html.includes('Detected:</span><span class="text-accent uppercase tracking-wider">PRODUCT'));
  console.log("4. Contains 'Office' chip:", html.includes('Office'));
  console.log("5. Contains 'Studio' chip:", html.includes('Studio'));
  console.log("6. Contains 'Outdoor' chip:", html.includes('Outdoor'));
  console.log("7. Contains 'LinkedIn' chip:", html.includes('LinkedIn'));
  console.log("8. Contains Framing controls:", html.includes('Fit (0%)') && html.includes('Balanced (8%)') && html.includes('Spacious (15%)'));
  console.log("=========================");
}

verify().catch(console.error);
