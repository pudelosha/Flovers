export type Plant = {
  id: string;
  name: string;
  latin?: string;
  location?: string;
  notes?: string;
};

export type FormMode = "add" | "edit";
