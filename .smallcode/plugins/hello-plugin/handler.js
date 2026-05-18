// Plugin tool handler — executes when the model calls greet_user
module.exports = function greetUser(args) {
  const name = args.name || 'friend';
  const style = args.style || 'casual';

  const greetings = {
    formal: `Good day, ${name}. It is a pleasure to assist you.`,
    casual: `Hey ${name}! What's up?`,
    pirate: `Ahoy, ${name}! Welcome aboard, ye scurvy coder!`,
  };

  return { result: greetings[style] || greetings.casual };
};
