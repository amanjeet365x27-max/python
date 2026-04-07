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
        content: `Only **\( {emptySlots}** empty slot(s) available but you requested ** \){backupSlots}**.`,
        ephemeral: true
      });
    }

    // ===== BACKUP CONFIG =====
    t.backup = {
      enabled: true,
      slots: backupSlots,
      filled: 0,
      mentions: mentionsRequired,
      channelId: channel.id
    };

    data.tournaments[name] = t;
    await tournament.saveData(data);

    // ===== PING =====
    if (ping === "yes") {
      await channel.send({ content: "@everyone @here" });
    }

    // ===== PERMS =====
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
        { name: "Mentions Required", value: `${mentionsRequired}`, inline: true },
        { name: "Channel", value: `<#${channel.id}>` }
      )
      .setImage("https://cdn.oneesports.id/cdn-data/sites/2/2024/12/462574290_1265728211300654_4514308865345103186_n.jpg");

    await channel.send({ embeds: [embed] });

    // ===== BACKUP MESSAGE LISTENER =====
    const backupCollector = channel.createMessageCollector({
      filter: m => !m.author.bot,
      time: 0
    });

    backupCollector.on('collect', async (message) => {
      if (t.backup && t.backup.enabled && message.channel.id === t.backup.channelId) {
        await this.backupRegister(message, t);
      }
    });

    await interaction.reply({
      content: "✅ Backup registration started!",
      ephemeral: true
    });
  },

  // ================= BACKUP VALIDATION =================
  validate(message, t) {
    const content = message.content.trim();

    // TAKE ALL MENTIONS
    let mentions = [...message.mentions.users.keys()];

    // CUT EXTRA MENTIONS
    if (mentions.length < t.backup.mentions) {
      return "Not enough mentions.";
    }

    mentions = mentions.slice(0, t.backup.mentions);

    // TEAM NAME FLEXIBLE (same logic as tournament.js)
    let teamName;

    const match = content.match(/team\s*name\s*[-:=\s]*\s*(.+)/i);
    if (match) {
      teamName = match[1].split("\n")[0].trim();
    } else {
      // fallback: first non-empty clean line (ignore junk lines)
      const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !l.includes("<@"));
      teamName = lines.length ? lines[0] : "No Name Team";
    }

    return {
      teamName,
      members: mentions
    };
  },

  // ================= BACKUP REGISTER =================
  async backupRegister(message, t) {
    if (t.backup.filled >= t.backup.slots) {
      return message.reply("All backup slots are already filled.");
    }

    const result = this.validate(message, t);

    if (typeof result === "string") {
      return message.reply(result);
    }

    // ===== CHECK IF ALREADY REGISTERED (same fake-tag logic as tournament.js) =====
    const already = t.registrations.some(
      r => r && (r.leaderId === message.author.id || r.members.some(id => result.members.includes(id)))
    );

    if (already) {
      return message.reply("You or your team are already registered.");
    }

    t.backup.filled++;

    // ===== FILL FIRST EMPTY SLOT =====
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

    const role = await message.guild.roles.create({
      name: cleanTeamName || `Team ${slotIndex + 1}`,
      mentionable: true
    });

    const iglMember = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (iglMember) await iglMember.roles.add(role);

    const fullData = await tournament.getData();
    fullData.tournaments[t.name] = t;
    await tournament.saveData(fullData);

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

    // Close backup if full
    if (t.backup.filled >= t.backup.slots) {
      t.backup.enabled = false;
      await tournament.saveData(fullData);
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false, ViewChannel: true }
      );
    }
  }
};