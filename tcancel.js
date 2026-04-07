const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tcancel")
    .setDescription("Cancel a specific slot in a tournament")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("slot")
        .setDescription("Slot number to cancel")
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

    if (!t.registrations || t.registrations.length === 0) {
      return interaction.reply({
        content: "No registrations found.",
        ephemeral: true
      });
    }

    if (slotNumber < 1 || slotNumber > t.slots) {
      return interaction.reply({
        content: `Invalid slot. Must be between 1 and ${t.slots}`,
        ephemeral: true
      });
    }

    const index = slotNumber - 1;
    const removedTeam = t.registrations[index];

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
        await role.delete("Slot cancelled");
      } catch (e) {
        console.log("Role delete failed:", e.message);
      }
    }

    // ===== REMOVE SLOT (SHIFT LEFT) =====
    t.registrations.splice(index, 1);

    // ✅ IMPORTANT FIX: LOCK REGISTRATION
    t.regClosed = true;

    // ===== SAVE TO POSTGRES =====
    data.tournaments[name] = t;
    await tournament.saveData(data);

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("❌ Slot Cancelled")
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