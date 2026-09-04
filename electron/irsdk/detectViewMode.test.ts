import type { SessionData } from "@irsdk-node/types";
import { SessionState } from "@irsdk-node/types";
import { detectViewMode } from "./detectViewMode";

const REPLAY_SESSION = {
  WeekendInfo: { SimMode: "replay" },
} as SessionData;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function run(): void {
  assert(
    detectViewMode(
      {
        SessionState: SessionState.Warmup,
        IsOnTrackCar: true,
        IsGarageVisible: false,
        PlayerCarIdx: 0,
      },
      true,
    ) === "racing",
    "grille / warmup immobile → course",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.GetInCar,
        IsOnTrackCar: false,
        IsOnTrack: false,
        IsGarageVisible: false,
        PlayerCarIdx: 0,
        CarIdxOnPitRoad: [true],
      },
      true,
    ) === "garage",
    "attente stands avant piste → garage",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.ParadeLaps,
        IsOnTrackCar: true,
        IsGarageVisible: false,
        PlayerCarIdx: 0,
        Speed: 25,
      },
      true,
    ) === "racing",
    "parade laps en piste → course",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.Warmup,
        IsOnTrackCar: true,
        IsGarageVisible: false,
        PlayerCarIdx: 0,
        Speed: 30,
      },
      true,
    ) === "racing",
    "warmup en mouvement sur piste → course",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.Racing,
        IsOnTrackCar: true,
        IsGarageVisible: false,
        PlayerCarIdx: 0,
      },
      true,
    ) === "racing",
    "session racing on track → course",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.Racing,
        IsOnTrackCar: true,
        IsGarageVisible: true,
        PlayerCarIdx: 0,
      },
      true,
    ) === "garage",
    "menu garage iRacing → garage ATH",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.GetInCar,
        IsOnTrackCar: false,
        PlayerCarIdx: 0,
      },
      true,
    ) === "garage",
    "get in car → garage",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.Racing,
        IsOnTrackCar: true,
        IsGarageVisible: false,
        PlayerCarIdx: 0,
      },
      true,
      REPLAY_SESSION,
    ) === "garage",
    "fichier replay (.rpy) → garage ATH",
  );

  assert(
    detectViewMode(
      {
        SessionState: SessionState.Racing,
        IsOnTrackCar: true,
        IsReplayPlaying: true,
        PlayerCarIdx: 0,
      },
      true,
    ) === "garage",
    "lecture replay en session → garage ATH",
  );

  console.log("detectViewMode tests OK");
}

run();
