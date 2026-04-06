const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tinfo")
    .setDescription("Show info of a tournament")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name")
        .setRequired(true)
    ),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const data = await tournament.getData();
    const t = data.tournaments[name];

    if (!t) return interaction.reply({ content: "Tournament not found.", ephemeral: true });

    const totalSlots = t.slots;
    const filledSlots = t.registrations.length;
    const remainingSlots = totalSlots - filledSlots;

    const embed = new EmbedBuilder()
      .setColor(0xff9900)
      .setTitle(`**Tournament Info – ${t.name}**`)
      .setDescription(
        `**Channel:** <#${t.channelId}>\n` +
        `**Total Slots:** ${totalSlots}\n` +
        `**Slots Filled:** ${filledSlots}\n` +
        `**Slots Remaining:** ${remainingSlots}`
      );

    await interaction.reply({ embeds: [embed] });
  }
};