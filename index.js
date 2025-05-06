const readLine = require("readline");
const fs = require("node:fs");

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

    const matchSub = subIndonesia.filter((subIndo) => {
      const startTimeInd = convertToSeconds(subIndo.startTime);
      const endTimeInd = convertToSeconds(subIndo.endTime);
      return !(endTimeInd < startTimeEng || startTimeInd > endTimeEng);
    });

    const textIndonesia = matchSub.map((sub) => sub.text);
    const mergedText = [
      `<font size="40"><b>${subEng.text}</b></font>`,
      `<font size="20">${textIndonesia}</font>`,
    ].join("\n");

    const combinedSubtitle = `${subEng.id}\n${subEng.startTime} --> ${subEng.endTime}\n${mergedText}\n`;

    return combinedSubtitle;
  });
};

// create new subtitle file
const createdSubtitleFile = (nameSubtitle, subtitles) => {
  fs.writeFileSync(
    `./subtitle/${nameSubtitle}.srt`,
    subtitles.join("\n\n"),
    "utf-8"
  );

  console.log(
    `Subtitle berhasil digabung dan disimpan sebagai '${nameSubtitle}.srt'`
  );
};

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

// Main
(async () => {
  try {
    const subEnglish = await askQuestion("Masukan Path Sub[English] : ");
    const subtitleEnglish = await readFile(subEnglish);

    const subIndo = await askQuestion("Masukan Path Sub[Indo] : ");
    const subtitleIndonesia = await readFile(subIndo);

    const mergedSubtitles = mergeSubtitles(subtitleEnglish, subtitleIndonesia);

    let nameSubtitle = await askQuestion("Masukan Nama Subtitle Baru : ");
    if (nameSubtitle === "") nameSubtitle = "merged-subtitle";

    createdSubtitleFile(nameSubtitle.replace(" ", "-"), mergedSubtitles);

    rl.close();
  } catch (error) {
    console.log(error);
  }
})();
