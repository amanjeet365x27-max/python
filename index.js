const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const si = require("./si");   // Make sure the file is named si.js

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences // 🔥 ADD THIS (VERY IMPORTANT)
  ],
});

client.once("clientReady", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [si.data.toJSON()];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Slash commands registered successfully");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
});

// ==================== TRACK JOINS & LEAVES ====================
client.on("guildMemberAdd", (member) => {
  si.joins.push(Date.now());

  const now = Date.now();
  si.joins = si.joins.filter((t) => now - t < 86400000 * 2);
});

client.on("guildMemberRemove", (member) => {
  si.leaves.push(Date.now());

  const now = Date.now();
  si.leaves = si.leaves.filter((t) => now - t < 86400000 * 2);
});

// ==================== COMMAND HANDLER ====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "serverinfo") {
    await si.execute(interaction);
  }
});

client.login(TOKEN);
