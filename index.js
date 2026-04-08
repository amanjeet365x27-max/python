const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const si = require("./si");
const tournament = require("./tournament");
const slot = require("./slot");
const tinfo = require("./tinfo");
const tclear = require("./tclear");
const tchannel = require("./tchannel");
const winner = require("./winner");
const wslot = require("./wslot");
const wchannel = require("./wchannel");
const wclear = require("./wclear");
const tcancel = require("./tcancel"); // ✅ added
const tbackup = require("./tbackup"); // ✅ added

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

  console.log("Building slash commands...");

  const commands = [];
  const commandFiles = [
    { name: "si", module: si },
    { name: "tournament", module: tournament },
    { name: "slot", module: slot },
    { name: "tinfo", module: tinfo },
    { name: "tclear", module: tclear },
    { name: "tchannel", module: tchannel },
    { name: "winner", module: winner },
    { name: "wslot", module: wslot },
    { name: "wchannel", module: wchannel },
    { name: "wclear", module: wclear },
    { name: "tcancel", module: tcancel },
    { name: "tbackup", module: tbackup }
  ];

  for (const cmd of commandFiles) {
    try {
      commands.push(cmd.module.data.toJSON());
      console.log(`Loaded command: ${cmd.name}`);
    } catch (e) {
      console.error(`Failed to load command ${cmd.name}:`, e.message);
    }
  }

  console.log(`Loaded ${commands.length} commands successfully`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Slash commands fully refreshed");
  } catch (error) {
    console.error("Failed to register commands to Discord:", error);
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
  if (interaction.commandName === "wslot") await wslot.execute(interaction);
  if (interaction.commandName === "wchannel") await wchannel.execute(interaction);
  if (interaction.commandName === "wclear") await wclear.execute(interaction);
  if (interaction.commandName === "tcancel") await tcancel.execute(interaction); // ✅ added
  if (interaction.commandName === "tbackup") await tbackup.execute(interaction); // ✅ added
});

// ================= MESSAGE LISTENER =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const data = await tournament.getData();
  if (!data.tournaments || Object.keys(data.tournaments).length === 0) return;

  for (let tName in data.tournaments) {
    const t = data.tournaments[tName];

    if (message.channel.id !== t.channelId) continue;

    // ❌ FULL → STOP
    if (t.registrations && t.registrations.length >= t.slots) {
      return;
    }

    // ❌ AFTER CANCEL → DON'T AUTO START AGAIN
    if (t.backupMode !== true && t.registrations.length < t.slots && t.registrations.length !== 0) {
      return;
    }

    await tournament.register(message, t);
    return;
  }
});

// ================= LOGIN =================
client.login(TOKEN);
