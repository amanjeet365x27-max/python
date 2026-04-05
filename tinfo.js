const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tinfo")
    .setDescription("Show all active tournaments"),

  async execute(interaction) {
    const data = tournament.getData();

    if (!data.tournaments || Object.keys(data.tournaments).length === 0) {
      return interaction.reply({ content: "No active tournaments.", ephemeral: true });
    }

    let desc = "";

    for (let name in data.tournaments) {
      const t = data.tournaments[name];

      desc += `**• ${t.name}**\n`;
      desc += `Channel: <#${t.channelId}>\n`;
      desc += `Slots: ${t.registrations.length}/${t.slots}\n\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("Active Tournaments")
      .setDescription(desc)
      .setColor("Green");

    await interaction.reply({ embeds: [embed] });
  }
};
