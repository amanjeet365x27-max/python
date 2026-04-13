const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View leaderboard")
    .addStringOption(o =>
      o.setName("tournament")
        .setDescription("Tournament name")
        .setRequired(true)
    ),

  async execute(interaction) {
    const tournamentName = interaction.options.getString("tournament");

    const data = await tournament.getData();
    const t = data.tournaments ? data.tournaments[tournamentName] : null;

    if (!t) {
      return interaction.reply({
        content: `Tournament **${tournamentName}** not found.`,
        ephemeral: true
      });
    }

    if (!t.points || Object.keys(t.points).length === 0) {
      return interaction.reply({
        content: "No leaderboard data yet.",
        ephemeral: true
      });
    }

    // ===== SORT =====
    const sorted = Object.entries(t.points)
      .sort((a, b) => b[1] - a[1]);

    let page = 0;
    const perPage = 10;
    const totalPages = Math.ceil(sorted.length / perPage);

    const generateEmbed = (page) => {
      const start = page * perPage;
      const current = sorted.slice(start, start + perPage);

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`🏆 ${tournamentName.toUpperCase()} LEADERBOARD 🏆`)
        .setFooter({ text: `Page ${page + 1} / ${totalPages} • Heroic Hustle` })
        .setTimestamp();

      current.forEach(([team, pts], i) => {
        embed.addFields({
          name: `🔥 #${start + i + 1} • ${team}`,
          value: `💰 **Futi Kodi:** ${pts}`,
          inline: false
        });
      });

      return embed;
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("⬅️ Prev")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ➡️")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.reply({
      embeds: [generateEmbed(page)],
      components: [row],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      time: 120000
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: "This is not your leaderboard.", ephemeral: true });
      }

      if (btn.customId === "prev") {
        page = page > 0 ? page - 1 : totalPages - 1;
      } else if (btn.customId === "next") {
        page = page < totalPages - 1 ? page + 1 : 0;
      }

      await btn.update({
        embeds: [generateEmbed(page)],
        components: [row]
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️ Prev")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );

      await msg.edit({ components: [disabledRow] });
    });
  }
};
