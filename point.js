const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("point")
    .setDescription("Give points to a team")
    .addStringOption(o =>
      o.setName("tournament")
        .setDescription("Tournament name")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("team")
        .setDescription("Team name")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Points to add")
        .setRequired(true)),

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
    const teamName = interaction.options.getString("team").trim();
    const amount = interaction.options.getInteger("amount");

    const data = await tournament.getData();
    const t = data.tournaments ? data.tournaments[tournamentName] : null;

    if (!t) {
      return interaction.reply({
        content: `Tournament **${tournamentName}** not found.`,
        ephemeral: true
      });
    }

    if (!t.points) t.points = {};

    if (!t.points[teamName]) {
      t.points[teamName] = 0;
    }

    t.points[teamName] += amount;

    data.tournaments[tournamentName] = t;
    await tournament.saveData(data);

    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("🏆 POINTS UPDATED")
      .setDescription(
        `**Tournament:** ${tournamentName}\n` +
        `**Team:** ${teamName}\n` +
        `**Points Added:** +${amount}\n\n` +
        `**Total Points:** ${t.points[teamName]}`
      )
      .setFooter({ text: `Updated by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};
