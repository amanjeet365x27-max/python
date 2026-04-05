const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tclear")
    .setDescription("Clear tournament completely")
    .addStringOption(opt =>
      opt.setName("name")
        .setDescription("Tournament name")
        .setRequired(true)),

  async execute(interaction) {
    const data = tournament.getData();
    const name = interaction.options.getString("name");

    if (!data.activeTournament || data.activeTournament.name !== name) {
      return interaction.reply({ content: "Tournament not found.", ephemeral: true });
    }

    const guild = interaction.guild;

    // 🔥 DELETE ALL TEAM ROLES
    for (let team of data.registrations) {
      const role = guild.roles.cache.find(r => r.name === team.teamName);
      if (role) await role.delete().catch(() => {});
    }

    // 🔥 CLEAR DATA
    const newData = {
      activeTournament: null,
      registrations: []
    };

    fs.writeFileSync("tournament.json", JSON.stringify(newData, null, 2));

    await interaction.reply("Tournament cleared completely.");
  }
};
