const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tinfo")
    .setDescription("Show active tournament info"),

  async execute(interaction) {
    const data = tournament.getData();

    if (!data.activeTournament) {
      return interaction.reply({ content: "No active tournament.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle("Active Tournament")
      .addFields(
        { name: "Name", value: data.activeTournament.name },
        { name: "Channel", value: `<#${data.activeTournament.channelId}>` },
        {
          name: "Slots",
          value: `${data.registrations.length}/${data.activeTournament.slots}`
        }
      )
      .setColor("Green");

    await interaction.reply({ embeds: [embed] });
  }
};
