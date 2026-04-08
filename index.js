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
    tbackup.data.toJSON()
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

// ================= LOGIN =================
client.login(TOKEN);
