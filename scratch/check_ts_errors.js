const ts = require('typescript');
const path = require('path');

const configPath = ts.findConfigFile(path.join(__dirname, '..'), ts.sys.fileExists, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedCommandLine = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.join(__dirname, '..')
);

const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);
const diagnostics = ts.getPreEmitDiagnostics(program);

console.log(`Found ${diagnostics.length} diagnostic(s):`);

diagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): [TS${diagnostic.code}] ${message}`);
  } else {
    console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
});
