const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tbackup")
    .setDescription("Start backup registrations for empty slots")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("slots")
        .setDescription("Backup slots")
        .setRequired(true))
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Backup registration channel")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("ping")
        .setDescription("Ping everyone or not")
        .setRequired(true)
        .addChoices(
          { name: "Yes", value: "yes" },
          { name: "No", value: "no" }
        )),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");
    const backupSlots = interaction.options.getInteger("slots");
    const channel = interaction.options.getChannel("channel");
    const ping = interaction.options.getString("ping");

    const data = await tournament.getData();

    if (!data.tournaments || !data.tournaments[name]) {
      return interaction.reply({
        content: `Tournament **${name}** not found.`,
        ephemeral: true
      });
    }

    const t = data.tournaments[name];

    // ===== COUNT EMPTY SLOTS =====
    const filled = t.registrations.length;
    const emptySlots = t.slots - filled;

    if (emptySlots <= 0) {
      return interaction.reply({
        content: "No empty slots available for backup.",
        ephemeral: true
      });
    }

    if (backupSlots > emptySlots) {
      return interaction.reply({
        content: `Only **${emptySlots}** empty slot(s) available but you requested **${backupSlots}**.`,
        ephemeral: true
      });
    }

    // ===== SET BACKUP MODE =====
    t.backup = {
      enabled: true,
      slots: backupSlots,
      filled: 0,
      channelId: channel.id
    };

    data.tournaments[name] = t;
    await tournament.saveData(data);

    // ===== PING =====
    if (ping === "yes") {
      await channel.send({ content: "@everyone @here" });
    }

    // ===== PERMISSIONS =====
    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { ViewChannel: true, SendMessages: true }
    );

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("**BACKUP REGISTRATION [OPEN]**")
      .setDescription(`**${name} BACKUP SLOTS OPEN** GRAB FAST`)
      .addFields(
        { name: "Backup Slots", value: `${backupSlots}`, inline: true },
        { name: "Remaining", value: `${backupSlots} / ${backupSlots}`, inline: true },
        { name: "Channel", value: `<#${channel.id}>` }
      )
      .setImage("https://cdn.oneesports.id/cdn-data/sites/2/2024/12/462574290_1265728211300654_4514308865345103186_n.jpg");

    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: "✅ Backup registration started!",
      ephemeral: true
    });
  }
};