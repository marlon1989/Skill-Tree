import test from "node:test";
import assert from "node:assert/strict";

import {
  createEmptyMasteryHubState,
  freezeMasteryHubForRoot,
  hasMasteryHubForRoot,
  moveMasteryHubPosition,
  normalizeMasteryHubState,
  renameMasteryHubTitle,
  removeMasteryHubForRoot,
  syncMasteryHubsToEligibleRoots,
  upsertMasteryHub,
} from "../../js/domain/mastery-hub-state.js";

test("createEmptyMasteryHubState starts empty", () => {
  assert.deepEqual(createEmptyMasteryHubState(), {
    masteryHubs: [],
    nextMasteryHubId: 1,
  });
});

test("normalizeMasteryHubState keeps valid linked hubs", () => {
  assert.deepEqual(
    normalizeMasteryHubState({
      masteryHubs: [{ id: "mastery_hub_2", linkedRootNodeId: "node_4", placementMode: "auto", x: "18", y: "42" }],
      nextMasteryHubId: 3,
    }),
    {
      masteryHubs: [{ id: "mastery_hub_2", linkedRootNodeId: "node_4", placementMode: "auto", title: "", x: 18, y: 42 }],
      nextMasteryHubId: 3,
    },
  );
});

test("normalizeMasteryHubState drops unlinked legacy hub", () => {
  assert.deepEqual(
    normalizeMasteryHubState({
      masteryHub: { isVisible: true, x: 120, y: 240 },
    }),
    createEmptyMasteryHubState(),
  );
});

test("upsertMasteryHub creates one hub per root and repositions existing one", () => {
  const initialState = createEmptyMasteryHubState();
  const oneHubState = upsertMasteryHub(initialState, "node_1", 80, 120);
  const movedHubState = upsertMasteryHub(oneHubState, "node_1", 140, 200);

  assert.deepEqual(oneHubState, {
    masteryHubs: [{ id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 80, y: 120 }],
    nextMasteryHubId: 2,
  });
  assert.deepEqual(movedHubState, {
    masteryHubs: [{ id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 140, y: 200 }],
    nextMasteryHubId: 2,
  });
});

test("upsertMasteryHub allows many roots", () => {
  const firstHubState = upsertMasteryHub(createEmptyMasteryHubState(), "node_1", 20, 30);
  const secondHubState = upsertMasteryHub(firstHubState, "node_7", 220, 330);

  assert.deepEqual(secondHubState, {
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 20, y: 30 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_7", placementMode: "manual", title: "", x: 220, y: 330 },
    ],
    nextMasteryHubId: 3,
  });
});

test("hasMasteryHubForRoot returns true only for linked root with visible hub", () => {
  assert.equal(hasMasteryHubForRoot({
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 20, y: 30 },
    ],
    nextMasteryHubId: 2,
  }, "node_1"), true);
  assert.equal(hasMasteryHubForRoot({
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 20, y: 30 },
    ],
    nextMasteryHubId: 2,
  }, "node_7"), false);
});

test("hasMasteryHubForRoot ignores empty root ids", () => {
  assert.equal(hasMasteryHubForRoot({
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 20, y: 30 },
    ],
    nextMasteryHubId: 2,
  }, ""), false);
});

test("syncMasteryHubsToEligibleRoots creates one auto hub for each root with child", () => {
  assert.deepEqual(syncMasteryHubsToEligibleRoots(
    createEmptyMasteryHubState(),
    {
      node_1: { id: "node_1", parentId: null },
      node_2: { id: "node_2", parentId: "node_1" },
      node_5: { id: "node_5", parentId: null },
      node_6: { id: "node_6", parentId: "node_5" },
    },
    {
      node_1: ["node_2"],
      node_5: ["node_6"],
    },
  ), {
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "auto", title: "", x: 0, y: 0 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "auto", title: "", x: 0, y: 0 },
    ],
    nextMasteryHubId: 3,
  });
});

test("syncMasteryHubsToEligibleRoots removes hub from root without subtopic and preserves manual hubs", () => {
  assert.deepEqual(syncMasteryHubsToEligibleRoots(
    {
      masteryHubs: [
        { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 20, y: 30 },
        { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "auto", title: "", x: 0, y: 0 },
      ],
      nextMasteryHubId: 3,
    },
    {
      node_1: { id: "node_1", parentId: null },
      node_2: { id: "node_2", parentId: "node_1" },
      node_5: { id: "node_5", parentId: null },
    },
    {
      node_1: ["node_2"],
      node_5: [],
    },
  ), {
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 20, y: 30 },
    ],
    nextMasteryHubId: 3,
  });
});

test("renameMasteryHubTitle updates only chosen hub title", () => {
  assert.deepEqual(renameMasteryHubTitle({
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "auto", title: "", x: 0, y: 0 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "auto", title: "", x: 0, y: 0 },
    ],
    nextMasteryHubId: 3,
  }, "mastery_hub_2", "Geometria Mestre"), {
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "auto", title: "", x: 0, y: 0 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "auto", title: "Geometria Mestre", x: 0, y: 0 },
    ],
    nextMasteryHubId: 3,
  });
});

test("moveMasteryHubPosition moves chosen hub and switches it to manual", () => {
  assert.deepEqual(moveMasteryHubPosition({
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "auto", title: "", x: 0, y: 0 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "auto", title: "", x: 0, y: 0 },
    ],
    nextMasteryHubId: 3,
  }, "mastery_hub_2", 44, 88), {
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "auto", title: "", x: 0, y: 0 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "manual", title: "", x: 44, y: 88 },
    ],
    nextMasteryHubId: 3,
  });
});

test("freezeMasteryHubForRoot freezes only hub linked to dragged root", () => {
  assert.deepEqual(freezeMasteryHubForRoot({
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "auto", title: "", x: 0, y: 0 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "auto", title: "", x: 0, y: 0 },
    ],
    nextMasteryHubId: 3,
  }, "node_1", 120, 160), {
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 120, y: 160 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_5", placementMode: "auto", title: "", x: 0, y: 0 },
    ],
    nextMasteryHubId: 3,
  });
});

test("removeMasteryHubForRoot removes only linked root hub", () => {
  const masteryHubState = {
    masteryHubs: [
      { id: "mastery_hub_1", linkedRootNodeId: "node_1", placementMode: "manual", title: "", x: 20, y: 30 },
      { id: "mastery_hub_2", linkedRootNodeId: "node_7", placementMode: "manual", title: "", x: 220, y: 330 },
    ],
    nextMasteryHubId: 3,
  };

  assert.deepEqual(removeMasteryHubForRoot(masteryHubState, "node_1"), {
    masteryHubs: [
      { id: "mastery_hub_2", linkedRootNodeId: "node_7", placementMode: "manual", title: "", x: 220, y: 330 },
    ],
    nextMasteryHubId: 3,
  });
});
