const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slot")
    .setDescription("View all slots")
    .addStringOption(opt =>
      opt.setName("name")
        .setDescription("Tournament name")
        .setRequired(true)),

  async execute(interaction) {
    const data = tournament.getData();

    if (!data.activeTournament) {
      return interaction.reply({ content: "No active tournament.", ephemeral: true });
    }

    if (data.activeTournament.name !== interaction.options.getString("name")) {
      return interaction.reply({ content: "Tournament not found.", ephemeral: true });
    }

    let desc = "";

    data.registrations.forEach((team, i) => {
      desc += `**• Slot ${i + 1}**\n`;
      desc += `Team: **${team.teamName}**\n`;
      desc += `IGL: <@${team.leaderId}>\n\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`${data.activeTournament.name} Slots`)
      .setDescription(desc || "No teams yet.")
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  }
};
