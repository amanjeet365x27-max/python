const { SlashCommandBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tclear")
    .setDescription("Clear a tournament")
    .addStringOption(option =>
      option.setName("name").setDescription("Tournament name").setRequired(true)
    ),

  async execute(interaction) {
    const ADMIN_ID = "1488964288210272458";

    if (interaction.user.id !== ADMIN_ID) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");

    const data = await tournament.getData(); // ✅ FIXED

    if (!data.tournaments || !data.tournaments[name]) {
      return interaction.reply({ content: "Tournament not found", ephemeral: true });
    }

    delete data.tournaments[name];

    await tournament.saveData(data); // ✅ FIXED

    await interaction.reply(`Tournament **${name}** cleared successfully`);
  }
};
