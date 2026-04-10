const { SlashCommandBuilder, EmbedBuilder, Events } = require("discord.js");
const fs = require("fs");

const CONFIG_PATH = "./welcome-config.json";

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Set welcome channel")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Channel where welcome message will be sent")
        .setRequired(true)
    ),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({
        content: "Only admin can use this.",
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel("channel");

    const config = getConfig();
    config[interaction.guild.id] = {
      channelId: channel.id
    };
    saveConfig(config);

    return await interaction.reply({
      content: `✅ Welcome channel set to <#${channel.id}>`,
      ephemeral: true
    });
  },

  name: Events.GuildMemberAdd,

  async onJoin(member) {
    const config = getConfig();
    const guildConfig = config[member.guild.id];
    if (!guildConfig) return;

    const channel = await member.guild.channels.fetch(guildConfig.channelId).catch(() => null);
    if (!channel) return;

    const memberCount = member.guild.memberCount;

    const embed = new EmbedBuilder()
      .setColor(0x00ffcc)
      .setTitle(`🎉 WELCOME TO ${member.guild.name.toUpperCase()} 🎉`)
      .setDescription(
        `🔥 **Welcome <@${member.id}>!**\n\n` +
        `You are the **${memberCount}th member** to join this server! 🚀\n\n` +
        `💬 Get ready for **epic matches, tournaments & fun!**\n` +
        `⚔️ Make sure to check rules and stay active!\n\n` +
        `❤️ Enjoy your stay and play like a **HERO!**`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setImage("https://share.creavite.co/69d87835a828deb15873867d.gif") // ✅ FIX HERE
      .setFooter({ text: "Heroic Hustle" })
      .setTimestamp();

    await channel.send({
      content: `<@${member.id}>`,
      embeds: [embed]
    });
  }
};
