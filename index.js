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
const tcancel = require("./tcancel");
const tbackup = require("./tbackup");
const tadd = require("./tadd"); // ✅ ADDED

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

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
    winner.data.toJSON(),
    wslot.data.toJSON(),
    wchannel.data.toJSON(),
    wclear.data.toJSON(),
    tcancel.data.toJSON(),
    tbackup.data.toJSON(),
    tadd.data.toJSON() // ✅ ADDED
  ];

  console.log(`Built ${commands.length} commands`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("Registering GLOBAL commands...");

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("✅ GLOBAL commands registered");
  } catch (err) {
    console.error("❌ ERROR:");
    console.error(err);
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

  try {
    await interaction.deferReply();

    const originalReply = interaction.reply.bind(interaction);
    interaction.reply = (options) => {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(options);
      }
      return originalReply(options);
    };

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
    if (interaction.commandName === "tcancel") await tcancel.execute(interaction);
    if (interaction.commandName === "tbackup") await tbackup.execute(interaction);
    if (interaction.commandName === "tadd") await tadd.execute(interaction); // ✅ ADDED

  } catch (err) {
    console.error("Command Error:", err);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "❌ Error while executing command." });
    } else {
      await interaction.reply({ content: "❌ Error while executing command." });
    }
  }
});

// ================= MESSAGE LISTENER =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const data = await tournament.getData();
  if (!data.tournaments || Object.keys(data.tournaments).length === 0) return;

  for (let tName in data.tournaments) {
    const t = data.tournaments[tName];

    if (message.channel.id !== t.channelId) continue;

    if (t.registrations && t.registrations.length >= t.slots) {
      return;
    }

    await tournament.register(message, t);
    return;
  }
});

// ================= LOGIN =================
client.login(TOKEN);
