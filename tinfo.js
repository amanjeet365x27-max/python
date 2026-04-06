const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tinfo")
    .setDescription("Show info of one tournament or all active tournaments"),

  async execute(interaction) {
    const data = await tournament.getData();

    if (!data.tournaments || Object.keys(data.tournaments).length === 0) {
      return interaction.reply({ 
        content: "No active tournaments found on this server.", 
        ephemeral: true 
      });
    }

    // ================= ALL ACTIVE TOURNAMENTS =================
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
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
