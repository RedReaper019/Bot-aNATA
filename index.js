const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ===================== READY =====================
client.once("ready", async () => {
  console.log(`Logado como ${client.user.tag}`);

  if (!config.panelChannelId) {
    return console.log("❌ panelChannelId não definido no config.json");
  }

  const channel = await client.channels.fetch(config.panelChannelId);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_set_modal")
      .setLabel("Pedir Set")
      .setStyle(ButtonStyle.Success)
  );

  const embed = new EmbedBuilder()
    .setTitle("📌 Sistema de Set")
    .setDescription("Clique no botão abaixo para solicitar seu set no servidor.")
    .setColor("Green");

  channel.send({ embeds: [embed], components: [row] });
});

// ===================== INTERAÇÕES =====================
client.on(Events.InteractionCreate, async (interaction) => {

  // ===== BOTÃO ABRIR MODAL =====
  if (interaction.isButton()) {

    if (interaction.customId === "open_set_modal") {
      const modal = new ModalBuilder()
        .setCustomId("set_modal")
        .setTitle("Pedido de Set");

      const nome = new TextInputBuilder()
        .setCustomId("nome")
        .setLabel("Seu Nome")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const id = new TextInputBuilder()
        .setCustomId("id")
        .setLabel("Seu ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const recrutador = new TextInputBuilder()
        .setCustomId("recrutador")
        .setLabel("Quem recrutou você?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nome),
        new ActionRowBuilder().addComponents(id),
        new ActionRowBuilder().addComponents(recrutador)
      );

      return interaction.showModal(modal);
    }

    // ===== APROVAR =====
    if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {

    try {

        if (!interaction.member.roles.cache.has(config.cargoAprovador)) {
            return interaction.reply({
                content: '❌ Sem permissão.',
                ephemeral: true
            });
        }

        // 🔥 ISSO AQUI EVITA "interação falhou"
        await interaction.deferUpdate();

        const userId = interaction.customId.split('_')[1];

        const membro = await interaction.guild.members.fetch(userId);

        await membro.roles.add(config.cargoMembro).catch(console.error);

        try {
            await membro.setNickname(`M | ${membro.user.username} | ${userId}`)
    .catch(err => console.log("Erro nickname:", err));
        } catch {}

        const canalFarm = await interaction.guild.channels.create({
            name: `⏳-${membro.user.username.toLowerCase()}`,
            type: ChannelType.GuildText,
            parent: config.categoriaFarm,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: membro.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages
                    ]
                },
                {
                    id: config.cargoAprovador,
                    allow: [PermissionsBitField.Flags.ViewChannel]
                }
            ]
        });

        await canalFarm.send(
`Bem-vindo ${membro}

Aqui está seu novo canal de farm.

Nome:
Id:
Quantidade:
Print do farm:

👊🏽⚔️`
        );

    } catch (err) {
        console.error('Erro ao aprovar:', err);

        try {
            await interaction.followUp({
                content: '❌ Erro real ao aprovar (veja o console).',
                ephemeral: true
            });
        } catch {}
    }
}
    // ===== REPROVAR =====
    if (interaction.customId.startsWith("reject_")) {
      if (!interaction.member.roles.cache.has(config.staffRoleId)) {
        return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
      }

      const userId = interaction.customId.split("_")[1];

      await interaction.update({
        content: `❌ Pedido reprovado por ${interaction.user}`,
        components: []
      });

      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        user.send("❌ Seu pedido de set foi recusado no servidor.");
      }

      return;
    }
  }

  // ===== MODAL SUBMIT =====
  if (interaction.isModalSubmit()) {

    if (interaction.customId === "set_modal") {

      const nome = interaction.fields.getTextInputValue("nome");
      const id = interaction.fields.getTextInputValue("id");
      const recrutador = interaction.fields.getTextInputValue("recrutador");

      const channel = await client.channels.fetch(config.requestChannelId);

      const embed = new EmbedBuilder()
        .setTitle("📩 Novo Pedido de Set")
        .addFields(
          { name: "Nome", value: nome },
          { name: "ID", value: id },
          { name: "Recrutado por", value: recrutador },
          { name: "Usuário", value: `<@${interaction.user.id}>` }
        )
        .setColor("Yellow");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`approve_${interaction.user.id}`)
          .setLabel("Aprovar")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`reject_${interaction.user.id}`)
          .setLabel("Reprovar")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: "✅ Seu pedido foi enviado!",
        ephemeral: true
      });
    }
  }
});

client.login("MTUxOTQ5ODE1MDA4MTk4NjU4MA.GCanwn.zZuGlRLm459uS9u9MGi08j1yLAjHkoSB6zTyL4");