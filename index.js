const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const si = require("./si");
const tournament = require("./tournament");

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

// ================= READY =================
client.once("clientReady", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    si.data.toJSON(),
    tournament.data.toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Slash commands registered successfully");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
});

// ================= JOIN/LEAVE =================
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

// ================= COMMAND HANDLER =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "serverinfo") {
    await si.execute(interaction);
  }

  if (interaction.commandName === "tournament") {
    await tournament.execute(interaction);
  }
});

// ================= 🔥 MESSAGE LISTENER =================
client.on("messageCreate", async (message) => {
  const data = tournament.getData();

  if (!data.activeTournament) return;
  if (message.channel.id !== data.activeTournament.channelId) return;
  if (message.author.bot) return;

  const content = message.content;

  // ===== FORMAT CHECK =====
  if (!content.toLowerCase().startsWith("team name-")) {
    return message.reply("❌ Use format: `Team Name- xyz @mentions`");
  }

  const mentions = [...message.mentions.users.values()];
  const teamName = content.split("Team Name-")[1]?.split("@")[0]?.trim();

  if (!teamName) {
    return message.reply("❌ Invalid team name format.");
  }

  // ===== MENTION COUNT CHECK =====
  if (mentions.length !== data.activeTournament.mentionsReq) {
    return message.reply(
      `❌ You must mention exactly ${data.activeTournament.mentionsReq} players.`
    );
  }

  // ===== DUPLICATE PLAYER CHECK =====
  for (let m of mentions) {
    const already = data.registrations.find(t =>
      t.members.includes(m.id)
    );

    if (already) {
      return message.reply(
        `❌ <@${m.id}> already in **${already.teamName}**`
      );
    }
  }

  // ===== SLOT FULL CHECK =====
  if (data.registrations.length >= data.activeTournament.slots) {
    return message.reply("❌ Slots already full!");
  }

  // ===== SAVE TEAM =====
  data.registrations.push({
    teamName,
    members: mentions.map(m => m.id)
  });

  message.reply(
    `✅ Team **${teamName}** registered! (${data.registrations.length}/${data.activeTournament.slots})`
  );

  // ===== SAVE TO FILE ✅ =====
  tournament.updateData(data);

  // ===== CLOSE REGISTRATION =====
  if (data.registrations.length >= data.activeTournament.slots) {
    await message.channel.send("🚫 Registration full! Channel locked.");

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );
  }
});

// ================= LOGIN =================
client.login(TOKEN);
