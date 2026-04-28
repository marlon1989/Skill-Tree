import { masteredDescendantProgressPercent } from "./domain/origin-progress-ratio.js";
import { getNode, markNodeAsMastered, NODE_STATUS, resetNodeForRetry, state, syncRootProgress } from "./state.js";
import { animateOriginProgress } from "./interaction/origin-progress-animation.js";
import { playVictorySfx } from "./interaction.js";
import { renderApp } from "./render.js";
import { hideBossModal } from "./ui.js";

const DEFAULT_BOSS_QUESTION = Object.freeze({
  correctAnswer: "4",
  options: ["3", "4", "5"],
  question: "Quanto é 2 + 2?",
});

const BOSS_QUESTION_MOCK = Object.freeze({
  "matematica basica": {
    correctAnswer: "10",
    options: ["8", "10", "12"],
    question: "Quantos lados têm dois quadrados juntos, sem sobreposição?",
  },
  node_1: {
    correctAnswer: "10",
    options: ["8", "10", "12"],
    question: "Quantos lados têm dois quadrados juntos, sem sobreposição?",
  },
  node_2: {
    correctAnswer: "4",
    options: ["3", "4", "5"],
    question: "Quanto é 2 + 2?",
  },
  node_3: {
    correctAnswer: "3",
    options: ["2", "3", "4"],
    question: "Quanto é 7 - 4?",
  },
  soma: {
    correctAnswer: "4",
    options: ["3", "4", "5"],
    question: "Quanto é 2 + 2?",
  },
  subtracao: {
    correctAnswer: "3",
    options: ["2", "3", "4"],
    question: "Quanto é 7 - 4?",
  },
});

export function getBossQuestion(nodeId) {
  const node = getNode(nodeId);
  const question = questionFor(node);

  return {
    ...question,
    subtitle: `Responda corretamente para dominar "${node.title}".`,
    title: `Prova de Mestre · ${node.title}`,
  };
}

export function handleBossFight(nodeId, selectedAnswer) {
  const bossQuestion = getBossQuestion(nodeId);
  const selectedOption = bossQuestion.options[Number(selectedAnswer)] ?? String(selectedAnswer ?? "");
  const outcome = battleOutcome(selectedOption, bossQuestion.correctAnswer);

  hideBossModal();
  applyBattleOutcome(nodeId, outcome);

  return {
    isCorrect: outcome.isCorrect,
    node: getNode(nodeId),
  };
}

function applyBattleOutcome(nodeId, outcome) {
  outcome.persist(nodeId);
}

function battleOutcome(selectedOption, correctAnswer) {
  const isCorrect = normalizeKey(selectedOption) === normalizeKey(correctAnswer);

  return outcomeFor(isCorrect);
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function outcomeFor(isCorrect) {
  return isCorrect ? successOutcome() : failedOutcome();
}

function questionFor(node) {
  return questionCandidatesFor(node).find(hasQuestion) ?? DEFAULT_BOSS_QUESTION;
}

function questionCandidatesFor(node) {
  return [
    BOSS_QUESTION_MOCK[node.id],
    BOSS_QUESTION_MOCK[normalizeKey(node.title)],
  ];
}

function hasQuestion(question) {
  return Boolean(question);
}

function failedOutcome() {
  return {
    isCorrect: false,
    persist: (nodeId) => {
      resetNodeForRetry(nodeId, 90);
      renderApp();
    },
  };
}

function successOutcome() {
  return {
    isCorrect: true,
    persist: (nodeId) => persistSuccessfulBattle(nodeId),
  };
}

function persistSuccessfulBattle(nodeId) {
  const rootNodeId = rootAncestorIdOf(nodeId);
  const previousRootProgress = progressOf(rootNodeId);

  markNodeAsMastered(nodeId);
  renderApp();

  if (!rootNodeId) {
    playVictorySfx();
    return;
  }

  const nextRootProgress = masteredProgressFor(rootNodeId);

  animateOriginProgress(rootNodeId, previousRootProgress, nextRootProgress, () => {
    syncRootProgress(rootNodeId);
    renderApp();
    playVictorySfx();
  });
}

function masteredProgressFor(rootNodeId) {
  return masteredDescendantProgressPercent(
    descendantIdsOf(rootNodeId),
    (descendantNodeId) => state.nodesById[descendantNodeId]?.status === NODE_STATUS.MASTERED,
  );
}

function descendantIdsOf(rootNodeId) {
  const descendantNodeIds = [];

  const visitChildren = (parentNodeId) => {
    (state.childIdsByParent[parentNodeId] ?? []).forEach((childNodeId) => {
      descendantNodeIds.push(childNodeId);
      visitChildren(childNodeId);
    });
  };

  visitChildren(rootNodeId);

  return descendantNodeIds;
}

function progressOf(nodeId) {
  if (!nodeId) {
    return 0;
  }

  return Number(state.nodesById[nodeId]?.progress ?? 0);
}

function rootAncestorIdOf(nodeId) {
  let currentNode = state.nodesById[nodeId];
  let currentNodeId = nodeId;

  if (!currentNode) {
    return "";
  }

  while (currentNode.parentId !== null) {
    currentNodeId = currentNode.parentId;
    currentNode = state.nodesById[currentNodeId];
  }

  return currentNodeId === nodeId ? "" : currentNodeId;
}
