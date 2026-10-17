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
import towing from "./towing.mjs";
import cosmetics from "./cosmetics.mjs";
import photographer from "./photographer.mjs";
import barber from "./barber.mjs";
import massage from "./massage.mjs";
import nails from "./nails.mjs";
import driving from "./driving.mjs";
import upholstery from "./upholstery.mjs";
import shutters from "./shutters.mjs";
import security from "./security.mjs";
import yoga from "./yoga.mjs";
import dogTrainer from "./dog-trainer.mjs";
import pergolas from "./pergolas.mjs";
import roofing from "./roofing.mjs";

export const TRADES = Object.fromEntries([plumber, electrician, ac, locksmith, towing, shutters, roofing, appliance, pest, handyman, renovation, cleaning,
  upholstery, garden, pergolas, security, movers, cosmetics, nails, barber, massage, yoga, photographer, driving, trainer, tutor, music, dogTrainer, psychologist, socialWorker].map((t) => [t.id, t]));
export const tradeOf = (id) => TRADES[id] || TRADES.plumber;
// For tests of a trade file before it is listed here (scripts/tests/trades.test.mjs <id>).
export const register = (T) => { TRADES[T.id] = T; };
