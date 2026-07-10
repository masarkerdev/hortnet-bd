// backend/routes/reports_shared.js
const MOTHER_CATEGORIES = [
  { name_bn: "ফলদ চারা",              base_group: "ফলদ",              propagation_class: "চারা", order: 1 },
  { name_bn: "ফলদ কলম",               base_group: "ফলদ",              propagation_class: "কলম", order: 2 },
  { name_bn: "শীতকালীন সবজি চারা",     base_group: "শীতকালীন সবজি",    propagation_class: "চারা", order: 3 },
  { name_bn: "গ্রীষ্মকালীন সবজি চারা",  base_group: "গ্রীষ্মকালীন সবজি", propagation_class: "চারা", order: 4 },
  { name_bn: "ঔষধি চারা",              base_group: "ঔষধি",             propagation_class: "চারা", order: 5 },
  { name_bn: "মসলার চারা",             base_group: "মসলা",             propagation_class: "চারা", order: 6 },
  { name_bn: "মসলার কলম",              base_group: "মসলা",             propagation_class: "কলম", order: 7 },
  { name_bn: "শোভাবর্ধনকারী চারা",      base_group: "শোভাবর্ধনকারী",    propagation_class: "চারা", order: 8 },
  { name_bn: "শোভাবর্ধনকারী কলম",       base_group: "শোভাবর্ধনকারী",    propagation_class: "কলম", order: 9 },
  { name_bn: "ফুলের চারা",             base_group: "ফুল",              propagation_class: "চারা", order: 10 },
  { name_bn: "শীতকালীন ফুল",           base_group: "ফুল",              propagation_class: "চারা", order: 11 },
  { name_bn: "গ্রীষ্মকালীন ফুল",        base_group: "ফুল",              propagation_class: "চারা", order: 12 },
  { name_bn: "পাম জাতীয় চারা",         base_group: "পাম জাতীয়",       propagation_class: "চারা", order: 13 },
];
module.exports = { MOTHER_CATEGORIES };
