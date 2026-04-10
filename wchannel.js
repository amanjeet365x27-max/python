const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wchannel")
    .setDescription("Create match channels + category for winners")
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

    if (!t.winners || t.winners.length === 0) {
      return interaction.reply({ content: "No winners found.", ephemeral: true });
    }

    let registrations = t.winners;

    if (slotsStr !== "all") {
      let selected = [];
      if (slotsStr.includes("-")) {
        const [start, end] = slotsStr.split("-").map(Number);
        for (let i = start; i <= end; i++) selected.push(i);
      } else {
        selected = slotsStr.split(",").map(Number);
      }
      registrations = t.winners.filter((_, i) => selected.includes(i + 1));
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
      name: `Winners - ${name} (${mode})`,
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

    const allMatchChannels = []; // ✅ ADDED

    for (let matchNum = 1; matchNum <= totalMatches; matchNum++) {
      const startIndex = (matchNum - 1) * teamsPerMatch;
      const matchTeams = registrations.slice(startIndex, startIndex + teamsPerMatch);

      const matchChannel = await interaction.guild.channels.create({
        name: `match-${matchNum}`,
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

      allMatchChannels.push(matchChannel); // ✅ ADDED

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

      let desc = `**Match ${matchNum}**\n\n`;

      if (mode === "CS") {
        const team1 = matchTeams[0];
        const team2 = matchTeams[1] || null;

        if (team1 && team2) {
          desc += `**${team1.teamName}** vs **${team2.teamName}**\n\n`;
          desc += `**IGL Team 1:** <@${team1.igl}>\n\n`;
          desc += `**IGL Team 2:** <@${team2.igl}>\n\n`;
        } else if (team1) {
          desc += `**${team1.teamName}** vs **EMPTY SLOT**\n\n`;
          desc += `**IGL:** <@${team1.igl}>\n\n`;
        }
      } else {
        desc += `**${matchTeams.length} Teams**\n\n`;

        matchTeams.forEach((team, index) => {
          if (team) {
            desc += `**${index + 1}. ${team.teamName}**\n`;
            desc += `**IGL:** <@${team.igl}>\n\n`;
          } else {
            desc += `**${index + 1}. EMPTY SLOT**\n\n`;
          }
        });
      }

      desc += `**Match Timing:** <t:${thisMatchTimestamp}:F> (<t:${thisMatchTimestamp}:R>)`;

      const matchEmbed = new EmbedBuilder()
        .setColor(0xffd700)
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

    if (sendRules === "yes") {

      const embeds = [
        new EmbedBuilder().setColor(0xFFD700).setTitle("🏆 HEROIC HUSTLE – OFFICIAL RULEBOOK").setDescription(`(Applicable for CS & BR Matches)`),
        new EmbedBuilder().setColor(0x00ff00).setDescription(`📌 1. GENERAL RULES (Applicable to All Matches)
All players must join the lobby 10 minutes before match time.
Only registered players are allowed to play. No substitutes without approval.
Players must follow fair play & sportsmanship at all times.
Any kind of abusive language, toxicity, or harassment will result in penalties.
Organizer’s decision is final in all disputes.`),
        new EmbedBuilder().setColor(0xff0000).setDescription(`🚫 2. STRICTLY PROHIBITED
Use of hacks, cheats, scripts, or third-party tools
Exploiting game bugs/glitches
Teaming with other squads (in BR)
Stream sniping
Sharing room ID/password with outsiders
⚠️ Violation = Immediate Disqualification + Ban`),
        new EmbedBuilder().setColor(0x0099ff).setDescription(`⚔️ 3. CS MODE RULES (Clash Squad)
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
First team to win required rounds (e.g., 7 rounds) wins the match`),
        new EmbedBuilder().setColor(0xff9900).setDescription(`🪂 4. BR MODE RULES (Battle Royale)
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
(Can be adjusted depending on tournament)`),
        new EmbedBuilder().setColor(0x9966ff).setDescription(`📸 5. RESULT & PROOF SUBMISSION
Winning team must submit screenshot of result screen
Submit within 5 minutes after match
Any dispute must be reported immediately`),
        new EmbedBuilder().setColor(0x00ffff).setDescription(`⚖️ 6. PENALTIES
Late Join → Warning / Round loss
Rule Violation → Point deduction / Disqualification
Repeated misconduct → Permanent ban from Heroic Hustle`),
        new EmbedBuilder().setColor(0xffffff).setDescription(`📢 7. ORGANIZER RIGHTS
Heroic Hustle reserves the right to:
Change rules if required
Reschedule matches
Disqualify any team without prior notice (with valid reason)`),
        new EmbedBuilder().setColor(0xff66cc).setDescription(`❤️ FINAL NOTE
Play fair. Play smart. Play like a Hero.
Welcome to Heroic Hustle ⚔️🔥`)
      ];

      for (const ch of allMatchChannels) { // ✅ FIXED LOOP
        for (const e of embeds) {
          await ch.send({ embeds: [e] });
        }
      }
    }

    await interaction.reply({
      content: `✅ Winners channels created successfully!\nMode: ${mode}\nMatches: ${totalMatches}`,
      ephemeral: true
    });
  }
};
