# Mapa do Projeto

Use este arquivo para apontar rápido o local certo antes de pedir alteração.

## Entrada e HTML

| Funcionalidade | Arquivo |
| --- | --- |
| Estrutura da página, containers, modais, menu de contexto, Tailwind CDN | `index.html` |
| Bootstrap da aplicação e listener de resize | `js/main.js` |
| Scripts npm e comandos de teste | `package.json` |
| Servidor estático simples para smoke tests | `tmp-static-server.cjs` |

## Estado e Regras de Domínio

| Funcionalidade | Arquivo |
| --- | --- |
| API pública de estado, persistência em `localStorage`, migração de customização antiga | `js/state.js` |
| Store principal: criar, deletar, renomear, trocar, progresso, reset, seed inicial | `js/domain/skill-tree-store.js` |
| Modelo de nó: título, status, progresso, layout, conexão | `js/domain/skill-node.js` |
| Hierarquia pai-filho, ordem, traversal e swap entre irmãos | `js/domain/child-hierarchy.js` |
| Coleção de nós e lookup obrigatório | `js/domain/node-collection.js` |
| IDs de nós e sequência `node_N` | `js/domain/node-id.js`, `js/domain/node-sequence.js` |
| Parent root vs parent de nó | `js/domain/parent-id.js` |
| Título, status e progresso tipados | `js/domain/node-title.js`, `js/domain/node-status.js`, `js/domain/progress-value.js`, `js/domain/progress-amount.js` |
| Constantes de status, root key e decay | `js/domain/constants.js` |
| Progresso da root por descendentes dominados | `js/domain/origin-progress-ratio.js` |
| Primeira root criada | `js/domain/root-node-selection.js` |
| Estado dos hubs de maestria | `js/domain/mastery-hub-state.js` |

## Interações

| Funcionalidade | Arquivo |
| --- | --- |
| Wiring geral de eventos: pointer, wheel, click, contexto, boss modal, Escape | `js/interaction.js` |
| Pan e zoom do canvas, grid infinito | `js/interaction/canvas-camera-controller.js` |
| Hold para avançar progresso | `js/interaction/hold-controller.js` |
| Drag de nó e alça de conexão | `js/interaction/layout-drag-controller.js` |
| Ações do menu: criar root/subtópico, renomear, deletar, swap, reset, hub | `js/interaction/context-actions.js` |
| Regra de parent ao criar root a partir de contexto | `js/interaction/context-origin-parent-id.js` |
| Regras para avanço e abertura do boss modal | `js/interaction/node-rules.js` |
| Animação do progresso da root após boss | `js/interaction/origin-progress-animation.js` |
| Som de vitória e fallback de áudio | `js/interaction/audio-victory.js` |

## Render e UI

| Funcionalidade | Arquivo |
| --- | --- |
| Cria snapshot renderizável e chama UI | `js/render.js` |
| Fachada pública de UI: render tree, show/hide modal/menu/hover | `js/ui.js` |
| DOM da aplicação, boss modal, context menu, hover modal | `js/ui/modal-context.js` |
| Layout radial, conexões, nós renderizados, hubs de maestria | `js/ui/tree-layout.js` |
| Snapshot tipado usado pelo layout | `js/ui/tree-snapshot.js` |
| Matemática radial: setores e pontos em órbita | `js/ui/radial-layout-math.js` |
| Câmera pura: zoom clamp, pan, ponto de stage | `js/ui/canvas-camera.js` |
| Cores por branch/root | `js/ui/branch-theme.js` |
| Estado visual de nó e markup de progresso/status | `js/ui/node-visual-state.js` |
| Porcentagem visual do hub de maestria | `js/ui/mastery-hub-progress.js` |
| Geometria de viewport/menu/stage | `js/ui/geometry.js` |
| Wrapper DOM defensivo | `js/ui/dom-element.js` |
| Escape de texto HTML | `js/ui/html-text.js` |
| Tokens de tamanho/layout | `js/ui/layout-tokens.js` |
| Identificador de nó para UI | `js/ui/node-identifier.js` |

## Boss Fight

| Funcionalidade | Arquivo |
| --- | --- |
| Perguntas mockadas, validação de resposta, sucesso/falha, reset para retry | `js/boss.js` |
| Abertura/seleção/confirmação do modal | `js/interaction.js`, `js/ui/modal-context.js` |
| Som de vitória | `assets/sfx/victory.wav`, `js/interaction/audio-victory.js` |

## Testes

| Funcionalidade | Arquivo |
| --- | --- |
| Testes unitários Node | `tests/**/*.test.mjs` |
| Testes de domínio da store e hubs | `tests/domain/*.test.mjs` |
| Testes de interação isolada | `tests/interaction/*.test.mjs` |
| Testes de UI pura | `tests/ui/*.test.mjs` |
| Smoke browser via página dedicada | `browser-smoke.cjs`, `browser-smoke-test.html`, `js/browser-smoke-page.js` |
| Smoke browser direto no app via Edge CDP | `edge-cdp-smoke.cjs` |
| Página smoke direta auxiliar | `browser-smoke-direct.html` |

## Comandos

| Objetivo | Comando |
| --- | --- |
| Testes unitários | `npm test` |
| Smoke browser com página dedicada | `npm run test:browser` |
| Smoke Edge CDP no app real | `npm run test:smoke` |
| Tudo | `npm run test:all` |
| Servir arquivos localmente | `npm run serve:static` |

## Arquivos Gerados ou Pouco Relevantes

| Caminho | Observação |
| --- | --- |
| `.edge-cdp-profile/` | Perfil temporário do Edge/CDP; não usar como código fonte |
| `.edge-test-profile/` | Perfil temporário de smoke tests; não usar como código fonte |
| `server.out.log`, `server.err.log`, `edge-dom.txt`, `browser-smoke-test.screenshot.log` | Logs/saídas temporárias |

## Pedidos Rápidos

| Quando quiser mexer em... | Aponte para... |
| --- | --- |
| Criar/editar/remover nós | `js/state.js`, `js/domain/skill-tree-store.js` |
| Mudar regra de status/progresso | `js/domain/skill-node.js`, `js/domain/skill-tree-store.js` |
| Mudar visual dos nós | `js/ui/node-visual-state.js`, `js/ui/tree-layout.js` |
| Mudar posição/layout da árvore | `js/ui/tree-layout.js`, `js/ui/radial-layout-math.js`, `js/ui/layout-tokens.js` |
| Mudar menu de contexto | `index.html`, `js/interaction/context-actions.js`, `js/ui/modal-context.js` |
| Mudar drag/pan/zoom | `js/interaction/layout-drag-controller.js`, `js/interaction/canvas-camera-controller.js`, `js/ui/canvas-camera.js` |
| Mudar boss/modal/perguntas | `js/boss.js`, `js/ui/modal-context.js` |
| Mudar persistência | `js/state.js`, `js/domain/mastery-hub-state.js` |
| Mudar hubs de maestria | `js/domain/mastery-hub-state.js`, `js/ui/tree-layout.js`, `js/ui/mastery-hub-progress.js` |
| Mudar testes browser | `edge-cdp-smoke.cjs`, `browser-smoke.cjs`, `js/browser-smoke-page.js` |
