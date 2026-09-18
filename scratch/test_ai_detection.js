const fs = require('fs');
const path = require('path');

try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2] ? match[2].trim() : '';
    }
  });
} catch (e) {}

const cloudinary = require('cloudinary').v2;

const cleanEnvVar = (val) => {
  if (!val) return "";
  let trimmed = val.replace(/[\r\n]+/g, "").trim();
  if (!trimmed.startsWith('"') && !trimmed.startsWith("'") && trimmed.includes("#")) {
    trimmed = trimmed.split("#")[0].trim();
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const cloudName = cleanEnvVar(process.env.CLOUDINARY_CLOUD_NAME);
const apiKey = cleanEnvVar(process.env.CLOUDINARY_API_KEY);
const apiSecret = cleanEnvVar(process.env.CLOUDINARY_API_SECRET);
const url = cleanEnvVar(process.env.CLOUDINARY_URL);

if (url) {
  cloudinary.config({ cloudinary_url: url, secure: true });
} else {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

async function testUpload(imageName, filePath) {
  const buffer = fs.readFileSync(filePath);
  console.log(`\nTesting upload for: ${imageName}`);
  
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "cleanpix/test",
        resource_type: "image",
        faces: true,
        colors: true,
        image_metadata: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

  console.log("Upload result keys:", Object.keys(uploadResult));
  console.log("Faces detected:", JSON.stringify(uploadResult.faces));
  console.log("Colors:", uploadResult.colors?.slice(0, 3));
  console.log("Illustration score:", uploadResult.illustration_score);
  console.log("Format:", uploadResult.format, "Dimensions:", uploadResult.width, "x", uploadResult.height);
}

async function main() {
  try {
    const heroImg = path.join(__dirname, '..', 'public', 'images', 'hero-original.jpg');
    const shoeImg = path.join(__dirname, '..', 'public', 'images', 'thumb-shoe.jpg');
    const bagImg = path.join(__dirname, '..', 'public', 'images', 'thumb-bag.jpg');

    await testUpload('hero-original.jpg (Person)', heroImg);
    await testUpload('thumb-shoe.jpg (Product)', shoeImg);
    await testUpload('thumb-bag.jpg (Product)', bagImg);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
