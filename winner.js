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

    // Optional: Verify tournament exists
    const data = await tournament.getData();
    const t = data.tournaments[tournamentName];
    if (!t) {
      return interaction.reply({ 
        content: `Tournament **${tournamentName}** not found.`, 
        ephemeral: true 
      });
    }

    // ================= CREATE WINNER ROLE + ASSIGN TO IGL =================
    let winnerRole;
    try {
      // Clean team name for role (safe for Discord)
      const cleanRoleName = teamName
        .replace(/[<>@#]/g, "")
        .replace(/[^a-zA-Z0-9\s-_]/g, "")
        .trim()
        .slice(0, 90);

      winnerRole = await interaction.guild.roles.create({
        name: cleanRoleName || teamName,
        mentionable: true,
        color: 0xffd700,           // Gold color for winner role
        reason: `Winner role for ${tournamentName}`
      });

      // Give the role to IGL
      const iglMember = await interaction.guild.members.fetch(iglUser.id);
      await iglMember.roles.add(winnerRole);

    } catch (e) {
      console.error("Failed to create winner role:", e.message);
      // Continue even if role creation fails
    }

    // ================= COOL STYLISH WINNER EMBED =================
    const winnerEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("🏆 CHAMPIONS CROWNED 🏆")
      .setDescription(`**\( {teamName}** has emerged victorious in ** \){tournamentName}**!`)
      .addFields(
        { 
          name: "👑 Winning Team", 
          value: `**${teamName}**`, 
          inline: true 
        },
        { 
          name: "🎮 IGL", 
          value: `<@${iglUser.id}>`, 
          inline: true 
        }
      )
      .setImage("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOu45FiRwsi0bqX_Y-PrjXtdn5kKf81mUx5yAePGo")
      .setThumbnail("https://i.pinimg.com/originals/e8/06/52/e80652af2c77e3a73858e16b2ffe5f9a.gif")
      .setFooter({ 
        text: "Keep Grinding and stay connected with Heroic Hustle!" 
      })
      .setTimestamp();

    await interaction.reply({ 
      content: `🎉 **Congratulations \( {teamName}!** <@ \){iglUser.id}> \( {winnerRole ? `<@& \){winnerRole.id}>` : ''}`,
      embeds: [winnerEmbed] 
    });
  }
};