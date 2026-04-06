const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tclear")
    .setDescription("Clear a tournament")
    .addStringOption(o =>
      o.setName("name").setDescription("Tournament name").setRequired(true)),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");
    const data = await tournament.getData();

    if (!data.tournaments[name]) {
      return interaction.reply({ content: `Tournament **${name}** does not exist.`, ephemeral: true });
    }

    const t = data.tournaments[name];

    // ================= REMOVE TEAM ROLES =================
    if (t.registrations) {
      for (let reg of t.registrations) {
        const roleName = reg.teamName.replace(/[<>@]/g, "");
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          try { await role.delete("Tournament cleared"); } catch (e) { console.log(e); }
        }
      }
    }

    // ================= DELETE TOURNAMENT =================
    delete data.tournaments[name];
    await tournament.saveData(data);

    // ================= SEND EMBED =================
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("**Tournament Cleared**")
      .setDescription(`Tournament **${name}** has been successfully cleared.`)
      .setFooter({ text: `Cleared by ${interaction.user.tag}` });

    const channel = await interaction.guild.channels.fetch(t.channelId).catch(() => null);
    if (channel) await channel.send({ embeds: [embed] });

    // ================= UPDATE TINFO & SLOT =================
    try {
      const tinfoCommand = require("./tinfo");
      const slotCommand = require("./slot");

      if (tinfoCommand.update) await tinfoCommand.update(interaction.guild.id);
      if (slotCommand.update) await slotCommand.update(interaction.guild.id);
    } catch (e) { console.log("Update tinfo/slot failed:", e); }

    await interaction.reply({ content: `Tournament **${name}** cleared successfully.`, ephemeral: true });
  }
};