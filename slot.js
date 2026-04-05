const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slot")
    .setDescription("View slots of a tournament")
    .addStringOption(option =>
      option.setName("name").setDescription("Tournament name").setRequired(true)
    ),

  async execute(interaction) {
    // 🔥 ADMIN CHECK
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");

    const data = await tournament.getData();

    if (!data.tournaments || !data.tournaments[name]) {
      return interaction.reply({ content: "Tournament not found", ephemeral: true });
    }

    const t = data.tournaments[name];

    let desc = `**Slots Filled: ${t.registrations.length}/${t.slots}**\n\n`;

    t.registrations.forEach((team, i) => {
      desc += `• **Slot ${i + 1}**\n`;
      desc += `Team: **${team.teamName}**\n`;
      desc += `IGL: <@${team.leaderId}>\n\n`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ffff)
      .setTitle(`Slots - ${name}`)
      .setDescription(desc);

    await interaction.reply({ embeds: [embed] });
  }
};
