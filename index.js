const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const si = require("./si");
const tournament = require("./tournament");
const slot = require("./slot");
const tinfo = require("./tinfo");
const tclear = require("./tclear");

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
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    si.data.toJSON(),
    tournament.data.toJSON(),
    slot.data.toJSON(),
    tinfo.data.toJSON(),
    tclear.data.toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("Slash commands registered");
  } catch (error) {
    console.error(error);
  }
});

// ================= JOIN/LEAVE =================
client.on("guildMemberAdd", () => {
  si.joins.push(Date.now());
  const now = Date.now();
  si.joins = si.joins.filter(t => now - t < 86400000 * 2);
});

client.on("guildMemberRemove", () => {
  si.leaves.push(Date.now());
  const now = Date.now();
  si.leaves = si.leaves.filter(t => now - t < 86400000 * 2);
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

  if (interaction.commandName === "slot") {
    await slot.execute(interaction);
  }

  if (interaction.commandName === "tinfo") {
    await tinfo.execute(interaction);
  }

  if (interaction.commandName === "tclear") {
    await tclear.execute(interaction);
  }
});

// ================= MESSAGE LISTENER =================
client.on("messageCreate", async (message) => {
  const data = tournament.getData();

  if (!data.activeTournament) return;
  if (data.registrations.length >= data.activeTournament.slots) return;

  if (message.channel.id !== data.activeTournament.channelId) return;
  if (message.author.bot) return;

  // ===== ✅ ONLY FIXED PART (VALIDATION) =====
  const result = tournament.validateMessage(message, data);

  if (typeof result === "string") {
    return message.reply(result);
  }

  const { teamName, mentions } = result;

  // ===== DUPLICATE CHECK =====
  for (let m of mentions) {
    const embed = tournament.getDuplicateEmbed(m);
    if (embed) {
      return message.reply({ embeds: [embed] });
    }
  }

  // ===== SAVE TEAM =====
  data.registrations.push({
    teamName,
    members: mentions,
    leaderId: message.author.id
  });

  // ===== SAVE + ROLE =====
  await tournament.updateData(data, message);

  // ===== SUCCESS EMBED =====
  const successEmbed = {
    color: 0x00ff00,
    description: `**Registration Successful**`
  };

  await message.reply({ embeds: [successEmbed] });

  // ===== FULL =====
  if (data.registrations.length >= data.activeTournament.slots) {

    const fullEmbed = {
      color: 0xff0000,
      title: "Registration Closed",
      description: "All slots are filled.\nRoadmap will be announced soon."
    };

    await message.channel.send({ embeds: [fullEmbed] });

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );
  }
});

// ================= LOGIN =================
client.login(TOKEN);
