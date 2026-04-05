const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const DATA_FILE = "tournament.json";

// ===== LOAD DATA =====
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { activeTournament: null, registrations: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// ===== SAVE DATA =====
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let { activeTournament, registrations } = loadData();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Start tournament registration")
    .addStringOption(opt =>
      opt.setName("name").setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("slots").setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("mentions").setRequired(true))
    .addChannelOption(opt =>
      opt.setName("channel").setRequired(true)),

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
        { name: "Format", value: "Team Name- xyz @mentions" },
        { name: "Slots", value: `${slots}`, inline: true },
        { name: "Players", value: `${mentionsReq}`, inline: true }
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

    // ===== CREATE ROLE + GIVE TO IGL =====
    if (message) {
      const lastTeam = registrations[registrations.length - 1];
      if (!lastTeam) return;

      const guild = message.guild;

      // create role with team name
      const role = await guild.roles.create({
        name: lastTeam.teamName,
        reason: "Tournament IGL Role"
      });

      // give role to message author (IGL)
      const member = await guild.members.fetch(message.author.id);
      await member.roles.add(role);
    }
  }
};
