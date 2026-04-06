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
    let data = await tournament.getData();

    if (!data.tournaments || !data.tournaments[name]) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }

    const t = data.tournaments[name];

    // ================= 1. DELETE TEAM ROLES =================
    if (t.registrations && t.registrations.length > 0) {
      for (let reg of t.registrations) {
        const roleName = reg.teamName.replace(/[<>@]/g, "").trim();
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          try {
            await role.delete("Tournament cleared");
            console.log(`Deleted role: ${roleName}`);
          } catch (e) {
            console.log(`Failed to delete role ${roleName}:`, e.message);
          }
        }
      }
    }

    // ================= 2. DELETE TOURNAMENT FROM DATA =================
    delete data.tournaments[name];

    // Force save clean data
    await tournament.saveData({ tournaments: data.tournaments || {} });

    // ================= 3. UNLOCK CHANNEL =================
    const channel = await interaction.guild.channels.fetch(t.channelId).catch(() => null);
    if (channel) {
      try {
        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          { SendMessages: true }
        );
      } catch (e) {
        console.log("Failed to unlock channel:", e.message);
      }

      const clearedEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("**Tournament Cleared**")
        .setDescription(`Tournament **${name}** has been successfully cleared.\nYou can now create a new tournament in this channel.`)
        .setFooter({ text: `Cleared by ${interaction.user.tag}` });

      await channel.send({ embeds: [clearedEmbed] });
    }

    await interaction.reply({ 
      content: `✅ Tournament **${name}** cleared successfully!`, 
      ephemeral: true 
    });

    console.log(`Tournament "${name}" fully cleared.`);
  }
};
