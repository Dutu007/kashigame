// Milestone fixtures used only by isolated browser tests.
module.exports = function karezStateAt(i) {
  const st = {
    introDone: false, ladderProblemFound: false,
    materials: { A: false, B: false, C: false },
    ladderWorkshopDone: false, ladderAssembly: null, lampWorkshopDone: false, lampCraft: null,
    craftDone: false, laddersLeft: 0,
    lampOwned: false, lampOn: false,
    wells: [
      { weeds: 3, cleared: false, ladder: false },
      { weeds: 2, cleared: false, ladder: false },
      { weeds: 2, cleared: false, ladder: false },
    ],
    ub: { s0: 0, r1: false, r2: false, r3: false, s1: 0, done: false },
    uc: { p: [null, null, null], rot: [0, 0, 0], done: false, patch: null },
    patchIntroSeen: false, verified: false,
    undergroundVisited: false, uaInspected: false,
    recordSaved: false, chapterComplete: false,
    lastWell: null, sceneId: 'Surface',
  };
  if (i >= 1) st.introDone = true;
  if (i >= 2) { st.wells[0].weeds = 0; st.wells[0].cleared = true; st.ladderProblemFound = true; }
  if (i >= 3) st.materials = { A: true, B: true, C: true };
  if (i >= 4) { st.ladderWorkshopDone = true; st.lampWorkshopDone = true; st.craftDone = true; st.laddersLeft = 3; st.lampOwned = true; }
  if (i >= 5) { st.wells[0].ladder = true; st.laddersLeft = 2; st.undergroundVisited = true; st.uaInspected = true; st.lastWell = 0; st.lampOn = true; }
  if (i >= 6) { st.wells[1].weeds = 0; st.wells[1].cleared = true; st.wells[1].ladder = true; st.laddersLeft = 1; Object.assign(st.ub, { s0: 2, r1: true, r2: true, r3: true, s1: 2, done: true }); st.lastWell = 1; }
  if (i >= 7) { st.wells[2].weeds = 0; st.wells[2].cleared = true; st.wells[2].ladder = true; st.laddersLeft = 0; st.uc.done = true; st.uc.p = [0, 90, 0]; st.uc.rot = [0, 90, 0]; st.patchIntroSeen = true; st.lastWell = 2; }
  if (i >= 8) st.verified = true;
  if (i >= 9) { st.recordSaved = true; st.chapterComplete = true; }
  return st;
};
