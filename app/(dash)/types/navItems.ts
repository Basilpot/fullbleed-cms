export type TNavUrl = {
  name?: string;
  title?: string;
  url: string;
  icon: any;
};

export type TNavData = {
  user: {
    name: string;
    email: string;
    isVerified: boolean;
  };
  navMain: TNavUrl[];
  navUtils: TNavUrl[];
};

export type TAttractionTypes = {
  id: string;
  tripTypeName: string;
  tripTypeHandle: string;
  tripTypeImage: string;
};

export type TRegions = {
  id: string;
  regionName: string;
  regionHandle: string;
  regionImage: string;
};

export type TCity = {
  id: string;
  cityName: string;
  cityHandle: string;
  cityImage: string;
};
