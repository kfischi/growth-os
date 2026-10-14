// Every trade the site builder knows, in the order the builder lists them. One file each, same shape
// (see trades/plumber.mjs). The template (templates/plumber.mjs, the shared "service business" site) reads the
// trade from content.trade_id; the builder makes one template entry per trade (lib/builder.mjs TEMPLATES).
// A new trade: add its file, list it here and in the builder's trade picker (demos/build/index.html #fTrade).
import plumber from "./plumber.mjs";
import electrician from "./electrician.mjs";
import ac from "./ac.mjs";
import locksmith from "./locksmith.mjs";
import appliance from "./appliance.mjs";
import pest from "./pest.mjs";
import handyman from "./handyman.mjs";
import renovation from "./renovation.mjs";
import cleaning from "./cleaning.mjs";
import garden from "./garden.mjs";
import movers from "./movers.mjs";
import trainer from "./trainer.mjs";
import tutor from "./tutor.mjs";
import music from "./music.mjs";
import psychologist from "./psychologist.mjs";
import socialWorker from "./social-worker.mjs";

export const TRADES = Object.fromEntries([plumber, electrician, ac, locksmith, appliance, pest, handyman, renovation, cleaning,
  garden, movers, trainer, tutor, music, psychologist, socialWorker].map((t) => [t.id, t]));
export const tradeOf = (id) => TRADES[id] || TRADES.plumber;
// For tests of a trade file before it is listed here (scripts/tests/trades.test.mjs <id>).
export const register = (T) => { TRADES[T.id] = T; };
