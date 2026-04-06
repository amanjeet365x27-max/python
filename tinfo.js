const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pool = require("./db");

async function loadData() {
  const res = await pool.query("SELECT * FROM tournaments");
  const tournaments = {};
  res.rows.forEach(row => {
    tournaments[row.name] = row.data;
  });
  return { tournaments };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tinfo")
    .setDescription("Show tournament info")
    .addStringOption(o =>
      o.setName("name")
       .setDescription("Tournament name")
       .setRequired(true)),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const data = await loadData();

    if (!data.tournaments[name]) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }

    const t = data.tournaments[name];
    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle(`**Tournament Info: ${t.name}**`)
      .addFields(
        { name: "**Total Slots**", value: `${t.slots}`, inline: true },
        { name: "**Mentions Required**", value: `${t.mentions}`, inline: true },
        { name: "**Channel**", value: `<#${t.channelId}>`, inline: true }
      );

    if (t.registrations.length > 0) {
      embed.addFields({
        name: "**Registered Teams**",
        value: t.registrations.map((reg, i) => 
          `**${i + 1}. ${reg.teamName}** - Leader: <@${reg.leaderId}>\nMembers: ${reg.members.map(id => `<@${id}>`).join(", ")}`
        ).join("\n\n")
      });
    } else {
      embed.addFields({ name: "**Registered Teams**", value: "No teams yet." });
    }

    await interaction.reply({ embeds: [embed] });
  },

  async update(guildId) {
    // Optional function to update tinfo dynamically if needed
  }
};