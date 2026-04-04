const { Client, GatewayIntentBits } = require("discord.js");

// 🛑 prevent multiple instances (VERY IMPORTANT)
if (global.botRunning) {
  console.log("Bot already running, skipping duplicate instance");
  process.exit(0);
}
global.botRunning = true;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!calc")) return;

  console.log("Handled once:", message.content);

  try {
    const expr = message.content.replace("!calc", "").trim();
    const result = eval(expr);
    message.reply(`Result: ${result}`);
  } catch {
    message.reply("Invalid calculation");
  }
});

// ✅ use YOUR secret name
client.login(process.env.DISCORD_BOT_TOKEN);
