const assert = require('assert');
const { PrismaClient, AuthProvider, DetectedObject, ProjectStatus, ExportFormat } = require('@prisma/client');
const prisma = new PrismaClient();

console.log("=== PRISMA AUTH MODELS AUDIT ===");

console.log("\n1. Verifying Model Accessors on Prisma Client:");
assert(typeof prisma.user !== 'undefined', 'User model must exist');
console.log("  ✓ prisma.user exists");

assert(typeof prisma.account !== 'undefined', 'Account model must exist');
console.log("  ✓ prisma.account exists");

assert(typeof prisma.session !== 'undefined', 'Session model must exist');
console.log("  ✓ prisma.session exists");

assert(typeof prisma.verificationToken !== 'undefined', 'VerificationToken model must exist');
console.log("  ✓ prisma.verificationToken exists");

assert(typeof prisma.project !== 'undefined', 'Project model must exist');
console.log("  ✓ prisma.project exists");

assert(typeof prisma.export !== 'undefined', 'Export model must exist');
console.log("  ✓ prisma.export exists");

console.log("\n2. Verifying Schema Enums:");
console.log("  ✓ AuthProvider:", Object.values(AuthProvider));
console.log("  ✓ DetectedObject:", Object.values(DetectedObject));
console.log("  ✓ ProjectStatus:", Object.values(ProjectStatus));
console.log("  ✓ ExportFormat:", Object.values(ExportFormat));

console.log("\n==========================================");
console.log("ALL PRISMA AUTH MODELS VERIFIED 100%!");
console.log("==========================================");
