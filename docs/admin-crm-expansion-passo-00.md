# Passo 00 — Expansão CRM do Admin Panel: Listagem de Features e Componentes Novos

Date: 2026-08-10
Status: Rascunho para revisão do usuário
Fonte: `treino-trinca-app/docs/briefing-admin-crm-expansion.md` (seção 04, fonte de verdade do mapa de páginas) + 44+ prints em `~/Downloads/adm-prints/**` + auditoria de `melhor-versao-dashboard/src/components/{atoms,composites}/`.

> Este documento cobre as 11 páginas do admin CRM (P01–P11). Ele fica **dentro
> de `melhor-versao-dashboard`** porque este é o projeto de destino de toda a
> Camada 01 (frontend) — ver `briefing-admin-crm-expansion.md` seção 05.1: o
> painel dos prints não existe em código hoje, então `~/Downloads/adm-prints/**`
> é a fonte de verdade completa e a reconstrução é do zero, guiada
> pixel-a-pixel pelos prints.
>
> Correção de nomenclatura de pastas (herdada do briefing): a pasta
> `classification/` contém os prints da página **P09 Regras**, e a pasta
> `regras/` contém o print da página **P10 Liberar usuário** — trocados em
> relação ao nome.
>
> Fora de escopo deste documento: código, rotas de API do worker, e as
> perguntas em aberto da seção 07 do briefing que não bloqueiam as listas
> abaixo (role de edição, escopo de "Relatórios" dentro de Avaliação, rótulos
> exatos de renovação Trinca/Elite, nome exato dos tipos de métrica de
> conquista — essas ficam para revisão do usuário, não impedem o mapeamento
> de features/componentes).

---

## Parte 1 — Features por página (P01–P11)

### P01 — Dashboard

*(Sem prints — página especificada apenas por texto no briefing, seção 04.
Sinalizar como "spec por texto, sem confirmação visual" ao herdar para o
Passo 01.)*

- Card de métrica "Total usuários" (texto)
- Card de métrica "Total Trinca" (texto)
- Card de métrica "Total Elite" (texto)
- Card de métrica "Reembolsos" (texto)
- Card de métrica "Sem acesso" (texto)
- Card de métrica "Freq. média alta" (texto)
- Card de métrica "Freq. média baixa" (texto)
- Gráfico "Distribuição de idade" (texto)
- Gráfico "Objetivos" (texto)
- Gráfico "Frequência" (texto)
- Card "Sugestões recentes" (lista, texto)
- Card "Avaliações recentes de treino" (lista, texto)

### P02 — Usuários

*(Sem prints — página especificada apenas por texto no briefing, seção 04.)*

- Card de métrica "Total" (texto)
- Card de métrica "Trinca" (texto)
- Card de métrica "Elite" (texto)
- Card de métrica "Reembolso" (texto)
- Card de métrica "Sem acesso" (texto)
- Campo de busca por nome/e-mail (texto)
- Filtro por objetivo (texto)
- Filtro por sexo (texto)
- Filtro por renda (texto)
- Filtro por frequência (texto)
- Filtro por status: elite / trinca / vencendo / reembolsada / sem acesso (texto)
- Ranking por faturamento total (receita − reembolso) por lead (texto)
- Card "Prazo de avaliação global" — dias para reset automático de protocolo, mapeado nos 6 tipos existentes (versão inicial = versão A), com ação "Aplicar" a partir do próprio dashboard (texto)

> Nota: a estrutura de card+ação "Aplicar" para prazo global reaparece,
> confirmada em print, em P11 Configurações ("Prazo global de reavaliação"
> `(settings/20.54.29)`) — mesmo padrão de componente, dois lugares.

### P03 — Protocolos (abas: Protocolos / Treinos)

- Sub-navegação em duas abas no topo, estilo pill/segmented: "Protocolos" (ícone de halteres, subtítulo "Modelos padrão") e "Treinos" (ícone de pessoas, subtítulo "Ajustes por aluno") — aba ativa destacada em azul (workouts/18.51.39)
- Título de página "Protocolos de treino" com contador "12 protocolo(s) cadastrado(s)" (workouts/18.51.39)
- Botão "Limpar duplicados" (ícone de lixeira) no topo da lista (workouts/18.51.39)
- Botão primário "+ Novo protocolo" no topo da lista (workouts/18.51.39)
- Bloco "CATEGORIAS ADMINISTRATIVAS DOS PROTOCOLOS" com chips/badges de contagem por categoria: "Protocolo A: 6", "Protocolo B: 6" (workouts/18.51.39)
- Campo de busca com placeholder "Buscar protocolo..." (ícone de lupa) (workouts/18.51.39)
- Card de categoria (ex.: "Categoria: Protocolo A"):
  - Avatar/badge circular com a letra da categoria (A, B) (workouts/18.51.39, workouts/18.51.54)
  - Título "Categoria: Protocolo X" e subtítulo "6 modelo(s) nesta categoria administrativa" (workouts/18.51.39)
  - Badge "Visível apenas no painel" no canto superior direito do card de categoria (workouts/18.51.39)
- Linha/card de protocolo dentro da categoria:
  - Badge de tag "PROTOCOLO A" / "PROTOCOLO B" (workouts/18.51.39)
  - Nome do protocolo (ex.: "Treino Experiente - Para Crescer") (workouts/18.51.39)
  - Texto "Nota interna: Protocolo B" exibido em alguns protocolos, em azul, abaixo do nome (workouts/18.51.54)
  - Linha de metadados: "3 treinos · 27 exercícios · 3x/sem" (workouts/18.51.39)
  - Badge de nível colorido: "Avançado" (vermelho/laranja) ou "Iniciante" (verde) (workouts/18.51.39, workouts/18.51.47)
  - Botão "Liberar" (ícone de envio/paper-plane) por protocolo (workouts/18.51.39)
  - Ícone de ação "copiar/duplicar" (workouts/18.51.39)
  - Ícone de ação "editar" (lápis) (workouts/18.51.39)
  - Ícone de ação "excluir" (lixeira) (workouts/18.51.39)
  - Ícone de expandir/recolher (chevron down/up) que revela a lista de treinos do protocolo inline (workouts/18.51.39, workouts/18.51.54)
- Lista de protocolos da categoria A observados: "Treino Experiente - Para Crescer" (Avançado, 3 treinos/27 exercícios/3x sem), "Treino Experiente - Para Crescer e Secar" (Avançado, 3/27/3x), "Treino Experiente - Para Secar Muito" (Avançado, 3/24/3x), "Treino Iniciante - Para Crescer" (Iniciante, 3/24/3x), "Treino Iniciante - Para Crescer e Secar" (Iniciante, 3/24/3x), "Treino Iniciante - Para Secar Muito" (Iniciante, 3/22/3x) (workouts/18.51.47)
- Lista de protocolos da categoria B observados: "Iniciante - Crescer" (Iniciante, 3/24/3x, nota interna "Protocolo B"), "Iniciante - Crescer e Secar" (Iniciante, 3/24/3x), "Iniciante - Secar Muito" (Iniciante, 3/22/3x), "Experiente - Crescer" (Avançado, 3/27/3x) (workouts/18.51.54)
- Card de protocolo expandido mostra sub-lista "Treino 1", "Treino 2", "Treino 3", cada um com número sequencial em bolha azul, metadados "65 min · 8 exercícios" (ou "9 exercícios"), e link/botão "Editar" à direita de cada treino (workouts/18.51.54, workouts/18.52.15)

**Modal "Editar protocolo":**
- Cabeçalho do modal com ícone, título "Editar protocolo", subtítulo "Organize em duas etapas simples: dados do protocolo e treinos." e botão fechar (X) (workouts/18.52.27)
- Navegação por abas dentro do modal: "1. Dados do protocolo" (ícone de estrelas) e "2. Treinos e exercícios" (ícone de prancheta) (workouts/18.52.27)
- Três mini-cards de resumo no topo do modal: "PROTOCOLO" (nome truncado), "TREINOS" (número, ex.: 3), "EXERCÍCIOS" (número, ex.: 27) (workouts/18.52.27)
- Rótulo de progresso "ETAPA 1" com título "Informações do protocolo" e texto de ajuda "Preencha somente o essencial para o aluno reconhecer o treino no app." (workouts/18.52.27)
- Aba "Dados do protocolo" — campos: "Nome do protocolo *" (texto livre) (workouts/18.52.27); "Categoria do protocolo *" (dropdown, ex.: "Protocolo A") (workouts/18.52.27); "Etiqueta interna (só admin vê)" (texto livre, placeholder "Ex: Progressão do A - foco em ombro") (workouts/18.52.34); "Descrição curta" (textarea, ex.: "Foco em ganhar massa muscular") (workouts/18.52.34); "Nível" (dropdown, ex.: "Avançado") (workouts/18.52.34); "Objetivo" (texto livre, ex.: "Ganhar massa muscular") (workouts/18.52.34); "Frequência semanal" (input numérico com stepper, ex.: 3) (workouts/18.52.34); "Imagem de capa" (campo de URL, placeholder "https://...") (workouts/18.52.34)
- Botões de rodapé "Cancelar" e "Próximo: montar treinos" (workouts/18.52.27, workouts/18.52.34)
- Aba "2. Treinos e exercícios" — rótulo "ETAPA 2", título "Treinos do protocolo", texto de ajuda "Abra um treino, adicione exercícios e mantenha a ordem de execução simples." (workouts/18.52.57)
  - Botão "+ Adicionar treino" (workouts/18.52.57)
  - Card de treino expansível com número sequencial, nome ("Treino 1"), metadados "65 min · 9 exercício(s)", botão "+ Exercício", ícone de excluir (lixeira) e chevron de expandir/recolher (workouts/18.52.57)
  - Dentro do card de treino expandido: nome do treino ("Treino 1"), campo de ordem numérica ("1"), campo de descrição/foco do treino ("Aquecimento + abdominal + membros inferiores + superiores"), campo de duração em minutos ("65") (workouts/18.53.06)
  - Botão tracejado "Trocar imagem do treino" com preview de imagem de capa do treino abaixo (workouts/18.53.06)
  - Seção "Exercícios" com contador "9 item(ns) na ordem de execução" e botão "+ Adicionar" (workouts/18.53.06, workouts/18.53.13)
  - Lista de exercícios reordenável (ícone de "arrastar"/drag-handle à esquerda), cada item com: número sequencial em bolha, nome do exercício, metadados "X séries · Y reps · Zs descanso" (ou "3 a 5 minutos reps" para aquecimento), ícone de excluir (lixeira) e chevron de expandir/recolher (workouts/18.53.13)
  - Exercícios listados no exemplo: "Aquecimento" (1 série · 3 a 5 minutos reps · 0s descanso), "Abdominal com rolinho" (3 séries · 12 reps · 50s descanso), "Agachamento livre" (4 séries · 10 reps · 50s descanso), "Cadeira extensora" (3 séries · 12 reps · 50s descanso), "Remada curvada com barra" (4 séries · 10 reps · 50s descanso), "Supino reto com barra" (4 séries · 10 reps · 50s descanso), "Desenvolvimento com barra em pé" (4 séries · 10 reps · 50s descanso), "Tríceps corda no pulley" (3 séries · 12 reps · 50s descanso) (workouts/18.53.13, workouts/18.53.24)
  - Ao expandir um exercício, campo de busca "Buscar exercício cadastrado..." com lista de resultados agrupados por grupo muscular (ex.: "Abdominal crunch na máquina — Abdômen", "Abdominal declinado com peso — Abdômen", etc.), permitindo trocar/vincular o exercício da biblioteca (workouts/18.53.24)
  - Campo de nome do exercício em edição (texto livre, ex.: "Tríceps corda no pulley") (workouts/18.53.35)
  - Botão tracejado "Imagem selecionada — trocar" (upload/troca de imagem do exercício) (workouts/18.53.35)
  - Seção "Vídeo do exercício (opcional)" com texto de ajuda "Envie o arquivo de vídeo aqui ou cole um link. No app, ele aparece dentro da tela do exercício." (workouts/18.53.35)
  - Botão tracejado "Trocar arquivo de vídeo" (upload) (workouts/18.53.35)
  - Campo de texto para link de vídeo (ex.: URL do YouTube Shorts) com preview embutido do player do YouTube abaixo (workouts/18.53.35)
  - Botão "Remover vídeo" (workouts/18.53.40)
  - Campo "Tipo" (dropdown, ex.: "Repetições") (workouts/18.53.35, workouts/18.53.40)
  - Campo "Séries" (input numérico com stepper, ex.: 3) (workouts/18.53.40)
  - Campo "Repetições" (input numérico, ex.: 12) (workouts/18.53.40)
  - Campo "Descanso (s)" (input numérico, ex.: 50) (workouts/18.53.40)
  - Campo "Como executar (opcional)" (textarea) (workouts/18.53.40)
  - Campo "Observações e cuidados (opcional)" (textarea) (workouts/18.53.40)
  - Botões de rodapé "Cancelar" e "Salvar protocolo" (ícone de check) presentes em todas as telas da etapa 2 (workouts/18.52.57 a 18.53.40)

**Aba "Treinos" (Ajustes por aluno):**
- Título "Treinos individuais" com subtítulo "Edite o treino de um aluno específico sem alterar o protocolo padrão." (workouts/18.58.34)
- 4 cards de métricas em grid 2x2: "ALUNOS NO APP" — 51864 (ícone de pessoas) (workouts/18.58.34); "COM PROTOCOLO" — 51077 (ícone de check verde, card com destaque verde) (workouts/18.58.34); "PRÓXIMO PROTOCOLO PENDENTE" — 28 (ícone de relógio amarelo, card com destaque âmbar) (workouts/18.58.34); "SEM PROTOCOLO" — 787 (ícone de cadeado azul, card com destaque azul) (workouts/18.58.34)
- Campo de busca com placeholder "Digite o e-mail completo e clique em Buscar..." (busca exige e-mail exato) (workouts/18.58.34, workouts/18.58.40)
- Dropdown de filtro "Todos os planos" (workouts/18.58.40)
- Botão "Buscar" (ícone de lupa) (workouts/18.58.40)
- Indicador de paginação "Mostrando 1–1.000 de 51.864 aluno(s)" (workouts/18.58.40)
- Controles de paginação "Anterior" (desabilitado no início) e "Próxima" (workouts/18.58.40)
- Card de aluno na lista: nome do aluno (workouts/18.58.40); e-mail do aluno (workouts/18.58.40); badge de plano do aluno (ex.: "ELITE" com ícone de coroa, "TRINCA" com ícone de raio) (workouts/18.58.40); botão "EDITAR TREINOS" (ícone de lápis) (workouts/18.58.40); badge/tag "PROTOCOLO A" indicando o protocolo vinculado ao aluno, com ícone de "atalho/redirect" (workouts/18.58.40)
- Modal "Editar treino individual" — reutiliza exatamente a mesma estrutura do modal "Editar protocolo" (abas "1. Dados do protocolo" / "2. Treinos e exercícios", mini-cards de resumo Protocolo/Treinos/Exercícios, campos "Nome do protocolo", "Categoria do protocolo", etc., botões "Cancelar" / "Próximo: montar treinos"), diferenciando-se apenas pelo título do cabeçalho "Editar treino individual" (workouts/18.58.46)

### P04 — Exercícios

- Título da página "Exercícios" em destaque (heading grande) (exercises/19.19.40)
- Subtítulo/contador total abaixo do título: "67 exercícios" (exercises/19.19.40)
- Botão primário "Novo Exercício" (fundo azul gradiente, ícone "+" à esquerda), posicionado no canto superior direito (exercises/19.19.40)
- Campo de busca full-width com ícone de lupa e placeholder "Buscar exercício..." (exercises/19.19.40)
- Filtro por categoria em formato de pills horizontais, com a pill ativa em azul preenchido ("Todos") e as demais em contorno escuro/outline. Pills, na ordem: "Todos", "Peito", "Ombros", "Costas", "Bíceps", "Tríceps", "Abdômen", "Pernas", "Panturrilhas" (exercises/19.19.40)
- Lista de cards de exercício, cada card contendo: nome do exercício em negrito (ex.: "Abdominal com rolinho", "Abdominal crunch na máquina") (exercises/19.19.40); badge de grupo muscular (ex.: "Abdômen") (exercises/19.19.40); badge "Vídeo" com ícone de câmera indicando vídeo demonstrativo cadastrado (exercises/19.19.40); linha "Equipamento: [nome]" (ex.: "Rolo abdominal", "Máquina") (exercises/19.19.40); linha de descrição curta (exercises/19.19.40); ícone de ação "editar" (lápis) (exercises/19.19.40); ícone de ação "excluir" (lixeira vermelha) (exercises/19.19.40)
- Barra de navegação inferior fixa (mobile/tablet) com 5 itens: "Dashboard", "Usuários", "Protocolos", "Exercícios" (ativo, destacado), "Mais" (exercises/19.19.40)
- Modal "Editar exercício": título "Editar exercício", subtítulo "Preencha o essencial: nome, imagem, vídeo e instruções.", botão fechar (X) (exercises/19.19.49)
  - Seção "Dados básicos" (subtítulo "Identifique rapidamente o exercício."): campo "Nome *" (obrigatório) (exercises/19.19.49); campo "Grupo muscular" (exercises/19.19.49); campo "Equipamento" (exercises/19.19.49)
  - Seção "Vídeo demonstrativo" (subtítulo "Cole um link do YouTube Shorts, YouTube, Vimeo ou MP4."): botão/dropzone tracejado "Trocar arquivo de vídeo" (upload) (exercises/19.19.49); campo de texto/URL do vídeo (exercises/19.19.49); preview embutido do vídeo (thumbnail + botão play + link "Watch on YouTube") (exercises/19.19.49); botão "Remover vídeo" (exercises/19.19.55)
  - Seção "Instruções do exercício" (subtítulo "Explique de forma simples como executar corretamente."): textarea de instrução (exercises/19.19.49, exercises/19.19.55)
  - Rodapé do modal com botões "Cancelar" (outline) e "Salvar exercício" (preenchido, primário) (exercises/19.19.55)
- Não observado nestes 3 prints (sinalizar para Passo 01): estado vazio (sem exercícios/busca sem resultado), modal de "Novo Exercício" dedicado, campo de upload de imagem do exercício, confirmação de exclusão.

### P05 — Avaliação / Quiz

*(Sub-abas de topo: Quiz e Respostas de Avaliação. Sub-tabs de Quiz —
edição fica pós-MVP, mas as features abaixo documentam tudo que é visível
para orientar a versão somente-leitura desta rodada.)*

**Sidebar / menu geral (confirmado em `quiz/19.29.37`):**
- Logo/marca "Treino Trinca" com ícone de escudo azul e label "Administrador" no topo do sidebar (quiz/19.29.37)
- Itens do menu lateral, na ordem exata: Dashboard, Usuários, Protocolos, Exercícios, Avaliação (ativo), Relatórios, Sugestões, Conquistas, Experiência Elite, Banners, Regras, Liberar usuário, Configurações — cada um com ícone próprio (quiz/19.29.37)
- Rodapé do sidebar: card de usuário logado (avatar "R" azul, nome "Rafael Moreira", cargo "Admin") e item "Sair" com ícone de porta (quiz/19.29.37)

**Header "Gestão do Quiz":**
- Título "Gestão do Quiz" (quiz/19.29.37)
- Contador-resumo "23 perguntas · 16 avaliações · 1 páginas especiais" (quiz/19.29.37)
- Botão secundário "+ Carregar do PDF" (quiz/19.29.37)
- Botão primário "+ Nova Pergunta" (quiz/19.29.37)

**Sub-abas de topo (nível 1):** card "Quiz" (ícone prancheta, descrição "Gestão de perguntas e páginas") (quiz/19.29.37, quiz/19.31.51); card "Respostas de Avaliação" (ícone duas pessoas, descrição "Visualizar respostas dos usuários") (quiz/19.29.37, quiz/19.31.51, quiz/19.31.54)

**Sub-tabs dentro de "Quiz" (nível 2):** "Quiz Início" (badge "23") (quiz/19.29.37); "Quiz Reavaliação" (badge "16") (quiz/19.29.37, quiz/19.29.49); "Páginas Especiais" (badge "1") (quiz/19.29.37, quiz/19.29.53); "Página de Fim" (sem badge) (quiz/19.29.37, quiz/19.29.57)

**Sub-tab "Quiz Início" (23 perguntas):**
- Card de pergunta numerado: número de ordem (badge circular azul), texto da pergunta, badge de tipo de resposta, badge de contagem de opções, badge "Auto-avanço" (verde, quando habilitado), 3 ícones de ação (olho/toggle, editar, excluir) (quiz/19.29.37)
- Perguntas: "Qual é o seu gênero?" (Escolha única, 2 opções, Auto-avanço); "Qual é a sua idade?" (Número); "Qual é a sua altura?" (Número); "Qual é o seu peso atual?" (Número); "Como está sua composição corporal hoje?" (Escolha única, 7 opções, Auto-avanço); "Qual é a sua experiência com academia?" (Escolha única, 3 opções, Auto-avanço); "Está treinando atualmente?" (parcial) (quiz/19.29.37)
- Modal "Editar Pergunta": título + botão fechar (X) (quiz/19.29.44); campo "Tipo" (dropdown, ex. "Escolha única") (quiz/19.29.44); campo "Ordem" (numérico) (quiz/19.29.44); campo "Pergunta *" (textarea obrigatório) (quiz/19.29.44); campo "Subtítulo / Label (opcional)" (quiz/19.29.44); seção "Opções *" — lista de inputs de texto editáveis + link "+ Adicionar opção" (quiz/19.29.44); toggle "Avançar automaticamente ao clicar" (quiz/19.29.44); botões "Cancelar" / "Salvar" (quiz/19.29.44)

**Sub-tab "Quiz Reavaliação" (16 perguntas):**
- Mesmo padrão de card (número, texto, badges de tipo/opções/auto-avanço), porém com apenas 2 ícones de ação (editar, excluir — sem o ícone de olho/toggle do Quiz Início) (quiz/19.29.49)
- Perguntas: "Como você avalia sua evolução física desde o início dos treinos?" (Escolha única, 4 opções, Auto-avanço); "De 0 a 10, qual nota você dá para os treinos que realizou?" (Número); "Você sentiu alguma dor muscular intensa durante os treinos?" (Escolha única, 4 opções, Auto-avanço); "Qual região do corpo você sentiu mais dor ou desconforto ao treinar?" (Múltipla escolha, 8 opções); "Com que frequência você conseguiu treinar nas últimas semanas?" (Escolha única, 5 opções, Auto-avanço); "O que mais te impediu de treinar com a frequência que queria?" (Texto livre) (quiz/19.29.49)

**Sub-tab "Páginas Especiais" (1 página):**
- Banner informativo explicando o recurso ("aparecem entre as perguntas do quiz... têm um botão 'Continuar'. Defina a posição (ordem)...") (quiz/19.29.53)
- Card de página especial: badge de posição decimal "5.5", título "Você não está sozinho nessa jornada!" (quiz/19.29.53)
- Badges do card: "Tem copy/texto", "Botão: 'Continuar'", "Tem imagem", "Padrão do quiz" (quiz/19.29.53)
- Texto de preview/copy entre aspas: "2.184 alunos como você já transformaram suas vidas com o Desafio Treino Trinca..." (quiz/19.29.53)
- Ação disponível: apenas ícone de lápis (editar), sem excluir (quiz/19.29.53)

**Sub-tab "Página de Fim":**
- Título "Páginas de Fim" com descrição "Organize cada página em uma aba e use o link da aba nos botões." (quiz/19.29.57)
- Botões "+ Nova aba", "Duplicar", "Excluir" (quiz/19.29.57)
- Sistema de sub-abas de páginas de fim, cada uma com nome + rota: "Upsell" (/quiz-vsl?page=upsell), "Downsell" (/quiz-vsl?page=downsell), "Upsell-app" (/upsell-app), "Downsell-app" (/downsell-app) (quiz/19.29.57)
- Faixa informativa "Link da aba selecionada: /quiz-vsl?page=upsell" (quiz/19.29.57)
- Bloco de aviso "Links publicados corretos que o usuário vai acessar": "Upsell para o usuário" (URL completa), "Downsell para o usuário" (URL completa), nota de rodapé sobre usar exatamente os links publicados (quiz/19.29.57)
- Bloco "Configuração da aba": campo "Nome da aba" (quiz/19.30.02); campo "Link da aba" (quiz/19.30.02)
- Bloco "URL DO VÍDEO VSL": campo com placeholder de URL (YouTube/Panda/Vimeo) + texto de ajuda "Pode deixar vazio se usar HTML personalizado abaixo." (quiz/19.30.02)
- Bloco "HTML DA VSL": textarea de código HTML/script (quiz/19.30.02, quiz/19.30.25); campo "Largura" (quiz/19.30.02); campo "Altura" (quiz/19.30.02)
- Bloco "Títulos e textos": botão "+ Adicionar" (quiz/19.30.06); item de texto com dropdown "Tipo" (ex. "Título"/"Subtítulo"), ícone de lixeira (excluir bloco), textarea de conteúdo, campo "Cor do texto" (color picker), campo "Tamanho", campo "Peso" (dropdown), campo "Alinhamento" (dropdown) (quiz/19.30.06, quiz/19.30.29)
- Bloco "Botões da página": botão "+ Adicionar" (quiz/19.30.29); por botão — ícone de lixeira (excluir), campo "Texto do botão", campo "URL de destino", campo "Texto abaixo do botão", campo "Fundo" (color picker), campo "Texto" (color picker), campo "Borda" (color picker), campo "Stroke" (numérico), campo "Raio" (numérico), campo "Delay em segundos" (numérico com stepper), campo "Classe do botão / VTurb" (texto), checkbox "Abrir em nova aba" (quiz/19.30.33, quiz/19.30.39)
- Bloco "COMO VAI APARECER PARA O USUÁRIO": botão "Salvar e abrir preview real"; aviso sobre domínio de preview; preview renderizado ao vivo da página (título, subtítulo, imagem/vídeo embutido, imagem de referência, botão CTA renderizado, link secundário renderizado) (quiz/19.30.39, quiz/19.30.42)
- Botão de rodapé fixo "💾 Salvar páginas de fim" (largura total) (quiz/19.30.42)

**Aba "Respostas de Avaliação" — navegação:**
- Sub-tabs internas: "Por Usuário" (ícone pessoas), "Por Pergunta" (ícone balão), "Relatórios" (ícone gráfico) (quiz/19.31.51, quiz/19.31.54, quiz/19.32.26)

**Sub-aba "Por Usuário":**
- Campo de busca "Buscar por nome, e-mail, pergunta ou resposta..." (quiz/19.31.51)
- Botão/dropdown "Filtros" (ícone funil) (quiz/19.31.51)
- Contador "Mostrando 999 de 999" (quiz/19.31.51)
- Linha de resposta por usuário: avatar circular com inicial, e-mail/nome, ícone de status (relógio amarelo = pendente, check verde = completo), badges de perfil (idade, sexo, tag de experiência, ex. "Intermediário" amarelo, "Com dor" vermelho), data/hora, botão "Ver respostas" (outline, ícone de olho) (quiz/19.31.51)
- **Remover** o select "apenas quem terminou o quiz" — redundante, conforme briefing (dado só é enviado no fim do quiz).
- Modal de detalhe do usuário (ao clicar "Ver respostas"): badge de plano no topo (ex. "⚡ TRINCA") (quiz/19.31.58, quiz/19.32.03); nome/e-mail como título + avatar quadrado com inicial (quiz/19.31.58); botão fechar (X) (quiz/19.31.58); 3 sub-abas internas: "Dados" (ativa), "Cargas", "Respostas do Quiz" (quiz/19.31.58, quiz/19.32.03)
  - Badge de status especial no topo do modal (ex. "🚫 REEMBOLSADA"), ao lado do avatar, quando o aluno está em um estado não-padrão (reembolsado, vencendo, sem acesso) — confirmado em prints reais `users/12.08.48` a `12.09.22` (ver `~/Downloads/users/`, 9 prints capturados em 2026-08-11, sem rota/lista de origem visível, só o modal). Gap fechado nesta revisão: não estava mapeado além do "badge de plano no topo" citado acima.
  - Banner de status do protocolo, logo abaixo do header do modal, antes da aba "Dados" renderizar seu conteúdo: quando liberado, banner verde com ícone de check, título "Protocolo Liberado ✓", subtítulo "Disponível para treinar agora", e linha de detalhe com nome do protocolo + dias de treino (ex. "Treino Experiente - Para Crescer e Secar · 3 dias de treino") (`users/12.08.48`). Estado "não liberado" não está nos prints capturados — assumir variante amber/pendente por analogia até confirmação visual. **Gap fechado nesta revisão** — não estava mapeado no Passo 00 original.
  - Aba "Dados" — bloco "CADASTRO": "Nome", "E-mail" (quiz/19.31.58); bloco "PERFIL FÍSICO": "Idade", "Sexo", "Peso", "Altura", "Categoria" (quiz/19.31.58); bloco "ACESSO & GESTÃO": campo "Plano" com 2 botões toggle ("⚡ Liberar Trinca" / "👑 Elite") (quiz/19.31.58, quiz/19.32.03); campo "Cargo" com 4 botões toggle em grid 2x2: "Aluno", "Suporte", "Treinador", "Administrador" (quiz/19.32.03); linhas de valor "Status", "Acesso", "Compra", "Assinatura", "Vencimento", "Dias restantes" (quiz/19.32.03)
  - Bloco "AVALIAÇÃO": "Objetivo", "Nível financeiro", "Avaliação inicial", badge "Não visualizou" (vermelho), "Preferência de treino", "Lema pessoal" (quiz/19.32.08, quiz/19.32.13)
  - Bloco "TREINOS": "Treinos concluídos", badge de frequência (ex. "● Baixa (0%)") (quiz/19.32.08)
  - Bloco "REAVALIAÇÃO": status "Não definido" + link "📅 Definir data de reavaliação" (quiz/19.32.13)
  - Bloco "Alterar senha do aluno": texto explicativo sobre senha criptografada; botões "🔄 Gerar senha temporária" e "📋 Copiar senha"; campos "Nova senha" (com toggle mostrar/ocultar) e "Confirmar nova senha"; botão "🔑 Alterar senha" (quiz/19.32.13)
  - **Aba "Cargas" — feature de captura de dados não mapeada até esta revisão (gap fechado em 2026-08-11 via prints reais `users/12.08.53` e `users/12.09.05`–`12.09.09`).** Até aqui o Passo 00 original só citava o nome da aba na lista de 3 sub-abas, sem detalhar conteúdo. Estrutura confirmada: seção única colapsável "CARGAS" (ícone de peso/kettlebell), com contador "N exercício(s) rastreado(s)" e chevron de expandir/recolher (`users/12.08.53`); ao expandir — estado vazio observado no print: texto central "Nenhuma carga registrada" (`users/12.09.09`); estado populado **não** capturado em print (o aluno de exemplo tinha 0 exercícios rastreados), mas a estrutura da seção implica uma lista de exercícios com a carga mais recente registrada pelo próprio aluno no app (peso/repetições por exercício, ex. "Supino reto com barra — 42,5 kg · 4x10") — inferido por analogia com o padrão de app de treino, **não confirmado em print, sinalizar para validação**. Esta é uma feature de **captura de dados do app** (carga de treino logada pelo aluno), distinta da leitura de respostas de quiz já mapeada — dado que hoje não tem nenhuma tela/rota de admin equivalente documentada em nenhuma página P01–P11 além desta aba do modal.
  - Botão de rodapé fixo "Fechar" (quiz/19.32.13)
  - **Reuso confirmado por implementação (2026-08-11):** este modal de 3 abas (Dados/Cargas/Respostas do Quiz) é o mesmo componente reaberto pela ação "Ver lead" da tabela de ranking de P02 (Usuários) — não é uma tela nova por página. Implementado como composite compartilhado `components/composites/user-detail-modal.tsx` (não previsto na tabela de componentes da Parte 2 original; adicionar linha `user-detail-modal` reaproveitando `entity-edit-modal-shell` + `entity-card` + `toggle-button-group` na próxima revisão da Parte 2).

**Sub-aba "Por Pergunta":**
- 4 cards de métrica: "Total de perguntas" (22), "Única escolha" (7), "Múltipla escolha" (9), "Texto livre" (3) (quiz/19.32.26)
- Campo de busca "Buscar pergunta..." (quiz/19.32.26)
- Dropdown filtro "Todos os tipos" (quiz/19.32.26)
- Lista de perguntas: número sequencial, texto, badge de tipo colorido por categoria, contador de respondentes (ícone pessoas + número), seta "&gt;" de navegação (quiz/19.32.26)
- Detalhe de pergunta selecionada (drill-down): botão voltar "←", label "Pergunta N", título da pergunta, subtítulo "N respostas coletadas" (quiz/19.32.33)
- Card "Distribuição": gráfico de pizza/donut com fatias por opção, rótulos percentuais externos, tooltip ao hover (ex. "Homem : 967") (quiz/19.32.33)
- Card "Contagem por opção": lista com nome da opção + valor absoluto + percentual + barra de progresso horizontal por opção (quiz/19.32.33)
- Campo de busca "Buscar por usuário ou resposta..." + dropdown "Todos" + contador de respostas (quiz/19.32.33)
- Lista expansível de respostas por opção: cartão colapsável (bolinha de cor, nome da opção, badge "X aluno(s)", percentual, barra de progresso, chevron de expandir) — esta é a "lista expandida à direita em respostas dinâmicas (campo livre)" citada no briefing, e o toggle de "limitar a exibição às top 5 opções" citado no briefing (não visível diretamente nos prints cobertos, mas decorrente da estrutura de contagem por opção) (quiz/19.32.33)

**Sub-aba "Relatórios" (dentro de Avaliação):**
- Sub-sub-abas: "📊 Visão Geral" (ativa), "💬 Quiz Inicial", "🔄 Relatório da Avaliação" (quiz/19.32.44)

  *Visão Geral:*
  - Card de introdução "📊 Resumo completo do quiz" (texto descritivo) (quiz/19.32.44)
  - 8 cards de métrica (KPI tiles): "Iniciaram" 1038; "Concluíram" 843 (81% conclusão); "Desistiram" 195; "Tempo médio" 13s/pergunta; "Respostas rastreadas" 2395; "Responderam suplementos" 0; "Quiz completo no cadastro" 721 (de 1000 usuários no app); "Compras aprovadas" 957 (quiz/19.32.44, quiz/19.32.51)
  - Card "Pergunta que mais demora": pergunta destacada + "Tempo médio: 34s" (quiz/19.32.51)
  - Card "Perfil financeiro": barras horizontais por faixa de gasto com valor absoluto + percentual (quiz/19.32.51, quiz/19.33.18)
  - Card "Uso de suplementos": estado vazio "Ainda não há respostas sobre suplementos." (quiz/19.32.51, quiz/19.33.18)
  - Card "Objetivos dos alunos": barras horizontais por objetivo (quiz/19.33.18)
  - Card "Experiência declarada": barras horizontais (iniciante/experiente) (quiz/19.33.18)
  - Card "Planos dos usuários": barras horizontais (ELITE/TRINCA) (quiz/19.33.18, quiz/19.33.33)
  - Card "Últimas respostas recebidas": lista com e-mail, contador de respostas, badge de status textual ("Incompleto"/"Concluído"), timestamp ISO (quiz/19.33.33)
  - Print de transição de navegação (sidebar mostra item "Sugestões" já ativo, mas o conteúdo renderizado ainda é a lista "Últimas respostas recebidas" do relatório de Avaliação, capturado no meio da troca de rota para `/admin/suggestions`) — sem elemento funcional novo além dos já listados acima (quiz/19.33.41)

  *Quiz Inicial:*
  - Barra de filtro por período: campo "Filtrar por e-mail...", botões "Tudo" (selecionado), "7 dias", "30 dias", "90 dias", "Personalizado" (quiz/19.34.06)
  - 5 cards de métrica: "Iniciaram" 117; "Completaram" 64; "Desistiram" 53; "Taxa conclusão" 54.7%; "Tempo médio/pergunta" 13s (quiz/19.34.06)
  - Gráfico de barras "📉 Onde as pessoas desistiram" por pergunta (eixo X com labels q1, q2, q4...) (quiz/19.34.06)
  - Seção "Análise por Pergunta" com aviso "⚠️ Pergunta em vermelho = maior abandono" (quiz/19.34.13)
  - Card de pergunta (numerado, incl. sub-índices decimais como "13.5"/"14.2"): badge de tipo (single_choice/number/multiple_choice/text), contador "X responderam", percentual "Y% chegaram", tempo médio (ícone relógio), barra de progresso na base, chevron de expandir; card com maior abandono ganha badge de alerta vermelho "⚠ N desistiram aqui" e borda vermelha (quiz/19.34.13, quiz/19.34.22, quiz/19.34.29, quiz/19.34.33)

  *Relatório da Avaliação (reavaliação):*
  - Mesmo filtro de período + botão adicional "🔄 Atualizar" (quiz/19.35.18, quiz/19.35.42)
  - Estado vazio central (ícone de gráfico + mensagem "Nenhuma resposta de reavaliação ainda...") (quiz/19.35.18)
  - 4 cards de métrica zerados: "Reavaliações", "Alunos avaliados", "Respostas totais", "Média por aluno" (quiz/19.35.18)
  - Contador "👥 0 reavaliação(ões) no filtro" (quiz/19.35.18, quiz/19.35.42)
  - Card de pergunta expansível com 2 sub-abas internas: "Estatísticas" (ativa) e "👥 Respostas individuais (0)" (quiz/19.35.47)
  - Dentro de "Estatísticas": 3 mini-cards ("Responderam", "Taxa chegada", "Respostas") + mensagem "Nenhuma resposta registrada" (quiz/19.35.47, quiz/19.35.54)

### P06 — Relatórios

- Header: título "Relatórios" (H1) + subtítulo "Análise completa do sistema" (reports/19.48.28)
- Navegação por 4 abas (pill/segmented): Visão Geral, Usuários, Avaliações, Sugestões (reports/19.48.28)
- Bottom navigation bar fixa (mobile): Dashboard, Usuários, Protocolos, Exercícios, "Mais" (reports/19.48.28)

**Aba Visão Geral:**
- Card "Total alunos" — 51867 (reports/19.48.28)
- Card "Avaliação média" — 6.0★ (reports/19.48.28)
- Card "Freq. média" — 1.2% (reports/19.48.28)
- Card "Sugestões" — 16 (reports/19.48.28)
- Card "Elite" — 2468 (reports/19.48.28)
- Card "Trinca" — 48710 (reports/19.48.28)
- Card "Objetivos": gráfico de barras horizontais (eixo X 0–40000), categorias "crescer_e_secar" (~38000), "secar_muito" (~4000), "Crescer e Secar" (~3500), "Ganhar massa mu[scular]" (quase nula), "Crescer" (quase nula) — nota: rótulos duplicados/não normalizados observados no print (reports/19.48.33)
- Card "Distribuição de Sexo": gráfico de pizza/donut cheio com leader lines — "Homens: 3459", "Mulheres: 190" (reports/19.48.33)

**Aba Usuários:**
- Card "Homens" — 3459 (reports/19.49.07)
- Card "Mulheres" — 190 (reports/19.49.07)
- Card "Idade média" — 40.8 anos (reports/19.49.07)
- Card "Freq. média" — 1.2% (reports/19.49.07)
- Card "Faixas etárias": gráfico de barras verticais (eixo Y 0–60000), 5 faixas: "13-20", "21-30", "31-40", "41-50", "51+"; tooltip interativo ao hover (card flutuante com "Alunos: N") (reports/19.49.11)
- Card "Categorias de Alunos": lista com label + barra de progresso horizontal + valor absoluto à direita — itens: "advanced" (1), "Muito acima do peso" (96), "Médio" (110), "Magro(a) com barriga" (63), "Acima do peso" (200), "Muito magro(a)" (1), "Magro(a)" (20), "Musculoso(a)" (5), "Definição" (1), "Emagrecimento Adulto" (1) (reports/19.49.11)

**Aba Avaliações:**
- Card "Total avaliações" — 200 (reports/19.49.16)
- Card "Média geral" — 6.0★ (reports/19.49.16)
- Card "Feedbacks negativos" — 0 (reports/19.49.16)
- Card "Positivos (4-5★)" — 200 (reports/19.49.16)
- Card "Distribuição de notas": gráfico de barras verticais, eixo X de 1★ a 10★ (reports/19.49.16, reports/19.49.20)
- Card "Feedbacks negativos (nota < 3)": estado vazio "Nenhum feedback negativo" (reports/19.49.20)
- Card "Notas por treino": lista treino → nota média (★) + contagem de avaliações — "Treino 1" 6.0★ (121); "Treino 2" 5.9★ (38); "Treino 3" 5.8★ (41) (reports/19.49.20)

**Aba Sugestões:**
- Card "Total" — 16 (reports/19.49.26)
- Card "Novas" — 16 (reports/19.49.26)
- Card "Implementadas" — 0 (reports/19.49.26)
- Lista de cards de sugestão: nome do autor + e-mail; badge de status atual (ex. "Nova"); **select/dropdown editável de classificação** (nova/revisada/implementada) ao lado do badge; corpo do texto da sugestão (reports/19.49.26, reports/19.49.30)

### P07 — Conquistas

- Header: título "Conquistas" + subtítulo "Crie e gerencie conquistas exclusivas para alunos Elite." (conquistas/20.04.56)
- Botão primário "+ Nova conquista" (conquistas/20.04.56)
- Card informativo fixo (ícone de coroa): "Conquistas disponíveis apenas para o Elite" (conquistas/20.04.56)
- Card "Modelos Elite" (badge coroa): título "Conquistas premium de alta performance" + texto + botão "Adicionar modelos" — visível na tela, **sem ação real hoje; não implementar** (conquistas/20.04.56)
- Form "Nova conquista" (com link "Fechar" no canto): campo "Nome da conquista"; campo multi-linha "Descrição motivacional"; campo/select de badge de plano (valor "Elite"); dropdown "tipo de métrica" (valor exibido no print: "Total de treinos concluídos" — validar nome exato com usuário, ver briefing 07.6); campo numérico de valor inicial/alvo (valor "1"); campo numérico de XP concedido (valor "100"); botão "Salvar conquista" (conquistas/20.04.56)
- Lista de conquistas existentes em grid 2 colunas, cada card: ícone de coroa, título, badge "+N XP", descrição, linha de métrica com label + "Meta: N", ações editar (lápis) e excluir (lixeira) (conquistas/20.05.01)
- Conquistas listadas: "Elite: Primeiro passo premium" (+250 XP, métrica "Total de treinos concluídos", Meta: 1); "Parabéns!" (+150 XP, métrica "Dias desde o primeiro treino", Meta: 7); "Primeiro treino concluído" (+100 XP, métrica "Total de treinos concluídos", Meta: 1); "Elite: Consistência azul" (+500 XP, métrica "Total de treinos concluídos", Meta: 5); "Sequência de 5 treinos" (+250 XP, métrica "Total de treinos concluídos", Meta: 5); "Elite: Frequência premium" (+700 XP, métrica "Frequência da semana (dias treinados)") (conquistas/20.05.01)

### P08 — Banners

- Header "Banners" com texto explicativo: "Configure quantos banners quiser por plano. Eles giram automaticamente a cada 10 segundos e o link é opcional." (banners/20.16.53)
- Botão "+ Adicionar" (banners/20.16.53)
- Card de banner: imagem de fundo/artwork, título, URL/rota de destino, badge de plano ("👑 ELITE" / "⚡ TRINCA"), badge de status "Ativo"/"Inativo" (verde/outro), ícones editar (lápis) e excluir (lixeira) (banners/20.16.53)
- Exemplos observados: "Banner Elite exemplo" (link "https://www.instagram.com/", plano ELITE, Ativo); "Banner Trinca exemplo" (artwork com CTA embutido "Toque aqui para entrar", rota "/upsell-app?src=upsell-banner", plano TRINCA, Ativo) (banners/20.16.53)
- Modal "Editar banner": botão fechar (X) (banners/20.16.58); campo "Imagem do banner" com preview + botão "Escolher imagem" (upload) (banners/20.16.58); campo de texto com URL da imagem (banners/20.16.58); campo "Título interno" (banners/20.16.58); campo "Link ao clicar (opcional)" (ícone de link) (banners/20.16.58); select "Aparece para" (valor "Plano Elite") (banners/20.16.58, banners/20.17.01); campo numérico "Ordem" (banners/20.16.58, banners/20.17.01); select "Status" (valor "Ativo") (banners/20.17.01); botão "💾 Salvar banner" (banners/20.17.01)
- Regra de negócio (validação, não visual mas parte da feature): não permitir duas imagens ativas no mesmo plano + mesma ordem; se não houver banner ativo para um plano, não renderizar nada no app (do briefing, seção 04/P08).

### P09 — Regras

- Header "Regras" com contador "5 regras cadastradas · 5 ativas" (classification/20.25.09)
- Botão "+ Nova Regra" (classification/20.25.09)
- Card explicativo "Como funciona o sistema de regras" com 3 itens numerados (avaliação em ordem de prioridade; primeira regra que bater define o nível; regras Override forçam o resultado) (classification/20.25.09)
- Navegação em 3 abas: "☰ Regras" (badge "5"), "🧪 Testador", "📖 Campos disponíveis" (classification/20.25.09)

**Aba Regras:**
- Card de regra: seta de prioridade (↑/↓), número de prioridade, nome da regra, badge opcional "⚠ OVERRIDE" (vermelho, borda lateral vermelha no card), linha de condição `campo = operador = "valor"`, seta de resultado (→) com badge de nível, descrição textual, toggle ativo/inativo, ícones editar/excluir (classification/20.25.09, classification/20.25.15)
- Regras observadas: "Iniciante por Experiência" (prioridade 1, `experiencia = igual a "iniciante"` → Iniciante); "Forçar Iniciante — Idade 55+" (Override, prioridade 2, `idade >= "55"` → Iniciante); "Forçar Iniciante — Dor ou Lesão" (Override, prioridade 10, `dor_saude = igual a "Sim"` → Iniciante); "Intermediário por Experiência" (prioridade 20, `experiencia = igual a "intermediario"` → Intermediário) (classification/20.25.09, classification/20.25.15)

**Aba Testador:**
- Título "Testar Regras" + texto "Simule o perfil de um usuário e veja qual regra seria aplicada..." (classification/20.25.24)
- Seção "PERFIS DE TESTE RÁPIDO": botões de perfil pré-definido — "Iniciante, 25 anos", "Intermediário, 30 anos", "Avançado, 35 anos", "Sênior 60 anos (deve forçar iniciante)", "Com dor/lesão (deve forçar iniciante)" (classification/20.25.24)
- Seção "OU PREENCHA MANUALMENTE": 8 campos de input — "Gênero (q1)", "Idade (q2)", "Experiência (q6)", "Treinando? (q7)", "Objetivo (q10)", "Urgência (q14)", "Gasto mensal (q15)", "Dor/Saúde (q21)" (classification/20.25.24)
- Botão "Testar Classificação" (classification/20.25.24)

**Aba Campos disponíveis:**
- Título "Campos disponíveis nas regras" + texto de ajuda (classification/20.25.30)
- Tabela com colunas "CAMPO", "PERGUNTA NO QUIZ", "VALORES ACEITOS" (classification/20.25.30)
- Linhas: `experiencia` (Q6, "iniciante · intermediario · avancado"); `idade` (Q2, "ex: 18, 25, 55 — use operadores >= ou <="); `dor_saude` (Q21, "Sim · Não"); `treinando` (Q7, "Sim · Não"); `objetivo` (Q10, "Crescer · Secar Muito · Crescer e Secar"); `urgencia` (Q14, "Muito alta · Alta · Média · Normal"); `gasto_mensal` (Q15, "Até R$ 500 · R$ 500 – R$ 1.000 · Acima de R$ 3.000"); `genero` (Q1, "Homem · Mulher") (classification/20.25.30)

### P10 — Liberar usuário

- Header "Liberar e editar usuário" + subtítulo "Crie acessos manuais ou ajuste plano, tempo de Elite e protocolo de alunos existentes" (regras/20.55.35)
- Card informativo (ícone de escudo): "Criação e ajuste manual de alunos" — "Novos alunos entram com a senha padrão 12345. No Elite, informe os dias restantes para o vencimento seguir o fluxo normal do app." (regras/20.55.35)
- Coluna "Criar usuário" (subtítulo "Para alunos que ainda não existem no app."): campo "E-MAIL DO ALUNO"; select "PLANO" (valor "Trinca"); botão "👤+ Criar e liberar" (regras/20.55.35)
- Coluna "Editar usuário" (subtítulo "Ajuste plano, dias de Elite e protocolo do aluno."): campo de busca por e-mail + botão de lupa (regras/20.55.35)
- Não capturado no print (aparece só após busca, sinalizar para Passo 01): campos de plano/dias restantes Elite/protocolo do resultado da busca em "Editar usuário".

### P11 — Configurações

- Header "Configurações" + subtítulo "Configurações gerais do sistema" (settings/20.54.22)
- Seção "Informações do App": campo "Nome do app" (valor "Treino Trinca") (settings/20.54.22)
- Seção "Funil, produtos e Elite": campo "ID(s) do produto Treino Trinca" (multi-valor, separado por vírgula) (settings/20.54.22); campo "ID(s) do produto Trinca Elite" (multi-valor) (settings/20.54.22); campo "Link de upgrade para o Elite" + texto de ajuda "Usado no botão 'Conhecer o Elite' dentro do app." (settings/20.54.22); campo numérico "Validade Trinca (dias)" (valor 365) (settings/20.54.22); campo numérico "Validade Elite (dias)" (valor 90) (settings/20.54.22); campo "Link de renovação Trinca" (settings/20.54.22); campo "Link de renovação Elite" (settings/20.54.29)
- Seção "Suporte": campo "Link de suporte" + texto de ajuda "Esse link será usado no botão de suporte do aplicativo." (settings/20.54.29); campo "WhatsApp de suporte (opcional)" (settings/20.54.29); campo "E-mail de suporte (opcional)" (settings/20.54.29); botão "💾 Salvar configurações" (settings/20.54.29)
- Seção "Prazo de Reavaliação" (subtítulo "Define o intervalo padrão; cada aluno mantém sua própria contagem individual."): campo numérico "Prazo global de reavaliação (em dias)" (valor 45) + texto de ajuda; botão "Aplicar" ao lado do campo; texto de status com ícone de check verde "Último prazo global aplicado em 14/05/2026, 02:11 (45 dias)" (settings/20.54.29)

---

## Parte 2 — Componentes atômicos e moleculares novos

Convenção do dashboard (não do app): `atoms/` = irredutível/reaproveitável em
qualquer contexto; `composites/` = 2+ átomos com responsabilidade coesa
(equivalente ao "molecule" do app). Base já existente auditada:

- **Atoms**: `badge`, `button`, `card`, `chart`, `input`, `progress`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `table`, `tabs`, `tooltip`
- **Composites**: `app-shell`, `app-sidebar`, `chart-card`, `data-grid`, `date-range-calendar`, `filter-bar`, `metric-card`, `protected-route`

| # | Componente (kebab-case) | Camada | Página(s) | Print de referência | Feature(s) da Parte 1 | Reaproveita / Novo | Props mínimas observáveis |
|---|---|---|---|---|---|---|---|
| 1 | `stat-tile` | composites | P01, P05, P06 | `reports/19.48.28`, `quiz/19.32.44` | Cards de métrica com ícone + label caixa-alta + valor grande + descrição (KPI tiles de Relatórios/Visão Geral do Quiz) | Reaproveita `composites/metric-card.tsx` como base (adiciona variant com ícone colorido e descrição) | `label`, `value`, `icon`, `tone` ('blue'\|'green'\|'red'\|'amber'\|'purple'), `description?` |
| 2 | `progress-list-item` | atoms | P03, P04, P06 (Categorias de Alunos, Objetivos, Faixa etária), P05 (Contagem por opção) | `reports/19.49.11`, `quiz/19.32.33` | Linha label + barra de progresso horizontal + valor absoluto/percentual à direita | Reaproveita `atoms/progress.tsx` (compõe label+valor ao redor) | `label`, `value`, `percent`, `color?` |
| 3 | `donut-chart-card` | composites | P06, P05 (Distribuição de Sexo, Distribuição por opção) | `reports/19.48.33`, `quiz/19.32.33` | Gráfico de pizza/donut com leader lines/tooltip e legenda percentual | Reaproveita `composites/chart-card.tsx` + `atoms/chart.tsx` (Recharts) | `data: {label, value, color}[]`, `title` |
| 4 | `bar-chart-card` | composites | P06, P05 | `reports/19.48.33`, `quiz/19.34.06` | Gráficos de barras horizontais/verticais com tooltip de hover | Reaproveita `composites/chart-card.tsx` + `atoms/chart.tsx` | `data`, `orientation` ('horizontal'\|'vertical'), `title` |
| 5 | `entity-card` | composites | P03 (protocolo), P04 (exercício), P07 (conquista), P08 (banner) | `workouts/18.51.39`, `exercises/19.19.40`, `conquistas/20.05.01`, `banners/20.16.53` | Card com nome/título, badges, metadados, e ações editar/excluir/expandir/copiar/liberar alinhadas à direita | Reaproveita `atoms/card.tsx` + `atoms/badge.tsx` + `atoms/button.tsx` (compõe slot de ações) | `title`, `badges?`, `metadata?`, `actions: {icon, onClick, variant}[]`, `expandable?` |
| 6 | `entity-list-header` | composites | P02, P03, P04, P07, P08, P09, P10 | `exercises/19.19.40`, `workouts/18.51.39` | Cabeçalho de página/lista: título + contador + botões de ação primária/secundária (Novo protocolo, Novo Exercício, Nova conquista, Nova Regra, etc.) | Reaproveita `atoms/button.tsx` (compõe título+contador+slot de botões) | `title`, `count?`, `actions: {label, icon, variant}[]` |
| 7 | `category-pill-filter` | composites | P04 (categorias de exercício) | `exercises/19.19.40` | Filtro de categoria em pills horizontais, uma ativa | Reaproveita `atoms/badge.tsx` (variant clicável) | `options: string[]`, `active`, `onChange` |
| 8 | `search-input` | atoms | P02, P03, P04, P05, P09 | `exercises/19.19.40`, `workouts/18.58.34` | Campo de busca full-width com ícone de lupa, com variante "busca exige valor exato" (ex. e-mail) | Reaproveita `atoms/input.tsx` (adiciona ícone de lupa) | `placeholder`, `value`, `onChange`, `onSearch?` |
| 9 | `entity-edit-modal-shell` | composites | P03, P04, P08 | `workouts/18.52.27`, `exercises/19.19.49`, `banners/20.16.58` | Estrutura comum de modal de edição: header com ícone+título+subtítulo+fechar, corpo em seções, rodapé com Cancelar/Salvar | Reaproveita `atoms/sheet.tsx` (ou `atoms/card.tsx` como base de modal) | `title`, `description?`, `onClose`, `footer` (slot) |
| 10 | `wizard-tabs` | composites | P03 (Editar protocolo — 2 etapas) | `workouts/18.52.27` | Navegação por abas numeradas dentro de modal, com mini-cards de resumo acima | Reaproveita `atoms/tabs.tsx` | `steps: {label, icon}[]`, `active`, `summary?: {label, value}[]` |
| 11 | `reorderable-list-item` | composites | P03 (exercícios de um treino) | `workouts/18.53.13` | Item de lista com drag-handle, número sequencial, nome, metadados, excluir, expandir | Reaproveita `atoms/card.tsx` + `atoms/button.tsx` | `order`, `title`, `metadata?`, `onRemove`, `onExpand?`, `draggable?` |
| 12 | `video-link-field` | composites | P03 (vídeo do exercício), P04 (vídeo demonstrativo) | `workouts/18.53.35`, `exercises/19.19.49` | Campo de URL de vídeo + botão de upload tracejado + preview embutido do player + botão remover | Reaproveita `atoms/input.tsx` + `atoms/button.tsx` | `url?`, `onUpload`, `onRemove`, `previewEmbedUrl?` |
| 13 | `dropzone-button` | atoms | P03, P04, P08 | `workouts/18.53.06`, `exercises/19.19.49`, `banners/20.16.58` | Botão tracejado de upload/troca de arquivo (imagem/vídeo) | Novo (não existe primitiva de upload hoje) | `label`, `onFileSelect`, `accept?` |
| 14 | `toggle-button-group` | atoms | P05 (Plano, Cargo no modal de usuário) | `quiz/19.31.58`, `quiz/19.32.03` | Grupo de botões seletores mutuamente exclusivos (estilo segmented) para campos de plano/cargo | Novo (distinto de `atoms/tabs.tsx`, que é navegação, não seleção de valor de formulário) | `options: {label, value, icon?}[]`, `value`, `onChange`, `columns?` |
| 15 | `stepper-input` | atoms | P03 (Frequência semanal, Séries, Delay em segundos) | `workouts/18.52.34` | Input numérico com botões +/- (stepper) | Reaproveita `atoms/input.tsx` (adiciona botões incremento/decremento) | `value`, `min?`, `max?`, `step?`, `onChange` |
| 16 | `color-picker-field` | atoms | P05 (Cor do texto, Fundo, Texto, Borda do botão) | `quiz/19.30.06`, `quiz/19.30.33` | Campo de seleção de cor com label | Novo | `label`, `value`, `onChange` |
| 17 | `linked-entity-search-list` | composites | P03 (buscar exercício cadastrado) | `workouts/18.53.24` | Campo de busca + lista de resultados agrupados por categoria, para vincular/trocar entidade de um catálogo | Reaproveita `search-input` (novo, item 8) + `atoms/badge.tsx` | `query`, `onQueryChange`, `groups: {label, items: {id, label}[]}[]`, `onSelect` |
| 18 | `status-icon` | atoms | P05 (Por Usuário: pendente/completo), P03 (Com protocolo/Sem protocolo/Pendente) | `quiz/19.31.51`, `workouts/18.58.34` | Ícone de status colorido (relógio amarelo = pendente, check verde = completo/ativo, cadeado azul = bloqueado) | Novo (variant simples sobre lucide-react, sem estado próprio de design system hoje) | `status: 'pending'\|'done'\|'locked'\|'warning'`, `size?` |
| 19 | `plan-badge` | atoms | P03, P05, P10 (badges "ELITE"/"TRINCA") | `workouts/18.58.40`, `quiz/19.31.58` | Badge de plano com ícone (coroa Elite, raio Trinca) e cor própria por plano | Reaproveita `atoms/badge.tsx` (variant fixo "elite"/"trinca") | `plan: 'elite'\|'trinca'` |
| 20 | `override-rule-card` | composites | P09 (Regras) | `classification/20.25.09` | Card de regra com prioridade, condição `campo = operador = valor`, resultado, badge Override, toggle ativo/inativo, editar/excluir | Reaproveita `entity-card` (novo, item 5) + `atoms/badge.tsx` | `priority`, `condition`, `result`, `override?`, `active`, `onToggleActive`, `onEdit`, `onDelete` |
| 21 | `two-column-form-layout` | composites | P10 (Criar usuário / Editar usuário) | `regras/20.55.35` | Layout de duas colunas lado a lado, cada uma com subtítulo + form próprio | Reaproveita `atoms/card.tsx` (layout grid) | `left: {title, children}`, `right: {title, children}` |
| 22 | `apply-value-card` | composites | P02 (Prazo de avaliação global), P11 (Prazo global de reavaliação) | `settings/20.54.29` | Card com campo numérico + botão "Aplicar" + texto de status da última aplicação | Reaproveita `atoms/input.tsx` + `atoms/button.tsx` | `label`, `value`, `onChange`, `onApply`, `lastAppliedText?` |
| 23 | `field-reference-table` | composites | P09 (Campos disponíveis) | `classification/20.25.30` | Tabela read-only de referência (campo, pergunta, valores aceitos) | Reaproveita `atoms/table.tsx` | `columns: string[]`, `rows: Record<string,string>[]` |
| 24 | `quick-profile-button-grid` | composites | P09 (Testador — perfis de teste rápido) | `classification/20.25.24` | Grid de botões de preset que preenchem um formulário de simulação | Reaproveita `atoms/button.tsx` | `profiles: {label, values}[]`, `onSelect` |
| 25 | `empty-state` | atoms | P04, P05 (Uso de suplementos, Relatório da Avaliação), P06 (Feedbacks negativos) | `quiz/19.32.51`, `reports/19.49.20`, `quiz/19.35.18` | Bloco central com ícone + mensagem para card/lista sem dados | Novo (não existe hoje; usado em pelo menos 4 pontos distintos) | `icon?`, `message` |
| 26 | `period-filter-bar` | composites | P05 (Relatórios internos — Quiz Inicial / Relatório da Avaliação) | `quiz/19.34.06` | Barra com campo de filtro por e-mail + botões de intervalo (Tudo/7/30/90 dias/Personalizado) + botão Atualizar opcional | Reaproveita `composites/filter-bar.tsx` (adiciona variant de botões de período) | `emailFilter`, `onEmailFilterChange`, `range`, `onRangeChange`, `onRefresh?` |
| 27 | `drilldown-question-card` | composites | P05 (Por Pergunta, Quiz Inicial — Análise por Pergunta) | `quiz/19.32.26`, `quiz/19.34.13` | Card de pergunta expansível com métricas de responderam/chegaram/tempo médio, barra de progresso e alerta de abandono | Reaproveita `entity-card` (novo, item 5) + `progress-list-item` (novo, item 2) | `index`, `question`, `type`, `respondedCount`, `arrivalPercent`, `avgTime?`, `alert?` |
| 28 | `dual-toggle-panel` | atoms | P05 (Cargo, Plano — grid 2x2/2x1 de seleção) | `quiz/19.32.03` | Especialização de `toggle-button-group` (item 14) em grid 2x2 — **decisão: não criar como componente separado, cobrir via prop `columns` de `toggle-button-group`** | — | — |
| 29 | `user-detail-modal` | composites | P02 (ação "Ver lead" do ranking), P05 (ação "Ver respostas" — implementação ainda pendente) | `users/12.08.48`–`12.09.22` | Modal de detalhe do usuário com 3 abas (Dados/Cargas/Respostas do Quiz), banner de status do protocolo, blocos Cadastro/Perfil físico/Acesso & Gestão/Avaliação/Treinos/Reavaliação/Alterar senha, e a aba "Cargas" (captura de dados de carga de treino, ver Parte 1) | Reaproveita `entity-edit-modal-shell` + `entity-card` (aba Cargas, expandable) + `toggle-button-group` (Plano/Cargo) + `empty-state` — **adicionado em 2026-08-11**, componente único compartilhado entre P02 e P05 em vez de duas implementações separadas | `user: UserDetail`, `canEdit?`, `onClose` |

**Notas de fechamento (sem sobras dos dois lados):**
- Elementos recorrentes que já têm componente 1:1 e **não** geram linha nova: badges de status/plano simples usam `atoms/badge.tsx` diretamente (exceto `plan-badge`, que fixa variant de ícone+cor por ser padrão visual repetido em 3+ pontos); abas de navegação usam `atoms/tabs.tsx` diretamente; inputs de texto simples (sem stepper/upload/color-picker) usam `atoms/input.tsx` diretamente; dropdowns/selects simples usam `atoms/select.tsx` diretamente; checkboxes usam padrão nativo (não há um `atoms/checkbox` hoje — sinalizar para Passo 01 se o design system do dashboard não tiver checkbox, já que P05 usa "Abrir em nova aba"); tabelas de dados paginadas (P03 aba Treinos, P05 Por Usuário) reaproveitam `composites/data-grid.tsx` diretamente; filtros com múltiplos campos (P02, P03 aba Treinos) reaproveitam `composites/filter-bar.tsx` diretamente.
- Linha 28 é intencionalmente resolvida como prop de `toggle-button-group` (item 14), não como componente novo — evita duplicar dois componentes quase idênticos.
