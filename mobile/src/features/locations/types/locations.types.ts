import type { LocationCategory } from "../../create-plant/types/create-plant.types";

export type PlantLocation = {
  id: string;
  name: string;
  plantCount: number;
  category: LocationCategory;
};
