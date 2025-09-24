export function logWithLocation(...args: any[]) {
  const error = new Error();
  const stack = error.stack;

  if (stack) {
    // The stack trace typically looks like:
    // Error
    //    at logWithLocation (your_file.ts:line:column)
    //    at yourFunction (another_file.ts:line:column)
    // We want the line *after* logWithLocation, which is the actual call site.
    const stackLines = stack.split('\n');
    // Find the line that refers to the call to logWithLocation itself
    const logWithLocationLineIndex = stackLines.findIndex((line) =>
      line.includes('logWithLocation'),
    );

    // If found, take the next line which is the actual caller
    if (
      logWithLocationLineIndex !== -1 &&
      logWithLocationLineIndex + 1 < stackLines.length
    ) {
      const callerLine = stackLines[logWithLocationLineIndex + 1];
      // Extract filename and line number (and column if desired)
      const match = callerLine.match(/\(([^:]+):(\d+):(\d+)\)/);
      if (match && match.length >= 4) {
        const filePath = match[1];
        const lineNumber = match[2];
        const fileName = filePath.split('/').pop()?.split('\\').pop(); // Get just the filename

        console.log(`[${fileName}:${lineNumber}]`, ...args);
        return;
      }
    }
  }
  // Fallback to regular console.log if location extraction fails
  console.log(...args);
}
