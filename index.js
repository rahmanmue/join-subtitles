const fs = require("node:fs");
const readLine = require("readline");

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getArrayObjectData = (subtitles) => {
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

async function rFile(path) {
  let results = [];

  const sub = fs.createReadStream(path, {
    encoding: "utf-8",
  });

  await sub.forEach((s) => {
    results = getArrayObjectData(s);
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

const mergedSubtitle = (subEnglish, subIndonesia) => {
  return subEnglish.map((subEng) => {
    const startTimeEng = convertToSeconds(subEng.startTime);
    const endTimeEng = convertToSeconds(subEng.endTime);

    const matchSub = subIndonesia.filter((subIndo) => {
      const startTimeInd = convertToSeconds(subIndo.startTime);
      const endTimeInd = convertToSeconds(subIndo.endTime);
      return !(endTimeInd < startTimeEng || startTimeInd > endTimeEng);
    });

    const textIndonesia = matchSub.map((sub) => sub.text).toString();
    const mergedText = [
      `<font size="40"><b>${subEng.text}</b></font>`,
      `<font size="20">${textIndonesia}</font>`,
    ].join("\n");

    const combinedSubtitle = `${subEng.id}\n${subEng.startTime} --> ${subEng.endTime}\n${mergedText}\n`;

    return combinedSubtitle;
  });
};

const createdSubtitileFile = (nameSubtitle, subtitles) => {
  fs.writeFileSync(
    `./subtitle/${nameSubtitle}.srt`,
    subtitles.join("\n\n"),
    "utf-8"
  );

  console.log(
    "Subtitle berhasil digabung dan disimpan sebagai 'merged-subtitle.srt'"
  );
};

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

(async () => {
  try {
    const subEnglish = await askQuestion("Masukan path sub english : ");
    const subtitleEnglish = await rFile(subEnglish);

    const subIndo = await askQuestion("Masukan path sub indo : ");
    const subtitleIndonesia = await rFile(subIndo);

    const mergedSubtitles = mergedSubtitle(subtitleEnglish, subtitleIndonesia);

    let nameSubtitle = await askQuestion("Masukan nama subtitle baru : ");
    if (nameSubtitle === "") nameSubtitle = "merged-subtitle";

    createdSubtitileFile(nameSubtitle.replace(" ", "-"), mergedSubtitles);

    rl.close();
  } catch (error) {
    console.log(error);
  }
})();
