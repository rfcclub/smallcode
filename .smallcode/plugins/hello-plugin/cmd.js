// Plugin command handler — executes when user types /greet
module.exports = function greetCmd(args) {
  const name = args || 'world';
  return `  👋 Hello, ${name}! (from hello-plugin)`;
};
