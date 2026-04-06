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
      o.setName("mode")
        .setDescription("Tournament Mode")
        .setRequired(true)
        .addChoices(
          { name: "CS (Clash Squad)", value: "CS" },
          { name: "BR (Battle Royale)", value: "BR" }
        ))
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
    const mode = interaction.options.getString("mode"); // "CS" or "BR"
    const startTimeStr = interaction.options.getString("start_time");
    const gapMinutes = interaction.options.getInteger("gap");

    const data = await tournament.getData();
    const t = data.tournaments[name];

    if (!t) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }

    if (!t.registrations || t.registrations.length === 0) {
      return interaction.reply({ content: "No teams registered yet.", ephemeral: true });
    }

    const registrations = t.registrations;
    const teamsPerMatch = mode === "BR" ? 12 : 2;

    // ================= PARSE START TIME AS IST (UTC+5:30) =================
    const [hours, minutes] = startTimeStr.split(":").map(Number);
    const nowUTC = new Date();
    let utcHours = hours - 5;
    let utcMinutes = minutes - 30;

    if (utcMinutes < 0) {
      utcMinutes += 60;
      utcHours -= 1;
    }
    if (utcHours < 0) {
      utcHours += 24;
    }

    const startDate = new Date(Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate(),
      utcHours,
      utcMinutes,
      0,
      0
    ));

    let currentMatchTimestamp = Math.floor(startDate.getTime() / 1000);

    // ================= CREATE HIDDEN CATEGORY =================
    const category = await interaction.guild.channels.create({
      name: `Tournament - ${name} (${mode})`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    // ================= CREATE MATCH CHANNELS =================
    const totalMatches = Math.ceil(registrations.length / teamsPerMatch);

    for (let matchNum = 1; matchNum <= totalMatches; matchNum++) {
      const startIndex = (matchNum - 1) * teamsPerMatch;
      const matchTeams = registrations.slice(startIndex, startIndex + teamsPerMatch);

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

      // Give access to all teams in this match
      const pingRoles = [];
      
      for (const team of matchTeams) {
        if (!team) continue;
        const roleName = team.teamName.replace(/[<>@#]/g, "").trim();
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        
        if (role) {
          await matchChannel.permissionOverwrites.edit(role.id, {
            ViewChannel: true,
            SendMessages: true
          });
          pingRoles.push(`<@&${role.id}>`);
        }
      }

      // Calculate this match's timing
      const thisMatchTimestamp = currentMatchTimestamp + (matchNum - 1) * gapMinutes * 60;

      // ================= BUILD MATCH EMBED =================
      let desc = `**Match ${matchNum}** • **${mode}**\n\n`;

      if (mode === "CS") {
        const team1 = matchTeams[0];
        const team2 = matchTeams[1] || null;

        if (team1 && team2) {
          desc += `**${team1.teamName}** vs **${team2.teamName}**\n\n`;
          desc += `**IGL Team 1:** <@${team1.leaderId}>\n`;
          desc += `**Players Team 1:** ${team1.members.map(id => `<@${id}>`).join(", ")}\n\n`;
          desc += `**IGL Team 2:** <@${team2.leaderId}>\n`;
          desc += `**Players Team 2:** ${team2.members.map(id => `<@${id}>`).join(", ")}\n\n`;
        } else if (team1) {
          desc += `**${team1.teamName}** vs **EMPTY SLOT**\n\n`;
          desc += `**IGL:** <@${team1.leaderId}>\n`;
          desc += `**Players:** ${team1.members.map(id => `<@${id}>`).join(", ")}\n\n`;
        }
      } 
      else { // BR Mode
        desc += `**${matchTeams.length} Teams**\n\n`;
        
        matchTeams.forEach((team, index) => {
          if (team) {
            desc += `**${index + 1}. ${team.teamName}**\n`;
            desc += `**IGL:** <@${team.leaderId}>\n`;
            desc += `**Players:** ${team.members.map(id => `<@${id}>`).join(", ")}\n\n`;
          } else {
            desc += `**${index + 1}. EMPTY SLOT**\n\n`;
          }
        });
      }

      desc += `**Match Timing:** <t:${thisMatchTimestamp}:F> (<t:${thisMatchTimestamp}:R>)`;

      const matchEmbed = new EmbedBuilder()
        .setColor(0x00ff99)
        .setTitle(`Match ${matchNum} • ${name} (${mode})`)
        .setDescription(desc)
        .setImage("https://official.garena.com/intl/v1/config/gallery_esport01.jpg")
        .setTimestamp();

      // Ping all participating team roles
      const pingContent = pingRoles.length ? pingRoles.join(" ") : "@everyone";

      await matchChannel.send({
        content: pingContent,
        embeds: [matchEmbed]
      });
    }

    await interaction.reply({
      content: `✅ **Tournament channels created successfully!**\n**Mode:** ${mode}\n**Category:** ${category.name}\n**Matches Created:** ${totalMatches}`,
      ephemeral: true
    });
  }
};
