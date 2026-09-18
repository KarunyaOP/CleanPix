const ts = require('typescript');
const path = require('path');

const configPath = ts.findConfigFile(path.join(__dirname, '..'), ts.sys.fileExists, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedCommandLine = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.join(__dirname, '..')
);

// Delete incremental option to avoid the tsBuildInfoFile error
delete parsedCommandLine.options.incremental;

const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);
const targetSource = program.getSourceFile(path.join(__dirname, '..', 'src', 'lib', 'prisma.ts'));
const diagnostics = ts.getPreEmitDiagnostics(program, targetSource);

console.log(`Diagnostics for src/lib/prisma.ts: ${diagnostics.length}`);
diagnostics.forEach(d => {
  const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  console.log(`TS${d.code}: ${message}`);
});
