const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tinfo")
    .setDescription("Show all running tournaments"),

  async execute(interaction) {
    const data = await tournament.getData(); // ✅ FIXED

    if (!data.tournaments || Object.keys(data.tournaments).length === 0) {
      return interaction.reply({ content: "No tournaments running", ephemeral: true });
    }

    let desc = "";

    for (let name in data.tournaments) {
      const t = data.tournaments[name];

      desc += `• **${name}**\n`;
      desc += `Channel: <#${t.channelId}>\n`;
      desc += `Slots: ${t.registrations.length}/${t.slots}\n\n`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Active Tournaments")
      .setDescription(desc);

    await interaction.reply({ embeds: [embed] });
  }
};
