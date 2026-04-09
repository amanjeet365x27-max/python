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
        .setRequired(true))
    .addStringOption(o =>
      o.setName("slots")
        .setDescription("Slots to create channels for (example: 1-14 or all)")
        .setRequired(false))
    .addStringOption(o =>
      o.setName("rules")
        .setDescription("Send official rulebook?")
        .setRequired(false)
        .addChoices(
          { name: "Yes", value: "yes" },
          { name: "No", value: "no" }
        )),

  async execute(interaction) {
    const ADMIN_ROLE_ID = "1488964288210272458";
    const SPECIAL_ROLE_ID = "1449832147161448721";

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "Only admin can use this.", ephemeral: true });
    }

    const name = interaction.options.getString("name");
    const mode = interaction.options.getString("mode");
    const startTimeStr = interaction.options.getString("start_time");
    const gapMinutes = interaction.options.getInteger("gap");
    const slotsStr = interaction.options.getString("slots") || "all";
    const sendRules = interaction.options.getString("rules") || "no";

    const data = await tournament.getData();
    const t = data.tournaments[name];

    if (!t) {
      return interaction.reply({ content: `Tournament **${name}** not found.`, ephemeral: true });
    }

    if (!t.registrations || t.registrations.length === 0) {
      return interaction.reply({ content: "No teams registered yet.", ephemeral: true });
    }

    let registrations = t.registrations;
    if (slotsStr !== "all") {
      let selected = [];
      if (slotsStr.includes("-")) {
        const [start, end] = slotsStr.split("-").map(Number);
        for (let i = start; i <= end; i++) selected.push(i);
      } else {
        selected = slotsStr.split(",").map(Number);
      }
      registrations = t.registrations.filter((_, i) => selected.includes(i + 1));
    }

    const teamsPerMatch = mode === "BR" ? 12 : 2;

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

    const category = await interaction.guild.channels.create({
      name: `Tournament - \( {name} ( \){mode})`,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: SPECIAL_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.MentionEveryone
          ]
        }
      ]
    });

    const totalMatches = Math.ceil(registrations.length / teamsPerMatch);
    let firstMatchChannel = null;

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
          },
          {
            id: SPECIAL_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageMessages,
              PermissionsBitField.Flags.MentionEveryone
            ]
          }
        ]
      });

      if (matchNum === 1) firstMatchChannel = matchChannel;

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

      const thisMatchTimestamp = currentMatchTimestamp + (matchNum - 1) * gapMinutes * 60;

      let desc = `**Match \( {matchNum}** • ** \){name}**\n\n`;

      if (mode === "CS") {
        const team1 = matchTeams[0];
        const team2 = matchTeams[1] || null;

        if (team1 && team2) {
          desc += `**\( {team1.teamName}** vs ** \){team2.teamName}**\n\n`;
          desc += `**IGL Team 1:** <@${team1.leaderId}>\n`;
          desc += `**Players Team 1:** \( {team1.members.map(id => `<@ \){id}>`).join(", ")}\n\n`;
          desc += `**IGL Team 2:** <@${team2.leaderId}>\n`;
          desc += `**Players Team 2:** \( {team2.members.map(id => `<@ \){id}>`).join(", ")}\n\n`;
        } else if (team1) {
          desc += `**${team1.teamName}** vs **EMPTY SLOT**\n\n`;
          desc += `**IGL:** <@${team1.leaderId}>\n`;
          desc += `**Players:** \( {team1.members.map(id => `<@ \){id}>`).join(", ")}\n\n`;
        }
      } else {
        desc += `**${matchTeams.length} Teams**\n\n`;
        
        matchTeams.forEach((team, index) => {
          if (team) {
            desc += `**${index + 1}. ${team.teamName}**\n`;
            desc += `**IGL:** <@${team.leaderId}>\n`;
            desc += `**Players:** \( {team.members.map(id => `<@ \){id}>`).join(", ")}\n\n`;
          } else {
            desc += `**${index + 1}. EMPTY SLOT**\n\n`;
          }
        });
      }

      desc += `**Match Timing:** <t:\( {thisMatchTimestamp}:F> (<t: \){thisMatchTimestamp}:R>)`;

      const matchEmbed = new EmbedBuilder()
        .setColor(0x00ff99)
        .setTitle(`Match ${matchNum} • ${name}`)
        .setDescription(desc)
        .setImage("https://official.garena.com/intl/v1/config/gallery_esport01.jpg")
        .setTimestamp();

      const pingContent = pingRoles.length ? pingRoles.join(" ") : "@everyone";

      await matchChannel.send({
        content: pingContent,
        embeds: [matchEmbed]
      });
    }

    // ================= SEND YOUR EXACT RULEBOOK =================
    if (sendRules === "yes" && firstMatchChannel) {
      const ruleEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle("🏆 HEROIC HUSTLE – OFFICIAL RULEBOOK")
        .setDescription(
` (Applicable for CS & BR Matches)
📌 1. GENERAL RULES (Applicable to All Matches)
All players must join the lobby 10 minutes before match time.
Only registered players are allowed to play. No substitutes without approval.
Players must follow fair play & sportsmanship at all times.
Any kind of abusive language, toxicity, or harassment will result in penalties.
Organizer’s decision is final in all disputes.
🚫 2. STRICTLY PROHIBITED
Use of hacks, cheats, scripts, or third-party tools
Exploiting game bugs/glitches
Teaming with other squads (in BR)
Stream sniping
Sharing room ID/password with outsiders
⚠️ Violation = Immediate Disqualification + Ban
⚔️ 3. CS MODE RULES (Clash Squad)
📊 Match Format
Mode: Clash Squad (Custom Room)
Format: Best of 1 / Best of 3 (depending on round)
Map: Decided by organizer or veto system
👥 Team Rules
Team Size: 4 Players
No extra players allowed in match
🎮 Gameplay Rules
Character skills allowed (as per tournament decision)
Gun skins allowed unless stated otherwise
No intentional disconnects
⏱️ Disconnection Rule
If a player disconnects before Round 1 → Rematch possible
Mid-match disconnect → Match continues
🏆 Winning Criteria
First team to win required rounds (e.g., 7 rounds) wins the match
🪂 4. BR MODE RULES (Battle Royale)
📊 Match Format
Mode: Squad Battle Royale (Custom Room)
Map: Bermuda / Kalahari / Alpine (as decided)
👥 Team Rules
Team Size: 4 Players
Solo / Duo not allowed unless specified
🎮 Gameplay Rules
No teaming with other squads
No unfair advantage exploits
All players must land after match start (no pre-jump bugs)
🏆 Points System (Example)
🥇 1st Place – 12 Points
🥈 2nd Place – 9 Points
🥉 3rd Place – 8 Points
Each Kill – 1 Point
(Can be adjusted depending on tournament)
📸 5. RESULT & PROOF SUBMISSION
Winning team must submit screenshot of result screen
Submit within 5 minutes after match
Any dispute must be reported immediately
⚖️ 6. PENALTIES
Late Join → Warning / Round loss
Rule Violation → Point deduction / Disqualification
Repeated misconduct → Permanent ban from Heroic Hustle
📢 7. ORGANIZER RIGHTS
Heroic Hustle reserves the right to:
Change rules if required
Reschedule matches
Disqualify any team without prior notice (with valid reason)
❤️ FINAL NOTE
Play fair. Play smart. Play like a Hero.
Welcome to Heroic Hustle ⚔️🔥`
        );

      await firstMatchChannel.send({ embeds: [ruleEmbed] });
    }

    await interaction.reply({
      content: `✅ **Tournament channels created successfully!**\n**Mode:** ${mode}\n**Category:** ${category.name}\n**Matches Created:** ${totalMatches}`,
      ephemeral: true
    });
  }
};