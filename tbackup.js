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
    .addIntegerOption(o =>
      o.setName("mentions")
        .setDescription("Mentions required")
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
    const mentionsRequired = interaction.options.getInteger("mentions");
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
    t.name = name;

    const filled = t.registrations.filter(r => r != null).length;
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

    t.backup = {
      enabled: true,
      slots: backupSlots,
      filled: 0,
      mentions: mentionsRequired,
      channelId: channel.id
    };

    data.tournaments[name] = t;
    await tournament.saveData(data);

    if (ping === "yes") {
      await channel.send({ content: "@everyone @here" });
    }

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { ViewChannel: true, SendMessages: true }
    );

    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("**BACKUP REGISTRATION [OPEN]**")
      .setDescription(`**${name} BACKUP SLOTS OPEN** GRAB FAST`)
      .addFields(
        { name: "Backup Slots", value: `${backupSlots}`, inline: true },
        { name: "Remaining", value: `${backupSlots} / ${backupSlots}`, inline: true },
        { name: "Mentions Required", value: `${mentionsRequired}`, inline: true },
        { name: "Channel", value: `<#${channel.id}>` }
      )
      .setImage("https://cdn.oneesports.id/cdn-data/sites/2/2024/12/462574290_1265728211300654_4514308865345103186_n.jpg");

    await channel.send({ embeds: [embed] });

    if (t.backup && t.backup.collector) {
      t.backup.collector.stop();
      t.backup.collector = null;
    }

    const backupCollector = channel.createMessageCollector({
      filter: m => !m.author.bot,
      time: 0
    });

    backupCollector.on('collect', async (message) => {
      try {
        if (t.backup && t.backup.enabled && message.channel.id === t.backup.channelId) {
          await this.backupRegister(message, t);
        }
      } catch (err) {
        console.error("Backup collect error:", err);
      }
    });

    t.backup.collector = backupCollector;

    await interaction.reply({
      content: "✅ Backup registration started!",
      ephemeral: true
    });
  },

  validate(message, t) {
    const content = message.content.trim();
    let mentions = [...message.mentions.users.keys()];

    if (mentions.length < t.backup.mentions) {
      return "Not enough mentions.";
    }

    mentions = mentions.slice(0, t.backup.mentions);

    let teamName;
    const match = content.match(/team\s*name\s*[-:=\s]*\s*(.+?)(?=\n|$)/i);

    if (match && match[1]) {
      teamName = match[1].trim();
    } else {
      const lines = content.split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => l.replace(/<@!?[\d]+>/g, '').trim())
        .filter(l => l.length > 0);
      teamName = lines.length ? lines[0] : "No Name Team";
    }

    teamName = teamName.replace(/<@!?[\d]+>/g, '').trim();
    if (!teamName) teamName = "No Name Team";

    return {
      teamName,
      members: mentions
    };
  },

  async backupRegister(message, t) {
    if (t.backup.filled >= t.backup.slots) {
      return message.reply("All backup slots are already filled.");
    }

    const result = this.validate(message, t);
    if (typeof result === "string") {
      return message.reply(result);
    }

    const already = t.registrations.some(
      r => r && (r.leaderId === message.author.id || r.members.some(id => result.members.includes(id)))
    );

    if (already) {
      return message.reply("You or your team are already registered.");
    }

    t.backup.filled++;

    let slotIndex = t.registrations.findIndex(r => r === null || r === undefined);
    if (slotIndex === -1) slotIndex = t.registrations.length;

    t.registrations[slotIndex] = {
      teamName: result.teamName,
      members: result.members,
      leaderId: message.author.id
    };

    const cleanTeamName = result.teamName
      .replace(/[<>@#]/g, "")
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .trim()
      .slice(0, 90);

    let role;

    try {
      role = await message.guild.roles.create({
        name: cleanTeamName || `Team ${slotIndex + 1}`,
        mentionable: true
      });
    } catch (err) {
      console.error("Role creation failed:", err);
    }

    try {
      const iglMember = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (role && iglMember) await iglMember.roles.add(role);
    } catch (err) {
      console.error("Role assign failed:", err);
    }

    const fullData = await tournament.getData();
    fullData.tournaments[t.name] = t;

    try {
      await tournament.saveData(fullData);
    } catch (err) {
      console.error("DB save failed:", err);
    }

    const remaining = t.backup.slots - t.backup.filled;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("✅ Backup Slot Taken")
      .setDescription(
        `**Team:** ${result.teamName}\n` +
        `**Leader:** <@${message.author.id}>\n` +
        `**Remaining Backup Slots:** ${remaining} / ${t.backup.slots}`
      );

    await message.channel.send({ embeds: [embed] });

    if (t.backup.filled >= t.backup.slots) {
      t.backup.enabled = false;

      try {
        await tournament.saveData(fullData);
      } catch (err) {
        console.error("DB save failed:", err);
      }

      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false, ViewChannel: true }
      );

      if (t.backup.collector) {
        t.backup.collector.stop();
        t.backup.collector = null;
      }
    }
  }
};
