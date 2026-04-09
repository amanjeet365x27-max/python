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
    const SPECIAL_ROLE_ID = "1449832147161448721"; // ✅ added

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

    // ===== FILTER SLOTS (new feature) =====
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

    // ================= CREATE HIDDEN CATEGORY =================
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

    // ================= CREATE MATCH CHANNELS =================
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
      } 
      else {
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

    // ================= SEND EXACT RULEBOOK IF ENABLED =================
    if (sendRules === "yes" && firstMatchChannel) {
      const ruleHeader = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle("🏆 HEROIC HUSTLE – OFFICIAL RULEBOOK")
        .setDescription("(Applicable for CS & BR Matches)");

      const ruleGeneral = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle("📌 1. GENERAL RULES (Applicable to All Matches)")
        .setDescription(
          "All players must join the lobby 10 minutes before match time.\n" +
          "Only registered players are allowed to play. No substitutes without approval.\n" +
          "Players must follow fair play & sportsmanship at all times.\n" +
          "Any kind of abusive language, toxicity, or harassment will result in penalties.\n" +
          "Organizer’s decision is final in all disputes."
        );

      const ruleProhibited = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🚫 2. STRICTLY PROHIBITED")
        .setDescription(
          "Use of hacks, cheats, scripts, or third-party tools\n" +
          "Exploiting game bugs/glitches\n" +
          "Teaming with other squads (in BR)\n" +
          "Stream sniping\n" +
          "Sharing room ID/password with outsiders\n\n" +
          "⚠️ Violation = Immediate Disqualification + Ban"
        );

      const ruleCS = new EmbedBuilder()
        .setColor(0x32CD32)
        .setTitle("⚔️ 3. CS MODE RULES (Clash Squad)")
        .setDescription(
          "📊 Match Format\n" +
          "Mode: Clash Squad (Custom Room)\n" +
          "Format: Best of 1 / Best of 3 (depending on round)\n" +
          "Map: Decided by organizer or veto system\n\n" +
          "👥 Team Rules\n" +
          "Team Size: 4 Players\n" +
          "No extra players allowed in match\n\n" +
          "🎮 Gameplay Rules\n" +
          "Character skills allowed (as per tournament decision)\n" +
          "Gun skins allowed unless stated otherwise\n" +
          "No intentional disconnects\n\n" +
          "⏱️ Disconnection Rule\n" +
          "If a player disconnects before Round 1 → Rematch possible\n" +
          "Mid-match disconnect → Match continues\n\n" +
          "🏆 Winning Criteria\n" +
          "First team to win required rounds (e.g., 7 rounds) wins the match"
        );

      const ruleBR = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle("🪂 4. BR MODE RULES (Battle Royale)")
        .setDescription(
          "📊 Match Format\n" +
          "Mode: Squad Battle Royale (Custom Room)\n" +
          "Map: Bermuda / Kalahari / Alpine (as decided)\n\n" +
          "👥 Team Rules\n" +
          "Team Size: 4 Players\n" +
          "Solo / Duo not allowed unless specified\n\n" +
          "🎮 Gameplay Rules\n" +
          "No teaming with other squads\n" +
          "No unfair advantage exploits\n" +
          "All players must land after match start (no pre-jump bugs)\n\n" +
          "🏆 Points System (Example)\n" +
          "🥇 1st Place – 12 Points\n" +
          "🥈 2nd Place – 9 Points\n" +
          "🥉 3rd Place – 8 Points\n" +
          "Each Kill – 1 Point\n" +
          "(Can be adjusted depending on tournament)"
        );

      const ruleSubmission = new EmbedBuilder()
        .setColor(0xFF1493)
        .setTitle("📸 5. RESULT & PROOF SUBMISSION")
        .setDescription(
          "Winning team must submit screenshot of result screen\n" +
          "Submit within 5 minutes after match\n" +
          "Any dispute must be reported immediately"
        );

      const rulePenalties = new EmbedBuilder()
        .setColor(0xDC143C)
        .setTitle("⚖️ 6. PENALTIES")
        .setDescription(
          "Late Join → Warning / Round loss\n" +
          "Rule Violation → Point deduction / Disqualification\n" +
          "Repeated misconduct → Permanent ban from Heroic Hustle"
        );

      const ruleOrganizer = new EmbedBuilder()
        .setColor(0x8A2BE2)
        .setTitle("📢 7. ORGANIZER RIGHTS")
        .setDescription(
          "Heroic Hustle reserves the right to:\n" +
          "Change rules if required\n" +
          "Reschedule matches\n" +
          "Disqualify any team without prior notice (with valid reason)\n\n" +
          "❤️ FINAL NOTE\n" +
          "Play fair. Play smart. Play like a Hero.\n" +
          "Welcome to Heroic Hustle ⚔️🔥"
        );

      await firstMatchChannel.send({
        embeds: [ruleHeader, ruleGeneral, ruleProhibited, ruleCS, ruleBR, ruleSubmission, rulePenalties, ruleOrganizer]
      });
    }

    await interaction.reply({
      content: `✅ **Tournament channels created successfully!**\n**Mode:** ${mode}\n**Category:** ${category.name}\n**Matches Created:** ${totalMatches}`,
      ephemeral: true
    });
  }
};