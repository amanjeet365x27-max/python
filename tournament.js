const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const DATA_FILE = "tournament.json";

// ===== LOAD OLD DATA =====
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { activeTournament: null, registrations: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// ===== SAVE DATA =====
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// load at start
let { activeTournament, registrations } = loadData();

// ===== COMMAND =====
module.exports = {
  data: new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Start tournament registration")
    .addStringOption(opt =>
      opt.setName("name").setDescription("Tournament name").setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("slots").setDescription("Total slots").setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("mentions").setDescription("Mentions required per team").setRequired(true))
    .addChannelOption(opt =>
      opt.setName("channel").setDescription("Registration channel").setRequired(true)),

  async execute(interaction) {

    const ADMIN_ROLE_ID = "1488964288210272458"; // ✅ YOUR ADMIN ROLE

    // ===== ADMIN CHECK =====
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "❌ Only admins can use this!", ephemeral: true });
    }

    const name = interaction.options.getString("name");
    const slots = interaction.options.getInteger("slots");
    const mentionsReq = interaction.options.getInteger("mentions");
    const channel = interaction.options.getChannel("channel");

    // ===== RESET =====
    activeTournament = {
      name,
      slots,
      mentionsReq,
      channelId: channel.id
    };

    registrations = [];

    // ===== SAVE =====
    saveData({ activeTournament, registrations });

    await interaction.reply(`✅ Tournament **${name}** started in ${channel}`);

    await channel.send(
      `🏆 **${name} Registration Started!**\n\n` +
      `📌 Format:\nTeam Name- xyz @p1 @p2 ...\n\n` +
      `👥 Mentions Required: ${mentionsReq}\n🎯 Slots: ${slots}`
    );
  },

  // ===== EXPORT DATA FOR INDEX.JS =====
  getData() {
    return { activeTournament, registrations };
  },

  updateData(newData) {
    activeTournament = newData.activeTournament;
    registrations = newData.registrations;
    saveData({ activeTournament, registrations });
  }
};
