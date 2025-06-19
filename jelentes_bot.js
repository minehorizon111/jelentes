
const { Client, GatewayIntentBits, Partials, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, Events, EmbedBuilder, SlashCommandBuilder, REST, Routes, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

// 🔁 IDE ÍRD A SAJÁT ADATAIDAT:
require('dotenv').config();
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = '1385283856789274805';
const GUILD_ID = '1133389389423190096';
const KÜLDÉS_CSATORNA_ID = '1187376007104184362';

// ⬇️ Slash parancs regisztrálás
const commands = [
  new SlashCommandBuilder()
    .setName('jelentes')
    .setDescription('Rendőrségi jelentés készítése')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash parancs regisztrálva!');
  } catch (err) {
    console.error('Hiba:', err);
  }
})();

// 🗂️ Átmeneti tároló két modal között
const modalCache = new Map();

client.on(Events.InteractionCreate, async interaction => {
  // 🔹 Slash parancs → első modal
  if (interaction.isChatInputCommand() && interaction.commandName === 'jelentes') {
    const modal1 = new ModalBuilder()
      .setCustomId('jelentes_modal_1')
      .setTitle('Rendőrségi jelentés – 1/2');

    modal1.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('tipus').setLabel('Típus (pl. Körözés)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('keresztnev').setLabel('Keresztnév').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('vezeteknev').setLabel('Vezetéknév').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('szuletesi').setLabel('Születési idő (ÉÉÉÉ.HH.NN)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('neme').setLabel('Neme (pl. Férfi)').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );

    await interaction.showModal(modal1);
  }

  // 🔹 Első modal beküldve → gomb jön
  if (interaction.isModalSubmit() && interaction.customId === 'jelentes_modal_1') {
    const values = {
      tipus: interaction.fields.getTextInputValue('tipus'),
      keresztnev: interaction.fields.getTextInputValue('keresztnev'),
      vezeteknev: interaction.fields.getTextInputValue('vezeteknev'),
      szuletesi: interaction.fields.getTextInputValue('szuletesi'),
      neme: interaction.fields.getTextInputValue('neme'),
    };

    modalCache.set(interaction.user.id, values);

    const gomb = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('modal2_gomb')
        .setLabel('➕ Következő oldal')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: '✅ Első rész kész! Kattints a gombra a folytatáshoz:',
      components: [gomb],
      flags: 64 // ephemeral új módon
    });
  }

  // 🔹 Második modal megnyitása a gombra
  if (interaction.isButton() && interaction.customId === 'modal2_gomb') {
    const modal2 = new ModalBuilder()
      .setCustomId('jelentes_modal_2')
      .setTitle('Rendőrségi jelentés – 2/2');

    modal2.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('frakcio').setLabel('Frakció').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('buntett').setLabel('Elkövetett bűntény(ek)').setStyle(TextInputStyle.Paragraph).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('csekkdb').setLabel('Csekk(ek) mennyisége').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('csekkosszeg').setLabel('Csekk(ek) összege').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('borton').setLabel('Letöltendő börtön (opcionális)').setStyle(TextInputStyle.Short).setRequired(false)
      )
    );

    await interaction.showModal(modal2);
  }

  // 🔹 Második modal beküldése → jelentés elküldése embedben
  if (interaction.isModalSubmit() && interaction.customId === 'jelentes_modal_2') {
    const previous = modalCache.get(interaction.user.id);
    if (!previous) return interaction.reply({ content: '❌ Hiba: Előző adatok hiányoznak.', ephemeral: true });

    const frakcio = interaction.fields.getTextInputValue('frakcio');
    const buntett = interaction.fields.getTextInputValue('buntett');
    const csekkdb = interaction.fields.getTextInputValue('csekkdb');
    const csekkosszeg = interaction.fields.getTextInputValue('csekkosszeg');
    const borton = interaction.fields.getTextInputValue('borton') || 'Nincs megadva';
   
    const urgencyColor = previous.tipus.toLowerCase().includes('körözés') ? 0xFF0000 : 0x00AEFF;

    const embed = new EmbedBuilder()
      .setTitle(`📄 Rendőrségi jelentés - ${previous.keresztnev} ${previous.vezeteknev}`)
      .setColor(urgencyColor)
      .addFields(
        { name: 'Típus', value: previous.tipus, inline: true },
        { name: 'Név', value: `${previous.keresztnev} ${previous.vezeteknev}`, inline: true },
        { name: 'Születési idő', value: previous.szuletesi, inline: true },
        { name: 'Neme', value: previous.neme, inline: true },
        { name: 'Frakció', value: frakcio, inline: false },
        { name: 'Elkövetett bűntény(ek)', value: buntett, inline: false },
        { name: 'Csekk(ek) mennyisége', value: csekkdb, inline: true },
        { name: 'Csekk(ek) összege', value: csekkosszeg, inline: true },
        { name: 'Letöltendő börtönbüntetés', value: borton, inline: true },
      )
      .setTimestamp();

    const csatorna = await client.channels.fetch(KÜLDÉS_CSATORNA_ID);
    await csatorna.send({ embeds: [embed] });

    await interaction.reply({ content: '✅ Jelentés sikeresen beküldve!', flags: 64 });
    modalCache.delete(interaction.user.id);
  }
});

client.login(TOKEN);
