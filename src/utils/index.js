import WORDS from "./VOCAB.json";

export function countdownIn24Hours(targetUTCMillis) {
  const currentTime = Date.now();
  const endOfDay = targetUTCMillis + 24 * 60 * 60 * 1000;

  const remainingTime = endOfDay - currentTime;

  return remainingTime;
}

export function convertMilliseconds(ms) {
  const absTime = Math.abs(ms);
  const hours = Math.floor(absTime / (1000 * 60 * 60));
  const minutes = Math.floor((absTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absTime % (1000 * 60)) / 1000);

  return {
    hours: ms >= 0 ? hours : -hours,
    minutes: ms >= 0 ? minutes : -minutes,
    seconds: ms >= 0 ? seconds : -seconds,
  };
}

function generateWordArr(day, offset = 0) {
  let totalWords = [];
  for (let dayIndex in PLAN) {
    if (dayIndex - offset > day) {
      break;
    }
    const words = PLAN[dayIndex];
    totalWords = [...totalWords, ...words];
  }
  return totalWords;
}

export function calculateNewWords(day) {
  let totalWords = generateWordArr(day);
  const wordSet = new Set(totalWords);
  return wordSet.size;
}

export function calculateAccuracy(a, day) {
  let totalWords = generateWordArr(day, -1);
  return (totalWords.length * 4) / a;
}

export function isEncountered(day, word) {
  let totalWords = generateWordArr(day - 1).map(
    (e) => getWordByIndex(WORDS, parseInt(e)).word,
  );
  return totalWords.includes(word);
}

export function calcLevel(day) {
  let totalWords = generateWordArr(day, -1);
  let d = {};
  for (let word of totalWords) {
    d[word] = (d?.[word] || 0) + 1;
  }
  let avgLevel = Object.keys(d).reduce(
    (acc, curr) => {
      return { num: acc.num + 1, total: acc.total + d[curr] };
    },
    { total: 0, num: 0 },
  );
  return avgLevel.total / avgLevel.num;
}

export function shuffle(arr) {
  let array = [...arr];
  let currentIndex = array.length;

  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export function getWordByIndex(wordsDict, index) {
  const keys = Object.keys(wordsDict);
  const word = keys[index];
  const definition = wordsDict[word];

  return { word, definition };
}

export function generateDynamicSpacedRepetitionSchedule(
  totalWords,
  maxNewPerDay = 3,
  maxReviewsPerDay = 10,
) {
  const intervals = [1, 3, 7, 14, 30, 60, 120, 240];
  const schedule = {};
  let day = 1;
  let nextWordIndex = 0;
  let learningQueue = [];

  const MAX_DAYS = 500;

  while (true) {
    if (day > MAX_DAYS) {
      console.warn("Stopped early due to hitting MAX_DAYS");
      break;
    }

    const today = [];

    let reviewsToday = learningQueue.filter(
      (entry) => entry.nextReview === day,
    );
    let reviewCount = reviewsToday.length;

    if (reviewCount === 0 && learningQueue.length > 0) {
      const futureReviews = learningQueue
        .filter((entry) => entry.nextReview > day)
        .sort((a, b) => a.nextReview - b.nextReview);

      const slotsAvailable = maxReviewsPerDay - reviewCount;
      const toPull = futureReviews.slice(0, slotsAvailable);

      for (const entry of toPull) {
        entry.nextReview = day;
        reviewsToday.push(entry);
        reviewCount++;
      }
    }

    for (const entry of reviewsToday) {
      today.push(entry.wordIndex);
    }

    if (reviewCount <= maxReviewsPerDay && nextWordIndex < totalWords) {
      let newWordsToday = 0;
      while (
        newWordsToday < maxNewPerDay &&
        nextWordIndex < totalWords &&
        reviewCount < maxReviewsPerDay
      ) {
        const wordIndex = nextWordIndex++;
        today.push(wordIndex);
        learningQueue.push({
          wordIndex,
          nextReview: day + intervals[0],
          intervalIndex: 0,
        });
        newWordsToday++;
        reviewCount++;
      }
    }

    schedule[day] = today;

    learningQueue = learningQueue
      .map((entry) => {
        if (entry.nextReview === day) {
          if (entry.intervalIndex < intervals.length - 1) {
            return {
              ...entry,
              nextReview: day + intervals[entry.intervalIndex + 1],
              intervalIndex: entry.intervalIndex + 1,
            };
          } else {
            return null;
          }
        }
        return entry;
      })
      .filter(Boolean);

    if (nextWordIndex >= totalWords && learningQueue.length === 0) {
      break;
    }

    day++;
  }

  return schedule;
}

export const PLAN = generateDynamicSpacedRepetitionSchedule(
  Object.keys(WORDS).length,
);
