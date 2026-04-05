const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const ALLOWED_ROLE = "1446795460609179841";

let joins = [];
let leaves = [];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show stylish server stats"),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(ALLOWED_ROLE)) {
      return interaction.reply({
        content: "❌ You are not allowed to use this command",
        ephemeral: true,
      });
    }

    const guild = interaction.guild;

    // 🔥 FIX: fetch members normally (presence handled separately)
    await guild.members.fetch().catch(() => {});

    const total = guild.memberCount;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humans = total - bots;

    // 🔥 FIX: safer online count
    const online = guild.members.cache.filter(
      (m) => m.presence && m.presence.status !== "offline"
    ).size;

    const now = Date.now();

    const last24hJoins = joins.filter((t) => now - t < 86400000).length;
    const last24hLeaves = leaves.filter((t) => now - t < 86400000).length;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("📊 Server Statistics")
      .setDescription("✨ Live server insights ✨")
      .addFields(
        { name: "👥 Total Members", value: `\`${total}\``, inline: true },
        { name: "🧑 Humans", value: `\`${humans}\``, inline: true },
        { name: "🤖 Bots", value: `\`${bots}\``, inline: true },
        { name: "🟢 Online", value: `\`${online}\``, inline: true },
        { name: "📥 Joins (24h)", value: `\`${last24hJoins}\``, inline: true },
        { name: "📤 Leaves (24h)", value: `\`${last24hLeaves}\``, inline: true }
      )
      .setFooter({ text: "⚡ Powered by HEROIC HUSTLE" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  joins,
  leaves,
};
