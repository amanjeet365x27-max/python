const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const tournament = require("./tournament");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tadd")
    .setDescription("Manually add a team to a specific slot")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("Tournament name")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("team")
        .setDescription("Team name")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("slot")
        .setDescription("Slot number")
        .setRequired(true))
    .addUserOption(o =>
      o.setName("igl")
        .setDescription("Team leader (IGL)")
        .setRequired(true)),

  async execute(interaction) {

    const ADMIN_ROLE_ID = "1488964288210272458";

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Only admin can use this command.",
        ephemeral: true
      });
    }

    const name = interaction.options.getString("name").trim();
    const teamName = interaction.options.getString("team").trim();
    const slotNumber = interaction.options.getInteger("slot");
    const igl = interaction.options.getUser("igl");

    let data = await tournament.getData();

    if (!data.tournaments || !data.tournaments[name]) {
      return interaction.reply({
        content: `❌ Tournament **${name}** not found.`,
        ephemeral: true
      });
    }

    const t = data.tournaments[name];

    if (slotNumber < 1 || slotNumber > t.slots) {
      return interaction.reply({
        content: `❌ Invalid slot. Must be between 1 and ${t.slots}`,
        ephemeral: true
      });
    }

    const index = slotNumber - 1;

    // Ensure array size
    if (!t.registrations) t.registrations = [];
    while (t.registrations.length < t.slots) {
      t.registrations.push(null);
    }

    const existing = t.registrations[index];

    // ❌ SLOT ALREADY FILLED
    if (existing) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ SLOT ALREADY FILLED")
        .setDescription("This slot is already occupied!")
        .addFields(
          { name: "🏆 Tournament", value: `**${name}**`, inline: true },
          { name: "🔢 Slot", value: `**#${slotNumber}**`, inline: true },
          { name: "👑 Team", value: `**${existing.teamName}**`, inline: false },
          { name: "🎮 IGL", value: `<@${existing.leaderId}>`, inline: true },
          { name: "👥 Members", value: existing.members.map(id => `<@${id}>`).join("\n") || "No members", inline: false }
        )
        .setFooter({ text: "Heroic Hustle • Slot System" });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ✅ CREATE ROLE
    const cleanName = teamName
      .replace(/[<>@#]/g, "")
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .trim()
      .slice(0, 90);

    const role = await interaction.guild.roles.create({
      name: cleanName || `Team ${slotNumber}`,
      mentionable: true,
      reason: "Manual slot add"
    });

    const iglMember = await interaction.guild.members.fetch(igl.id).catch(() => null);
    if (iglMember) {
      await iglMember.roles.add(role).catch(() => {});
    }

    // ✅ ADD SLOT
    t.registrations[index] = {
      teamName: teamName,
      members: [igl.id],
      leaderId: igl.id
    };

    // SAVE
    data.tournaments[name] = t;
    await tournament.saveData(data);

    // ✅ SUCCESS EMBED
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("✅ SLOT ADDED SUCCESSFULLY")
      .setDescription("A team has been manually added!")
      .addFields(
        { name: "🏆 Tournament", value: `**${name}**`, inline: true },
        { name: "🔢 Slot", value: `**#${slotNumber}**`, inline: true },
        { name: "👑 Team", value: `**${teamName}**`, inline: false },
        { name: "🎮 IGL", value: `<@${igl.id}>`, inline: true }
      )
      .setFooter({ text: `Added by ${interaction.user.tag}` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
