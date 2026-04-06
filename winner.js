const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("winner")
    .setDescription("Announce the winner of a tournament")
    .addStringOption(o =>
      o.setName("tournament")
        .setDescription("Tournament name")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("team")
        .setDescription("Winning team name")
        .setRequired(true))
    .addUserOption(o =>
      o.setName("igl")
        .setDescription("Tag the IGL of the winning team")
        .setRequired(true)),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const tournamentName = interaction.options.getString("tournament");
    const teamName = interaction.options.getString("team");
    const iglUser = interaction.options.getUser("igl");

    const data = await tournament.getData();
    const t = data.tournaments ? data.tournaments[tournamentName] : null;
    if (!t) {
      return interaction.reply({ 
        content: `Tournament **${tournamentName}** not found.`, 
        ephemeral: true 
      });
    }

    // Create winner role
    let winnerRole = null;
    try {
      const cleanRoleName = teamName
        .replace(/[<>@#]/g, "")
        .replace(/[^a-zA-Z0-9\s-_]/g, "")
        .trim()
        .slice(0, 90) || `Winner ${teamName}`;

      winnerRole = await interaction.guild.roles.create({
        name: cleanRoleName,
        mentionable: true,
        color: 0xffd700,
        reason: `Winner role for ${tournamentName}`
      });

      const iglMember = await interaction.guild.members.fetch(iglUser.id);
      await iglMember.roles.add(winnerRole);
    } catch (e) {
      console.error("Failed to create winner role:", e.message);
    }

    // Clean Winner Embed - No placeholders
    const winnerEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("🏆 CHAMPIONS CROWNED 🏆")
      .setDescription(`**\( {teamName}** has emerged victorious in ** \){tournamentName}**!`)
      .addFields(
        { name: "👑 Winning Team", value: `**${teamName}**`, inline: true },
        { name: "🎮 IGL", value: `<@${iglUser.id}>`, inline: true }
      )
      .setImage("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOu45FiRwsi0bqX_Y-PrjXtdn5kKf81mUx5yAePGo")
      .setFooter({ text: "Keep Grinding and stay connected with Heroic Hustle!" })
      .setTimestamp();

    await interaction.reply({
      content: `🎉 **Congratulations \( {teamName}!** <@ \){iglUser.id}>`,
      embeds: [winnerEmbed]
    });
  }
};