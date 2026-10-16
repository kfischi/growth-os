// Every trade guide (shared/guides/*.json), imported once so the functions bundle carries them.
// General know-how only: no prices or promises of a business (see shared/guides/README.md).
import ac from "../../../../shared/guides/ac.json" with { type: "json" };
import shutters from "../../../../shared/guides/shutters.json" with { type: "json" };
import nails from "../../../../shared/guides/nails.json" with { type: "json" };
import driving from "../../../../shared/guides/driving.json" with { type: "json" };
import upholstery from "../../../../shared/guides/upholstery.json" with { type: "json" };
import barber from "../../../../shared/guides/barber.json" with { type: "json" };
import massage from "../../../../shared/guides/massage.json" with { type: "json" };
import cosmetics from "../../../../shared/guides/cosmetics.json" with { type: "json" };
import photographer from "../../../../shared/guides/photographer.json" with { type: "json" };
import towing from "../../../../shared/guides/towing.json" with { type: "json" };
import appliance from "../../../../shared/guides/appliance.json" with { type: "json" };
import cleaning from "../../../../shared/guides/cleaning.json" with { type: "json" };
import electrician from "../../../../shared/guides/electrician.json" with { type: "json" };
import garden from "../../../../shared/guides/garden.json" with { type: "json" };
import handyman from "../../../../shared/guides/handyman.json" with { type: "json" };
import locksmith from "../../../../shared/guides/locksmith.json" with { type: "json" };
import movers from "../../../../shared/guides/movers.json" with { type: "json" };
import musicBass from "../../../../shared/guides/music-bass.json" with { type: "json" };
import musicDrums from "../../../../shared/guides/music-drums.json" with { type: "json" };
import musicGuitar from "../../../../shared/guides/music-guitar.json" with { type: "json" };
import musicKeys from "../../../../shared/guides/music-keys.json" with { type: "json" };
import musicPiano from "../../../../shared/guides/music-piano.json" with { type: "json" };
import pest from "../../../../shared/guides/pest.json" with { type: "json" };
import plumber from "../../../../shared/guides/plumber.json" with { type: "json" };
import psychologist from "../../../../shared/guides/psychologist.json" with { type: "json" };
import renovation from "../../../../shared/guides/renovation.json" with { type: "json" };
import socialWorker from "../../../../shared/guides/social-worker.json" with { type: "json" };
import trainer from "../../../../shared/guides/trainer.json" with { type: "json" };
import tutor from "../../../../shared/guides/tutor.json" with { type: "json" };

export const GUIDE_FILES = { "ac": ac, "shutters": shutters, "nails": nails, "driving": driving, "upholstery": upholstery, "barber": barber, "massage": massage, "cosmetics": cosmetics, "photographer": photographer, "towing": towing, "appliance": appliance, "cleaning": cleaning, "electrician": electrician, "garden": garden, "handyman": handyman, "locksmith": locksmith, "movers": movers, "music-bass": musicBass, "music-drums": musicDrums, "music-guitar": musicGuitar, "music-keys": musicKeys, "music-piano": musicPiano, "pest": pest, "plumber": plumber, "psychologist": psychologist, "renovation": renovation, "social-worker": socialWorker, "trainer": trainer, "tutor": tutor, };
