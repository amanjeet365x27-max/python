const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const DATA_FILE = "tournament.json";

// ===== LOAD =====
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { activeTournament: null, registrations: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// ===== SAVE =====
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let { activeTournament, registrations } = loadData();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Start tournament registration")

    .addStringOption(opt =>
      opt.setName("name").setDescription("Tournament name").setRequired(true))

    .addIntegerOption(opt =>
      opt.setName("slots").setDescription("Total slots").setRequired(true))

    .addIntegerOption(opt =>
      opt.setName("mentions").setDescription("Players per team").setRequired(true))

    .addChannelOption(opt =>
      opt.setName("channel").setDescription("Registration channel").setRequired(true)),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";

    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admins can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");
    const slots = interaction.options.getInteger("slots");
    const mentionsReq = interaction.options.getInteger("mentions");
    const channel = interaction.options.getChannel("channel");

    activeTournament = {
      name,
      slots,
      mentionsReq,
      channelId: channel.id
    };

    registrations = [];

    saveData({ activeTournament, registrations });

    const embed = new EmbedBuilder()
      .setTitle(name)
      .setDescription("Tournament Registration Open")
      .addFields(
        {
          name: "Format",
          value: "Team Name- YOUR TEAM NAME\n@mentions"
        },
        {
          name: "Total Slots",
          value: `${slots}`,
          inline: true
        },
        {
          name: "Players per Team",
          value: `${mentionsReq}`,
          inline: true
        }
      )
      .setImage("https://cdn.oneesports.id/cdn-data/sites/2/2024/12/462574290_1265728211300654_4514308865345103186_n.jpg")
      .setColor("Red");

    await interaction.reply({ content: `Started in ${channel}`, ephemeral: true });
    await channel.send({ embeds: [embed] });
  },

  getData() {
    return { activeTournament, registrations };
  },

  async updateData(newData, message) {
    activeTournament = newData.activeTournament;
    registrations = newData.registrations;

    saveData({ activeTournament, registrations });

    // ===== ROLE (FIXED NAME CLEAN) =====
    if (message) {
      const lastTeam = registrations[registrations.length - 1];
      if (!lastTeam) return;

      const cleanName = lastTeam.teamName.replace(/[<>@#]/g, "").trim();

      const role = await message.guild.roles.create({
        name: cleanName,
        reason: "Tournament IGL Role"
      });

      const member = await message.guild.members.fetch(lastTeam.leaderId);
      await member.roles.add(role);
    }
  },

  // ===== DUPLICATE EMBED (FIXED) =====
  getDuplicateEmbed(playerId) {
    const team = registrations.find(t => t.members.includes(playerId));
    if (!team) return null;

    const slot = registrations.indexOf(team) + 1;

    return new EmbedBuilder()
      .setColor("Orange")
      .setTitle("Player Already Registered")
      .setDescription(
        `**Team:** ${team.teamName}\n` +
        `**Slot:** ${slot}\n\n` +
        `**Players:**\n${team.members.map(id => `<@${id}>`).join("\n")}\n\n` +
        `**Registered By:** <@${team.leaderId}>`
      );
  }
};
