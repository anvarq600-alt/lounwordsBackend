import fs from "fs";

const words = JSON.parse(fs.readFileSync("loanwords.json","utf8"));

const greek = ["algoritm","metrika","matritsa","vektor"];
const latin = ["formula","operator","operand","parameter","model"];
const french = ["restoran","menyu","model"];
const italian = ["bank","pizza"];
const russian = ["programma","sistema"];

function detectOrigin(w){
  if (greek.includes(w)) return "Yunon tili";
  if (latin.includes(w)) return "Lotin tili";
  if (french.includes(w)) return "Fransuz tili";
  if (italian.includes(w)) return "Italiya tili";
  if (russian.includes(w)) return "Rus tili";
  return "Ingliz tili"; // default
}

const fixed = [...new Set(words.map(w => w.toLowerCase()))]
  .map(w => ({
    word: w,
    origin: detectOrigin(w)
  }));

fs.writeFileSync("loanwords.json", JSON.stringify(fixed,null,2));

console.log("✅ Tayyor:", fixed.length);
