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
    .setName("slot")
    .setDescription("Show slots info for a tournament")
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
      .setColor(0xff9900)
      .setTitle(`**Slots Info: ${t.name}**`);

    if (t.registrations.length > 0) {
      embed.setDescription(
        t.registrations.map((reg, i) => 
          `**Slot ${i + 1}** - **Team:** ${reg.teamName} - **IGL:** <@${reg.leaderId}>`
        ).join("\n")
      );
    } else {
      embed.setDescription("No slots filled yet.");
    }

    await interaction.reply({ embeds: [embed] });
  },

  async update(guildId) {
    // Optional: dynamically update slot info if needed
  }
};