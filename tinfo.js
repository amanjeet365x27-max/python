const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tinfo")
    .setDescription("Show info of a tournament or all active tournaments")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name (optional - leave blank to see all)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const data = await tournament.getData();

    if (!data.tournaments || Object.keys(data.tournaments).length === 0) {
      return interaction.reply({ 
        content: "No active tournaments found on this server.", 
        ephemeral: true 
      });
    }

    // ================= SINGLE TOURNAMENT INFO =================
    if (name) {
      const t = data.tournaments[name];
      if (!t) {
        return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
      }

      const total = t.slots || 0;
      const filled = t.registrations ? t.registrations.length : 0;
      const remaining = total - filled;
      const createdTime = t.createdAt 
        ? `<t:${Math.floor(t.createdAt / 1000)}:R>` 
        : "Unknown";

      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle(`**Tournament Info - ${t.name}**`)
        .setDescription(
          `**Channel:** <#${t.channelId}>\n` +
          `**Total Slots:** ${total}\n` +
          `**Filled Slots:** ${filled}\n` +
          `**Remaining Slots:** ${remaining}\n` +
          `**Created:** ${createdTime}`
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
        .setFooter({ text: "Use /slot to see detailed team list" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ================= ALL ACTIVE TOURNAMENTS LIST =================
    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("**Active Tournaments on Server**")
      .setDescription("Here are all currently active tournaments:");

    let desc = "";

    for (let tName in data.tournaments) {
      const t = data.tournaments[tName];
      const total = t.slots || 0;
      const filled = t.registrations ? t.registrations.length : 0;
      const remaining = total - filled;
      const status = remaining > 0 ? "🟢 Open" : "🔴 Closed";
      const createdTime = t.createdAt 
        ? `<t:${Math.floor(t.createdAt / 1000)}:R>` 
        : "Unknown";

      desc += `**${t.name}**\n` +
              `**Channel:** <#${t.channelId}>\n` +
              `**Slots:** ${filled}/${total} (${remaining} remaining)\n` +
              `**Status:** ${status}\n` +
              `**Created:** ${createdTime}\n\n`;
    }

    embed.setDescription(desc);
    embed.setFooter({ text: "Use /tinfo name:TOURNAMENT_NAME for detailed view • /slot for team list" });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
