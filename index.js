client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.commandName === "serverinfo") await si.execute(interaction);
    if (interaction.commandName === "tournament") await tournament.execute(interaction);
    if (interaction.commandName === "slot") await slot.execute(interaction);
    if (interaction.commandName === "tinfo") await tinfo.execute(interaction);
    if (interaction.commandName === "tclear") await tclear.execute(interaction);
    if (interaction.commandName === "tchannel") await tchannel.execute(interaction);
    if (interaction.commandName === "winner") await winner.execute(interaction);
    if (interaction.commandName === "wslot") await wslot.execute(interaction);
    if (interaction.commandName === "wchannel") await wchannel.execute(interaction);
    if (interaction.commandName === "wclear") await wclear.execute(interaction);
    if (interaction.commandName === "tcancel") await tcancel.execute(interaction);
    if (interaction.commandName === "tbackup") await tbackup.execute(interaction);

  } catch (err) {
    console.error("Command Error:", err);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "❌ Error while executing command." });
    } else {
      await interaction.reply({ content: "❌ Error while executing command.", ephemeral: true });
    }
  }
});
