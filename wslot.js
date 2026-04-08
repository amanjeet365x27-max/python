const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wslot")
    .setDescription("View winner slot list of a tournament")
    .addStringOption(option =>
      option.setName("tournament")
        .setDescription("Tournament name")
        .setRequired(true)
    ),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const tournamentName = interaction.options.getString("tournament");

    const data = await tournament.getData();
    const t = data.tournaments ? data.tournaments[tournamentName] : null;

    if (!t) {
      return interaction.reply({
        content: `Tournament **${tournamentName}** not found.`,
        ephemeral: true
      });
    }

    if (!t.winners || t.winners.length === 0) {
      return interaction.reply({
        content: "No winners announced yet.",
        ephemeral: true
      });
    }

    const winnersList = t.winners;
    const total = winnersList.length;
    const mid = Math.ceil(total / 2);
    const embeds = [];

    // First half
    const embed1 = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`🏆 ${tournamentName.toUpperCase()} SLOTLIST 🏆`)
      .setFooter({ text: "Heroic Hustle" })
      .setTimestamp();

    for (let i = 0; i < mid; i++) {
      const w = winnersList[i];
      embed1.addFields({
        name: `🔥 SLOT ${i + 1} — ${w.teamName}`,
        value: `👑 **IGL:** <@${w.igl}>`,
        inline: false
      });
    }
    embeds.push(embed1);

    // Second half (only if needed)
    if (mid < total) {
      const embed2 = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`🏆 ${tournamentName.toUpperCase()} SLOTLIST 🏆`)
        .setFooter({ text: "Heroic Hustle" })
        .setTimestamp();

      for (let i = mid; i < total; i++) {
        const w = winnersList[i];
        embed2.addFields({
          name: `🔥 SLOT ${i + 1} — ${w.teamName}`,
          value: `👑 **IGL:** <@${w.igl}>`,
          inline: false
        });
      }
      embeds.push(embed2);
    }

    await interaction.reply({ embeds: embeds });
  }
};
