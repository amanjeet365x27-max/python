const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");
const pool = require("./db");

async function loadData() {
  const res = await pool.query("SELECT * FROM tournaments");
  const tournaments = {};
  res.rows.forEach(row => {
    tournaments[row.name] = row.data;
  });
  return { tournaments };
}

async function saveData(data) {
  for (let name in data.tournaments) {
    await pool.query(
      `INSERT INTO tournaments (name, data)
       VALUES ($1, $2)
       ON CONFLICT (name)
       DO UPDATE SET data = $2`,
      [name, data.tournaments[name]]
    );
  }
}

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
    const data = await loadData();
    const t = data.tournaments[name];

    if (!t) return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });

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
    await saveData(data);

    // ================= RESTORE CHANNEL PERMISSIONS =================
    const channel = await interaction.guild.channels.fetch(t.channelId).catch(() => null);
    if (channel) {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("**Tournament Cleared**")
        .setDescription(`Tournament **${name}** has been successfully cleared.`)
        .setFooter({ text: `Cleared by ${interaction.user.tag}` });

      await channel.send({ embeds: [embed] });
    }

    // ================= UPDATE TINFO & SLOT =================
    try {
      const tinfoCommand = require("./tinfo");
      const slotCommand = require("./slot");

      if (tinfoCommand.update) await tinfoCommand.update(interaction.guild.id);
      if (slotCommand.update) await slotCommand.update(interaction.guild.id);
    } catch (e) {
      console.log("Failed to update tinfo/slot:", e);
    }

    await interaction.reply({ content: `Tournament **${name}** cleared successfully.`, ephemeral: true });
  }
};