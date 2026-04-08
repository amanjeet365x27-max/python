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
    console.log("Registering commands...");

    const result = await Promise.race([
      rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT ERROR")), 10000)
      )
    ]);

    console.log("✅ SUCCESS REGISTERED");
    console.log(result);
  } catch (err) {
    console.error("❌ ERROR FOUND:");
    console.error(err);
  }
});

// ================= LOGIN =================
client.login(TOKEN);
