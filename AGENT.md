# AGENT.md

## Objetivo do projeto

Este projeto implementa uma `Skill Tree` interativa em JavaScript puro, com foco em:

- progressão por hold do mouse
- prova de mestre (`boss`) para concluir nós
- progresso do nó de origem baseado nos filhos
- customização visual da árvore via drag
- persistência completa em `localStorage`

O estado atual do produto já incorpora várias decisões de UX e regras de negócio que não devem ser perdidas.

---

## Regras de negócio atuais

### 1. Nó de origem

- Nó de origem (`root`) **não avança no hold**.
- O progresso do root é calculado pela proporção de **filhos diretos dominados**.
- A atualização do root **não acontece durante o hold do filho**.
- O root só sincroniza o progresso **após a vitória na prova de mestre** do filho.
- A animação dessa subida do root deve ser suave.

### 2. Prova de mestre (`boss`)

- Quando um nó comum chega a `100`, ele entra em estado `pendente`.
- Nesse estado, o usuário pode abrir o modal de boss.
- Ao acertar:
  - o nó vira `dominado`
  - o root correspondente é sincronizado depois
  - a animação visual do root toca nesse momento
- Ao errar:
  - o nó entra em retry com progresso reduzido

### 3. Reset de progresso do root

- No menu de contexto, um root possui a ação `Resetar Progresso`.
- Essa ação reseta:
  - o root
  - todos os descendentes da árvore daquele root
- Isso foi escolhido para evitar que o root “reconstrua” o progresso imediatamente a partir de filhos já dominados.

### 4. Layout da árvore

- A árvore cresce **verticalmente**, de baixo para cima.
- O nó pai/root funciona como base visual.
- Filhos ficam acima.

### 5. Customização visual

- O usuário pode arrastar:
  - o nó, por uma alça abaixo dele
  - a curvatura da conexão, por uma alça no meio da linha
- Isso serve para deixar a árvore menos rígida e mais orgânica.

### 6. Hover modal

- Nome e status do nó **não ficam mais visíveis no card**.
- Essas informações aparecem apenas no hover modal.

### 7. Visual do estado pendente de boss

- O marcador de boss usa apenas `!` centralizado.
- O texto `Boss` foi removido por legibilidade.

---

## Persistência

### Estado salvo

O app persiste o snapshot completo em:

- `localStorage["skill-tree.state"]`

Isso inclui:

- `nodesById`
- `childIdsByParent`
- `nextId`
- título
- status
- progresso
- offsets de layout dos nós
- offsets de curvatura das conexões

### Compatibilidade legada

O projeto já teve persistência antiga apenas para customização visual:

- `localStorage["skill-tree.visual-customization"]`

Hoje, se essa chave antiga existir, ela é migrada para o snapshot novo.

### Arquivo principal da persistência

- `js/state.js`

Esse arquivo é a camada pública de estado do app.

---

## Arquitetura atual

### Entrada principal

- `js/main.js`

Inicializa:

- interações
- render
- resize

### Estado e store

- `js/state.js`
- `js/domain/skill-tree-store.js`

Responsabilidades:

- expor operações públicas do app
- sincronizar store -> estado público
- persistir snapshot
- restaurar snapshot salvo

### Domínio

Arquivos importantes:

- `js/domain/skill-node.js`
- `js/domain/node-collection.js`
- `js/domain/child-hierarchy.js`
- `js/domain/node-sequence.js`
- `js/domain/node-status.js`

Esses arquivos modelam:

- nós
- hierarquia
- ids
- status
- reconstrução de snapshot salvo

### Interação

- `js/interaction.js`
- `js/interaction/hold-controller.js`
- `js/interaction/context-actions.js`
- `js/interaction/layout-drag-controller.js`
- `js/interaction/node-rules.js`
- `js/boss.js`

### UI / render

- `js/render.js`
- `js/ui/tree-layout.js`
- `js/ui/tree-snapshot.js`
- `js/ui/node-visual-state.js`
- `js/ui/modal-context.js`
- `js/ui.js`

---

## Arquivos-chave por assunto

### Progresso do root

- `js/boss.js`
- `js/domain/skill-tree-store.js`
- `js/interaction/origin-progress-animation.js`

### Drag de nós e linhas

- `js/interaction/layout-drag-controller.js`
- `js/ui/tree-layout.js`
- `js/ui/tree-snapshot.js`

### Menu de contexto

- `js/interaction/context-actions.js`
- `js/ui/modal-context.js`
- `js/interaction.js`

### Boss modal

- `js/boss.js`
- `js/ui/modal-context.js`
- `index.html`

### Persistência

- `js/state.js`

---

## Regressões já encontradas no projeto

### 1. Root stale após adicionar/deletar subtópicos

Problema histórico:

- o root podia ficar com progresso antigo depois de mudanças estruturais

Correção aplicada:

- mudanças estruturais precisam sincronizar roots de forma consistente

### 2. Sincronização global apagando root dominado

Problema histórico:

- roots dominados ou promovidos a root perdiam progresso ao recalcular

Correção aplicada:

- roots já `dominado` e roots sem filhos não devem ter o progresso próprio apagado

### 3. Primeira animação do root brusca

Problema histórico:

- primeira animação de subida do root entrava seca

Correção aplicada:

- entrada visual suavizada

### 4. Boss marker ilegível

Problema histórico:

- texto `Boss` pequeno demais

Correção aplicada:

- substituir por `!` centralizado

---

## Convenções visuais atuais

- Fundo sem grid cinza pesado.
- Nós mais destacados que o background.
- Root com tamanho ajustado para:
  - externo: `40`
  - núcleo interno: `30`

Esses tamanhos vivem nos tokens de layout:

- `js/ui/layout-tokens.js`

---

## Teste e validação

### Smoke test principal

Arquivo:

- `edge-cdp-smoke.cjs`

Esse teste cobre:

- render inicial
- hover modal
- drag de nó
- drag de conexão
- root não avança no hold
- filho avança no hold
- root sobe após boss
- persistência após reload
- persistência do estado da árvore após reload

### Como rodar

```powershell
npm run test:smoke
```

Observação:

- o teste usa Edge headless via CDP
- normalmente precisa permissão para abrir o navegador fora do sandbox

### Smoke test no navegador visível

Arquivo:

- `browser-smoke.cjs`

Como rodar:

```powershell
npm run test:browser
```

Esse comando:

- sobe servidor HTTP local para evitar quirks de `file://`
- abre Edge visível com flags anti-throttling
- carrega `browser-smoke-test.html`
- limpa o `localStorage` do app antes de validar o fluxo

### Compatibilidade antiga

- `browser-smoke-direct.html` ficou apenas como redirecionamento.
- Motivo: evitar drift entre harness legado e fluxo real coberto por `browser-smoke-test.html`.

### Scripts oficiais

Comandos previsíveis do projeto:

```powershell
npm test
npm run test:all
npm run test:browser
npm run test:smoke
```

Mapeamento:

- `npm test` roda testes unitários via Node.
- `npm run test:all` roda unitários + browser visível + smoke headless.
- `npm run test:browser` roda smoke visível no navegador.
- `npm run test:smoke` roda smoke headless via CDP.

---

## Cuidados ao mexer no código

### Se alterar o fluxo de progresso

Conferir sempre:

- root não sobe no hold
- root só sobe após boss correto
- root continua correto após adicionar/deletar nós
- roots dominados não perdem progresso em reestruturação

### Se alterar layout/render

Conferir sempre:

- drag de nó continua funcionando
- drag da linha continua funcionando
- handles continuam clicáveis
- hover modal continua aparecendo

### Se alterar persistência

Conferir sempre:

- reload mantém layout customizado
- reload mantém progresso/status
- `nextId` continua consistente
- snapshots antigos não quebram o boot

### Se alterar o boss

Conferir sempre:

- nó vai para `pendente` ao chegar em 100
- modal abre
- acerto domina o nó
- root sincroniza depois
- erro de resposta mantém retry saudável

---

## Estado inicial esperado

Árvore seeded por padrão:

- `Matemática Básica` (root)
- `Soma`
- `Subtração`

Esse seed nasce no store:

- `js/domain/skill-tree-store.js`

---

## Próximos passos razoáveis

Itens que fazem sentido no futuro:

- ação de `Limpar dados salvos`
- testes automatizados unitários para regras de store
- persistência/exportação com versão de schema
- agrupamento visual mais orgânico por parent

---

## Resumo curto para futuros agentes

Se você cair neste projeto depois:

1. Leia `js/state.js`, `js/boss.js` e `js/domain/skill-tree-store.js`.
2. Entenda que o root depende de filhos dominados e não de hold direto.
3. Rode `npm run test:smoke` antes de concluir mudanças sensíveis.
4. Preserve a persistência em `localStorage["skill-tree.state"]`.
5. Não reintroduza texto visível nos nós para nome/status; isso fica no hover modal.
