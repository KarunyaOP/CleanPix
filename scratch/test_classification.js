const assert = require('assert');

function classifyImage(options) {
  const { faces = [], fileName = "", tags = [], illustrationScore = 0 } = options;
  const lower = fileName.toLowerCase().replace(/[^a-z0-9_\-\.]/g, ' ');

  // 1. HIGHEST PRIORITY: If Cloudinary or visual face detection found human faces -> PERSON
  if (faces && Array.isArray(faces) && faces.length > 0) {
    return "person";
  }

  // 2. Comprehensive Person keywords (Priority over clothing/accessories/furniture)
  const personKeywords = [
    "person", "human", "man", "woman", "girl", "boy", "people", "portrait",
    "selfie", "face", "model", "profile", "avatar", "headshot", "lady", "guy",
    "child", "kid", "baby", "teen", "couple", "fashion", "dancer", "athlete",
    "fitness", "worker", "doctor", "teacher", "student", "hero-original",
    "hero_model", "demo_portrait", "demo_person", "portrait_isolated"
  ];

  for (const kw of personKeywords) {
    if (lower.includes(kw)) {
      return "person";
    }
  }

  // 3. Pet keywords
  const petKeywords = [
    "dog", "cat", "pet", "puppy", "kitten", "animal", "canine", "feline",
    "bird", "parrot", "hamster", "rabbit", "bunny", "horse", "fish",
    "hound", "retriever", "shepherd", "bulldog", "poodle", "terrier",
    "husky", "pug", "beagle", "chihuahua", "tabby", "siamese", "persian"
  ];

  for (const kw of petKeywords) {
    if (lower.includes(kw)) {
      return "pet";
    }
  }

  // 4. Vehicle keywords
  const vehicleKeywords = [
    "car", "vehicle", "auto", "automobile", "motorcycle", "bike", "bicycle",
    "scooter", "truck", "bus", "van", "suv", "sedan", "coupe", "convertible",
    "supercar", "aircraft", "plane", "airplane", "helicopter", "boat",
    "yacht", "ship", "train", "tesla", "bmw", "audi", "mercedes", "ford",
    "toyota", "honda", "porsche", "ferrari", "lamborghini"
  ];

  for (const kw of vehicleKeywords) {
    if (lower.includes(kw)) {
      return "vehicle";
    }
  }

  // 5. Standalone Product keywords
  const productKeywords = [
    "shoe", "sneaker", "boot", "sandal", "bag", "handbag", "backpack",
    "purse", "wallet", "watch", "wristwatch", "bottle", "perfume",
    "cosmetic", "lotion", "shampoo", "phone", "smartphone", "iphone",
    "laptop", "gadget", "headphone", "earbuds", "speaker", "furniture",
    "chair", "sofa", "table", "lamp", "product", "item", "merchandise",
    "ecommerce", "skincare", "cup", "mug", "box", "package", "thumb-bag",
    "thumb-shoe"
  ];

  for (const kw of productKeywords) {
    if (lower.includes(kw)) {
      return "product";
    }
  }

  // 6. Non-product object keywords
  const objectKeywords = [
    "object", "flower", "plant", "tree", "leaf", "rock", "stone",
    "monument", "statue", "tool", "instrument", "sculpture", "building"
  ];

  for (const kw of objectKeywords) {
    if (lower.includes(kw)) {
      return "other";
    }
  }

  // 7. Fallback: If human tags or undefined, default to person or general object
  return "person";
}

// Tests
console.log("Testing Classification Rules:");
assert.strictEqual(classifyImage({ faces: [[10, 20, 100, 100]], fileName: "demo_product.jpg" }), "person", "Face detected should be PERSON even if filename has product");
assert.strictEqual(classifyImage({ fileName: "fashion_model_dress.jpg" }), "person", "Fashion model with dress should be PERSON");
assert.strictEqual(classifyImage({ fileName: "hero-original.jpg" }), "person", "Hero original should be PERSON");
assert.strictEqual(classifyImage({ fileName: "my_portrait.png" }), "person", "Portrait should be PERSON");
assert.strictEqual(classifyImage({ fileName: "golden_retriever.jpg" }), "pet", "Golden retriever should be PET");
assert.strictEqual(classifyImage({ fileName: "sports_car_red.jpg" }), "vehicle", "Sports car should be VEHICLE");
assert.strictEqual(classifyImage({ fileName: "thumb-shoe.jpg" }), "product", "Shoe should be PRODUCT");
assert.strictEqual(classifyImage({ fileName: "thumb-bag.jpg" }), "product", "Bag should be PRODUCT");
assert.strictEqual(classifyImage({ fileName: "rose_flower.jpg" }), "other", "Flower should be OBJECT/OTHER");

console.log("ALL 9 TEST CASES PASSED!");
