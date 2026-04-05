const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slot")
    .setDescription("Show slots of a tournament")
    .addStringOption(opt =>
      opt.setName("name")
        .setDescription("Tournament name")
        .setRequired(true)
    ),

  async execute(interaction) {
    const data = tournament.getData();
    const name = interaction.options.getString("name");

    const t = data.tournaments[name];

    if (!t) {
      return interaction.reply({ content: "Tournament not found.", ephemeral: true });
    }

    let desc = "";

    t.registrations.forEach((team, i) => {
      desc += `**• Slot ${i + 1}**\n`;
      desc += `Team: **${team.teamName}**\n`;
      desc += `IGL: <@${team.leaderId}>\n`;
      desc += `Players:\n${team.members.map(id => `<@${id}>`).join("\n")}\n\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`${t.name} Slots`)
      .setDescription(desc || "No teams registered yet.")
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  }
};
