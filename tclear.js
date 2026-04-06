const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tclear")
    .setDescription("Clear a tournament")
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

    if (!t) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }

    // ================= REMOVE TEAM ROLES =================
    if (t.registrations && t.registrations.length > 0) {
      for (let reg of t.registrations) {
        const roleName = reg.teamName.replace(/[<>@]/g, "");
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          try {
            await role.delete("Tournament cleared");
          } catch (e) {
            console.log(`Failed to delete role ${roleName}:`, e);
          }
        }
      }
    }

    // ================= DELETE TOURNAMENT DATA =================
    delete data.tournaments[name];
    await tournament.saveData(data);

    // ================= RESTORE CHANNEL PERMISSIONS =================
    const channel = await interaction.guild.channels.fetch(t.channelId).catch(() => null);
    if (channel) {
      try {
        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          { SendMessages: true }
        );
      } catch (e) {
        console.log("Failed to unlock channel:", e);
      }

      // Send cleared message in the channel
      const clearedEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("**Tournament Cleared**")
        .setDescription(`Tournament **${name}** has been successfully cleared.\nRegistration is now open again if you create a new tournament.`)
        .setFooter({ text: `Cleared by ${interaction.user.tag}` });

      await channel.send({ embeds: [clearedEmbed] });
    }

    // ================= UPDATE OTHER COMMANDS IF NEEDED =================
    try {
      const tinfoCommand = require("./tinfo");
      const slotCommand = require("./slot");
      if (tinfoCommand.update) await tinfoCommand.update(interaction.guild.id);
      if (slotCommand.update) await slotCommand.update(interaction.guild.id);
    } catch (e) {
      console.log("Failed to update tinfo/slot:", e);
    }

    await interaction.reply({ 
      content: `✅ Tournament **${name}** has been cleared successfully.`, 
      ephemeral: true 
    });
  }
};
