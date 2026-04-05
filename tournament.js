const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FILE = "tournament.json";

// ===== LOAD =====
function load() {
  if (!fs.existsSync(FILE)) return { tournaments: {} };
  return JSON.parse(fs.readFileSync(FILE));
}

// ===== SAVE =====
function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Start tournament")
    .addStringOption(o => o.setName("name").setDescription("Name").setRequired(true))
    .addIntegerOption(o => o.setName("slots").setDescription("Slots").setRequired(true))
    .addIntegerOption(o => o.setName("mentions").setDescription("Players").setRequired(true))
    .addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true)),

  async execute(interaction) {
    const ADMIN = "1488964288210272458";
    if (!interaction.member.roles.cache.has(ADMIN)) {
      return interaction.reply({ content: "Only admin", ephemeral: true });
    }

    const data = load();

    const name = interaction.options.getString("name");

    data.tournaments[name] = {
      name,
      slots: interaction.options.getInteger("slots"),
      mentionsReq: interaction.options.getInteger("mentions"),
      channelId: interaction.options.getChannel("channel").id,
      registrations: []
    };

    save(data);

    const embed = new EmbedBuilder()
      .setTitle(name)
      .setDescription("Registration Open")
      .addFields(
        { name: "Format", value: "Team Name - xyz\n@mentions" },
        { name: "Slots", value: `${data.tournaments[name].slots}`, inline: true }
      )
      .setColor("Red");

    await interaction.reply({ content: "Tournament created", ephemeral: true });
    await interaction.options.getChannel("channel").send({ embeds: [embed] });
  },

  getData() {
    return load();
  },

  saveData(data) {
    save(data);
  },

  // ===== VALIDATION =====
  validate(message, tournament) {
    if (!message.content.toLowerCase().startsWith("team name")) {
      return "Use format:\nTeam Name - xyz\n@mentions";
    }

    const name = message.content.split("-")[1]?.split("<@")[0].trim();
    if (!name) return "Invalid team name";

    const mentions = [...message.mentions.users.values()];
    const ids = mentions.map(m => m.id);

    if (ids.length !== tournament.mentionsReq) {
      return `Mention exactly ${tournament.mentionsReq} players`;
    }

    if (!ids.includes(message.author.id)) {
      return "You must include yourself";
    }

    return { teamName: name, members: ids };
  }
};
