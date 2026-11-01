import type {Plant} from "../types/plants.types";

function normalize(value:string):string{
 return value.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()
   .replace(/\u0142/g,"l").replace(/\u00df/g,"ss").replace(/\u0131/g,"i").trim();
}
/** All words may match across nickname, catalogue species/Latin name or location. */
export function matchesPlantSearch(plant:Pick<Plant,"name"|"species"|"latin"|"location">,query:string):boolean{
 const words=normalize(query).split(/\s+/).filter(Boolean);
 if(!words.length)return true;
 const text=normalize([plant.name,plant.species,plant.latin,plant.location].filter(Boolean).join(" "));
 return words.every(word=>text.includes(word));
}
