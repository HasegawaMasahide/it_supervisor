// Sample TypeScript file with intentional issues for demonstration

// Unused variable (ESLint will catch this)
const unusedVariable = 'This variable is never used';

// Missing type annotation
function add(a, b) {
  return a + b;
}

// Inconsistent quotes
const message = "Hello, world!"; // Should use single quotes
const greeting = 'Hi there';

// Missing semicolons
const x = 10
const y = 20

// Console.log (often flagged by linters in production code)
console.log('Debug message');

// Arrow function without braces
const double = (n: number) => n * 2

// Export to make this a module
export { add, message, greeting, double };
