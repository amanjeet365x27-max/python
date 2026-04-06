const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pool = require("./db");

// ================= LOAD =================
async function loadData() {
  const res = await pool.query("SELECT * FROM tournaments");
  const tournaments = {};
  res.rows.forEach(row => {
    tournaments[row.name] = row.data;
  });
  return { tournaments };
}

// ================= SAVE =================
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
      o.setName("pings")
        .setDescription("Ping everyone or not")
        .setRequired(true)
        .addChoices(
          { name: "yes", value: "yes" },
          { name: "no", value: "no" }
        )
    ),

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
    const pings = interaction.options.getString("pings");

    const data = await loadData();
    if (!data.tournaments) data.tournaments = {};

    data.tournaments[name] = {
      name,
      slots,
      mentions,
      channelId: channel.id,
      registrations: [],
      pings
    };

    await saveData(data);

    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("Tournament Created")
      .setDescription(`Name: **${name}**`)
      .addFields(
        { name: "Slots", value: `${slots}`, inline: true },
        { name: "Mentions Required", value: `${mentions}`, inline: true },
        { name: "Channel", value: `<#${channel.id}>` }
      )
      .setImage("https://cdn.oneesports.id/cdn-data/sites/2/2024/12/462574290_1265728211300654_4514308865345103186_n.jpg");

    await interaction.reply({ embeds: [embed] });

    // 🔥 ONLY FIX: allowedMentions added (nothing else changed)
    if (pings === "yes") {
      const startEmbed = new EmbedBuilder()
        .setColor(0x00ff99)
        .setTitle("**Tournament Registration Started!**")
        .setDescription(
          `Tournament **${name}** has started. Claim your spots fast!\n\n` +
          `Use the following format to register your team:\n` +
          `**Team Name- YOUR TEAM NAME**\n` +
          `@mention your team members (including yourself)`
        );

      await channel.send({
        content: "@everyone @here",
        embeds: [startEmbed],
        allowedMentions: { parse: ["everyone"] } // ✅ THIS IS THE ONLY REAL FIX
      });
    }
  },

  async getData() {
    return await loadData();
  },

  async saveData(data) {
    await saveData(data);
  },

  // ================= VALIDATE =================
  validate(message, t) {
    const content = message.content.trim();

    if (!content.toLowerCase().startsWith("team name-")) {
      return "Use format:\nTeam Name- YOUR TEAM NAME\n@mentions";
    }

    const teamName = content.split("Team Name-")[1]?.split("\n")[0]?.trim();
    if (!teamName) return "Invalid team name.";

    const mentions = message.mentions.users;

    if (mentions.size !== t.mentions) {
      return `You must mention exactly ${t.mentions} players (including yourself).`;
    }

    if (!mentions.has(message.author.id)) {
      return "You must include yourself in mentions.";
    }

    return {
      teamName,
      members: [...mentions.keys()]
    };
  }
};