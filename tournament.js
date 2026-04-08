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
 try {
 await pool.query(
 `INSERT INTO tournaments (name, data)
 VALUES ($1, $2)
 ON CONFLICT (name)
 DO UPDATE SET data = $2`,
 [name, data.tournaments[name]]
 );
 } catch (err) {
 console.error("DB save failed:", err);
 }
 }
}

// ================= TIME FORMAT =================
function formatTime(input) {
 if (!input) return null;
 let t = input.toLowerCase().replace(/\s/g, "");

 let match = t.match(/^(\d{1,2})(am|pm)$/);
 if (match) {
 let hour = parseInt(match[1]);
 if (match[2] === "pm" && hour !== 12) hour += 12;
 if (match[2] === "am" && hour === 12) hour = 0;
 return input;
 }

 match = t.match(/^(\d{1,2}):(\d{2})$/);
 if (match) {
 let hour = parseInt(match[1]);
 let min = match[2];
 return `${hour.toString().padStart(2, "0")}:${min}`;
 }

 return input;
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
 ))
 .addStringOption(o =>
 o.setName("time")
 .setDescription("Tournament time (optional)")
 .setRequired(false)),

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
 let time = interaction.options.getString("time");

 time = formatTime(time);

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
 regClosed: false,
 createdAt: Date.now(),
 time: time || null
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

 if (time) {
 embed.addFields({ name: "Time", value: `${time}`, inline: true });
 }

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

 let mentionIds = [...message.mentions.users.keys()];

 if (mentionIds.length < t.mentions) {
 const embed = new EmbedBuilder()
 .setColor(0xff0000)
 .setTitle("❌ Wrong Number of Mentions!")
 .setDescription(`You must mention **at least ${t.mentions} players** (including yourself).`)
 .setFooter({ text: "Make sure to include yourself in the mentions!" });
 return { error: true, embed };
 }

 if (mentionIds.length > t.mentions) {
 mentionIds = mentionIds.slice(0, t.mentions);
 }

 if (!mentionIds.includes(message.author.id)) {
 const embed = new EmbedBuilder()
 .setColor(0xff0000)
 .setTitle("❌ You Must Include Yourself!")
 .setDescription("You have to ping yourself along with the other players.")
 .setFooter({ text: "Mention yourself as the team leader." });
 return { error: true, embed };
 }

 let teamName;
 const match = content.match(/team\s*name\s*[-:=\s]*\s*(.+)/i);

 if (match) {
 teamName = match[1].split("\n")[0].trim();
 } else {
 const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
 teamName = lines.length ? lines[0] : `Team-${Date.now()}`;
 }

 teamName = teamName.replace(/<@!?[\d]+>/g, '').trim() || `Team-${Date.now()}`;

 return {
 teamName,
 members: mentionIds
 };
 },

 async register(message, t) {
 if (t.regClosed) return;

 if (t.registrations.length >= t.slots) {
 return message.reply("❌ Slots are already full.");
 }

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

 let role;

 try {
 role = await message.guild.roles.create({
 name: cleanTeamName || `Team ${t.registrations.length}`,
 mentionable: true,
 reason: "Tournament Team Role"
 });
 } catch (err) {
 console.error("Role creation failed:", err);
 }

 try {
 const iglMember = await message.guild.members.fetch(message.author.id).catch(() => null);
 if (role && iglMember) await iglMember.roles.add(role);
 } catch (err) {
 console.error("Role assign failed:", err);
 }

 const fullData = await this.getData();
 fullData.tournaments[t.name] = t;

 try {
 await this.saveData(fullData);
 } catch (err) {
 console.error("DB save failed:", err);
 }

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
