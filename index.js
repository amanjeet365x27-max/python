const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const si = require("./si");
const tournament = require("./tournament");
const slot = require("./slot");
const tinfo = require("./tinfo");
const tclear = require("./tclear");
const tchannel = require("./tchannel");
const winner = require("./winner");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = "1429536669555757068";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
  activities: [{ name: "HEROIC HUSTLE KI JAY", type: 0 }],
  status: "online"
});

  const commands = [
    si.data.toJSON(),
    tournament.data.toJSON(),
    slot.data.toJSON(),
    tinfo.data.toJSON(),
    tclear.data.toJSON(),
    tchannel.data.toJSON(),
    winner.data.toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    // Clear global commands (this removes the duplicates)
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [] }
    );

    // Register only in your server (fast & no duplicates)
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Slash commands registered successfully (duplicates cleared)");
  } catch (error) {
    console.error(error);
  }
});

// ================= JOIN/LEAVE TRACKING =================
client.on("guildMemberAdd", () => {
  const now = Date.now();
  si.joins.push(now);
  si.joins = si.joins.filter(t => now - t < 86400000);
});

client.on("guildMemberRemove", () => {
  const now = Date.now();
  si.leaves.push(now);
  si.leaves = si.leaves.filter(t => now - t < 86400000);
});

// ================= COMMAND HANDLER =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "serverinfo") await si.execute(interaction);
  if (interaction.commandName === "tournament") await tournament.execute(interaction);
  if (interaction.commandName === "slot") await slot.execute(interaction);
  if (interaction.commandName === "tinfo") await tinfo.execute(interaction);
  if (interaction.commandName === "tclear") await tclear.execute(interaction);
  if (interaction.commandName === "tchannel") await tchannel.execute(interaction);
  if (interaction.commandName === "winner") await winner.execute(interaction);
});

// ================= MESSAGE LISTENER - FIXED (No unwanted replies) =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const data = await tournament.getData();
  if (!data.tournaments || Object.keys(data.tournaments).length === 0) return;

  for (let tName in data.tournaments) {
    const t = data.tournaments[tName];

    if (message.channel.id !== t.channelId) continue;

    // If full → stay completely silent
    if (t.registrations && t.registrations.length >= t.slots) {
      return;
    }

    // Only register if slots are open
    await tournament.register(message, t);
    return;
  }
});

// ================= LOGIN =================
client.login(TOKEN);