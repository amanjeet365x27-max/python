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
        .setRequired(true))
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason for cancelling the slot")
        .setRequired(true)),
  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }
    const name = interaction.options.getString("name").trim();
    const slotNumber = interaction.options.getInteger("slot");
    const reason = interaction.options.getString("reason");
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
    // ===== REMOVE SLOT (KEEP EMPTY, NO SHIFT) =====
    t.registrations[index] = null;
    // ✅ IMPORTANT FIX: LOCK REGISTRATION
    t.regClosed = true;
    // ===== SAVE TO POSTGRES =====
    data.tournaments[name] = t;
    await tournament.saveData(data);
    // ===== COOL PUBLIC LOG IN REGISTRATION CHANNEL =====
    const logChannel = await interaction.guild.channels.fetch(t.channelId).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ SLOT CANCELLED - OFFICIAL LOG")
        .setDescription("**A SLOT HAS BEEN CANCELLED BY ADMIN**")
        .addFields(
          { name: "🏆 Tournament", value: `**${name}**`, inline: true },
          { name: "🔢 Slot Number", value: `**#${slotNumber}**`, inline: true },
          { name: "👑 Team Name", value: `**${removedTeam.teamName}**`, inline: false },
          { name: "🎮 IGL", value: `<@${removedTeam.leaderId}>`, inline: true },
          { name: "👥 Team Members", value: removedTeam.members.map(id => `<@${id}>`).join("\n") || "No members listed", inline: false },
          { name: "📝 Reason", value: `**${reason}**`, inline: false },
          { name: "🛠 Cancelled By", value: `<@${interaction.user.id}>`, inline: true }
        )
        .setThumbnail("https://media.tenor.com/S8KDxwbSjfYAAAAM/cancelled-cancel.gif")
        .setFooter({ text: "Heroic Hustle • Slot Management" })
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
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
      flags: 64   // This replaces the old ephemeral: true (no deprecation warning)
    });
  }
};
