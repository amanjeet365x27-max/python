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

    if (!t) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }

    const total = t.slots || 0;
    const filled = t.registrations ? t.registrations.length : 0;
    const remaining = total - filled;

    const embed = new EmbedBuilder()
      .setColor(0xff9900)
      .setTitle(`**Tournament Info - ${t.name}**`)
      .setDescription(
        `**Channel:** <#${t.channelId}>\n` +
        `**Total Slots:** ${total}\n` +
        `**Filled Slots:** ${filled}\n` +
        `**Remaining Slots:** ${remaining}`
      )
      .addFields(
        {
          name: "Status",
          value: remaining > 0 
            ? "🟢 **Registration Open**" 
            : "🔴 **Registration Closed**",
          inline: true
        }
      )
      .setFooter({ text: "Use /slot to see detailed team list" });

    await interaction.reply({ embeds: [embed] });
  }
};
