import {matchesPlantSearch} from "../plantSearch";
const plant={name:"Bird",species:"Bird of paradise",latin:"Strelitzia alba",location:"Living room"};
it.each(["Bird","PARADISE","strelitzia","living","paradise room","  alba   living ",""])("matches nickname, species and location for %s",query=>{
 expect(matchesPlantSearch(plant,query)).toBe(true);
});
it.each(["Kitchen","Bird kitchen","Pilea"])("requires every word to match for %s",query=>{
 expect(matchesPlantSearch(plant,query)).toBe(false);
});
it("handles missing definitions and accent/case differences",()=>{
 expect(matchesPlantSearch({name:"\u017b\u00f3\u0142w",location:"Balkon"},"zolw balkon")).toBe(true);
 expect(matchesPlantSearch({name:"Plant"},"latin")).toBe(false);
 expect(matchesPlantSearch({name:"Plant"},"   ")).toBe(true);
});
