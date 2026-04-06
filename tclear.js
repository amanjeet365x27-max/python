const { SlashCommandBuilder } = require("discord.js");
const tournament = require("./tournament"); // ONLY required, no db here

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tclear")
    .setDescription("Clear a tournament")
    .addStringOption(option =>
      option.setName("name").setDescription("Tournament name").setRequired(true)
    ),

  async execute(interaction) {
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

    // ================= DELETE ALL TEAM ROLES =================
    for (let team of t.registrations) {
      try {
        const role = interaction.guild.roles.cache.find(r => r.name === team.teamName);
        if (role) await role.delete("Tournament cleared");
      } catch (e) {
        console.log("Role delete error:", e);
      }
    }

    // ================= STOP REGISTRATION =================
    t.registrations = null; // prevent further registration

    // ================= DELETE TOURNAMENT =================
    delete data.tournaments[name];
    await tournament.saveData(data);

    await interaction.reply({
      content: `Tournament **${name}** cleared successfully.\nAll roles deleted, registrations stopped.`
    });
  }
};