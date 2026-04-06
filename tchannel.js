const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tchannel")
    .setDescription("Create match channels + category for a tournament")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("start_time")
        .setDescription("Start time of first match (24h format: HH:MM)")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("gap")
        .setDescription("Gap between matches in minutes")
        .setRequired(true)),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");
    const startTimeStr = interaction.options.getString("start_time"); // e.g. "22:30"
    const gapMinutes = interaction.options.getInteger("gap");

    const data = await tournament.getData();
    const t = data.tournaments[name];

    if (!t) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }
    if (!t.registrations || t.registrations.length === 0) {
      return interaction.reply({ content: "No teams registered yet.", ephemeral: true });
    }

    // Parse start time (today + HH:MM)
    const [hours, minutes] = startTimeStr.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    let currentMatchTimestamp = Math.floor(startDate.getTime() / 1000);

    // ================= CREATE HIDDEN CATEGORY =================
    const category = await interaction.guild.channels.create({
      name: `Tournament - ${name}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    const registrations = t.registrations;

    // ================= CREATE MATCH CHANNELS =================
    for (let i = 0; i < registrations.length; i += 2) {
      const matchNum = Math.floor(i / 2) + 1;
      const team1 = registrations[i];
      const team2 = registrations[i + 1] || null;

      const channelName = `match-${matchNum}`;

      const matchChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }
        ]
      });

      // Give access only to the two teams in this match
      if (team1) {
        const role1Name = team1.teamName.replace(/[<>@#]/g, "").trim();
        const role1 = interaction.guild.roles.cache.find(r => r.name === role1Name);
        if (role1) {
          await matchChannel.permissionOverwrites.edit(role1.id, {
            ViewChannel: true,
            SendMessages: true
          });
        }
      }

      if (team2) {
        const role2Name = team2.teamName.replace(/[<>@#]/g, "").trim();
        const role2 = interaction.guild.roles.cache.find(r => r.name === role2Name);
        if (role2) {
          await matchChannel.permissionOverwrites.edit(role2.id, {
            ViewChannel: true,
            SendMessages: true
          });
        }
      }

      // Calculate this match's timing
      const thisMatchTimestamp = currentMatchTimestamp + (matchNum - 1) * gapMinutes * 60;

      // ================= STYLISH MATCH EMBED =================
      let desc = `**Match ${matchNum}**\n\n`;

      if (team1 && team2) {
        desc += `**\( {team1.teamName}** vs ** \){team2.teamName}**\n\n`;
        desc += `**IGL Team 1:** <@${team1.leaderId}>\n`;
        desc += `**Players Team 1:** \( {team1.members.map(id => `<@ \){id}>`).join(", ")}\n\n`;
        desc += `**IGL Team 2:** <@${team2.leaderId}>\n`;
        desc += `**Players Team 2:** \( {team2.members.map(id => `<@ \){id}>`).join(", ")}\n\n`;
        desc += `**Match Timing:** <t:\( {thisMatchTimestamp}:F> (<t: \){thisMatchTimestamp}:R>)`;
      } else if (team1) {
        desc += `**${team1.teamName}** vs **EMPTY SLOT**\n\n`;
        desc += `**IGL:** <@${team1.leaderId}>\n`;
        desc += `**Players:** \( {team1.members.map(id => `<@ \){id}>`).join(", ")}\n\n`;
        desc += `**Match Timing:** <t:\( {thisMatchTimestamp}:F> (<t: \){thisMatchTimestamp}:R>)`;
      }

      const matchEmbed = new EmbedBuilder()
        .setColor(0x00ff99)
        .setTitle(`Match ${matchNum} • ${name}`)
        .setDescription(desc)
        .setImage("https://official.garena.com/intl/v1/config/gallery_esport01.jpg")
        .setTimestamp();

      // Ping both team roles
      let pingContent = "";
      if (team1) {
        const role1Name = team1.teamName.replace(/[<>@#]/g, "").trim();
        const role1 = interaction.guild.roles.cache.find(r => r.name === role1Name);
        if (role1) pingContent += `<@&${role1.id}> `;
      }
      if (team2) {
        const role2Name = team2.teamName.replace(/[<>@#]/g, "").trim();
        const role2 = interaction.guild.roles.cache.find(r => r.name === role2Name);
        if (role2) pingContent += `<@&${role2.id}>`;
      }

      await matchChannel.send({
        content: pingContent.trim() || "@everyone",
        embeds: [matchEmbed]
      });
    }

    await interaction.reply({
      content: `✅ **Tournament channels created successfully!**\nCategory: **${category.name}**\nAll matches are ready with proper permissions and timings.`,
      ephemeral: true
    });
  }
};