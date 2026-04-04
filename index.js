const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const si = require("./si");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [si.data.toJSON()];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("Slash command registered");
});

// track joins/leaves
client.on("guildMemberAdd", () => {
  si.joins.push(Date.now());
});

client.on("guildMemberRemove", () => {
  si.leaves.push(Date.now());
});

// command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "serverinfo") {
    await si.execute(interaction);
  }
});

client.login(TOKEN);
