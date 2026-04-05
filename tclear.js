const { SlashCommandBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tclear")
    .setDescription("Clear a tournament completely")
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

    const guild = interaction.guild;

    // 🔥 DELETE ROLES
    for (let team of t.registrations) {
      const role = guild.roles.cache.find(r => r.name === team.teamName);
      if (role) {
        await role.delete().catch(() => {});
      }
    }

    // 🔥 DELETE TOURNAMENT
    delete data.tournaments[name];

    tournament.saveData(data);

    await interaction.reply(`Tournament "${name}" cleared completely.`);
  }
};
