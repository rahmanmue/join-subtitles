const readLine = require("readline");
const fs = require("node:fs");

const PATH_OUTPUT_SUBTITLE_FILE = "C:/Users/rman/Videos/Breaking Bad/subtitle";
const PATH_SUB_ENG = "./subtitle/sub-eng.srt";
const PATH_SUB_IND = "./subtitle/sub-indo.srt";

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
        text: rest.toString().replace(",,", " "),
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

    const textIndonesia = matchSubIndo.map((subIndo) => subIndo.text);

    const mergedText = [
      `<font size="40"><b>${subEng.text}</b></font>`,
      textIndonesia.length > 0
        ? `<font size="20">${textIndonesia
            .toString()
            .replaceAll("\n", " ")}</font>`
        : "",
    ].join("\n");

    const combinedSubtitle = `${subEng.id}\n${subEng.startTime} --> ${subEng.endTime}\n${mergedText}\n`;

    return combinedSubtitle;
  });
};

// create new subtitle file
const createdSubtitleFile = (nameSubtitle, subtitles) => {
  fs.writeFileSync(
    `${PATH_OUTPUT_SUBTITLE_FILE}/${nameSubtitle}.srt`,
    subtitles.join("\n\n"),
    "utf-8"
  );

  console.log(
    `Subtitle berhasil disimpan di Direktori ${PATH_OUTPUT_SUBTITLE_FILE}/${nameSubtitle}.srt`
  );
};

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(`${question}\n`, (answer) => {
      resolve(answer.trim());
    });
  });
};

// Main
(async () => {
  try {
    console.log("⚠ Penggunaan Opsi Mengabaikan ⚠ ");
    console.log("Simpan Subtitle di Folder subtitle Dengan nama file");
    console.log("sub-indo.srt dan sub-eng.srt \n");
    console.log("⚠ Enter untuk Mengabaikan ⚠ \n");

    let subEnglish = await askQuestion("Masukan Path Sub[English] :");
    if (subEnglish === "") subEnglish = PATH_SUB_ENG;

    let subIndo = await askQuestion("Masukan Path Sub[Indo] :");
    if (subIndo === "") subIndo = PATH_SUB_IND;

    let nameSubtitle = await askQuestion("Masukan Nama Sub Baru :");
    if (nameSubtitle === "")
      nameSubtitle = `merged-subtitle-${new Date().getTime()}`;

    const subtitleEnglish = await readFile(subEnglish);
    const subtitleIndonesia = await readFile(subIndo);
    const mergedSubtitles = mergeSubtitles(subtitleEnglish, subtitleIndonesia);
    createdSubtitleFile(nameSubtitle.replaceAll(" ", "-"), mergedSubtitles);

    rl.close();
  } catch (error) {
    console.log(error);
  }
})();
