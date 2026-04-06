const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pool = require("./db");

// ================= LOAD DATA =================
async function loadData() {
  const res = await pool.query("SELECT * FROM tournaments");
  const tournaments = {};
  res.rows.forEach(row => {
    tournaments[row.name] = row.data;
  });
  return { tournaments };
}

// ================= SAVE DATA =================
async function saveData(data) {
  for (let name in data.tournaments) {
    await pool.query(
      `INSERT INTO tournaments (name, data)
       VALUES ($1, $2)
       ON CONFLICT (name)
       DO UPDATE SET data = $2`,
      [name, data.tournaments[name]]
    );
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Create a tournament")
    .addStringOption(o =>
      o.setName("name").setDescription("Tournament name").setRequired(true))
    .addIntegerOption(o =>
      o.setName("slots").setDescription("Total slots").setRequired(true))
    .addIntegerOption(o =>
      o.setName("mentions").setDescription("Mentions required").setRequired(true))
    .addChannelOption(o =>
      o.setName("channel").setDescription("Registration channel").setRequired(true))
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
    const slots = interaction.options.getInteger("slots");
    const mentions = interaction.options.getInteger("mentions");
    const channel = interaction.options.getChannel("channel");
    const ping = interaction.options.getString("ping");

    const data = await loadData();
    if (!data.tournaments) data.tournaments = {};

    for (let tName in data.tournaments) {
      if (data.tournaments[tName].channelId === channel.id) {
        return interaction.reply({ content: "A tournament already exists in this channel.", ephemeral: true });
      }
    }

    data.tournaments[name] = {
      name,
      slots,
      mentions,
      channelId: channel.id,
      registrations: [],
      createdAt: Date.now()
    };

    await saveData(data);

    if (ping === "yes") {
      await channel.send({ content: "@everyone @here" });
    }

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { ViewChannel: true, SendMessages: true }
    );

    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("**Tournament REGISTRATION[OPEN]**")
      .setDescription(`**${name}** REGISTRATION STARTED GRAB YOUR SLOTS FAST`)
      .addFields(
        { name: "Total Slots", value: `${slots}`, inline: true },
        { name: "Mentions Required", value: `${mentions}`, inline: true },
        { name: "Channel", value: `<#${channel.id}>` }
      )
      .setImage("https://cdn.oneesports.id/cdn-data/sites/2/2024/12/462574290_1265728211300654_4514308865345103186_n.jpg");

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: "✅ Tournament registration started!", ephemeral: true });
  },

  async getData() {
    return await loadData();
  },

  async saveData(data) {
    await saveData(data);
  },

  validate(message, t) {
    const content = message.content.trim();
    const match = content.match(/team\s*name\s*[-:=\s]*\s*(.+)/i);

    const mentions = message.mentions.users;

    if (!mentions || mentions.size !== t.mentions) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ Wrong Number of Mentions!")
        .setDescription(`You must mention **exactly ${t.mentions} players** (including yourself).`)
        .setFooter({ text: "Make sure to include yourself in the mentions!" });

      return { error: true, embed };
    }

    if (!mentions.has(message.author.id)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ You Must Include Yourself!")
        .setDescription("You have to ping yourself along with the other players.")
        .setFooter({ text: "Mention yourself as the team leader." });

      return { error: true, embed };
    }

    let teamName;
    if (match) {
      teamName = match[1].split("\n")[0].trim();
      if (!teamName) return "Invalid team name.";
    } else {
      const lines = content.split("\n");
      teamName = lines[0].trim();
      if (!teamName) return "Use format:\n**Team Name- YOUR TEAM NAME**\n@mentions";
    }

    return {
      teamName,
      members: [...mentions.keys()]
    };
  },

  async register(message, t) {
    const result = this.validate(message, t);
    if (result.error && result.embed) {
      return message.reply({ embeds: [result.embed] });
    }
    if (typeof result === "string") {
      return message.reply(result);
    }

    for (let i = 0; i < t.registrations.length; i++) {
      const team = t.registrations[i];
      const alreadyInTeam = result.members.filter(id => team.members.includes(id));
      if (alreadyInTeam.length > 0) {
        const conflictEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("❌ Player Already Registered")
          .setDescription("One or more players are already part of another team.")
          .addFields(
            { name: "Team Name", value: `\`${team.teamName}\``, inline: true },
            { name: "Slot Number", value: `${i + 1}`, inline: true },
            { name: "IGL (Registered By)", value: `<@${team.leaderId}>`, inline: true },
            { name: "Affected Player(s)", value: alreadyInTeam.map(id => `<@${id}>`).join("\n") }
          );

        return message.reply({ embeds: [conflictEmbed] });
      }
    }

    t.registrations.push({
      teamName: result.teamName,
      members: result.members,
      leaderId: message.author.id
    });

    const cleanTeamName = result.teamName
      .replace(/[<>@#]/g, "")
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .trim()
      .slice(0, 90);

    const role = await message.guild.roles.create({
      name: cleanTeamName || `Team ${t.registrations.length}`,
      mentionable: true,
      reason: "Tournament Team Role"
    });

    const iglMember = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (iglMember) await iglMember.roles.add(role);

    const fullData = await this.getData();
    fullData.tournaments[t.name] = t;
    await this.saveData(fullData);

    const slotsRemaining = t.slots - t.registrations.length;

    const confirmEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("✅ Registration Confirmed!")
      .setDescription(
        "**Team:** " + result.teamName + "\n" +
        "**Leader:** <@" + message.author.id + ">\n" +
        "**Members:** " + result.members.map(id => "<@" + id + ">").join(", ") + "\n\n" +
        "**Slots Remaining:** " + slotsRemaining + " / " + t.slots
      )
      .setThumbnail("https://i.pinimg.com/originals/e8/06/52/e80652af2c77e3a73858e16b2ffe5f9a.gif");

    await message.channel.send({ embeds: [confirmEmbed] });

    if (t.registrations.length >= t.slots) {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false, ViewChannel: true }
      );

      const closeEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🛑 Registration Closed")
        .setDescription("All slots are filled. Registration is now closed.")
        .setImage("https://official.garena.com/intl/v1/config/gallery_esport01.jpg");

      await message.channel.send({ embeds: [closeEmbed] });
    }
  }
};