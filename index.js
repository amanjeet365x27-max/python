const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const si = require("./si");
const tournament = require("./tournament");
const slot = require("./slot");
const tinfo = require("./tinfo");
const tclear = require("./tclear");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    si.data.toJSON(),
    tournament.data.toJSON(),
    slot.data.toJSON(),
    tinfo.data.toJSON(),
    tclear.data.toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("Slash commands registered");
  } catch (error) {
    console.error(error);
  }
});

// ================= JOIN/LEAVE =================
client.on("guildMemberAdd", () => {
  si.joins.push(Date.now());
  const now = Date.now();
  si.joins = si.joins.filter(t => now - t < 86400000 * 2);
});

client.on("guildMemberRemove", () => {
  si.leaves.push(Date.now());
  const now = Date.now();
  si.leaves = si.leaves.filter(t => now - t < 86400000 * 2);
});

// ================= COMMAND HANDLER =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "serverinfo") {
    await si.execute(interaction);
  }

  if (interaction.commandName === "tournament") {
    await tournament.execute(interaction);
  }

  if (interaction.commandName === "slot") {
    await slot.execute(interaction);
  }

  if (interaction.commandName === "tinfo") {
    await tinfo.execute(interaction);
  }

  if (interaction.commandName === "tclear") {
    await tclear.execute(interaction);
  }
});

// ================= MESSAGE LISTENER =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const data = await tournament.getData();

  if (!data.tournaments) return;

  for (let tName in data.tournaments) {
    const t = data.tournaments[tName];

    if (message.channel.id !== t.channelId) continue;

    if (t.registrations.length >= t.slots) return;

    const result = tournament.validate(message, t);

    if (typeof result === "string") {
      return message.reply(result);
    }

    // ================= ALREADY REGISTERED =================
    for (let i = 0; i < t.registrations.length; i++) {
      const team = t.registrations[i];

      for (let id of result.members) {
        if (team.members.includes(id)) {
          return message.reply({
            embeds: [{
              color: 0xff0000,
              title: "Already Registered",
              description:
                `Team: **${team.teamName}**\n` +
                `Slot: **${i + 1}**\n` +
                `Registered By: <@${team.leaderId}>`
            }]
          });
        }
      }
    }

    // ================= SAVE TEAM =================
    t.registrations.push({
      teamName: result.teamName,
      members: result.members,
      leaderId: message.author.id
    });

    // ================= ROLE CREATE FIX =================
    const role = await message.guild.roles.create({
      name: result.teamName.replace(/[<>@]/g, ""), // ✅ ONLY FIX
      mentionable: true
    });

    for (let id of result.members) {
      const member = await message.guild.members.fetch(id);
      await member.roles.add(role);
    }

    await tournament.saveData(data);

    await message.reply({
      embeds: [{
        color: 0x00ff00,
        description: "**Registration Successful**"
      }]
    });

    if (t.registrations.length >= t.slots) {
      await message.channel.send({
        embeds: [{
          color: 0xff0000,
          title: "Registration Closed",
          description: "All slots filled.\nRoadmap soon."
        }]
      });

      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false }
      );
    }

    return;
  }
});

// ================= LOGIN =================
client.login(TOKEN);
