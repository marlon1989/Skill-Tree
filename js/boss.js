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
const BOSS_ADVICE = Object.freeze({
  options: [],
  question: "",
  subtitle: "Antes de prosseguir, é recomendável que você tenha tentado se autoexplicar, refletir ou resolver questões desse tópico.",
  title: "Conselho",
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
    ...BOSS_ADVICE,
  };
}

export function handleBossFight(nodeId, selectedAnswer) {
  const bossQuestion = getBossQuestion(nodeId);
  const selectedOption = bossQuestion.options[Number(selectedAnswer)] ?? String(selectedAnswer ?? "");
  const outcome = bossQuestion.options.length === 0
    ? successOutcome()
    : battleOutcome(selectedOption, bossQuestion.correctAnswer);

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
  const originNodeIds = originAncestorIdsOf(nodeId);
  const previousProgressByOrigin = progressByOrigin(originNodeIds);

  markNodeAsMastered(nodeId);
  renderApp();

  if (originNodeIds.length === 0) {
    playVictorySfx();
    return;
  }

  const nextProgressByOrigin = masteredProgressByOrigin(originNodeIds);

  animateOriginProgressions(originNodeIds, previousProgressByOrigin, nextProgressByOrigin, () => {
    originNodeIds.forEach(syncRootProgress);
    renderApp();
    playVictorySfx();
  });
}

function animateOriginProgressions(originNodeIds, previousProgressByOrigin, nextProgressByOrigin, onComplete) {
  let pendingAnimationCount = originNodeIds.length;
  const completeOneAnimation = () => {
    pendingAnimationCount -= 1;
    pendingAnimationCount === 0 && onComplete();
  };

  originNodeIds.forEach((originNodeId) => {
    animateOriginProgress(
      originNodeId,
      previousProgressByOrigin[originNodeId],
      nextProgressByOrigin[originNodeId],
      completeOneAnimation,
    );
  });
}

function progressByOrigin(originNodeIds) {
  return Object.fromEntries(originNodeIds.map((originNodeId) => [
    originNodeId,
    progressOf(originNodeId),
  ]));
}

function masteredProgressByOrigin(originNodeIds) {
  return Object.fromEntries(originNodeIds.map((originNodeId) => [
    originNodeId,
    masteredProgressFor(originNodeId),
  ]));
}

function masteredProgressFor(rootNodeId) {
  return masteredDescendantProgressPercent({
    childIdsOf: (parentNodeId) => state.childIdsByParent[parentNodeId] ?? [],
    isMasteredNodeId: (descendantNodeId) => state.nodesById[descendantNodeId]?.status === NODE_STATUS.MASTERED,
    isOriginNodeId: (descendantNodeId) => state.nodesById[descendantNodeId]?.nodeKind === "origin",
    rootNodeId,
  });
}

function progressOf(nodeId) {
  if (!nodeId) {
    return 0;
  }

  return Number(state.nodesById[nodeId]?.progress ?? 0);
}

function originAncestorIdsOf(nodeId) {
  const originNodeIds = [];
  let currentNode = state.nodesById[nodeId];

  if (!currentNode) {
    return originNodeIds;
  }

  while (currentNode?.parentId !== null && currentNode?.parentId !== undefined) {
    currentNode = state.nodesById[currentNode.parentId];

    if (currentNode?.nodeKind === "origin") {
      originNodeIds.push(currentNode.id);
    }
  }

  return originNodeIds;
}
