const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wcancel")
    .setDescription("Cancel a specific winner slot in a tournament")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("slot")
        .setDescription("Winner slot number to cancel")
        .setRequired(true)),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name").trim();
    const slotNumber = interaction.options.getInteger("slot");

    let data = await tournament.getData();

    if (!data.tournaments || !data.tournaments[name]) {
      return interaction.reply({
        content: `Tournament **${name}** not found.`,
        ephemeral: true
      });
    }

    const t = data.tournaments[name];

    if (!t.winners || t.winners.length === 0) {
      return interaction.reply({
        content: "No winners found.",
        ephemeral: true
      });
    }

    if (slotNumber < 1 || slotNumber > t.winners.length) {
      return interaction.reply({
        content: `Invalid slot. Must be between 1 and ${t.winners.length}`,
        ephemeral: true
      });
    }

    const index = slotNumber - 1;
    const removedTeam = t.winners[index];

    // === SAFETY CHECK ===
    if (!removedTeam) {
      return interaction.reply({
        content: `Slot ${slotNumber} is already empty.`,
        ephemeral: true
      });
    }

    // ===== DELETE ROLE =====
    const roleName = removedTeam.teamName.replace(/[<>@#]/g, "").trim();
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (role) {
      try {
        await role.delete("Winner slot cancelled");
      } catch (e) {
        console.log("Role delete failed:", e.message);
      }
    }

    // ===== REMOVE SLOT (NO SHIFT) =====
    t.winners[index] = null;

    // ===== SAVE =====
    data.tournaments[name] = t;
    await tournament.saveData(data);

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("❌ Winner Slot Cancelled")
      .setDescription(
        `**Tournament:** ${name}\n` +
        `**Slot:** ${slotNumber}\n` +
        `**Removed Team:** ${removedTeam.teamName}\n\n` +
        `Slot is now **EMPTY**.`
      )
      .setFooter({ text: `Cancelled by ${interaction.user.tag}` });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};