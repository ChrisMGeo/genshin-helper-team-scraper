import { google } from "googleapis";
import { ElementKey, nonTravelerCharacterKeys } from "./consts";
import Fuse from "fuse.js";
import fs from "fs";
const outputName = "GHTCommunityBuilds.json";

interface Build {
  name: string;
  weapons: any[];
  _weaponsText: string;
  artifactSets: any[];
  _artifactSetsText: string;
  artifactMainStats: string;
  artifactSubStats: string;
  talentPriority: string;
  abilityTips: string;
  notes: string;
}
interface Character {
  characterKey: CharacterKey;
  notes: string;
  builds: Build[];
}

const allCharacterKeys = [...nonTravelerCharacterKeys, "Traveler"] as const;
type CharacterKey = typeof allCharacterKeys[number];
type CharacterKeyWOTraveler = typeof nonTravelerCharacterKeys[number];
function complete(commands: readonly string[]) {
  return function(str: string) {
    var i;
    var ret = [];
    for (i = 0; i < commands.length; i++) {
      if (commands[i].indexOf(str) == 0) ret.push(commands[i]);
    }
    return ret;
  };
}
type _currentType = { [key in CharacterKeyWOTraveler]?: Character };
type TravelerType = {
  characterKey: "Traveler";
  elements: { [ele in ElementKey]?: Character };
};
const isTravelerType = (x: any): x is TravelerType =>
  !nonTravelerCharacterKeys.includes(x?.characterKey);
type CurrentType = _currentType & { Traveler?: TravelerType };
let current: CurrentType | undefined = undefined;
try {
  if (fs.existsSync(outputName)) {
    current = JSON.parse(
      fs.readFileSync(outputName, { encoding: "utf8", flag: "r" })
    );
  }
} catch (err) {
  console.log(err);
}

const characterKeyPrompt = require("prompt-sync")({
  autocomplete: complete(allCharacterKeys),
});

function askCharacterKey(
  message: string = "Insert CharacterKey: "
): CharacterKey {
  return askKey<CharacterKey>(allCharacterKeys, message, characterKeyPrompt);
}

function askKey<T extends string>(
  allOfT: readonly string[],
  message: string,
  pr: Function
): T {
  const result: string = pr(message);
  if (allOfT.includes((result as any) ?? "")) {
    return result as T;
  } else {
    return askKey<T>(allOfT, message, pr);
  }
}

async function getData() {
  const options = {
    includeScore: true,
    threshold: 0.3,
  };
  const characterFuse = new Fuse(allCharacterKeys, options);

  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets.readonly",
  });
  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: "v4", auth: client });
  // const spreadsheetId = process.env.SPREADSHEETID;
  const spreadsheetId = "1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI";
  let sheetNames = [
    "Pyro ",
    "Electro ",
    "Hydro ",
    "Cryo ",
    "Anemo ",
    "Geo ",
    "Dendro",
  ];
  let jsonData: CurrentType = {};
  const bRowRanges: string[] = sheetNames.map(
    (sheetName) => `${sheetName}!B:B`
  );
  const bRows = await googleSheets.spreadsheets.values.batchGet({
    auth,
    spreadsheetId,
    ranges: bRowRanges,
  });
  const valueRanges = bRows.data.valueRanges;
  let characterRanges: [number, number][][] = [];
  if (valueRanges !== undefined) {
    for (let i = 0; i < valueRanges.length; i++) {
      characterRanges.push([]);
      const bRow = valueRanges[i].values;
      let last_j = 0;
      if (bRow !== undefined && bRow !== null) {
        for (let j = 0; j < bRow.length; j++) {
          const cell: string = bRow[j][0];
          if (cell !== undefined && cell !== null) {
            if (!cell.toLowerCase().includes("notes")) {
              last_j = j;
            } else {
              characterRanges[i].push([last_j, j]);
            }
          }
        }
      }
    }
  }
  const allSheetData = await googleSheets.spreadsheets.values.batchGet({
    auth,
    spreadsheetId,
    ranges: sheetNames,
  });
  const allMergesRes = await googleSheets.spreadsheets.get({
    spreadsheetId,
    ranges: sheetNames,
    fields: "sheets(merges)",
  });
  const allMerges = allMergesRes.data.sheets?.map((sheet) => sheet.merges);
  const allSheetValueRanges = allSheetData.data.valueRanges;
  if (
    allSheetValueRanges !== undefined &&
    allSheetValueRanges !== null &&
    allMerges &&
    allMerges.length > 0
  ) {
    for (let sheetNo = 0; sheetNo < allSheetValueRanges.length; sheetNo++) {
      const sheet = allSheetValueRanges[sheetNo].values;
      const merges = allMerges[sheetNo];
      if (
        merges &&
        merges.length > 0 &&
        sheet !== undefined &&
        sheet !== null
      ) {
        merges.forEach(
          ({
            startRowIndex,
            endRowIndex,
            startColumnIndex,
            endColumnIndex,
          }) => {
            if (
              startRowIndex &&
              startColumnIndex &&
              endRowIndex &&
              endColumnIndex
            ) {
              const v = sheet[startRowIndex][startColumnIndex];
              for (let r = startRowIndex; r < endRowIndex; r++) {
                for (let c = startColumnIndex; c < endColumnIndex; c++) {
                  sheet[r][c] = v;
                }
              }
            }
          }
        );
        characterRanges[sheetNo].forEach((range: [number, number]) => {
          const [top, bottom] = range;
          const viewName = sheet[top][1].replaceAll("\n", " ").trim();
          const result = characterFuse.search(viewName.replaceAll(" ", ""));
          let characterKey: CharacterKey | "" =
            result.length !== 0 ? result[0].item : "";
          if (characterKey === "") {
            characterKey = askCharacterKey(
              `Insert CharacterKey for ${viewName}: `
            );
          }
          const currentCharacter: Character | TravelerType | undefined =
            current !== undefined ? current?.[characterKey] : undefined;
          const element: ElementKey = sheetNames[sheetNo]
            .replaceAll(" ", "")
            .toLowerCase() as ElementKey;

          const notes = sheet[bottom][8];
          let builds = [];
          const currentBuilds = isTravelerType(currentCharacter)
            ? currentCharacter?.elements?.[element]?.builds
            : currentCharacter?.builds;
          const currentNotes = isTravelerType(currentCharacter)
            ? currentCharacter?.elements?.[element]?.notes
            : currentCharacter?.notes;
          for (let buildNo = top + 2; buildNo < bottom; buildNo++) {
            const bName = sheet[buildNo][2].replaceAll("\n", " ").trim() || "";
            const currentBuild =
              currentBuilds === undefined
                ? undefined
                : currentBuilds.find((b) => b.name === bName);

            const _weaponsText: string = sheet[buildNo][3] || "";
            const wDifferent =
              currentBuild?._weaponsText !== _weaponsText ||
              (currentNotes !== undefined && currentNotes !== notes);
            if (wDifferent)
              console.log(
                `Weapons Changed for ${characterKey} ${element} ${bName}
                ${JSON.stringify(currentBuild?.weapons)}`
              );
            const _artifactSetsText = sheet[buildNo][4] || "";
            const aDifferent =
              currentBuild?._artifactSetsText !== _artifactSetsText ||
              (currentNotes !== undefined && currentNotes !== notes);
            if (aDifferent)
              console.log(
                `Artifacts Changed for ${characterKey} ${element} ${bName}
                ${JSON.stringify(currentBuild?.artifactSets)}`
              );
            const artifactMainStats = sheet[buildNo][5] || "";
            const artifactSubStats = sheet[buildNo][6] || "";
            const talentPriority = sheet[buildNo][7] || "";
            const abilityTips = sheet[buildNo][8] || "";
            const build: Build = {
              name: bName,
              weapons: wDifferent ? [] : (currentBuild as Build).weapons,
              _weaponsText,
              artifactSets: aDifferent
                ? []
                : (currentBuild as Build).artifactSets,
              _artifactSetsText,
              artifactMainStats,
              artifactSubStats,
              talentPriority,
              abilityTips,
              notes: "",
            };
            builds.push(build);
          }
          const character: Character = {
            characterKey,
            notes,
            builds,
          };
          // console.log(character);
          if (characterKey === "Traveler") {
            jsonData.Traveler =
              jsonData.Traveler ||
              ({ characterKey: "Traveler", elements: {} } as TravelerType);
            jsonData.Traveler.elements[element] = character;
          } else {
            jsonData[characterKey] = character;
          }
          // jsonData.characters.push(character);
        });
      }
    }
  }
  console.log(Object.keys(jsonData));
  fs.writeFile(outputName, JSON.stringify(jsonData, null, 4), (error) => {
    if (error) throw error;
  });
}

getData();
