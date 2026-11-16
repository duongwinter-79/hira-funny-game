// ✿ ─────────────────────────────────────────────── ✿
//   DEVELOPER CONFIG — edit this file to change things
// ✿ ─────────────────────────────────────────────── ✿
//
// restaurants: the built-in options (your friend can add her own in the UI;
//   those are saved in her browser).
//   - name:  shown everywhere (required)
//   - emoji: the capsule / racer face
//   - note:  a cute line shown when it wins
//   - maps:  optional Google Maps search text (defaults to the name)
//
// backgroundImage: drop your character picture at this path (PNG with a
//   transparent background looks best). If the file isn't there, the site
//   uses its built-in pink bunny mascot instead.
//
// musicVideoId: the YouTube video used as background music (the part after
//   "watch?v=" in the link). Set to "" to turn music off.

window.CONFIG = {
  title: "Linh ơi mình ăn gì thế",
  friendName: "Linh",
  backgroundImage: "assets/melody.png",
  musicVideoId: "hGu7BVQy5G0",

  restaurants: [
    { name: "Túi mù sít rịt",      emoji: "🎁", note: "Oithoichec chị em đợi bất ngờ nhó 🎁" },
    { name: "Tokyo Tan Tan Ramen", emoji: "🍥", note: "Đi Nhật ăn mì ramieng thoiii 🍜" },
    { name: "Ottugi Restaurant",   emoji: "🍲", note: "Đi Hàn ăn nướng thoiii 🥩" },
  ],
};
