const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");
const pool = require("./db");   // <-- We use pool directly for clean delete

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

    const name = interaction.options.getString("name").trim();

    // Load current data
    let data = await tournament.getData();

    if (!data.tournaments || !data.tournaments[name]) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }

    const t = data.tournaments[name];

    // 1. Delete team roles
    if (t.registrations && t.registrations.length > 0) {
      for (let reg of t.registrations) {
        const roleName = reg.teamName.replace(/[<>@]/g, "").trim();
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          try {
            await role.delete("Tournament cleared");
          } catch (e) {
            console.log(`Role delete failed for ${roleName}:`, e.message);
          }
        }
      }
    }

    // 2. HARD DELETE from database (this is the key change)
    try {
      await pool.query("DELETE FROM tournaments WHERE name = $1", [name]);
      console.log(`Hard deleted tournament: ${name} from DB`);
    } catch (e) {
      console.error("Database delete error:", e);
      return interaction.reply({ content: "Database error while clearing.", ephemeral: true });
    }

    // 3. Unlock the channel
    const channel = await interaction.guild.channels.fetch(t.channelId).catch(() => null);
    if (channel) {
      try {
        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          { SendMessages: true }
        );
      } catch (e) {
        console.log("Unlock channel failed:", e.message);
      }

      const clearedEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("✅ Tournament Cleared")
        .setDescription(`Tournament **${name}** has been completely removed.\nYou can create a new tournament now.`)
        .setFooter({ text: `Cleared by ${interaction.user.tag}` });

      await channel.send({ embeds: [clearedEmbed] });
    }

    await interaction.reply({ 
      content: `✅ Tournament **${name}** has been **fully cleared** from the system!`, 
      ephemeral: true 
    });
  }
};
