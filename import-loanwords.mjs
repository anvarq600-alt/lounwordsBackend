import fs from "fs";

const raw = JSON.parse(fs.readFileSync("./loanwords.json", "utf8"));

let payload;

// 1) Agar ["internet","telefon"] bo‘lsa
if (Array.isArray(raw) && raw.length && typeof raw[0] === "string") {
  payload = { words: raw };
}

// 2) Agar [{word:"internet", origin:"Ingliz tili"}] bo‘lsa
else if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
  payload = { items: raw };
}

// 3) Agar bo‘sh bo‘lsa
else if (Array.isArray(raw) && raw.length === 0) {
  console.log("❌ loanwords.json bo‘sh");
  process.exit(1);
} else {
  console.log("❌ loanwords.json formati noto‘g‘ri. Array bo‘lishi kerak.");
  process.exit(1);
}

const res = await fetch("http://localhost:8000/api/loanwords/import", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const data = await res.json();
console.log("✅ Import result:", data);
