const readLine = require("readline");
const fs = require("node:fs");

// Contoh penggunaan:
// const subtitleEngCth = [
//     { index: 1, startTime: "00:01:09,262", endTime: "00:01:12,807", text: "Oh, my God. Christ!" },
//     { index: 2, startTime: "00:01:16,018", endTime: "00:01:18,688", text: "Shit." },
//   ];

//   const subtitleIndCth = [
//     { index: 1, startTime: "00:01:09,151", endTime: "00:01:11,028", text: "Oh, Tuhan." },
//     { index: 2, startTime: "00:01:11,195", endTime: "00:01:12,780", text: "Sial!" },
//     { index: 3, startTime: "00:01:15,992", endTime: "00:01:17,827", text: "Berengsek." },
//   ];

// 1
// 00:01:09,262 --> 00:01:12,807
// Oh, my God. Christ!
// Oh, Tuhan.
// Sial!

// 2
// 00:01:16,018 --> 00:01:18,688
// Shit.
// Berengsek.

// const DEFAULT_PATH_OUTPUT_SUB = "C:/Users/rman/Videos/Breaking Bad/subtitle";
const DEFAULT_PATH_OUTPUT_SUB = "./subtitle";

// Input Output
const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Parse Subtitles
const parseSubtitle = (subtitles) => {
  const filterSubs = subtitles.replaceAll("\r", "");
  const arrObjData = filterSubs
    .split("\n\n")
    .map((subtitle) => {
      const parts = subtitle.split("\n");
      if (parts.length < 3) return null;
      const [id, time, ...rest] = parts;
      return {
        id: id,
        startTime: time?.split(" --> ")[0],
        endTime: time?.split(" --> ")[1],
        text: rest.join(" "),
      };
    })
    .filter((sub) => sub !== null);

  return arrObjData;
};

// Read file stream
async function readFile(path) {
  let results = [];

  const sub = fs.createReadStream(path, {
    encoding: "utf-8",
  });

  await sub.forEach((s) => {
    results = parseSubtitle(s);
  });

  return results;
}

const convertToSeconds = (time) => {
  const [h, m, s] = time.split(":");
  const [sec, ms] = s.split(",");

  return (
    parseInt(h) * 3600 +
    parseInt(m) * 60 +
    (parseInt(sec) + parseInt(ms) / 1000)
  );
};

// Merge 2 Subtitles
const mergeSubtitles = (subEnglish, subIndonesia) => {
  return subEnglish.map((subEng) => {
    const startTimeEng = convertToSeconds(subEng.startTime);
    const endTimeEng = convertToSeconds(subEng.endTime);

    const matchSubIndo = subIndonesia.filter((subIndo) => {
      const startTimeInd = convertToSeconds(subIndo.startTime);
      const endTimeInd = convertToSeconds(subIndo.endTime);
      return !(startTimeInd > endTimeEng || startTimeEng > endTimeInd);
    });

    const lastTextIndo = matchSubIndo.at(-1)?.text?.replaceAll("\n", " ");

    const mergedText = [
      `<font size="40"><b>${subEng.text}</b></font>`,
      lastTextIndo && `<font size="20">${lastTextIndo}</font>`,
    ]
      .filter(Boolean)
      .join("\n");

    const combinedSubtitle = `${subEng.id}\n${subEng.startTime} --> ${subEng.endTime}\n${mergedText}\n`;

    return combinedSubtitle;
  });
};

// create new subtitle file
const createdSubtitleFile = (nameSubtitle, subtitles, pathOutput) => {
  const path = pathOutput !== null ? pathOutput : DEFAULT_PATH_OUTPUT_SUB;

  fs.writeFileSync(
    `${path}/${nameSubtitle}.srt`,
    subtitles.join("\n\n"),
    "utf-8"
  );

  console.log(
    `Berhasil Disimpan di Direktori ${path} dengan nama '${nameSubtitle}.srt'`
  );
};

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(`${question}\n`, (answer) => {
      resolve(answer.trim());
    });
  });
};

async function getSubtitlePaths(folderPath = null) {
  if (folderPath) {
    return {
      subEng: `${folderPath}/sub-eng.srt`,
      subIndo: `${folderPath}/sub-indo.srt`,
    };
  } else {
    return {
      subEng: await askQuestion("Masukan Path Sub[English]: "),
      subIndo: await askQuestion("Masukan Path Sub[Indo]: "),
    };
  }
}

async function processSubtitle(subtitlePaths, folderPath = null) {
  let nameSubtitle = await askQuestion(
    "[Enter untuk mengabaikan] Masukan Nama Sub Baru: "
  );

  if (!nameSubtitle) {
    nameSubtitle = `merged-subtitle-${Date.now()}`;
  }

  const subtitleEnglish = await readFile(subtitlePaths.subEng);
  const subtitleIndonesia = await readFile(subtitlePaths.subIndo);
  const mergedSubtitles = mergeSubtitles(subtitleEnglish, subtitleIndonesia);

  createdSubtitleFile(
    nameSubtitle.replaceAll(" ", "-"),
    mergedSubtitles,
    folderPath || null
  );
}

// Main
(async () => {
  try {
    console.log("Pilih Opsi ");
    console.log("1. Input Path Folder nya Saja");
    console.log("2. Input Path Dari File Subtitle");

    const choice = await askQuestion("Masukan Pilihan (1 atau 2)");

    if (choice === "1") {
      console.log("Pastikan didalam folder tersebut terdapat 2 File");
      console.log("- sub-indo.srt\n- sub-eng.srt\n");

      const folderPath = await askQuestion("Masukan Path Folder Sub :");
      const subtitlePaths = await getSubtitlePaths(folderPath);

      await processSubtitle(subtitlePaths, folderPath);
    } else if (choice === "2") {
      const subtitlePaths = await getSubtitlePaths();

      await processSubtitle(subtitlePaths);
    } else {
      console.log("Pilihan tidak valid! Silakan masukkan 1 atau 2.");
    }

    rl.close();
  } catch (error) {
    console.log(error);
  }
})();
