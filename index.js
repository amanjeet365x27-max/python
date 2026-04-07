const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");

function loadCommand(file) {
  try {
    return require(file);
  } catch (e) {
    console.error(`Failed loading ${file}:`, e);
    return null;
  }
}

const si = loadCommand("./si");
const tournament = loadCommand("./tournament");
const slot = loadCommand("./slot");
const tinfo = loadCommand("./tinfo");
const tclear = loadCommand("./tclear");
const tchannel = loadCommand("./tchannel");
const winner = loadCommand("./winner");
const wslot = loadCommand("./wslot");
const wchannel = loadCommand("./wchannel");
const wclear = loadCommand("./wclear");
const tcancel = loadCommand("./tcancel");
const tbackup = loadCommand("./tbackup");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = "1429536669555757068";

console.log("CLIENT_ID:", CLIENT_ID);

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

  const commands = [];

  const allCommands = [
    si,
    tournament,
    slot,
    tinfo,
    tclear,
    tchannel,
    winner,
    wslot,
    wchannel,
    wclear,
    tcancel,
    tbackup
  ].filter(Boolean);

  for (const cmd of allCommands) {
    try {
      if (!cmd.data) {
        console.log("Skipped bad command");
        continue;
      }

      const json = cmd.data.toJSON();
      commands.push(json);
      console.log(`Loaded command: ${json.name}`);
    } catch (e) {
      console.error("Broken command schema:", e);
    }
  }

  console.log("Registering slash commands...");

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands fully refreshed");
  } catch (error) {
    console.error("Command registration failed:", error.rawError || error);
  }
});

client.on("guildMemberAdd", () => {
  const now = Date.now();
  if (si) {
    si.joins.push(now);
    si.joins = si.joins.filter(t => now - t < 86400000);
  }
});

client.on("guildMemberRemove", () => {
  const now = Date.now();
  if (si) {
    si.leaves.push(now);
    si.leaves = si.leaves.filter(t => now - t < 86400000);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "serverinfo" && si) await si.execute(interaction);
  if (interaction.commandName === "tournament" && tournament) await tournament.execute(interaction);
  if (interaction.commandName === "slot" && slot) await slot.execute(interaction);
  if (interaction.commandName === "tinfo" && tinfo) await tinfo.execute(interaction);
  if (interaction.commandName === "tclear" && tclear) await tclear.execute(interaction);
  if (interaction.commandName === "tchannel" && tchannel) await tchannel.execute(interaction);
  if (interaction.commandName === "winner" && winner) await winner.execute(interaction);
  if (interaction.commandName === "wslot" && wslot) await wslot.execute(interaction);
  if (interaction.commandName === "wchannel" && wchannel) await wchannel.execute(interaction);
  if (interaction.commandName === "wclear" && wclear) await wclear.execute(interaction);
  if (interaction.commandName === "tcancel" && tcancel) await tcancel.execute(interaction);
  if (interaction.commandName === "tbackup" && tbackup) await tbackup.execute(interaction);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!tournament) return;

  const data = await tournament.getData();
  if (!data.tournaments || Object.keys(data.tournaments).length === 0) return;

  for (let tName in data.tournaments) {
    const t = data.tournaments[tName];

    if (message.channel.id !== t.channelId) continue;

    if (t.registrations && t.registrations.length >= t.slots) return;

    if (t.backupMode !== true && t.registrations.length < t.slots && t.registrations.length !== 0) return;

    await tournament.register(message, t);
    return;
  }
});

client.login(TOKEN);
