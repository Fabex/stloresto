import * as prismic from "@prismicio/client";

const REPOSITORY_NAME = "saintlaurenttest"; // à remplacer par le nom de ton repo Prismic

export const client = prismic.createClient(REPOSITORY_NAME, {
});
