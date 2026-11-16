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

window.CONFIG = {
  title: "Linh ơi mình ăn gì thế",
  friendName: "Linh",
  backgroundImage: "assets/melody.png",

  restaurants: [
    { name: "Túi mù sít rịt",      emoji: "🎁", note: "Bóc túi mù thôiii, hên xui nha~ 🎁" },
    { name: "Tokyo Tan Tan Ramen", emoji: "🍥", note: "Giờ húp mì mè cay nè! 🔥" },
    { name: "Ottugi Restaurant",   emoji: "🍲", note: "Món Hàn ấm bụng ấm lòng 💕" },
  ],
};
