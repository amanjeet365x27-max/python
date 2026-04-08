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

    const maxFieldsPerEmbed = 25;
    const embeds = [];

    for (let i = 0; i < t.winners.length; i += maxFieldsPerEmbed) {
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`🏆 ${tournamentName.toUpperCase()} SLOTLIST 🏆`)
        .setFooter({ text: "Heroic Hustle" })
        .setTimestamp();

      const end = Math.min(i + maxFieldsPerEmbed, t.winners.length);
      for (let j = i; j < end; j++) {
        const w = t.winners[j];
        embed.addFields({
          name: `🔥 SLOT ${j + 1} — ${w.teamName}`,
          value: `👑 **IGL:** <@${w.igl}>`,
          inline: false
        });
      }
      embeds.push(embed);
    }

    await interaction.reply({ embeds: embeds });
  }
};
