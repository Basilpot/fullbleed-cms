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
