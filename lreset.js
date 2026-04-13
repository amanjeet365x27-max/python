const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lreset")
    .setDescription("Reset leaderboard (all or specific team)")
    .addStringOption(o =>
      o.setName("tournament")
        .setDescription("Tournament name")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("team")
        .setDescription("Team name or 'all' (optional)")
        .setRequired(false)),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({
        content: "Only admin can use this.",
        ephemeral: true
      });
    }

    const tournamentName = interaction.options.getString("tournament");
    const teamInput = interaction.options.getString("team");

    const data = await tournament.getData();
    const t = data.tournaments ? data.tournaments[tournamentName] : null;

    if (!t) {
      return interaction.reply({
        content: `Tournament **${tournamentName}** not found.`,
        ephemeral: true
      });
    }

    if (!t.points) t.points = {};

    // ===== RESET LOGIC =====
    let message = "";

    if (!teamInput || teamInput.toLowerCase() === "all") {
      t.points = {};
      message = "🔥 All leaderboard data has been reset.";
    } else {
      const teamName = teamInput.trim();

      if (!t.points[teamName]) {
        return interaction.reply({
          content: `Team **${teamName}** not found in leaderboard.`,
          ephemeral: true
        });
      }

      delete t.points[teamName];
      message = `🔥 Leaderboard data for **${teamName}** has been reset.`;
    }

    data.tournaments[tournamentName] = t;
    await tournament.saveData(data);

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("⚠️ LEADERBOARD RESET")
      .setDescription(
        `**Tournament:** ${tournamentName}\n\n${message}`
      )
      .setFooter({ text: `Action by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
