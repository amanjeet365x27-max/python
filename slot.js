const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slot")
    .setDescription("Show slots info of a tournament")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name")
        .setRequired(true)
    ),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");
    const data = await tournament.getData();
    const t = data.tournaments[name];

    if (!t) return interaction.reply({ content: "Tournament not found.", ephemeral: true });

    if (!t.registrations || t.registrations.length === 0) {
      return interaction.reply({ content: "No teams registered yet.", ephemeral: true });
    }

    let desc = "";
    t.registrations.forEach((team, i) => {
      desc += `**• Slot ${i + 1}**\n**Team:** ${team.teamName}\n**IGL:** <@${team.leaderId}>\n\n`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ffff)
      .setTitle(`**Slots - ${t.name}**`)
      .setDescription(desc);

    await interaction.reply({ embeds: [embed] });
  }
};