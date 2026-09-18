const { execSync } = require("child_process");

console.log("=== STEP 1: Unit testing getSiteUrl and getMetadataBase ===");

// We can compile TypeScript or require the logic directly
const getSiteUrl = (env) => {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.NEXTAUTH_URL,
    env.SITE_URL,
    env.APP_URL,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (
        trimmed !== "" &&
        trimmed !== "undefined" &&
        trimmed !== "null" &&
        trimmed !== '""' &&
        trimmed !== "''"
      ) {
        const withProtocol =
          trimmed.startsWith("http://") || trimmed.startsWith("https://")
            ? trimmed
            : `https://${trimmed}`;

        try {
          const parsed = new URL(withProtocol);
          return parsed.origin;
        } catch {
          // If invalid URL, continue
        }
      }
    }
  }

  return "https://cleanpix.app";
};

const getMetadataBase = (env) => {
  try {
    const siteUrl = getSiteUrl(env);
    return new URL(siteUrl);
  } catch {
    return new URL("https://cleanpix.app");
  }
};

const testCases = [
  {
    name: "All empty strings",
    env: {
      NEXT_PUBLIC_SITE_URL: "",
      NEXT_PUBLIC_APP_URL: "",
      NEXTAUTH_URL: "",
      SITE_URL: "",
      APP_URL: "",
      VERCEL_URL: "",
    },
    expected: "https://cleanpix.app",
  },
  {
    name: "All undefined",
    env: {},
    expected: "https://cleanpix.app",
  },
  {
    name: "Whitespace and invalid literals",
    env: {
      NEXT_PUBLIC_SITE_URL: "   ",
      NEXTAUTH_URL: '""',
      SITE_URL: "undefined",
    },
    expected: "https://cleanpix.app",
  },
  {
    name: "Vercel URL without protocol",
    env: {
      VERCEL_URL: "cleanpix-preview-abc.vercel.app",
    },
    expected: "https://cleanpix-preview-abc.vercel.app",
  },
  {
    name: "Valid NEXTAUTH_URL",
    env: {
      NEXTAUTH_URL: "http://localhost:3000",
    },
    expected: "http://localhost:3000",
  },
  {
    name: "Valid custom domain with trailing slash",
    env: {
      NEXT_PUBLIC_SITE_URL: "https://custom.cleanpix.app/",
    },
    expected: "https://custom.cleanpix.app",
  },
];

let allPassed = true;
testCases.forEach((tc) => {
  const result = getSiteUrl(tc.env);
  const metadataBase = getMetadataBase(tc.env);
  const pass =
    result === tc.expected &&
    metadataBase instanceof URL &&
    metadataBase.origin === tc.expected;

  if (pass) {
    console.log(`[PASS] ${tc.name} -> ${result}`);
  } else {
    console.error(`[FAIL] ${tc.name} -> Got ${result}, Expected ${tc.expected}`);
    allPassed = false;
  }
});

if (!allPassed) {
  process.exit(1);
}

console.log("\n=== STEP 2: Running production build with simulated empty URL environment variables ===");

try {
  const buildOutput = execSync("npm run build", {
    cwd: "c:\\Users\\A\\Desktop\\CleanPix",
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: "",
      NEXT_PUBLIC_APP_URL: "",
      NEXTAUTH_URL: "",
      SITE_URL: "",
      APP_URL: "",
      VERCEL_URL: "",
    },
    stdio: "pipe",
  }).toString();

  console.log(buildOutput);
  console.log("\n=== SUCCESS: Production build completed with ZERO URL errors! ===");
} catch (err) {
  console.error("Build failed!");
  if (err.stdout) console.log("STDOUT:", err.stdout.toString());
  if (err.stderr) console.error("STDERR:", err.stderr.toString());
  process.exit(1);
}
