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
const tbackup = require("./tbackup");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = "1429536669555757068";

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ MISSING TOKEN OR CLIENT_ID!");
  process.exit(1);
}

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

  // Build commands array
  const commands = [];
  
  try {
    commands.push(si.data.toJSON());
    commands.push(tournament.data.toJSON());
    commands.push(slot.data.toJSON());
    commands.push(tinfo.data.toJSON());
    commands.push(tclear.data.toJSON());
    commands.push(tchannel.data.toJSON());
    commands.push(winner.data.toJSON());
    commands.push(wslot.data.toJSON());
    commands.push(wchannel.data.toJSON());
    commands.push(wclear.data.toJSON());
    commands.push(tbackup.data.toJSON());
  } catch (err) {
    console.error("❌ Error building commands:", err.message);
    return;
  }

  console.log(`📝 Built ${commands.length} commands: ${commands.map(c => c.name).join(", ")}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  
  // Register commands with timeout protection
  const registerCommands = async () => {
    try {
      console.log("🗑️ Step 1: Clearing old commands...");
      
      const clearResult = await Promise.race([
        rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Clear timeout")), 10000))
      ]);
      
      console.log("✅ Step 1 DONE: Old commands cleared!");
      
      console.log("📤 Step 2: Registering new commands...");
      
      const registerResult = await Promise.race([
        rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Register timeout")), 15000))
      ]);
      
      console.log("✅ Step 2 DONE: Commands registered!");
      console.log(`🎉 SUCCESS! ${registerResult.length} commands are now live!`);
      console.log(`📋 Commands: ${registerResult.map(c => c.name).join(", ")}`);
      
      return true;
      
    } catch (error) {
      console.error("❌ Registration ERROR:");
      console.error("   Message:", error.message);
      console.error("   Name:", error.name);
      
      if (error.code) console.error("   Code:", error.code);
      if (error.status) console.error("   Status:", error.status);
      if (error.method) console.error("   Method:", error.method);
      if (error.url) console.error("   URL:", error.url);
      
      // Try simpler registration on error
      console.log("🔄 Retrying with simpler method...");
      
      try {
        const simpleResult = await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
          { body: commands }
        );
        console.log(`✅ RETRY SUCCESS! ${simpleResult.length} commands registered!`);
        return true;
      } catch (retryError) {
        console.error("❌ RETRY FAILED:", retryError.message);
        return false;
      }
    }
  };
  
  await registerCommands();
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
    console.log(`🎮 Command: ${interaction.commandName} by ${interaction.user.tag}`);
    
    const commandMap = {
      "serverinfo": si,
      "tournament": tournament,
      "slot": slot,
      "tinfo": tinfo,
      "tclear": tclear,
      "tchannel": tchannel,
      "winner": winner,
      "wslot": wslot,
      "wchannel": wchannel,
      "wclear": wclear,
      "tbackup": tbackup
    };
    
    const handler = commandMap[interaction.commandName];
    if (handler) {
      await handler.execute(interaction);
    }
    
  } catch (error) {
    console.error(`❌ Command error [${interaction.commandName}]:`, error.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: "An error occurred.", 
        ephemeral: true 
      }).catch(() => {});
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

      if (t.backup && t.backup.enabled && message.channel.id === t.backup.channelId) {
        return;
      }

      if (message.channel.id !== t.channelId) continue;

      if (t.regClosed || (t.registrations && t.registrations.filter(r => r != null).length >= t.slots)) {
        return;
      }

      await tournament.register(message, t);
      return;
    }
  } catch (error) {
    console.error("❌ Message error:", error.message);
  }
});

// ================= ERROR HANDLERS =================
client.on("error", error => {
  console.error("❌ Discord client error:", error.message);
});

client.on("warn", info => {
  console.warn("⚠️ Warning:", info);
});

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled rejection:", error.message);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught exception:", error.message);
  process.exit(1);
});

// ================= LOGIN =================
console.log("🚀 Bot starting...");
console.log("📍 Guild ID:", GUILD_ID);
console.log("🤖 Client ID:", CLIENT_ID ? "Set ✅" : "Missing ❌");
console.log("🔑 Token:", TOKEN ? "Set ✅" : "Missing ❌");

client.login(TOKEN).catch(err => {
  console.error("❌ Login failed:", err.message);
  process.exit(1);
});
