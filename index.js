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
  console.log(`✅ Logged in as ${client.user.tag}`);
  
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
    tbackup.data.toJSON()
  ];

  console.log(`📝 Commands to register: ${commands.map(c => c.name).join(", ")}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  
  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);
    
    // Delete existing commands first
    console.log("🗑️ Clearing old commands...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );
    console.log("✅ Old commands cleared!");
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Register new commands
    console.log("📤 Registering new guild commands...");
    const result = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ Successfully registered ${result.length} guild commands!`);
    console.log(`📋 Registered commands: ${result.map(c => c.name).join(", ")}`);
    
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    if (error.rawError) {
      console.error("❌ Raw Error Details:", JSON.stringify(error.rawError, null, 2));
    }
    if (error.requestBody) {
      console.error("❌ Request Body:", JSON.stringify(error.requestBody, null, 2));
    }
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
    console.log(`🎮 Command received: ${interaction.commandName} from ${interaction.user.tag}`);
    
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
  } catch (error) {
    console.error("❌ Command execution error:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: "An error occurred while executing this command.", 
        ephemeral: true 
      }).catch(console.error);
    }
  }
});

// ================= MESSAGE LISTENER =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    const data = await tournament.getData();
    if (!data.tournaments || Object.keys(data.tournaments).length === 0) return;

    for (let tName in data.tournaments) {
      const t = data.tournaments[tName];

      // Check if message is in backup channel
      if (t.backup && t.backup.enabled && message.channel.id === t.backup.channelId) {
        return;
      }

      // Check if message is in main registration channel
      if (message.channel.id !== t.channelId) continue;

      // Stop if registration is closed or full
      if (t.regClosed || (t.registrations && t.registrations.filter(r => r != null).length >= t.slots)) {
        return;
      }

      // Process normal registration
      await tournament.register(message, t);
      return;
    }
  } catch (error) {
    console.error("❌ Message processing error:", error);
  }
});

// ================= ERROR HANDLERS =================
client.on("error", error => {
  console.error("❌ Client error:", error);
});

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled promise rejection:", error);
});

// ================= LOGIN =================
console.log("🚀 Starting bot...");
client.login(TOKEN).catch(err => {
  console.error("❌ Failed to login:", err);
  process.exit(1);
});
