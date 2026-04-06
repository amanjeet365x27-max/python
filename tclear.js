const { SlashCommandBuilder } = require('discord.js');
const pool = require('../db'); // your PostgreSQL pool connection

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleartournament')
        .setDescription('Clears a tournament along with its slots and tinfo')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Enter the tournament name')
                .setRequired(true)
        ),
    async execute(interaction) {
        const tournamentName = interaction.options.getString('name');

        try {
            // Check if tournament exists
            const res = await pool.query(
                'SELECT * FROM tournaments WHERE name = $1',
                [tournamentName]
            );

            if (res.rows.length === 0) {
                return interaction.reply({ content: `❌ Tournament "${tournamentName}" not found!`, ephemeral: true });
            }

            // Delete slots linked to the tournament
            await pool.query(
                'DELETE FROM slots WHERE tournament_name = $1',
                [tournamentName]
            );

            // Delete tinfo linked to the tournament
            await pool.query(
                'DELETE FROM tinfo WHERE tournament_name = $1',
                [tournamentName]
            );

            // Delete the tournament itself
            await pool.query(
                'DELETE FROM tournaments WHERE name = $1',
                [tournamentName]
            );

            return interaction.reply({ content: `✅ Tournament "${tournamentName}" and all its data have been cleared!`, ephemeral: false });
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: `❌ An error occurred while clearing the tournament.`, ephemeral: true });
        }
    },
};