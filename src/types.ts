export type Dish = {
  id: string;
  data: {
    title: string;
    description: any;
    price: number;
    category: string;
    image: { url: string };
  };
};

export type DailyMenu = {
  id: string;
  data: {
    date: string;
    title: string | null;
    note: any;
    starter: { id?: string } | null;
    main: { id?: string } | null;
    dessert: { id?: string } | null;
  };
};

export type WeeklyHighlights = {
  id: string;
  data: {
    title: string;
    week_start: string; // Date
    week_end: string;   // Date
    dishes: {
      dish: { id?: string } | null;
      note?: string | null;
    }[];
  };
};

export type MenuTemplate = {
  id: string;
  data: {
    name: string;
    applies_to: "daily" | "weekly" | "both" | null;
    background_image: { url: string } | null;
  };
};
